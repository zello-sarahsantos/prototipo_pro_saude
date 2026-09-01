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

### 2.5 Lado GERDAB — Histórico (linha do tempo) e Observações na ficha do servidor

**Arquivos:** `src/routes/admin.servidores.$id.tsx`, `src/routes/admin.servidores.index.tsx`,
`src/lib/prosaude-storage.ts`.

- **Contexto:** o usuário pediu, antes de avançar para a Parte 2, uma forma do Analista/Gerência
  GERDAB visualizar tudo o que mudou num servidor (o quê, quem, quando) e registrar anotações
  próprias — direcionadas ao servidor ou à associação — diretamente da própria tela, além de uma
  tela inicial mais visual, inspirada no padrão de conferência do SISPRO (print de referência
  enviado pelo usuário). Antes de tocar em código, foi publicado um mockup em HTML (aprovado
  pelo usuário) reproduzindo campo a campo os arquivos reais listados acima.
- **Aba "Histórico" — de tabela estática para linha do tempo derivada:** `admin.servidores.$id.tsx`
  já tinha uma aba "Histórico" (`TabHistorico`), mas era uma tabela com só 2 linhas fixas de
  mock, sem nenhuma relação com o resto dos dados do servidor. Virou uma timeline visual
  (pontos conectados, mais legível que tabela) que reúne, sem persistir nenhum campo novo:
  as mesmas 2 transições de status de exemplo + os requerimentos do servidor (`requerimentos`,
  filtrado por matrícula) + as pendências documentais dos dependentes (`dependentes[].alerta`) —
  mesmo padrão de "recalcular na hora, nunca persistir como campo novo" já usado em
  `getNotificacoesAssociacao` e nos badges de pendência da Área da Associação. Um aviso fixo no
  rodapé deixa explícito que **Histórico é só leitura** — diferente de Observações, nenhum
  evento pode ser editado ou apagado, porque é gerado automaticamente pelas próprias ações do
  sistema.
- **Aba "Observações" (nova):** anotação livre do analista/gerência, direcionada **ao servidor**
  ou **à associação** (esta segunda opção só aparece quando o servidor tem associação vinculada
  — `servidorAtual.associacao !== "—"`). Cada item mostra data, autor (nome + cargo, derivados
  de `getAdminRole()` — "Rebeca — Analista GERDAB" ou "Erandir — Gerência GERDAB", mesmos nomes
  já usados no rodapé do `AdminLayout`), o destino em uma tag colorida, e pode ser excluído a
  qualquer momento (ação manual — por isso vive numa aba separada do Histórico, que é imutável).
  Persistido em `localStorage` via 3 novas funções em `prosaude-storage.ts`
  (`loadObservacoesGerdab`/`addObservacaoGerdab`/`removeObservacaoGerdab`, tipo
  `ObservacaoGerdab`), seguindo exatamente o mesmo padrão já usado ali (chave registrada em
  `PROSAUDE_STORAGE_KEYS`, `JSON.parse` protegido por try/catch).
- **Contadores nas abas:** "Histórico" e "Observações" ganharam um badge numérico ao lado do
  nome (`TabCount`) — Histórico mostra o total de eventos da timeline; Observações mostra a
  quantidade de anotações daquele servidor (some quando é zero), mesmo espírito do indicativo de
  pendência já pedido para a Área da Associação, adaptado ao estilo de aba sublinhada (não
  chip/pílula) que este arquivo já usava.
- **`/admin/servidores` — filtros em chip:** os mesmos 3 filtros funcionais de sempre (Status,
  Associação, Plano) e a busca por nome/matrícula passaram de retângulo (`rounded-md`) para
  pílula (`rounded-full`), inspirados no padrão de chip do SISPRO — nenhuma lógica de filtro
  mudou. Foi adicionado 1 chip novo, "Só com pendência", que filtra direto para
  status `pendente`/`alerta` combinado com os demais filtros já ativos. A tabela em si (9
  colunas) não foi alterada — converter a lista inteira para cards expansíveis, como no mockup,
  ficou de fora desta rodada por ser uma mudança maior, sem necessidade demonstrada ainda.

**Testado manualmente no navegador:** em `/admin/servidores`, o chip "Só com pendência" filtra
corretamente para os 2 servidores com status pendente/alerta ("Exibindo 2 de 2 cadastrados"). Em
`/admin/servidores/12345678`: aba "Histórico" mostra "5" no badge e a timeline com as 5 entradas
esperadas (2 transições + 1 requerimento + 2 pendências de dependente); aba "Observações" — ciclo
completo testado: criar uma observação "Para o servidor" (badge passa a mostrar "1", autor
"Rebeca (Analista GERDAB)" e data de hoje aparecem corretos, valor confirmado também via
`localStorage.getItem('prosaude_observacoes_gerdab')`) e depois excluí-la (badge some, lista volta
ao estado vazio, chave removida do localStorage ao final do teste). `tsc --noEmit` (2 erros
pré-existentes, não relacionados, sem mudança) e `npm run build` limpos.

### 2.6 Ajustes pontuais sobre a 2.5 — Histórico mais simples, engrenagem "Ação", linha clicável e solicitação de documento

**Arquivos:** `src/routes/admin.servidores.$id.tsx`, `src/routes/admin.servidores.index.tsx`,
`src/lib/prosaude-storage.ts`.

- **Histórico visualmente mais simples:** a primeira versão (2.5) tinha, para cada mudança de
  status, um chip separado com "de" riscado em vermelho + seta + "para" em verde — o usuário
  achou confuso e enviou um print de outro sistema como referência (marcador circular vazado,
  linha pontilhada, "Realizado por **Nome**" na mesma linha da data, descrição em texto corrido
  logo abaixo, sem chip). A timeline foi refeita nesse padrão: a mudança de status agora vem
  **embutida na própria frase** (ex.: `Alterou o status do cadastro de "Aguardando Validação"
  para "Ativo".`), sem nenhum elemento vermelho/seta separado. `EventoHistorico` perdeu os
  campos `de`/`para`/`cargo` (o cargo do responsável deixou de aparecer, seguindo a referência,
  que só mostra o nome).
- **Engrenagem "Ação" na listagem:** o usuário gostou do botão com ícone de engrenagem + "Ação"
  do mockup do SISPRO (feito antes de qualquer código) e pediu para incorporar de verdade.
  Adicionado em `/admin/servidores`, ao lado de "Carga Inicial" (que passou a ser um botão
  secundário, com borda, para o botão de destaque ficar só no "Ação"): um menu suspenso
  (`AcaoMenu`) com 2 itens simulados — "Exportar lista (.xlsx)" e "Notificar pendentes" — mock,
  sem efeito real, mesmo tratamento de outras ações simuladas do protótipo. Fecha ao clicar fora,
  mesmo padrão já usado no `NotificationBell`.
- **Linha da tabela inteira clicável:** clicar em qualquer célula de uma linha em
  `/admin/servidores` agora navega para a ficha do servidor (`/admin/servidores/$id`), não só o
  link "Ver" (que continua existindo, com `stopPropagation` para não disparar navegação
  duplicada) — mesmo padrão já usado em `associacao.gerenciamento.index.tsx`.
- **Solicitação de documento dentro de Observações:** a aba ganhou um segundo "tipo" de registro,
  ao lado da observação em texto livre. Ao abrir "Nova observação", um seletor de tipo aparece
  primeiro (**Observação** vs. **Solicitar documento**); ao escolher "Solicitar documento", um
  campo obrigatório "Documento solicitado" aparece (ex.: "Declaração de Imposto de Renda do
  dependente"), com o texto livre virando um detalhe opcional (motivo/prazo). Continua podendo
  ser direcionado ao servidor ou à associação, igual à observação comum. Na listagem, uma
  solicitação de documento é visualmente distinta (ícone de alerta, cor de destaque) da
  observação em texto simples, para o analista/gerência identificar rapidamente o que é um
  pedido em aberto. Modelo de dados: `ObservacaoGerdab` ganhou `tipo: "observacao" |
  "solicitacao_documento"` e `documento?: string` em `prosaude-storage.ts`.

**Testado manualmente no navegador:** timeline do Histórico conferida visualmente — sem chip
vermelho/seta, marcador vazado + linha pontilhada, "Realizado por Nome" na mesma linha da data.
Botão "Ação" abrindo o menu com os 2 itens mock e fechando ao clicar fora. Clique em uma linha
da tabela (Carlos Pereira) navegando corretamente para `/admin/servidores/34567`. Ciclo completo
de "Solicitar documento": selecionado o tipo, preenchido "Comprovante de matrícula escolar",
salvo — item aparece destacado em âmbar com ícone de alerta ("Documento solicitado: Comprovante
de matrícula escolar"), badge da aba atualiza para "1"; observação removida ao final do teste
(chave do localStorage limpa). `tsc --noEmit` (2 erros pré-existentes, sem mudança) e
`npm run build` limpos.

### 2.7 Fechando o ciclo — onde o servidor/associação envia o documento pedido

**Arquivos:** `src/components/SolicitacaoDocumentoBanner.tsx` (novo), `src/routes/servidor.inicio.tsx`,
`src/routes/associacao.gerenciamento.$id.tsx`, `src/lib/prosaude-storage.ts`.

- **Contexto:** depois de criar a "Solicitação de documento" (2.6), faltava o outro lado — onde
  quem recebeu o pedido (servidor ou associação, conforme o `destino` escolhido pela GERDAB)
  consegue efetivamente enviar o documento. O campo `destino` já modelado decide isso sozinho:
  não é uma escolha nova, é usar o que já existia.
  - `destino: "servidor"` → aparece no **Portal do Servidor** (`/servidor/inicio`), como um
    banner logo abaixo da saudação, antes do card "Meu cadastro" — o servidor que não tem
    associação cuidando da comprovação por ele (`servidorAtual.associacao === "—"`) resolve
    diretamente ali.
  - `destino: "associacao"` → aparece na **Área da Associação**
    (`associacao.gerenciamento.$id.tsx`), na aba "Dados" da ficha do beneficiário — trocando o
    mock fixo que existia ali (2.4) por uma leitura de verdade das solicitações reais.
- **Componente único reaproveitado nos dois lados:** `SolicitacaoDocumentoBanner` (novo, em
  `src/components/`) — mesmo aviso "GERDAB solicitou documentação complementar" + `UploadBox` +
  botões Cancelar/Enviar documento, extraído para não duplicar a lógica entre os dois contextos.
- **Fechamento do ciclo:** `prosaude-storage.ts` ganhou `atendidaEm?: string` em
  `ObservacaoGerdab`, a função `marcarObservacaoAtendida(id)` (chamada ao clicar "Enviar
  documento" — mock, não guarda o arquivo em si, mas marca o pedido como resolvido) e
  `getSolicitacoesDocumentoPendentes(matricula, destino)` (helper único usado pelos dois lados
  para filtrar só as solicitações **não atendidas**). Assim que atendida, o banner some da tela
  de quem recebeu o pedido, e a aba "Observações" do lado GERDAB passa a mostrar o item em verde
  com "✓ Atendida em DD/MM/AAAA", sem removê-lo do histórico.

**Testado manualmente no navegador:** criada uma solicitação "Para o servidor" em
`/admin/servidores/12345678` → banner apareceu em `/servidor/inicio`, logo abaixo da saudação →
"Enviar documento" → banner sumiu → voltando à ficha GERDAB, a mesma observação aparece em verde
com "✓ Atendida em 31/08/2026". Testado também o caminho "Para a associação" (semeado via
`localStorage`, já que o servidor de exemplo usado na ficha GERDAB é fixo e não tem associação
vinculada — mesma simplificação de dado único já registrada em seções anteriores): banner
apareceu em `/associacao/gerenciamento/34567`, badge da aba "Dados" foi de 1 para 2, e ao enviar
o documento o banner sumiu e o badge voltou a 1. `tsc --noEmit` (2 erros pré-existentes, sem
mudança) e `npm run build` limpos.

### 2.8 Pendência documental unificada — regras de prazo/consequência do sistema + solicitação manual do analista

**Arquivos:** `src/lib/pendencias-documentais.ts` (novo), `src/lib/mock-data.ts`,
`src/components/SolicitacaoDocumentoBanner.tsx`, `src/routes/servidor.inicio.tsx`,
`src/routes/servidor.dependentes.tsx`, `src/routes/associacao.gerenciamento.$id.tsx`.

- **Contexto:** depois de fechar o ciclo da solicitação manual (2.7), o usuário observou que
  pendência documental nem sempre vem de uma ação do analista — boa parte é **gerada pelo
  próprio sistema** (ex.: comprovante de matrícula, IRPF de dependente), com **prazo** e
  **consequência** conhecidos de antemão, diferente do pedido manual (que não tem prazo
  mapeado e só fica em aberto até ser atendido). O usuário definiu as 3 decisões de modelo:
  1. Unificar os dois em um único conceito de pendência (`origem: "sistema" | "analista"`);
  2. Consequência é uma **regra fixa por tipo de documento**, não escolhida pelo analista;
  3. Prazo: se o tipo já tem regra de sistema mapeada, a data **não pode ser alterada
     manualmente**; se for um pedido do analista sem regra conhecida, **não há prazo** — a
     pendência só fica em aberto até ser resolvida (comportamento já implementado na 2.6/2.7,
     mantido sem mudança). A regra de prazo dos **comprovantes de despesa** do Módulo de
     Pagamento (`competencias-pendentes.ts`) é um conceito totalmente separado e não foi tocada.
- **`pendencias-documentais.ts` (novo):** define `TipoPendenciaDocumento` com as 4 regras
  mapeadas pelo usuário (tabela "Validade Documental, Prazos e Trava de Inativação Automática")
  + `"outro"` para pedidos manuais sem regra:
  - `comprovante_matricula` — janela por semestre (1º: 1/jan até o 2º dia útil de março; 2º:
    1/jul até o 2º dia útil de agosto), consequência `bloqueio_temporario_beneficio`.
  - `declaracao_irpf_enteado` — anual, até 31 de maio, mesma consequência.
  - `laudo_invalidez` — a cada 24 meses a partir do último laudo aceito; **mapeada, mas não
    demonstrada com dado mock** (nenhum dependente do protótipo tem `ultimoLaudoEm` cadastrado
    ainda) — `calcularPrazo` retorna `null` nesse caso, documentado como pendente de dado real.
  - `limite_idade` — gatilho é a idade (24 anos), não uma data de envio; consequência
    `inativacao_definitiva`. Mapeada na regra, mas a inativação automática de fato (mudar
    `status` do dependente sozinha) **não foi implementada** — fora de escopo desta rodada,
    fica só como regra documentada para quando fizer sentido automatizar.
  - `getPendenciasDocumentaisDoServidor(matricula, destino)` — função única que combina as duas
    fontes (pendências de sistema derivadas de `dependentes[].pendenciaTipo` + solicitações
    manuais de `ObservacaoGerdab`), sempre recalculada na hora, nunca persistida como campo
    novo. O **destino** de uma pendência de sistema segue a mesma regra já usada na solicitação
    manual: se o servidor tem associação, é ela quem resolve; senão, o próprio servidor.
  - `marcarPendenciaDocumentalAtendida` — atende pendência de qualquer origem: para "analista"
    reaproveita `marcarObservacaoAtendida` (já existia); para "sistema", usa um novo override em
    `localStorage` (`prosaude_pendencias_sistema_atendidas`, mesmo padrão de
    `valoresCadastradosBeneficiarios` — override sobre mock estático).
- **`mock-data.ts`:** `Dependente` ganhou `pendenciaTipo?: TipoPendenciaDocumento`. Os dois
  dependentes que já tinham `alerta` (Lucas Souza, Marcos Lima) ganharam
  `pendenciaTipo: "comprovante_matricula"` e `"declaracao_irpf_enteado"` respectivamente — o
  texto de `alerta` continua existindo, agora como detalhe complementar da pendência
  estruturada, não mais a única fonte de informação.
- **`SolicitacaoDocumentoBanner` (reescrito):** passa a receber `pendencia: PendenciaDocumental`
  em vez de `ObservacaoGerdab` — mostra o prazo (ou "Sem prazo definido"), destaca em vermelho
  quando **vencido**, e exibe o texto da consequência daquele tipo. Continua reaproveitado nos
  3 lugares: `/servidor/inicio`, `/servidor/dependentes` e a ficha do beneficiário na Área da
  Associação.
- **`servidor.dependentes.tsx`:** o botão "Enviar Comprovante" por dependente **já existia na
  tela, mas nunca tinha ação nenhuma** (nem `onClick`) — foi conectado para abrir o mesmo banner
  de pendência, agora com o prazo/consequência daquele dependente específico.

**Testado manualmente no navegador (com a data real da máquina, 31/08/2026):** as duas
pendências de exemplo já nasceram **vencidas** — a janela do 2º semestre do comprovante de
matrícula fechou em 04/08/2026 e o prazo do IRPF fechou em 31/05/2026 — então ambas apareceram
destacadas em vermelho (não em âmbar) tanto em `/servidor/inicio` quanto em
`/servidor/dependentes`, com a consequência de bloqueio temporário do benefício explicada.
Resolvida a pendência de Lucas Souza em ambas as telas (banner some, override gravado em
`prosaude_pendencias_sistema_atendidas`, confirmado e depois limpo do `localStorage`).
`tsc --noEmit` (2 erros pré-existentes, sem mudança) e `npm run build` limpos.

### 2.9 Tabela de Servidores — novas colunas, status Suspenso e situação financeira

**Arquivos:** `src/routes/admin.servidores.index.tsx`, `src/lib/mock-data.ts`,
`src/components/StatusBadge.tsx`, `src/styles.css`.

- **Contexto:** evolução pontual da tabela em `/admin/servidores` (não uma tela nova) — troca
  de colunas, novos campos e dois novos indicadores de status, preservando filtros, ações,
  paginação mock e o clique na linha inteira (já existente) para abrir a ficha.
- **Colunas, na ordem pedida:** Nº Processo SEI, Nome, CPF, Operadora, Associação, Dep., Valor
  Plano, Auxílio Previsto, Status, Último Reajuste, Telefone, E-mail, Ações. **Matrícula saiu da
  tabela visível** (não estava na lista de colunas pedida) — continua existindo nos dados e é
  usada internamente como chave de linha, parâmetro de navegação para a ficha e na busca, só não
  aparece mais como coluna. **"Plano" virou "Operadora"** — é o mesmo campo (`plano`, que já
  guardava nomes de operadora: Bradesco, SulAmérica, Amil, CASSI), só renomeado no cabeçalho e no
  filtro, sem duplicar dado.
- **Nº Processo SEI:** número + botão de copiar (ícone, com feedback visual — vira um check
  verde por 1,5s após copiar) via `navigator.clipboard.writeText`. O clique no botão usa
  `stopPropagation` para não disparar a navegação da linha (mesmo tratamento já usado no link
  "Ver").
- **CPF e Telefone:** exibidos já formatados a partir do mock (`123.456.789-00`,
  `(61) 98765-4321`) — os dados de exemplo já nascem mascarados, mesmo padrão de
  `servidorAtual` usado no resto do protótipo; não foi necessário aplicar máscara em tempo de
  render.
- **E-mail:** truncado visualmente (`truncate` + `max-width`), com o endereço completo
  disponível via `title` nativo do HTML (tooltip ao passar o mouse) — sem componente de tooltip
  novo, suficiente para o caso.
- **Status "Suspenso" (novo):** adicionado a `StatusKey` em `mock-data.ts`, com token de cor
  próprio (`--status-suspenso-bg`/`-fg`, tom violeta) em `styles.css`, e mapeado em
  `StatusBadge.tsx` — mesmo padrão visual dos demais badges, mas com cor que não colide com
  nenhum status existente (verde=aprovado/ativo, âmbar=pendente/alerta, vermelho=rejeitado,
  cinza=inativo, laranja=análise).
- **Situação financeira (Adimplente/Inadimplente) — modelagem avaliada antes de implementar,
  conforme pedido:** não virou um valor de `StatusKey`. É um campo próprio,
  `SituacaoFinanceira` (`"adimplente" | "inadimplente"`), independente do status cadastral — um
  servidor pode estar `ativo` (cadastral) e `inadimplente` (financeiro) ao mesmo tempo, exemplo
  citado explicitamente no pedido. Exibido como um segundo selo, menor e discreto
  (`SituacaoFinanceiraBadge`), empilhado abaixo do `StatusBadge` **dentro da mesma célula de
  Status** — nenhuma coluna nova foi criada. Omitido quando não se aplica (ex: cadastro ainda
  "Pendente de Validação").
- **Filtros:** busca por nome, CPF ou nº do processo SEI (busca por matrícula continua
  funcionando, só não é mais o texto do placeholder); filtro por Status (agora incluindo
  "Suspensos"); novo filtro por Situação financeira (Todas/Adimplente/Inadimplente); filtro por
  Associação (mantido); filtro por Operadora (mesmo filtro de antes, renomeado). Como Status
  cadastral e Situação financeira são campos independentes, as combinações pedidas ("Ativo +
  Adimplente", "Ativo + Inadimplente" etc.) já funcionam naturalmente selecionando os dois
  filtros ao mesmo tempo — não foi necessário um seletor de combinações dedicado.
- **Layout:** tabela com `min-w-[1500px]` dentro do container `overflow-x-auto` já existente,
  para não comprimir colunas nem reduzir fonte — a rolagem horizontal aparece quando a tela é
  mais estreita que isso. **Nome fica fixo (`sticky left-0`) e Ações fica fixo à direita
  (`sticky right-0`)** durante a rolagem, com uma borda sutil marcando a transição e o fundo
  acompanhando o hover da linha (`group-hover`), para não parecerem "grudados" sem contexto.
- **Dado de exemplo:** um novo servidor fictício (Eduardo Nascimento) foi acrescentado só para
  demonstrar o status "Suspenso" (combinado com "Inadimplente"); os demais já existentes
  ganharam CPF/telefone/e-mail/reajuste coerentes e alguns receberam situação financeira
  (adimplente ou inadimplente) para demonstrar a coexistência com o status cadastral.

**Testado manualmente no navegador (1400×900, para ver a tabela sem rolagem forçada):** todas as
13 colunas conferidas na ordem pedida; botão de copiar do processo SEI clicado (não navega para
a ficha, confirmado via URL inalterada); rolagem horizontal testada via `scrollLeft` — Nome e
Ações permanecem visíveis e fixos enquanto CPF/Operadora/Associação passam por baixo; badge de
Situação Financeira visível abaixo do StatusBadge para os servidores com o dado preenchido,
incluindo "Suspenso + Inadimplente" (Eduardo Nascimento); filtro combinado "Ativos" +
"Inadimplente" retornou exatamente 1 resultado (Maria Oliveira), confirmando que os dois campos
filtram de forma independente e combinável. `tsc --noEmit` (2 erros pré-existentes, sem mudança)
e `npm run build` limpos.

### 2.10 Simplificação da tabela de Servidores + nova aba "Documentação" na ficha

O usuário pediu para separar em dois pedidos bem distintos, a partir do feedback sobre a 2.9: a
tabela de servidores ficou "excessivamente carregada" depois de tantas colunas novas, e faltava
um lugar para consultar os documentos do titular e de cada dependente sem misturá-los.

**Arquivos:** `src/routes/admin.servidores.index.tsx`, `src/routes/admin.servidores.$id.tsx`,
`src/lib/mock-data.ts`, `src/routes/associacao.gerenciamento.index.tsx`.

#### Tabela de Servidores — simplificada de 13 para 8 colunas

- **Colunas finais:** Nº Processo SEI, Servidor, Operadora / Associação, Dep., Valor Plano,
  Auxílio Previsto, Situação, Ações. CPF, Telefone, E-mail e Último Reajuste **saíram da tabela**
  (continuam nos dados e na ficha detalhada) — a busca continua funcionando por nome, CPF e
  processo SEI mesmo sem essas colunas visíveis, sem nenhuma mudança na lógica de filtro.
- **Operadora e Associação consolidadas em uma única célula** (`OperadoraAssociacaoCell`), sem
  assumir uma relação que não existe no cadastro: quando as duas informações existem, a
  associação vem em destaque e a operadora como complemento (ex: Maria Oliveira — "Assefaz" +
  "SulAmérica"); quando só uma existe, mostra só essa (Carlos Pereira, ASSETRAN, aparece só
  "Assetran" — nenhuma operadora foi inventada). O campo `plano` de `ServidorListItem` virou
  `operadora?: string` (opcional), refletindo que nem todo cadastro tem essa informação —
  ajustado também em `associacao.gerenciamento.index.tsx` (único outro consumidor do campo, com
  fallback `"—"` quando ausente).
- **Situação** mais compacta: o selo de situação financeira deixou de ser uma segunda pílula
  (como na 2.9) e virou um texto simples colorido abaixo do `StatusBadge` — mesma informação,
  menos "badge" ocupando espaço.
- **Sem rolagem horizontal forçada:** removidos o `min-w` artificial e as colunas fixas
  (sticky) da 2.9, que não fazem mais sentido com só 8 colunas — a tabela cabe inteira em
  telas ≥ 1440px aproximadamente; em telas mais estreitas, o `overflow-x-auto` já existente
  continua servindo de rede de segurança.
- **Dado de exemplo ajustado:** Carlos Pereira (ASSETRAN) ficou sem operadora vinculada; Roberto
  Santos (ASSETRAN) manteve a operadora (CASSI), para demonstrar que a relação pode existir às
  vezes, não é regra fixa da associação.

#### Nova aba "Documentação" na ficha do servidor

- Adicionada entre "Requerimentos" e "Cálculo do Reembolso" na tira de abas de
  `admin.servidores.$id.tsx`.
- **Separação clara por beneficiário:** um bloco expansível (`BlocoDocumentosBeneficiario`) por
  pessoa — um para o Titular (aberto por padrão) e um para cada Dependente (fechado por padrão,
  mostrando nome, parentesco e a contagem de documentos no cabeçalho) — nunca uma lista única
  misturando documentos de pessoas diferentes do grupo familiar.
- **Cada documento** (`DocumentoRow`) mostra nome/tipo, data de envio e competência (quando
  aplicável), com as ações "Visualizar" (só quando o formato permite — reaproveita o componente
  `DocPreview` já existente, usado também na fila de requerimentos, dentro de um modal) e
  "Baixar" (mock — sem arquivo real por trás, dá um retorno visual rápido de "Baixado", mesmo
  espírito do botão de copiar da listagem de servidores).
- **Estado vazio:** quando um beneficiário não tem nenhum documento, mostra "Nenhum documento
  disponível para este beneficiário." em vez de uma lista em branco.
- **Novo modelo de dados** em `mock-data.ts`: `DocumentoBeneficiario` +
  `documentosServidor: DocumentoBeneficiario[]`, com `beneficiarioId: "titular" | <id do
  dependente>`. Dados de exemplo cobrem os cenários pedidos: titular com múltiplos documentos
  (incluindo um não visualizável, só "Baixar" — `.docx`), dependentes com documentos diferentes
  entre si, e um dependente (Marcos Lima) propositalmente sem nenhum documento.
- Nenhuma ação de exclusão ou alteração foi criada nessa aba — só consulta (visualizar/baixar),
  como pedido.

**Testado manualmente no navegador:** tabela de servidores conferida em 1600px (sem rolagem
horizontal) e 1300px (com rolagem, aceitável em tela mais estreita); célula
Operadora/Associação conferida nos 3 casos (só operadora, só associação, ambas); aba
"Documentação" navegada — bloco do Titular aberto por padrão com 4 documentos, "Termo de
Responsabilidade" mostrando só "Baixar" (sem "Visualizar"); "Visualizar" no RG abrindo o modal
com `DocPreview` corretamente; expandido o bloco de Marcos Lima confirmando a mensagem de estado
vazio. `tsc --noEmit` (2 erros pré-existentes, sem mudança) e `npm run build` limpos.

### 2.11 Integração Documentação ↔ Histórico — rastreabilidade de solicitações de documento

O usuário pediu para a aba "Documentação" mostrar não só os documentos já recebidos, mas também
os **pendentes** e o estado de suas solicitações — com uma distinção conceitual explícita entre
"pendência identificada" (o fato de faltar um documento, que pode ser detectado pelo sistema) e
"documento solicitado" (o pedido em si, automático ou manual), e integração completa com a aba
Histórico (toda solicitação vira um evento) sem nunca sobrescrever ocorrências anteriores.

**Arquivos:** `src/lib/pendencias-documentais.ts`, `src/lib/prosaude-storage.ts`,
`src/routes/admin.servidores.$id.tsx`.

- **`ObservacaoGerdab` ganhou `beneficiarioId`/`beneficiarioNome`** — antes uma "Solicitação de
  documento" só sabia o destino (servidor/associação), não **de quem** era o documento dentro do
  grupo familiar. Agora toda solicitação (manual ou automática) sabe se é do titular ou de qual
  dependente.
- **Notificação automática do sistema (`garantirSolicitacoesAutomaticas`):** ao abrir a aba
  Documentação, para cada pendência de sistema ainda em aberto (comprovante de matrícula, IRPF
  de enteado) que ainda não tenha nenhuma solicitação registrada, é criada uma solicitação com
  `autor: "Sistema"`, `cargo: "Automático"` — representando a notificação automática enviada ao
  responsável. Idempotente: não duplica em re-renders, nem recria se a pendência já foi
  atendida.
- **`getStatusDocumentosDoServidor`** (nova): agrupa todas as solicitações de um servidor por
  documento+beneficiário, sem nunca descartar ocorrências — expõe a solicitação **mais recente**
  (quem pediu, quando) e o **total de vezes** que aquele documento foi pedido, além do status
  atual (`aguardando_envio` ou `recebido`).
  - **Aba Documentação:** cada documento pendente aparece com o rótulo "Aguardando envio", a
    data/hora e autor da última solicitação (com "(automático)" quando foi o Sistema), a
    contagem "N solicitações realizadas" quando há mais de uma, e o botão **"Solicitar
    novamente"** — que reaproveita a mesma função `addObservacaoGerdab` já usada pela solicitação
    manual (nenhum fluxo paralelo), criando uma nova entrada em nome do analista logado
    (`getAdminRole()`), sem apagar as anteriores.
  - Quando o documento é enviado (via `SolicitacaoDocumentoBanner`, já existente no Portal do
    Servidor / Área da Associação), `marcarPendenciaDocumentalAtendida` agora também fecha a
    solicitação em aberto mais recente daquele documento+beneficiário — a aba Documentação passa
    a mostrar **"Recebido / Disponível"** com a data de recebimento, mantendo visível o total de
    solicitações já feitas (nada é removido do histórico).
- **Aba Observações** ganhou um seletor de **Beneficiário** (Titular ou cada Dependente) ao
  criar uma "Solicitação de documento" — antes só existia o seletor de destino
  (servidor/associação); a listagem de observações também passou a exibir o nome do
  beneficiário junto ao documento solicitado.
- **Aba Histórico** passou a incluir um evento para cada solicitação de documento já feita
  (`Solicitado {documento} para {beneficiário} — realizado por {autor}.`, com data e hora) —
  cada nova solicitação do mesmo documento gera uma linha nova, nenhuma sobrescreve a anterior.
  A contagem da aba (badge) passou a somar também essas solicitações.

**Testado manualmente no navegador:** aberta a aba Documentação de João da Silva — Lucas Souza e
Marcos Lima já apareceram com badge "1 pendente" assim que a notificação automática foi criada
(sem nenhuma ação manual); clicado "Solicitar novamente" em Lucas Souza — passou a mostrar "2
solicitações realizadas" e "Realizado por Rebeca"; conferido na aba Histórico que **as duas**
solicitações (a automática do Sistema e a manual da Rebeca) aparecem como eventos separados, sem
nenhuma sobrescrever a outra; resolvida a pendência de Lucas Souza via "Enviar Comprovante" em
`/servidor/dependentes` — ao voltar para a ficha GERDAB, o documento passou a mostrar "Recebido /
Disponível" com a data de recebimento, ainda exibindo "2 solicitações realizadas". Dados de teste
limpos do `localStorage` ao final. `tsc --noEmit` (2 erros pré-existentes, sem mudança) e
`npm run build` limpos.

### 2.12 Validação do documento enviado — Aprovar / Solicitar reenvio (com justificativa)

O usuário pediu para o documento **recebido** passar por uma validação, no mesmo espírito já
usado para requerimentos/comprovantes no Módulo de Pagamento: o analista/gerência abre o
documento e decide entre aprovar ou solicitar reenvio (em caso de falha na leitura), sempre com
justificativa nesse segundo caso — e que o servidor/associação também enxergue esse resultado.

**Arquivos:** `src/lib/prosaude-storage.ts`, `src/lib/pendencias-documentais.ts`,
`src/components/SolicitacaoDocumentoBanner.tsx`, `src/routes/admin.servidores.$id.tsx`,
`src/routes/servidor.inicio.tsx`, `src/routes/servidor.dependentes.tsx`,
`src/routes/associacao.gerenciamento.$id.tsx`.

- **`ObservacaoGerdab` ganhou o ciclo de análise:** `analiseStatus` (`"aguardando_analise" |
  "aprovado" | "reenvio_solicitado"`), `analisadoPor`, `analisadoCargo`, `analisadoEm` e
  `justificativaReenvio`. Ao marcar um documento como enviado (`marcarObservacaoAtendida`), ele
  entra automaticamente na fila de análise (`aguardando_analise`) — não fica "pronto" sozinho.
- **`DocumentoPendenteView` ganhou um terceiro estado** (`aguardando_envio` → `aguardando_analise`
  → `aprovado`), calculado a partir da solicitação mais recente do agrupamento documento+
  beneficiário — sem precisar de nenhum campo novo de "estado atual" guardado à parte.
- **`aprovarDocumento` / `solicitarReenvioDocumento`** (novas, em `pendencias-documentais.ts`):
  - Aprovar só marca `analiseStatus: "aprovado"` — fim do ciclo.
  - Solicitar reenvio marca o registro atual como `reenvio_solicitado` (com a justificativa,
    permanece intacto no Histórico) **e cria uma nova solicitação em aberto** com a mesma
    justificativa em `texto`/`detalhe` — reaproveita exatamente o mecanismo de "Solicitar
    novamente" já existente (nenhum fluxo paralelo), então o documento volta a aparecer como
    pendente para quem vai reenviar, agora com o motivo visível.
- **Aba Documentação (GERDAB):** documentos "Recebido" (rótulo da 2.11) viraram "Aguardando
  análise" — com o botão **"Analisar documento"**, que abre um modal reaproveitando `DocPreview`
  (mesmo componente da fila de requerimentos) com dois botões: **Aprovar** e **Solicitar
  reenvio** (este último revela um campo de justificativa obrigatório antes de confirmar).
  Documentos aprovados mostram "Aprovado em DD/MM, HH:mm · por Fulano", sem ação — fim do ciclo.
- **Portal do Servidor / Área da Associação** — novo componente `StatusDocumentoEnviadoCard`,
  exibido ao lado do banner de pendência já existente: mostra "Aguardando análise da GERDAB"
  logo após o envio, e "Aprovado ... pela GERDAB" quando aceito. Quando um reenvio é solicitado,
  este card some sozinho e o banner de pendência de sempre reaparece, agora com a justificativa
  do analista visível (reaproveitando o campo `detalhe` que já existia).
- **Histórico** ganhou um evento por decisão de análise — `"Aprovou o documento X de Y —
  realizado por Z."` ou `"Solicitou reenvio de X para Y (justificativa) — realizado por Z."` —
  além do evento original da solicitação (que continua intacto, nunca é substituído).

**Testado manualmente no navegador, ciclo completo:** Lucas Souza enviou o comprovante
("Aguardando análise" no lado GERDAB) → analista clicou "Analisar documento" → "Solicitar
reenvio" com justificativa ("Falha na leitura...") → documento voltou a "Aguardando envio" com
a justificativa visível, "2 solicitações realizadas"; do lado do servidor, o banner de pendência
reapareceu mostrando a mesma justificativa. Em seguida, Marcos Lima enviou seu documento →
GERDAB abriu "Analisar documento" → **Aprovar** → documento passou a "Aprovado em DD/MM, HH:mm ·
por Rebeca" sem ação disponível; do lado do servidor, o card mudou para "Aprovado ... pela
GERDAB" e o botão do card voltou ao normal ("Solicitar exclusão"). Badge de Histórico
incrementou a cada solicitação e a cada decisão de análise, sem nenhuma sobrescrever a anterior.
Dados de teste limpos do `localStorage` ao final. `tsc --noEmit` (2 erros pré-existentes, sem
mudança) e `npm run build` limpos.

### 2.13 Exemplo mockado permanente — documento já enviado, pronto para Aprovar/Solicitar reenvio

O usuário pediu um exemplo já pronto no protótipo, sem precisar passar primeiro pelo Portal do
Servidor para simular o envio — para demonstrar o ciclo de validação (2.12) imediatamente.

**Arquivo:** `src/lib/pendencias-documentais.ts` (`garantirExemploDocumentoEmAnalise`), chamada
junto de `garantirSolicitacoesAutomaticas` no `useEffect` de `TabDocumentacao`.

- Ao abrir a aba Documentação pela primeira vez (ou depois de um `localStorage` limpo), **Pedro
  da Silva** (o único dependente sem nenhuma outra pendência de exemplo — Lucas Souza e Marcos
  Lima já ilustram a 2.11/2.12) passa a ter, automaticamente, um documento "Atestado de
  Frequência Escolar" já enviado e **Aguardando análise**, como se um analista tivesse pedido
  manualmente e o servidor já tivesse respondido.
- Idempotente (checa um id fixo, `obs-exemplo-analise-d2`, antes de criar) — reaparece sozinho
  mesmo depois de limpar o `localStorage`, sem duplicar em re-renders.
- Basta abrir a ficha de João da Silva → aba Documentação → Pedro da Silva → "Analisar
  documento" para já testar **Aprovar** ou **Solicitar reenvio** sem nenhum passo manual antes.

**Testado manualmente no navegador (localStorage limpo):** aba Documentação aberta do zero —
Pedro da Silva já apareceu com badge "1 P/ Analisar"; expandido, mostrou "Atestado de Frequência
Escolar — Aguardando análise"; "Analisar documento" abriu o modal com preview e os botões
Aprovar/Solicitar reenvio prontos para uso. `tsc --noEmit` (2 erros pré-existentes, sem mudança)
e `npm run build` limpos.

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
