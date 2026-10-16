# Documentação Técnica — Dashboard GERDAB, Relatório NUPLA, Tema Escuro e Notificações do Admin

> **Escopo:** implementação, em três fases validadas uma a uma, do novo Dashboard GERDAB, do
> Relatório de Movimentações do Pró-Saúde (NUPLA) e dos recursos transversais (tema claro/escuro e
> sino de notificações do Admin). **Referência visual e funcional:** protótipo de alta fidelidade
> exportado do Claude Design (`Dashboard GERDAB Tela.dc.html`, `Relatorio NUPLA.dc.html`),
> usado **apenas como referência** — nenhum código de simulação dos `.dc.html` foi copiado.
> **Briefing visual correspondente:** `docs/BRIEFING_DESIGN_PRODUCAO.md`, seção 28.
> **Regras de negócio:** nenhuma foi criada ou alterada por números demonstrativos.

---

## 1. Decisões que orientaram a implementação

| Tema | Decisão |
|---|---|
| Dados | Reais sempre que existirem; onde não há fonte, mocks **centralizados** e identificados como "Dados demonstrativos", nunca misturados em silêncio |
| Dias úteis | Calendário único com feriados nacionais e do DF (`src/lib/dias-uteis.ts`), usado por Dashboard, fechamento e demais módulos |
| Terminologia | Texto visível "Retroativos" → **"Ressarcimentos de meses anteriores"**; rotas, identificadores e contratos técnicos preservados |
| Relatórios | Sem numeração global fictícia; exibem nome/tipo/competência/data reais; sequência é por competência |
| Código dos protótipos | `.dc.html` só como referência; componentes e serviços do projeto reaproveitados |
| Preservação | Parâmetros e permissões por perfil mantidos; sem alterações antigas ou arquivos não relacionados |

---

## 2. Fase 1 — Dashboard GERDAB (`/admin/dashboard`)

### 2.1 Estrutura da página (ordem)
1. **Cabeçalho** — título, competência (filtro), selo único "Dados demonstrativos", "Atualizado hoje…".
2. **Requer ação** (`RequerAcao.tsx`) — cinco indicadores: Alterações mensais, Comprovantes,
   Ressarcimentos de meses anteriores — Servidor, — Associações, Aptos na consolidação.
3. **Prazos e alertas documentais** (`PrazosAlertas.tsx`) — busca por nome/matrícula do titular,
   lista paginada, ficha resumida.
4. **Movimentações realizadas na competência** (`MovimentacoesCard.tsx`) — categorias selecionáveis
   com detalhamento por modalidade × vínculo e acesso ao relatório NUPLA.
5. **Fechamento da competência** (`FechamentoCompetencia.tsx`) — adimplentes/inadimplentes/requer
   análise, consulta de inadimplência (da competência e recorrente) com busca e exportação PDF/Excel.
6. **Panorama da base** e **Atalhos/Últimos relatórios** (`PanoramaAtalhos.tsx`).

### 2.2 Alterações mensais — dois fluxos
- Indicador principal: categoria **GESTÃO DE BENEFÍCIOS**, "N de M aguardando análise" e
  "11 solicitações cadastrais · 7 pendências documentais" (valores calculados da mesma fonte das
  listas). Clicar no cartão **só abre/fecha** o detalhamento — não navega.
- Detalhamento com dois grupos de fundo branco separados por divisor neutro de 4 px:
  - **Solicitações cadastrais** (etiqueta `FLUXO: REQUERIMENTOS`): primeira inclusão, inclusão de
    dependentes, exclusão de dependentes, mudança de plano → botão **Acessar Requerimentos →**
    (`/admin/requerimentos?tipo=…&competencia=…`).
  - **Documentação para manutenção do benefício** (etiqueta `FLUXO: RELATÓRIO`): comprovante de
    matrícula, declaração de IRPF de enteados, laudo médico de invalidez temporária → botão
    **Abrir Documentação e Pendências →** (`/admin/relatorios/documentacao`).
  - Os dois botões têm o mesmo estilo (azul-escuro, texto branco).
- Cada categoria é um cartão selecionável (barra superior azul, selo "SELECIONADO", chevron
  circular) que abre a **prévia da fila** logo abaixo da linha do cartão (no mobile, abaixo do
  próprio cartão): até 5 itens com "Abrir ficha →" e o link para a tela completa.

### 2.3 Arquitetura de dados
```
dashboard-gerdab.ts        consultas reais (comprovantes, fila de ressarcimentos, fechamento, relatórios…)
dashboard-gerdab-demo.ts   geradores determinísticos demonstrativos (847 titulares, responsáveis fictícios)
dashboard-gerdab-dados.ts  getDadosDashboard(competencia, competencias, fonte) → view-model único
movimentacoes-pro-saude.ts fonte COMPARTILHADA com o NUPLA (ver §3)
dias-uteis.ts              calendário único (feriados nacionais + DF)
```
- A rota fixa `fonte = "demonstrativo"`; o ramo `"real"` do view-model está pronto e dormente.
  Para integrar uma consulta real basta trocar o ramo correspondente em `dashboard-gerdab-dados.ts`
  (o formato retornado é o mesmo). Alterações mensais e Movimentações **não têm fonte real** no
  projeto e são sempre demonstrativas.
- Responsáveis fictícios (Rebeca/Luciana — Analista; Erandir — Gerente) são identificados como
  demonstrativos e **nunca atribuídos automaticamente ao usuário logado**.

### 2.4 Feriados e dias úteis
`getFeriados`, `isFeriado`, `isDiaUtil`, `getNesimoDiaUtil`: 01/01, Sexta-feira Santa, 21/04, 01/05,
07/09, 12/10, 02/11, 15/11, 20/11, 30/11, 25/12. Carnaval e Corpus Christi (pontos facultativos) não
são descontados; em produção usar o calendário oficial. `prazo-competencia.ts` delega a este módulo
(`segundoDiaUtilMesSeguinte`), e `docs/MODULO_PAGAMENTO.md` foi atualizado.

### 2.5 Navegação por parâmetros de URL
| Destino | Parâmetros aceitos |
|---|---|
| `/admin/comprovantes` | `competencia`, `situacao` (aguardando/validados/devolvidos), `aba` — exibe chip do filtro |
| `/admin/requerimentos` | `tipo`, `status`, `competencia` — chip informativo "Referência do Dashboard…" |
| `/admin/retroativos` | `origem` (`individual` \| `associacao`) |
| `/admin/relatorios/pagamentos` | `competencia`, `aba` (`adimplente` \| `inadimplente` \| `requer_analise`) |
| `/admin/relatorios/pagamentos/historico` | `relatorio` (abre direto o snapshot indicado) |
| `/admin/relatorios/documentacao` | `status` (`aguardando_envio` \| `aguardando_analise` \| `aprovado`) |
| `/admin/servidores` | `situacao`, `teto` |
| `/admin/relatorios/gerencial#servidores-no-teto-familiar` | âncora com rolagem automática |
| `/admin/relatorios/nupla` | `periodicidade`, `competencia`, `semestre`, `bimestre` |

### 2.6 Interação (resumo; detalhes visuais no briefing, seção 28)
Cartão inteiro clicável (exceto links/botões internos); hover com elevação de 2 px; selecionado com
borda azul + fundo azul claro + halo; área clicável preservada durante a elevação (extensão
invisível de 4 px); teclado (Enter/Espaço) e foco visível; `prefers-reduced-motion` respeitado.

---

## 3. Fase 2 — Relatório NUPLA (`/admin/relatorios/nupla`)

- **Rota:** `src/routes/admin.relatorios.nupla.tsx`; cartão "Movimentações do Pró-Saúde — NUPLA"
  adicionado à Visão Geral de Relatórios; botão "Acessar relatório NUPLA ↗" no Dashboard
  (`?periodicidade=mensal&competencia=AAAA-MM`).
- **Filtros:** Mensal, Semestral e Anual; períodos em andamento identificados; meses futuros sem
  dados (`—`).
- **Tabela principal:** 8 categorias (Novas adesões, Inclusão/Exclusão de dependentes, Troca de plano,
  Alteração de valor, Reinclusões, Suspensões, Exclusão de titulares) × 6 grupos (Boletos, ASSEFAZ,
  ASSETRAN × Ativos/Inativos) + total por linha e total geral. Em cada categoria, a soma dos seis
  grupos é igual ao total.
- **Detalhamento por bimestre:** (semestral/anual) "Janeiro/Fevereiro" reúne os dois meses;
  seletor "Todos os bimestres" ou um bimestre específico.
- **Fonte compartilhada:** `movimentacoes-pro-saude.ts` — tela, Dashboard e exportações leem a mesma
  função; mensal, semestral e anual fecham entre si (verificado: meses somam o semestre, semestres
  somam o ano, total de outubro igual ao do Dashboard). Integração futura: substituir apenas
  `lerMovimentacoesConcluidas`.
- **Exportação (PDF e Excel), relatório principal e detalhamento:** specs em
  `src/lib/relatorio-nupla.ts`, consumidas pelo motor comum (`relatorio-export*.ts`), que ganhou dois
  campos **opcionais**: `gruposCabecalho` (cabeçalho agrupado — Boletos/ASSEFAZ/ASSETRAN sobre
  Ativos/Inativos, com células mescladas no Excel) e `notas` (rodapé explicativo); e `nomeAba`
  (a aba do Excel se chama **"NUPLA"**; o título completo permanece no conteúdo). Relatórios
  existentes não mudam.
- **Dados demonstrativos:** selo na tela e nota em todos os arquivos exportados.

---

## 4. Fase 3 — Tema escuro, notificações e parâmetros

### 4.1 Tema claro/escuro
- `src/lib/tema.ts` (preferência `prosaude_tema` em `localStorage`, classe `.dark` em `<html>`,
  hook `useTema`), `components/AlternarTema.tsx` (botão claro/escuro) e script no `<head>` em
  `__root.tsx` que aplica o tema salvo **antes da primeira pintura** (sem "flash").
- O botão está no Admin (sidebar desktop e topo mobile), Portal do Servidor e Área da Associação;
  a preferência vale em todo o sistema e persiste ao navegar/recarregar. A tela de login segue o
  tema salvo, mas não tem botão.
- Tokens do tema escuro completos em `src/styles.css` (`.dark`) + mapeamento único das cores fixas
  legadas (paleta Tailwind literal) para o escuro; tokens do Dashboard em `.dark .gd`.

### 4.2 Sino de notificações do Admin
- `components/AdminNotificationBell.tsx` + `lib/notificacoes-admin.ts`: contador de não lidas,
  lista, marcar como lida (ao clicar, com navegação ao destino) e "Marcar todas como lidas";
  fecha com Esc/clique fora; no mobile ocupa a largura da tela.
- **Reais:** requerimentos de associações aguardando avaliação e ressarcimentos de meses anteriores
  aguardando análise. **Demonstrativas** (as 7 do protótipo): selo "Demonstrativa" + nota no rodapé.
- Estado de leitura por navegador (protótipo, sem backend). Não foi criada a página "Ver todas as
  notificações" (não existe no projeto).
- Os sinos do Portal do Servidor e da Associação (`NotificationBell`) foram preservados.

---

## 5. Arquivos principais

**Novos:** `src/components/dashboard-gerdab/*` (RequerAcao, PrazosAlertas, MovimentacoesCard,
FechamentoCompetencia, PanoramaAtalhos, gd-ui), `src/lib/dashboard-gerdab*.ts`,
`src/lib/movimentacoes-pro-saude.ts`, `src/lib/relatorio-nupla.ts`, `src/lib/notificacoes-admin.ts`,
`src/lib/tema.ts`, `src/components/AlternarTema.tsx`, `src/components/AdminNotificationBell.tsx`,
`src/routes/admin.relatorios.nupla.tsx`.

**Alterados:** `src/routes/admin.dashboard.tsx` (substitui o Dashboard anterior), `src/styles.css`,
`src/routes/__root.tsx`, layouts (Admin/Servidor/Associação), `dias-uteis.ts`, `prazo-competencia.ts`,
motor de exportação (`relatorio-export*.ts`), rotas de destino com `validateSearch`
(comprovantes, requerimentos, retroativos, pagamentos, histórico, documentação, servidores,
gerencial), renomeação do termo "Ressarcimentos de meses anteriores" em menus/telas/relatórios.

---

## 6. Verificações realizadas

- `npx tsc --noEmit`: somente os 2 erros pré-existentes (`StatusBadge.tsx`, `login.tsx`);
  `npm run build` com sucesso em cada fase.
- Desktop (1440 px) e mobile (375 px): sem rolagem horizontal, sem sobreposições nem cortes;
  área clicável dos indicadores testada com cliques reais e amostragem `elementFromPoint`.
- NUPLA: coerência de totais (meses × semestres × ano × Dashboard), PDFs e XLSX gerados e relidos
  (cabeçalho agrupado, mesclagens, filtro, congelamento, nome da aba).
- Tema escuro: varredura automática de contraste (mínimo 3:1) em todas as páginas do Admin, Servidor
  e Associação; persistência confirmada após navegação e recarga.

## 7. Limitações e pontos com dados demonstrativos

- Alterações mensais, Movimentações/NUPLA, notificações demonstrativas e responsáveis fictícios são
  demonstrativos; a base ampliada do Dashboard (847 titulares) é fictícia.
- Os relatórios demonstrativos do Dashboard não possuem snapshot real correspondente no histórico.
- Rótulos legados "Retroativo" do fluxo antigo de comprovantes **não** foram renomeados (pendente
  de decisão).
- O seletor de ano do NUPLA mostra apenas o ano da data de referência.
- Estado de leitura das notificações e preferência de tema são por navegador.
- Calendário: feriados fixos do protótipo; produção deve usar o calendário institucional oficial.
