"""Catalogo de achados: severidade, ordem, 'o que fazer' e duplicidade nos dois sentidos (sem rede).

Uso, dentro de services/backend-prototipo:  ..\\ia\\.venv\\Scripts\\python.exe -m unittest test_achados
"""
import unittest

import main
from achados import montar_achados


def doc(id_, tipo="boleto", ia_status="CONCLUIDA", leitura=None, insights=None, nomes=("Fulano de Tal",), ia_erro=None, processo="P1"):
    return {"id": id_, "processo_id": processo, "tipo": tipo, "ia_status": ia_status, "ia_erro": ia_erro,
            "arquivo": f"/x/{id_}-arquivo-{id_}.pdf", "criado_em": "2026-10-16T02:00:00+00:00",
            "candidatos": [{"nome": n} for n in nomes], "leitura_ia": leitura, "insights_processo": insights}


def comp(cadastro, resultado, identificada=""):
    return {"cadastro": cadastro, "resultado": resultado, "identificada": identificada}


def leitura(comparacoes=(), insights=()):
    return {"comparacoesCadastro": list(comparacoes), "insightsAnalise": list(insights)}


NOME_OK = comp("nome: Fulano de Tal", "compativel", "FULANO DE TAL")


class AchadosTests(unittest.TestCase):
    def codigos(self, documentos):
        return [a["codigo"] for a in montar_achados(documentos)]

    def test_clean_process_has_no_findings(self):
        self.assertEqual(montar_achados([doc("a", leitura=leitura([NOME_OK]))]), [])

    def test_failed_document_is_high_severity_with_the_reason_and_a_resend_instruction(self):
        a = montar_achados([doc("a", ia_status="FALHA", ia_erro="O arquivo não é um PDF ou imagem válido.")])[0]
        self.assertEqual((a["codigo"], a["severidade"]), ("LEITURA_FALHOU", "alta"))
        self.assertIn("não é um PDF", a["texto"])
        self.assertIn("Reenvie", a["acao"])

    def test_communication_errors_use_the_text_after_the_prefix(self):
        a = montar_achados([doc("a", ia_status="ERRO_TECNICO: Client error 404")])[0]
        self.assertEqual(a["texto"], "Client error 404")

    def test_person_divergence_is_high_and_names_both_sides(self):
        l = leitura([comp("pessoas cadastradas: Ana, Beto", "divergente", "Carlos, Dani")])
        a = montar_achados([doc("a", leitura=l)])[0]
        self.assertEqual((a["codigo"], a["severidade"]), ("DOCUMENTO_DE_OUTRA_PESSOA", "alta"))
        self.assertIn("Ana, Beto", a["texto"])
        self.assertIn("Carlos, Dani", a["texto"])

    def test_operator_value_and_competence_divergences_are_medium(self):
        l = leitura([NOME_OK, comp("operadora: Uniplan", "divergente", "HAPVIDA"),
                     comp("valorEsperado de Fulano: 246.43", "divergente", "269.59"),
                     comp("competenciaEsperada: 2026-07", "divergente", "2026-06")])
        achados = montar_achados([doc("a", leitura=l)])
        self.assertEqual([a["codigo"] for a in achados], ["OPERADORA_DIVERGENTE", "VALOR_DIVERGENTE_CADASTRO", "COMPETENCIA_DIVERGENTE"])
        self.assertTrue(all(a["severidade"] == "media" and a["acao"] for a in achados))

    def test_divergences_are_written_in_plain_language_without_internal_field_names(self):
        l = leitura([NOME_OK, comp("operadora: Uniplan", "divergente", "HAPVIDA"),
                     comp("valorEsperado de Fulano: 246.43", "divergente", "269.59"),
                     comp("competenciaEsperada: 2026-07", "divergente", "2026-08"),
                     comp("nome: Mauro F", "divergente", "MAURO PAULO SANTOS")])
        textos = {a["codigo"]: a["texto"] for a in montar_achados([doc("a", leitura=l)])}
        self.assertEqual(textos["COMPETENCIA_DIVERGENTE"], "Competência pedida: 07/2026; no documento: 08/2026.")
        self.assertEqual(textos["OPERADORA_DIVERGENTE"], "Operadora no cadastro: Uniplan; no documento: HAPVIDA.")
        self.assertEqual(textos["VALOR_DIVERGENTE_CADASTRO"], "Valor no cadastro (Fulano): 246.43; no documento: 269.59.")
        self.assertEqual(textos["NOME_DIVERGENTE"], "Nome no cadastro: Mauro F; no documento: MAURO PAULO SANTOS.")
        self.assertFalse(any("Esperad" in t for t in textos.values()))

    def test_barcode_mismatches_become_medium_findings_with_their_own_codes_and_keep_the_evidence(self):
        valor = {"titulo": "Valor diferente do código de barras", "texto": "O valor lido é R$ 1,00, mas o código indica R$ 2,00.", "evidencia": "12345.67890 12345.678901"}
        venc = {"titulo": "Vencimento diferente do código de barras", "texto": "O vencimento lido é 11/09/2026, mas o código indica 10/09/2026.", "evidencia": "12345.67890 12345.678901"}
        achados = montar_achados([doc("a", leitura=leitura([NOME_OK], [valor, venc]))])
        self.assertEqual([(a["codigo"], a["severidade"]) for a in achados], [("VALOR_DIFERE_CODIGO_BARRAS", "media"), ("VENCIMENTO_DIFERE_CODIGO_BARRAS", "media")])
        self.assertTrue(all(a["acao"] and a["evidencias"] == [{"arquivo": "arquivo-a.pdf", "trecho": "12345.67890 12345.678901"}] for a in achados))
        self.assertIn("R$ 2,00", achados[0]["texto"])

    def test_tampered_line_in_the_reading_becomes_a_high_finding(self):
        ins = {"titulo": "Linha digitável com dígito verificador inválido", "texto": "O número impresso não passa.", "evidencia": "03399.04484"}
        a = montar_achados([doc("a", leitura=leitura([NOME_OK], [ins]))])[0]
        self.assertEqual((a["codigo"], a["severidade"]), ("LINHA_ADULTERADA", "alta"))

    def test_receipt_of_another_boleto_comes_first_and_keeps_the_evidence(self):
        proc = [{"titulo": "Diferença entre boleto e pagamento", "texto": "x", "evidencias": [], "documentoIds": ["a"]},
                {"titulo": "Comprovante de outro boleto", "texto": "Linha diferente.",
                 "evidencias": [{"documentoId": "b", "arquivo": "c.pdf", "trecho": "98765.43210"}], "documentoIds": ["a", "b"]}]
        achados = montar_achados([doc("a", leitura=leitura([NOME_OK]), insights=proc), doc("b", "comprovante_pagamento", leitura=leitura(), insights=proc)])
        self.assertEqual([a["codigo"] for a in achados], ["COMPROVANTE_OUTRO_BOLETO", "DIFERENCA_ENCARGOS"])
        self.assertEqual(achados[0]["evidencias"], [{"arquivo": "c.pdf", "trecho": "98765.43210"}])

    def test_repeated_charge_advice_depends_on_the_cadastro(self):
        def com(mesmo):
            ins = {"titulo": "Cobrança já enviada em outro processo", "texto": "t", "evidencias": [], "documentoIds": [],
                   "codigo": "COBRANCA_REPETIDA", "ordem": "anterior", "mesmoCadastro": mesmo}
            return montar_achados([doc("a", leitura=leitura([NOME_OK]), insights=[ins])])[0]
        self.assertIn("reenvio do mesmo servidor", com(True)["acao"])
        self.assertIn("gerência", com(False)["acao"])

    def test_repeated_charge_insight_saved_before_the_code_field_existed_is_still_recognised(self):
        antigo = {"titulo": "Cobrança já enviada em outro processo", "evidencias": [], "documentoIds": [],
                  "texto": "A mesma cobrança já foi enviada. O cadastro é diferente: confira se não está sendo usada por pessoas diferentes."}
        a = montar_achados([doc("a", leitura=leitura([NOME_OK]), insights=[antigo])])[0]
        self.assertEqual((a["codigo"], a["severidade"]), ("COBRANCA_REPETIDA", "alta"))
        self.assertIn("gerência", a["acao"])

    def test_ownership_not_confirmed_only_when_there_is_a_cadastro_and_no_name_matched(self):
        so_comprovante = doc("a", "comprovante_pagamento", leitura=leitura([comp("nome: Fulano de Tal", "inconclusivo")]))
        self.assertEqual(self.codigos([so_comprovante]), ["TITULARIDADE_NAO_CONFIRMADA"])
        self.assertEqual(self.codigos([so_comprovante, doc("b", leitura=leitura([NOME_OK]))]), [])
        self.assertEqual(self.codigos([doc("c", "comprovante_pagamento", leitura=leitura([comp("nome: x", "inconclusivo")]), nomes=())]), [])

    def test_abbreviated_cadastro_name_is_reported_as_a_hint_not_as_unconfirmed_ownership(self):
        l = leitura([comp("nome: Mauro F", "inconclusivo", "MAURO FELIPE DE JESUS SANTOS")])
        achados = montar_achados([doc("a", "fatura_tecnica", leitura=l, nomes=("Mauro F",))])
        self.assertEqual([(a["codigo"], a["severidade"]) for a in achados], [("NOME_CADASTRO_ABREVIADO", "info")])
        self.assertIn("MAURO FELIPE DE JESUS SANTOS", achados[0]["texto"])
        self.assertIn("Mauro F", achados[0]["texto"])
        # sem pista de quem seria, continua sendo titularidade nao confirmada
        sem_pista = leitura([comp("nome: Mauro F", "inconclusivo", "")])
        self.assertEqual(self.codigos([doc("b", "fatura_tecnica", leitura=sem_pista, nomes=("Mauro F",))]), ["TITULARIDADE_NAO_CONFIRMADA"])

    def test_findings_are_deduplicated_across_documents_and_ordered_by_severity(self):
        l = leitura([NOME_OK, comp("operadora: Uniplan", "divergente", "HAPVIDA")])
        achados = montar_achados([doc("a", leitura=l), doc("b", "comprovante_pagamento", leitura=l),
                                  doc("c", ia_status="FALHA", ia_erro="x")])
        self.assertEqual([a["severidade"] for a in achados], ["alta", "media"])
        self.assertEqual(self.codigos([doc("a", leitura=l), doc("b", leitura=l)]).count("OPERADORA_DIVERGENTE"), 1)

    def test_noisy_model_observations_are_dropped_but_real_ones_are_kept(self):
        beneficiarios = [{"nome": "A", "valor": "246.43"}, {"nome": "B", "valor": "246.43"}]
        ruido = [
            {"titulo": "Mensalidade individual ambigua", "texto": "A mensalidade individual não está claramente discriminada.", "evidencia": "492.85"},
            {"titulo": "Valor do Pagamento", "texto": "O valor do pagamento é de R$ 2.150,68.", "evidencia": "2.150,68"},
            {"titulo": "Valor total divergente", "texto": "O valor total (2.685,68) não corresponde à soma dos valores individuais (2.685,68).", "evidencia": "x"}]
        util = {"titulo": "Valor total divergente", "texto": "O valor total (2.685,68) não corresponde à soma dos valores individuais (2.600,00).", "evidencia": "x"}
        l = dict(leitura([NOME_OK], ruido + [util]), beneficiarios=beneficiarios)
        achados = montar_achados([doc("a", leitura=l)])
        self.assertEqual([a["texto"][-30:] for a in achados], [(util["texto"] + " Evidência: x.")[-30:]])

    def test_claimed_mismatch_is_dropped_when_the_sum_shown_in_the_text_matches_the_total(self):
        def titulos(texto):
            ins = {"titulo": "Contradicao entre valores", "texto": texto, "evidencia": "Valor do Documento: 2.685,68"}
            return [a["titulo"] for a in montar_achados([doc("a", leitura=leitura([NOME_OK], [ins]))])]
        self.assertEqual(titulos("O valor total do documento (2.685,68) não corresponde à soma dos valores individuais dos beneficiários (1.637,21 + 1.048,47 = 2.685,68)."), [])
        self.assertEqual(titulos("O valor total (2.685,68) não corresponde à soma (1.637,21 + 1.048,47)."), [])
        self.assertEqual(titulos("O valor total (2.685,68) não corresponde à soma (1.600,00 + 1.000,00 = 2.600,00)."), ["Contradicao entre valores"])
        self.assertEqual(titulos("O valor total (2.685,68) não corresponde à soma (2.600,00)."), ["Contradicao entre valores"])

    def test_ambiguity_observation_is_kept_when_a_person_has_no_medical_value(self):
        ins = {"titulo": "Mensalidade individual ambigua", "texto": "A mensalidade individual não está clara.", "evidencia": "492.85"}
        l = dict(leitura([NOME_OK], [ins]), beneficiarios=[{"nome": "A", "valor": ""}])
        self.assertEqual(self.codigos([doc("a", leitura=l)]), ["OBSERVACAO_DA_IA"])

    def test_reading_returned_to_every_panel_no_longer_carries_the_refuted_observation(self):
        from achados import limpar_observacoes
        ambigua = {"titulo": "Mensalidade individual ambigua", "texto": "A mensalidade individual não está claramente discriminada.",
                   "evidencia": "492.85", "beneficiario": "Bento"}
        adulterada = {"titulo": "Linha digitável com dígito verificador inválido", "texto": "t", "evidencia": "e"}
        l = {"beneficiarios": [{"nome": "Bento", "valor": "246.43"}, {"nome": "Bruno", "valor": "246.43"}],
             "insightsAnalise": [ambigua, adulterada]}
        self.assertEqual([i["titulo"] for i in limpar_observacoes(l)["insightsAnalise"]], [adulterada["titulo"]])
        self.assertIsNone(limpar_observacoes(None))

    def test_loose_observations_about_fines_are_dropped_only_when_the_difference_already_explains_them(self):
        multa = {"titulo": "Multa e Mora", "texto": "Multa e mora não foram confirmadas como pagas.", "evidencia": "MULTA DE R$ 53,71"}
        outra = {"titulo": "Vencimento em feriado", "texto": "O vencimento cai em feriado.", "evidencia": "20/07"}
        diferenca = {"titulo": "Diferença entre boleto e pagamento", "texto": "A diferença corresponde aos encargos.", "evidencias": [], "documentoIds": ["a"]}
        com = montar_achados([doc("a", leitura=leitura([NOME_OK], [multa, outra]), insights=[diferenca])])
        self.assertEqual([a["titulo"] for a in com], ["Diferença entre boleto e pagamento", "Vencimento em feriado"])
        sem = montar_achados([doc("a", leitura=leitura([NOME_OK], [multa, outra]))])
        self.assertEqual([a["titulo"] for a in sem], ["Multa e Mora", "Vencimento em feriado"])

    def test_fine_observations_also_leave_the_reading_shown_in_the_other_panel(self):
        from achados import limpar_observacoes_do_processo
        multa = {"titulo": "Multa e juros cobrados", "texto": "Multa e juros foram cobrados.", "evidencia": "MULTA"}
        outra = {"titulo": "Vencimento em feriado", "texto": "O vencimento cai em feriado.", "evidencia": "20/07"}
        diferenca = {"titulo": "Diferença entre boleto e pagamento", "texto": "t", "evidencias": [], "documentoIds": ["a"]}
        docs = [doc("a", leitura=leitura([NOME_OK], [multa, outra]), insights=[diferenca])]
        limpar_observacoes_do_processo(docs, montar_achados(docs))
        self.assertEqual([i["titulo"] for i in docs[0]["leitura_ia"]["insightsAnalise"]], ["Vencimento em feriado"])
        sem = [doc("b", leitura=leitura([NOME_OK], [multa, outra]))]
        limpar_observacoes_do_processo(sem, montar_achados(sem))
        self.assertEqual(len(sem[0]["leitura_ia"]["insightsAnalise"]), 2)

    def test_observation_that_narrates_the_internal_classification_is_dropped(self):
        interna = {"titulo": "Modalidade que exige classificação", "evidencia": "Odontológica, Médica",
                   "texto": "Os tipos de assistência 'Odontológica' e 'Médica' foram classificados como 'odontologico' e 'plano_saude'."}
        real = {"titulo": "Encargo efetivamente cobrado", "texto": "Tarifa de cobrança de R$ 46.33 foi aplicada.", "evidencia": "46.33"}
        achados = montar_achados([doc("a", leitura=leitura([NOME_OK], [interna, real]))])
        self.assertEqual([a["titulo"] for a in achados], ["Encargo efetivamente cobrado"])

    def test_ia_observations_are_limited_to_three(self):
        ins = [{"titulo": f"Obs {i}", "texto": "t", "evidencia": "e"} for i in range(6)]
        achados = montar_achados([doc("a", leitura=leitura([NOME_OK], ins))])
        self.assertEqual(len(achados), 3)
        self.assertTrue(all(a["codigo"] == "OBSERVACAO_DA_IA" and a["severidade"] == "info" for a in achados))


class JuntarRepeticoesTests(unittest.TestCase):
    @staticmethod
    def repeticao(ordem, quando, cadastro, mesmo, com_dados=True):
        titulo = "Cobrança já enviada em outro processo" if ordem == "anterior" else "Cobrança enviada novamente em outro processo"
        ins = {"titulo": titulo, "texto": f"texto de {quando}", "evidencias": [{"documentoId": "a", "arquivo": "b.pdf", "trecho": "12345.67890"}],
               "documentoIds": ["a"], "codigo": "COBRANCA_REPETIDA", "ordem": ordem, "mesmoCadastro": mesmo}
        if com_dados:
            ins.update({"quando": quando, "cadastroOutro": cadastro, "linhas": ["12345.67890 12345.678901"]})
        return ins

    def achados(self, *insights):
        return montar_achados([doc("a", leitura=leitura([NOME_OK]), insights=list(insights))])

    def test_several_earlier_processes_become_one_finding_listing_all_of_them(self):
        achados = self.achados(self.repeticao("anterior", "17/10/2026 08:57", ["Ana"], True),
                               self.repeticao("anterior", "16/10/2026 16:59", ["Beto"], False),
                               self.repeticao("anterior", "17/10/2026 10:43", ["Ana"], True))
        self.assertEqual(len(achados), 1)
        a = achados[0]
        self.assertEqual((a["codigo"], a["titulo"]), ("COBRANCA_REPETIDA", "Cobrança repetida em outros 3 processos"))
        self.assertEqual(a["texto"].count("antes deste"), 3)
        self.assertLess(a["texto"].index("16/10/2026 16:59"), a["texto"].index("17/10/2026 08:57"))  # em ordem de data
        self.assertIn("cadastro diferente: Beto", a["texto"])
        self.assertIn("gerência", a["acao"])  # um cadastro diferente basta para escalar
        self.assertEqual(len(a["evidencias"]), 1)
        self.assertNotIn("_repeticao", a)

    def test_earlier_and_later_repetitions_are_listed_together_in_one_finding(self):
        achados = self.achados(self.repeticao("anterior", "16/10/2026 16:59", ["Ana"], True),
                               self.repeticao("posterior", "17/10/2026 08:57", ["Ana"], True))
        self.assertEqual(len(achados), 1)
        a = achados[0]
        self.assertEqual(a["titulo"], "Cobrança repetida em outros 2 processos")
        self.assertIn("16/10/2026 16:59, antes deste", a["texto"])
        self.assertIn("17/10/2026 08:57, depois deste", a["texto"])
        self.assertIn("reenvio do mesmo servidor", a["acao"])
        self.assertEqual(len(a["evidencias"]), 1)  # a mesma evidencia nao se repete
        self.assertNotIn("_repeticao", a)

    def test_a_single_repetition_keeps_its_original_wording(self):
        achados = self.achados(self.repeticao("anterior", "16/10/2026 16:59", ["Ana"], True))
        self.assertEqual((len(achados), achados[0]["titulo"], achados[0]["texto"]),
                         (1, "Cobrança já enviada em outro processo", "texto de 16/10/2026 16:59"))
        self.assertNotIn("_repeticao", achados[0])

    def test_findings_saved_before_the_extra_data_existed_are_not_merged(self):
        achados = self.achados(self.repeticao("anterior", "x", [], True, com_dados=False),
                               self.repeticao("anterior", "y", [], True, com_dados=False))
        self.assertEqual(len(achados), 2)


class DuplicidadeNosDoisSentidosTests(unittest.TestCase):
    @staticmethod
    def reg(id_, processo, criado, nomes=("Fulano de Tal",)):
        return {"id": id_, "processo_id": processo, "tipo": "boleto", "criado_em": criado, "arquivo": f"/x/{id_}-b.pdf",
                "candidatos": [{"nome": n} for n in nomes],
                "leitura_ia": {"identificadores": {"codigosBarras": ["10491111100000010000123456789012345678901234"], "linhasDigitaveis": []}}}

    def test_the_newer_process_is_told_it_repeats_and_the_older_is_told_it_was_repeated(self):
        antigo = [self.reg("a", "P1", "2026-10-15T20:00:00+00:00")]
        novo = [self.reg("b", "P2", "2026-10-16T02:00:00+00:00")]
        do_novo = main.encontrar_duplicidades(novo, antigo + novo)[0]
        do_antigo = main.encontrar_duplicidades(antigo, antigo + novo)[0]
        self.assertEqual((do_novo["ordem"], do_novo["titulo"]), ("anterior", "Cobrança já enviada em outro processo"))
        self.assertEqual((do_antigo["ordem"], do_antigo["titulo"]), ("posterior", "Cobrança enviada novamente em outro processo"))
        self.assertIn("depois deste", do_antigo["texto"])
        self.assertTrue(do_novo["mesmoCadastro"] and do_antigo["mesmoCadastro"])
        self.assertEqual(do_novo["cadastroOutro"], ["Fulano de Tal"])
        self.assertEqual(do_novo["linhas"], ["10491111100000010000123456789012345678901234"])
        self.assertTrue(do_novo["quando"] and do_antigo["quando"])

    def test_evidence_lists_each_document_of_this_process_once(self):
        a, b = self.reg("a", "P1", "2026-10-15T20:00:00+00:00"), self.reg("b", "P1", "2026-10-15T20:00:01+00:00")
        c, d = self.reg("c", "P2", "2026-10-16T02:00:00+00:00"), self.reg("d", "P2", "2026-10-16T02:00:01+00:00")
        insight = main.encontrar_duplicidades([c, d], [a, b, c, d])[0]
        self.assertEqual(sorted(e["documentoId"] for e in insight["evidencias"]), ["c", "d"])

    def test_which_other_processes_must_be_reanalysed(self):
        a, b, c = self.reg("a", "P1", "2026-10-15T20:00:00+00:00"), self.reg("b", "P2", "2026-10-16T02:00:00+00:00"), self.reg("c", "P3", "2026-10-16T03:00:00+00:00")
        c["leitura_ia"]["identificadores"]["codigosBarras"] = ["10491159800000012670000000000000000000000001"]
        self.assertEqual(set(main.processos_repetidos([b], [a, b, c])), {"P1"})


if __name__ == "__main__":
    unittest.main()
