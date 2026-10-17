"""Achados para o analista: transforma o que a IA e o backend encontraram em itens com severidade e acao sugerida.

A tela so exibe esta lista. As regras de gravidade e o texto de "o que fazer" ficam aqui, num catalogo unico,
para o analista receber a mesma orientacao qualquer que seja a origem do achado (IA, comparacao com o cadastro,
cruzamento entre documentos, duplicidade ou falha de leitura).
"""
import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path

ORDEM = {"alta": 0, "media": 1, "info": 2}

# codigo -> (severidade, titulo padrao, o que fazer)
CATALOGO = {
    "LEITURA_FALHOU": ("alta", "Documento não lido",
                       "Reenvie o documento para a IA. Se falhar de novo, peça um novo arquivo ao servidor."),
    "COMPROVANTE_OUTRO_BOLETO": ("alta", "Comprovante de outro boleto",
                                 "Não use este comprovante para este boleto. Peça ao servidor o comprovante da cobrança correta."),
    "COBRANCA_REPETIDA": ("alta", "Cobrança repetida em outro processo", ""),
    "LINHA_ADULTERADA": ("alta", "Linha digitável com dígito verificador inválido",
                         "Não aceite o boleto como está: confirme a linha digitável com a operadora ou peça um novo boleto."),
    "DOCUMENTO_DE_OUTRA_PESSOA": ("alta", "Documento de outra pessoa",
                                  "Confira se a pessoa do documento é um dependente ainda não cadastrado. "
                                  "Se não for, recuse e peça o documento correto."),
    "VALOR_DIFERE_CODIGO_BARRAS": ("media", "Valor diferente do código de barras",
                                   "Confira o valor no documento original e na linha digitável. Se não baterem, confirme com a operadora antes de aceitar."),
    "VENCIMENTO_DIFERE_CODIGO_BARRAS": ("media", "Vencimento diferente do código de barras",
                                        "Confira o vencimento no documento original e na linha digitável. Se não baterem, confirme com a operadora antes de aceitar."),
    "DOCUMENTOS_NAO_CORRESPONDEM": ("media", "Boleto e comprovante possivelmente não correspondem",
                                    "Confira se o comprovante pertence a este boleto: valor e vencimento são diferentes."),
    "OPERADORA_DIVERGENTE": ("media", "Operadora diferente do cadastro",
                             "Confirme a operadora. O documento pode trazer a administradora ou a razão social no lugar da marca."),
    "VALOR_DIVERGENTE_CADASTRO": ("media", "Valor diferente do cadastro",
                                  "Confira a mensalidade individual no documento e corrija o cadastro se o documento estiver certo."),
    "COMPETENCIA_DIVERGENTE": ("media", "Competência diferente da solicitada",
                               "Confira o mês do documento. Se for de outro mês, peça o documento correto."),
    "NOME_DIVERGENTE": ("media", "Nome diferente do cadastro",
                        "Confira a grafia no original: pode ser abreviação ou erro de digitação."),
    "TITULARIDADE_NAO_CONFIRMADA": ("media", "Não foi possível confirmar de quem é o documento",
                                    "Confira o nome no original. Se não houver nome de beneficiário, peça o boleto ou a fatura completa."),
    "NOME_CADASTRO_ABREVIADO": ("info", "Nome do cadastro parece abreviado",
                                "Confira no original e, se for a mesma pessoa, complete o nome no cadastro."),
    "DIFERENCA_ENCARGOS": ("info", "Diferença entre boleto e pagamento",
                           "Confira se a diferença corresponde só aos encargos listados e aplique a regra de reembolso à mensalidade."),
    "OBSERVACAO_DA_IA": ("info", "Observação da IA", "Confira o trecho citado no documento."),
}

CODIGO_POR_TITULO = {
    "Comprovante de outro boleto": "COMPROVANTE_OUTRO_BOLETO",
    "Documentos possivelmente não correspondem": "DOCUMENTOS_NAO_CORRESPONDEM",
    "Diferença entre boleto e pagamento": "DIFERENCA_ENCARGOS",
    "Linha digitável com dígito verificador inválido": "LINHA_ADULTERADA",
    "Valor diferente do código de barras": "VALOR_DIFERE_CODIGO_BARRAS",
    "Vencimento diferente do código de barras": "VENCIMENTO_DIFERE_CODIGO_BARRAS",
    # insights gravados antes de existir o campo `codigo`
    "Cobrança já enviada em outro processo": "COBRANCA_REPETIDA",
    "Cobrança enviada novamente em outro processo": "COBRANCA_REPETIDA",
}


# Titulos que so repetem um campo ja mostrado no formulario.
TITULOS_TRIVIAIS = {"valor do pagamento", "valor do documento", "valor total", "valor total do boleto", "data do pagamento", "vencimento"}
_ENCARGOS = re.compile(r"(?<![a-z])(multa|mora|juros)(?![a-z])", re.I)
# Valores internos do contrato: se a observacao os cita, o modelo esta narrando o proprio trabalho, nao o documento.
_VOCABULARIO_INTERNO = re.compile(r"""plano_saude|taxa_administrativa|fatura_tecnica|comprovante_pagamento|["']odontologico["']""", re.I)
_DINHEIRO = re.compile(r"\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2}")


def _numero(valor):
    """Converte 2.685,68 ou 2685.68 em Decimal."""
    return Decimal(valor.replace(".", "").replace(",", ".") if "," in valor else valor)


def _conta_fecha(valores):
    """O texto afirma uma diferenca, mas as contas dele mesmo fecham: o total e a soma citada sao iguais."""
    numeros = [_numero(v) for v in valores]
    if len(numeros) < 2:
        return False
    total = numeros[0]
    return (numeros[-1] == total
            or (len(numeros) >= 3 and sum(numeros[1:]) == total)
            or (len(numeros) >= 4 and sum(numeros[1:-1]) == total))


def _observacao_util(insight, leitura):
    """Descarta observacao do modelo que contradiz a propria leitura estruturada (ruido que confunde o analista)."""
    titulo = (insight.get("titulo") or "").strip().casefold()
    texto = (insight.get("titulo") or "") + " " + (insight.get("texto") or "")
    if titulo in TITULOS_TRIVIAIS:
        return False
    if _VOCABULARIO_INTERNO.search(texto):
        return False
    beneficiarios = leitura.get("beneficiarios") or []
    # "mensalidade individual ambigua" com a mensalidade medica de cada pessoa ja identificada
    if beneficiarios and all(b.get("valor") for b in beneficiarios) and re.search(r"mensalidade individual.*(ambigu|incert|n[aã]o .*(clara|discriminad))", texto, re.I | re.S):
        return False
    # "A nao corresponde a B" quando A e B sao o mesmo valor
    if re.search(r"n[aã]o (corresponde|fecha|confere)|diverg", texto, re.I) and _conta_fecha(_DINHEIRO.findall(texto)):
        return False
    return True


def _encargo_solto(insight):
    """Observacao solta sobre multa, mora ou juros (nao e um dos achados que tem codigo proprio)."""
    return CODIGO_POR_TITULO.get(insight.get("titulo", "")) is None and bool(
        _ENCARGOS.search(insight.get("titulo", "") + " " + insight.get("texto", "")))


def limpar_observacoes_do_processo(documentos, achados):
    """Quando a diferenca entre boleto e pagamento ja explica os encargos, nenhum painel repete observacoes soltas sobre eles."""
    if not any(a["codigo"] == "DIFERENCA_ENCARGOS" for a in achados):
        return
    for d in documentos:
        leitura = d.get("leitura_ia")
        if leitura and leitura.get("insightsAnalise"):
            leitura["insightsAnalise"] = [i for i in leitura["insightsAnalise"] if not _encargo_solto(i)]


def limpar_observacoes(leitura):
    """Tira da leitura as observacoes do modelo que a propria leitura estruturada desmente (vale para todo painel)."""
    if leitura and leitura.get("insightsAnalise"):
        leitura["insightsAnalise"] = [i for i in leitura["insightsAnalise"]
                                      if CODIGO_POR_TITULO.get(i.get("titulo", "")) or _observacao_util(i, leitura)]
    return leitura


def _nome_arquivo(doc):
    return Path(doc["arquivo"]).name.removeprefix(f'{doc["id"]}-')


def _com_falha(doc):
    return doc["ia_status"] == "FALHA" or str(doc["ia_status"]).startswith("ERRO")


def _motivo(doc):
    return doc.get("ia_erro") or (
        "A IA não conseguiu ler este documento." if doc["ia_status"] == "FALHA"
        else (str(doc["ia_status"]).split(":", 1)[1].strip() if ":" in str(doc["ia_status"]) else str(doc["ia_status"])))


def _achado(codigo, texto, evidencias=(), documento_ids=(), titulo=None, acao=None):
    severidade, titulo_padrao, acao_padrao = CATALOGO[codigo]
    return {"codigo": codigo, "severidade": severidade, "titulo": titulo or titulo_padrao, "texto": texto,
            "acao": acao or acao_padrao, "evidencias": list(evidencias), "documentoIds": list(documento_ids)}


def _acao_repeticao(insight):
    mesmo = insight.get("mesmoCadastro", "O cadastro é o mesmo" in insight.get("texto", ""))
    if mesmo:
        return "Confira se é reenvio do mesmo servidor e mantenha apenas um dos processos."
    return ("Confira se a mesma cobrança não está sendo usada por pessoas diferentes; "
            "se confirmar, encaminhe à gerência.")


def _a_partir_de_insight_de_processo(insight):
    evidencias = [{"arquivo": e.get("arquivo", ""), "trecho": e.get("trecho", "")} for e in insight.get("evidencias") or []]
    ids = insight.get("documentoIds") or []
    if (insight.get("codigo") or CODIGO_POR_TITULO.get(insight["titulo"])) == "COBRANCA_REPETIDA":
        achado = _achado("COBRANCA_REPETIDA", insight["texto"], evidencias, ids, titulo=insight["titulo"], acao=_acao_repeticao(insight))
        if insight.get("quando"):
            # Dados para juntar varias repeticoes num achado so; removido antes de sair de montar_achados.
            achado["_repeticao"] = {"ordem": insight.get("ordem"), "quando": insight["quando"], "cadastroOutro": insight.get("cadastroOutro") or [],
                                    "mesmoCadastro": bool(insight.get("mesmoCadastro")), "linhas": insight.get("linhas") or []}
        return achado
    codigo = CODIGO_POR_TITULO.get(insight["titulo"], "OBSERVACAO_DA_IA")
    return _achado(codigo, insight["texto"], evidencias, ids, titulo=insight["titulo"])


def _quando_em_ordem(texto):
    try:
        return datetime.strptime(texto, "%d/%m/%Y %H:%M")
    except ValueError:
        return datetime.min


def _juntar_repeticoes(achados):
    """A mesma cobranca em varios outros processos (antes ou depois deste) vira UM achado, listando cada processo."""
    grupo = [a for a in achados if a.get("_repeticao")]
    saida, usado = [], False
    for a in achados:
        if len(grupo) > 1 and a.get("_repeticao"):
            if not usado:
                usado = True
                saida.append(_achado_de_varias_repeticoes(grupo))
        else:
            saida.append(a)
    for a in saida:
        a.pop("_repeticao", None)
    return saida


def _achado_de_varias_repeticoes(grupo):
    reps = sorted((a["_repeticao"] for a in grupo), key=lambda r: _quando_em_ordem(r["quando"]))
    itens = "; ".join(f"{r['quando']}, {'antes' if r['ordem'] == 'anterior' else 'depois'} deste "
                      f"(cadastro {'igual' if r['mesmoCadastro'] else 'diferente'}: {', '.join(r['cadastroOutro']) or 'não informado'})"
                      for r in reps)
    linhas = sorted({linha for r in reps for linha in r["linhas"]})
    texto = f"A mesma cobrança aparece em {len(reps)} outros processos: {itens}." + (f" Linha digitável: {' / '.join(linhas)}." if linhas else "")
    evidencias = list({(e["arquivo"], e["trecho"]): e for a in grupo for e in a["evidencias"]}.values())
    ids = sorted({i for a in grupo for i in a["documentoIds"]})
    return _achado("COBRANCA_REPETIDA", texto, evidencias, ids, titulo=f"Cobrança repetida em outros {len(reps)} processos",
                   acao=_acao_repeticao({"mesmoCadastro": all(r["mesmoCadastro"] for r in reps)}))


def _mes(valor):
    """2026-07 -> 07/2026; qualquer outro texto passa como esta."""
    m = re.fullmatch(r"(\d{4})-(\d{2})", (valor or "").strip())
    return f"{m.group(2)}/{m.group(1)}" if m else (valor or "")


def _frase_da_divergencia(cadastro, lido):
    """Texto para o analista, sem os nomes internos dos campos de comparacao."""
    campo, _, pedido = cadastro.partition(":")
    pedido = pedido.strip()
    if campo.startswith("operadora"):
        return f"Operadora no cadastro: {pedido}; no documento: {lido}."
    if campo.startswith("valorEsperado"):
        pessoa = campo.removeprefix("valorEsperado").removeprefix(" de ").strip()
        return f"Valor no cadastro{f' ({pessoa})' if pessoa else ''}: {pedido}; no documento: {lido}."
    if campo.startswith("competenciaEsperada"):
        return f"Competência pedida: {_mes(pedido)}; no documento: {_mes(lido)}."
    if campo.startswith("nome"):
        return f"Nome no cadastro: {pedido}; no documento: {lido}."
    return f"Cadastro: {cadastro}; documento: {lido}."


def _a_partir_de_comparacao(doc, comp):
    cadastro, lido = comp.get("cadastro", ""), comp.get("identificada") or "não identificado"
    evid = [{"arquivo": _nome_arquivo(doc), "trecho": lido}]
    if cadastro.startswith("pessoas cadastradas"):
        return _achado("DOCUMENTO_DE_OUTRA_PESSOA",
                       f"Nenhuma pessoa com cobertura no documento está no cadastro. Cadastro: {cadastro.split(':', 1)[1].strip()}. "
                       f"Documento: {lido}.", evid, [doc["id"]])
    texto = _frase_da_divergencia(cadastro, lido)
    if cadastro.startswith("operadora"):
        return _achado("OPERADORA_DIVERGENTE", texto, evid, [doc["id"]])
    if cadastro.startswith("valorEsperado"):
        return _achado("VALOR_DIVERGENTE_CADASTRO", texto, evid, [doc["id"]])
    if cadastro.startswith("competenciaEsperada"):
        return _achado("COMPETENCIA_DIVERGENTE", texto, evid, [doc["id"]])
    if cadastro.startswith("nome"):
        return _achado("NOME_DIVERGENTE", texto, evid, [doc["id"]])
    return None


def montar_achados(documentos):
    """documentos: registros de UM processo. Retorna a lista ordenada por gravidade, sem repeticoes."""
    achados = []

    for doc in documentos:
        if _com_falha(doc):
            achados.append(_achado("LEITURA_FALHOU", _motivo(doc), [{"arquivo": _nome_arquivo(doc), "trecho": ""}], [doc["id"]],
                                   titulo=f"Documento não lido: {_nome_arquivo(doc)}"))

    insights_processo = next((d["insights_processo"] for d in documentos if d.get("insights_processo")), [])
    for insight in insights_processo:
        achados.append(_a_partir_de_insight_de_processo(insight))

    divergencia_de_pessoas = nome_confirmado = False
    parecidos = []
    encargos_explicados = any(a["codigo"] == "DIFERENCA_ENCARGOS" for a in achados)
    for doc in documentos:
        leitura = doc.get("leitura_ia") or {}
        for comp in leitura.get("comparacoesCadastro") or []:
            if comp.get("resultado") == "divergente":
                achado = _a_partir_de_comparacao(doc, comp)
                if achado:
                    achados.append(achado)
                    divergencia_de_pessoas |= achado["codigo"] == "DOCUMENTO_DE_OUTRA_PESSOA"
            elif comp.get("resultado") == "compativel" and (comp.get("cadastro", "").startswith("nome") or comp.get("cadastro") == "cpf do cadastro"):
                nome_confirmado = True
            elif comp.get("resultado") == "inconclusivo" and comp.get("cadastro", "").startswith("nome") and comp.get("identificada"):
                parecidos.append((doc, comp))
        for insight in leitura.get("insightsAnalise") or []:
            if CODIGO_POR_TITULO.get(insight.get("titulo", "")) is None and not _observacao_util(insight, leitura):
                continue
            # A diferenca entre boleto e pagamento ja explica os encargos; observacao solta sobre eles repete ou contradiz.
            if encargos_explicados and _encargo_solto(insight):
                continue
            codigo = CODIGO_POR_TITULO.get(insight.get("titulo", ""), "OBSERVACAO_DA_IA")
            evid = [{"arquivo": _nome_arquivo(doc), "trecho": insight.get("evidencia", "")}]
            texto = insight.get("texto", "") + (f" Evidência: {insight['evidencia']}." if codigo == "OBSERVACAO_DA_IA" and insight.get("evidencia") else "")
            achados.append(_achado(codigo, texto, evid, [doc["id"]], titulo=insight.get("titulo")))

    lidos = [d for d in documentos if d["ia_status"] == "CONCLUIDA" and d.get("leitura_ia")]
    tem_cadastro = any(c.get("nome") for d in documentos for c in d.get("candidatos") or [])
    if lidos and tem_cadastro and not nome_confirmado and not divergencia_de_pessoas and parecidos:
        for doc, comp in parecidos:
            cadastrado = comp["cadastro"].split(":", 1)[1].strip()
            achados.append(_achado("NOME_CADASTRO_ABREVIADO",
                                   f'O documento traz "{comp["identificada"]}", que provavelmente é "{cadastrado}" do cadastro '
                                   "com o nome abreviado ou escrito de outro jeito.",
                                   [{"arquivo": _nome_arquivo(doc), "trecho": comp["identificada"]}], [doc["id"]]))
    elif lidos and tem_cadastro and not nome_confirmado and not divergencia_de_pessoas:
        achados.append(_achado("TITULARIDADE_NAO_CONFIRMADA",
                               "Nenhum documento deste processo traz o nome do servidor ou de um dependente do cadastro "
                               "(por exemplo, o comprovante mostra só o pagador).",
                               [{"arquivo": _nome_arquivo(d), "trecho": ""} for d in lidos], [d["id"] for d in lidos]))

    unicos, vistos = [], set()
    for a in achados:
        chave = (a["codigo"], a["titulo"], a["texto"])
        if chave not in vistos:
            vistos.add(chave)
            unicos.append(a)
    unicos = _juntar_repeticoes(unicos)
    observacoes = [a for a in unicos if a["codigo"] == "OBSERVACAO_DA_IA"]
    unicos = [a for a in unicos if a["codigo"] != "OBSERVACAO_DA_IA"] + observacoes[:3]
    return sorted(unicos, key=lambda a: ORDEM[a["severidade"]])
