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

## 2. Dashboard GERDAB (`/admin/dashboard`) — estado atual

> Esta seção descreve o comportamento **atualmente implementado**. O que mudou ao longo das rodadas (redesenho visual,
> contadores de notificação, expansões padronizadas) substituiu as descrições anteriores; o histórico resumido está em §8.

### 2.1 Estrutura da página (ordem)
1. **Cabeçalho** — título, competência (filtro), selo único "Dados demonstrativos", "Atualizado hoje…".
2. **Requer ação** (`RequerAcao.tsx`) — cabeçalho com o texto das filas pendentes e o botão **"Atualizações"** (§4.3);
   **três indicadores prioritários** — Alterações mensais, Comprovantes, Ressarcimentos de meses anteriores — Servidor — e
   **dois secundários** (menor peso visual) — Ressarcimentos de meses anteriores — Associações e Aptos na consolidação.
   Cada indicador tem **uma única ação** no rodapé ("Ver detalhes"/"Ocultar detalhes"; "Abrir fila ›" quando há destino único).
3. **Prazos e alertas documentais** (`PrazosAlertas.tsx`) — seção recolhível (fechada por padrão) com expansão padronizada (§2.4).
4. **Movimentações realizadas na competência** (`MovimentacoesCard.tsx`) — categorias selecionáveis, detalhamento por
   modalidade × vínculo e acesso ao relatório NUPLA.
5. **Fechamento da competência** (`FechamentoCompetencia.tsx`) — Adimplentes / Inadimplentes / Requer análise (barra
   proporcional), consulta de inadimplência (da competência e recorrente) com busca e exportação PDF/Excel.
6. **Panorama da base** (titulares, dependentes, teto familiar, situação do titular, gráfico de composição) e
   **Atalhos / Últimos relatórios** (`PanoramaAtalhos.tsx`).

### 2.2 Expansão dos indicadores — regras comuns (cinco indicadores)
- **Uma única expansão aberta por vez** entre os cinco indicadores. Abrir outro fecha o anterior; fechar deixa zero abertas.
- **Posição:** o painel (`role="region"`, classe `gd-painel`) é inserido **imediatamente abaixo da linha** em que está o
  indicador (linha dos prioritários ou linha dos secundários), antes de qualquer outra linha ou seção; largura total.
- **Cartão selecionado:** `data-sel="true"` (borda/halo azuis), `aria-expanded="true"` e botão "Ocultar detalhes". O cartão
  inteiro é clicável (exceto links/botões internos e o contador); Enter/Espaço também alternam.
- **Cabeçalho padronizado** (`CabecalhoExpansao` em `PainelExpansao.tsx`): categoria (maiúsculas, azul, ex.:
  `COMPROVANTES · OUTUBRO/2026`), título, descrição, badges de resumo, CTA principal preenchido **só quando existe rota real**
  ("Abrir relação completa", "Abrir fila completa", "Abrir consolidação") e botão de fechar (×).
- **Corpo operacional** (todas as expansões, exceto Alterações mensais): barra de pesquisa + filtros de situação + total;
  tabela operacional (no mobile vira lista de cards); linha com hover azul-claro e botão **"Abrir"** por linha;
  **paginação progressiva** — "Mostrando 8 de N …" e "Mostrar mais 8" (o último passo mostra o que resta).
- A pesquisa e os filtros **só recortam a lista exibida**; não alteram registros, contagens de origem nem notificações.

### 2.3 Conteúdo de cada expansão
| Indicador | Cabeçalho (título / CTA) | Filtros | Colunas | Destino do "Abrir" |
|---|---|---|---|---|
| **Alterações mensais** | "N itens requerem atenção" · badges "N solicitações cadastrais" e "N pendências documentais" · sem CTA no cabeçalho | — (sete categorias selecionáveis) | prévia da fila da categoria (até 5 itens) | "Acessar Requerimentos" (`/admin/requerimentos?tipo=…`) e "Abrir Documentação e Pendências" (`/admin/relatorios/documentacao`) |
| **Comprovantes** | "N comprovantes aguardando análise / validados / devolvidos" conforme a situação · "Abrir relação completa" → `/admin/comprovantes?competencia&situacao` | **mini-indicadores** Validados · Aguardando análise · Devolvidos (§2.3.1) | Servidor · Documento · Situação · Acesso | `/admin/comprovantes?competencia&situacao` |
| **Ressarcimentos — Servidor** | "N competências aguardando análise" · badges por situação · "Abrir fila completa" → `/admin/retroativos?origem=individual` | Requer ação · Decididas | Servidor e competência · Situação · Próxima ação · Acesso | `/admin/retroativos?origem=individual` |
| **Ressarcimentos — Associações** | idem, `origem=associacao` · badges Assefaz/Assetran | Requer ação · Decididas | Servidor e associação · Competência e situação · Responsável · Acesso | `/admin/retroativos?origem=associacao` |
| **Aptos na consolidação** | "N titulares aptos na consolidação" · badges "N vidas"/"Disponível" · "Abrir consolidação" → `/admin/relatorios/pagamentos?competencia&aba=adimplente` | — | Titular · Plano e vidas · Valor · Acesso | consolidação da competência |

Observações: "Próxima ação" em Ressarcimentos — Servidor é derivada da situação ("Aguardando complementação" → Servidor;
"Recebido para análise"/"Em análise" → GERDAB; demais, responsável registrado). **Nenhuma rota abre um registro específico**
(Requerimentos, Comprovantes, Retroativos e Documentação abrem a fila filtrada); por isso os "Abrir" de uma mesma lista podem
ter o mesmo destino.

**2.3.1 Mini-indicadores de Comprovantes.** Validados / Aguardando análise / Devolvidos funcionam como filtros: o selecionado
(fundo azul-claro, borda azul e anel) atualiza título, descrição, contagem, lista e o CTA; os outros dois aparecem como
badges de resumo. Clicar neles **não** aciona o CTA nem os demais cartões.

**2.3.2 Alterações mensais — dois fluxos.** Detalhamento com dois grupos de fundo branco separados por divisor neutro de 4 px:
**Solicitações cadastrais** (`FLUXO: REQUERIMENTOS`: primeira inclusão, inclusão de dependentes, exclusão de dependentes,
mudança de plano → **Acessar Requerimentos**) e **Documentação para manutenção do benefício** (`FLUXO: RELATÓRIO`:
comprovante de matrícula, IRPF de enteados, laudo médico → **Abrir Documentação e Pendências**). Os dois botões têm o mesmo
estilo. Cada categoria é um cartão selecionável (`aria-pressed`) que abre a prévia da fila logo abaixo, com "Abrir ficha →".

### 2.4 Prazos e alertas documentais
- Seção recolhível (fechada por padrão); abre pelo cabeçalho da linha, por um evento de notificação (§4.4) ou pelo contador.
- **Cabeçalho padronizado:** categoria `PRAZOS E ALERTAS DOCUMENTAIS · OUTUBRO/2026`; título "Prazos e alertas documentais";
  descrição "Acompanhe os prazos, as solicitações complementares e as pendências documentais que exigem atenção.";
  badges com quantidades reais (vencidos, requerem atenção, recebidos, solicitações complementares); CTA
  "Abrir relação completa" → `/admin/relatorios/documentacao`; botão de fechar.
- **Bloco 1 — Validades e obrigações:** alertas por vencimento (obrigações automáticas), filtro `Filtrar alertas`, busca por
  titular, ficha resumida e link "Ver todos os alertas". **Bloco 2 — Solicitações documentais complementares**
  (`#fila-complementares`): tabela operacional (busca, filtros Todas/Aguardando envio/Recebido para análise, paginação,
  "Analisar"/"Abrir na origem").
- A fila é só **leitura** (`acompanhamento-documental.ts`): um adaptador por origem (Requerimentos da Associação,
  Comprovantes, Ressarcimentos de meses anteriores — individual); o tratamento continua no registro original.
  Não entram: "Solicitar documento comprobatório" de Requerimentos do Servidor (nada é gravado), recebimento de documento
  complementar de Comprovante (o pedido é apagado ao chegar), planilhas e Ressarcimentos de Associação.

### 2.5 Dados e arquitetura
```
dashboard-gerdab.ts        consultas reais (comprovantes, fila de ressarcimentos, fechamento, relatórios…)
dashboard-gerdab-demo.ts   geradores determinísticos demonstrativos (847 titulares, responsáveis fictícios)
dashboard-gerdab-dados.ts  getDadosDashboard(competencia, competencias, fonte) → view-model único
acompanhamento-documental.ts  fila de solicitações complementares (adaptadores só de leitura)
movimentacoes-pro-saude.ts fonte COMPARTILHADA com o NUPLA (ver §3)
dias-uteis.ts              calendário único (feriados nacionais + DF)
```
- A rota fixa `fonte = "demonstrativo"`: **os números dos cartões (ex.: 12 comprovantes, 794 titulares) são demonstrativos e
  não coincidem com as listas reais do protótipo**; as expansões carregam os registros existentes e, quando o total difere,
  indicam "total demonstrativo". O ramo `"real"` está pronto e dormente. Alterações mensais e Movimentações não têm fonte real.
- **Massa demonstrativa** de solicitações complementares (`massa-demonstracao-complementares.ts`, versão "2"): 2 requerimentos
  de associação e 3 comprovantes (competência 2026-09, fora do Fechamento de Pagamento) + os cenários de Ressarcimentos já
  semeados; ids `demo-compl-*`, marcador em `localStorage`, idempotente e sem sobrescrever ids existentes. Nomes fictícios.
- Responsáveis fictícios (Rebeca/Luciana — Analista; Erandir — Gerente) são demonstrativos e **nunca atribuídos ao usuário logado**.

### 2.6 Feriados e dias úteis
`getFeriados`, `isFeriado`, `isDiaUtil`, `getNesimoDiaUtil`: 01/01, Sexta-feira Santa, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11,
20/11, 30/11, 25/12. Carnaval e Corpus Christi não são descontados; em produção usar o calendário oficial.
`prazo-competencia.ts` delega a este módulo (`segundoDiaUtilMesSeguinte`).

### 2.7 Navegação por parâmetros de URL
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

### 2.8 Interação e acessibilidade (resumo; detalhes visuais no briefing, seção 28)
Cartões clicáveis com hover (borda/halo azuis, título e CTA realçados), selecionado, foco visível e Enter/Espaço;
`aria-expanded` nos indicadores e na seção recolhível; painéis com `role="region"`; botões de fechar e "Abrir" com nome
acessível; `prefers-reduced-motion` desliga elevação, transições e rolagem suave.

### 2.9 Fechamento da competência e Panorama da base
- **Fechamento:** três cartões (Adimplentes, Inadimplentes, Requer análise) com ponto semântico e barra proporcional;
  cada cartão abre `/admin/relatorios/pagamentos?competencia&aba=adimplente|inadimplente|requer_analise`; consulta de inadimplência recorrente com busca e exportação.
  Valores demonstrativos (`fonte = "demonstrativo"`); a regra de fechamento automático é a do Módulo de Pagamento.
- **Panorama:** resumo de titulares/dependentes/teto familiar, tabela de situação do titular e barra de composição da base
  (gráfico compacto só para composição). Hover padronizado nos cartões e linhas, sem alterar dados.

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

## 4. Tema escuro, notificações do Admin e contadores

### 4.1 Tema claro/escuro
- `src/lib/tema.ts` (preferência `prosaude_tema` em `localStorage`, classe `.dark` em `<html>`, hook `useTema`),
  `components/AlternarTema.tsx` e script no `<head>` em `__root.tsx` que aplica o tema salvo **antes da primeira pintura**.
- O botão está no Admin (sidebar desktop e topo mobile), Portal do Servidor e Área da Associação; a preferência vale em todo o
  sistema e persiste. A tela de login segue o tema salvo, mas não tem botão.
- Tokens completos em `src/styles.css` (`.dark`) + mapeamento único das cores fixas legadas; tokens do Dashboard em `.dark .gd`
  e, para o estilo redesenhado, `.dark .gd.gd-dash`.

### 4.2 Modelo de notificações (`src/lib/notificacoes-admin.ts`)
- **Um acontecimento = uma notificação** (id estável `modulo:registro:tipo:marcador`). Uma nova versão/reenvio do mesmo
  registro gera **nova** notificação; recarregar nunca duplica. O mesmo acontecimento pode aparecer em mais de um indicador
  do Dashboard (campo `indicadores`), mas conta **uma vez** no sino.
- **Eventos que geram notificação (reais, derivados dos registros persistidos, enquanto aguardam a GERDAB):**
  Requerimentos de Associação — novo requerimento (`alteracoes`) e complementação recebida (`alteracoes` + `prazos`);
  Comprovantes — novo comprovante recebido (`comprovantes`) e comprovante corrigido/reenviado (`comprovantes` + `prazos`);
  Ressarcimentos de meses anteriores — nova solicitação aguardando análise (`ress_servidor` ou `ress_associacoes`) e
  complementação recebida do servidor (indicador + `prazos`); Negociações — fila de confirmações de pagamento pendentes e
  relatórios recebidos das associações aguardando conferência (módulo `negociacoes`, sem indicador do Dashboard; ids fixos e
  dinâmicos, somem quando a fila esvazia).
- **Eventos que NÃO geram notificação:** Movimentações, Aptos na consolidação, Fechamento e Panorama (não há acontecimento
  discreto); relatório de ressarcimento de Negociações; decisões da própria GERDAB; edição cadastral. As **7 notificações
  demonstrativas** do protótipo aparecem **apenas no sino**, com selo "Demonstrativa", e não alimentam menu nem Dashboard.
- **Leitura por perfil:** estado "lida" **único por acontecimento e por perfil** (Analista/Gerência), em
  `localStorage` (`prosaude_notificacoes_admin_lidas:<perfil>`; na primeira vez herda a lista antiga). Sem backend nem identidade
  individual: duas pessoas com o mesmo perfil compartilham a leitura (limitação). Persiste após recarregar.
- **Sincronização:** `useNotificacoesAdmin()` é a fonte única de sino, menu lateral e Dashboard; atualiza ao ler, trocar de
  tela, voltar à aba, em `storage` e em alterações de Negociações. Ler em um lugar atualiza os três.
- Não existe página "Ver todas as notificações".

### 4.3 Sino, menu lateral e contadores
- **Sino** (`AdminNotificationBell`): contador de não lidas (reais + demonstrativas), lista com selo do módulo, marcar como
  lida ao clicar (com navegação ao destino) e "Marcar todas como lidas"; fecha com Esc/clique fora.
- **Contador vermelho** (`ContadorNotificacoes`): círculo com a quantidade de **notificações não lidas** — nunca a quantidade
  de pendências operacionais; some em zero. Aparece no menu lateral (Dashboard, Requerimentos, Comprovantes, Ressarcimentos,
  Negociações), nos cartões dos cinco indicadores e em Prazos e alertas documentais. Tooltip "Ver atualizações — Última às HH:mm".
- **Modal contextual:** clicar no contador abre a lista das atualizações daquele módulo/indicador ("Atualizações desde seu
  último acesso") **sem marcar nada como lida**; só escolher uma atualização a marca como lida. No menu, a lista é um popover
  (portal, posição fixa) e a seleção navega à fila de origem; no Dashboard, a seleção abre a expansão (§4.4).
- **Modal consolidada "Atualizações do dashboard"** (botão "Atualizações" no cabeçalho de "Requer ação",
  `AtualizacoesDashboard.tsx`): uma linha por indicador com notificações reais não lidas (contagem, resumo dos eventos,
  "Ver atualizações"), que abre a modal contextual do indicador. Abrir/fechar não marca nada como lido.

### 4.4 Integração notificação → expansão
Ao selecionar uma atualização na modal contextual de um indicador do Dashboard: marca **somente aquela** como lida, abre a
expansão correspondente (fechando as outras), seleciona o filtro adequado (Comprovantes → Aguardando análise; Ressarcimentos →
Requer ação; Prazos → fila de complementares com busca pela entidade), rola suavemente até o painel e exibe o aviso
"Atualização selecionada: … Abrir na fila de origem", destacando o registro (`data-destaque`) quando ele existe na lista.
Como as listas do Dashboard são demonstrativas, o registro notificado pode não estar nelas — o aviso explica e leva à fila de
origem. O sino e o menu continuam navegando direto para a fila de origem (com o toast "Localize na fila: …").

---

## 5. Arquivos principais

**Novos:** `src/components/dashboard-gerdab/*` (RequerAcao, PrazosAlertas, PainelExpansao, PaineisIndicadores,
AtualizacoesDashboard, MovimentacoesCard, FechamentoCompetencia, PanoramaAtalhos, gd-ui), `src/components/ContadorNotificacoes.tsx`,
`src/lib/acompanhamento-documental.ts`, `src/lib/massa-demonstracao-complementares.ts`, `src/lib/dashboard-gerdab*.ts`,
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

- `npx tsc --noEmit`: somente os 2 erros pré-existentes e não relacionados (`StatusBadge.tsx` — tipo `Record<StatusKey>`
  incompleto; `login.tsx` — comparação de perfis sem sobreposição); `npm run build` com sucesso em cada rodada.
- Expansões: abertura/fechamento dos cinco indicadores, alternância (sempre uma região aberta), posição abaixo da linha,
  cabeçalhos, pesquisa, filtros, mini-indicadores, "Mostrar mais", links "Abrir" e fluxo notificação → expansão testados no
  navegador; desktop e mobile (375 px, sem rolagem horizontal) e tema escuro conferidos.
- Notificações: contadores de menu/cartões/sino sincronizados; leitura por perfil; sem duplicação ao recarregar.
- NUPLA: coerência de totais (meses × semestres × ano × Dashboard), PDFs e XLSX gerados e relidos.
- Tema escuro: varredura automática de contraste (mínimo 3:1) nas páginas do Admin, Servidor e Associação.

## 7. Limitações, regras provisórias e itens não implementados

**Demonstrativo:** Alterações mensais, Movimentações/NUPLA, números dos cartões e das barras (847 titulares), 7 notificações
demonstrativas e responsáveis fictícios. Os relatórios demonstrativos do Dashboard não têm snapshot real no histórico.

**Limitações técnicas do protótipo:** sem backend — tudo em `localStorage`/IndexedDB do navegador; leitura de notificações por
perfil (não por pessoa); nenhuma rota abre um registro específico (os "Abrir" levam à fila de origem filtrada); o registro
notificado pode não constar das listas demonstrativas do Dashboard; o ramo de dados reais do view-model está dormente;
calendário de feriados fixo (produção deve usar o oficial); seletor de ano do NUPLA mostra só o ano de referência; tela de
login sem botão de tema; rótulos legados "Retroativo" do fluxo antigo de comprovantes não foram renomeados.

**Escopo da fila de solicitações complementares:** ver §2.4 (origens não cobertas).

**Planejado, não implementado:** página "Ver todas as notificações"; notificações para Movimentações/Aptos; integração real
(backend, SEI, contracheque) — fora de escopo.

## 8. Histórico resumido das rodadas

1. Dashboard GERDAB + NUPLA + tema escuro + sino (três fases).
2. Redesenho visual do Dashboard (tokens `.gd-dash`, hover padronizado, Prazos em dois blocos).
3. Prazos e alertas documentais com fila de solicitações complementares e massa demonstrativa.
4. Notificações integradas (estado único por perfil; contadores no menu, cartões e Prazos; modais contextual e consolidada).
5. Expansões padronizadas dos indicadores (cabeçalho, pesquisa, filtros, paginação, integração com notificações).
6. Edição cadastral de telefone pela GERDAB — ver `docs/PORTAL_SERVIDOR_NAVEGACAO_E_CADASTRO.md`, seção 7.
