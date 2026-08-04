# Documentação Técnica — Módulo de Pagamento (Pró-Saúde)

> **Última atualização:** 2026-08-03 (via sessão de desenvolvimento assistido — Etapa A: multi-arquivo/consolidação, seção 3.17; Etapa B: elegibilidade por assistência + documento complementar, seção 3.18)
> **Branch de trabalho:** `feature-modulo-pagamentos`
> **Status de commit:** ver seção 13 (Histórico das Decisões) e `git log` — há trabalho commitado e trabalho ainda não commitado (ver `git status` no momento da leitura deste documento para o estado exato).

Este documento descreve o estado **exato** do Módulo de Pagamento do protótipo Pró-Saúde, incluindo decisões de arquitetura, regras de negócio, fluxos, modelo de dados e pendências. Foi escrito para permitir que qualquer desenvolvedor (humano ou IA) continue o desenvolvimento sem precisar reconstruir o contexto a partir do zero.

---

## 1. Visão Geral do Projeto

### 1.1 Objetivo do protótipo
O `prototipo_pro_saude` é um protótipo navegável (React + TanStack Router + TanStack Start, sem backend real) do sistema **Pró-Saúde** do DETRAN/GERDAB. Ele simula o fluxo de gestão do auxílio-saúde de servidores públicos: cadastro do titular e dependentes, requerimentos (inclusão, mudança de plano, exclusão, alteração de valor), e — o escopo deste documento — o **Módulo de Pagamento**, que trata do envio, conferência e aprovação de comprovantes mensais de pagamento do plano de saúde.

Todo o "backend" é simulado com dados mock em `src/lib/mock-data.ts` e persistência em `localStorage` (ver seção 8). Não há chamadas de rede, autenticação real ou OCR real — tudo é determinístico e mockado por convenção de nome de arquivo (ver seção 3.2).

### 1.2 Perfis existentes
O protótipo simula 4 perfis, cada um com seu próprio layout e conjunto de rotas:

| Perfil | Layout | Como é selecionado |
|---|---|---|
| **Servidor** | `ServidorLayout.tsx` | Rota `/login` → opção "Servidor" |
| **Analista** | `AdminLayout.tsx` (compartilhado com Gerência) | Rota `/login` → opção "Analista" → grava `localStorage.prosaude_role = "analista"` |
| **Gerência** | `AdminLayout.tsx` (compartilhado com Analista) | Rota `/login` → opção "Gerência" → grava `localStorage.prosaude_role = "gerencia"` (também é o valor **default** se a chave não existir — ver `getAdminRole()` em `AdminLayout.tsx`) |
| **Associação** | Layout próprio (`associacao.*`) | Rota `/login` → opção "Associação", ou link direto "Sou uma Associação Externa" |

**Regra de permissão consolidada:** Gerência **herda todas as ações do Analista** e tem 3 ações exclusivas adicionais (2ª alçada de retroativos — ver seção 5). Nunca o inverso: nenhuma ação do Analista é escondida da Gerência.

### 1.3 Escopo atual do Módulo de Pagamento
O Módulo de Pagamento cobre integralmente:
- Envio de comprovante pelo Servidor (documento individual e fatura técnica multi-beneficiário).
- Leitura simulada por IA/OCR com 3 etapas visuais, incluindo falha de legibilidade e extração parcial.
- Conferência de campos extraídos pelo Servidor, com nível de confiança e preenchimento manual.
- Resumo por documento + Resumo consolidado da competência (contando todos os beneficiários da família, inclusive os sem comprovante).
- Conclusão explícita da competência pelo Servidor (registro, não reenvio).
- Alertas de competências sem envio e de competências incompletas.
- Fila de conferência do Analista com aprovação, aprovação com ressalva, solicitação de correção e recusa.
- Fluxo retroativo completo com dupla alçada (Analista → Gerência), incluindo devolução e recusa específica de retroativo.
- Histórico e notificações do Servidor refletindo cada decisão do Analista/Gerência.
- Persistência total em `localStorage`, testada e validada após F5 em todos os fluxos.

O cenário de dados de referência é fixo e **não deve ser alterado** sem necessidade explícita: **Carlos Eduardo Ramos** (titular), **Marina Ramos** (cônjuge) e **Pedro Ramos** (filho), todos da operadora **Assefaz**. Este grupo é **independente** do `servidorAtual`/`dependentes` usados no Módulo de Cadastro (que usa o cenário "João da Silva"/"Ana da Silva") — os dois cenários **nunca devem ser misturados**.

---

## 2. Arquitetura Atual

### 2.1 Componentes criados (Módulo de Pagamento)

| Componente | Arquivo |
|---|---|
| `BeneficiarioSelector` | `src/components/BeneficiarioSelector.tsx` |
| `ComprovanteUploadBox` | `src/components/ComprovanteUploadBox.tsx` |
| `CamposExtraidosForm` | `src/components/CamposExtraidosForm.tsx` |
| `ResumoPagamento` | `src/components/ResumoPagamento.tsx` |
| `ComprovanteStatusBadge` | `src/components/ComprovanteStatusBadge.tsx` |
| `NotificationBell` | `src/components/NotificationBell.tsx` |
| `ServidorComprovanteDetail` | `src/components/ServidorComprovanteDetail.tsx` |
| `DivergenciaAprovacaoModal` | `src/components/DivergenciaAprovacaoModal.tsx` |
| `DocPreview` | `src/components/DocPreview.tsx` |
| `LendoComprovante` | `src/components/LendoComprovante.tsx` |
| `ConferenciaBeneficiarios` | `src/components/ConferenciaBeneficiarios.tsx` |
| `ConsolidadoCompetencia` | `src/components/ConsolidadoCompetencia.tsx` |
| `ArquivosAnexadosUpload` | `src/components/ArquivosAnexadosUpload.tsx` (adicionado na rodada de multi-arquivo — ver seção 3.17) |

Detalhamento completo de cada um na seção 10. **Nota:** `ComprovanteUploadBox` (single-file) continua existindo e em uso, mas hoje só é usado pelo fluxo pós-submissão de substituição/correção (`ServidorComprovanteDetail`) — o wizard de envio inicial usa `ArquivosAnexadosUpload` (multi-arquivo) desde a rodada descrita na seção 3.17.

### 2.2 Rotas criadas

| Rota | Arquivo | Perfil |
|---|---|---|
| `/servidor/pagamentos` | `src/routes/servidor.pagamentos.index.tsx` | Servidor |
| `/servidor/pagamentos/enviar` | `src/routes/servidor.pagamentos.enviar.tsx` | Servidor |
| `/admin/comprovantes` | `src/routes/admin.comprovantes.tsx` | Analista/Gerência |

Nenhuma rota nova para Associação (fora do escopo desta entrega, por decisão explícita do usuário).

### 2.3 Arquivos modificados (fora dos componentes/rotas novos)

| Arquivo | Natureza da mudança |
|---|---|
| `src/components/ServidorLayout.tsx` | Adiciona sino de notificações no header; adiciona item "Pagamentos" no menu inferior (com badge de contagem); adiciona botão "Sair" à tela Meus Dados (removido do header) |
| `src/components/AdminLayout.tsx` | Adiciona item "Comprovantes" ao menu, visível a Analista e Gerência (não exclusivo) |
| `src/routes/admin.dashboard.tsx` | Adiciona card "Retroativos pendentes" |
| `src/routes/servidor.meus-dados.tsx` | Adiciona botão "Sair" |
| `src/lib/mock-data.ts` | Ver seção 7 (Modelo de Dados) |
| `src/lib/prosaude-storage.ts` | Ver seção 8 (Persistência) |

### 2.4 Helpers e utilitários adicionados

| Arquivo | Função |
|---|---|
| `src/lib/ocr-mock.ts` | Simula extração OCR/IA a partir do nome do arquivo |
| `src/lib/comprovante-status.ts` | Helpers puros para status por beneficiário, divergência e campos |
| `src/lib/competencias-pendentes.ts` | Cálculo de pendências de competência (sem envio / incompleta) |
| `src/lib/notificacoes-pagamento.ts` | Deriva notificações do sino a partir do estado persistido |
| `src/lib/reenvio-comprovante.ts` | Mecânica compartilhada de substituição/reenvio pós-submissão |

### 2.5 Estrutura de armazenamento (localStorage)
Ver seção 8 completa.

### 2.6 Dados mock utilizados
- `beneficiariosPagamento` (3 registros fixos — Carlos/Marina/Pedro) em `mock-data.ts`.
- `comprovantes` (5 registros seed cobrindo aprovado, em_analise, ilegível, retroativo aguardando analista, e divergência de valor) em `mock-data.ts` — cada um com `arquivos: ArquivoAnexado[]` (ver seção 3.17 e 7).
- `competenciaAtual = "2026-07"`, `competenciaRetroativa = "2026-05"` (legado, mantido por compatibilidade com o seed), `competenciasFechadas = ["2026-04", "2026-05", "2026-06"]`.
- `analistaReferencia = "Sarah Santos"`, `gerenteReferencia = "Francisco"`.
- `tipoPlanoPagamento = "individual_familiar"` e `tiposDocumentoPorPlano` — config do cenário de referência (ver seção 3.17).

---

## 3. Fluxos Implementados

### 3.1 Envio de comprovante (visão geral da máquina de estados)
Arquivo: `src/routes/servidor.pagamentos.enviar.tsx`.

```
selecao → upload → lendo → [ilegivel → upload (retry)]
                         → conferencia_beneficiarios → confirmar_documento
                                                      → (persiste) → resumo_competencia
```

O tipo `Step` (union) é:
```ts
type Step =
  | "selecao"
  | "upload"
  | "lendo"
  | "ilegivel"
  | "conferencia_beneficiarios"
  | "confirmar_documento"
  | "resumo_competencia";
```

**Importante:** não existe mais um passo `"revisao"` simplificado. Antes havia um passo separado para documentos de 1 único beneficiário (formulário simples, sem nível de confiança visível). Isso foi **removido** por decisão explícita — hoje **todo** envio (1 ou N beneficiários) passa por `"conferencia_beneficiarios"` (componente `ConferenciaBeneficiarios`), que sempre mostra todos os campos com badge de confiança e permite edição manual.

O `Stepper` visual (4 rótulos: "Beneficiários", "Documento", "Revisão", "Resumo") mapeia os 7 estados internos em 4 posições via `stepIndex()`.

### 3.2 Leitura por IA/OCR
Componente: `LendoComprovante.tsx`. Estado controlado pelo pai (`enviar.tsx`) via `etapaLeitura: 0|1|2`, `leituraConcluida: boolean`, `leituraFalhouLegibilidade: boolean`.

Sequência visual (checklist de 3 itens, cada um com ✓/✕/spinner/•):
1. "Enviando arquivo"
2. "Verificando legibilidade"
3. "Extraindo campos com IA"

Implementação em `iniciarProcessamento(file)` (`enviar.tsx`): uma cadeia de `setTimeout` aninhados (350ms → 500ms → 500ms → 600ms → 500ms, total ~2450ms) que avança `etapaLeitura` sequencialmente. Se `arquivoEhIlegivel(file.name)` for true na etapa 1, interrompe com `leituraFalhouLegibilidade = true` e depois de 700ms navega para o passo `"ilegivel"`. Caso contrário, chega à etapa 2, roda `gerarCamposExtraidos()` para cada beneficiário selecionado, marca `leituraConcluida = true` e após 500ms navega para `"conferencia_beneficiarios"`.

**Convenção mock determinística** (arquivo `ocr-mock.ts`) — o "resultado" da IA é decidido pelo **nome do arquivo** (não há OCR real):
- Nome contém `"ilegivel"` → `arquivoEhIlegivel()` retorna `true` → interrompe o fluxo.
- Nome contém `"divergente"` (mas não `"pagador"`) → `arquivoEhDivergente()` retorna `true` → campo `valor` extraído vem **R$ 100 acima** do `valorCadastrado` do beneficiário, com confiança `media`.
- Nome contém `"pagador_divergente"` ou `"pagador-divergente"` → `arquivoTemPagadorDivergente()` retorna `true` → campo `pagador` extraído **não é o titular** (ver regra na seção 6).
- Nome contém `"incompleto"` → `arquivoEhIncompleto(nomeArquivo, beneficiario)` retorna `true` para o(s) beneficiário(s) afetado(s):
  - `"incompleto"` sozinho → afeta **todos** os beneficiários do documento.
  - `"incompleto_<primeironome>"` ou `"incompleto-<primeironome>"` (ex: `"incompleto_pedro"`) → afeta **somente** aquele beneficiário — usado para simular fatura técnica com 1 única pendência isolada.
  - Quando incompleto, os campos `nome`, `valor` e `pagador` vêm com `valor: ""` e `confianca: "nenhuma"`.
- Campo `banco` **sempre** vem com `confianca: "nenhuma"` (comportamento incondicional, não é um cenário de teste — é assim por padrão do mock). **Efeito colateral conhecido:** por causa disso, a auto-confirmação "todos os campos em alta confiança" quase nunca dispara sozinha (ver seção 3.6 e seção 12 — Pendências).

`gerarCamposExtraidos()` retorna sempre 7 campos: `nome`, `operadora`, `competencia`, `valor`, `dataPagamento`, `banco`, `pagador`. **Não inclui `cpf`** (limitação conhecida — ver seção 12), enquanto os comprovantes seed em `mock-data.ts` incluem `cpf` em `camposExtraidos`. Essa assimetria é uma inconsistência conhecida e não bloqueante.

### 3.3 Documento ilegível
Se `arquivoEhIlegivel` for true durante a leitura, o passo `"ilegivel"` é exibido: ícone `XCircle`, mensagem explicativa, botão "Reenviar documento" (`reenviar()`) que limpa o arquivo e volta ao passo `"upload"`.

Também existe uma segunda ocorrência desse mesmo padrão de "ilegível" **depois** do comprovante já ter sido persistido, tratada por `ServidorComprovanteDetail.tsx` (ver seção 3.15).

### 3.4 Documento incompleto
Quando um ou mais beneficiários vêm com campos vazios (`valor.trim() === ""`), o componente `ConferenciaBeneficiarios` marca aquele card como "Não identificado" e oferece duas ações: **"Preencher manualmente"** (o próprio `CamposExtraidosForm` já é editável, então "preencher manualmente" hoje é apenas confirmar depois de editar o campo) e **"Reenviar comprovante"** (substitui o arquivo inteiro, reprocessando **todos** os beneficiários do documento — ver regra na seção 3.7).

O botão final "Confirmar e continuar" só habilita quando **todos** os beneficiários estão sem campo vazio E confirmados (`confirmados: Set<string>`).

### 3.5 Revisão dos campos
Unificada com o fluxo de fatura técnica (ver 3.1). `CamposExtraidosForm` é sempre renderizado editável (exceto quando usado em modo leitura pelo Analista/Servidor pós-submissão, via prop `readOnly`). Mostra, por campo: label, ícone de confiança (`ConfiancaIcon`: verde=alta, amarelo=média, vermelho=nenhuma), badge "Não identificado" (campo vazio), badge "Divergente" (para `valor` vs `valorCadastrado`, ou `pagador` vs `nomeTitular`), badge "Preenchido manualmente" (quando `origem === 'manual'`, setado automaticamente ao editar).

### 3.6 Preenchimento manual
Editar qualquer campo em `CamposExtraidosForm` (função `editarCampo`) sempre seta `origem: 'manual'`, independentemente da confiança original. Isso é assim **mesmo que o valor editado seja igual ao original** — não há verificação de "mudou de fato", é comportamento intencional preexistente.

Em `ConferenciaBeneficiarios`, a auto-confirmação (`todaAltaConfianca`) exige que **todos** os campos do beneficiário estejam com `confianca === 'alta'` — como `banco` nunca é alta, **na prática nenhum beneficiário é auto-confirmado hoje**; o Servidor sempre precisa clicar "Confirmar" manualmente em cada card. Isso foi um efeito colateral aceito ao endurecer a regra de auto-confirmação (antes só considerava o campo `valor`).

### 3.7 Fatura técnica
`tipoDocumento === 'fatura_tecnica'` é apenas uma sugestão de UI no seletor de tipo de documento — **não força** seleção múltipla de beneficiários (regra herdada do handoff original). Quando `beneficiariosSelecionados.length > 1`, o comprovante final grava `gruposExtraidos: { beneficiarioId, campos }[]` (um conjunto de campos por beneficiário) em vez de usar só `camposExtraidos` (usado quando há exatamente 1 beneficiário).

**Regra de reenvio em fatura técnica (decisão explícita do usuário):**
- **"Preencher manualmente"** corrige apenas os dados daquele beneficiário específico (edição inline no formulário).
- **"Reenviar comprovante"** substitui a **fatura técnica inteira** — novo arquivo, novo OCR rodado para **todos** os beneficiários do documento (função `onSubstituirArquivo` → chama `iniciarProcessamento(novoArquivo)` de novo).
- **Não existe** reenvio individual de "apenas a parte de um beneficiário" dentro do mesmo comprovante multi-beneficiário. Se o servidor quiser mandar um documento separado só para 1 pessoa (ex: Pedro), isso é tratado como um **documento complementar independente** (novo `Comprovante`, `beneficiarioIds: ['ben-filho']`), **não** um "arquivo por beneficiário" dentro do registro existente. Por decisão explícita, **não foi criado** um campo `arquivoPorBeneficiario` — essa é uma simplificação intencional do protótipo.

### 3.8 Documentos complementares
Regra geral (já existia desde a Etapa 1, reafirmada nas etapas seguintes): **múltiplos documentos por beneficiário na mesma competência são permitidos e nunca se sobrescrevem**. `BeneficiarioSelector` detecta isso e mostra o aviso "Já existe comprovante enviado nesta competência — este será um documento complementar." (função `jaTemDocumento`, que compara `beneficiarioIds.includes(id) && competencia === competencia`).

O caminho para criar um documento complementar é sempre o mesmo wizard de envio (`/servidor/pagamentos/enviar`), seja disparado organicamente (usuário volta e envia de novo) ou via os botões "Anexar comprovante do dependente" / "Anexar comprovante" do Resumo da Competência ou do alerta de "Competência incompleta".

### 3.9 Resumo da competência
Componente: `ConsolidadoCompetencia.tsx`. Exibido como o último passo (`"resumo_competencia"`) do wizard de envio, **depois** do documento atual já ter sido persistido (ver 3.10). Ele **só lê dados persistidos** via `getComprovantesUnificados()` filtrado por competência — nunca combina "documento em memória" com "documentos salvos" (decisão explícita para simplificar e evitar duplicidade — ver seção 13).

Exibe:
- Contadores "Documentos" (total de comprovantes da competência) e "Pendências" (quantidade de **beneficiários únicos**, não documentos, com alguma pendência — ver regra de deduplicação na seção 6).
- Para cada beneficiário **sem comprovante e não dispensado**: alerta vermelho com "{nome} ainda não tem comprovante" + botões **"Anexar comprovante do dependente"** e **"Continuar sem este beneficiário"** (este último abre uma confirmação inline antes de gravar a dispensa).
- Lista consolidada de **todos** os beneficiários (`beneficiariosPagamento`, sempre os 3), mesmo os sem comprovante ou dispensados:
  - Com documento: soma de todos os valores extraídos dele nesta competência (`formatCurrency(l.total)`), mais um aviso italic "Pendência neste documento" se aplicável.
  - Dispensado: texto italic "Sem comprovante — não incluída nesta competência" **e continua com botão "Anexar comprovante"** (a dispensa não remove a visibilidade, só o alerta ativo — ver regra 6.9).
  - Sem comprovante e não dispensado: sem linha de valor (já coberto pelo alerta acima).
- "Total do grupo familiar" (soma de todos os totais).
- Nota fixa sobre o teto de R$ 4.000,00 (não há validação de teto implementada, é só texto informativo).
- Se já existir uma conclusão registrada para a competência: linha "Competência concluída em {data}".
- Botão final **"Concluir envio da competência"** — desabilitado enquanto houver algum beneficiário sem comprovante e não dispensado (`pendenciaAtiva`).

### 3.10 Conclusão da competência
Ação do botão "Concluir envio da competência" → `handleConcluir()` em `enviar.tsx` → chama `saveConclusaoCompetencia(competencia)` (grava em `localStorage`) e navega para `/servidor/pagamentos`. **Esta ação nunca cria ou altera um `Comprovante`** — é puramente um registro de "o servidor revisou e fechou conscientemente esta tela".

**Regra crítica de invalidação:** sempre que `addComprovantePagamento()` é chamado (um novo documento é persistido, seja pela rota de envio, seja pelo "Anexar comprovante do dependente"), a função automaticamente chama `invalidarConclusaoCompetencia(comprovante.competencia)` — apagando qualquer conclusão anterior daquela competência. Isso força o servidor a "concluir de novo" toda vez que o conjunto de documentos muda depois de uma conclusão já registrada. Implementado dentro de `prosaude-storage.ts`, não na UI — portanto vale para **qualquer** caminho de código que chame `addComprovantePagamento`.

### 3.11 Competências pendentes (dois tipos distintos)
Módulo: `src/lib/competencias-pendentes.ts`. Dois conceitos **deliberadamente separados**:

1. **"Competência sem envio"** (`getCompetenciasPendentes()`): competência em `competenciasFechadas` para a qual **nenhum** comprovante (de nenhum beneficiário) existe. Exibido em `servidor.pagamentos.index.tsx` como banner vermelho "Competências pendentes (N)", listando até 3 competências + botão "Ver todas" se houver mais, cada uma com botão "Enviar retroativo" (link para `/servidor/pagamentos/enviar?competencia=X`).
2. **"Competência incompleta"** (`getBeneficiariosFaltantes(competencia)`): a competência **já tem** pelo menos 1 comprovante, mas nem todos os beneficiários ativos e não dispensados estão cobertos por um documento legível. Aplicado hoje **apenas à `competenciaAtual`** (decisão de escopo — não foi estendido a competências fechadas/retroativas, ver seção 12). Exibido como banner âmbar "Competência {mês} incompleta" em `servidor.pagamentos.index.tsx`, com 2 motivos possíveis por beneficiário:
   - `"sem_comprovante"`: nenhum documento dele nesta competência → botão "Anexar comprovante" (link com `search: { competencia, beneficiario }`).
   - `"documento_ilegivel"`: todos os documentos dele nesta competência estão ilegíveis ou com campo vazio → botão "Substituir documento" (abre `ServidorComprovanteDetail` diretamente, reaproveitando o fluxo de substituição já existente).

Um beneficiário **dispensado** (`getBeneficiariosDispensadosIds`) nunca aparece em `getBeneficiariosFaltantes` — a dispensa suprime tanto o alerta de "sem envio" (indiretamente, pois dispensa só existe por competência que já tem outros documentos) quanto o de "incompleta".

### 3.12 Retroativos
Ver detalhamento completo nas seções 4 e 5 (Analista/Gerência) — aqui documentamos só o lado do Servidor.

`isRetroativo = competencia !== competenciaAtual` (comparação genérica, não mais um valor único fixo `competenciaRetroativa` — generalizado na etapa das "competências sem comprovante" para suportar `competenciasFechadas` como lista). Ao selecionar uma competência fechada em `"selecao"`, o campo "Justificativa do atraso" torna-se obrigatório (`podeAvancarSelecao` exige `justificativaAtraso.trim().length > 0`). No momento da persistência (`confirmarDocumento()`), `status` inicial é `"retroativo_aguardando_analista"` em vez de `"em_analise"`.

Estados possíveis do ciclo de vida retroativo (todos em `StatusComprovante`):
```
retroativo_aguardando_analista → retroativo_aguardando_gerencia → retroativo_aprovado
                               ↘ retroativo_devolvido (pela Gerência) → volta pro Analista
                               ↘ correcao_solicitada (pelo Analista, raro em retroativo)
retroativo_aguardando_gerencia → retroativo_recusado (terminal, só a Gerência pode)
```

### 3.13 Notificações
Módulo: `src/lib/notificacoes-pagamento.ts`, consumido por `NotificationBell.tsx` (badge de contagem + dropdown). Duas fontes combinadas (nesta ordem: pendências primeiro, depois status):
1. **Notificações por competência pendente** ("sem envio"): uma por competência em `getCompetenciasPendentes()`, mensagem "Você não enviou comprovante da competência de {mês} — prazo encerrado."
2. **Notificações por status mais recente por beneficiário**: para cada beneficiário, pega o **último** comprovante relevante (competência atual OU qualquer retroativo, `relevantes = comprovantes.filter(c => c.competencia === competenciaAtual || c.isRetroativo)`) e, se o status dele tiver uma mensagem mapeada em `statusNotificaveis`, gera 1 notificação.

Status mapeados para notificação: `ilegivel`, `correcao_solicitada`, `aprovado`, `aprovado_com_ressalva`, `recusado`, `retroativo_aguardando_gerencia`, `retroativo_devolvido`, `retroativo_aprovado`, `retroativo_recusado`. **Não gera notificação** para `em_analise`, `processando`, `revisao` (obsoleto), `retroativo_aguardando_analista` — nenhuma mensagem mapeada para esses.

**Limitação conhecida:** notificações não são "lidas/marcadas" — são recalculadas do zero a cada render (`useEffect` em `NotificationBell`), não há persistência de "já vi essa notificação".

### 3.14 Persistência
Ver seção 8 (completa).

### 3.15 Correção e reenvio (pós-submissão)
Diferente do fluxo de envio inicial (seção 3.1-3.7), esta seção trata de comprovantes **já persistidos** que precisam ser corrigidos. Componente: `ServidorComprovanteDetail.tsx`, aberto a partir de qualquer card em `servidor.pagamentos.index.tsx` (tanto "Situação da competência" quanto "Histórico de envios"), ou diretamente pelo botão "Substituir documento" do alerta de competência incompleta.

Mecânica compartilhada em `src/lib/reenvio-comprovante.ts`:
- `processarNovoArquivo(comprovante, beneficiario, arquivo)`: roda o mock de OCR (`arquivoEhIlegivel` + `gerarCamposExtraidos`) para o novo arquivo.
- `confirmarReenvio({ comprovante, beneficiarioId, novoArquivo, novoStatus, campos, autor })`: grava a versão anterior em `versoesAnteriores` (arquivo, data, status antigos), atualiza o **mesmo** `Comprovante` (nunca cria um novo registro), registra uma entrada em `aprovacoes` com `etapa: "servidor"` e `acao` = `"documento_substituido"` (se `novoStatus === "ilegivel"`) ou `"reenviado"` (se `novoStatus === "em_analise"`).

Duas ações do Servidor, por status:
- **Status `ilegivel`** → botão "Substituir documento": upload de novo arquivo, reprocessa, se ainda ilegível mostra "O novo documento também está ilegível" com "Tentar novamente"; se legível, mostra `CamposExtraidosForm` editável e "Confirmar reenvio" → `confirmar(beneficiarioId, "em_analise")`.
- **Status `correcao_solicitada`** → mostra o motivo informado pelo Analista (última entrada em `aprovacoes` com `acao === 'correcao_solicitada'`) + botão "Corrigir e reenviar" (mesma mecânica do "Substituir documento" acima).
- **Status `recusado`** ou **`retroativo_recusado`** → **somente leitura, terminal**. Nenhum botão de ação — decisão explícita: "Recusar é sempre terminal; apenas Solicitar Correção permite reenvio" (ver seção 13).
- Demais status (`em_analise`, `retroativo_aguardando_analista`, `retroativo_aguardando_gerencia`, `retroativo_devolvido`, `aprovado`, `aprovado_com_ressalva`, `retroativo_aprovado`) → somente leitura, cada um com seu próprio texto explicativo e, quando aplicável, `HistoricoAlcadas` (lista cronológica de todas as `aprovacoes` daquele beneficiário).

### 3.16 Histórico
`servidor.pagamentos.index.tsx`, seção "Histórico de envios": lista **todos** os comprovantes da competência atual E de qualquer outra competência (`comprovantes` = todos, sem filtro de competência nessa lista especificamente — note que a seção "Situação da competência atual" É filtrada por competência, mas "Histórico de envios" mostra tudo), em ordem reversa (mais recente primeiro, via `.slice().reverse()`), cada item clicável abrindo `ServidorComprovanteDetail`.

### 3.17 Multi-arquivo por envio, consolidação de campos e navegação do Resumo

**Contexto da mudança:** o modelo original (Etapas 1-3) permitia exatamente **1 arquivo por envio**. O usuário identificou que, na prática, a informação de um pagamento frequentemente chega em **mais de um arquivo complementar** (ex: fatura técnica + comprovante de pagamento; boleto + comprovante PIX) e pediu que o protótipo consolidasse os dados desses arquivos em vez de tratá-los como envios totalmente independentes. Esta seção documenta a evolução do modelo para suportar isso.

**Upload multi-arquivo (`ArquivosAnexadosUpload.tsx`, usado no passo `"upload"` de `enviar.tsx`):**
- O Servidor pode anexar 1 ou mais arquivos ao mesmo envio (botão "Adicionar outro arquivo" após o primeiro).
- Cada arquivo anexado tem seu próprio grupo de marcadores (toggle buttons, visualmente parecidos com checkboxes) indicando quais **tipos documentais** (`TipoDocumentoArquivo`) aquele arquivo específico contém — um mesmo arquivo pode ter mais de um tipo marcado (ex: um único PDF que já é ao mesmo tempo "Fatura Técnica" e "Comprovante de Pagamento").
- Os tipos disponíveis para marcação são filtrados por `tiposDocumentoPorPlano[tipoPlanoPagamento]` (ver seção 6, regra de plano empresarial x individual/familiar) — hoje, com o cenário de referência em `individual_familiar`, os tipos oferecidos são Boleto, Recibo, Demonstrativo de Pagamento e Comprovante de Pagamento (Fatura Técnica não aparece, pois é exclusiva do plano empresarial).
- Avançar para o processamento exige pelo menos 1 arquivo com pelo menos 1 tipo marcado em cada arquivo anexado (`podeAvancarUpload` em `enviar.tsx`).
- Estado em `enviar.tsx`: `arquivosSelecionados: { file: File; tipos: TipoDocumentoArquivo[] }[]` (substituiu o antigo `arquivo: File | null`).

**Geração de campos por tipo documental (`ocr-mock.ts`):**
- Mapa interno `camposPorTipoDocumento: Record<TipoDocumentoArquivo, CampoExtraido["chave"][]>` define quais campos cada tipo documental tipicamente contém: `fatura_tecnica` → nome/operadora/competência/tipoAssistencia; `demonstrativo` → nome/operadora/competência/valor/tipoAssistencia; `boleto` → nome/valor/dataPagamento/banco/competência; `recibo` → nome/valor/dataPagamento/pagador; `comprovante_pagamento` → valor/dataPagamento/banco/pagador.
- `gerarCamposExtraidos(beneficiario, competencia, nomeArquivo, tipos)` agora recebe também os `tipos` marcados para aquele arquivo específico e só retorna os campos pertencentes à união desses tipos — os demais campos simplesmente não aparecem no resultado daquele arquivo (ficam para outro arquivo do mesmo envio completar).
- Todo campo retornado carrega `arquivoOrigem: nomeArquivo` (novo campo em `CampoExtraido`), permitindo rastrear de qual arquivo ele veio mesmo depois da consolidação.

**Consolidação entre arquivos (`mesclarCamposDeArquivos`, em `ocr-mock.ts`):**
- Recebe `{ nome: string; campos: CampoExtraido[] }[]` (1 entrada por arquivo anexado, na ordem de upload) e retorna **1 único conjunto de campos consolidado** por beneficiário.
- Regra de mesclagem: para cada uma das 8 chaves possíveis (`nome`, `operadora`, `competencia`, `valor`, `dataPagamento`, `banco`, `pagador`, `tipoAssistencia`), usa o **primeiro arquivo (na ordem em que foi anexado)** que produziu um valor não vazio para aquela chave. Se **nenhum** arquivo do envio contiver aquele campo, ele permanece vazio/`confianca: "nenhuma"` — mesmo comportamento visual já existente de "Não identificado", reaproveitado sem nenhuma mudança na UI de conferência.
- Esta é a implementação literal da regra de negócio pedida: "não importa se a informação veio de um ou de vários documentos — se o conjunto conseguir preencher todos os campos, o envio segue normalmente".
- `iniciarProcessamento()` em `enviar.tsx` roda `gerarCamposExtraidos` para cada arquivo × cada beneficiário selecionado, e então `mesclarCamposDeArquivos` por beneficiário para montar `gruposExtraidos`.

**Rastreabilidade da origem na conferência (`CamposExtraidosForm.tsx`):**
- Cada campo agora exibe, abaixo do input, uma linha `Origem: {arquivoOrigem}` quando esse dado está presente — visível tanto na conferência do Servidor quanto na visão somente-leitura do Analista/Gerência (mesmo componente compartilhado, sem duplicação de lógica).
- O campo `tipoAssistencia` (novo — ver seção 6, regra de assistência odontológica) é renderizado como `<select>` (não texto livre), com as opções vindas de `tipoAssistenciaLabels`.

**Bloco "Documentos analisados" (`ConferenciaBeneficiarios.tsx`):**
- No topo da tela de conferência, um card lista todos os arquivos do envio + os tipos marcados para cada um — permite ao Servidor confirmar visualmente que anexou/marcou tudo corretamente antes de revisar os campos consolidados.
- **Simplificação decidida nesta rodada:** a antiga ação "Reenviar comprovante" (que abria um upload inline substituindo o único arquivo) foi removida. Em seu lugar, o botão "Anexar mais um arquivo" (exibido quando algum campo está "Não identificado") simplesmente chama `onVoltar()`, que volta ao passo `"upload"` já com os arquivos atuais preservados — o Servidor pode então adicionar mais um arquivo complementar ou remover/reetiquetar um dos existentes, sem duplicar a lógica de upload em dois lugares.

**Resumo da Competência como painel de navegação (`ConsolidadoCompetencia.tsx`):**
- Nova seção "Envios desta competência", listando **todos** os `Comprovante`s da competência (não só os pendentes), cada um como uma linha expansível mostrando: nome(s) de arquivo(s), tipos marcados por arquivo, beneficiário(s) contemplado(s) e status geral (via `ComprovanteStatusBadge`).
- **Decisão explícita de simplificação (pedido do usuário — "evite uma arquitetura excessivamente complexa"):** editar um envio a partir do Resumo **não** reabre o wizard de envio nem usa parâmetros de rota de edição. Em vez disso:
  - Se o envio ainda está em um status que o Servidor pode alterar (`em_analise` ou `retroativo_aguardando_analista` — nunca depois de decidido pelo Analista/Gerência), expandir a linha mostra o `CamposExtraidosForm` editável de cada beneficiário do envio, com um botão "Salvar alterações" que chama `updateComprovantePagamento(id, { camposExtraidos | gruposExtraidos })` **diretamente** — sem navegação, sem novo estado de rota, sem duplicar a máquina de estados do wizard.
  - Se o envio está `ilegivel` ou `correcao_solicitada`, a correção correta não é "editar campos" — é **substituir o arquivo**, que já tinha um fluxo dedicado e testado (`ServidorComprovanteDetail`, seção 3.15). Por isso, para esses dois status, clicar na linha ou no botão "Corrigir agora" de uma pendência abre o mesmo modal `ServidorComprovanteDetail` já existente (com `focusBeneficiarioId` quando aplicável), em vez do formulário inline. A função `corrigirEnvio(comprovante, beneficiarioId?)` decide qual dos dois caminhos usar, checando `statusExigeSubstituicao.includes(comprovante.status)`.
  - Para qualquer outro status (`aprovado`, `recusado`, `retroativo_aprovado`, etc.), expandir a linha mostra os campos em modo somente leitura com a mensagem "Este envio já foi decidido e não pode mais ser editado pelo Servidor."
- "Pendência neste documento" (texto antes estático) agora é um botão "Corrigir agora" que aciona exatamente essa mesma lógica de roteamento (`corrigirEnvio`), usando o `comprovanteIdPendente` calculado por beneficiário no `useMemo` principal do componente.
- Clicar em uma linha de envio (fora do contexto de uma pendência específica) também rola a tela até aquele envio (`scrollIntoView`) quando expandido via `expandirEnvio`.

**Impacto em `Comprovante` (modelo de dados) — ver seção 7 para a interface completa:**
- `arquivo: string` + `tipoDocumento: (...)` (campos únicos) foram **removidos** e substituídos por `arquivos: ArquivoAnexado[]` (`{ nome: string; tipos: TipoDocumentoArquivo[] }[]`).
- Todo lugar que antes lia `comprovante.arquivo` para exibição (histórico do Servidor, fila do Analista/Gerência, `ServidorComprovanteDetail`, `DocPreview`) foi migrado para `comprovante.arquivos.map(a => a.nome).join(", ")`, e `DocPreview` agora é renderizado **uma vez por arquivo** (loop), não uma vez por comprovante.
- O fluxo pós-submissão de substituição (`reenvio-comprovante.ts`, usado por `ServidorComprovanteDetail` para "ilegível → substituir" e "correção solicitada → corrigir e reenviar") continua tratando a substituição como **1 arquivo novo que colapsa tudo** — o novo `arquivos` gravado é `[{ nome: novoArquivo, tipos: <união de todos os tipos que o envio tinha antes> }]`. Ou seja, essa tela específica **não ganhou** suporte a multi-arquivo — decisão deliberada para não duplicar a complexidade em dois lugares (o upload multi-arquivo "de verdade" só existe no wizard de envio inicial).

### 3.18 Elegibilidade por tipo de assistência e documento complementar solicitado pela GERDAB

**Contexto:** continuação direta da rodada de multi-arquivo (mesma sessão, "Etapa B"), implementando as 3 regras de negócio que ainda estavam pendentes na seção 6: restrição de tipo de plano (na prática, já veio pronta junto da Etapa A — ver seção 3.17), elegibilidade por tipo de assistência, e documento complementar solicitado pela GERDAB.

**Elegibilidade por tipo de assistência (`getElegibilidade`, em `comprovante-status.ts`):**
```ts
export function getElegibilidade(
  comprovante: Comprovante,
  beneficiarioId: string,
): { elegivel: boolean; tipoAssistencia?: string } {
  const campos = getCamposDoBeneficiario(comprovante, beneficiarioId);
  const campo = campos.find((c) => c.chave === "tipoAssistencia");
  return { elegivel: campo?.valor !== "odontologico", tipoAssistencia: campo?.valor };
}
```
- Mesmo molde de `getDivergencia` (função pura, recebe comprovante + beneficiário, sem side-effects).
- Em `admin.comprovantes.tsx`, dentro do `.map()` por beneficiário: `const { elegivel } = getElegibilidade(cur, beneficiarioId);`. Os botões "Aprovar" e "Aprovar com ressalva" são envolvidos em `{elegivel && (...)}` — quando não elegível, eles simplesmente **não existem no DOM** (não é um `disabled`, é ausência total do elemento). Um banner vermelho fixo ("Não elegível — Odontológico. O Pró-Saúde não cobre assistência odontológica como reembolsável...") é renderizado logo abaixo do `CamposExtraidosForm` de cada beneficiário não elegível, tanto para o Analista quanto para a Gerência.
- **Testado manualmente:** arquivo com `odontologico` no nome, marcado como "Demonstrativo de Pagamento" (tipo que produz `tipoAssistencia`), bloqueia corretamente os dois botões de aprovação tanto na visão do Analista quanto da Gerência (troca de `localStorage.prosaude_role`), mantendo "Solicitar correção"/"Recusar"/"Solicitar documento complementar" disponíveis.

**Documento complementar solicitado pela GERDAB:**
- Novo campo `Comprovante.solicitacaoComplementar?: { motivo: string; solicitadoPor: string; data: string }` (mock-data.ts) e novo valor `'documento_complementar_solicitado'` no union `AcaoComprovante['acao']`.
- Novo botão "Solicitar documento complementar" em `admin.comprovantes.tsx`, disponível junto das demais ações sempre que `acoesDisponiveis` for true e **não houver já** uma solicitação ativa (`!cur.solicitacaoComplementar`) — visível tanto quando elegível quanto não elegível (é independente da regra de elegibilidade). Abre o mesmo mecanismo de sub-formulário (`subForm.tipo === "complementar"`) com textarea obrigatória para o motivo.
- Ao confirmar, `confirmarSubForm` grava `solicitacaoComplementar` via `updateComprovantePagamento` **e** registra uma entrada em `aprovacoes` (`acao: 'documento_complementar_solicitado'`) — visível no "Histórico de ações" do modal, igual a qualquer outra decisão. **Não altera `status`** — o comprovante continua no fluxo normal de aprovação em paralelo.
- `ServidorComprovanteDetail.tsx`: quando `comprovante.solicitacaoComplementar` existe, renderiza um bloco destacado (motivo + autor + data) com botão "Anexar documento complementar" → `Link` para `/servidor/pagamentos/enviar` com `search: { competencia, beneficiario }` — abre o wizard como um **envio novo e independente** (não edita o comprovante original).
- `addComprovantePagamento` (`prosaude-storage.ts`) chama a nova função privada `limparSolicitacaoComplementar(beneficiarioId, competencia)` sempre que um novo comprovante é persistido — ela varre `getComprovantesUnificados()` por comprovantes do mesmo beneficiário/competência com `solicitacaoComplementar` ativo e limpa o campo via `updateComprovantePagamento(id, { solicitacaoComplementar: undefined })`. Mesmo padrão já usado para `removerDispensaBeneficiario`.
- `notificacoes-pagamento.ts`: nova lista `notificacoesComplementar`, fora do mapa `statusNotificaveis` (já que esta ação não é indexada por `status`) — 1 notificação por par (comprovante com solicitação ativa, beneficiário), mensagem `"GERDAB solicitou documento complementar para {nome}."`.
- **Testado manualmente, incluindo F5:** solicitação criada pelo Analista aparece no sino do Servidor e no `ServidorComprovanteDetail`; ao anexar o documento complementar, a solicitação é removida automaticamente do comprovante original e a notificação desaparece; persistência confirmada após reload real da página (não apenas navegação).

---

## 4. Fluxo do Analista

Arquivo: `src/routes/admin.comprovantes.tsx`. Role determinado por `getAdminRole()` (lê `localStorage.prosaude_role`, default `"gerencia"` se ausente).

### 4.1 Todas as ações disponíveis (Analista)
Aplicáveis quando `statusAcaoAnalista.includes(status)`, onde:
```ts
const statusAcaoAnalista: StatusComprovante[] = [
  "em_analise",
  "retroativo_aguardando_analista",
  "retroativo_devolvido",
];
```
Ações (botões renderizados condicionalmente por status):
- **Aprovar** (rótulo varia: "Aprovar" para `em_analise`; "Aprovar (1ª alçada)" para `retroativo_aguardando_analista`; "Reenviar para Gerência" para `retroativo_devolvido`) — chama `aprovar(comprovante, beneficiarioId)`. **Não renderizado** quando `!getElegibilidade(cur, beneficiarioId).elegivel` (tipo de assistência odontológico — ver seção 3.18).
- **Aprovar com ressalva** — só aparece quando `cur.status === "em_analise"` (não aparece para retroativos, que usam o fluxo de divergência via modal em vez de um botão dedicado — ver 4.4). Mesma restrição de elegibilidade do item acima.
- **Solicitar documento complementar** (novo — seção 3.18) — sempre disponível quando há ações disponíveis e ainda não há uma solicitação ativa (`!cur.solicitacaoComplementar`), independente de elegibilidade ou papel. Não muda `status`.
- **Solicitar correção** — não aparece quando `acoesGerencia` é true (a Gerência não "solicita correção", ela "devolve").
- **Recusar** — sempre disponível quando há ações disponíveis, independente do papel.

### 4.2 Regras de aprovação
Função `proximoStatusAprovacao(statusAtual)`:
```ts
retroativo_aguardando_gerencia → retroativo_aprovado
retroativo_aguardando_analista | retroativo_devolvido → retroativo_aguardando_gerencia
(qualquer outro, ex: em_analise) → aprovado
```
Antes de aprovar, `aprovar()` verifica divergência via `getDivergencia(comprovante, beneficiario)` (compara campo `valor` extraído com `beneficiario.valorCadastrado`). Se divergente, **bloqueia a aprovação direta** e abre `DivergenciaAprovacaoModal`, exigindo justificativa obrigatória antes de prosseguir como "aprovado com ressalva" (ver 4.4).

### 4.3 Solicitação de correção
Só disponível quando `!acoesGerencia`. Abre um sub-formulário inline (`subForm.tipo === "correcao"`) com textarea obrigatória. Ao confirmar, `confirmarSubForm()` chama `registrarAcao(comprovante, beneficiarioId, "correcao_solicitada", { etapa: etapaAtual, acao: "correcao_solicitada", aprovadoPor: autor, data, comentario })`. O comprovante sai da fila "Comprovantes"/"Retroativos" ativa e aparece na aba "Histórico" (pois `correcao_solicitada` está listado em `statusPorTab.historico`), mas **o Servidor** vê o status "Correção Solicitada" com destaque e pode agir (seção 3.15).

### 4.4 Divergência
`DivergenciaAprovacaoModal.tsx`: modal bloqueante, exige textarea de justificativa não-vazia antes de habilitar "Aprovar com ressalva". Ao confirmar (`confirmarDivergencia(justificativa)`):
- Se o comprovante estava em `retroativo_aguardando_gerencia` → conclui direto como `retroativo_aprovado` (a divergência na 2ª alçada **não bloqueia a conclusão final**, apenas fica registrada no histórico como ressalva).
- Caso contrário → usa `proximoStatusAprovacao()` normalmente (ex: `em_analise` → `aprovado_com_ressalva`; `retroativo_aguardando_analista` → `retroativo_aguardando_gerencia`, preservando a ressalva no log).

A divergência **nunca altera o cadastro do beneficiário** (`beneficiario.valorCadastrado` nunca é escrito por esse fluxo) — é sempre um alerta auxiliar sobre o dado extraído, nunca um "status principal" do comprovante.

**Diferença para a checagem de elegibilidade (seção 3.18):** divergência de valor é um **modal bloqueante que pode ser superado** com justificativa (o Analista/Gerência ainda consegue aprovar, só que "com ressalva"). Elegibilidade por tipo de assistência é diferente — **não há caminho para aprovar** um comprovante odontológico; os botões de aprovação simplesmente não existem enquanto isso for verdade, não há modal de exceção. São duas checagens independentes, sem modal compartilhado.

### 4.5 Retroativos (papel do Analista = 1ª alçada)
Analista vê e age sobre `retroativo_aguardando_analista` e `retroativo_aguardando_gerencia` **apenas quando `!isGerencia`** mostra a nota informativa "Aguardando 2ª alçada da Gerência — somente consulta" (sem botões de ação) quando o item já passou para a Gerência. Também vê e age sobre `retroativo_devolvido` (retroativo que a Gerência devolveu — aparece com destaque "Devolvido pela Gerência — ajuste necessário" e o comentário da devolução visível antes dos botões de ação).

### 4.6 Histórico de decisões
Renderizado no rodapé do modal de detalhe (`cur.aprovacoes.length > 0`), lista cronológica com: quem (`aprovadoPor`), papel (`etapa`), ação (mapeada por texto: "aprovou", "aprovou com ressalva", "solicitou correção", "recusou", "devolveu ao Analista", "substituiu o documento", "reenviou o documento"), beneficiário afetado (se aplicável), data/hora, motivo (se houver) e comentário (se houver). Este array **nunca é limpo/reescrito** — cada ação sempre faz `[...comprovante.aprovacoes, novaAcao]` (append-only), preservando o histórico completo mesmo através de múltiplas idas e vindas entre Analista e Gerência.

---

## 5. Fluxo da Gerência

Mesma rota/arquivo que o Analista (`admin.comprovantes.tsx`), diferenciado por `role === "gerencia"` (`isGerencia`).

### 5.1 Diferenças em relação ao Analista
- Gerência **vê e pode agir sobre tudo que o Analista vê e pode agir** (`statusAcaoAnalista` continua válido para ela) — **mais** 3 ações exclusivas quando `statusBeneficiario === "retroativo_aguardando_gerencia"` (`acoesGerencia = statusBeneficiario === "retroativo_aguardando_gerencia" && isGerencia`).
- No menu lateral (`AdminLayout.tsx`), a Gerência vê um item adicional "Parâmetros" (`/admin/parametros`) que o Analista não vê — isso é herdado de antes do Módulo de Pagamento e não foi alterado.
- Rodapé do menu mostra "Erandir / Gerência" vs "Rebeca / Luciana" / "Analista GERDAB — sem acesso a parâmetros" (texto estático, não reflete o `analistaReferencia`/`gerenteReferencia` usados na lógica de negócio — são apenas textos de exibição do menu, **não confundir com os nomes usados em `aprovacoes`**, que vêm de `autor = isGerencia ? gerenteReferencia : analistaReferencia` = "Francisco" ou "Sarah Santos").

### 5.2 Segunda alçada (ações exclusivas)
Quando `acoesGerencia` é true, os botões exibidos são:
1. **"Aprovar definitivamente"** — mesmo `aprovar()` do Analista, mas como `proximoStatusAprovacao("retroativo_aguardando_gerencia")` retorna `"retroativo_aprovado"`, esta é a conclusão final do fluxo retroativo. Se houver divergência, abre o mesmo `DivergenciaAprovacaoModal`, e mesmo assim conclui como `retroativo_aprovado` (ver 4.4).
2. **"Devolver ao Analista"** — `subForm.tipo === "devolver"`, textarea obrigatória. Ao confirmar: `registrarAcao(comprovante, beneficiarioId, "retroativo_devolvido", { etapa: "gerencia", acao: "devolvido_analista", aprovadoPor: autor, data, comentario })`. **Nota:** aqui `etapa` é hardcoded como `"gerencia"` (não usa a variável `etapaAtual`), pois só a Gerência pode devolver.
3. **"Recusar"** — mesmo botão do Analista, mas o status resultante é diferente (ver 5.4).

### 5.3 Devolução ao Analista
Status resultante: `retroativo_devolvido` (não reaproveita `retroativo_aguardando_analista`, para diferenciar visualmente "nunca passou pela 1ª alçada" de "já passou e foi devolvido" — decisão explícita, ver seção 13). O comprovante volta a aparecer na fila do Analista (`statusAcaoAnalista` inclui `retroativo_devolvido`) com destaque visual (banner âmbar "Devolvido pela Gerência — ajuste necessário" + o comentário da Gerência), tanto no painel do Analista quanto na tela do Servidor (`ServidorComprovanteDetail`).

Quando o Analista reaprova a partir de `retroativo_devolvido`, o botão mostra "Reenviar para Gerência" (não "Aprovar (1ª alçada)", para não confundir com um retroativo que nunca foi analisado) e o resultado é `retroativo_aguardando_gerencia` de novo.

### 5.4 Recusa (exclusiva da 2ª alçada)
Quando `comprovante.status === "retroativo_aguardando_gerencia"` no momento da recusa, o status resultante é **`retroativo_recusado`** (não `recusado` genérico) — decisão explícita para permitir exibir corretamente, no detalhe: competência original, justificativa do atraso, a aprovação anterior do Analista (1ª alçada) **e** a decisão final da Gerência, lado a lado. Fora desse caso (recusa em `em_analise` ou `retroativo_aguardando_analista`), o status continua sendo `recusado` comum.

**Ambos os status (`recusado` e `retroativo_recusado`) são terminais** — nenhuma ação de reenvio é oferecida ao Servidor para eles (`ServidorComprovanteDetail` não renderiza nenhum botão nesses casos).

### 5.5 Aprovação definitiva
Ver 5.2, item 1. É o único caminho que produz `retroativo_aprovado`.

### 5.6 Regras exclusivas da Gerência
- Só a Gerência pode agir sobre `retroativo_aguardando_gerencia` (Analista vê somente leitura com nota "somente consulta").
- Só a Gerência pode gerar os status `retroativo_devolvido`, `retroativo_aprovado`, `retroativo_recusado` (via 2ª alçada — este último status também é indiretamente exclusivo pois só ocorre a partir de `retroativo_aguardando_gerencia`).
- Card "Retroativos pendentes" no dashboard admin (`admin.dashboard.tsx`) conta `status === "retroativo_aguardando_gerencia"` — hoje é **apenas informativo** ali (link para a fila), a ação em si acontece em `/admin/comprovantes`.

---

## 6. Regras de Negócio Consolidadas

### Competências
1. `competenciaAtual = "2026-07"` é a única competência "aberta" para envio normal (não retroativo).
2. `competenciasFechadas = ["2026-04", "2026-05", "2026-06"]` são as únicas competências elegíveis para envio retroativo pelo dropdown de seleção — **não é possível** enviar para uma competência fora dessas duas listas.
3. Uma competência fechada sem **nenhum** comprovante de **nenhum** beneficiário conta como "sem envio" — sem prazo de tolerância adicional, vira pendência assim que fechada (é assim por definição estática de `competenciasFechadas`, não há job de "fechamento automático" simulado).
4. Uma competência com **pelo menos 1** comprovante mas nem todos os beneficiários ativos cobertos conta como "incompleta" — regra aplicada apenas à `competenciaAtual` hoje (ver seção 12).

### Beneficiários
5. `beneficiariosPagamento` é uma lista fixa de 3 registros (Carlos/Marina/Pedro) — não há CRUD de beneficiários no Módulo de Pagamento.
6. Um beneficiário pode ter **múltiplos documentos** na mesma competência (documentos complementares) — nunca há sobrescrita.

### Documentos
7. **(Atualizada — ver seção 3.17)** Um `Comprovante` pode ter **múltiplos arquivos complementares** via `arquivos: ArquivoAnexado[]` (antes era 1 único `arquivo: string`). Mesmo assim, documentos complementares para 1 pessoa específica que chegam **depois** (em momento diferente) continuam sendo sempre um **novo** `Comprovante` independente — `arquivos[]` serve para arquivos anexados **juntos, no mesmo envio**, não para o histórico de complementos ao longo do tempo.
8. `camposExtraidos` é usado quando `beneficiarioIds.length === 1`; `gruposExtraidos` é usado quando `> 1`. Um Comprovante nunca tem os dois preenchidos simultaneamente com significado — `camposExtraidos` fica `[]` ou com o primeiro grupo copiado quando há múltiplos (ver `confirmarDocumento()`: `camposExtraidos: primeiro?.campos ?? []` sempre grava o primeiro grupo ali também, por segurança/compatibilidade com código legado que só lê `camposExtraidos`).
9. Editar qualquer campo sempre marca `origem: 'manual'`, mesmo que o valor final seja igual ao original.
9a. Um arquivo pode ter mais de um `TipoDocumentoArquivo` marcado simultaneamente (ex: um único PDF marcado como Fatura Técnica **e** Comprovante de Pagamento) — os tipos determinam quais campos aquele arquivo contribui na consolidação (ver seção 3.17), não são mutuamente exclusivos.
9b. Ao consolidar múltiplos arquivos do mesmo envio, cada campo do resultado final vem do **primeiro arquivo (ordem de upload)** que o produziu — não há lógica de "melhor confiança vence" na consolidação entre arquivos (diferente da lógica de "Não identificado" dentro de 1 arquivo só, que já existia).

### Pendências
10. "Pendências" no Resumo da Competência conta **beneficiários únicos**, nunca documentos — um mesmo beneficiário nunca é contado duas vezes mesmo que tenha 2 motivos de pendência (ex: 1 documento ilegível + 1 documento com campo vazio).
11. Motivos que geram pendência de beneficiário: documento com status `ilegivel`; documento com status `correcao_solicitada`; documento com algum campo vazio (`beneficiarioTemCampoVazio`); ausência total de documento (quando não dispensado).
12. O botão "Concluir envio da competência" só é bloqueado por beneficiários **sem comprovante e não dispensados** (`pendenciaAtiva`). Pendências de documento ilegível/correção não bloqueiam a conclusão — são apenas informativas no contador.

### Retroativos
13. `isRetroativo = competencia !== competenciaAtual` (qualquer competência diferente da atual é tratada como retroativa).
14. Retroativo exige `justificativaAtraso` obrigatória antes de avançar do passo de seleção.
15. Fluxo de dupla alçada sequencial e visível: `retroativo_aguardando_analista → retroativo_aguardando_gerencia → retroativo_aprovado`, com desvios possíveis para `retroativo_devolvido` (volta ao Analista) e `retroativo_recusado` (terminal, só a partir da 2ª alçada).
16. Divergência de valor na 2ª alçada **não bloqueia** a conclusão — apenas fica registrada como ressalva.

### Conclusão de competência
17. "Concluir envio da competência" **nunca** persiste um novo `Comprovante` — só grava um registro de conclusão (`ConclusaoCompetencia`).
18. Qualquer novo `Comprovante` persistido para uma competência **invalida automaticamente** uma conclusão anterior daquela competência (implementado dentro de `addComprovantePagamento`, não na UI).

### Dispensas
19. "Continuar sem este beneficiário" grava uma dispensa (`BeneficiarioDispensado`) por par (beneficiário, competência) — **exige confirmação explícita** (dialog inline) antes de gravar.
20. Uma dispensa **nunca esconde** o beneficiário da visão consolidada — ele continua listado, com texto "Sem comprovante — não incluída nesta competência" e ainda com a opção de anexar depois.
21. Ao anexar posteriormente um comprovante para um beneficiário dispensado, a dispensa daquele par (beneficiário, competência) é **removida automaticamente** (dentro de `addComprovantePagamento`).

### Múltiplos documentos / Fatura técnica
22. Documentos complementares nunca sobrescrevem os anteriores.
23. Fatura técnica: preencher manualmente corrige só aquele beneficiário; reenviar comprovante substitui o documento inteiro (todos os beneficiários daquele Comprovante são reprocessados).
24. Não existe reenvio individual dentro de uma fatura técnica multi-beneficiário — a alternativa é criar um documento complementar novo e independente para a pessoa específica.

### Preenchimento manual
25. Todo campo é editável no momento da conferência do Servidor (não há mais um modo "somente leitura de nome/valor" para documentos individuais — unificado com a fatura técnica).
26. Campo `pagador` deve, por regra de negócio, corresponder ao **titular** do grupo familiar (Carlos Eduardo Ramos), independentemente de qual beneficiário o documento cobre. Se divergente, badge "Divergente" é exibido (mesmo visual da divergência de valor), mas **isso não bloqueia** o avanço do fluxo do Servidor — é apenas um alerta visual (o bloqueio por divergência de **valor** só acontece no lado do Analista/Gerência, na aprovação, não no envio pelo Servidor).

### Notificações
27. Uma notificação por competência "sem envio" + uma notificação por beneficiário com status "notificável" mais recente (não uma notificação por evento histórico — só o estado mais recente gera notificação).
28. Notificações não têm estado de "lida" — são recalculadas a cada carregamento da tela.

### Persistência
29. Ver seção 8 — regra geral: tudo que precisa sobreviver a F5 vive em `localStorage`; nada fica só em estado React entre navegações de página completas.
30. Dados seed (`comprovantes` em `mock-data.ts`) são somente leitura em memória — qualquer alteração sobre um registro seed o "promove" para o `localStorage` como uma cópia modificada (nunca edita o array `comprovantes` original).

### Tipo de plano (restrição de tipos de documento) — implementado
31a. `tipoPlanoPagamento: 'empresarial' | 'individual_familiar'` (hoje fixo em `'individual_familiar'` para o cenário Carlos/Marina/Pedro) e `tiposDocumentoPorPlano` em `mock-data.ts` **restringem** os tipos de documento oferecidos no upload multi-arquivo (`empresarial` → só Fatura Técnica + Comprovante de Pagamento; `individual_familiar` → Boleto, Recibo, Demonstrativo + Comprovante de Pagamento).
31b. **Não existe** alternador de UI para trocar de plano — para demonstrar o ramo empresarial, é preciso trocar `tipoPlanoPagamento` manualmente no código e rebuildar. Isso é uma limitação conhecida, aceita (ver seção 12).

### Tipo de assistência (odontológico não reembolsável) — implementado (seção 3.18)
31c. `CampoExtraido` suporta a chave `'tipoAssistencia'` com valores `'medico_hospitalar' | 'ambulatorial' | 'hospitalar' | 'odontologico'`, gerado pelo OCR mock (arquivos do tipo `fatura_tecnica`/`demonstrativo` o produzem; nome de arquivo contendo `"odontologico"`/`"odonto"` gera o valor `odontologico`, senão `medico_hospitalar` por padrão) e exibido com badge "Não elegível — Odontológico" em `CamposExtraidosForm` sempre que o valor for `odontologico`.
31d. **Bloqueio de aprovação implementado:** `getElegibilidade(comprovante, beneficiarioId)` (`comprovante-status.ts`) retorna `elegivel: false` quando `tipoAssistencia === 'odontologico'`. Em `admin.comprovantes.tsx`, quando não elegível: os botões "Aprovar" e "Aprovar com ressalva" **não são renderizados** para aquele beneficiário (nem pelo Analista, nem pela Gerência) — só "Solicitar correção", "Recusar" e "Solicitar documento complementar" continuam disponíveis. Um banner vermelho explicativo também é exibido no card do beneficiário. Não há um segundo bloqueio dentro de `aprovar()` (a função nunca é chamada, pois o botão não existe) — o controle é 100% via ausência do botão na UI.

### Documento complementar solicitado pela GERDAB — implementado (seção 3.18)
31e. O Servidor já podia anexar documentos complementares por iniciativa própria a qualquer momento (regra 6 acima). Agora o Analista/Gerência também pode **solicitar explicitamente** um documento complementar (distinto de "Solicitar correção", que pressupõe que o documento atual está errado) via `Comprovante.solicitacaoComplementar`, destacado ao Servidor em `ServidorComprovanteDetail` com um botão de anexo direto.

### Permissões
31. Gerência = Analista + 3 ações exclusivas sobre retroativos aguardando a 2ª alçada. Nunca o inverso.
32. `getAdminRole()` faz default para `"gerencia"` quando a chave não existe no `localStorage` — **atenção**: isso significa que, sem login explícito, o comportamento padrão do admin é "Gerência" (mais permissivo), não "Analista".

---

## 7. Modelo de Dados

Todas as interfaces abaixo estão em `src/lib/mock-data.ts`, salvo indicação contrária.

### `StatusComprovante` (union type)
```ts
type StatusComprovante =
  | 'processando'          // legado/não usado no fluxo atual (era do design original)
  | 'ilegivel'
  | 'revisao'              // legado — não usado desde a unificação do passo de revisão
  | 'em_analise'
  | 'correcao_solicitada'
  | 'aprovado'
  | 'aprovado_com_ressalva'
  | 'recusado'
  | 'retroativo_aguardando_analista'
  | 'retroativo_aguardando_gerencia'
  | 'retroativo_devolvido'
  | 'retroativo_aprovado'
  | 'retroativo_recusado';
```
`'processando'` e `'revisao'` são resquícios de versões anteriores do fluxo — não são mais atribuídos por nenhum código atual, mas permanecem no union por segurança de tipos (podem ser removidos com segurança se confirmado que nenhum dado antigo em `localStorage` de sessões de teste os usa).

### `CampoExtraido`
```ts
interface CampoExtraido {
  chave:
    | 'nome' | 'cpf' | 'operadora' | 'competencia' | 'valor'
    | 'dataPagamento' | 'banco' | 'pagador' | 'tipoAssistencia'; // tipoAssistencia adicionado na rodada de multi-arquivo
  valor: string;
  origem: 'ocr' | 'manual';
  confianca: 'alta' | 'media' | 'nenhuma';
  arquivoOrigem?: string; // NOVO — nome do arquivo (dentre os anexados ao envio) que originou este campo
}

type TipoAssistencia = 'medico_hospitalar' | 'ambulatorial' | 'hospitalar' | 'odontologico';
```
`pagador` foi adicionado antes (regra do usuário — pagamento deve ser feito pelo titular). `tipoAssistencia` e `arquivoOrigem` foram adicionados na rodada de multi-arquivo (seção 3.17) — `tipoAssistencia` sustenta a regra de assistência odontológica não reembolsável (seção 6), e `arquivoOrigem` sustenta a rastreabilidade de qual arquivo originou cada campo consolidado. `cpf` existe no tipo e nos dados seed, mas **não é gerado** por `gerarCamposExtraidos()` (assimetria conhecida, seção 12).

### `TipoDocumentoArquivo` e `ArquivoAnexado`
```ts
type TipoDocumentoArquivo = 'fatura_tecnica' | 'comprovante_pagamento' | 'boleto' | 'recibo' | 'demonstrativo';

interface ArquivoAnexado {
  nome: string;
  tipos: TipoDocumentoArquivo[]; // um arquivo pode ter mais de 1 tipo marcado
}

const tipoPlanoPagamento: 'empresarial' | 'individual_familiar' = 'individual_familiar';
const tiposDocumentoPorPlano: Record<'empresarial' | 'individual_familiar', TipoDocumentoArquivo[]> = {
  empresarial: ['fatura_tecnica', 'comprovante_pagamento'],
  individual_familiar: ['boleto', 'recibo', 'demonstrativo', 'comprovante_pagamento'],
};
```
Novos nesta rodada (seção 3.17). `TipoDocumentoArquivo` substitui o antigo `Comprovante['tipoDocumento']` (união única, removida) — `'boleto_individual'` foi renomeado para `'boleto'`.

### `AcaoComprovante`
```ts
interface AcaoComprovante {
  etapa: 'servidor' | 'analista' | 'gerencia';
  acao:
    | 'aprovado'
    | 'aprovado_com_ressalva'
    | 'correcao_solicitada'
    | 'recusado'
    | 'documento_substituido'
    | 'reenviado'
    | 'devolvido_analista'
    | 'documento_complementar_solicitado';  // NOVO — Etapa B (seção 3.18)
  aprovadoPor: string;
  data: string;              // ISO string
  motivo?: string;           // usado em recusas (dropdown de motivo)
  comentario?: string;       // texto livre (justificativa/ressalva/correção/devolução/pedido de complementar)
  beneficiarioId?: string;   // presente só quando a ação é sobre 1 beneficiário específico de um multi-beneficiário
}
```
Representa 1 entrada do histórico append-only (`Comprovante.aprovacoes`). Nunca é editada ou removida, só adicionada.

### `SolicitacaoComplementar` (novo — seção 3.18)
```ts
interface SolicitacaoComplementar {
  motivo: string;
  solicitadoPor: string;
  data: string;
}
```
Registra um pedido ativo de documento complementar pelo Analista/Gerência. Vive em `Comprovante.solicitacaoComplementar` (opcional) — não é um array/histórico, é sempre "o pedido ativo atual" (removido quando atendido).

### `StatusBeneficiarioComprovante`
```ts
interface StatusBeneficiarioComprovante {
  beneficiarioId: string;
  status: StatusComprovante;
  comentario?: string;
}
```
Usado só quando `Comprovante.beneficiarioIds.length > 1` (fatura técnica), para rastrear o status individual de cada beneficiário dentro do mesmo documento. Ver `recomputeStatusGeral()` (regra de agregação em `comprovante-status.ts`) e `getListaStatusBeneficiario()` (normaliza single/multi para uma lista uniforme).

### `Comprovante`
```ts
interface Comprovante {
  id: string;
  arquivos: ArquivoAnexado[];              // ATUALIZADO nesta rodada — antes era `arquivo: string` + `tipoDocumento` únicos
  beneficiarioIds: string[];
  competencia: string;                    // formato "YYYY-MM"
  isRetroativo: boolean;
  justificativaAtraso?: string;
  camposExtraidos: CampoExtraido[];        // usado quando beneficiarioIds.length === 1
  gruposExtraidos?: { beneficiarioId: string; campos: CampoExtraido[] }[]; // quando > 1
  justificativaDivergencia?: string;       // preenchida na divergência de valor (analista/gerência) — hoje não é mais escrita explicitamente (era da Etapa 2, mantida por compatibilidade de tipo)
  status: StatusComprovante;               // status geral — derivado de statusPorBeneficiario quando multi
  statusPorBeneficiario?: StatusBeneficiarioComprovante[];
  versoesAnteriores?: { arquivo: string; dataEnvio: string; status: StatusComprovante }[];
  solicitacaoComplementar?: SolicitacaoComplementar; // NOVO — Etapa B (seção 3.18)
  aprovacoes: AcaoComprovante[];           // append-only
  dataEnvio: string;                      // ISO string — atualizada a cada substituição/reenvio
}
```

### `BeneficiarioPagamento`
```ts
interface BeneficiarioPagamento {
  id: string;
  nome: string;
  parentesco: 'Titular' | 'Cônjuge' | 'Filho';
  operadora: string;
  valorCadastrado: number;
  situacao: 'ativo' | 'pendente_documentacao' | 'inativo';
}
```
3 instâncias fixas em `beneficiariosPagamento` — `situacao` existe no tipo mas não é usada por nenhuma lógica condicional hoje (todos os 3 são `'ativo'`).

### `ConclusaoCompetencia`
```ts
interface ConclusaoCompetencia {
  competencia: string;
  concluidoEm: string;   // ISO string
}
```
Um registro por competência (a mais recente sobrescreve, via filtro+append em `saveConclusaoCompetencia`).

### `BeneficiarioDispensado`
```ts
interface BeneficiarioDispensado {
  beneficiarioId: string;
  competencia: string;
  motivo: "continuar_sem_comprovante";   // union de 1 valor só — preparado para expansão futura
  data: string;
}
```
Chave composta lógica é `(beneficiarioId, competencia)` — nunca há mais de 1 registro ativo para o mesmo par (removido e recriado a cada `dispensarBeneficiario`).

### `MotivoIncompletude` / `BeneficiarioFaltante` (em `competencias-pendentes.ts`, não em `mock-data.ts`)
```ts
type MotivoIncompletude = "sem_comprovante" | "documento_ilegivel";
interface BeneficiarioFaltante {
  beneficiarioId: string;
  motivo: MotivoIncompletude;
}
```
Retorno de `getBeneficiariosFaltantes()` — tipo local ao módulo, não persistido (é sempre recalculado).

---

## 8. Persistência

Todas as chaves vivem em `PROSAUDE_STORAGE_KEYS` (`src/lib/prosaude-storage.ts`). Nenhuma delas é exclusiva do Módulo de Pagamento exceto as 3 últimas listadas abaixo.

| Chave | Constante | Conteúdo | Módulo |
|---|---|---|---|
| `prosaude_titular_cadastro` | `titularCadastro` | `TitularCadastro` (dados de cadastro do titular, requerimento de 1º acesso) | Cadastro (fora deste escopo) |
| `prosaude_requerimento_mudanca_plano` | `requerimentoMudancaPlano` | `RequerimentoMudancaPlanoDraft` | Cadastro (fora deste escopo) |
| `prosaude_comprovantes_pagamento` | `comprovantesPagamento` | `Comprovante[]` — **todos** os comprovantes persistidos nesta sessão (novos envios do Servidor + qualquer comprovante seed que já foi "tocado"/atualizado por Analista/Gerência/Servidor) | **Pagamento** |
| `prosaude_competencias_concluidas` | `competenciasConcluidas` | `ConclusaoCompetencia[]` — 1 entrada por competência concluída | **Pagamento** |
| `prosaude_beneficiarios_dispensados` | `beneficiariosDispensados` | `BeneficiarioDispensado[]` — 1 entrada por par (beneficiário, competência) dispensado | **Pagamento** |
| `prosaude_role` | *(constante inline em `AdminLayout.tsx`, não faz parte de `PROSAUDE_STORAGE_KEYS`)* | `"analista"` \| `"gerencia"` | Autenticação simulada (compartilhado, mas relevante para Pagamento) |

### Funções de acesso (`prosaude-storage.ts`)

**Comprovantes:**
- `loadComprovantesPagamento(): Comprovante[]` — lê a chave, retorna `[]` em SSR ou erro de parse.
- `addComprovantePagamento(comprovante)` — **efeitos colaterais importantes**: além de gravar, chama `removerDispensaBeneficiario` e `limparSolicitacaoComplementar` (NOVO — Etapa B) para cada `beneficiarioId` do novo comprovante, e `invalidarConclusaoCompetencia` para a competência dele. Isso é o único ponto de entrada para "novo documento" — qualquer código futuro que precise adicionar um Comprovante **deve** passar por esta função para preservar essas regras.
- `limparSolicitacaoComplementar(beneficiarioId, competencia)` (NOVO, privada/não exportada) — varre `getComprovantesUnificados()` por comprovantes do mesmo beneficiário/competência com `solicitacaoComplementar` ativo e os limpa via `updateComprovantePagamento`. Chamada automaticamente por `addComprovantePagamento`.
- `getComprovantesUnificados(): Comprovante[]` — mescla `comprovantes` (seed, `mock-data.ts`) com o array persistido, **deduplicando por `id`** com prioridade para a versão persistida. É a função canônica para "ler todos os comprovantes" em qualquer tela — nunca ler `comprovantes` (seed) diretamente numa tela de UI.
- `updateComprovantePagamento(id, patch)` — atualiza um registro existente (seed ou persistido); se o registro só existir no seed, "promove" ele para o localStorage já com o patch aplicado (usado pelo Analista/Gerência para mudar status, e por `confirmarReenvio` para atualizar após reenvio).

**Conclusão de competência:**
- `loadConclusoesCompetencia()`, `getConclusaoCompetencia(competencia)`, `saveConclusaoCompetencia(competencia)`, `invalidarConclusaoCompetencia(competencia)`.

**Dispensa de beneficiário:**
- `loadBeneficiariosDispensados()`, `getBeneficiariosDispensadosIds(competencia): string[]`, `dispensarBeneficiario(beneficiarioId, competencia)`, `removerDispensaBeneficiario(beneficiarioId, competencia)`.

### Comportamento validado após F5 (testado manualmente em múltiplas sessões de desenvolvimento)
- Comprovantes enviados, histórico, notificações, aprovações, correções e retroativos sobrevivem a reload completo.
- Conclusão de competência sobrevive a F5, e é corretamente invalidada quando um novo documento chega depois.
- Dispensa de beneficiário sobrevive a F5, e é corretamente removida quando um documento chega para aquele beneficiário depois.
- **(Novo)** Solicitação de documento complementar sobrevive a F5, e é corretamente removida quando o documento complementar é anexado.

---

## 9. Estrutura de Navegação

```
/login
  → seleciona perfil → grava localStorage.prosaude_role (se admin) → navega

/servidor  (ServidorLayout — header com sino de notificações, menu inferior de 4 abas)
  /inicio
  /pagamentos                          ← Módulo de Pagamento (home)
    /enviar   (?competencia=X&beneficiario=Y opcionais) ← wizard de envio
  /dependentes
  /meus-dados                          ← contém botão "Sair"
  /requerimento/...                    (fora do escopo deste documento)

/admin  (AdminLayout — sidebar, Analista e Gerência compartilham)
  /dashboard                           ← card "Retroativos pendentes"
  /servidores/...
  /requerimentos
  /comprovantes                        ← Módulo de Pagamento (fila do Analista/Gerência)
  /carga-inicial
  /parametros                          ← só visível para Gerência

/associacao/...                        (fora do escopo, inalterado)
```

### Navegação entre telas do Módulo de Pagamento
- `servidor.pagamentos.index` → `servidor.pagamentos.enviar` via: botão "Enviar comprovante de pagamento" (sem search params), links "Enviar retroativo" (`search: { competencia }`), links "Anexar comprovante" do alerta de incompleta (`search: { competencia, beneficiario }`).
- Dentro de `servidor.pagamentos.enviar`, "Anexar comprovante do dependente" (a partir do `ConsolidadoCompetencia`) **não navega** — reseta o estado local do wizard (`handleAnexarDependente`) e volta ao passo `"selecao"` dentro da mesma instância de rota.
- `servidor.pagamentos.enviar` → `servidor.pagamentos.index` ao clicar "Cancelar" (em qualquer passo, via `StepNav`'s `cancelTo`) ou "Concluir envio da competência" (`navigate({ to: "/servidor/pagamentos" })`).
- `servidor.pagamentos.index` abre `ServidorComprovanteDetail` como **modal sobreposto** (não navega de rota) a partir de qualquer card clicável.
- `admin.comprovantes` abre seu próprio modal de detalhe (inline no mesmo arquivo, não é um componente separado) da mesma forma — clique em "Visualizar" seta `openId`.
- Card "Retroativos pendentes" em `admin.dashboard` → `Link to="/admin/comprovantes"` (não abre a aba "Retroativos" automaticamente — limitação conhecida, seção 12).

---

## 10. Componentes

### `BeneficiarioSelector`
- **Finalidade:** seleção múltipla de beneficiários no passo "selecao" do wizard de envio.
- **Props:** `beneficiarios: BeneficiarioPagamento[]`, `competencia: string`, `comprovantesExistentes: Comprovante[]`, `selecionados: string[]`, `onChange: (ids: string[]) => void`.
- **Comportamento:** checkbox por beneficiário; botão "Selecionar grupo familiar completo"/"Limpar seleção"; aviso amarelo por beneficiário que já tem documento naquela competência ("documento complementar").
- **Usado em:** `servidor.pagamentos.enviar.tsx` (passo "selecao").

### `ComprovanteUploadBox`
- **Finalidade:** drop-zone/seleção de **1 único** arquivo — usado apenas no fluxo pós-submissão de substituição (não mais no wizard de envio inicial, que usa `ArquivosAnexadosUpload` desde a rodada de multi-arquivo, seção 3.17).
- **Props:** `arquivo: File | null`, `onSelect: (file) => void`, `onClear: () => void`.
- **Comportamento:** mostra área tracejada "Tocar para enviar" quando vazio; mostra nome+tamanho do arquivo com botão de remover quando preenchido.
- **Usado em:** `ServidorComprovanteDetail.tsx` (substituir/corrigir e reenviar) — único uso restante.

### `ArquivosAnexadosUpload` (novo — seção 3.17)
- **Finalidade:** upload de 1 ou mais arquivos complementares no mesmo envio, cada um com seu próprio grupo de tipos documentais marcáveis.
- **Props:** `arquivos: { file: File; tipos: TipoDocumentoArquivo[] }[]`, `tiposPermitidos: TipoDocumentoArquivo[]` (filtrados por `tipoPlanoPagamento`), `onChange: (arquivos) => void`.
- **Comportamento:** cada arquivo anexado mostra nome/tamanho + botão remover + linha de toggle-buttons (tipos permitidos, múltipla marcação); botão "Adicionar outro arquivo"/"Tocar para enviar" reaproveita o mesmo `<input type="file">` a cada clique (reseta `input.value` após cada seleção para permitir reselecionar o mesmo nome de arquivo).
- **Usado em:** `servidor.pagamentos.enviar.tsx` (passo "upload").

### `CamposExtraidosForm`
- **Finalidade:** exibir e (opcionalmente) editar o conjunto de `CampoExtraido[]` de 1 beneficiário, com indicadores de confiança, origem do arquivo e divergência.
- **Props:** `titulo?: string`, `campos: CampoExtraido[]`, `onChange?: (campos) => void`, `valorCadastrado?: number` (ativa divergência de `valor`), `nomeTitular?: string` (ativa divergência de `pagador`), `readOnly?: boolean` (default `false`).
- **Comportamento:** por campo, mostra label + input (ou `<select>` para `tipoAssistencia`); badges condicionais "Não identificado" (campo vazio), "Não elegível — Odontológico" (**novo** — `tipoAssistencia === 'odontologico'`), "Divergente" (valor ou pagador fora do esperado), "Preenchido manualmente" (`origem === 'manual'`) ou indicador de confiança (ícone + texto); linha adicional **"Origem: {arquivoOrigem}"** (**novo**) quando o campo tem essa informação. Editar sempre seta `origem: 'manual'`.
- **Usado em:** `ConferenciaBeneficiarios.tsx` (editável), `ServidorComprovanteDetail.tsx` (misto: editável durante reenvio, `readOnly` nos demais estados), `admin.comprovantes.tsx` (sempre `readOnly`, com `valorCadastrado` para mostrar divergência ao Analista/Gerência), `ConsolidadoCompetencia.tsx` (**novo uso** — edição inline de envios ainda não decididos, a partir do Resumo da Competência).

### `ResumoPagamento`
- **Finalidade:** card de resumo do **documento atual** (não da competência inteira) antes de confirmar/persistir.
- **Props:** `arquivos: { nome, tipos }[]` (**atualizado** — antes era `arquivo: string` único), `beneficiarios: BeneficiarioPagamento[]`, `competencia: string`, `isRetroativo: boolean`, `justificativaAtraso?: string`, `gruposExtraidos: { beneficiarioId, campos }[]`.
- **Comportamento:** somente leitura, lista todos os arquivos anexados (nome + tipos) e todos os campos de todos os grupos em formato `<dl>`; valores de `tipoAssistencia` são exibidos com o rótulo amigável (`tipoAssistenciaLabels`), não o valor bruto do enum.
- **Usado em:** `servidor.pagamentos.enviar.tsx` (passo "confirmar_documento").

### `ComprovanteStatusBadge`
- **Finalidade:** badge colorido de status, usando as cores centralizadas em `statusComprovanteCore`/`statusComprovanteLabels`.
- **Props:** `status: StatusComprovante`, `label?: string` (override do texto padrão).
- **Usado em:** praticamente todas as telas do módulo (`servidor.pagamentos.index.tsx`, `admin.comprovantes.tsx`, `ServidorComprovanteDetail.tsx`).

### `NotificationBell`
- **Finalidade:** ícone de sino no header do Servidor com badge de contagem e dropdown de mensagens.
- **Props:** nenhuma (busca dados internamente via `getNotificacoesPagamento()`).
- **Comportamento:** fecha ao clicar fora (`useEffect` com listener de `mousedown`); recalcula notificações só uma vez no mount (**não escuta mudanças de storage em tempo real** — se o usuário mudar de aba e agir como Analista em outra aba, o sino não atualiza sozinho, só ao remontar o componente).
- **Usado em:** `ServidorLayout.tsx` (header).

### `ServidorComprovanteDetail`
- **Finalidade:** modal de detalhe/ação de um comprovante já persistido, do ponto de vista do Servidor — cobre todos os status possíveis com renderização condicional.
- **Props:** `comprovante: Comprovante`, `focusBeneficiarioId?: string` (ordena a lista para colocar esse beneficiário primeiro), `onClose: () => void`, `onChanged: () => void` (callback para o pai forçar refresh).
- **Comportamento:** ver seção 3.15 em detalhe. Título e preview agora iteram sobre `comprovante.arquivos` (1 `DocPreview` por arquivo) em vez de exibir 1 arquivo único. Quando `comprovante.solicitacaoComplementar` existe (Etapa B, seção 3.18), exibe bloco destacado (motivo + autor + data) com botão "Anexar documento complementar" (`Link` para o wizard como envio novo).
- **Usado em:** `servidor.pagamentos.index.tsx` (todos os cards clicáveis), **`ConsolidadoCompetencia.tsx`** (novo uso — acionado por `corrigirEnvio()` quando o envio está `ilegivel` ou `correcao_solicitada`).

### `DivergenciaAprovacaoModal`
- **Finalidade:** modal bloqueante de justificativa quando o Analista/Gerência tenta aprovar um comprovante com valor divergente do cadastro.
- **Props:** `open: boolean`, `beneficiarioNome: string`, `valorExtraido: number`, `valorCadastrado: number`, `onConfirm: (justificativa) => void`, `onCancel: () => void`.
- **Comportamento:** usa os primitivos `Dialog` do shadcn/ui; botão "Aprovar com ressalva" só habilita com justificativa não-vazia.
- **Usado em:** `admin.comprovantes.tsx`.

### `DocPreview`
- **Finalidade:** simular visualmente um preview de documento (não há renderização real de PDF/imagem).
- **Props:** `filename: string`.
- **Usado em:** `ServidorComprovanteDetail.tsx`, `admin.comprovantes.tsx` — **desde a rodada de multi-arquivo, é renderizado 1 vez por arquivo** (`comprovante.arquivos.map(a => <DocPreview key={a.nome} filename={a.nome} />)`), não mais 1 vez por comprovante.

### `LendoComprovante`
- **Finalidade:** tela/estado "Lendo comprovante" com checklist de 3 etapas.
- **Props:** `nomesArquivos: string[]` (**atualizado** — antes era `nomeArquivo: string` único), `etapaAtual: EtapaLeitura (0|1|2)`, `concluido?: boolean`, `falhouLegibilidade?: boolean`, `onVoltar: () => void`.
- **Comportamento:** exibe a lista de nomes de arquivo (separados por vírgula) e título no plural quando há mais de 1; a checklist de 3 etapas continua sendo **global ao lote inteiro** (sem progresso por arquivo individual — simplificação deliberada).
- **Usado em:** `servidor.pagamentos.enviar.tsx` (passo "lendo").

### `ConferenciaBeneficiarios`
- **Finalidade:** tela unificada "Confira antes de enviar" — usada para 1 ou N beneficiários e 1 ou N arquivos igualmente.
- **Props:** `arquivos: { nome, tipos }[]` (**atualizado** — antes era `arquivo: string` único), `beneficiarios: BeneficiarioPagamento[]`, `gruposExtraidos: { beneficiarioId, campos }[]`, `onChangeGrupo: (id, campos) => void`, `onVoltar: () => void` (**substituiu** `onSubstituirArquivo`, que recebia 1 novo File — agora simplesmente volta ao passo de upload multi-arquivo), `onContinuar: () => void`, `nomeTitular?: string`.
- **Comportamento:** ver seções 3.4-3.7 e 3.17 em detalhe. Novo bloco "Documentos analisados" no topo, listando arquivos + tipos marcados. Estado interno `confirmados: Set<string>` (o antigo `reenviandoTudo` foi removido — "reenviar" hoje só volta ao passo de upload, sem upload inline dentro desta própria tela).
- **Usado em:** `servidor.pagamentos.enviar.tsx` (passo "conferencia_beneficiarios").

### `ConsolidadoCompetencia`
- **Finalidade:** tela final "Resumo da competência" — consolida todos os documentos persistidos da competência (não o documento em memória), com alertas de beneficiário sem comprovante, navegação para editar/corrigir envios e ação de conclusão.
- **Props:** `competencia: string`, `onAnexarDependente: (beneficiarioId) => void`, `onConcluir: () => void`, `onRefresh: () => void`, `refreshKey: number` (sem mudanças de assinatura nesta rodada — a navegação nova é 100% interna ao componente).
- **Comportamento:** ver seção 3.9 e **3.17** (nova seção "Envios desta competência", edição inline via `CamposExtraidosForm` + `updateComprovantePagamento`, roteamento `corrigirEnvio()` para `ServidorComprovanteDetail` quando o status exige substituição de arquivo). Estado interno: `confirmandoDispensa`, `expandidoId`, `edicaoAtual`, `detalheParaCorrigir` (novos os 3 últimos).
- **Usado em:** `servidor.pagamentos.enviar.tsx` (passo "resumo_competencia").

---

## 11. Estado Atual do Projeto

**Totalmente implementado e funcional** (testado manualmente no navegador, incluindo persistência pós-F5):
- Envio de comprovante individual e multi-beneficiário (fatura técnica), com leitura simulada em 3 etapas.
- Documento ilegível (retry) e documento incompleto (preencher manualmente ou reenviar tudo).
- Conferência unificada de campos com nível de confiança, divergência de valor e de pagador.
- Persistência do documento antes do Resumo da Competência (sem combinar memória + storage).
- Resumo consolidado por beneficiário, incluindo os sem comprovante e os dispensados.
- Conclusão de competência com invalidação automática ao chegar novo documento.
- Dispensa de beneficiário com remoção automática ao anexar depois.
- Alertas de "competência sem envio" e "competência incompleta" (2 tipos distintos) na tela `/servidor/pagamentos`.
- Badge de contagem no menu "Pagamentos" e no sino de notificações.
- Fila do Analista com aprovar / aprovar com ressalva / solicitar correção / recusar.
- Fluxo retroativo completo: 1ª alçada (Analista) → 2ª alçada (Gerência) → aprovado/devolvido/recusado.
- Substituição/correção pós-submissão pelo Servidor (`ServidorComprovanteDetail`), incluindo a partir do alerta de "competência incompleta".
- Histórico append-only de todas as ações (Servidor/Analista/Gerência) visível em ambos os lados.
- Notificações derivadas do estado persistido.
- **(Novo)** Envio com múltiplos arquivos complementares no mesmo envio, cada um com seus próprios tipos documentais marcados, com consolidação automática dos campos extraídos (e rastreabilidade de qual arquivo originou cada campo) — seção 3.17.
- **(Novo)** Resumo da Competência como painel de navegação: lista todos os envios da competência, permite editar campos inline (envios ainda não decididos) ou abrir o fluxo de substituição de arquivo já existente (envios ilegíveis/com correção solicitada), e pular direto de uma pendência para o ponto exato que precisa de correção — seção 3.17.
- **(Novo)** Restrição de tipos de documento por tipo de plano (empresarial x individual/familiar) no upload multi-arquivo — seção 3.17/6.
- **(Novo)** Bloqueio de aprovação (automática e com ressalva) quando o tipo de assistência é odontológico, com banner explicativo para Analista e Gerência — seção 3.18.
- **(Novo)** Documento complementar solicitado pela GERDAB: botão dedicado no Analista/Gerência, destaque + anexo direto no lado do Servidor, notificação e limpeza automática ao ser atendido — seção 3.18.

**Commitado no git** (branch `feature-modulo-pagamentos`, ver seção 13 para lista de commits): fluxo do Servidor (Etapa 1), fluxo do Analista + sino + detalhe (Etapa 2), 2ª alçada da Gerência (Etapa 3), alertas de competências sem comprovante, os 3 novos estados do fluxo de envio + campo Pagador + alerta de competência incompleta (commit `cd324da`), multi-arquivo/consolidação/navegação do Resumo (commit `f15a028`).

**Ainda não commitado no momento da escrita desta atualização** (verificar `git status` para confirmar o estado exato): toda a Etapa B descrita na seção 3.18 (elegibilidade por tipo de assistência + documento complementar solicitado pela GERDAB). Aguardando autorização explícita do usuário para commit, conforme processo já estabelecido.

---

## 12. Pendências

Itens **explicitamente identificados e ainda não implementados**, ou limitações técnicas conhecidas e aceitas:

1. **Campo `cpf` ausente em `gerarCamposExtraidos()`** — os comprovantes seed têm `cpf` em `camposExtraidos`, mas todo comprovante gerado pelo mock de OCR não inclui esse campo. Não bloqueante, mas inconsistente.
2. **`arquivoPorBeneficiario` não implementado** — decisão explícita de não criar esse campo; documentos complementares que chegam **em momentos diferentes** por beneficiário são sempre `Comprovante`s separados. **Atualização:** desde a rodada de multi-arquivo (seção 3.17), múltiplos arquivos anexados **juntos, no mesmo envio**, já são suportados via `Comprovante.arquivos[]` — o que continua não existindo é rastrear "este arquivo é só do beneficiário X" dentro de uma fatura técnica multi-beneficiário (todos os arquivos do envio se aplicam a todos os beneficiários selecionados).
3. **"Competência incompleta" só é calculada para `competenciaAtual`** — não foi estendida para competências retroativas fechadas. Se for necessário mostrar esse alerta também para competências retroativas parcialmente enviadas, `getBeneficiariosFaltantes()` precisa ser chamada para cada competência relevante (hoje só é chamada uma vez, hardcoded para `competenciaAtual`, em `servidor.pagamentos.index.tsx`).
4. **Deep-link para aba específica não implementado** — o card "Retroativos pendentes" no dashboard admin linka para `/admin/comprovantes` mas não abre automaticamente a aba "Retroativos". O mesmo vale para qualquer link que quisesse abrir `/admin/comprovantes` já em uma aba/registro específico.
5. **Validação de teto de R$ 4.000,00 não implementada** — o texto no Resumo da Competência é apenas informativo ("a validação do teto ocorre na etapa de cálculo do ressarcimento"), não há lógica de bloqueio ou cálculo real de reembolso no Módulo de Pagamento.
6. **`NotificationBell` não escuta mudanças em tempo real** — recalcula só no mount; se o storage mudar em outra aba/janela, não atualiza sozinho.
7. **Notificações não têm estado de "lida"** — são sempre recalculadas do zero, sem marcação de "já visto".
8. **Auto-confirmação em `ConferenciaBeneficiarios` raramente dispara** — como o campo `banco` sempre vem com confiança "nenhuma" no mock, a regra "todos os campos em alta confiança" quase nunca é satisfeita, então o Servidor quase sempre precisa clicar "Confirmar" manualmente, mesmo quando os dados relevantes (nome, valor, pagador) já estão corretos.
9. **Status legados `'processando'` e `'revisao'` ainda no union type** — não atribuídos por nenhum fluxo atual, candidatos a remoção segura (checar antes se algum dado de teste antigo em `localStorage` os usa).
10. **`justificativaDivergencia` no `Comprovante`** — campo existe no tipo mas não é mais escrito ativamente por nenhum fluxo atual (era usado antes da centralização em `aprovacoes[]`). Pode ser removido ou mantido como está.
11. **Nenhum teste automatizado** — toda a validação foi manual via navegador (Claude Browser tool). Não há testes unitários ou de integração para os fluxos documentados.
12. **`justificativaAtraso` não é reaproveitada ao criar documento complementar via "Anexar comprovante do dependente"** — `handleAnexarDependente()` sempre reseta esse campo para string vazia, exigindo nova justificativa a cada documento retroativo adicional, mesmo que o motivo seja o mesmo.
13. **Sem alternador de UI para `tipoPlanoPagamento`** — trocar entre "empresarial" e "individual_familiar" exige editar a constante em `mock-data.ts` manualmente; não há uma tela ou toggle no protótipo para isso.
14. **`LendoComprovante` não tem progresso por arquivo individual** — quando há múltiplos arquivos no mesmo envio, a checklist de 3 etapas trata o lote inteiro como uma unidade só; se um dos arquivos for ilegível, todos ficam "pausados" até a etapa de legibilidade apontar qual(is) falharam, sem indicar progresso incremental por arquivo.
15. **(Novo) Só 1 solicitação de documento complementar ativa por vez, por comprovante** — `solicitacaoComplementar` é um único objeto opcional, não um array/histórico. Se o Analista solicitar de novo antes do Servidor atender, o pedido anterior é sobrescrito (o botão já fica oculto enquanto há um pedido ativo, então isso só ocorreria por edição direta do storage). Decisão aceita por simplicidade — não há caso de uso identificado para múltiplos pedidos simultâneos no mesmo comprovante.
16. **(Novo) "Solicitar documento complementar" não valida se já existe pendência do mesmo tipo no beneficiário** — o botão desaparece por comprovante (`!cur.solicitacaoComplementar`), mas nada impede solicitar complementar em 2 comprovantes diferentes do mesmo beneficiário/competência ao mesmo tempo (cada um gera sua própria notificação).

---

## 13. Histórico das Decisões

Ordem cronológica aproximada (por etapa de desenvolvimento), com o **porquê** de cada decisão relevante:

1. **Reaproveitar layouts e componentes existentes, não criar módulo paralelo** — instrução explícita do usuário desde o início: o handoff de design é uma referência visual em HTML estático, não código de produção; a tarefa era recriar os fluxos dentro do app React existente (TanStack Router), reaproveitando `AdminLayout`, `ServidorLayout`, `Stepper`/`StepNav`, componentes `ui/*` do shadcn.
2. **Cenário de dados isolado (Carlos/Marina/Pedro) separado do cenário de Cadastro (João/Ana da Silva)** — decisão explícita para não misturar os dois módulos e não alterar dados usados por telas fora do escopo de Pagamento.
3. **Trabalhar em branch `feature-modulo-pagamentos`, nunca commitar sem autorização explícita** — regra de processo definida pelo usuário logo no início, seguida em todas as etapas subsequentes.
4. **Divisão em 3 etapas (Servidor → Analista → Gerência)** — decisão de sequenciamento para permitir validação incremental via `npm run build` e testes manuais no navegador antes de avançar.
5. **`getComprovantesUnificados()` com dedup por id, localStorage sempre vence** — necessário desde que o Analista/Gerência começaram a modificar status de comprovantes seed; sem isso, haveria duplicidade entre o registro original (seed) e a versão atualizada.
6. **Sino de notificações substitui o ícone de sair no header; botão "Sair" movido para "Meus Dados"** — pedido explícito do usuário ao notar a lacuna, alinhado ao handoff original de design.
7. **`retroativo_devolvido` como status próprio (não reaproveitar `retroativo_aguardando_analista`)** — decisão explícita para diferenciar visualmente "nunca passou pela 1ª alçada" de "já passou, foi devolvido pela Gerência" — evita confundir o Analista sobre o histórico do item.
8. **`retroativo_recusado` como status próprio (não reaproveitar `recusado`)** — mesma lógica: permite exibir competência original + justificativa do atraso + decisão do Analista + decisão da Gerência juntas, o que um `recusado` genérico não contextualizaria bem.
9. **Divergência de valor bloqueia aprovação direta, mas nunca altera o cadastro do beneficiário** — regra de negócio explícita: divergência é sempre um alerta auxiliar, nunca o "status principal", e a correção do cadastro (se necessária) está fora do escopo deste módulo.
10. **Modelo de envio "incremental" em vez de "lote"** — ao desenhar o Resumo da Competência, havia 2 opções: (a) cada documento é persistido assim que sua própria revisão termina (o Resumo vira uma tela de contexto pós-persistência), ou (b) nada é salvo até um "enviar tudo" final em lote. **Escolhida a opção (a)**, explicitamente, porque reaproveita 100% da mecânica já construída e testada, e porque a opção (b) arriscava perda de progresso se o servidor abandonasse o fluxo no meio.
11. **"Concluir envio da competência" nunca salva comprovantes de novo** — consequência direta da decisão 10: uma vez que tudo já é persistido incrementalmente, esse botão só pode ser um registro de conclusão, sob pena de reenviar/duplicar dados.
12. **Invalidação automática de conclusão ao chegar novo documento** — decisão explícita para impedir que uma competência marcada como "concluída" fique com essa marca inválida depois que seu conjunto de documentos mudou.
13. **Dispensa de beneficiário não esconde ele da visão consolidada** — correção explícita de uma primeira versão que "escondia demais"; o usuário deixou claro que a dispensa é uma decisão consciente e reversível, não uma exclusão, e o beneficiário deve continuar visível para transparência.
14. **Remoção automática da dispensa ao anexar comprovante depois** — decorre logicamente da decisão 13: se o beneficiário passou a ter documento, a marca de "dispensado" ficaria factualmente incorreta se não fosse removida.
15. **Pendências contam beneficiários únicos, não documentos** — correção explícita de uma primeira versão que poderia contar duplicado (ex: 1 documento ilegível de um beneficiário que também está "sem comprovante" para outro motivo).
16. **Passo de revisão simplificado ("revisao") removido, unificado com fatura técnica** — decisão explícita: "apenas conferir nome e valor não é correto" — o usuário quis que **todo** documento (1 ou N beneficiários) mostrasse nível de confiança de todos os campos e permitisse edição manual, eliminando a distinção artificial entre "documento simples" e "fatura técnica" na experiência de revisão.
17. **Campo "Pagador" adicionado com regra de que deve ser o titular** — requisito de negócio novo (regra real do auxílio-saúde: o pagamento deve ter sido feito pelo titular do plano, mesmo quando o comprovante é de um dependente); implementado com a mesma mecânica visual de divergência já usada para `valor`.
18. **Convenção de nome de arquivo para simular cenários de OCR** (`ilegivel`, `divergente`, `incompleto[_-]<nome>`, `pagador_divergente`) — escolhida para manter o protótipo 100% determinístico e testável sem precisar de OCR real ou de um painel de configuração de mock separado.
19. **"Reenviar comprovante" em fatura técnica substitui o documento inteiro, nunca só 1 beneficiário** — decisão explícita para não precisar modelar "arquivo por beneficiário"; a alternativa (documento complementar separado) já resolve o caso de uso de corrigir só 1 pessoa sem essa complexidade adicional.
20. **Multi-arquivo por envio com consolidação por primeiro-arquivo-preenche** — pedido explícito do usuário ("frequentemente arquivos podem vir acompanhados por outros... é importante consolidar tudo o que a IA conseguiu trazer"). Optou-se por uma regra de mesclagem simples (primeiro arquivo, na ordem de upload, que produzir valor não vazio para cada campo vence) em vez de qualquer lógica de "melhor confiança entre arquivos", para manter o comportamento previsível e fácil de testar deterministicamente.
21. **Tipos documentais atribuídos por arquivo, não ao envio inteiro** — o modelo antigo tinha 1 `tipoDocumento` por Comprovante; como agora um envio pode ter vários arquivos de tipos diferentes (e um mesmo arquivo pode ser de mais de 1 tipo), o campo migrou para `arquivos[].tipos[]`. Isso também é o que possibilita restringir os tipos oferecidos por `tipoPlanoPagamento` no nível certo (por arquivo, na hora do upload).
22. **Edição do Resumo da Competência feita inline, sem reabrir o wizard** — pedido explícito do usuário, no meio da implementação desta rodada: *"Evite criar uma arquitetura excessivamente complexa... prefira a solução mais simples que preserve a experiência do usuário."* A ideia original do plano (parâmetros de rota `editarComprovanteId`/`focusBeneficiarioId` reabrindo o wizard em "modo edição") foi descartada em favor de editar campos diretamente dentro de `ConsolidadoCompetencia` (reaproveitando `CamposExtraidosForm` + `updateComprovantePagamento`, ambos já existentes), sem nenhum estado de rota novo.
23. **Correção de documento ilegível/correção solicitada a partir do Resumo abre `ServidorComprovanteDetail`, não o formulário inline** — durante o teste manual desta rodada, descobriu-se que o formulário de edição inline (decisão 22) não faz sentido para esses dois status: "ilegível" não é uma decisão a reverter, é uma substituição de arquivo, que já tinha um fluxo dedicado e testado. A função `corrigirEnvio()` decide entre os dois caminhos com base no status do comprovante (`statusExigeSubstituicao`), evitando duplicar a lógica de substituição de arquivo em dois lugares.
24. **`ComprovanteUploadBox` (single-file) mantido, não removido** — em vez de generalizar esse componente para suportar multi-arquivo, foi criado um componente novo (`ArquivosAnexadosUpload`) para o wizard de envio. `ComprovanteUploadBox` continua existindo porque o fluxo pós-submissão de substituição (`ServidorComprovanteDetail`, decisão de manter single-file na seção 3.17) ainda precisa dele — decisão de menor complexidade do que fazer 1 componente suportar 2 modos de uso muito diferentes.
25. **Elegibilidade bloqueia via ausência do botão, não via modal** (Etapa B, seção 3.18) — diferente da divergência de valor (que usa `DivergenciaAprovacaoModal` para permitir uma exceção justificada), a elegibilidade por tipo de assistência **não tem caminho de exceção**: o Pró-Saúde categoricamente não cobre odontológico, então não faz sentido oferecer um modal de "aprovar mesmo assim com justificativa". Os botões de aprovação simplesmente não existem nesse caso — mais simples e correto do que copiar o padrão do modal de divergência para um caso que não admite exceção.
26. **"Solicitar documento complementar" não muda `status`** — decisão explícita para diferenciar de "Solicitar correção" (que assume que o documento atual está errado e o tira da fila ativa). Documento complementar é um pedido adicional que roda em paralelo ao fluxo normal de aprovação — o comprovante continua "em_analise" (ou equivalente) enquanto se aguarda o anexo extra.
27. **Limpeza automática da solicitação complementar reaproveita o padrão de dispensa/conclusão** — em vez de inventar um mecanismo novo, `limparSolicitacaoComplementar` segue exatamente o mesmo padrão já estabelecido por `removerDispensaBeneficiario`/`invalidarConclusaoCompetencia`: qualquer novo documento persistido dispara a limpeza de estados que "não fazem mais sentido" para aquele beneficiário/competência.

---

## 14. Próximos Passos Recomendados

Ordem sugerida, da menor para a maior complexidade/risco:

1. **Commitar o trabalho da Etapa B** (ver seção 11 — "Ainda não commitado") — elegibilidade por tipo de assistência + documento complementar solicitado (seção 3.18). Aguardando autorização explícita do usuário, conforme processo já estabelecido.
2. **Decidir e resolver as pendências 1, 9 e 10 da seção 12** (campo `cpf` ausente no mock de OCR; status legados `processando`/`revisao`; campo `justificativaDivergencia` não utilizado) — são limpezas de baixo risco que não mudam comportamento visível.
3. **Estender "competência incompleta" para competências retroativas** (pendência 3) — hoje só cobre `competenciaAtual`; se o negócio precisar do mesmo alerta para os meses fechados, generalizar `getBeneficiariosFaltantes` para aceitar uma lista de competências e agregar o resultado na UI.
4. **Resolver o deep-link de abas** (pendência 4) — adicionar um `search: { tab: string }` na rota `/admin/comprovantes` e fazer o card do dashboard linkar diretamente para a aba "Retroativos".
5. **Reavaliar a regra de auto-confirmação em `ConferenciaBeneficiarios`** (pendência 8) — hoje o campo `banco` sempre bloqueia a auto-confirmação por vir com confiança "nenhuma"; decidir se isso é intencional (documentar explicitamente) ou se a regra deveria considerar só um subconjunto de campos "críticos" (ex: nome, valor, pagador) para a auto-confirmação.
6. **Implementar validação de teto de R$ 4.000,00** (pendência 5) — hoje é só texto informativo; se o negócio precisar de bloqueio real, definir onde: no Resumo da Competência (soft warning) ou na aprovação do Analista/Gerência (hard block).
7. **Adicionar testes automatizados** (pendência 11) — pelo menos para as funções puras de `comprovante-status.ts` e `competencias-pendentes.ts`, que concentram a lógica de negócio mais sensível a regressão.
8. **Revisitar `arquivoPorBeneficiario`** (pendência 2) apenas se surgir um requisito real de rastrear múltiplos arquivos por beneficiário dentro do mesmo registro de fatura técnica — não antecipar essa complexidade sem necessidade concreta.
9. **Adicionar um alternador de UI para `tipoPlanoPagamento`** (pendência 13) se houver necessidade real de demonstrar o ramo empresarial em apresentações, sem depender de editar código.
10. **Escrever a história de usuário formal para qualquer nova etapa** (ex: "Fase 3 — Relatórios e integrações", já prevista em `regrasProSaude.fases` mas fora do escopo do Módulo de Pagamento) usando este documento como base de contexto.

---

*Fim do documento.*
