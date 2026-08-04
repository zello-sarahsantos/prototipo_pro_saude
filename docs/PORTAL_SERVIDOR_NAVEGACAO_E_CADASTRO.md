# Documentação Técnica — Navegação do Portal do Servidor e Módulo de Cadastro

> **Última atualização:** 2026-08-03 (via sessão de desenvolvimento assistido)
> **Branch de trabalho:** `feature-modulo-pagamentos`
> **Escopo:** este documento cobre mudanças no Portal do Servidor e no Módulo de Cadastro que **não pertencem ao Módulo de Pagamento** (documentado separadamente em `docs/MODULO_PAGAMENTO.md`). Foi criado para manter os dois escopos separados — cada documento acompanha os commits do seu próprio assunto.

---

## 1. Menu inferior do Portal do Servidor — nova aba "Requerimentos"
- **Arquivo:** `src/components/ServidorLayout.tsx`.
- **Ordem atual:** Início, Pagamentos, Requerimentos, Dependentes, Meus Dados (`grid-cols-5`, antes `grid-cols-4`).
- A aba "Requerimentos" aponta para `/servidor/requerimento/novo` — a tela já existente "Novo Requerimento", com as 3 opções (Requerimento de Mudança de Plano, Inclusão de Dependente, Exclusão de Dependente/Plano).
- **Antes desta mudança**, o único ponto de entrada para "novo requerimento" era um botão flutuante (FAB) "+ Novo Requerimento", oculto em `/servidor/requerimento*`, `/servidor/pagamentos*` e `/servidor/meus-dados`, e visível apenas em `/servidor/inicio` e `/servidor/dependentes`. **Esse FAB foi removido** nesta mudança — decisão tomada para não duplicar o ponto de entrada agora que existe uma aba fixa e sempre visível no menu (se o usuário preferir manter os dois, é reversível).
- `NavTab` (mesmo arquivo) passou a considerar sub-rotas como "ativas" (`loc.pathname === to || loc.pathname.startsWith(\`${to}/\`)`), não só correspondência exata de caminho. Efeito colateral positivo: isso também corrigiu o destaque da aba "Pagamentos" ao entrar em `/servidor/pagamentos/enviar` (antes a aba apagava dentro do wizard de envio).

## 2. Correção de contraste — botão "Enviar Comprovante" (status "Requer Atenção")
- **Arquivo:** `src/routes/servidor.dependentes.tsx`.
- **Bug:** o botão usava a classe `text-warning-foreground` — cor quase branca (`oklch(0.99 0 0)` em `src/styles.css`), pensada para texto sobre um fundo `bg-warning` **sólido** — só que o botão usa fundo `bg-warning/10` (quase transparente). Resultado: texto praticamente invisível (branco quase sobre branco).
- **Correção:** trocado para `text-warning` (a cor âmbar em si) + `font-medium`, o mesmo padrão já usado em outros pontos do app para a combinação "fundo claro + borda + texto" sobre `bg-warning/10` ou `/5` (ex: `admin.comprovantes.tsx:436`, `routes/index.tsx:26`). Nenhuma outra ocorrência de `text-warning-foreground` sobre fundo claro foi encontrada no restante do código.

## 3. Requerimento de Primeira Inclusão — identificação de plano "Empresarial"
- **Tela/fluxo:** `src/routes/primeiro-acesso.tsx` (Primeiro Acesso → "Solicitação inicial de inclusão no Pró-Saúde"), passo "Plano".
- **Campo novo:** `empresarial: boolean` no estado local `plano` (default `false`), controlado por um componente `Switch` com rótulo dinâmico "Sim"/"Não", posicionado junto aos campos Operadora/Modalidade/Administradora (grid próprio, abaixo deles).
- **Aviso condicional (sem necessidade de salvar):** quando `plano.empresarial` é `true`, aparece imediatamente um bloco (`bg-amber-50 border-amber-200`, ícone `Info`) com o texto exato: *"Planos empresariais exigem o envio da fatura técnica no momento do envio de comprovantes de pagamento, pois o boleto empresarial isolado não permite identificar os valores individuais dos beneficiários."*
- **Persistência:** `handleSubmit()` grava `plano.empresarial` dentro de `TitularCadastroPlano.empresarial` via `saveTitularCadastro()` (chave `prosaude_titular_cadastro`, `src/lib/prosaude-storage.ts`). O campo `empresarial: boolean` já existia no tipo `TitularCadastroPlano` antes desta mudança, mas não era exposto nem preenchido pela UI.
- **Relação com o Módulo de Pagamento (nota de integração futura):** este campo é o equivalente "de cadastro real" da constante mock `tipoPlanoPagamento` usada no Módulo de Pagamento (ver `docs/MODULO_PAGAMENTO.md`, seções 6 e 3.17). **Hoje os dois não estão conectados** — o Módulo de Pagamento continua lendo a constante fixa `tipoPlanoPagamento` em `mock-data.ts`, não o valor gravado em `prosaude_titular_cadastro.plano.empresarial`. Ligar os dois (fazer `tipoPlanoPagamento` derivar do cadastro real) é uma oportunidade natural de evolução, registrada também nos Próximos Passos do documento do Módulo de Pagamento.
- **Regras respeitadas:** nenhum documento adicional passou a ser exigido no cadastro (o aviso é só informativo); não houve alteração de obrigatoriedade/validação dos demais campos do passo "Plano"; nenhuma tela nova foi criada.
- **Arquivos principais:** `src/routes/primeiro-acesso.tsx` (campo + aviso + gravação); `src/lib/prosaude-storage.ts` (`TitularCadastroPlano.empresarial`, já existente, agora efetivamente usado).
- **Status de commit:** já implementado e commitado em sessão/commit anterior (`61ba3a6 — Atualiza fluxo de primeiro acesso do Pró-Saúde`), antes do início do Módulo de Pagamento. Esta seção documenta retroativamente esse comportamento, que não havia sido registrado até agora.

## 4. Requerimento de Mudança de Plano — incluir novo(s) dependente(s) no mesmo requerimento
- **Tela/fluxo:** `src/routes/servidor.requerimento.novo-plano.tsx`, passo "Dependentes" (função `StepDependentes`).
- **Reuso do formulário de Inclusão de Dependente:** o formulário completo de 4 etapas (Dependente, Plano, Documentos, Revisão — com as mesmas validações de CPF/campos obrigatórios/regra de idade/tipo de laudo, e a mesma matriz `DOCUMENTOS_POR_TIPO_DEPENDENTE` renderizada via `DocumentosDependenteUploads`) foi extraído para um componente compartilhado `IncluirDependenteForm` (`src/components/IncluirDependenteForm.tsx`), com props `submitLabel?: string` e `onSubmit: (value: IncluirDependenteValue) => void`.
  - A tela original `src/routes/servidor.requerimento.incluir-dependente.tsx` agora é apenas um wrapper fino em torno desse componente (`<IncluirDependenteForm onSubmit={() => setDone(true)} />`) — nenhuma lógica de formulário duplicada.
- **Botão "+ Incluir dependente"** abaixo da lista de dependentes já cadastrados, dentro de `StepDependentes`. Cada clique adiciona um novo bloco (`{ id: string; saved: boolean; value?: IncluirDependenteValue }`) ao estado `newDependentBlocks` — múltiplos blocos são suportados (repetir o botão).
- **Renderização de cada bloco:**
  - Enquanto `!b.saved`: renderiza `<IncluirDependenteForm submitLabel="Adicionar dependente" onSubmit={...} />` **inline**, dentro da própria tela (sem modal, sem navegação).
  - Depois de confirmado (`b.saved === true`): vira um card somente-leitura com resumo (Nome, Tipo, Plano, quantidade de documentos anexados).
  - Cada bloco tem um botão de remover (ícone `X` no cabeçalho) que tira o bloco inteiro de `newDependentBlocks` — funciona tanto antes quanto depois de salvo.
- **Trava de envio:** o botão final do wizard ("Enviar para análise da GERDAB") fica **desabilitado** enquanto `hasPendingNewDependents = newDependentBlocks.some(b => !b.saved)` for verdadeiro — o servidor precisa concluir ("Adicionar dependente") ou remover cada bloco aberto antes de conseguir enviar o requerimento inteiro.
- **Dependentes já cadastrados não são afetados:** eles continuam tratados por uma estrutura totalmente separada (`dependentsData`, com ações manter/alterar/remover por dependente já `ativo`) — os novos blocos não interferem nela, e nenhuma documentação é solicitada de novo para quem já está cadastrado.
- **Persistência:** `handleSubmit()` grava `novosDependentes: newDependentBlocks.filter(b => b.saved && b.value).map(b => b.value)` (um array de `IncluirDependenteValue`) dentro de `RequerimentoMudancaPlanoDraft`, junto com `newPlanData` e `dependentsData`, via `saveRequerimentoMudancaPlano()` (chave `prosaude_requerimento_mudanca_plano`, `src/lib/prosaude-storage.ts`) — ou seja, os novos dependentes são gravados como parte do **mesmo envio/rascunho** do requerimento de mudança de plano, não como registros separados.
- **Regras respeitadas:** não altera o fluxo existente de migração/remoção de dependentes já cadastrados; reaproveita 100% do formulário e das validações da Inclusão de Dependente (não recriado do zero); nenhuma tela nova foi criada — tudo ocorre dentro do wizard já existente de Mudança de Plano.
- **Arquivos principais:** `src/routes/servidor.requerimento.novo-plano.tsx` (botão + blocos inline + envio conjunto); `src/components/IncluirDependenteForm.tsx` (formulário extraído e reutilizado); `src/routes/servidor.requerimento.incluir-dependente.tsx` (tela original, agora wrapper fino do mesmo componente); `src/lib/prosaude-storage.ts` (storage compartilhado).
- **Status de commit:** já implementado e commitado em sessão/commit anterior (`ae5d702 — Permite inclusao de dependente no requerimento de mudança de plano`), antes do início do Módulo de Pagamento. Esta seção documenta retroativamente esse comportamento, que não havia sido registrado até agora.

---

*Fim do documento.*
