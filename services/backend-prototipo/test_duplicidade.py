"""Cobranca repetida entre processos e motivo da falha da IA (nao chama IA nem rede).

Uso, dentro de services/backend-prototipo:  ..\\ia\\.venv\\Scripts\\python.exe -m unittest test_duplicidade
"""
import sqlite3
import tempfile
import unittest
from pathlib import Path

import main

CODIGO = "10491111100000010000123456789012345678901234"
OUTRO_CODIGO = "10491159800000012670000000000000000000000001"
LINHA = "12345678901234567890123456789012345678901234567"  # nao precisa ser valida: so testa a exibicao


def doc(id_, processo, tipo, codigos, nomes=("Fulano de Tal",), criado="2026-10-16T02:00:00+00:00", linhas=()):
    return {"id": id_, "processo_id": processo, "tipo": tipo, "criado_em": criado,
            "arquivo": f"/tmp/{id_}-arquivo.pdf", "candidatos": [{"nome": n} for n in nomes],
            "leitura_ia": {"identificadores": {"codigosBarras": list(codigos), "linhasDigitaveis": list(linhas)}} if codigos is not None else None}


class DuplicidadeTests(unittest.TestCase):
    def test_same_charge_in_another_process_is_flagged_with_both_dates_and_cadastro(self):
        antigo = [doc("a1", "P1", "boleto", [CODIGO], criado="2026-10-15T20:00:00+00:00"),
                  doc("a2", "P1", "comprovante_pagamento", [CODIGO], criado="2026-10-15T20:00:05+00:00")]
        novo = [doc("b1", "P2", "boleto", [CODIGO], nomes=("Beltrano Silva",)),
                doc("b2", "P2", "comprovante_pagamento", [OUTRO_CODIGO], nomes=("Beltrano Silva",))]
        insights = main.encontrar_duplicidades(novo, antigo + novo)
        self.assertEqual(len(insights), 1)
        self.assertEqual(insights[0]["titulo"], "Cobrança já enviada em outro processo")
        self.assertIn("Fulano de Tal", insights[0]["texto"])
        self.assertIn("cadastro é diferente", insights[0]["texto"])
        self.assertEqual(insights[0]["documentoIds"], ["b1"])

    def test_same_cadastro_is_described_as_probable_resubmission(self):
        antigo = [doc("a1", "P1", "boleto", [CODIGO])]
        novo = [doc("b1", "P2", "boleto", [CODIGO])]
        self.assertIn("reenvio do mesmo servidor", main.encontrar_duplicidades(novo, antigo + novo)[0]["texto"])

    def test_documents_of_the_same_process_never_count_as_duplicates(self):
        processo = [doc("a1", "P1", "boleto", [CODIGO]), doc("a2", "P1", "comprovante_pagamento", [CODIGO])]
        self.assertEqual(main.encontrar_duplicidades(processo, processo), [])

    def test_different_charges_and_unread_documents_are_ignored(self):
        outros = [doc("a1", "P1", "boleto", [OUTRO_CODIGO]), doc("a2", "P3", "boleto", None), doc("a3", "P4", "boleto", [])]
        novo = [doc("b1", "P2", "boleto", [CODIGO])]
        self.assertEqual(main.encontrar_duplicidades(novo, outros + novo), [])

    def test_two_other_processes_produce_two_insights(self):
        outros = [doc("a1", "P1", "boleto", [CODIGO]), doc("c1", "P3", "comprovante_pagamento", [CODIGO])]
        novo = [doc("b1", "P2", "boleto", [CODIGO])]
        self.assertEqual(len(main.encontrar_duplicidades(novo, outros + novo)), 2)

    def test_line_is_shown_in_standard_format_when_known(self):
        linha = "12345678901234567890123456789012345678901234567"
        self.assertEqual(main._formatar_linha(linha), "12345.67890 12345.678901 23456.789012 3 45678901234567")


class MotivoDaFalhaTests(unittest.TestCase):
    def test_common_error_codes_become_plain_instructions(self):
        self.assertIn("VPN", main.motivo_da_falha({"codigoErro": "ConnectError", "erro": "x"}))
        self.assertIn("demorou", main.motivo_da_falha({"codigoErro": "ReadTimeout"}))
        self.assertIn("PDF ou imagem", main.motivo_da_falha({"codigoErro": "UnidentifiedImageError"}))

    def test_unknown_codes_keep_the_ia_message_and_empty_stays_none(self):
        self.assertEqual(main.motivo_da_falha({"codigoErro": "DOCUMENTO_ILEGIVEL", "erro": "Envie uma imagem mais nítida."}),
                         "Envie uma imagem mais nítida.")
        self.assertEqual(main.motivo_da_falha({"codigoErro": "OutroErro"}), "OutroErro")
        self.assertIsNone(main.motivo_da_falha({}))

    def test_schema_gets_the_ia_erro_column_on_an_existing_database(self):
        with tempfile.TemporaryDirectory() as pasta:
            banco = Path(pasta) / "teste.db"
            antigo = sqlite3.connect(banco)
            antigo.execute("""CREATE TABLE comprovantes (id TEXT PRIMARY KEY, status TEXT NOT NULL, arquivo TEXT NOT NULL,
              tipo TEXT NOT NULL, candidatos_json TEXT NOT NULL, ia_execucao_id TEXT, ia_status TEXT NOT NULL,
              leitura_ia_json TEXT, campos_manuais_json TEXT NOT NULL, parecer_json TEXT, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)""")
            antigo.commit(); antigo.close()
            original = main.DB, main.DATA
            main.DB, main.DATA = banco, Path(pasta)
            try:
                conexao = main.con()
                try:
                    colunas = {linha[1] for linha in conexao.execute("PRAGMA table_info(comprovantes)")}
                finally:
                    conexao.close()
            finally:
                main.DB, main.DATA = original
        self.assertIn("ia_erro", colunas)


if __name__ == "__main__":
    unittest.main()
