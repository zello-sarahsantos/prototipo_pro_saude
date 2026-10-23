# Documentação Técnica — Módulo de Negociações (Fases 1 a 4)

> **Escopo:** cadastro e acompanhamento de negociações de débitos de servidores com as associações/operadoras,
> confirmação manual de quitação, Relatório de Negociações enviado pelas Associações e Relatório de Ressarcimento de
> Negociações para o NURFI. Implementado em quatro fases validadas uma a uma; a Fase 5 consolidou a validação integrada e esta
> documentação. **Briefing visual correspondente:** `docs/BRIEFING_DESIGN_PRODUCAO.md`, seção 29.
> **Fontes:** ata de 14/10/2026 (seção 3, regras de negociação), relatório de negociações da operadora e planilha de cálculo da
> GERDAB (usados só como referência de estrutura; **nenhum dado pessoal real** foi usado, copiado ou reproduzido).
> **Dados:** todo o conteúdo do módulo é fictício e identificado como "Dados demonstrativos".

---

## 1. Decisões e limites que valem para todo o módulo

| Tema | Decisão |
|---|---|
| Quitação | Sempre **confirmada manualmente** pela GERDAB. Nada é inferido de vencimento, de anexo ou de relatório da associação |
| Arquivos | **Nunca interpretados** (sem OCR, IA, importação estruturada ou leitura automática). Servem de referência para conferência humana |
| SEI | Sem integração: o nº do processo SEI é só um dado informado |
| Valores | Centavos inteiros; sem juros; sem inventar regra financeira. Truncamento é o **critério do protótipo** (§3.3) |
| Perfis | Somente **Analista** e **Gerência** (mesmas permissões) acessam as telas administrativas; Servidor e Associação veem "Acesso restrito" |
| Associação | O seletor de associação das telas da Área da Associação **simula a associação autenticada** (em produção vem do login) |
| Armazenamento | Metadados e valores em `localStorage`; conteúdo dos arquivos em **IndexedDB** (`prosaude-arquivos`, store `arquivos`, helper `armazenamento-arquivos.ts`) |
| Eventos | Toda gravação dispara `prosaude-negociacoes`; fila, indicadores, sino e telas se atualizam sem recarregar |
| Preservação | Módulos anteriores não foram alterados; o cadastro principal do servidor nunca é modificado por uma negociação |

---

## 2. Mapa de arquivos

| Arquivo | Papel |
|---|---|
| `src/lib/negociacoes.ts` | Núcleo: tipos, cálculo, criação, quitação, fila, indicadores, persistência |
| `src/lib/negociacoes-envios.ts` | Relatórios enviados pelas associações (Fase 3) |
| `src/lib/negociacoes-ressarcimento.ts` | Emissões do relatório de ressarcimento (Fase 4) |
| `src/lib/massa-demonstracao-negociacoes.ts`, `massa-demonstracao-envios.ts` | Massa de demonstração (idempotente, versionada) e restauração do cenário |
| `src/lib/armazenamento-arquivos.ts` | Wrapper do IndexedDB |
| `src/lib/notificacoes-admin.ts` | Notificações dinâmicas do módulo (§7) |
| `src/components/negociacoes/ui.tsx` | Componentes comuns (guarda de perfil, upload "Selecionar documento", abas, selos, memória de cálculo) |
| `ConfirmarQuitacaoModal.tsx`, `RessarcimentoNegociacoes.tsx` | Modal de quitação (reutilizado) e tela do relatório de ressarcimento (reutilizada nas duas entradas) |
| `src/routes/admin.negociacoes.{index,nova,$id,recebidos,ressarcimento}.tsx` | Telas administrativas |
| `src/routes/admin.relatorios.negociacoes.tsx` | 2ª entrada do relatório de ressarcimento (Central de Relatórios) |
| `src/routes/associacao.negociacoes.tsx` | Relatório de Negociações na Área da Associação |
| `src/styles.css` | Classes `neg-*` (listas em grade com *container queries*) |

Chaves de armazenamento (`PROSAUDE_STORAGE_KEYS`): `negociacoes`, `massaDemoNegociacoes`, `negociacoesEnvios`,
`massaDemoNegociacoesEnvios`, `negociacoesEmissoes`.

---

## 3. Fase 1 — Cadastro e consulta (`/admin/negociacoes`, `/nova`, `/:id`)

### 3.1 Cadastro em 5 etapas
Servidor → meses negociados → parcelas → documentação → conferência. O cadastro só é confirmado com **documentação obrigatória**
("É necessário anexar a documentação comprobatória para confirmar o cadastro da negociação."). Etapa 1 mostra "Dados da
negociação" (associação, operadora e SEI pré-preenchidos do cadastro, editáveis **só no contexto da negociação**) e o aviso
"Vínculo diferente do cadastro atual do servidor." quando aplicável.

### 3.2 Auxílio elegível
Por mês negociado, o sistema reutiliza `calcularReembolso(valorPlano, teto)` (`mock-data.ts`; base limitada ao teto × percentual),
convertido para centavos sem nova regra de arredondamento. O analista pode **preencher manualmente** o auxílio de um mês
(selo "Preenchido manualmente", valor calculado preservado, justificativa obrigatória, trilha de auditoria). Os parâmetros usados
ficam gravados na negociação (`regraAuxilio`): negociações confirmadas **nunca são recalculadas**.

### 3.3 Parcelas e valor a ressarcir
Ressarcimento = auxílio elegível total ÷ nº de parcelas, por **truncamento administrativo** (`⌊centavos ÷ parcelas⌋`; resíduo apenas
**exibido**, nunca distribuído). Exemplos validados: R$ 3.800,00 ÷ 12 = R$ 316,66 (resíduo R$ 0,08); R$ 1.000,00 ÷ 3 = R$ 333,33;
R$ 4.000,00 ÷ 10 = R$ 400,00. O tipo de parcelamento (parcelas iguais × valores diferentes) é **identificado automaticamente**.
Valores manuais por parcela exigem justificativa. O valor cobrado pela operadora é informação opcional, nunca base de cálculo.
Vencimentos: `vencimentoValido`, `somarMesesISO`, `verificarVencimentos` (avisos, sem bloquear datas parciais).

### 3.4 Consulta
Detalhe em seis seções numeradas e expansíveis (padrão de "Ressarcimentos de meses anteriores"): dados da negociação × consulta
do cadastro atual, meses/auxílio com memória de cálculo, parcelas, documentos, histórico e quitações. Documentos têm tipo e
finalidade, vêm de upload padronizado (IndexedDB) e abrem em nova aba.

---

## 4. Fase 2 — Quitação manual e Rotina mensal

- **Confirmar quitação** (`ConfirmarQuitacaoModal`): data informada pelo analista (não pode ser futura), declaração de conferência,
  documento de origem opcional, comprovante opcional (vira documento da negociação), relatório da associação opcional
  (`envioId`), observação. Pode ser **fora de ordem**. Grava `Quitacao { data, responsavel, confirmadaEm, documentoId?, envioId?, observacao? }`.
- **Rotina mensal** (fila em `/admin/negociacoes`): parcelas pendentes com vencimento no mês de referência ("Vence neste mês") ou
  anterior ("Em atraso"); o vencimento é só um indicador — **a situação continua "Pendente" até a GERDAB confirmar**.
- Indicadores (em andamento, concluídas, parcelas pendentes/quitadas, valores) derivados dos registros.
- Modal e fila são os mesmos na Rotina mensal e no detalhe.
- **Melhorias de interface (commit `80ba105`, somente visual):** (a) o botão **"+ Nova negociação"** do cabeçalho de `/admin/negociacoes` foi ampliado discretamente (altura 46 px, fonte 15 px, ícone 18 px), mantendo cor, texto e posição; a criação não mudou. (b) O quadro **"Confirmações de pagamento pendentes"** passou a alternar pelo **cabeçalho inteiro** (indicador numérico, título, texto, áreas livres e o botão "Ocultar fila"/"Exibir fila"), com `aria-expanded`/`aria-controls` e sem botões aninhados; recolhida, oculta só a tabela. **Estado inicial: expandida** (preservado). O botão **Confirmar** da tabela não alterna a fila. Contagem das pendências e critérios "Vence neste mês"/"Em atraso" **inalterados**. Padrão visual: ver `BRIEFING_DESIGN_PRODUCAO.md` §29.2.

---

## 5. Fase 3 — Relatório de Negociações enviado pela Associação

- **Portal da Associação** (`/associacao/negociacoes`, item de menu "Relatório de Negociações"): associação (simulada),
  competência, arquivo, "Confirmar envio". Histórico simples: competência, arquivo, data/hora, situação, baixar.
- **GERDAB** (`/admin/negociacoes/recebidos`, aba "Relatórios das associações"): filtros por associação e competência;
  Visualizar, Baixar e "Marcar como conferido".
- **Situações (únicas, iguais nos dois ambientes):** "Pendente de conferência" (amarelo, automática no envio) e "Conferido" (verde,
  só após a ação manual da GERDAB; guarda responsável, data e hora). Receber um arquivo nunca gera status verde.
- **Sem reenvio:** a funcionalidade foi **removida** por decisão da stakeholder (o fluxo de ressarcimentos de meses anteriores
  também não tem reenvio). Cada envio é um registro independente; nenhum registro é sobrescrito; não há bloqueio por competência.
  Registros antigos podem conter o campo legado `versao`, que não é mais lido.
- A conferência **não** confirma quitação; o envio **não** confirma pagamento nem altera cálculos ou negociações. A vinculação de um
  relatório a uma quitação é **manual** (lista os relatórios da associação *da negociação*, não do vínculo atual do servidor).

---

## 6. Fase 4 — Relatório de Ressarcimento de Negociações

Entradas (mesma implementação e mesma fonte de dados): aba **"Relatório de ressarcimento"** em Negociações
(`/admin/negociacoes/ressarcimento`) e card **"Ressarcimento de Negociações"** na Central de Relatórios (`/admin/relatorios/negociacoes`).

### 6.1 Regras
- **Disponíveis:** parcelas com quitação confirmada ainda **não incluídas em nenhuma emissão**, de qualquer competência.
- **Valor:** `parcela.ressarcimento.finalCents`; nada é recalculado.
- **Seleção:** todas marcadas por padrão; desmarcar individualmente; "Selecionar todas"/"Desmarcar todas" valem para as parcelas do
  filtro atual (todas as páginas), com o alcance escrito na tela; a emissão inclui todas as marcadas, mesmo fora do filtro. Resumo:
  disponíveis, selecionadas, não selecionadas e valor total selecionado.
- **Pré-visualização** não grava nada. **Confirmação** mostra quantidade, total e o aviso de registro no histórico.
- **Emissão** grava um **snapshot imutável** (`EmissaoRessarcimento`: sequência, data/hora, responsável, linhas, total). Cada parcela
  é identificada por `negociacaoId + numeroParcela`.
- **Duplicidade:** fonte única = as emissões gravadas; "já incluída" é **derivado** delas (sem índice persistido). A elegibilidade é
  **conferida de novo imediatamente antes de salvar**; se algo mudou, nada é emitido.
- **Relatório (tela, PDF e Excel, mesma especificação `RelatorioExportSpec`, lendo só o snapshot):** matrícula, nome,
  associação/operadora, negociação, parcela x/N, data da quitação, valor a ressarcir, observação ("Preenchido manualmente" quando
  houver ajuste) e **total geral**. A identificação da emissão aparece como "Emitido em" e "Responsável pela emissão" (não como
  filtros). PDF/Excel **não** trazem ressalvas sobre regras provisórias de cálculo.
- **Histórico** de emissões com consulta detalhada e menu Exportar (PDF/Excel). Esse menu usa o modo `flutuante` do
  `ExportarRelatorio` (portal no `<body>`, posição fixa, abre para cima se faltar espaço) porque a moldura da tabela tem `overflow`.
- **Restaurar dados de demonstração** (link discreto, só quando há massa demonstrativa): remove **apenas** negociações com `demo: true`
  (e seus anexos) e emissões compostas **somente** por parcelas demonstrativas, e recria o cenário pela própria massa. Registros
  manuais e emissões que incluam qualquer registro manual são preservados. Quitações ou ajustes feitos em negociações demonstrativas
  são desfeitos (a confirmação avisa).

### 6.2 Limites desta versão (não implementar sem levantamento)
Sem separação Ativo/Inativo, sem cancelamento ou retificação de emissão, sem notificação própria, sem envio automático ao NURFI, sem
confirmação de repasse. **Emitir apenas registra o relatório no histórico.**

---

## 7. Notificações (sino do Admin)

Notificações dinâmicas, uma de cada, com id estável e chave de leitura que muda quando o conjunto muda:
- **"Negociações — Confirmações pendentes"** (`real-negociacoes-fila`): parcelas na fila da Rotina mensal.
- **"Negociações — Relatórios recebidos das associações"** (`real-negociacoes-envios`): conta os envios efetivamente pendentes de
  conferência. Some quando todos são conferidos.
Só Analista e Gerência as recebem. O relatório de ressarcimento **não** gera notificação.
Ambas pertencem ao módulo `negociacoes` do modelo de notificações do Admin e **alimentam o sino e o contador do item
"Negociações" do menu lateral**; **não** alimentam indicadores do Dashboard (`indicadores: []`). A leitura é por perfil e
persistida (ver `DASHBOARD_GERDAB_NUPLA_TEMA_NOTIFICACOES.md`, §4.2). A notificação indica **tarefa de conferência**, nunca que
houve pagamento nem leitura/download automático de documentos.

---

## 8. Dados de demonstração

`garantirMassaDemonstracaoNegociacoes` (versão **5**) semeia 8 negociações fictícias com `demo: true` e 9 quitações (fora de ordem,
mesmo mês, negociação concluída etc.); `garantirMassaDemonstracaoEnvios` semeia 3 relatórios (um conferido). Idempotentes e
versionadas: preservam registros criados pelo usuário. O cenário pode ser restaurado pela tela de ressarcimento (§6.1).

---

## 9. Validação integrada (Fase 5)

Fluxo completo exercitado no navegador: envio da associação → notificação → conferência → cadastro da negociação (auxílio
R$ 1.800,00 em 4 parcelas de R$ 450,00) → fila → quitação com vínculo manual ao relatório → disponibilidade → emissão → exportação.
Verificado: o envio e a conferência não alteram negociação/quitação; a emissão não altera quitação nem cálculo; a parcela emitida
sai da lista de disponíveis e a pendente permanece; permissões por perfil em todas as rotas; 8 telas do módulo em 375 px nos temas
claro e escuro sem rolagem horizontal; 33 verificações de funções puras do cálculo; `tsc` (apenas 2 erros anteriores ao módulo:
`StatusBadge.tsx` e `login.tsx`) e `npm run build`.

---

## 10. Pendências para validação com a stakeholder

1. **Critério de truncamento** e tratamento de **entrada diferenciada** (hoje: preenchimento manual com justificativa).
2. Periodicidade/corte do relatório de ressarcimento (hoje: tudo o que está quitado e não emitido, sem corte por competência).
3. Separação **Ativo/Inativo**, cancelamento/retificação de emissões e eventual notificação de parcelas quitadas aguardando repasse.
4. Colunas e texto institucional definitivos do relatório para o NURFI.
5. Despachos e integração com o SEI (fase futura).
6. Limitação técnica: `localStorage` não tem transações; duas abas emitindo ao mesmo tempo não são totalmente protegidas.
7. Limitação técnica: o relatório da associação é só referência para conferência humana, nunca lido automaticamente.
