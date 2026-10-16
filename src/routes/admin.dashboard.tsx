import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { formatCompetencia } from "@/lib/mock-data";
import { getDataReferencia } from "@/lib/dias-uteis";
import { garantirMassaDemonstracaoRetroativos } from "@/lib/massa-demonstracao";
import { getDadosDashboard } from "@/lib/dashboard-gerdab-dados";
import { getCompetenciaVigente, getCompetenciasDashboard, getSituacaoFechamentoCompetencia } from "@/lib/dashboard-gerdab";
import { RequerAcao } from "@/components/dashboard-gerdab/RequerAcao";
import { PrazosAlertas } from "@/components/dashboard-gerdab/PrazosAlertas";
import { FechamentoCompetencia } from "@/components/dashboard-gerdab/FechamentoCompetencia";
import { MovimentacoesCard } from "@/components/dashboard-gerdab/MovimentacoesCard";
import { AtalhosERelatorios, PanoramaBase } from "@/components/dashboard-gerdab/PanoramaAtalhos";

export const Route = createFileRoute("/admin/dashboard")({
  component: Dashboard,
});

/**
 * Dashboard GERDAB — fila de ação na primeira dobra. Substitui o Dashboard anterior (cards de fase,
 * indicadores fixos, últimos requerimentos e alertas fixos). Cada indicador usa a mesma consulta da
 * tela de destino (`dashboard-gerdab.ts`); o que ainda não tem fonte real (Alterações mensais e
 * Movimentações) vem de módulos demonstrativos e é sinalizado com o selo "Dados demonstrativos".
 *
 * O filtro de Competência vale para os indicadores financeiros/cadastrais; as solicitações
 * administrativas (Requer ação) seguem o mês de recebimento. Dias úteis/fechamento seguem o
 * calendário único do sistema (`dias-uteis.ts`, com feriados nacionais e do DF).
 */
function Dashboard() {
  const [versao, setVersao] = useState(0);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  // Protótipo: o Dashboard usa a base demonstrativa centralizada (`dashboard-gerdab-demo.ts`).
  const fonte = "demonstrativo" as const;

  // DEMONSTRAÇÃO DO PROTÓTIPO: mesma semeadura da tela de Ressarcimentos de meses anteriores, para a
  // fila já ter conteúdo quando o Dashboard é a primeira tela aberta. Não é comportamento de produção.
  useEffect(() => {
    garantirMassaDemonstracaoRetroativos();
    setVersao((v) => v + 1);
  }, []);

  const dados = useMemo(() => {
    const ref = getDataReferencia();
    const competencias = getCompetenciasDashboard(ref);
    const vigente = getCompetenciaVigente(ref);
    const competencia = selecionada ?? vigente;
    return {
      competencias,
      vigente,
      competencia,
      situacao: getSituacaoFechamentoCompetencia(competencia, ref),
      d: getDadosDashboard(competencia, competencias.map((c) => c.chave), fonte),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada, versao]);

  const rotulo = formatCompetencia(dados.competencia);
  const estado = dados.situacao.vigente ? "(vigente)" : dados.situacao.fechada ? "(encerrada)" : "";
  const [atualizado, setAtualizado] = useState("");
  useEffect(() => {
    const d = getDataReferencia();
    const dois = (n: number) => String(n).padStart(2, "0");
    setAtualizado(`Atualizado hoje, ${dois(d.getDate())}/${dois(d.getMonth() + 1)} às ${dois(new Date().getHours())}:${dois(new Date().getMinutes())}`);
  }, [versao]);
  const muted = { color: "var(--gd-muted)" } as const;
  const forte = { color: "var(--gd-text)", fontWeight: 600 } as const;

  return (
    <div className="gd" style={{ padding: "32px clamp(16px, 3.5%, 48px) 48px", display: "flex", flexDirection: "column", gap: 28, background: "var(--gd-bg)", minHeight: "100%" }}>
      <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12, position: "relative" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.4px", margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 14, margin: "6px 0 0", ...muted }}>
            Competência <strong style={forte}>{rotulo}</strong> {estado} · {dados.situacao.fechada ? "fechada automaticamente em" : "fechamento automático em"}{" "}
            <strong style={forte}>{dados.situacao.fechamentoEm.toLocaleDateString("pt-BR")}</strong> (2º dia útil)
          </p>
          <p style={{ fontSize: 12, margin: "4px 0 0", ...muted }}>Solicitações administrativas pelo mês de recebimento · indicadores financeiros e cadastrais pela competência.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, ...muted }}>
            Competência
            <select
              value={dados.competencia}
              onChange={(e) => setSelecionada(e.target.value)}
              aria-label="Filtrar por competência"
              style={{ height: 44, padding: "0 10px", border: "1px solid var(--gd-border)", borderRadius: 10, background: "var(--gd-card)", color: "var(--gd-text)", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              {[...dados.competencias].reverse().map((c) => (
                <option key={c.chave} value={c.chave}>{c.rotulo}</option>
              ))}
            </select>
          </label>
          <span title="Os números e registros deste painel são fictícios, para validar o fluxo de navegação do protótipo." style={{ fontSize: 11, fontWeight: 600, color: "var(--gd-amber)", background: "var(--gd-amber-soft)", padding: "3px 9px", borderRadius: 999 }}>
            Dados demonstrativos
          </span>
          <span style={{ fontSize: 12, ...muted }}>{atualizado}</span>
        </div>
      </header>

      <RequerAcao dados={dados.d} competencia={dados.competencia} competenciaRotulo={rotulo} vigente={dados.situacao.vigente} />

      <PrazosAlertas dados={dados.d} />

      <MovimentacoesCard competencia={dados.competencia} competenciaRotulo={rotulo} linhas={dados.d.movimentacoes.linhas} />

      <FechamentoCompetencia dados={dados.d} competencia={dados.competencia} competenciaRotulo={rotulo} situacao={dados.situacao} competencias={dados.competencias} />

      <PanoramaBase panorama={dados.d.panorama} competenciaRotulo={rotulo} />

      <AtalhosERelatorios relatorios={dados.d.relatorios.itens} />

      <p style={{ fontSize: 12, margin: 0, lineHeight: 1.5, ...muted }}>
        Contagens marcadas como demonstrativas variam conforme a competência selecionada. As datas de fechamento são calculadas pelo 2º dia útil, considerando feriados nacionais e os distritais do DF (21/04 e 30/11); Carnaval e Corpus Christi, por serem pontos facultativos, não são descontados; em produção, usar o calendário oficial da aplicação.
      </p>
    </div>
  );
}
