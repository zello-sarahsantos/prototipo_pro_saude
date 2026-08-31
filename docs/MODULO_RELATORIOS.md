# Documentação Técnica — Módulo de Relatórios, Planilha Padronizada e Requerimentos ASSETRAN

> **Branch de trabalho:** `feature-modulo-pagamentos` (mesma branch do Módulo de Pagamento —
> ainda não foi criada uma branch dedicada para este módulo).
> **Escopo:** este documento cobre o Módulo de Relatórios (novo) e os ajustes na área da
> Associação (planilha de envio mensal e requerimentos em nome do beneficiário) — assuntos
> tratados na reunião de levantamento de requisitos com a GERDAB (ata:
> `Ata_Reuniao_Levantamento_Requisitos_Modulo_Relatorios_Pro_Saude.pdf`). Segue o mesmo padrão
> de documentação separada por assunto já usado em `docs/MODULO_PAGAMENTO.md` e
> `docs/PORTAL_SERVIDOR_NAVEGACAO_E_CADASTRO.md`.
> **Plano de referência:** `/Users/User/.claude/plans/ol-como-fa-o-para-atomic-sun.md` — plano
> completo aprovado pelo usuário, com a Parte 1 (ajustes já aprovados pela stakeholder) e a
> Parte 2 (Módulo de Relatórios, etapas R1-R9, ainda não iniciadas).

---

## 1. Contexto

Reunião de levantamento de requisitos com a GERDAB cobriu três frentes: um Módulo de Relatórios
novo (ainda não construído), a padronização da planilha mensal enviada pelas
associações/operadoras (já em desenvolvimento nesta sessão), e o fluxo de requerimentos que a
ASSETRAN pode preencher em nome de um beneficiário. Dois mockups em PNG (telas "Gerenciamento
ASSETRAN" e "Upload de Planilha") foram desenhados e aprovados pela stakeholder, com ressalvas
que geraram os dois ajustes documentados na seção 2.

**Decisão explícita de escopo, registrada no plano aprovado:** os casos especiais de
ressarcimentos/retroativos **não entram nesta rodada** — a própria ata registra que esse fluxo
"exige tratamento próprio" e será detalhado em reunião específica futura. Ver seção 4 para a
lista completa de exclusões de escopo do Módulo de Relatórios.

---

## 2. Ajustes aprovados — Planilha modelo e Requerimentos ASSETRAN

### 2.1 Planilha modelo: CPF do titular (não matrícula), conferência macro+detalhe, bloqueio até 100% válido

**Arquivo:** `src/routes/associacao.upload.tsx`; planilha `docs/modelo_envio_mensal_associacoes.xlsx`
(gerada por um script Python com `openpyxl`, não versionado no repositório — reproduzível a
partir das especificações desta seção).

**Motivação:** a stakeholder aprovou o mockup anterior com 3 ressalvas — (1) o campo de
identificação do titular deve pedir **CPF**, não matrícula, porque **associações não têm acesso
à matrícula do DETRAN**; (2) a conferência deve mostrar o **macro** (quantos registros já estão
válidos) como visão primária, detalhando **linha a linha só os registros com pendência** — não
a lista inteira; (3) o envio para a GERDAB só deve ser liberado quando **100% dos registros**
estiverem válidos.

- **`RegistroPlanilha.matricula` foi renomeado para `cpfTitular`** — é a chave de conferência
  junto com o CPF do beneficiário (já existente). A matrícula deixou de aparecer em qualquer
  ponto da tela ou da planilha.
- **Conferência em 2 camadas:** o bloco macro (4 cards: Total, Válidos, Com Atenção, Não
  Elegíveis) é a visão primária, com uma linha de resumo textual — sem travessão, para não
  soar "gerado por IA" (`"3 de 7 registros válidos. Corrija 4 linhas antes de enviar."`, em vez
  de `"3 de 7 registros válidos — 4 precisam de correção antes do envio."`). A tabela detalhada
  só lista os registros com `status !== "válido"` — quando não há nenhuma pendência, um estado
  vazio ("Nenhuma pendência — todos os registros já estão válidos") substitui a tabela.
- **`ValidationStatus` tem só 3 valores — `"não_cadastrado"` foi condensado em
  `"não_elegível"` (ajuste pontual pós-teste):** na primeira versão, "não_cadastrado" (CPF do
  titular/beneficiário não bate com nenhum registro) era uma categoria separada de
  "não_elegível" (vínculo fora das regras do Pró-Saúde, tipo pai/mãe/irmão). O usuário apontou
  que essa distinção não se sustenta na prática: **se o vínculo não é previsto pelo Pró-Saúde,
  a pessoa nem estaria cadastrada** — as duas causas levam ao mesmo resultado (a pessoa não é
  elegível ao ressarcimento), então foram unificadas em uma única categoria `"não_elegível"`.
- **`"atenção"` passou a significar dado incompleto, não mais "processo SEI ausente"**: o
  usuário definiu o critério explicitamente — CPF, vínculo, valor ou nome ausente, para um
  registro que a princípio bateria com o cadastro. O exemplo de mock foi ajustado (Ricardo
  Mendes com `beneficiario: ""`, motivo "Nome do beneficiário não informado") para refletir
  esse critério, em vez do exemplo antigo (SEI ausente).
- **Bloqueio de envio:** `podeEnviar = registrosComPendencia === 0`; o botão "Enviar para
  análise da GERDAB" fica `disabled` (com texto explicando o motivo) enquanto houver qualquer
  registro não-válido. `valorConsiderado` soma só os registros `"válido"`.
- **Planilha `.xlsx`:** 3 abas (Instruções, Beneficiários Cadastrados — referência, Envio
  Mensal — a aba preenchida pela associação), com a coluna "Matrícula do Servidor" renomeada
  para "CPF do Servidor (Titular)" nas 3 abas, dropdowns de validação (Associação, Parentesco/
  Vínculo, Operadora do Plano) e 2 linhas de exemplo marcadas para apagar antes do envio.
- **Painel lateral "Modelo de Planilha"** (tela de upload): lista as 11 colunas reais da aba
  "Envio Mensal" (antes mostrava só 7 + "outras 12 colunas", considerado vago pelo usuário).

**Ressalva registrada, não resolvida nesta rodada:** a própria ata (seção "Pontos em aberto")
deixa claro que "algumas entidades possuem CPF, enquanto outras podem trabalhar melhor com
matrícula" — a troca para CPF foi validada especificamente para a ASSETRAN. Se outra
associação/operadora precisar de um identificador diferente no futuro, isso exige uma decisão
própria, não deve ser generalizado a partir desta implementação.

**Testado manualmente no navegador:** conferência com 7 registros (3 válidos, 1 atenção, 3 não
elegíveis) — cards corretos, resumo textual correto (sem travessão), tabela mostrando só os 4
registros com pendência, botão de envio `disabled` com a mensagem explicativa. `tsc --noEmit` e
`npm run build` limpos (sem novos erros além dos 3 já pré-existentes e não relacionados).

### 2.2 Requerimentos ASSETRAN — linha inteira clicável, requerimentos visíveis lado a lado (sem modal)

**Arquivos:** `src/routes/associacao.gerenciamento.index.tsx`, `src/routes/associacao.gerenciamento.$id.tsx`.
(`src/components/ModalRequerimentosAssetran.tsx` foi criado numa primeira versão e **removido**
no ajuste pontual descrito abaixo — ver "Histórico".)

**Motivação (versão original, ainda válida para a lista principal):** a stakeholder aprovou o
mockup anterior (4 cards de requerimento sempre visíveis no topo da lista principal) com uma
ressalva: os 3 requerimentos recorrentes (Mudança de Plano, Inclusão de Dependente, Exclusão)
não devem competir visualmente com "Nova Inclusão de Beneficiário" — que continua sendo a única
ação sempre fixa na tela principal.

**Ajuste pontual pós-teste, pedido pelo usuário após ver o resultado:** ter que clicar só para
*ver* as opções de requerimento dificultava o uso — o modal (que exigia um clique extra para
revelar os 3 tipos) foi **removido por completo**. O modelo final:

- **Tabela de Gerenciamento** (`/associacao/gerenciamento`):
  - Coluna "Matrícula" → **"CPF"** (usa `servidoresList[].cpf`, campo novo).
  - Nova primeira coluna, **"Processo SEI"** (`servidoresList[].processoSEI`, campo novo) — em
    destaque à esquerda, para facilitar a busca visual (mesmo raciocínio da ata, seção 3.6:
    "Número do processo SEI em posição de destaque").
  - Nova coluna **"Requerimento (GERDAB)"** — mostra o status do requerimento mais recente do
    beneficiário (`requerimentos.filter(r => r.matricula === s.matricula)`, já existente em
    `mock-data.ts`) via `StatusBadge`, ou "Nenhum" quando não há nenhum. Distinta da coluna
    "Status" já existente, que é o status cadastral (ativo/pendente/inativo/alerta).
  - **A linha inteira agora navega** para a ficha de detalhe ao ser clicada (`onClick` no
    `<tr>`, via `useNavigate()`), não só o nome ou o link "Ver/Editar" — o nome do beneficiário
    voltou a ser texto simples (não é mais um botão que abre modal). O link "Ver/Editar" chama
    `e.stopPropagation()` para não disparar a navegação da linha duas vezes.
- **Ficha de detalhe** (`/associacao/gerenciamento/$id`): o botão único "Novo Requerimento"
  (que abria o modal) foi substituído por **3 links lado a lado, sempre visíveis**, com o rótulo
  completo pedido pelo usuário: "Requerimento de Mudança de Plano", "Requerimento de Inclusão de
  Dependente", "Requerimento de Exclusão de Dependente / Plano" — mesmos 3 destinos de sempre
  (`/servidor/requerimento/novo-plano`, `/servidor/requerimento/incluir-dependente`,
  `/servidor/requerimento/exclusao`), sem nenhuma tela nova.

**Histórico — por que o modal existiu e foi removido:** a primeira implementação (aprovada pela
stakeholder no mockup) usava um modal disparado ao clicar no nome do beneficiário, com um botão
único "Novo Requerimento" na ficha. Depois de testar, o usuário decidiu que esse clique extra
"dificulta" a visualização — por isso o modal foi removido e as 3 opções passaram a ficar
sempre visíveis, tanto que a navegação da lista para a ficha também mudou (linha inteira
clicável, não mais o nome) para não haver ambiguidade entre "abrir o menu de requerimentos" e
"ver a ficha".

**Nota técnica — bug pré-existente encontrado e corrigido durante o teste do modal (permanece
corrigido mesmo após a remoção do modal):** `associacao.gerenciamento.tsx` existia como arquivo
de rota próprio para `/associacao/gerenciamento`, o que faz o TanStack Router tratá-lo como
**rota-pai** de `associacao.gerenciamento.$id.tsx` (convenção de arquivo por ponto). Como o
componente da rota pai não renderizava `<Outlet />`, a ficha de detalhe **nunca aparecia** ao
clicar em "Ver/Editar" — a URL mudava, mas o conteúdo continuava sendo o da lista. Esse bug não
tinha relação com os ajustes desta sessão; só foi descoberto porque o teste dependia da
navegação para a ficha funcionar. **Corrigido** renomeando o arquivo para
`associacao.gerenciamento.index.tsx` (rota `/associacao/gerenciamento/`, com barra final) —
mesmo padrão já usado em `admin.servidores.index.tsx` + `admin.servidores.$id.tsx` (sem nenhum
arquivo `admin.servidores.tsx` de layout), que evita a nidificação pai-filho por completo.

**Testado manualmente no navegador:** clique em qualquer célula da linha (não só no nome ou em
"Ver/Editar") navega para a ficha de detalhe; "Ver/Editar" continua funcionando isoladamente,
sem navegação duplicada; a ficha de detalhe mostra os 3 requerimentos lado a lado, sem
necessidade de nenhum clique adicional para vê-los. `tsc --noEmit` e `npm run build` limpos.

### 2.3 Ajustes pontuais de acabamento — visual do botão e simplificação dos campos da planilha

**Arquivos:** `src/routes/associacao.gerenciamento.$id.tsx`, `src/routes/associacao.upload.tsx`.

- **Visual dos 3 links de requerimento** (seção 2.2): o usuário enviou um print de referência
  (botão azul sólido, `rounded-full`, ícone + rótulo, sombra leve) porque o visual anterior
  (borda fina, fundo transparente, `rounded-md`) "não agradou". Trocado para
  `bg-primary text-primary-foreground rounded-full shadow-card hover:bg-primary-light`, em uma
  linha `flex flex-wrap` (os botões ocupam só a largura do próprio texto, não mais colunas de
  grid de largura igual).
- **Lista de campos esperados na planilha, drasticamente simplificada:** o painel lateral da
  tela de Upload listava as 11 colunas completas do modelo `.xlsx` (seção 2.1) — o usuário
  apontou que isso é excesso de detalhe para o que o protótipo precisa comunicar agora. A lista
  foi reduzida a 5 campos essenciais: **Nome do Beneficiário, Titular, CPFs (Titular e
  Beneficiário), Valor, Vínculo**. O texto de apoio e a caixa de aviso amarela (regra de "só
  quem já está cadastrado") não mudaram — só a lista de campos no painel escuro.
- **Nota registrada para o futuro (pedido explícito do usuário, "já anote"):** um modelo
  `.xlsx` oficial, mais detalhado, será construído futuramente para documentar esse padrão com
  precisão — e a conferência da planilha passará a validar os campos **automaticamente via
  OCR**, em vez da simulação manual de hoje (`dadosSimulados` fixo no componente). Um aviso
  nesse sentido foi adicionado diretamente na tela (painel "Modelo de Planilha"), e fica
  registrado aqui como próximo passo: **a validação por OCR e o modelo `.xlsx` definitivo não
  foram implementados nesta rodada** — o modelo já entregue
  (`docs/modelo_envio_mensal_associacoes.xlsx`, seção 2.1) continua servindo de rascunho/base,
  mas não deve ser tratado como a versão final até essa etapa futura acontecer.
- **Efeito colateral, mesma sessão:** duas outras ocorrências de travessão em texto visível ao
  usuário, na mesma tela de Upload, foram reescritas sem travessão (a mensagem de estado vazio
  "Nenhuma pendência" e a nova nota sobre OCR) — mesmo motivo já apontado pelo usuário na
  seção 2.1 (frase "muito característica de IA"). Ocorrências em comentários de código e em
  texto que já existia antes desta sessão (ex: cabeçalho do modal "Editar dados", em
  `associacao.gerenciamento.$id.tsx`) não foram tocadas — fora do escopo pedido.

**Testado manualmente no navegador:** botão de requerimento com o visual novo (preenchido,
arredondado, sombra) igual ao print enviado; painel "Modelo de Planilha" mostrando só os 5
campos + o aviso sobre o modelo `.xlsx` futuro e a validação por OCR. `tsc --noEmit` e
`npm run build` limpos.

---

### 2.4 Nova Inclusão via `FlowInclusao`, cabeçalho do Gerenciamento, sino de notificação e pendências por aba

**Arquivos:** `src/routes/primeiro-acesso.tsx`, `src/routes/associacao.nova-inclusao.tsx`,
`src/components/NotificationBell.tsx`, `src/lib/notificacoes-associacao.ts` (novo),
`src/routes/associacao.gerenciamento.index.tsx`, `src/routes/associacao.gerenciamento.$id.tsx`.

- **Modal "Nova Inclusão de Beneficiário" replicando o Requerimento de Primeira Inclusão:** a
  tela `/associacao/nova-inclusao` tinha um formulário próprio, simplificado, com campos
  diferentes do requerimento padrão de primeira inclusão. O usuário pediu que os campos fossem
  exatamente os mesmos, tratando de forma diferente só a Operadora/Administradora (que vira uma
  Associação fixa: "Assetran"). Em vez de duplicar o formulário, `FlowInclusao` — o componente
  de 5 passos (Titular → Plano → Dependentes → Docs → Final) já usado em `/primeiro-acesso`, e
  que já tinha um prop `isAssociacao` preparado mas nunca usado em nenhum outro lugar do
  código — foi estendido com um novo prop `associacaoFixa?: string`:
  - No passo **Plano**, quando `associacaoFixa` é informado, os campos Operadora (dropdown) e
    Administradora somem e são substituídos por um único campo somente leitura
    ("Associação: Assetran") — a associação já É o vínculo do beneficiário, não faz sentido
    perguntar. A validação do passo foi ajustada para não exigir Operadora/Administradora nesse
    caso.
  - No passo **Docs**, o rótulo do upload principal foi renomeado para **"Requerimento de
    Inclusão Assinado (Titular)"** (nome exato pedido pelo usuário — é o requerimento físico já
    assinado pelo beneficiário e digitalizado pela associação) e continua obrigatório. A
    mensagem de dispensa de comprovantes pessoais, que antes só aparecia para
    `operadora === "ASSEFAZ / OUTRO CONVÊNIO"`, foi generalizada para também aparecer quando
    `associacaoFixa` está definido — mesma lógica (a associação envia a comprovação
    coletivamente depois, o beneficiário não precisa anexar nada pessoalmente agora).
  - `associacao.nova-inclusao.tsx` foi reescrita como um wrapper fino:
    `<FlowInclusao isAssociacao associacaoFixa="Assetran" onCancel={...} onDone={...} />`, sem
    mais nenhum formulário próprio.
  - **Correção de segurança de dados encontrada durante a implementação:** `handleSubmit` de
    `FlowInclusao` chamava `saveTitularCadastro(...)` incondicionalmente. Isso nunca tinha sido
    um problema porque `FlowInclusao` só era usado em `/primeiro-acesso` (o próprio usuário
    logado se cadastrando). Ao reaproveitar o componente para a associação cadastrar **outra
    pessoa**, gravar sem essa proteção sobrescreveria o cadastro do usuário da associação
    logado com os dados do beneficiário sendo incluído — bug real que existiria a partir do
    momento em que o componente fosse reaproveitado. Corrigido com
    `if (!isAssociacao) saveTitularCadastro(...)`.
- **Botão "Nova Inclusão" reposicionado:** em `/associacao/gerenciamento`, o botão ficava do
  lado oposto do cabeçalho em relação ao título/subtítulo, dificultando a visualização. Movido
  para ficar logo abaixo do texto "Beneficiários vinculados à sua associação".
- **Sino de notificação:** `NotificationBell` (usado hoje só no Portal do Servidor, lendo
  `getNotificacoesPagamento()`) foi generalizado para aceitar um prop opcional `notificacoes` —
  quando informado, usa essa lista em vez de calcular a original (comportamento antigo
  preservado para quem não passa o prop). Criado `notificacoes-associacao.ts` com
  `getNotificacoesAssociacao(associacao)`, que deriva notificações a partir dos dados já
  existentes do módulo de Cadastro (`servidoresList`, `requerimentos`) — status de
  requerimentos e situações de cadastro "pendente"/"alerta" dos beneficiários vinculados àquela
  associação — sem inventar nenhum campo novo de mock. O sino aparece no canto superior direito
  do cabeçalho de `/associacao/gerenciamento`.
- **Indicativo de pendência nas abas "Dados", "Dependentes" e "Requerimentos"** (ficha do
  beneficiário, `/associacao/gerenciamento/$id`): um pequeno badge vermelho circular (componente
  `TabBadge`) aparece ao lado do nome de cada aba quando há algo pendente — calculado a partir
  dos mesmos dados mock já usados na tela (requerimentos com status "pendente"/"análise" para
  Dados/Requerimentos; dependentes com `.alerta` verdadeiro para Dependentes). Nenhum campo novo
  de mock foi criado — o indicativo é só uma leitura diferente do que já existia.
- **Inclusão de novo documento quando a GERDAB solicita:** a aba "Dados" passou a exibir um
  aviso ("GERDAB solicitou documentação complementar") quando há requerimento pendente, com um
  botão "Incluir documento" que expande e revela a mesma caixa de upload (`UploadBox`, já usada
  em outras telas de requerimento) mais os botões Cancelar/Enviar documento — simulado, sem
  persistência real (mesmo tratamento de outras ações mockadas do protótipo).

**Testado manualmente no navegador:** fluxo completo de `/associacao/nova-inclusao` do passo 1
ao envio, confirmando que o passo Plano mostra só "Associação: Assetran" (sem Operadora/
Administradora), o passo Docs mostra "Requerimento de Inclusão Assinado (Titular)" + a mensagem
de dispensa de comprovantes, e que o envio conclui com sucesso sem gravar em
`prosaude_titular_cadastro` (chave permaneceu `null` antes e depois do envio). Em
`/associacao/gerenciamento`: botão "Nova Inclusão" abaixo do subtítulo, sino mostrando contagem
2 e o dropdown com as mensagens corretas. Em `/associacao/gerenciamento/34567`: badges "1"
(Dados), "2" (Dependentes), "1" (Requerimentos) visíveis na barra de abas, e o botão "Incluir
documento" expandindo corretamente para a caixa de upload. `tsc --noEmit` (2 erros
pré-existentes, não relacionados — reduzido de 3 para 2 como efeito colateral da tipagem
explícita adicionada) e `npm run build` limpos.

---

## 3. Módulo de Relatórios — ainda não iniciado

Nenhuma etapa da Parte 2 do plano (R1 a R9) foi implementada nesta rodada. Ver o plano completo
em `/Users/User/.claude/plans/ol-como-fa-o-para-atomic-sun.md` para a lista de etapas, a base de
dados necessária (extensão de `servidoresList` com data de nascimento + dataset histórico só
para relatórios) e a ordem sugerida. Esta seção será preenchida progressivamente, etapa a etapa,
seguindo o mesmo processo já usado no Módulo de Pagamento (implementar → testar → documentar →
autorização explícita → commit).

## 4. Fora de escopo (decisão explícita, registrada desde já)

- **Ressarcimentos/retroativos com motor de cálculo** (causa, competência de origem, teto,
  diferença devida) — pedido explícito do usuário; a própria ata indica que esse fluxo precisa
  de uma reunião específica com exemplos reais antes de ser prototipado.
- Integração real com SEI (links diretos, blocos de assinatura, abertura de processo),
  integração com GOV.BR (assinatura) e integração com WhatsApp — todas citadas na ata como
  dependentes de definição institucional/técnica ainda não fechada.
- Dashboard via ferramenta de BI externa (Grafana etc.) — quando implementado, o painel
  operacional será nativo do protótipo.
- "Relatório por sexo" — a própria ata marca como baixa prioridade, fora do MVP.
- Relatórios do sistema legado marcados "Descontinuar" na ata (débito em folha, incoerências de
  migração, comparação/correção de dependentes do legado, valor médio por seguradora).
- Atualização cadastral periódica com bloqueio de ações — periodicidade e regras ainda "a
  definir" segundo a própria ata; entrará como uma etapa mais leve (confirmação simples, sem
  bloqueio automático completo) quando for a vez da Etapa R9.

## 5. Pendências

- **Tela do SISPRO** (sistema onde a GERDAB analisa relatórios hoje) — o usuário vai enviar como
  referência visual adicional; pode influenciar o layout do dashboard operacional (Etapa R1) e
  do relatório geral (Etapa R2).
- Identificador de conferência (CPF vs. matrícula) resolvido só para a ASSETRAN nesta rodada —
  ver ressalva na seção 2.1.
- Definição de "inadimplente" no vocabulário do protótipo (necessária para a Etapa R7).
- Periodicidade da confirmação cadastral (necessária para a Etapa R9).
- **Modelo `.xlsx` definitivo da planilha de associações + validação automática por OCR na
  conferência** (seção 2.3) — planejado para uma rodada futura; até lá, a lista de campos
  exibida na tela (5 campos essenciais) é só uma simplificação da comunicação ao usuário, e a
  validação da conferência continua sendo simulada (`dadosSimulados` fixo), não real.
