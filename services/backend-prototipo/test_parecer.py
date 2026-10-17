"""O parecer vale para o processo inteiro, nao so para o documento aberto na tela (sem rede).

Uso, dentro de services/backend-prototipo:  python -m unittest test_parecer (com o Python do venv da IA)
"""
import tempfile
import unittest
from pathlib import Path

import main


class ParecerDoProcessoTests(unittest.TestCase):
    def setUp(self):
        self._pasta = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self._antes = (main.DATA, main.DB)
        main.DATA = Path(self._pasta.name)
        main.DB = main.DATA / "teste.db"
        c = main.con()
        for id_, processo in (("a", "P1"), ("b", "P1"), ("c", "P2"), ("d", None)):
            c.execute("INSERT INTO comprovantes (id,status,arquivo,tipo,candidatos_json,ia_status,campos_manuais_json,criado_em,atualizado_em,processo_id) "
                      "VALUES (?,?,?,?,?,?,?,?,?,?)", (id_, "EM_ANALISE", f"/x/{id_}-arquivo.pdf", "boleto", "[]", "CONCLUIDA", "{}", "2026-10-16", "2026-10-16", processo))
        c.commit()
        c.close()

    def tearDown(self):
        main.DATA, main.DB = self._antes
        self._pasta.cleanup()

    def parecer_de(self, id_):
        return main.get_record(id_)["parecer"]

    def test_the_decision_is_saved_on_every_document_of_the_process_and_only_there(self):
        main.parecer("b", main.Parecer(decisao="RECUSADO", justificativa="x", analista_id="analista-teste"))
        self.assertEqual([self.parecer_de(i)["decisao"] for i in ("a", "b")], ["RECUSADO", "RECUSADO"])
        self.assertEqual([main.get_record(i)["status"] for i in ("a", "b")], ["PARECER_EMITIDO", "PARECER_EMITIDO"])
        self.assertIsNone(self.parecer_de("c"))
        self.assertEqual(main.get_record("c")["status"], "EM_ANALISE")

    def test_a_document_without_process_still_gets_its_own_decision(self):
        main.parecer("d", main.Parecer(decisao="APROVADO", justificativa="x", analista_id="analista-teste"))
        self.assertEqual(self.parecer_de("d")["decisao"], "APROVADO")
        self.assertIsNone(self.parecer_de("a"))


if __name__ == "__main__":
    unittest.main()
