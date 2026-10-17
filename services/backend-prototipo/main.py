"""Protótipo: backend é a fonte de verdade; IA apenas fornece leitura técnica."""
import asyncio, json, os, sqlite3, time, uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from achados import limpar_observacoes, limpar_observacoes_do_processo, montar_achados

ROOT = Path(__file__).parent
DATA = ROOT / "data"
DB = DATA / "prosaude-backend.db"
IA_URL = os.getenv("IA_URL", "http://127.0.0.1:8002").rstrip("/")
# A IA processa um documento por vez e cada tentativa pode durar minutos: a fila precisa caber aqui.
ESPERA_MAXIMA_IA = int(os.getenv("IA_ESPERA_MAXIMA", "3600"))


def now(): return datetime.now(timezone.utc).isoformat()

def candidatos_para_ia(candidatos):
    """Contrato da IA recebe todos os valores como texto, inclusive valorEsperado."""
    normalizados = []
    for candidato in candidatos:
        valor = candidato.get("valorEsperado", "")
        if isinstance(valor, (int, float)):
            valor = f"{valor:.2f}"
        normalizados.append({
            "nome": candidato.get("nome", ""),
            "operadora": candidato.get("operadora", ""),
            "valorEsperado": str(valor),
            "competenciaEsperada": str(candidato.get("competenciaEsperada", "")),
        })
    return normalizados

async def enviar_para_ia(cid: str):
    """Encaminha um registro já persistido à IA; permite nova tentativa sem novo upload."""
    item = get_record(cid)
    caminho = Path(item["arquivo"])
    if not caminho.exists():
        raise HTTPException(409, "Arquivo original não está disponível para reenvio")
    async with httpx.AsyncClient(timeout=120) as client:
        files = {"arquivo": (caminho.name.split("-", 1)[-1], caminho.read_bytes(), "application/octet-stream")}
        data = {"tipo": item["tipo"], "candidatos": json.dumps(candidatos_para_ia(item["candidatos"])), "solicitacao_externa_id": cid}
        response = await client.post(f"{IA_URL}/extracoes?modo=async", files=files, data=data)
        if not response.is_success:
            raise HTTPException(response.status_code, response.text)
        execucao = response.json()
    with con() as c:
        c.execute("UPDATE comprovantes SET ia_execucao_id=?, ia_status=?, ia_erro=NULL, atualizado_em=? WHERE id=?", (execucao["id"], execucao["status"], now(), cid)); c.commit()
        c.execute("UPDATE comprovantes SET insights_processo_json=NULL WHERE processo_id=?",
                  (item["processo_id"] or cid,)); c.commit()
    return execucao
def con():
    DATA.mkdir(exist_ok=True)
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS comprovantes (
      id TEXT PRIMARY KEY, status TEXT NOT NULL, arquivo TEXT NOT NULL,
      tipo TEXT NOT NULL, candidatos_json TEXT NOT NULL, ia_execucao_id TEXT,
      ia_status TEXT NOT NULL, leitura_ia_json TEXT, campos_manuais_json TEXT NOT NULL,
      parecer_json TEXT, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)""")
    colunas = {linha[1] for linha in c.execute("PRAGMA table_info(comprovantes)")}
    if "processo_id" not in colunas:
        c.execute("ALTER TABLE comprovantes ADD COLUMN processo_id TEXT")
        c.commit()
    if "insights_processo_json" not in colunas:
        c.execute("ALTER TABLE comprovantes ADD COLUMN insights_processo_json TEXT")
        c.commit()
    if "ia_erro" not in colunas:
        c.execute("ALTER TABLE comprovantes ADD COLUMN ia_erro TEXT")
        c.commit()
    return c

def get_record(cid):
    with con() as c:
        r = c.execute("SELECT * FROM comprovantes WHERE id=?", (cid,)).fetchone()
    if not r: raise HTTPException(404, "Comprovante não encontrado")
    d = dict(r)
    for k in ("candidatos_json", "leitura_ia_json", "campos_manuais_json", "parecer_json", "insights_processo_json"):
        d[k.removesuffix("_json")] = json.loads(d.pop(k)) if d[k] else None
    limpar_observacoes(d["leitura_ia"])
    return d


def _codigos(item):
    return set(((item.get("leitura_ia") or {}).get("identificadores") or {}).get("codigosBarras") or [])

def _canonico(linha):
    if len(linha) == 47: return linha[0:4] + linha[32] + linha[33:47] + linha[4:9] + linha[10:20] + linha[21:31]
    if len(linha) == 48: return "".join(linha[i:i + 11] for i in range(0, 48, 12))
    return linha

def _formatar_linha(linha):
    if len(linha) == 47: return f"{linha[:5]}.{linha[5:10]} {linha[10:15]}.{linha[15:21]} {linha[21:26]}.{linha[26:32]} {linha[32]} {linha[33:]}"
    if len(linha) == 48: return " ".join(linha[i:i + 12] for i in range(0, 48, 12))
    return linha

def _exibir_codigo(item, codigo):
    for linha in ((item.get("leitura_ia") or {}).get("identificadores") or {}).get("linhasDigitaveis") or []:
        if _canonico(linha) == codigo: return _formatar_linha(linha)
    return codigo

def _nome_arquivo(item):
    return Path(item["arquivo"]).name.removeprefix(f'{item["id"]}-')

def _nomes(item):
    return [c.get("nome", "") for c in item.get("candidatos") or [] if c.get("nome")]

def _quando(item):
    try: return datetime.fromisoformat(item["criado_em"]).astimezone().strftime("%d/%m/%Y %H:%M")
    except (KeyError, ValueError): return item.get("criado_em", "")

ROTULO_TIPO = {"boleto": "boleto", "comprovante_pagamento": "comprovante"}

SEM_IA = "Não foi possível falar com o servidor de IA (Nexia). Verifique a conexão/VPN e reenvie o documento."
MOTIVOS_DA_FALHA = {
    "ConnectError": SEM_IA, "ConnectTimeout": SEM_IA, "ReadError": SEM_IA, "RemoteProtocolError": SEM_IA,
    "ReadTimeout": "A IA demorou demais para responder. Reenvie o documento.",
    "PoolTimeout": "A IA demorou demais para responder. Reenvie o documento.",
    "UnidentifiedImageError": "O arquivo não é um PDF ou imagem válido. Peça um novo envio.",
}

def motivo_da_falha(execucao):
    """Texto para o analista: traduz os codigos de erro mais comuns; senao usa o que a IA informou."""
    codigo = execucao.get("codigoErro") or ""
    return MOTIVOS_DA_FALHA.get(codigo) or execucao.get("erro") or codigo or None

def processos_repetidos(documentos, todos):
    """Ocorrencias (doc deste processo, doc do outro, codigo) da mesma cobranca, agrupadas por OUTRO processo."""
    if not documentos: return {}
    processo = documentos[0].get("processo_id") or documentos[0]["id"]
    meus_ids = {d["id"] for d in documentos}
    por_processo = {}
    for outro in todos:
        processo_outro = outro.get("processo_id") or outro["id"]
        if outro["id"] in meus_ids or processo_outro == processo: continue
        codigos_outro = _codigos(outro)
        if not codigos_outro: continue
        for meu in documentos:
            for codigo in sorted(_codigos(meu) & codigos_outro):
                por_processo.setdefault(processo_outro, []).append((meu, outro, codigo))
    return por_processo

def encontrar_duplicidades(documentos, todos):
    """Cobranca (codigo de barras valido) deste processo que tambem consta em OUTRO processo, antes ou depois."""
    insights = []
    meu_primeiro_envio = min((d["criado_em"] for d in documentos), default="")
    for ocorrencias in processos_repetidos(documentos, todos).values():
        referencia = min((outro for _, outro, _ in ocorrencias), key=lambda o: o["criado_em"])
        anterior = referencia["criado_em"] < meu_primeiro_envio
        mesmo_cadastro = sorted(n.casefold() for n in _nomes(documentos[0])) == sorted(n.casefold() for n in _nomes(referencia))
        quais = sorted({ROTULO_TIPO.get(meu["tipo"], "documento") for meu, _, _ in ocorrencias})
        linhas = sorted({_exibir_codigo(meu, codigo) for meu, _, codigo in ocorrencias})
        repeticoes = (" e ".join(f"o {q}" for q in quais) + (" deste processo repete" if len(quais) == 1 else " deste processo repetem")
                      + f" a cobrança do outro (linha digitável {' / '.join(linhas)})")
        abertura = ("A mesma cobrança já foi enviada em outro processo, em " if anterior
                    else "A mesma cobrança foi enviada de novo em outro processo, depois deste, em ")
        texto = (f"{abertura}{_quando(referencia)} (cadastro: {', '.join(_nomes(referencia)) or 'não informado'}): {repeticoes}. "
                 + ("O cadastro é o mesmo: confira se é um reenvio do mesmo servidor." if mesmo_cadastro
                    else "O cadastro é diferente: confira se a mesma cobrança não está sendo usada por pessoas diferentes."))
        # Cada documento deste processo aparece uma vez, mesmo que case com varios documentos do outro processo.
        evidencias = list({(meu["id"], codigo): {"documentoId": meu["id"], "arquivo": _nome_arquivo(meu), "trecho": _exibir_codigo(meu, codigo)}
                           for meu, _, codigo in ocorrencias}.values())
        insights.append({"titulo": "Cobrança já enviada em outro processo" if anterior else "Cobrança enviada novamente em outro processo",
                         "texto": texto, "evidencias": evidencias, "documentoIds": sorted({meu["id"] for meu, _, _ in ocorrencias}),
                         "codigo": "COBRANCA_REPETIDA", "ordem": "anterior" if anterior else "posterior", "mesmoCadastro": mesmo_cadastro,
                         "quando": _quando(referencia), "cadastroOutro": _nomes(referencia), "linhas": linhas})
    return insights

async def analisar_processo(processo_id: str, propagar: bool = True):
    """Confere o processo quando as leituras do grupo terminaram: IA (entre documentos) e cobranca repetida.

    Com propagar=True, os OUTROS processos que repetem a mesma cobranca tambem sao reanalisados,
    para o mais antigo ser avisado de que a cobranca dele voltou a ser enviada."""
    with con() as c:
        ids = [r[0] for r in c.execute(
            "SELECT id FROM comprovantes WHERE processo_id=? ORDER BY criado_em, id", (processo_id,)).fetchall()]
        todos_ids = [r[0] for r in c.execute("SELECT id FROM comprovantes").fetchall()]
    documentos = [get_record(cid) for cid in ids]
    if any(d["ia_status"] not in ("CONCLUIDA", "FALHA") for d in documentos):
        return
    concluidos = [d for d in documentos if d["ia_status"] == "CONCLUIDA" and d["leitura_ia"]]
    if not concluidos:
        return
    insights, falha_ia = [], False
    if len(concluidos) >= 2 and {"boleto", "comprovante_pagamento"}.issubset(
            {d["leitura_ia"].get("tipoIdentificado") for d in concluidos}):
        payload = {"documentos": [{"documentoId": d["id"], "nomeArquivo": _nome_arquivo(d),
                    "resultado": d["leitura_ia"]} for d in concluidos]}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(f"{IA_URL}/analises-processo", json=payload)
                response.raise_for_status()
                insights = list(response.json().get("insights", []))
        except Exception:
            import logging
            logging.getLogger(__name__).exception("Falha na analise do processo %s", processo_id)
            falha_ia = True
    todos = [get_record(cid) for cid in todos_ids]
    duplicidades = encontrar_duplicidades(documentos, todos)
    if not (falha_ia and not duplicidades):
        with con() as c:
            c.execute("UPDATE comprovantes SET insights_processo_json=?, atualizado_em=? WHERE processo_id=?",
                      (json.dumps(duplicidades + insights, ensure_ascii=False), now(), processo_id))
            c.commit()
    if propagar:
        for outro in processos_repetidos(documentos, todos):
            await analisar_processo(outro, propagar=False)

async def acompanhar(cid: str):
    """Rotina do backend: consulta a IA e grava o retorno sem tocar em campos_manuais."""
    try:
        item = get_record(cid); exec_id = item["ia_execucao_id"]
        async with httpx.AsyncClient(timeout=20) as client:
            limite = time.monotonic() + ESPERA_MAXIMA_IA
            while time.monotonic() < limite:
                try:
                    r = await client.get(f"{IA_URL}/execucoes/{exec_id}"); r.raise_for_status()
                except (httpx.TransportError, httpx.HTTPStatusError) as falha:
                    # IA reiniciando ou instavel: tenta de novo; 4xx (ex.: execucao inexistente) e definitivo.
                    if isinstance(falha, httpx.HTTPStatusError) and falha.response.status_code < 500:
                        raise
                    await asyncio.sleep(5)
                    continue
                result = r.json(); status = result["status"]
                # O analista vê o andamento sem consultar a IA diretamente.
                with con() as c:
                    c.execute("UPDATE comprovantes SET ia_status=?, atualizado_em=? WHERE id=?", (status, now(), cid)); c.commit()
                if status in ("CONCLUIDA", "FALHA"):
                    with con() as c:
                        c.execute("UPDATE comprovantes SET ia_status=?, leitura_ia_json=?, ia_erro=?, atualizado_em=? WHERE id=?",
                          (status, json.dumps(result.get("resultado")),
                           motivo_da_falha(result) if status == "FALHA" else None, now(), cid)); c.commit()
                    try:
                        await analisar_processo(item["processo_id"] or cid)
                    except Exception:
                        # A leitura individual permanece disponivel se a analise conjunta falhar.
                        import logging
                        logging.getLogger(__name__).exception("Falha na analise do processo %s", item["processo_id"])
                    return
                await asyncio.sleep(3)
            raise TimeoutError(f"A IA nao concluiu em {ESPERA_MAXIMA_IA}s")
    except Exception as exc:
        with con() as c:
            c.execute("UPDATE comprovantes SET ia_status=?, atualizado_em=? WHERE id=?", (f"ERRO_TECNICO: {exc}", now(), cid)); c.commit()

class CampoManual(BaseModel): valor: str; analista_id: str
class Parecer(BaseModel): decisao: str; justificativa: str; analista_id: str

@asynccontextmanager
async def lifespan(app):
    # Retoma consultas pendentes após reinício do backend; a IA continua independente.
    with con() as c:
        pendentes = [row[0] for row in c.execute(
            "SELECT id FROM comprovantes WHERE ia_execucao_id IS NOT NULL AND ia_status NOT IN ('CONCLUIDA', 'FALHA')"
        ).fetchall()]
    tarefas = [asyncio.create_task(acompanhar(cid)) for cid in pendentes]
    try:
        yield
    finally:
        for tarefa in tarefas: tarefa.cancel()
        await asyncio.gather(*tarefas, return_exceptions=True)

app = FastAPI(title="Protótipo Backend Pró-Saúde", lifespan=lifespan)

def com_achados(registros):
    """Anexa a cada registro os achados do processo dele (a mesma lista para todos os documentos do processo)."""
    por_processo = {}
    for r in registros:
        por_processo.setdefault(r.get("processo_id") or r["id"], []).append(r)
    for docs in por_processo.values():
        achados = montar_achados(docs)
        limpar_observacoes_do_processo(docs, achados)
        for r in docs:
            r["achados"] = achados
    return registros

@app.post("/comprovantes", status_code=201)
async def criar_comprovante(background: BackgroundTasks, arquivo: UploadFile = File(...), tipo: str = Form(...), candidatos: str = Form("[]"), processo_id: str = Form("")):
    try: candidatos_json = json.loads(candidatos)
    except json.JSONDecodeError: raise HTTPException(422, "candidatos deve ser JSON")
    cid = str(uuid.uuid4()); nome = f"{cid}-{arquivo.filename}"
    destino = DATA / "originais" / nome; destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(await arquivo.read())
    with con() as c:
        c.execute("INSERT INTO comprovantes (id,status,arquivo,tipo,candidatos_json,ia_execucao_id,ia_status,leitura_ia_json,campos_manuais_json,parecer_json,criado_em,atualizado_em,processo_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
          (cid, "EM_ANALISE", str(destino), tipo, json.dumps(candidatos_json), None, "SOLICITANDO", None, "{}", None, now(), now(), processo_id or cid)); c.commit()
        c.execute("UPDATE comprovantes SET insights_processo_json=NULL WHERE processo_id=?",
                  (processo_id or cid,)); c.commit()
    try:
        await enviar_para_ia(cid)
        background.add_task(acompanhar, cid)
    except Exception as exc:
        with con() as c:
            c.execute("UPDATE comprovantes SET ia_status=?, atualizado_em=? WHERE id=?", (f"ERRO_ENVIO: {exc}", now(), cid)); c.commit()
    return get_record(cid)

@app.post("/comprovantes/{cid}/reenviar-ia")
async def reenviar_ia(cid: str, background: BackgroundTasks):
    await enviar_para_ia(cid)
    background.add_task(acompanhar, cid)
    return get_record(cid)

@app.get("/comprovantes")
def listar():
    """Fila do analista: o backend expõe seu estado, sem o navegador consultar a IA."""
    with con() as c:
        ids = [row[0] for row in c.execute("SELECT id FROM comprovantes ORDER BY criado_em DESC").fetchall()]
    return com_achados([get_record(cid) for cid in ids])

@app.get("/comprovantes/{cid}")
def consultar(cid: str):
    item = get_record(cid)
    with con() as c:
        ids = [row[0] for row in c.execute("SELECT id FROM comprovantes WHERE processo_id=?", (item["processo_id"] or cid,))]
    return next(d for d in com_achados([get_record(i) for i in ids]) if d["id"] == cid)


@app.post("/processos/{processo_id}/analisar")
async def reanalisar_processo(processo_id: str):
    """Permite testar novamente um processo ja recebido sem reenviar arquivos."""
    await analisar_processo(processo_id)
    with con() as c:
        ids = [r[0] for r in c.execute("SELECT id FROM comprovantes WHERE processo_id=?", (processo_id,))]
    if not ids:
        raise HTTPException(404, "Processo não encontrado")
    return {"processo_id": processo_id, "insights": get_record(ids[0])["insights_processo"] or []}

@app.get("/teste", include_in_schema=False)
def pagina_de_teste():
    """Pagina unica para enviar documentos a IA e ver os achados; so para teste local."""
    return FileResponse(ROOT / "teste_ia.html", media_type="text/html; charset=utf-8")

@app.get("/comprovantes/{cid}/arquivo")
def baixar_arquivo(cid: str):
    item = get_record(cid)
    arquivo = Path(item["arquivo"])
    if not arquivo.exists(): raise HTTPException(404, "Arquivo original não encontrado")
    return FileResponse(arquivo, headers={"Content-Disposition": f'inline; filename="{arquivo.name.split("-", 1)[-1]}"'})

@app.patch("/comprovantes/{cid}/campos/{campo}")
def editar(cid: str, campo: str, body: CampoManual):
    item = get_record(cid); manuais = item["campos_manuais"] or {}
    manuais[campo] = {**body.model_dump(), "alterado_em": now()}
    with con() as c:
        c.execute("UPDATE comprovantes SET campos_manuais_json=?, atualizado_em=? WHERE id=?", (json.dumps(manuais), now(), cid)); c.commit()
    return get_record(cid)

@app.post("/comprovantes/{cid}/parecer")
def parecer(cid: str, body: Parecer):
    item = get_record(cid)
    # O parecer e do processo: vale para todos os documentos dele. Gravar so no documento aberto deixava o status
    # do processo depender de qual documento a tela usa e permitia um segundo parecer, talvez contraditorio.
    with con() as c:
        c.execute("UPDATE comprovantes SET status='PARECER_EMITIDO', parecer_json=?, atualizado_em=? WHERE COALESCE(processo_id, id)=?",
                  (json.dumps({**body.model_dump(), "emitido_em": now()}), now(), item["processo_id"] or cid)); c.commit()
    return get_record(cid)
