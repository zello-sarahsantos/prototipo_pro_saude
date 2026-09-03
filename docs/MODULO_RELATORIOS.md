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

### 2.14 Correção de regra — ASSETRAN sempre tem operadora vinculada

A seção 2.10 modelou a ASSETRAN como podendo existir **sem** operadora vinculada (baseado no
pedido original "não inventar nem exigir uma operadora para a ASSETRAN"). O usuário corrigiu:
isso estava errado — a ASSETRAN **sempre** tem uma operadora, e informar só a associação no
requerimento não é suficiente.

**Arquivos:** `src/routes/primeiro-acesso.tsx`, `src/lib/mock-data.ts`.

- **`FlowInclusao` (Nova Inclusão de Beneficiário, `associacaoFixa`):** antes, quando
  `associacaoFixa` estava definida (ex: ASSETRAN), o passo "Plano" substituía Operadora e
  Administradora por um único campo somente-leitura "Associação: Assetran" — e o estado
  `plano.operadora` nascia preenchido com o **nome da associação**, o que é semanticamente
  errado (associação não é operadora). Corrigido, em duas rodadas:
  1. Primeira correção: o campo "Associação" (somente leitura) continua aparecendo, mas
     **Operadora volta a ser exigida** normalmente — `plano.operadora` nasce vazio, e a
     validação do passo "Plano" passou a exigir Operadora mesmo com `associacaoFixa` definida.
  2. **Ajuste pontual seguinte** (o usuário pediu para não ir além do que foi corrigido):
     **Administradora continua fora do requerimento da ASSETRAN** — só Operadora foi
     adicionada, nada mais. `!associacaoFixa &&` voltou a esconder o campo Administradora (e a
     dispensar sua validação), exatamente como estava antes da 2.14 — só a exigência de
     Operadora é nova.
- **`servidoresList` (tabela de servidores):** Carlos Pereira (ASSETRAN), que a 2.10 deixou
  deliberadamente sem `operadora` como exemplo de "associação sem operadora", passou a ter
  `operadora: "Amil"` — igual ao Roberto Santos (o outro exemplo ASSETRAN, que já tinha
  operadora). Não sobrou mais nenhum exemplo de ASSETRAN sem operadora no protótipo, porque essa
  situação não deveria existir de fato.

**Testado manualmente no navegador:** fluxo de `/associacao/nova-inclusao` refeito do zero — o
passo "Plano" mostra "Associação: Assetran" **e**, ao lado, "Operadora \*" obrigatória, **sem**
nenhum campo "Administradora" na tela; clicar "Próximo" sem selecionar operadora bloqueia o
avanço (mesma mensagem de campos obrigatórios de sempre); preenchendo só Operadora + Modalidade +
Valor + Vigência (sem Administradora), o fluxo avança normalmente para "Dependentes". Em
`/admin/servidores`, Carlos Pereira aparece como "Assetran / Amil" (associação + operadora,
mesma hierarquia visual já usada para os casos ASSEFAZ). `tsc --noEmit` (2 erros pré-existentes,
sem mudança) e `npm run build` limpos.

### 2.15 Administradora de volta para ASSETRAN + novo questionamento de associação no requerimento padrão

Depois de conversar com o stakeholder, o usuário trouxe duas correções sobre a 2.14:

**Arquivos:** `src/routes/primeiro-acesso.tsx`, `src/lib/prosaude-storage.ts`.

- **Administradora volta a aparecer para a ASSETRAN:** o ajuste pontual da 2.14 (esconder
  Administradora quando `associacaoFixa` está definida) foi revertido — o stakeholder confirmou
  que o campo deve continuar no requerimento da ASSETRAN. `!associacaoFixa &&` foi removido de
  novo; Administradora volta a ser exigida sempre, igual à Operadora.
- **Novo questionamento no requerimento padrão de primeira inclusão** (`/primeiro-acesso`, sem
  `associacaoFixa` — não aparece na Nova Inclusão da ASSETRAN, cuja associação já é conhecida):
  um toggle "Associação" no passo "Plano", no mesmo padrão visual do "Empresarial" logo acima
  ("Faz parte de alguma associação?" Sim/Não). Ao marcar "Sim", aparece um select "Qual
  associação? *" com a única opção disponível hoje, **ASSEFAZ** — deixado como select (não texto
  livre) para já comportar mais associações no futuro, mesmo só uma existindo agora. Não altera
  nada mais no formulário: Operadora e Administradora continuam preenchidas normalmente,
  independente da resposta.
  - Novos campos `plano.associacaoVinculada`/`plano.associacao`, validados só quando
    `associacaoVinculada` é `true` (associação passa a ser obrigatória nesse caso).
  - `TitularCadastroPlano` (prosaude-storage.ts) ganhou os mesmos dois campos opcionais, e
    `handleSubmit` os inclui no cadastro salvo — mesmo tratamento dos demais campos do plano.

**Testado manualmente no navegador:** `/associacao/nova-inclusao` (ASSETRAN) — "Administradora
\*" voltou a aparecer junto de "Operadora \*"; nenhum questionamento de associação aparece aqui
(esperado). `/primeiro-acesso` (requerimento padrão) — passo "Plano" mostra o novo bloco
"Associação — Não / Faz parte de alguma associação?"; ativando o toggle, aparece "Qual
associação? *" com a opção "ASSEFAZ"; preenchido tudo (Operadora, Administradora, Associação =
ASSEFAZ, Modalidade, Valor, Vigência), o fluxo avança normalmente para "Dependentes". `tsc
--noEmit` (2 erros pré-existentes, sem mudança) e `npm run build` limpos.

---

## 3. Módulo de Relatórios

> **Correção de escopo (v3 do plano):** ao contrário do que uma versão anterior deste plano
> registrava, o Módulo de Relatórios **inteiro** entra nesta rodada — só o aprofundamento
> funcional de Ressarcimentos/Retroativos (motor de cálculo, casos especiais e a própria tela
> administrativa) fica para uma rodada futura, após levantamento específico com a stakeholder.
> Ver a versão completa e revisada do plano (arquitetura, matriz de tratamento dos relatórios do
> SISPRO, matriz de campos/colunas aprovada com ajustes v3.1) em
> `/Users/User/.claude/plans/ol-como-fa-o-para-atomic-sun.md`.

Esta seção é preenchida progressivamente, etapa a etapa, seguindo o mesmo processo já usado no
Módulo de Pagamento (implementar → testar → documentar → autorização explícita → commit).

### 3.1 Fechamento de Pagamento — estrutura visual e classificação (primeira etapa)

**Contexto:** o Relatório de Pagamento do SISPRO nunca funcionou bem, segundo a stakeholder — a
GERDAB acabou usando documentos manuais para reportar ao NURFI. O pedido explícito foi não
copiar aquela tela, e sim construir um "Relatório de Pagamento" que nasça do próprio Módulo de
Pagamento já implementado (`Comprovante`/`AcaoComprovante`) e represente o fechamento
operacional mensal da competência — não uma tela de consulta "quanto o servidor X recebeu".

**Arquivos:** `src/lib/fechamento-pagamento.ts` (novo — motor de classificação);
`src/routes/admin.relatorios.pagamentos.tsx` (novo — tela); `src/lib/mock-data.ts` (novos tipos
`FechamentoPagamento`, `ObservacaoNurfi`, campo `matricula?` em `BeneficiarioPagamento`);
`src/lib/prosaude-storage.ts` (novas funções de persistência); `src/components/AdminLayout.tsx`
(novo item de menu "Relatórios").

- **Uma única tela**, não duas — `Fechamento de Pagamento — [Competência]`, com abas
  Adimplentes | Inadimplentes | Requer análise, exatamente como desenhado no plano (nunca
  "Relatório de Adimplentes" e "Relatório de Inadimplentes" como funcionalidades separadas).
- **Unidade de classificação: o servidor titular**, não cada dependente isoladamente —
  `getRegistrosFechamento()` filtra `beneficiariosPagamento` por `parentesco === 'Titular'` e
  agrega o status de todo o grupo familiar dele (excluindo dependentes com comprovação coletiva
  via associação, regra 6b do Módulo de Pagamento) para decidir a classificação daquele
  servidor.
- **Classificação por competência, nunca persistida** — mesmo padrão "recompute on demand" já
  usado em notificações/pendências: `StatusComprovante` aprovado/aprovado_com_ressalva →
  Adimplente; recusado → Inadimplente; sem nenhum comprovante do grupo → Inadimplente
  ("Situação"/"Motivo" pré-preenchidos: "Suspender" / "Não apresentou comprovante de pagamento
  nesta competência", ou o motivo da dispensa quando o servidor optou por "continuar sem
  comprovante"); qualquer status ainda em decisão (`em_analise`, `ilegivel`,
  `correcao_solicitada`, retroativo aguardando aprovação, etc.) → Requer análise. **Este
  mapeamento é proposta técnica, não regra de negócio fechada** — marcado como tal em
  comentário no próprio código e na seção 8 abaixo.
- **Situação, Motivo e Observação NURFI são três campos sempre distintos** na aba Inadimplentes
  — Motivo é reaproveitado automaticamente de `AcaoComprovante.motivo` quando a recusa já
  registrou uma causa; Observação NURFI é um `<textarea>` opcional, persistido por
  (beneficiário, competência) via `salvarObservacaoNurfi()`, nunca obrigatório e nunca
  substituindo os outros dois campos.
- **Coluna "QT"** exibida só como sequencial de exibição (`i + 1` da própria listagem), rotulada
  "(a validar)" — não é tratada como indicador agregado (correção de leitura do documento manual
  da GERDAB, onde os valores aparecem sequenciais, não como contagem por situação).
- **Coluna "Competência de pagamento"** (aba Adimplentes) exibida com o mesmo valor da
  competência de referência e rotulada "(a validar)" — o modelo de dados atual não tem um campo
  separado para uma eventual competência de processamento distinta da de referência; criar esse
  campo depende de confirmação da stakeholder (seção 8).
- **Cabeçalho com rastreabilidade real**: os 3 contadores (Adimplentes/Inadimplentes/Requer
  análise) são clicáveis e trocam a aba ativa — nunca um número solto sem lista por trás.
- **Fechamento de competência**: `FechamentoPagamento` (novo tipo, distinto de
  `ConclusaoCompetencia` — este último é o Servidor dizendo "terminei de enviar", aquele é a
  GERDAB dizendo "revisei e vou gerar o relatório para o NURFI"). O botão "Fechar competência"
  fica desabilitado enquanto houver qualquer registro em Requer análise
  (`podeFecharCompetencia()`), com mensagem explicando o motivo — regra recomendada pelo plano,
  também marcada como pendente de confirmação. Qualquer novo comprovante ou ação
  (`addComprovantePagamento`/`updateComprovantePagamento`) invalida automaticamente um
  fechamento existente daquela competência (`invalidarFechamentoPagamento`), mesmo mecanismo já
  usado para `ConclusaoCompetencia`.
- **Filtro Todos \| Ativos \| Inativos** dentro de cada aba, usando `BeneficiarioPagamento.situacao`
  — nunca telas separadas por vínculo.
- **Limitação de dados registrada explicitamente na própria tela** (banner acima do cabeçalho):
  o cenário de referência do Módulo de Pagamento tem só 1 grupo familiar/1 servidor titular
  (Carlos Eduardo Ramos, matrícula ilustrativa `50001` — campo novo, opcional, isolado do
  cenário de `servidoresList` como já documentado nesta seção 2), então os números do Fechamento
  são pequenos, mas **reais e rastreáveis** — nunca inflados para parecer GERDAB-escala. Expandir
  essa base é a etapa "Base de dados necessária" do plano, ainda não feita.

**Testado manualmente no navegador:** confirmado, em `/admin/relatorios/pagamentos`, que (a)
Julho/2026 (competência atual, com 1 comprovante em `em_analise`) mostra 1 registro em "Requer
análise" e bloqueia o botão "Fechar competência" com a mensagem explicativa; (b) Junho/2026
(competência fechada sem nenhum comprovante do grupo) mostra 1 registro em "Inadimplentes" com
Situação "Suspender" e Motivo "Não apresentou comprovante de pagamento nesta competência",
Observação NURFI vazia e editável, e o botão "Fechar competência" habilitado; (c) clicar em
"Fechar competência" persiste o fechamento e substitui o botão por um aviso de bloqueio ("🔒
Competência fechada em .../.../... por Erandir / Gerência"); (d) os 3 contadores do cabeçalho
trocam a aba ativa ao serem clicados; (e) o item "Relatórios" aparece no menu do `AdminLayout`
entre "Comprovantes" e "Carga Inicial". `npx tsc --noEmit` e `npm run build` limpos (só os 2
erros pré-existentes e não relacionados). Dados de teste (`prosaude_role`,
`prosaude_fechamentos_pagamento`, `prosaude_observacoes_nurfi`) limpos do `localStorage` ao
final da verificação.

### 3.2 Visão Geral / Dashboard do módulo

**Contexto:** com o Fechamento de Pagamento já implementado, a Visão Geral (item 1 da
arquitetura do plano) fica simples — um ponto de entrada que destaca o Fechamento e mapeia as
demais sub-áreas ainda por implementar, sem duplicar nenhum dado.

**Arquivos:** `src/routes/admin.relatorios.index.tsx` (novo — rota `/admin/relatorios`);
`src/components/AdminLayout.tsx` (item "Relatórios" do menu passa a apontar para
`/admin/relatorios` em vez de direto para `/admin/relatorios/pagamentos`).

- Card "Fechamento de Pagamento" com o resumo real da competência mais recente
  (`getResumoFechamento`, mesma fonte de dados da tela de Fechamento — nunca um número
  duplicado/hardcoded) e link para `/admin/relatorios/pagamentos`.
- Lista "Demais áreas do módulo" com as 6 sub-áreas ainda não implementadas (Extrato do
  Servidor, Documentação e Pendências, Beneficiários/Contratos, Visões Gerenciais, Comprovante
  de Rendimentos, Ressarcimentos/Retroativos) — exibidas só como indicação de arquitetura
  ("Em construção"), sem nenhuma tela vazia criada por antecipação e sem link (não navegam para
  lugar nenhum ainda). Consistente com a decisão de não construir uma tela de
  Ressarcimentos/Retroativos nesta rodada (seção 4).

**Testado manualmente no navegador:** confirmado que `/admin/relatorios` mostra os mesmos
números da competência mais recente que `/admin/relatorios/pagamentos` exibe, que o clique no
card do Fechamento navega corretamente para a tela de Fechamento, e que as 6 áreas "Em
construção" aparecem sem links quebrados. `npx tsc --noEmit` e `npm run build` limpos (só os 2
erros pré-existentes).

### 3.3 Extrato do Servidor

> **Correção posterior (§3.8):** "Meu Extrato" como relatório separado do lado do Servidor foi
> **descontinuado** — o conceito estava incorreto (não é "histórico de pagamentos", e sim
> histórico das comprovações apresentadas por competência; o reembolso ocorre só depois da
> aprovação). O texto abaixo descreve a versão original, para registro; a versão vigente do lado
> do Servidor foi absorvida pelo "Histórico de Comprovações" dentro da área de Pagamentos (ver
> §3.8). **O lado GERDAB não mudou**: `/admin/relatorios/extrato/$matricula` e
> `/admin/relatorios/extrato` (Histórico de Pagamentos administrativo, §3.6) continuam existindo
> normalmente, reaproveitando a mesma função `getExtratoServidor`.

**Contexto:** visão individual e histórica dos pagamentos de 1 servidor ao longo das
competências — deliberadamente distinta do Fechamento de Pagamento (coletivo, por competência)
e do Comprovante de Rendimentos (consolidado anual de valores pagos, ainda não implementado),
seguindo a diretriz explícita do usuário de nunca consolidar essas três visões em uma tela só.

**Arquivos:** `src/lib/fechamento-pagamento.ts` (refatorado — o núcleo de classificação
`classificarTitularNaCompetencia` foi extraído de `getRegistrosFechamento` para ser reaproveitado
também aqui, evitando duplicar a lógica de aprovado/recusado/sem-envio/em-análise; nova função
`getExtratoServidor`); `src/routes/admin.relatorios.extrato.$matricula.tsx` (novo — lado GERDAB);
`src/routes/servidor.extrato.tsx` (novo — lado Servidor, "Meu Extrato"); `admin.relatorios.index.tsx`
(novo link para o Extrato, substituindo o card "Em construção").

- Colunas exatamente como aprovadas na matriz 2.10: Ano, Competência, Houve pagamento?, Valor,
  Status, Ocorrência (retroativo) — a coluna de retroativo só sinaliza status
  (`Comprovante.isRetroativo`), sem nenhum motor de cálculo de diferença/teto (fora de escopo,
  seção 4).
- Cobre as mesmas competências do Fechamento (`competenciasParaFechamento`) mais qualquer outra
  competência com comprovante real (`getCompetenciasConhecidas()`), para não perder um eventual
  retroativo fora dessa janela.
- Lado GERDAB (`/admin/relatorios/extrato/$matricula`) busca o titular pela matrícula na URL;
  lado Servidor (`/servidor/extrato`, "Meu Extrato") reaproveita a mesma convenção já usada em
  `servidor.pagamentos.index.tsx` — sem autenticação real, "o servidor logado" é sempre o titular
  do cenário de referência (Carlos Eduardo Ramos).

**Testado manualmente no navegador:** confirmado que `/admin/relatorios/extrato/50001` e
`/servidor/extrato` mostram as 4 competências conhecidas (Abril a Julho/2026), com Maio/2026
corretamente sinalizada como "Retroativo" (ícone + rótulo) e Julho/2026 mostrando o status "Em
Análise" (coerente com o mesmo registro que aparece em "Requer análise" no Fechamento — mesma
fonte de dados, nenhuma duplicação de lógica). `npx tsc --noEmit` e `npm run build` limpos (só os
2 erros pré-existentes).

### 3.4 Documentação e Pendências dos Beneficiários/Dependentes

**Contexto:** absorve o que o SISPRO chamava de "Relatório IRPF" (e os controles equivalentes de
IR de enteado, comprovante de matrícula/escolaridade) — são documentação obrigatória a
acompanhar, **não** valores pagos (essa distinção, pedida explicitamente pelo usuário, está
registrada na matriz de tratamento, seção 2 do plano). A consolidação continua sendo
interpretação atual, não substituição definitivamente validada (pendência registrada na seção 5).

**Arquivo:** `src/routes/admin.relatorios.documentacao.tsx` (novo). **Nenhum código novo em
`pendencias-documentais.ts`** — a tela só consome o que já existia:
`getStatusDocumentosDoServidor()` (que já trazia, prontos, os 3 campos pedidos no ajuste v3.1 da
matriz: data/hora da última solicitação, solicitado por, quantidade de solicitações) e
`getPendenciasDocumentaisDoServidor()` (para o Prazo/Vencimento e sinalizar quando está vencido,
via `estaVencida()`).

- Colunas conforme a matriz 2.10: Beneficiário/Dependente, Documento, Status, Prazo/Vencimento,
  Origem, mais os 3 campos do ajuste v3.1 (Última solicitação, Solicitado por, Qtd. solicitações).
- Filtro por status (Todos | Aguardando envio | Aguardando análise | Aprovado) — os únicos 3
  valores de `StatusDocumentoPendente`, já existentes.
- "Origem" derivada de `ultimaSolicitacao.cargo === "Automático"` (mesma convenção já usada por
  `garantirSolicitacoesAutomaticas`) — não é um campo novo, só uma leitura direta do que já
  existe.
- Ação "Ver na ficha" leva à aba Documentação já existente em `/admin/servidores/$id` (que faz o
  ciclo completo de Aprovar/Solicitar reenvio) — esta tela é uma visão consolidada/panorâmica,
  não duplica a ação de aprovação que já existe na ficha do servidor.
- **Notificação em massa** (mencionada na arquitetura do plano) não foi implementada nesta
  etapa — não há hoje uma função pronta para reaproveitar (diferente de aprovar/solicitar
  reenvio, que já existiam) e criar uma nova só para isso seria inflar escopo sem pedido
  explícito; registrado como pendência (seção 5) para quando for priorizado.
- Mesma limitação de cenário isolado já registrada no Fechamento/Extrato: os dados vêm de
  `servidorAtual`/`dependentes` (o único servidor de referência do protótipo) — não há uma
  planilha completa de todos os servidores da GERDAB.

**Testado manualmente no navegador:** confirmado que `/admin/relatorios/documentacao` mostra os
3 registros de pendência já existentes no protótipo (Lucas Souza — Comprovante de Matrícula,
vencido; Marcos Lima — Declaração de IR; Pedro da Silva — Atestado de Frequência Escolar,
aguardando análise), com prazo vencido destacado, filtros funcionando e o link "Ver na ficha"
apontando corretamente para `/admin/servidores/12345678`. `npx tsc --noEmit` e `npm run build`
limpos (só os 2 erros pré-existentes).

### 3.5 Comprovante de Rendimentos

**Contexto:** consolidado **anual** dos valores efetivamente pagos ao servidor — deliberadamente
distinto da Documentação e Pendências (§3.4, que é sobre documentação obrigatória, não valores)
e do Extrato do Servidor (§3.3, que é por competência, não anual). Reaproveita a mesma fonte de
dados do Extrato (`getExtratoServidor`) — só agrupa por ano, nenhum motor de cálculo novo.

**Arquivos:** `src/lib/fechamento-pagamento.ts` (novo: `getAnosDisponiveis`,
`getComprovanteRendimentos`); `src/routes/servidor.comprovante-rendimentos.tsx` (novo — única
tela, só do lado do Servidor, conforme o plano); `src/lib/mock-data.ts` (novo campo opcional
`cpf?` em `BeneficiarioPagamento`, mesmo espírito ilustrativo/isolado de `matricula`);
`admin.relatorios.index.tsx` (link de visualização para a tela do Servidor).

- Cabeçalho com Nome, Matrícula/CPF e Ano-calendário (seletor), conforme aprovado no ajuste v3.1
  da matriz — "Titular/dependentes relacionados" **não** aparece na tela: ainda não confirmado
  se o informe detalha por dependente ou só consolida o titular, e a diretriz do backlog (seção
  6) já pede não expor rótulos "a validar" ao usuário final — a limitação fica só registrada
  aqui na documentação, não na interface.
- Tabela Mês/Competência × Valor pago, somando só competências com pagamento efetivamente
  aprovado (`houvePagamento`, mesmo critério do Extrato) — nunca um valor "aprovado mas não
  pago".
- Sem tela correspondente do lado GERDAB (`/admin/...`) — o plano só previu esta visão do lado
  do Servidor.

> **Correção arquitetural (§3.6):** a Visão Geral administrativa chegou a ganhar, nesta etapa,
> um link de conveniência direto para esta tela do Portal do Servidor — isso foi revertido logo
> em seguida por violar a separação de perfis (ver §3.6). O Admin **nunca** deve ter um atalho
> que redirecione para uma rota `/servidor/...`.
>
> **Correção posterior (§3.8):** o texto de apresentação mudou de uma explicação técnica
> ("Diferente da Documentação e Pendências...") para uma frase voltada ao usuário ("Consulte os
> valores de reembolso efetivamente recebidos..."), e a tela ganhou um link "Voltar para
> Pagamentos" — o acesso deixou de depender de um item próprio no menu (removido, ver §3.8) e
> passou a ficar dentro da área de Pagamentos.

**Testado manualmente no navegador:** confirmado que `/servidor/comprovante-rendimentos` mostra
o cabeçalho correto (Carlos Eduardo Ramos, 50001 / 111.222.333-44), seletor de ano (só 2026
disponível) e a tabela com as 4 competências, total R$ 0,00 (honesto — nenhum comprovante do
cenário seed chegou a "aprovado" sem ressalva). `npx tsc --noEmit` e `npm run build` limpos (só
os 2 erros pré-existentes).

### 3.6 Correção arquitetural — separação de perfis Portal do Servidor × Módulo de Relatórios GERDAB

**Contexto:** as etapas 3.3 e 3.5 introduziram, na Visão Geral administrativa, links que
levavam diretamente a rotas `/servidor/...` (Extrato individual de uma matrícula fixa,
Comprovante de Rendimentos). Isso confundia dois perfis com responsabilidades diferentes: o
Portal do Servidor (consultas sobre os **próprios** dados) e o Módulo de Relatórios da GERDAB
(visões **consolidadas** do universo administrado, com drill-down individual). Esta correção
formaliza a regra e ajusta a navegação — nenhuma lógica de classificação foi descartada.

**Regra de arquitetura por perfil (vale para todo o Módulo de Relatórios daqui em diante):**

- **Portal do Servidor** (`/servidor/...`) apresenta consultas individuais dos **próprios**
  dados do servidor logado (Meu Extrato, Meu Comprovante de Rendimentos, Meus Pagamentos, Meus
  Requerimentos).
- **Módulo de Relatórios da GERDAB** (`/admin/relatorios/...`) apresenta prioritariamente **visões
  consolidadas** do universo administrado (todos os servidores, todas as competências, todas as
  pendências). Uma consulta individual pode existir no Admin, mas só como **drill-down** de uma
  visão consolidada — nunca como a porta de entrada.
- **Nenhuma funcionalidade do Módulo de Relatórios administrativo usa uma tela do Portal do
  Servidor como sua interface final.** O compartilhamento acontece na camada de dados/lógica/
  componentes (mesma função, mesmo tipo), nunca por navegação entre perfis — uma rota nunca
  redireciona para a outra, mesmo quando ambas usam a mesma fonte.

**Arquivos:** `src/lib/fechamento-pagamento.ts` (nova função `getHistoricoPagamentos` — reaproveita
`getExtratoServidor`, nenhum motor de classificação novo; `getCompetenciasConhecidas` exportada
para alimentar os filtros de Ano/Competência); `src/routes/admin.relatorios.extrato.index.tsx`
(novo — **Histórico de Pagamentos**, a nova porta de entrada consolidada); `admin.relatorios.extrato.$matricula.tsx`
(preservado — só o link "Voltar" passou a apontar para o Histórico, com breadcrumb "Relatórios →
Histórico de Pagamentos → Extrato Individual", em vez de para a Visão Geral); `admin.relatorios.index.tsx`
(card "Extrato do Servidor" → "Histórico de Pagamentos", agora sem parâmetro de matrícula fixo;
card "Comprovante de Rendimentos" removido por completo).

- **Comprovante de Rendimentos**: continua **exclusivo do Portal do Servidor** nesta rodada —
  não existe tela administrativa correspondente. Se a GERDAB precisar consultar rendimentos
  anuais individualmente no futuro, isso será uma funcionalidade administrativa própria (rota e
  fluxo dedicados), não um atalho para a tela do Servidor.
- **Histórico de Pagamentos** (`/admin/relatorios/extrato`, novo): tabela com **todos os
  servidores titulares** (hoje só 1, pela mesma limitação de dados já registrada — ver §3.1),
  colunas Matrícula, Servidor, Competências, Pagas, Não pagas, Em análise, Total pago, Ação ("Ver
  extrato"). Filtros: Ano, Competência, Situação do pagamento (Pago/Não pago/Em análise — cada
  um conta se o servidor tem ao menos 1 competência naquele estado, dentro do recorte de
  Ano/Competência escolhido), Todos\|Ativos\|Inativos, busca por Nome/Matrícula — só filtros
  sobre dados que já existem, nenhum inventado.
- **Hierarquia de navegação**: Relatórios → Histórico de Pagamentos → Extrato Individual (Admin);
  separadamente, Meu Extrato (Servidor) — mesma fonte de dados (`getExtratoServidor`), duas
  experiências deliberadamente distintas, sem link cruzado entre uma e outra.

**Testado manualmente no navegador:** confirmado que (a) `/admin/relatorios` não tem mais
nenhum link para `/servidor/...`; (b) o card "Histórico de Pagamentos" abre
`/admin/relatorios/extrato`, mostrando a tabela consolidada com filtros funcionando; (c) "Ver
extrato" abre `/admin/relatorios/extrato/50001` com o breadcrumb correto e o botão "Voltar"
retornando ao Histórico; (d) `/servidor/extrato` e `/servidor/comprovante-rendimentos` continuam
funcionando de forma totalmente independente, sem qualquer link administrativo apontando para
elas. `npx tsc --noEmit` e `npm run build` limpos (só os 2 erros pré-existentes) — todos os
chunks de rota (`admin.relatorios.extrato.index`, `admin.relatorios.extrato.$matricula`, etc.)
gerados corretamente.

### 3.7 Área "Relatórios" no Portal do Servidor (menu inferior) — REVERTIDA, ver §3.8

> **Esta etapa foi desfeita na §3.8 seguinte.** O item "Relatórios" no menu inferior gerou
> redundância e prejudicou o layout mobile; o texto abaixo é mantido como registro histórico do
> que foi tentado e por que foi revertido, não como o estado atual da aplicação.

**Contexto:** `/servidor/extrato` e `/servidor/comprovante-rendimentos` (§3.3, §3.5) existiam
desde as etapas anteriores, mas sem entrada no menu inferior — praticamente inacessíveis para
validação/uso normal. Esta etapa só resolve a navegação; nenhuma lógica nova.

**Arquivos:** `src/components/ServidorLayout.tsx` (menu inferior: `grid-cols-5` → `grid-cols-6`,
novo item "Relatórios" entre "Dependentes" e "Meus Dados"; `NavTab` ganhou a prop opcional
`activePaths` — rotas adicionais que também marcam a aba como ativa); `src/routes/servidor.relatorios.tsx`
(novo — página de entrada da área, só 2 links para as telas já existentes, nenhuma lógica nova).

- Menu inferior: Início | Pagamentos | Requerimentos | Dependentes | **Relatórios** | Meus Dados
  — mesmo padrão visual/ícones/estados ativo-inativo já usado nos demais itens.
  - Ícone `BarChart3` (mesmo ícone já usado para "Relatórios" no menu do `AdminLayout`,
    consistência entre os dois perfis).
- `/servidor/relatorios` lista "Meu Extrato" e "Comprovante de Rendimentos" como cards, no
  mesmo padrão visual dos cards já usados na Visão Geral administrativa — só navegação.
- A aba "Relatórios" do menu inferior permanece destacada (ativa) também quando o usuário está
  em `/servidor/extrato` ou `/servidor/comprovante-rendimentos` (via `activePaths` no `NavTab`),
  já que essas telas pertencem a essa área mesmo sem estarem sob o prefixo `/servidor/relatorios`.

**Testado manualmente no navegador:** confirmado que o menu inferior mostra os 6 itens na ordem
correta em `/servidor/inicio`; que "Relatórios" abre `/servidor/relatorios` com os 2 cards; que
clicar em "Meu Extrato" abre `/servidor/extrato` mantendo a aba "Relatórios" destacada no menu.
`npx tsc --noEmit` e `npm run build` limpos (só os 2 erros pré-existentes).

### 3.8 Correção arquitetural — remoção do item "Relatórios" e descontinuação do "Meu Extrato"

**Contexto:** a §3.7 (item "Relatórios" no menu inferior) gerou redundância e prejudicou o
layout mobile. Além disso, o conceito de "Meu Extrato" (§3.3) estava **conceitualmente errado**:
não é um "histórico de pagamentos" — é o histórico das **comprovações apresentadas** por
competência, já que o reembolso só acontece depois da apresentação e aprovação do comprovante.
Esta correção reverte a §3.7 e evolui a lógica útil do Extrato para dentro da área de Pagamentos,
sem descartar nada que já funcionava.

**Arquivos:**
- `src/components/ServidorLayout.tsx` — menu inferior volta a `grid-cols-5`, item "Relatórios"
  removido; `NavTab` volta à forma simples (sem a prop `activePaths`, que só existia para essa
  aba).
- `src/routes/servidor.relatorios.tsx` e `src/routes/servidor.extrato.tsx` — **removidos**
  (não só esvaziados). "Meu Extrato" não existe mais como relatório separado; a página de
  entrada da área "Relatórios" deixou de fazer sentido sem o item de menu.
- `src/routes/servidor.pagamentos.index.tsx` — a seção "Histórico de envios" (lista plana de
  documentos) evoluiu para **"Histórico de Comprovações"**, agrupada por competência. Ganhou um
  link de acesso ao Comprovante de Rendimentos (card, não item de menu). **Nenhum motor de
  cálculo/classificação novo**: a nova seção reaproveita `getExtratoServidor`
  (`fechamento-pagamento.ts`) — a mesma função já usada pelo Extrato administrativo — só
  enriquecida com os nomes dos arquivos apresentados em cada competência (lidos diretamente de
  `Comprovante.arquivos`, já existentes).
- `src/routes/servidor.comprovante-rendimentos.tsx` — texto de apresentação trocado por uma
  frase voltada ao usuário; ganhou link "Voltar para Pagamentos" (antes dependia do item de menu
  removido).
- `src/lib/fechamento-pagamento.ts` e `src/routes/admin.relatorios.extrato.$matricula.tsx` /
  `admin.relatorios.extrato.index.tsx` — **inalterados**. A arquitetura administrativa da GERDAB
  não faz parte desta correção (ela é específica do Portal do Servidor).

**"Histórico de Comprovações" — o que mostra por competência:**
- Se houve comprovação apresentada (nomes dos arquivos) ou "Sem comprovação apresentada";
- Situação da comprovação/análise (mesmo `ComprovanteStatusBadge` já usado no restante da tela;
  o rótulo já inclui "Retroativo" para toda a família de status `retroativo_*` —
  propositalmente **não** duplicado como um chip separado, para não repetir a mesma informação
  duas vezes na mesma linha);
- Valor aprovado, mostrado **somente quando `houvePagamento` é verdadeiro** (nunca um valor
  "aprovado mas ainda não pago" — mesmo critério já usado no Extrato/Comprovante de Rendimentos);
- Clique abre o comprovante mais recente daquela competência no mesmo modal já existente
  (`ServidorComprovanteDetail`), sem nenhuma tela nova.
- Layout em duas linhas (competência+status na primeira, documentos na segunda) para evitar que
  o rótulo mais longo de status (ex.: "Retroativo — Aguardando Aprovação") force a competência a
  ficar ilegível em telas estreitas — ajuste puramente de CSS/responsividade, sem relação com a
  regra de negócio.

**Testado manualmente no navegador (mobile, 375px):** confirmado que (a) o menu inferior do
Portal do Servidor voltou a ter 5 itens (Início | Pagamentos | Requerimentos | Dependentes |
Meus Dados); (b) `/servidor/extrato` e `/servidor/relatorios` retornam "Not Found" (rotas
removidas, não só desvinculadas do menu); (c) `/servidor/pagamentos` mostra "Histórico de
Comprovações" com as 4 competências conhecidas, cada uma com documentos e status corretos, sem
sobreposição visual mesmo com o badge de retroativo mais longo; (d) clicar numa competência com
comprovante abre o `ServidorComprovanteDetail` correto; (e) o card "Comprovante de Rendimentos"
dentro de Pagamentos abre a tela, que agora tem o texto voltado ao usuário e um link "Voltar
para Pagamentos"; (f) o Módulo de Relatórios administrativo (`/admin/relatorios/...`) continua
funcionando sem nenhuma mudança, inclusive `/admin/relatorios/extrato/$matricula` que reaproveita
a mesma `getExtratoServidor`. `npx tsc --noEmit` e `npm run build` limpos (só os 2 erros
pré-existentes).

### 3.9 Beneficiários / Contratos — reaproveitamento de `/admin/servidores`, sem tela nova

**Contexto:** o plano (item 2.1.5 / matriz 2.10) previa uma visão "Beneficiários / Contratos"
com Processo SEI, Titular, Dependentes, Operadora, Valor do plano/auxílio, Status
(Ativo/Inativo, filtro único) e Contato. A tela `/admin/servidores` (já existente, fora do
Módulo de Relatórios) **já cobria quase tudo isso** — construir uma segunda tela duplicaria
dados e lógica de filtro sem necessidade, exatamente o tipo de fragmentação que o plano pediu
para evitar (matriz 2.2: "Pró-Saúde dos Ativos"/"Pró-Saúde dos Inativos" → consolidar em um
filtro único, não duplicar telas).

**Decisão:** não criar uma tela nova. `/admin/servidores` passa a ser, também, a "Beneficiários
/ Contratos" do Módulo de Relatórios — a Visão Geral (§3.2) linka direto para ela.

**Arquivos:** `src/routes/admin.servidores.index.tsx` (coluna **Contato** adicionada — telefone
+ e-mail; comentário adicionado explicando o duplo papel da tela); `src/routes/admin.relatorios.index.tsx`
(novo card "Beneficiários / Contratos" linkando para `/admin/servidores`, removido da lista "Em
construção").

- O filtro de status já existente (`Todos os status` / Ativos / Inativos / Pendentes / Requer
  Atenção / Suspensos) já cumpre o papel de "Todos \| Ativos \| Inativos" pedido pela matriz —
  de forma até mais granular, sem ser duas telas separadas.
- Nenhuma lógica de filtro, busca ou paginação foi duplicada ou reescrita — só a coluna Contato
  foi adicionada à tabela já existente.

**Testado manualmente no navegador:** confirmado que `/admin/relatorios` mostra o card
"Beneficiários / Contratos" (fora da lista "Em construção") e que ele abre `/admin/servidores`
com a nova coluna "Contato" (telefone + e-mail) visível na tabela, junto dos filtros e da busca
já existentes, sem nenhuma regressão nas colunas anteriores. `npx tsc --noEmit` e
`npm run build` limpos (só os 2 erros pré-existentes).

> **Correção de UX (§3.10):** a coluna "Contato" foi **removida** logo em seguida — alta
> densidade horizontal da tabela e telefone/e-mail não precisam ocupar espaço permanente na
> listagem. Ver §3.10 para o desenho final (telefone/e-mail continuam disponíveis na ficha
> individual e devem entrar na futura exportação) e para o breadcrumb de contexto adicionado.

### 3.10 Ajuste de UX — remoção da coluna Contato + breadcrumb de contexto

**Contexto:** aprovação conceitual da §3.9 (reaproveitar `/admin/servidores`, não duplicar
tela), com dois ajustes: (1) a coluna Contato adicionada em §3.9 foi removida — telefone/e-mail
continuam existindo (na ficha individual e, futuramente, na exportação), só não ocupam coluna
fixa na listagem; (2) o acesso vindo do card "Beneficiários / Contratos" ganhou um breadcrumb de
contexto ("Relatórios > Beneficiários / Contratos"), sem duplicar componente, dados ou lógica —
só um parâmetro de busca (`?origem=relatorios`) que a mesma tela lê para decidir se mostra essa
linha ou não.

**Arquivos:** `src/routes/admin.servidores.index.tsx` (coluna Contato removida da tabela;
`Route.validateSearch` novo — `{ origem?: "relatorios" }`; breadcrumb condicional no topo da
página, renderizado só quando `search.origem === "relatorios"`); `src/routes/admin.relatorios.index.tsx`
(o `Link` para `/admin/servidores` passa `search={{ origem: "relatorios" }}`; texto do card
ajustado, sem mencionar mais "contato" como coluna).

- **Colunas principais da tabela**, na ordem final: Processo SEI, Servidor, Operadora/
  Associação, Dep., Valor Plano, Auxílio Previsto, Situação, Ações — exatamente as 7 pedidas,
  nenhuma a mais.
- **Telefone/e-mail** seguem disponíveis em `/admin/servidores/$id` (já existiam antes desta
  etapa, nada mudou lá) — a futura exportação da visão (mock, ainda não implementada em nenhuma
  tela do módulo) deve incluí-los quando for construída; registrado como pendência (seção 5).
- **Busca/filtros**: não foi adicionado filtro ou campo de busca por telefone/e-mail — a busca
  existente (nome, CPF, processo SEI) já cobre a necessidade real observada; adicionar contato à
  busca ficaria como especulação sem uso identificado.
- **Padrão de breadcrumb via query param** (`Route.validateSearch` + `Route.useSearch()`) é o
  mesmo já usado em `servidor.pagamentos.enviar.tsx` (`competencia`/`beneficiario`) — reaproveita
  uma convenção já estabelecida no protótipo, não inventa uma nova. O acesso pelo menu
  "Servidores" nunca passa `origem`, então o breadcrumb nunca aparece nesse caminho — só quando
  o próprio Módulo de Relatórios é a origem da navegação.

**Testado manualmente no navegador, os dois caminhos de entrada:** (a) `/admin/servidores`
direto (menu "Servidores") — tabela sem coluna Contato, sem breadcrumb, 7 colunas principais
intactas; (b) `/admin/relatorios` → card "Beneficiários / Contratos" — mesma tabela, mesmos
dados, mas com o breadcrumb "Relatórios > Beneficiários / Contratos" no topo (o "Relatórios" é
um link de volta funcional, confirmado). `npx tsc --noEmit` e `npm run build` limpos (só os 2
erros pré-existentes).

### 3.11 Visões Gerenciais (v1 — simplificada demais, ver correção em §3.12)

> **Esta versão foi corrigida na §3.12 seguinte**, incluindo a reversão do campo
> `dataNascimento` fictício descrito abaixo. Texto mantido como registro histórico do que foi
> tentado e por quê — não reflete o estado atual da tela.

**Contexto:** último item da arquitetura do módulo (plano, seção 2.1 item 6), deliberadamente
por último na ordem de implementação (2.9) por depender da etapa "Base de dados necessária"
(data de nascimento + dataset histórico), até agora não feita.

- Tela com gráfico de barras (Operadora, Faixa Etária) + indicador de teto, sem tabela
  consolidada.
- **Faixa etária calculada sobre um campo `dataNascimento` fictício**, adicionado
  especificamente para preencher esse indicador — decisão revertida na §3.12 por instrução
  explícita ("não fabricar dado só para preencher indicador").

### 3.12 Correção — Visões Gerenciais tabulares, sem dado fictício (revisada em §3.13)

> **Duas afirmações abaixo foram corrigidas na §3.13 seguinte:** (1) `dataNascimento` **não**
> ficou de fora — o problema era de modelagem (`ServidorListItem` não carregava o campo), não de
> ausência do dado no domínio (ele já existe nos fluxos de cadastro/requerimento,
> `servidorAtual`/`Dependente`); o campo voltou, desta vez como dado cadastral legítimo. (2)
> "Ativos/Inativos" usando `status` (`StatusKey`) estava semanticamente errado — nesta visão
> gerencial, "Inativo" significa **aposentado**, não "cadastro inativo no sistema". Ver §3.13
> para o desenho corrigido; texto abaixo mantido como registro histórico.

**Contexto:** a v1 (§3.11) ficou simplificada demais (só gráfico + contagem) e se afastou da
visão tabular/consolidada esperada pela GERDAB; pior, fabricou um campo (`dataNascimento`)
inexistente no cadastro real só para calcular faixa etária. Esta correção: (1) reverte o dado
fictício; (2) substitui os gráficos de barra por tabelas consolidadas como visão principal; (3)
traz Ativos/Inativos para dentro da consolidação por operadora e como indicador próprio; (4)
mantém o teto só como indicador complementar (quantidade + percentual), sem inventar série.

**Arquivos:** `src/lib/mock-data.ts` (`dataNascimento` e `calcularIdade()` **removidos** de
`ServidorListItem`/`servidoresList` — revertido por completo, com comentário explicando a
reversão); `src/lib/visoes-gerenciais.ts` (reescrito: `getConsolidadoPorOperadora`,
`getResumoVinculos`, `getSituacaoTeto` — sem nenhuma função de faixa etária, já que não há dado
real para isso); `src/routes/admin.relatorios.gerencial.tsx` (reescrito).

- **Consolidado por operadora/seguradora** — tabela principal (não gráfico), colunas: Operadora/
  Seguradora, Nº titulares, Nº dependentes, Total de beneficiários, Ativos, Inativos, % da base
  — mais uma linha de Total. Todos os números são reais, direto de `servidoresList`
  (`dependentes` já existia como campo numérico por servidor; `status` já existia).
- **Ativos/Inativos** deixou de ser um detalhe dentro da célula de Situação — agora é (a) uma
  coluna própria dentro da tabela de operadoras e (b) um indicador de topo da página
  (`getResumoVinculos()`), usando o mesmo critério em uma única fonte (`status === 'ativo'` =
  Ativo; qualquer outro status = Inativo — mesma simplificação binária já usada em
  Beneficiários/Contratos, §3.9/§3.10, para não reproduzir a fragmentação do SISPRO).
- **Faixa etária**: **nenhum número calculado.** A seção existe na tela, mas só com uma
  explicação de que o cadastro real de servidores não tem data de nascimento hoje — registrado
  como pendência de dados (seção 5), não preenchido com dado inventado. Quando o campo existir
  de verdade, a mesma estrutura de tabela (Titulares, Dependentes, Total, % da base) pode ser
  aplicada sem redesenho.
- **Teto familiar**: indicador complementar (quantidade + percentual da base, mais a lista dos
  servidores no teto/acima) — fotografia do momento atual, nunca uma série. "Evolução de
  Servidores no Teto" ao longo de competências permanece pendência (seção 5) — não fabricada.
- Nenhum motor de cálculo paralelo: `dependentes` (campo já existente), `status` (já existente) e
  `regrasProSaude.tetoFamiliar`/`valorPlano` (já existentes) são a única fonte — `visoes-gerenciais.ts`
  só agrega, nunca recalcula essas regras de negócio.

**Testado manualmente no navegador:** confirmado que a tabela por operadora fecha
matematicamente (somas de titulares/dependentes/ativos/inativos por operadora batendo com os
indicadores de topo: 7 titulares, 3 ativos, 4 inativos, percentuais 28,6%/28,6%/28,6%/14,3%
somando 100,0%); confirmado que "Por faixa etária" mostra a explicação de pendência de dados, em
vez de qualquer número; confirmado que "Servidores no teto" mostra 1 de 7 (14,3%), Fernanda Lima
corretamente listada (R$ 5.120,00 ≥ R$ 4.000,00). `npx tsc --noEmit` e `npm run build` limpos (só
os 2 erros pré-existentes).

### 3.13 Correção — faixa etária real (dado cadastral, não fictício) e situação funcional × status operacional (revisada em §3.14)

> **A ideia de "situação funcional" (Ativo × Aposentado, derivada de `cargo`) foi corrigida na
> §3.14 seguinte** — fundir pensionista com aposentado/inativo estava errado; o campo correto já
> existe no requerimento de primeira inclusão ("Situação do beneficiário titular", 5 categorias).
> `SituacaoFuncional`/`getSituacaoFuncional()` descritos abaixo foram **removidos**. Texto
> mantido como registro histórico; a faixa etária (`dataNascimento`, `calcularIdade()`) descrita
> aqui continua válida e não foi alterada na §3.14.

**Contexto:** a §3.12 errou em dois pontos, corrigidos aqui por instrução explícita:

1. **Data de nascimento já é coletada** nos fluxos reais de cadastro/requerimento
   (`servidorAtual.dataNascimento`, `Dependente.dataNascimento`, ambos já existentes em
   `mock-data.ts`) — o problema nunca foi "esse dado não existe no domínio", e sim que
   `ServidorListItem` (a base ampla usada por `/admin/servidores` e por este módulo) não
   carregava esse campo. A correção certa era de **modelagem**, não "registrar como pendência e
   seguir sem o número".
2. **"Ativo/Inativo" estava com o significado errado.** Nesta visão gerencial, "Inativo"
   significa **servidor aposentado** — não "cadastro inativo no sistema" (`StatusKey`, que é o
   status operacional exibido em Beneficiários/Contratos: Ativo no Sistema, Suspenso, Requer
   Atenção, Pendente de Validação etc.). Usar `status` para Ativo/Inativo funcional nesta tela
   estava semanticamente incorreto.

**Arquivos:**
- `src/lib/mock-data.ts` — `dataNascimento` **de volta** em `ServidorListItem` e nos 7 registros
  de `servidoresList`, agora documentado como campo cadastral legítimo (mesma classe de
  `cpf`/`telefone`/`email`), não como dado fabricado só para um indicador. `calcularIdade()`
  reintroduzida (recomputada sob demanda, **idade nunca persistida**). Novo tipo
  `SituacaoFuncional` (`"ativo" | "aposentado"`) e função `getSituacaoFuncional()` — **derivada
  do campo `cargo` já existente** ("Pensionista Temporário"/"Pensionista Vitalício" identificam
  aposentado), não é um dado novo/fabricado, é leitura de um campo que já estava no cadastro.
- `src/lib/visoes-gerenciais.ts` — reescrito: `getConsolidadoPorOperadora` e
  `getResumoVinculos` passam a usar `getSituacaoFuncional()` (nunca mais `status`) para
  Ativos/Inativos; nova `getConsolidadoPorFaixaEtaria()` (+ `FAIXAS_ETARIAS` exportado) usando
  `calcularIdade(s.dataNascimento)` — dado real, cálculo real.
- `src/routes/admin.relatorios.gerencial.tsx` — reescrito: tabela de faixa etária adicionada;
  rótulos trocados para "Ativos (em atividade)" / "Aposentados/Inativos", com nota explícita na
  tela separando situação funcional de status de cadastro.

**Faixas etárias** (coerentes com as regras já existentes do Pró-Saúde para dependentes — ver
`Dependente.parentesco`, `form-options.ts`: "menor de 21", "maior de 21 e menor de 24"): 0 a 20,
21 a 23, 24 a 29, 30 a 39, 40 a 49, 50 a 59, 60 ou mais.

**Limitação de dados registrada, não escondida:** a coluna "Dependentes" da tabela de faixa
etária mostra "—", não zero — `servidoresList` guarda dependentes só como uma **contagem** por
titular (`dependentes: number`), sem registro individual de data de nascimento nesta base
(diferente do cenário do Módulo de Cadastro, onde `Dependente` tem `dataNascimento` próprio).
"Total" e "% da base" desta tabela contam só titulares. Quando `servidoresList` passar a ter
dependentes como registros individuais, a mesma estrutura de tabela absorve isso sem redesenho.

**Separação de conceitos (registrada explicitamente, conforme pedido):**
- **Situação funcional** (`getSituacaoFuncional`): Ativo (em atividade) × Aposentado/Inativo —
  usada nas Visões Gerenciais (tabela por operadora e indicador de topo).
- **Status operacional do cadastro** (`ServidorListItem.status`, `StatusKey`): Ativo no Sistema,
  Suspenso, Requer Atenção, Pendente de Validação etc. — conceito **separado**, continua sendo o
  que aparece em Beneficiários/Contratos (`/admin/servidores`); não é usado nas Visões
  Gerenciais.
- As duas dimensões podem coexistir sem contradição: um servidor pode estar "Ativo no Sistema"
  (cadastro em dia) e, ao mesmo tempo, "Aposentado" (situação funcional) — ex.: Roberto Santos e
  Patrícia Costa neste seed.

**Testado manualmente no navegador:** confirmado que a tabela por operadora agora fecha com
Ativos=5/Aposentados=2 (Roberto Santos e Patrícia Costa — os dois "Pensionista..." — corretamente
contados como aposentados; os demais 5 como ativos), consistente com os indicadores de topo;
confirmado que a tabela de faixa etária soma 7 titulares com percentuais corretos (21–23: 1;
24–29: 1; 30–39: 1; 40–49: 1; 60+: 3); confirmado que a nota separando situação funcional de
status operacional aparece na tela. `npx tsc --noEmit` e `npm run build` limpos (só os 2 erros
pré-existentes).

### 3.14 Correção — Situação do Beneficiário Titular (5 categorias reais, sem fundir pensionista com aposentado)

**Contexto:** a §3.13 introduziu uma "situação funcional" binária (Ativo × Aposentado) derivada
de `cargo` conter "Pensionista". Isso estava errado por instrução explícita: **pensionista não é
aposentado** — é um tipo de titular do benefício semanticamente distinto. O campo correto já
existe no requerimento de primeira inclusão: "Situação do beneficiário titular"
(`SITUACOES_TITULAR`, `form-options.ts`, já usado em `src/routes/primeiro-acesso.tsx`), com 5
categorias: Servidor efetivo ativo, Servidor inativo, Servidor comissionado, Titular de pensão
vitalícia, Titular de pensão temporária.

**Dois conceitos separados, explicitamente (conforme pedido):**
- **Status no Pró-Saúde**: Ativo / Inativo — é `ServidorListItem.status` (`StatusKey`), o status
  **operacional do cadastro** no sistema (cadastro em dia × vínculo encerrado por exclusão).
  Exibido em Beneficiários/Contratos e na ficha do servidor.
- **Situação do beneficiário titular**: as 5 categorias acima — é a classificação funcional real
  do titular, mesmo campo já coletado no requerimento de primeira inclusão. Usada nas Visões
  Gerenciais para qualquer indicador de "população funcional".
- As duas dimensões são **independentes** — exemplo real neste seed: Maria Oliveira tem
  `status: 'ativo'` (Status Pró-Saúde: Ativo) e `situacaoBeneficiarioTitular: 'Servidor
  inativo'` (Situação do titular: Servidor efetivo inativo) ao mesmo tempo, demonstrando
  exatamente o exemplo pedido ("Status Pró-Saúde: Ativo" + "Situação do titular: Servidor
  efetivo inativo" não são contraditórios).

**Arquivos:**
- `src/lib/mock-data.ts` — `SituacaoFuncional`/`getSituacaoFuncional()` **removidos** (fundiam
  pensionista com aposentado, sem regra validada). Novo campo `situacaoBeneficiarioTitular` em
  `ServidorListItem`, tipado a partir de `SITUACOES_TITULAR` (`form-options.ts`) — **reaproveita
  o campo/vocabulário já existente**, não cria um novo. Populado nos 7 registros de
  `servidoresList`: os 2 "Pensionista..." mapeados para suas categorias reais (Roberto Santos →
  "Titular de pensão temporária", Patrícia Costa → "Titular de pensão vitalícia"); os demais como
  "Servidor efetivo ativo", exceto Maria Oliveira, ajustada para "Servidor inativo" para
  demonstrar a independência das duas dimensões (ver exemplo acima) — nenhum dado novo
  fabricado, só uma categoria diferente do mesmo vocabulário já reaproveitado. Doc-comment do
  campo `status` atualizado explicando a separação.
- `src/lib/visoes-gerenciais.ts` — reescrito: `getConsolidadoPorOperadora` não calcula mais
  Ativos/Inativos (removidos da tabela por operadora, já que colapsar as 5 categorias por
  operadora exigiria uma regra de cruzamento não validada); nova
  `getConsolidadoPorSituacaoTitular()` — tabela própria com as 5 categorias, contagem real,
  nenhuma fundida.
- `src/routes/admin.relatorios.gerencial.tsx` — reescrito: nova tabela "Consolidado por situação
  do beneficiário titular" (5 linhas); indicadores de topo simplificados para Titulares e No
  teto (removidos os cards "Ativos"/"Aposentados" que usavam o binário errado).
- `src/routes/admin.servidores.$id.tsx` — badge de status da ficha do servidor trocado de
  "Ativo no Sistema" para **"Ativo"** (via `label` do `StatusBadge`, sem alterar
  `statusLabels` global, que continua servindo outros contextos do protótipo). "Inativo"
  permanece o rótulo já correto para vínculo encerrado por fluxo de exclusão — sem mudança.

**Testado manualmente no navegador:** confirmado que a tabela "Consolidado por situação do
beneficiário titular" mostra as 5 categorias (Servidor efetivo ativo: 4, Servidor inativo: 1,
Servidor comissionado: 0, Titular de pensão vitalícia: 1, Titular de pensão temporária: 1,
somando 7); confirmado que a ficha do servidor (`/admin/servidores/12345678`) mostra o badge
"Ativo" (não mais "Ativo no Sistema"). `npx tsc --noEmit` e `npm run build` limpos (só os 2
erros pré-existentes).

### 3.15 Correção — "Histórico de Pagamentos" renomeado para "Histórico de Comprovações"

**Contexto:** o sistema não tem confirmação de que o auxílio foi efetivamente pago em folha —
só evidência de comprovação apresentada e analisada. "Histórico de Pagamentos", "Pagas"/"Não
pagas"/"Total pago" e "Situação do pagamento" afirmavam, na prática, mais do que os dados
sustentam. Correção puramente semântica/de apresentação — **o motor de análise dos comprovantes
não foi alterado**.

**Arquivos:**
- `src/lib/fechamento-pagamento.ts` — `getHistoricoPagamentos`/`LinhaHistoricoPagamentos`/
  `FiltroHistoricoPagamentos` renomeados para `getHistoricoComprovacoes`/
  `LinhaHistoricoComprovacoes`/`FiltroHistoricoComprovacoes`; campos `pagas`/`naoPagas`/
  `totalPago` renomeados para `comprovadas`/`naoComprovadas`/`valorAprovado`. A fonte de dados
  (`getExtratoServidor`, `LinhaExtrato.houvePagamento`) não mudou — só o nome exposto por esta
  camada de apresentação.
- `src/routes/admin.relatorios.extrato.index.tsx` — título "Histórico de Comprovações";
  descrição e filtro "Situação da comprovação" (opções Comprovado/Não comprovado/Em análise, em
  vez de Pago/Não pago); tabela: Matrícula \| Servidor \| Competências \| Comprovadas \| Não
  comprovadas \| Em análise \| Valor aprovado \| Ação.
- `src/routes/admin.relatorios.extrato.$matricula.tsx` (drill-down individual, preservado sem
  mudança de lógica) — "Total pago no período" → "Valor aprovado no período"; coluna "Houve
  pagamento?" → "Comprovação aprovada?"; texto introdutório reescrito para não afirmar pagamento
  em folha; breadcrumb e link "Voltar" atualizados para "Histórico de Comprovações".
- `src/routes/admin.relatorios.index.tsx` — card da Visão Geral atualizado (nome e descrição).

**Estrutura final da tabela consolidada**: Matrícula \| Servidor \| Competências \| Comprovadas \|
Não comprovadas \| Em análise \| Valor aprovado \| Ação — exatamente a pedida. "Valor aprovado"
continua somando só competências com comprovação efetivamente aprovada pelo fluxo de análise
(`houvePagamento` — nome interno mantido por não alterar o motor de análise), nunca um valor
"aprovado mas não pago".

**Testado manualmente no navegador:** confirmado que `/admin/relatorios/extrato` mostra "Histórico
de Comprovações" com as colunas renomeadas (Comprovadas/Não comprovadas/Valor aprovado) e o
filtro "Situação da comprovação"; confirmado que o drill-down individual
(`/admin/relatorios/extrato/50001`) mostra "Valor aprovado no período" e "Comprovação aprovada?",
sem nenhuma menção a pagamento em folha; confirmado que o card na Visão Geral reflete o novo
nome. `npx tsc --noEmit` e `npm run build` limpos (só os 2 erros pré-existentes).

### 3.16 Correção final — padronização integral do vocabulário de Situação do Beneficiário Titular

**Contexto:** a §3.14 introduziu `situacaoBeneficiarioTitular` reaproveitando `SITUACOES_TITULAR`,
mas a própria constante (`form-options.ts`) tinha um valor divergente do resto do domínio —
`"Servidor inativo"`, e não `"Servidor efetivo inativo"` — o que fazia o vocabulário parecer uma
variação paralela em vez de exatamente as 5 categorias oficiais. Corrigido para que **todo** o
protótipo (requerimento de primeira inclusão, seeds de `servidoresList`, Visões Gerenciais) use
literalmente as mesmas 5 strings, sem nenhuma variação.

**Fonte única de verdade confirmada**: `SITUACOES_TITULAR` (`src/lib/form-options.ts`) — agora:
Servidor efetivo ativo, **Servidor efetivo inativo**, Servidor comissionado, Titular de pensão
vitalícia, Titular de pensão temporária. `src/routes/primeiro-acesso.tsx` já consumia esse array
via `.map()` para montar o `<select>` (nunca uma lista paralela hardcoded) — só a checagem
`isInativo` comparava contra a string antiga (`"Servidor inativo"`), corrigida para
`"Servidor efetivo inativo"`. `ServidorListItem.situacaoBeneficiarioTitular`
(`mock-data.ts`) já era tipado a partir do mesmo array (`(typeof SITUACOES_TITULAR)[number]`) —
nenhuma mudança de tipo necessária, só o valor do seed da Maria Oliveira, ajustado de
`"Servidor inativo"` para `"Servidor efetivo inativo"`.

**Arquivos:** `src/lib/form-options.ts` (valor da constante corrigido + comentário reforçando
que é fonte única de verdade); `src/routes/primeiro-acesso.tsx` (`isInativo` corrigido);
`src/lib/mock-data.ts` (seed da Maria Oliveira corrigido).

**Revisão de nomenclatura antiga/derivação incorreta — nada restante:**
- Busca por `"Servidor inativo"` no código-fonte não retorna mais nenhuma ocorrência (só
  `"Servidor efetivo inativo"`, a forma correta).
- `SituacaoFuncional`/`getSituacaoFuncional()` (o binário Ativo/Aposentado que fundia
  pensionista com aposentado) já não existem desde a §3.14 — confirmado, não foram
  reintroduzidos nesta correção.
- Visões Gerenciais, ficha administrativa do servidor e seeds usam exclusivamente
  `SITUACOES_TITULAR`/`situacaoBeneficiarioTitular` para situação do titular, e
  `ServidorListItem.status`/`StatusKey` exclusivamente para Status Pró-Saúde (Ativo/Inativo) —
  nenhum cruzamento indevido entre os dois encontrado.

**Testado manualmente no navegador:** confirmado que `/admin/relatorios/gerencial` mostra
"Servidor efetivo inativo" (não mais "Servidor inativo") na tabela de situação do titular;
confirmado que `/primeiro-acesso` (fluxo "Solicitação inicial de inclusão") mostra as mesmas 5
opções, com "Servidor efetivo inativo" no mesmo lugar — vocabulário idêntico nos dois pontos.
`npx tsc --noEmit` e `npm run build` limpos (só os 2 erros pré-existentes).

## 4. Fora de escopo (decisão explícita, registrada desde já)

- **Ressarcimentos/retroativos** — motor de cálculo, casos especiais **e a própria tela
  administrativa dedicada** (correção v3: nem uma tela só de status é construída nesta rodada).
  O Extrato do Servidor (quando implementado) exibirá os registros retroativos já existentes no
  Módulo de Pagamento como parte do histórico normal, sem tela própria. Pedido explícito do
  usuário; a própria ata indica que o fluxo completo precisa de uma reunião específica com
  exemplos reais antes de ser prototipado.
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
  bloqueio automático completo).
- Exportação real de arquivo (Excel/PDF) do relatório para o NURFI — mock em toda a Parte 2,
  como em outras ações simuladas do protótipo.

## 5. Pendências

- **Faixa etária dos dependentes** (Visões Gerenciais, §3.13) — resolvida para titulares
  (`dataNascimento` real, cálculo real); dependentes continuam só como contagem por titular em
  `servidoresList`, sem data de nascimento individual — a coluna "Dependentes" da tabela de
  faixa etária mostra "—", não um número calculado. Resolver quando `servidoresList` passar a
  registrar dependentes como itens individuais (como já acontece no cenário do Módulo de
  Cadastro, `Dependente.dataNascimento`).
- **Agregação macro de Situação do Beneficiário Titular por operadora** (Visões Gerenciais,
  §3.14) — hoje as duas tabelas (por operadora e por situação do titular) são independentes; se
  a GERDAB precisar cruzar as duas dimensões (ex.: quantos "Servidor efetivo ativo" tem cada
  operadora), isso é uma extensão futura, não fabricada nesta rodada por não haver pedido
  explícito nem regra validada de como apresentar esse cruzamento.
- **`servidorAtual` (ficha do Módulo de Cadastro) não expõe "Situação do beneficiário titular"
  como campo próprio** — só `ServidorListItem`/`servidoresList` (base usada pelo Módulo de
  Relatórios) ganhou esse campo. `servidorAtual` é um objeto de formato diferente, usado só na
  ficha administrativa individual; unificar os dois cadastros não fazia parte deste pedido.
- **Evolução de Servidores no Teto ao longo de competências** (Visões Gerenciais, §3.12/§3.14) — não
  implementada porque exigiria um histórico mês a mês de `valorPlano` que não existe; só a
  fotografia atual (quantidade + percentual) foi entregue. Criar esse histórico é um passo
  futuro, não fabricado nesta rodada.
- **"Valor médio por operadora"** (Visões Gerenciais) — calculável a partir do agregado já
  existente (`valorPlano` por titular), mas omitido da tela por decisão da stakeholder (baixa
  relevância atual); ativar se essa avaliação mudar.
- **Exportação (PDF/.xlsx) de todos os relatórios do módulo** — pedido explícito do usuário
  (§3.10): todo relatório construído neste módulo deve poder ser exportado como PDF ou .xlsx.
  Nenhuma exportação real foi implementada em nenhuma etapa até aqui (Fechamento, Extrato/
  Histórico, Documentação, Beneficiários/Contratos) — todas continuam mock/simuladas, seguindo o
  mesmo tratamento de outras ações simuladas do protótipo. Quando a exportação real for
  priorizada, a de Beneficiários/Contratos deve incluir telefone/e-mail mesmo não sendo coluna
  da tabela em tela.
- **Notificação em massa** na Documentação e Pendências (§3.4) — mencionada na arquitetura do
  plano, não implementada ainda; não há função pronta a reaproveitar, criar uma nova ficaria
  para quando for explicitamente priorizado.
- **Critérios técnicos de classificação Adimplente/Inadimplente/Requer análise**
  (`fechamento-pagamento.ts`) — mapeamento tecnicamente coerente com os dados existentes, mas
  ainda não validado como regra de negócio pela stakeholder; só a estrutura de 3 grupos na UI
  está aprovada.
- **Se "Requer análise" deve bloquear o fechamento da competência** — implementado como
  recomendação do plano (`podeFecharCompetencia()`), não como regra já confirmada.
  - Se a stakeholder confirmar um critério diferente, ajustar só `fechamento-pagamento.ts`
    (`statusRequerAnalise`/`statusAdimplente`/`statusInadimplente` e a checagem de "sem
    comprovante") — a tela (`admin.relatorios.pagamentos.tsx`) não precisa mudar.
- **Vocabulário fechado de "Situação"** na aba Inadimplentes — hoje só "Suspender" é produzido
  automaticamente; confirmar com a GERDAB se há outros valores usados na prática.
- **Significado da coluna "QT"** — tratada como sequencial de exibição, não indicador (ver 3.1).
- **"Competência de pagamento"** distinta de "competência de referência" — hoje exibe o mesmo
  valor; confirmar se a distinção existe na prática antes de criar um campo novo.
- **Formato/colunas exatas do relatório entregue ao NURFI** além dos campos já implementados
  (Matrícula, Nome, Valor, Situação, Motivo, Observação) — não definido, nem inventado.
- **Finalidade exata do "Relatório IRPF"** do SISPRO — a futura consolidação em "Documentação e
  Pendências" é interpretação atual, não substituição definitivamente validada.
- Identificador de conferência (CPF vs. matrícula) resolvido só para a ASSETRAN nesta rodada —
  ver ressalva na seção 2.1.
- Periodicidade da confirmação cadastral (etapa ainda não implementada).
- Expandir `beneficiariosPagamento` para múltiplos servidores/grupos familiares — necessário
  para o Fechamento de Pagamento (e as Visões Gerenciais, quando implementadas) refletirem a
  escala real da GERDAB; hoje o cenário tem só 1 servidor titular (ver 3.1).
- **Modelo `.xlsx` definitivo da planilha de associações + validação automática por OCR na
  conferência** (seção 2.3) — planejado para uma rodada futura; até lá, a lista de campos
  exibida na tela (5 campos essenciais) é só uma simplificação da comunicação ao usuário, e a
  validação da conferência continua sendo simulada (`dadosSimulados` fixo), não real.

## 6. Backlog de refinamento (rodada posterior)

Ajustes visuais/funcionais menores identificados durante a implementação, mas conscientemente
adiados para uma rodada de refinamento — a estrutura funcional atual foi validada pelo usuário
como adequada; estes são polimentos, não bloqueadores.

- **Aviso técnico sobre a massa reduzida de dados** (`admin.relatorios.pagamentos.tsx`, banner
  "O cenário de dados do Módulo de Pagamento hoje cobre 1 grupo familiar...") — retirar da
  interface final voltada ao usuário. A informação continua registrada apenas na documentação
  (seção 3.1 acima e seção 5, "Expandir `beneficiariosPagamento`...") — o código/UI não deve
  expor esse tipo de nota técnica ao usuário final.
- **Campos ainda não definidos, apresentados como "(a validar)"** (ex.: coluna "Competência de
  pagamento" na aba Adimplentes, "QT (a validar)" na aba Inadimplentes) — devem ser **ocultados**
  da interface final enquanto não confirmados com a stakeholder, em vez de exibidos com um rótulo
  "(a validar)" visível ao usuário. Ajustar quando essas colunas forem confirmadas ou descartadas
  (seção 5, pendências correspondentes).
