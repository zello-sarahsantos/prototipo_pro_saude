# Briefing de Design e Diretrizes Visuais para Produção — Sistema Pró-Saúde

> ## Status: **Aprovado para Implementação em Produção**
> Todas as pendências de Design System identificadas na primeira versão deste documento foram
> resolvidas e aprovadas pelo responsável pelo produto. As decisões estão registradas inline, em
> cada seção afetada, e resumidas no **Log de decisões desta rodada** logo abaixo. A partir desta
> versão, nenhuma das ocorrências antigas de "A validar" listadas ali permanece em aberto como
> decisão de design — o que resta documentado como pendência é exclusivamente **negócio/escopo
> futuro** (reservado ou fora de escopo nesta entrega), nunca uma decisão visual a critério do
> desenvolvedor.

> **Propósito deste documento:** eliminar divergências visuais entre o protótipo aprovado e a
> implementação em produção. Na entrega anterior houve divergência de tipografia/fonte em relação
> ao protótipo — este documento existe para que isso não se repita, documentando exatamente o que
> já está implementado, com fonte no próprio código, sem interpretação.
>
> **Método:** todo valor abaixo foi extraído diretamente do repositório do protótipo
> (`prototipo_pro_saude`) — principalmente `src/styles.css` (tokens de design via Tailwind v4
> `@theme`), `src/routes/__root.tsx` (carregamento de fonte) e o uso real (`className`) em todas as
> telas e componentes (`src/routes/*.tsx`, `src/components/*.tsx`). **Nenhum valor foi substituído
> por boa prática genérica.** Onde o protótipo não definia algo com clareza, ou onde o próprio
> protótipo usava dois padrões diferentes para a mesma coisa, isso foi levantado como pendência e
> submetido à decisão do responsável pelo produto — nunca decidido unilateralmente. Todas essas
> pendências já foram resolvidas nesta versão (ver Log de decisões abaixo); qualquer trecho
> remanescente rotulado **"Reservado"** ou **"Fora de escopo nesta entrega"** é uma decisão de
> negócio/prioridade, não uma lacuna de especificação visual.
>
> **Stack técnica de referência (para o desenvolvedor saber o que está reproduzindo):** React 19 +
> Tailwind CSS v4 (configuração via CSS `@theme`, sem `tailwind.config.js`) + fonte Google Fonts
> "Inter". Produção não precisa usar exatamente essa stack, mas o resultado visual final —
> pixels, cores, tipografia, espaçamento — deve ser indistinguível do protótipo.

## Log de decisões desta rodada (fechamento do Design System)

| # | Tema | Decisão | Seções atualizadas |
|---|---|---|---|
| D1 | Paleta das 7 telas com cores Tailwind literais | Produção usa exclusivamente os tokens semânticos oficiais (seção 4/5). As cores literais dessas 7 telas não estabelecem padrão para novas implementações. | §11.5, §25, §27 |
| D2 | Cabeçalho de tabela (Variante A × B) | **Variante B é o padrão oficial para produção.** Variante A permanece documentada só como padrão legado encontrado no protótipo — não deve ser usada como referência para telas novas. | §13, §25, §26, §27 |
| D3 | Toast/Sonner | Manter o comportamento visual padrão da biblioteca `sonner`, sem customização adicional nesta entrega. | §17.4, §25 |
| D4 (P1) | Cards com/sem `shadow-card` | Preservar, nas telas já existentes, a presença ou ausência de sombra exatamente como está no protótipo. Para novas implementações, `shadow-card` é o padrão dos cards de conteúdo; card sem sombra só com referência equivalente no protótipo ou decisão explícita registrada. | §9, §12.2 |
| D5 (P2) | Select | Manter nesta entrega o comportamento nativo do navegador (mesmo do protótipo). Não introduzir select customizado sem requisito funcional específico ou aprovação própria. | §11.2, §25, §27 |
| D6 (P3) | Campo de data/competência | Manter `<input type="date">`/`<input type="month">` nativos nesta entrega. Não introduzir datepicker customizado. | §11.4, §27 |
| D7 (P4) | Tokens `--chart-1` a `--chart-5` | Mantidos documentados no Design System, classificados como **"Reservados — sem utilização confirmada nesta entrega"**. Não devem ser usados para criar gráficos ou novos componentes nesta entrega. | §4.4 |

Além disso, o item de **loading em skeleton** (§10.5) — que também aparecia como aberto — é
resolvido diretamente pela Regra de Fidelidade nº 1 (o protótipo é a referência; não se adiciona o
que não existe nele): **não aplicável nesta entrega**. Nenhuma tela do protótipo usa skeleton, logo
a produção reproduz o padrão real (spinner + texto descritivo), e introduzir skeleton exigiria uma
decisão nova e explícita, fora desta entrega — não é uma lacuna de especificação, é ausência de
requisito.

---

## Sumário

1. [Regras de Fidelidade ao Protótipo](#1-regras-de-fidelidade-ao-protótipo)
2. [Tipografia oficial](#2-tipografia-oficial)
3. [Hierarquia de textos](#3-hierarquia-de-textos)
4. [Paleta de cores](#4-paleta-de-cores)
5. [Cores de fundo, superfícies, bordas e divisores](#5-cores-de-fundo-superfícies-bordas-e-divisores)
6. [Espaçamento interno e externo](#6-espaçamento-interno-e-externo)
7. [Grid e largura dos conteúdos](#7-grid-e-largura-dos-conteúdos)
8. [Border-radius](#8-border-radius)
9. [Sombras](#9-sombras)
10. [Botões](#10-botões)
11. [Inputs, selects, buscas, campos de data e uploads](#11-inputs-selects-buscas-campos-de-data-e-uploads)
12. [Cards e indicadores](#12-cards-e-indicadores)
13. [Tabelas](#13-tabelas)
14. [Badges/status](#14-badgesstatus)
15. [Abas](#15-abas)
16. [Modais](#16-modais)
17. [Banners, alertas e notificações](#17-banners-alertas-e-notificações)
18. [Ícones](#18-ícones)
19. [Estados de interação](#19-estados-de-interação-hover-foco-selecionado-erro-sucesso-carregamento)
20. [Comportamento responsivo](#20-comportamento-responsivo)
21. [Navegação — menu lateral, menu inferior e breadcrumb](#21-navegação--menu-lateral-menu-inferior-e-breadcrumb)
22. [Padrões dos relatórios e telas administrativas](#22-padrões-dos-relatórios-e-telas-administrativas)
23. [Padrões do Portal do Servidor e da Área da Associação](#23-padrões-do-portal-do-servidor-e-da-área-da-associação)
24. [Diferenças visuais intencionais entre perfis](#24-diferenças-visuais-intencionais-entre-perfis)
25. [Matriz de componentes](#25-matriz-de-componentes)
26. [Checklist de validação antes de produção](#26-checklist-de-validação-antes-de-produção)
27. [Divergências entre o protótipo e possíveis padrões genéricos de framework](#27-divergências-entre-o-protótipo-e-possíveis-padrões-genéricos-de-framework)

---

## 1. Regras de Fidelidade ao Protótipo

1. **O protótipo aprovado é a referência visual da implementação.** Não é um rascunho conceitual
   — é o documento de especificação visual. Qualquer dúvida sobre "como deveria ficar" se resolve
   abrindo o protótipo e observando o comportamento real, nunca por suposição.
2. **Fonte, tamanhos, pesos, cores, espaçamentos, bordas e hierarquia visual não devem ser
   substituídos por valores aproximados.** Se o protótipo usa `text-sm` (14px), a produção não
   pode entregar 13px ou 15px "porque ficou parecido". Se a cor primária é
   `oklch(0.4 0.12 250)`, a produção não pode usar um azul genérico de framework "porque é
   próximo".
3. **Componentes de biblioteca/framework (Material UI, Ant Design, Bootstrap, componentes nativos
   de outro design system, etc.) não devem manter estilos padrão quando divergirem do protótipo.**
   Um `<Select>` de biblioteca com bordas, altura, radius ou tipografia diferentes dos definidos
   aqui deve ser restilizado até bater com o protótipo — nunca aceito "do jeito que a biblioteca
   entrega".
4. **Uma adaptação técnica só pode alterar o visual quando houver justificativa registrada.**
   Exemplo aceitável: uma limitação real de acessibilidade ou de performance que exija um ajuste
   pontual — mas isso deve ser documentado (o quê mudou, por quê, aprovado por quem), nunca uma
   decisão silenciosa do desenvolvedor.
5. **Responsividade pode reorganizar os elementos, mas não deve alterar a identidade visual nem a
   hierarquia das informações.** Uma tabela pode virar cards empilhados em mobile, uma barra
   lateral pode virar menu superior — mas cores, tipografia, radius, espaçamento internos de cada
   elemento e a ordem de importância das informações continuam as mesmas do protótipo.
6. **O desenvolvedor deve validar visualmente cada tela implementada contra o protótipo antes de
   considerar a entrega concluída.** Não é uma validação funcional (o botão funciona) — é uma
   validação pixel a pixel de tipografia, cor, espaçamento e comportamento, tela por tela, usando
   o [Checklist de validação](#26-checklist-de-validação-antes-de-produção) desta seção 26.

---

## 2. Tipografia oficial

**Família tipográfica: Inter.**

Fonte carregada via Google Fonts, com fallback declarado explicitamente no CSS — a produção deve
reproduzir exatamente esta cadeia de fallback, não substituí-la por outra:

```css
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
```

Carregamento (exatamente como está em `src/routes/__root.tsx`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
/>
```

**Pesos oficiais carregados: 400 (regular), 500 (medium), 600 (semibold), 700 (bold).** Nenhum
outro peso (300, 800, 900) é carregado ou usado em nenhuma tela do protótipo — a produção não deve
introduzir pesos fora desses 4.

**Escala de tamanhos — Tailwind v4, escala padrão (não sobrescrita no projeto).** Não há
customização de `font-size` no `@theme` de `src/styles.css` — os tamanhos abaixo são o padrão do
framework, usados tal como vêm:

| Classe utilitária | Tamanho | Line-height (padrão da classe) | Onde aparece no protótipo |
|---|---|---|---|
| `text-[10px]` (arbitrário) | 10px | — | rótulos de badge minúsculo, contadores de aba (`TabCount`), rótulos "(a validar)" |
| `text-xs` | 12px | 16px | textos auxiliares, labels de campo, metadados, `text-muted-foreground` |
| `text-sm` | 14px | 20px | **texto padrão da interface** — corpo de tabela, botões, inputs, corpo de texto geral |
| `text-base` | 16px | 24px | corpo de texto sem classe explícita (herda do `html/body`), título H1 mobile em alguns contextos |
| `text-lg` | 18px | 28px | título de seção/card (H2 em cards de conteúdo) |
| `text-xl` | 20px | 28px | H1 em telas mobile/Portal do Servidor/Área da Associação; alguns H2 de destaque |
| `text-2xl` | 24px | 32px | **H1 padrão das telas administrativas desktop** |
| `text-4xl` / `text-5xl` | 36px / 48px | — | usado uma única vez (tela de login/marca) — **caso isolado, não é padrão de tela de conteúdo** |
| `text-7xl` | 72px | — | usado uma única vez (tela 404) |

**Pesos por classe utilitária (escala padrão do Tailwind, não sobrescrita):**

| Classe | Peso numérico | Uso |
|---|---|---|
| `font-normal` (implícito, sem classe) | 400 | corpo de texto padrão |
| `font-medium` | 500 | botões, labels ativos, itens de menu ativos, valores em destaque discreto |
| `font-semibold` | 600 | títulos de card/seção (H2), nomes em negrito moderado, autor em observações |
| `font-bold` | 700 | H1 (título de página), valores monetários/numéricos de destaque, títulos de card de resumo |

**Letter-spacing:** `h1, h2, h3, h4 { letter-spacing: -0.01em; }` — aplicado globalmente a todos os
títulos via `src/styles.css`, `@layer base`. Produção deve aplicar esse tracking negativo sutil a
todo heading semântico, não apenas aos que usam classe utilitária de tamanho grande.

Um caso à parte: cabeçalhos de tabela e algumas labels usam `uppercase tracking-wide` (ex.:
`text-xs uppercase tracking-wide text-muted-foreground` — ver seção 13, Tabelas) — isso é
tracking **positivo** aplicado via utilitário Tailwind (`tracking-wide` = 0.025em), diferente do
tracking negativo dos headings. Os dois não se confundem: um é para títulos, o outro é para
rótulos em caixa alta.

**Suavização de fonte:** `-webkit-font-smoothing: antialiased;` aplicado globalmente em
`html, body` — produção deve replicar (afeta a nitidez percebida da fonte, especialmente em
pesos leves sobre fundo claro).

---

## 3. Hierarquia de textos

| Nível | Classe(s) reais no protótipo | Tamanho/peso | Cor | Uso |
|---|---|---|---|---|
| **Título de página (H1)** | `text-2xl font-bold` (desktop admin) / `text-xl font-bold` (mobile/Servidor/Associação) | 24px/700 ou 20px/700 | `text-foreground` (herdado, sem classe de cor — cor padrão do texto) | Um único H1 por tela, sempre no topo do `<header>` |
| **Subtítulo de página** | `text-sm text-muted-foreground` (às vezes `mt-1`) | 14px/400 | `--muted-foreground` | Uma linha logo abaixo do H1, explicando o propósito da tela |
| **Título de seção/card (H2)** | `text-lg font-semibold` (mais comum) ou `font-semibold` sem tamanho explícito (herda 16px do body) | 18px/600 ou 16px/600 | `text-foreground` | Título de cada bloco/card dentro da tela (ex.: "Conferência da Planilha") |
| **Rótulo de agrupamento em caixa alta** | `text-sm font-semibold uppercase tracking-wide text-muted-foreground` | 14px/600, uppercase | `--muted-foreground` | Cabeçalhos de subseção discretos (raro, casos específicos) |
| **Texto padrão / corpo** | `text-sm` (sem outra classe de tamanho) | 14px/400 | `text-foreground` (herdado) | Corpo de tabela, texto de parágrafo em cards, conteúdo geral |
| **Labels de campo de formulário** | `text-xs text-muted-foreground mb-1` (dentro de um `<span className="block ...">`) | 12px/400 | `--muted-foreground` | Sempre acima do campo, nunca ao lado |
| **Texto auxiliar/metadado** | `text-xs text-muted-foreground` | 12px/400 | `--muted-foreground` | Datas, contadores, notas de rodapé de card, texto de apoio |
| **Mensagens de erro/validação inline** | `text-xs text-destructive` ou dentro de `bg-destructive/10 text-destructive text-xs p-3 rounded-lg` | 12px/400 (ou 500 quando em destaque) | `--destructive` | Abaixo do campo com erro, ou em bloco de alerta |
| **Mensagens de sucesso** | `text-status-aprovado-fg` / `text-success` conforme contexto | 14px ou 12px | tokens de sucesso (seção 4) | Confirmações, badges de aprovado |
| **Valor numérico/monetário em destaque** | `text-2xl font-bold` (indicador de topo) ou `text-xl font-bold` | 24px/700 ou 20px/700 | `text-foreground` ou cor semântica (ex.: `text-status-aprovado-fg` para valores positivos) | Cartões de resumo, indicadores de dashboard |

**Regra geral de hierarquia (verificada em todas as telas administrativas e a maior parte das
telas do Portal do Servidor/Associação):** toda tela segue a estrutura `H1 (título) → subtítulo
opcional → conteúdo em cards/seções, cada um com seu próprio H2`. Nunca há dois H1 na mesma tela.

---

## 4. Paleta de cores

**Formato de origem: OKLCH**, definido em `src/styles.css` (`:root`). A produção deve usar os
valores OKLCH exatos abaixo — navegadores modernos (Chrome, Edge, Safari, Firefox atuais) suportam
`oklch()` nativamente em CSS. **Não converta de cabeça para hex** — isso é exatamente o tipo de
aproximação que causou a divergência anterior. Onde o próprio protótipo já registra um hex de
referência (só a cor primária), ele está indicado; os demais não têm hex declarado no código-fonte
e não devem ser inventados — use o valor OKLCH diretamente.

### 4.1 Cores de marca (primária)

| Token | Valor OKLCH (fonte da verdade) | Hex de referência (só quando o próprio código comenta) | Uso |
|---|---|---|---|
| `--primary` | `oklch(0.4 0.12 250)` | `#1B4F8A` (comentário no código) | Cor de marca principal — botões primários, links ativos, ícones de destaque |
| `--primary-foreground` | `oklch(0.99 0 0)` | — (branco quase puro) | Texto sobre fundo `--primary` |
| `--primary-light` | `oklch(0.5 0.13 250)` | `#2D6CC0` (comentário no código) | Estado hover de botões/links primários |
| `--primary-dark` | `oklch(0.28 0.1 250)` | `#0F2D52` (comentário no código) | Variante escura (uso pontual, ex.: hover alternativo) |

### 4.2 Cores semânticas de sistema

| Token | Valor OKLCH | Uso |
|---|---|---|
| `--success` | `oklch(0.5 0.15 150)` | Confirmações, aprovações fora do contexto de badge de status |
| `--success-foreground` | `oklch(0.99 0 0)` | Texto sobre fundo de sucesso |
| `--warning` | `oklch(0.62 0.18 50)` | Avisos, pendências |
| `--warning-foreground` | `oklch(0.99 0 0)` | Texto sobre fundo de aviso |
| `--destructive` | `oklch(0.52 0.22 25)` | Ações destrutivas, erros, exclusão |
| `--destructive-foreground` | `oklch(0.99 0 0)` | Texto sobre fundo destrutivo |
| `--info` | `oklch(0.5 0.14 235)` | Informativo (ex.: estado "aguardando análise") |
| `--info-foreground` | `oklch(0.99 0 0)` | Texto sobre fundo informativo |

### 4.3 Cores de badge de status (fundo + texto, sempre em par — nunca uma sem a outra)

| Token de fundo | Token de texto | Valor OKLCH (fundo) | Valor OKLCH (texto) | Status representado |
|---|---|---|---|---|
| `--status-pendente-bg` | `--status-pendente-fg` | `oklch(0.96 0.04 70)` | `oklch(0.45 0.16 50)` | Pendente / Requer Atenção |
| `--status-aprovado-bg` | `--status-aprovado-fg` | `oklch(0.95 0.04 150)` | `oklch(0.4 0.14 150)` | Aprovado / Ativo |
| `--status-rejeitado-bg` | `--status-rejeitado-fg` | `oklch(0.95 0.04 25)` | `oklch(0.45 0.18 25)` | Rejeitado |
| `--status-inativo-bg` | `--status-inativo-fg` | `oklch(0.93 0.005 240)` | `oklch(0.45 0.02 250)` | Inativo |
| `--status-analise-bg` | `--status-analise-fg` | `#fff7ed` (hex literal no código) | `#d75c00` (hex literal no código) | Em Análise — **único par de status definido diretamente em hex**, não em OKLCH |
| `--status-suspenso-bg` | `--status-suspenso-fg` | `oklch(0.93 0.03 300)` | `oklch(0.45 0.13 300)` | Suspenso |

**Nota importante:** o par "Em Análise" é o **único** definido em hex direto no código-fonte
(`#fff7ed` / `#d75c00`), enquanto todos os outros 5 pares são OKLCH. Isso não é um erro a corrigir
silenciosamente — é o valor real do protótipo e deve ser reproduzido exatamente assim.

### 4.4 Gráficos — tokens reservados, sem utilização confirmada nesta entrega

`--chart-1` a `--chart-5` existem no CSS, mas **não têm uso confirmado em nenhuma tela renderizada
hoje** (Visões Gerenciais usa tabelas, não gráficos — ver HU07 do módulo de relatórios).

**Decisão registrada:** estes tokens permanecem documentados no Design System, classificados como
**"Reservados — sem utilização confirmada nesta entrega"**. Eles **não devem ser usados para criar
gráficos ou qualquer novo componente nesta entrega** — sua presença aqui é só para preservar a
paleta caso um gráfico seja introduzido em rodada futura, não uma autorização para uso imediato.

---

## 5. Cores de fundo, superfícies, bordas e divisores

| Token | Valor OKLCH | Uso |
|---|---|---|
| `--background` | `oklch(0.98 0.005 240)` | Fundo geral da aplicação (atrás de tudo) |
| `--foreground` | `oklch(0.22 0.03 250)` | Cor de texto padrão sobre `--background` |
| `--card` | `oklch(1 0 0)` (branco puro) | Fundo de cards, tabelas, painéis — **sempre branco puro**, mais claro que o `--background` geral |
| `--card-foreground` | `oklch(0.22 0.03 250)` | Texto sobre card |
| `--popover` / `--popover-foreground` | idênticos a `--card`/`--card-foreground` | Menus suspensos, dropdowns |
| `--secondary` / `--muted` | `oklch(0.96 0.01 240)` (mesmo valor para os dois tokens) | Fundo de elementos secundários, hover suave, fundo de linha de tabela em zebra/hover |
| `--secondary-foreground` | `oklch(0.28 0.05 250)` | Texto sobre `--secondary` |
| `--muted-foreground` | `oklch(0.55 0.03 250)` | **Cor de texto auxiliar oficial** — labels, metadados, subtítulos |
| `--accent` | `oklch(0.94 0.02 245)` | Realces sutis (uso pontual) |
| `--accent-foreground` | `oklch(0.28 0.05 250)` | Texto sobre `--accent` |
| `--border` | `oklch(0.91 0.01 240)` | **Cor oficial de toda borda e divisor da aplicação** — aplicada globalmente via `* { border-color: var(--color-border); }` |
| `--input` | `oklch(0.91 0.01 240)` (mesmo valor de `--border`) | Borda de campos de formulário |
| `--ring` | `oklch(0.5 0.13 250)` | Cor do anel de foco (outline) em campos e elementos interativos |

**Regra estrutural relevante:** `src/styles.css` define, em `@layer base`, `* { border-color:
var(--color-border); }` — ou seja, **toda borda da aplicação, por padrão, usa o token `--border`**,
a menos que uma classe explícita a sobrescreva (ex.: `border-destructive/30`, `border-primary`).
Produção deve replicar esse comportamento de base, não deixar bordas com a cor padrão de
navegador/framework.

**Sidebar (só usada no menu administrativo GERDAB, ver seção 21):**

| Token | Valor OKLCH | Uso |
|---|---|---|
| `--sidebar` | `oklch(0.28 0.1 250)` | Fundo do menu lateral — tom escuro de marca, **diferente** do `--background`/`--card` claros usados no resto da aplicação |
| `--sidebar-foreground` | `oklch(0.96 0.01 240)` | Texto sobre a sidebar |
| `--sidebar-accent` | `oklch(0.34 0.1 250)` | Fundo do item de menu ativo/hover |
| `--sidebar-accent-foreground` | `oklch(0.99 0 0)` | Texto do item ativo |
| `--sidebar-border` | `oklch(0.34 0.08 250)` | Divisores dentro da sidebar |

---

## 6. Espaçamento interno e externo

**Não há uma escala de espaçamento customizada** — o protótipo usa a escala padrão do Tailwind
(múltiplos de 0.25rem/4px: `1`=4px, `2`=8px, `3`=12px, `4`=16px, `6`=24px, `8`=32px). Os valores
abaixo são os que **efetivamente aparecem no código**, não uma lista teórica de possibilidades:

| Contexto | Padrão real no código | Valor |
|---|---|---|
| **Container de página (padding externo)** | `p-4 sm:p-8` | 16px em mobile, 32px a partir de `sm` (640px) — **este é o padrão de praticamente todas as telas administrativas e a maioria das telas de fluxo** |
| **Espaçamento vertical entre blocos de uma página** | `space-y-6` (mais comum), também `space-y-4`, `space-y-3`, `space-y-2` conforme densidade do bloco | 24px entre seções principais; 16px/12px/8px entre itens dentro de um bloco |
| **Padding interno de card** | `p-4` (mais comum), `p-5`, `p-6` conforme o card | 16px / 20px / 24px |
| **Padding de célula de tabela** | `px-4 py-2` (corpo, mais comum) ou `px-4 py-3` (algumas tabelas de listagem) | 16px horizontal, 8px ou 12px vertical |
| **Padding de botão** | `px-3 py-1.5` (pequeno/compacto), `px-4 py-2` (padrão), `px-6 py-2.5` / `px-8 py-3` (grande/destaque) | ver seção 10 |
| **Gap entre ícone e texto** | `gap-1.5` (mais comum), `gap-2` | 6px / 8px |
| **Gap entre itens de grid de cartões de resumo** | `gap-3` ou `gap-4` | 12px / 16px |

**Regra prática:** o padding de página `p-4 sm:p-8` combinado com `max-w-{tamanho} mx-auto
space-y-6` é o **padrão dominante** de container de tela administrativa (visto em pelo menos 18
arquivos de rota diferentes) — qualquer tela nova em produção deve seguir esse mesmo envelope,
salvo indicação contrária explícita do protótipo para aquela tela específica.

---

## 7. Grid e largura dos conteúdos

Não há um grid de colunas formal (tipo grid system de 12 colunas) — a largura do conteúdo é
controlada por `max-w-*` + `mx-auto`. Larguras reais em uso, por frequência:

| Classe | Largura em px | Frequência de uso | Contexto típico |
|---|---|---|---|
| `max-w-7xl` | 1280px | 8 telas | Telas administrativas com tabelas largas (Servidores, Fechamento de Pagamento, etc.) |
| `max-w-6xl` | 1152px | 6 telas | Telas administrativas de conteúdo médio (fichas de detalhe) |
| `max-w-5xl` | 1024px | 3 telas | Telas intermediárias |
| `max-w-md` | 448px | 5 usos | **Todo o Portal do Servidor** (contêiner do app inteiro, não só um bloco — ver seção 23) |
| `max-w-2xl` | 672px | 4 usos | Formulários/fluxos de requerimento, telas de confirmação |
| `max-w-xl` / `max-w-3xl` | 576px / 768px | 3 cada | Telas de formulário específicas |
| `max-w-lg` / `max-w-sm` / `max-w-xs` | 512px / 384px / 320px | pontual | Modais e blocos pequenos |

**Regra por tipo de tela:**
- Telas administrativas GERDAB (`/admin/...`): `max-w-7xl` ou `max-w-6xl`, sempre com `mx-auto`.
- Telas do Portal do Servidor (`/servidor/...`) e Área da Associação em fluxo de requerimento:
  `max-w-md` (simula largura de celular mesmo em desktop) — ver seção 23 para detalhamento.
- Área de Gerenciamento da Associação (listagens administrativas tipo `/associacao/gerenciamento`):
  segue o padrão largo (`max-w-7xl`), **não** o padrão estreito do Portal do Servidor — são
  telas de uso administrativo, não do fluxo do beneficiário.

**Grade de colunas em cards de indicador:** `grid grid-cols-2` (mobile) `md:grid-cols-4` (a partir
de 768px) — visto no bloco de 4 cartões-resumo (Total/Válidos/Atenção/Não Elegíveis da HU01, e
padrão equivalente em outras telas com 4 indicadores).

---

## 8. Border-radius

Definido em `src/styles.css`, `@theme`:

| Token | Valor | Classe Tailwind correspondente | Uso típico |
|---|---|---|---|
| `--radius-sm` | 6px | `rounded-sm` | Elementos pequenos, badges de destaque menor |
| `--radius-md` | 8px | `rounded-md` | **Mais usado no protótipo (224 ocorrências)** — botões, inputs, itens de menu |
| `--radius-lg` | 12px | `rounded-lg` | Blocos de alerta, banners, tabelas de detalhamento |
| `--radius-xl` | 16px | `rounded-xl` | **Cards principais** (o card branco padrão de conteúdo) |
| `--radius-2xl` | 20px | `rounded-2xl` | Modais, cards de destaque maior |
| — | 9999px | `rounded-full` | Badges de status, avatares, botões em pílula, chips de filtro |

**Regra de uso real observada:** `rounded-md` para controles interativos (botão, input, item de
menu); `rounded-xl` para o card-contêiner de conteúdo (`bg-card rounded-xl border border-border`);
`rounded-full` para badges e chips de filtro. Não há um padrão de "tudo com o mesmo radius" — o
radius **varia por papel do elemento**, e essa variação é intencional e deve ser preservada.

---

## 9. Sombras

Definidas em `src/styles.css`, `@theme`:

| Token | Valor CSS exato | Uso |
|---|---|---|
| `--shadow-card` | `0 2px 8px rgba(15, 45, 82, 0.08)` | **Sombra padrão de todo card de conteúdo** (49 ocorrências — é o padrão dominante) |
| `--shadow-elevated` | `0 8px 24px rgba(15, 45, 82, 0.12)` | Modais, menu lateral mobile aberto, elementos flutuantes (botão "Novo Requerimento" flutuante do Portal do Servidor) |

Ambas as sombras usam a mesma cor-base (`rgba(15, 45, 82, ...)`, um azul-marinho escuro — a mesma
família da cor de marca), só variando opacidade e alcance. **Não usar sombras cinza neutras
genéricas de framework** (ex.: `box-shadow` default do Bootstrap/MUI) — a sombra tem tom de cor
próprio, sutil, alinhado à marca.

Classes utilitárias puras do Tailwind (`shadow-sm`, `shadow-md`, `shadow-lg`) também aparecem em
usos pontuais (botões com destaque, ex.: `shadow-lg shadow-primary/20`) — **estes são exceções
pontuais de componente**, não o padrão de card. O padrão de card é sempre `shadow-card`.

---

## 10. Botões

Não existe um componente `<Button>` centralizado no protótipo — os botões são construídos com
classes utilitárias repetidas de forma consistente. As variantes abaixo são as que realmente
existem no código:

### 10.1 Botão primário (ação principal)

```
bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-light
```
- Tamanhos alternativos de padding vistos: `px-3 py-2` (compacto), `px-3 py-1.5` (mais compacto,
  em contexto de tabela/inline), `px-6 py-2.5` / `px-8 py-3` (grande, ação de destaque de tela,
  ex.: "Enviar para análise da GERDAB").
- Variante em pílula (`rounded-full`): usada nos 3 links de requerimento recorrente da Área da
  Associação (HU02) — `bg-primary text-primary-foreground rounded-full shadow-card
  hover:bg-primary-light`. **É uma variante intencional**, não um erro — pedida explicitamente
  pela stakeholder como ajuste visual sobre o padrão retangular.

### 10.2 Botão secundário (ação alternativa/cancelar)

```
border border-border rounded-md px-4 py-2 hover:bg-muted
```
- Sem preenchimento de fundo, borda no token `--border`, hover com fundo `--muted`.
- Variação de tamanho: `px-3 py-2`, `px-3 py-1.5` conforme o contexto (mesma lógica do primário).

### 10.3 Botão destrutivo

Duas formas confirmadas no código, **ambas válidas conforme o contexto**:
- **Sólido** (ação destrutiva direta, ex.: confirmar exclusão): `bg-destructive
  text-destructive-foreground rounded-md px-4 py-2`.
- **Contornado** (ação destrutiva secundária, ex.: "Solicitar Exclusão" numa lista, "Solicitar
  reenvio" antes de confirmar): `border border-destructive/30 text-destructive rounded-md px-3
  py-1.5 hover:bg-destructive/5 font-medium`.

### 10.4 Estado disabled

```
disabled:opacity-50 disabled:cursor-not-allowed
```
É o padrão dominante (28 ocorrências) — opacidade 50% + cursor "not-allowed". Variações pontuais
com `disabled:opacity-70`/`disabled:opacity-60` existem, mas são exceção, não a regra — **50% é o
valor oficial**. Alguns botões também neutralizam o hover no estado disabled explicitamente:
`disabled:hover:bg-primary` (impede que o hover continue mudando a cor de um botão desabilitado).

### 10.5 Estado loading

Não há um componente de loading dedicado — o padrão é: ícone `Loader2` (lucide-react) com a classe
`animate-spin`, substituindo o ícone normal do botão, **e** o texto do botão muda para descrever a
ação em andamento (ex.: "Gerando PDF…", "Gerando Excel…"), com o próprio botão desabilitado
enquanto isso. Ver `ExportarRelatorio.tsx`:
```jsx
{gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
```
**Não há skeleton loading (placeholders cinza pulsantes) em nenhuma tela do protótipo** — nenhuma
ocorrência de `animate-pulse` foi encontrada no código.

**Decisão registrada:** skeleton loading é **não aplicável nesta entrega** — decorre diretamente da
Regra de Fidelidade nº 1 (o protótipo é a referência; não se adiciona visual que não existe nele).
Produção reproduz exclusivamente o padrão real (ícone `Loader2` girando + texto descritivo mudado,
seção 10.5 acima). Introduzir skeleton exigiria uma decisão nova e explícita em rodada futura — não
é uma lacuna de especificação visual desta entrega.

---

## 11. Inputs, selects, buscas, campos de data e uploads

### 11.1 Input de texto padrão

```
border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring
```
Fundo `--background` (não `--card`), borda no token `--input` (mesmo valor de `--border`), foco com
anel de 2px na cor `--ring` e remoção do outline nativo do navegador.

### 11.2 Select

Mesma classe do input de texto — não há estilo visual diferenciado entre `<input>` e `<select>` no
protótipo; ambos usam `border border-input rounded-md px-3 py-2 text-sm bg-background`. O
`<select>` usa a renderização nativa do navegador para a lista suspensa (sem componente customizado
de dropdown).

**Decisão registrada:** nesta entrega, manter o comportamento nativo utilizado pelo protótipo — não
introduzir componente de select customizado sem requisito funcional específico ou aprovação
própria. Se uma necessidade funcional concreta (ex.: busca dentro da lista) justificar um select
customizado em rodada futura, a aparência do campo fechado deve permanecer idêntica à do input
padrão desta seção.

### 11.3 Campo de busca

```
<div className="relative ...">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <input className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md bg-background" />
</div>
```
Ícone de lupa (lucide `Search`, 16px) posicionado absolutamente à esquerda, com o input recebendo
`pl-9` (36px de padding esquerdo) para não sobrepor o ícone. Em telas de filtro em "chip"
(`/admin/servidores`), a busca usa `rounded-full` em vez de `rounded-md` — **variação intencional
por contexto** (ver seção 13/22), não inconsistência.

### 11.4 Campo de data/competência

Usa o input nativo do navegador: `<input type="month" ...>` (seletor de competência) ou `<input
type="date" ...>`, com a mesma classe visual do input padrão. **Não há um datepicker customizado**
em nenhuma tela do protótipo — a aparência do calendário/seletor é a nativa do navegador/SO.

**Decisão registrada:** manter `<input type="date">` e `<input type="month">` nativos nesta
entrega. Não introduzir datepicker customizado.

### 11.5 Upload / dropzone

```
border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:bg-slate-50 transition cursor-pointer group
```
Único exemplo de upload no protótipo (`associacao.upload.tsx`) — **usa cores Tailwind literais
(`slate-200`, `slate-50`), não os tokens semânticos** (`--border`, `--muted`) usados no resto da
aplicação. Isso é uma divergência real dentro do próprio protótipo, registrada explicitamente na
[seção 27](#27-divergências-entre-o-protótipo-e-possíveis-padrões-genéricos-de-framework).

**Decisão registrada:** produção usa exclusivamente os tokens semânticos oficiais — `border-2
border-dashed border-border rounded-xl p-12 text-center hover:bg-muted transition cursor-pointer
group` (substituindo `border-slate-200`/`hover:bg-slate-50` pelos tokens `--border`/`--muted`). As
cores literais desta tela não estabelecem padrão para produção; a especificação oficial do
componente de upload é a classe acima, com tokens semânticos.

### 11.6 Label de campo

Sempre acima do campo (nunca ao lado), como um `<span>` separado:
```
<span className="block text-xs text-muted-foreground mb-1">Rótulo do campo</span>
```

### 11.7 Estado de erro em campo

Mensagem de erro em bloco separado abaixo do campo (não borda vermelha no próprio input, nas telas
inspecionadas): `text-xs text-destructive` ou bloco `bg-destructive/10 text-destructive text-xs p-3
rounded-lg` para mensagens mais destacadas.

---

## 12. Cards e indicadores

### 12.1 Card de conteúdo padrão

```
bg-card rounded-xl border border-border shadow-card p-{4|5|6}
```
Este é o card mais comum de toda a aplicação (fundo branco puro, borda `--border`, radius 16px,
sombra `--shadow-card`). Variações vistas: `overflow-x-auto` quando o card contém uma tabela larga;
`overflow-hidden` quando contém uma lista com itens que precisam respeitar o radius nas bordas;
`divide-y divide-border` quando o card é uma lista de itens empilhados.

### 12.2 Card sem sombra

`bg-card rounded-xl border border-border` (sem `shadow-card`) — usado em contextos de densidade
maior de cards na mesma tela, onde a sombra repetida ficaria visualmente pesada.

**Decisão registrada:** não criar uma regra visual nova para substituir o comportamento existente.
- Nas **telas já existentes**, preservar exatamente a presença ou ausência de sombra conforme está
  hoje no protótipo — não uniformizar retroativamente.
- Em **novas implementações**, `shadow-card` é o padrão dos cards de conteúdo (seção 12.1). Um card
  sem sombra só é aceitável quando houver uma referência equivalente no próprio protótipo (uma tela
  real que já resolve aquele mesmo contexto sem sombra) **ou** uma decisão explícita registrada —
  nunca por escolha livre do desenvolvedor.

### 12.3 Card de indicador/resumo

Estrutura: ícone (ou nenhum) + label em caixa alta pequena (`text-xs uppercase font-bold
tracking-wider` ou `text-[10px] uppercase font-bold tracking-wider`, cor `--muted-foreground`) +
valor grande (`text-2xl font-bold`). Ex.: cartões "Total de Registros", "Válidos", "Com Atenção",
"Não Elegíveis" (HU01); "Total processado", "Adimplentes", "Inadimplentes", "Requerem análise"
(HU03).

Quando o indicador é clicável (leva a uma lista filtrada — requisito de rastreabilidade do próprio
domínio de negócio), ele é um `<button>` com `text-left hover:opacity-80`, não um link estilizado
diferente — o hover é só uma leve redução de opacidade, sem mudança de cor de fundo.

---

## 13. Tabelas

**O protótipo contém duas variantes de cabeçalho de tabela. Decisão fechada: Variante B é o padrão
oficial de produção.**

| Variante | Classe do `<thead>` | Frequência no protótipo | Status para produção |
|---|---|---|---|
| **B — padrão oficial** | `bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground` | 3 tabelas (`/admin/servidores`, `/associacao/gerenciamento`) | **Usar em toda tabela nova ou reimplementada em produção.** |
| A — legado | `bg-muted/40 text-xs text-muted-foreground` | 10 tabelas (maioria das telas administrativas e de relatórios) | **Documentado apenas como padrão legado encontrado no protótipo — não deve ser usado como referência para novas implementações.** |

**Especificação da Variante B (oficial):** `<thead className="bg-muted/50 text-xs uppercase
tracking-wide text-muted-foreground">`, com cada `<th>` herdando esse estilo (texto em caixa alta,
`tracking-wide` = 0.025em de letter-spacing, cor `--muted-foreground`, fundo `--muted` a 50% de
opacidade). Um comparativo visual lado a lado das duas variantes, com dados reais de
Beneficiários/Contratos, foi produzido durante a validação deste Design System e confirmou a
legibilidade da Variante B nesse contexto real antes da decisão acima.

**Célula de cabeçalho (`<th>`):** `text-left px-4 py-2` (ou `py-3` em algumas tabelas) como padrão;
`text-right px-4 py-2` para colunas numéricas/monetárias; `text-center px-4 py-2` para colunas de
contagem/ícone.

**Corpo da tabela:** cada linha (`<tr>`) usa `border-t border-border` como divisor (nunca bordas
laterais, nunca `divide-y` na maioria dos casos — a exceção usando `divide-y divide-border` existe
em listas simples, não em tabelas de dados tabulares). Alinhamento de célula segue o mesmo padrão
do cabeçalho (esquerda para texto, direita para valores, centro para contagens/ícones).

**Linha clicável (navegação para detalhe):** `onClick` no próprio `<tr>` com `cursor-pointer` (via
classe `hover:bg-muted/30` no `<tr>`), com qualquer link/botão de ação dentro da linha usando
`e.stopPropagation()` para não disparar a navegação da linha duas vezes. Padrão consistente em
`/admin/servidores`, `/associacao/gerenciamento`.

**Ações por linha:** texto de link simples (`text-primary text-sm font-medium hover:underline`,
ex.: "Ver / Editar", "Ver extrato") ou ícone com `stopPropagation` (ex.: botão de copiar processo
SEI). Não há botões de ação em estilo "outline" dentro de célula de tabela — ações de linha são
sempre texto de link ou ícone, nunca um botão com borda.

**Comportamento horizontal (tabelas largas):** contêiner com `overflow-x-auto` envolvendo a
`<table>` — rolagem horizontal aparece só quando a tela é mais estreita que o conteúdo da tabela,
nunca quebra de layout. Uma versão anterior de `/admin/servidores` usou `min-w-[1500px]` forçado
com colunas fixas (`sticky left-0`/`sticky right-0`) — **esse padrão foi removido** depois da
simplificação de colunas (ver `docs/MODULO_RELATORIOS.md` §2.10) e **não deve ser reproduzido** como
padrão atual; a versão vigente da tabela cabe sem rolagem forçada em telas ≥ 1440px
aproximadamente, com `overflow-x-auto` como rede de segurança abaixo disso.

**Estado vazio de tabela:** uma única linha (`<tr>`) com `colSpan` cobrindo todas as colunas,
texto centralizado (`text-center text-muted-foreground`), às vezes com um ícone acompanhando (ex.:
`XCircle`, `FileWarning`) antes do texto.

---

## 14. Badges/status

Componente único e centralizado: `src/components/StatusBadge.tsx`. **Todo badge de status da
aplicação deve usar este mesmo componente/padrão — nunca uma variação local.**

```
inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium {cor do status}
```
com um ponto sólido (`<span className="h-1.5 w-1.5 rounded-full bg-current" />`) antes do texto,
usando `currentColor` — ou seja, o ponto sempre tem a mesma cor do texto do badge, nunca uma cor
fixa separada.

**Mapa de cor por status** (ver seção 4.3 para os valores exatos de cada token):
`pendente`→pendente, `aprovado`→aprovado, `ativo`→aprovado (mesma cor de "aprovado" — ativo e
aprovado compartilham o token visual), `rejeitado`→rejeitado, `inativo`→inativo,
`analise`→análise, `alerta`→pendente (mesma cor de "pendente"), `suspenso`→suspenso.

**Badge de situação financeira** (Adimplente/Inadimplente) é um texto colorido simples abaixo do
`StatusBadge` — não é um segundo badge/pílula (uma versão anterior chegou a ser um segundo badge
empilhado; foi simplificada para texto colorido discreto, ver `docs/MODULO_RELATORIOS.md` §2.10).
**A versão vigente é texto simples, não pílula** — não reintroduzir a pílula dupla.

**Badge numérico de contagem** (ex.: badge de aba, badge de notificação): círculo pequeno,
`h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold`
(ou `text-[9px]` no menu inferior do Portal do Servidor) — sempre vermelho (`--destructive`),
independentemente do que está sendo contado (é um indicador de "atenção necessária", não de
categoria).

---

## 15. Abas

Padrão único e consistente em 4 arquivos diferentes (Comprovantes, Fechamento de Pagamento, ficha
do servidor, ficha do beneficiário na Associação):

```
px-4 py-2(.5) text-sm font-medium border-b-2 (-mb-px) transition
```
- **Aba ativa:** `border-primary text-primary`.
- **Aba inativa:** `border-transparent text-muted-foreground hover:text-foreground`.
- O contêiner de abas tem `border-b border-border flex gap-1` (ou `overflow-x-auto` quando as
  abas podem não caber em mobile).
- Contagem/badge ao lado do rótulo da aba quando aplicável (ex.: "Adimplentes (5)", ou o
  componente `TabBadge`/`TabCount` para indicadores de pendência).

---

## 16. Modais

Padrão único, repetido em pelo menos 5 modais diferentes (edição de dados, análise de documento,
etc.):

```
<div className="fixed inset-0 bg-foreground/30 flex items-center justify-center p-4 z-50">
  <div className="bg-card rounded-2xl shadow-elevated max-w-{md|xl} w-full max-h-[90vh] overflow-y-auto">
    <header className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-card">
      ...título + botão fechar (ícone X, h-4 w-4, `p-1 hover:bg-muted rounded-md`)...
    </header>
    <div className="p-6 ...">...conteúdo...</div>
    <footer className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
      ...botões (secundário "Cancelar" + primário/destrutivo de confirmação)...
    </footer>
  </div>
</div>
```
- **Overlay:** `bg-foreground/30` (30% de opacidade do token `--foreground`, não um cinza/preto
  genérico) — é o padrão em 10 dos 11 modais encontrados. Uma única ocorrência usa `bg-foreground/50`
  — **exceção pontual**, o padrão oficial é 30%.
- **Radius do modal:** `rounded-2xl` (20px) — maior que o radius de card padrão (`rounded-xl`,
  16px), reforçando a hierarquia visual de "isto está acima do conteúdo normal da página".
- **Sombra:** sempre `shadow-elevated`, nunca `shadow-card`.
- Header e footer são `sticky` dentro do modal quando o conteúdo pode rolar (`max-h-[90vh]
  overflow-y-auto`), garantindo que título e ações de confirmação permaneçam visíveis mesmo com
  conteúdo longo.

---

## 17. Banners, alertas e notificações

### 17.1 Banner de pendência/aviso (âmbar)

Classe utilitária dedicada, definida em `src/styles.css`, `@layer components`:
```css
.pendency-banner {
  border-left: 4px solid oklch(0.75 0.16 90);
  background: oklch(0.98 0.04 95);
  color: oklch(0.32 0.08 70);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}
```
Borda esquerda grossa (4px) em tom âmbar, fundo âmbar muito claro, texto âmbar escuro, radius 8px.
Usado para avisos de pendência documental (prazo, consequência).

### 17.2 Banner de alerta destrutivo/vencido

`bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive` (ou
variações `rounded-lg p-3 text-xs` para versões mais compactas) — usado quando uma pendência está
vencida ou uma ação precisa de atenção urgente.

### 17.3 Notificações (sino)

Componente `NotificationBell` — ícone de sino com badge numérico circular (mesmo padrão de badge
de contagem da seção 14) sobreposto no canto superior direito do ícone, dropdown ao clicar (mesmo
padrão visual de popover: `bg-popover` com borda e sombra elevada).

### 17.4 Toast (mensagens de sistema)

A aplicação usa a biblioteca `sonner` para toasts (`<Toaster />` registrado em `__root.tsx`) — as
mensagens de toast seguem o estilo padrão da biblioteca, sem customização visual encontrada no
código-fonte além do registro do componente.

**Decisão registrada:** manter o comportamento visual atualmente existente — o padrão default da
biblioteca `sonner`, sem criação de customização adicional nesta entrega.

---

## 18. Ícones

**Biblioteca: `lucide-react`**, usada em pelo menos 50 arquivos do projeto — é a **única**
biblioteca de ícones em uso, sem mistura com outra (ex.: nenhum uso de Font Awesome, Material
Icons ou SVGs customizados fora do necessário).

**Tamanhos reais em uso, por frequência:**

| Classe | Tamanho | Frequência | Uso típico |
|---|---|---|---|
| `h-4 w-4` | 16px | 146 ocorrências — **tamanho padrão/dominante** | Ícones inline em botões, dentro de texto, ícones de linha de tabela |
| `h-3.5 w-3.5` | 14px | 66 ocorrências | Ícones em badges, ícones secundários dentro de blocos de texto pequeno |
| `h-5 w-5` | 20px | 35 ocorrências | Ícones de cabeçalho de seção, ícones de navegação (menu inferior, sidebar) |
| `h-3 w-3` | 12px | 24 ocorrências | Ícones minúsculos (dentro de badges pequenos, indicadores) |
| `h-6 w-6` | 24px | 12 ocorrências | Ícones de destaque maior (cabeçalho da sidebar, ícone de marca) |

**Regra de uso:** o ícone **sempre acompanha o texto**, nunca substitui um rótulo textual em ações
importantes (exceção: botões de ícone puro como "copiar", "fechar modal (X)", que são ações
universalmente reconhecíveis). `stroke-width` não é customizado — usa o padrão do lucide-react
(2px).

---

## 19. Estados de interação: hover, foco, selecionado, erro, sucesso e carregamento

| Estado | Padrão visual | Onde |
|---|---|---|
| **Hover (botão primário)** | `hover:bg-primary-light` | Todo botão primário |
| **Hover (botão secundário/borda)** | `hover:bg-muted` | Todo botão secundário |
| **Hover (linha de tabela clicável)** | `hover:bg-muted/30` | Tabelas com navegação por linha |
| **Hover (item de menu lateral)** | `hover:bg-sidebar-accent/50` (inativo) | Menu administrativo |
| **Hover (link de texto)** | `hover:underline` (mantendo `text-primary`) | Links de ação em tabela |
| **Foco (campo de formulário)** | `focus:outline-none focus:ring-2 focus:ring-ring` | Todo input/select/textarea |
| **Selecionado (aba ativa)** | `border-primary text-primary` (ver seção 15) | Abas |
| **Selecionado (item de menu ativo)** | `bg-sidebar-accent text-sidebar-accent-foreground font-medium` (admin) | Menu lateral |
| **Selecionado (chip de filtro ativo)** | `bg-primary text-primary-foreground` (vs. `bg-muted text-muted-foreground` quando inativo) | Filtros em pílula |
| **Erro** | `text-destructive` / `bg-destructive/10` (ver seção 11.7) | Mensagens de validação |
| **Sucesso** | Token `--success` ou `--status-aprovado-*`, ícone `CheckCircle2` (lucide) em verde | Confirmações |
| **Carregamento (botão)** | Ícone `Loader2` com `animate-spin` + texto descritivo mudado (ver seção 10.5) | Exportação, envio de formulário |
| **Disabled** | `disabled:opacity-50 disabled:cursor-not-allowed` (ver seção 10.4) | Botões e campos desabilitados |

---

## 20. Comportamento responsivo

**Breakpoints reais em uso (padrão do Tailwind, não customizados):** `sm` (640px) — 87 ocorrências,
o breakpoint mais usado de longe; `md` (768px) — 22 ocorrências; `lg` (1024px) — 22 ocorrências,
usado quase exclusivamente para o comportamento da sidebar administrativa. **Não há uso de `xl`
(1280px) em nenhuma tela** — produção não deve introduzir um breakpoint adicional sem necessidade
comprovada.

**Padrões de reorganização confirmados:**
- **Container de página:** `p-4 sm:p-8` — dobra o respiro nas laterais a partir de 640px, sem
  mudar a hierarquia do conteúdo.
- **Grid de cards de indicador:** `grid-cols-2 md:grid-cols-4` — 2 colunas em mobile, 4 a partir de
  768px.
- **Formulários em duas colunas:** `grid grid-cols-1 sm:grid-cols-2` — campos empilhados em
  mobile, lado a lado a partir de 640px.
- **Menu administrativo (sidebar):** oculto por padrão em telas menores que `lg` (1024px),
  substituído por um cabeçalho fixo (`lg:hidden`) com botão hambúrguer que abre a sidebar como
  overlay (`{open ? "block" : "hidden"} lg:flex`). A partir de `lg`, a sidebar fica sempre visível,
  fixa à esquerda (`lg:sticky lg:top-0`), 256px de largura (`lg:w-64`).
- **Portal do Servidor:** não tem breakpoint de "expansão" — permanece com largura de celular
  (`max-w-md mx-auto`) **mesmo em telas desktop grandes**, com uma sombra elevada (`shadow-elevated`)
  emoldurando o "cartão" central, simulando visualmente um dispositivo móvel centralizado na tela.
  **Esta é uma decisão intencional do protótipo, não uma limitação a corrigir** — replicar em
  produção, salvo decisão explícita em contrário.

---

## 21. Navegação — menu lateral, menu inferior e breadcrumb

### 21.1 Menu lateral (GERDAB administrativo — `AdminLayout`)

- **Desktop (`lg` e acima):** sidebar fixa, 256px (`w-64`), fundo `--sidebar` (tom escuro de
  marca), sempre visível, com o topo mostrando "DETRAN • GERDAB" + "Pró-Saúde Admin", os itens de
  navegação no meio, e o rodapé com nome/cargo do usuário logado + botão "Sair".
- **Mobile (abaixo de `lg`):** cabeçalho fixo no topo (`sticky top-0 z-40`), mesmo fundo escuro,
  com botão hambúrguer que abre/fecha a sidebar como um painel (`open ? "block" : "hidden"`), sem
  overlay semitransparente próprio (o painel ocupa a tela ao abrir).
- **Itens de menu:** ícone (20px, `h-5 w-5` — nota: os ícones de item de menu real usam `h-4 w-4`
  no corpo da nav, `h-5 w-5`/`h-6 w-6` só no cabeçalho de marca) + label, com o item ativo
  determinado por `pathname.startsWith(item.to)` (ativa também em sub-rotas).
- **Itens variam por papel:** "Parâmetros" só aparece para o papel "gerência" — ver seção 24.

### 21.2 Menu inferior (Portal do Servidor — `ServidorLayout`)

- Fixo na base da tela (`fixed bottom-0`), `grid-cols-5`, fundo `bg-card`, borda superior
  `border-t border-border`.
- 5 itens: Início, Pagamentos, Requerimentos, Dependentes, Meus Dados — cada um com ícone (20px) +
  label (`text-[11px]`), cor `text-primary font-semibold` quando ativo, `text-muted-foreground`
  quando inativo.
- Badge numérico (mesmo padrão da seção 14) sobreposto ao ícone quando há pendência (ex.:
  competências pendentes em "Pagamentos").
- Botão de ação flutuante ("Novo Requerimento") fixo acima do menu inferior
  (`fixed bottom-20 right-4`), pílula (`rounded-full`), com `shadow-elevated`.
- **Este menu tem exatamente 5 itens — não 6.** Uma versão intermediária do protótipo chegou a ter
  um 6º item ("Relatórios"), que foi **revertida** por gerar redundância e prejudicar o layout
  mobile (ver `docs/MODULO_RELATORIOS.md` §3.7/§3.8). **Produção não deve reintroduzir esse item.**

### 21.3 Breadcrumb

Não há um componente de breadcrumb genérico reutilizado em todo o app — o único breadcrumb
confirmado no código é condicional e contextual: em `/admin/servidores`, quando o acesso vem do
Módulo de Relatórios (`?origem=relatorios`), aparece um texto `text-xs text-muted-foreground` com
um link "Relatórios" (`hover:text-primary hover:underline`) seguido de "› Beneficiários /
Contratos". Outro padrão de breadcrumb existe no Extrato do Servidor ("Relatórios → Histórico de
Comprovações → Extrato Individual", ver `docs/MODULO_RELATORIOS.md` §3.6) usando o mesmo estilo de
texto. **Não há um componente `<Breadcrumb>` isolado** — é sempre construído inline, com esse
mesmo estilo de texto pequeno e cinza com links.

---

## 22. Padrões dos relatórios e telas administrativas

- **Container:** `p-4 sm:p-8 max-w-7xl mx-auto space-y-6` (padrão dominante, seção 6/7).
- **Cabeçalho de tela:** H1 (`text-2xl font-bold`) + subtítulo (`text-sm text-muted-foreground`),
  com controles de filtro/seletor de competência alinhados à direita do cabeçalho em telas largas
  (`flex flex-col sm:flex-row sm:items-end sm:justify-between`).
- **Ação de exportação (`ExportarRelatorio`):** botão único "Exportar ▾" (ícone `Download` +
  `ChevronDown`), estilo de botão secundário com borda (`border border-border rounded-md px-3 py-2
  hover:bg-muted`), abrindo um menu suspenso (mesmo padrão visual de popover: `bg-popover border
  border-border rounded-md shadow-elevated`) com 2 itens: "PDF" (ícone `FileText`) e "Excel
  (.xlsx)" (ícone `FileSpreadsheet`). **Nunca dois botões grandes separados** — é sempre esta ação
  única em menu.
- **Documento PDF/XLSX exportado:** identidade institucional própria, especificada e já aprovada
  em `docs/MODULO_RELATORIOS.md` §3.17/§3.18 (cabeçalho institucional, título centralizado, bloco
  de parâmetros, tabela com cabeçalho repetido, rodapé paginado) — **este padrão é do documento
  exportado, não da tela em si**, e já está implementado; não repetido aqui por já estar
  detalhado na documentação do módulo.
- **Filtros:** chips em pílula (`rounded-full`) para seleção rápida de status/vínculo (ex.: "Todos
  | Ativos | Inativos"), com `bg-primary text-primary-foreground` quando ativo e `bg-muted
  text-muted-foreground` quando inativo. Filtros de seleção mais ampla (Status, Associação,
  Operadora) usam `<select>` padrão (seção 11.2), também em formato pílula
  (`rounded-full px-3.5 py-2`) nas telas mais recentes (`/admin/servidores`).
- **Indicadores/resumo no topo da tela:** sempre em cards de indicador (seção 12.3), nunca texto
  solto — e sempre que um indicador representa uma contagem, ele é clicável e leva à lista
  filtrada correspondente (requisito de rastreabilidade documentado nas HUs do módulo).

---

## 23. Padrões do Portal do Servidor e da Área da Associação

### 23.1 Portal do Servidor

- **Contêiner do app inteiro:** `min-h-screen bg-background flex flex-col max-w-md mx-auto
  shadow-elevated` — a aplicação inteira (não só um componente) é limitada a 448px de largura,
  centralizada, com sombra elevada emoldurando o "cartão" — visualmente um celular, mesmo em
  desktop (ver seção 20).
- **Cabeçalho fixo:** `bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10`, com "DETRAN
  • Pró-Saúde" (opacidade 80%) + "Portal do Servidor" (`text-base font-semibold`) + sino de
  notificações à direita.
- **Menu inferior:** ver seção 21.2.
- **Botão de ação flutuante:** ver seção 21.2.
- **Padding de conteúdo:** telas internas usam `p-4` simples (não `p-4 sm:p-8` — não há salto de
  padding em telas maiores, já que a largura já é fixa em 448px).

### 23.2 Área da Associação

- **Duas naturezas de tela distintas dentro do mesmo perfil:**
  - Telas de **gestão/listagem** (Gerenciamento ASSETRAN, Upload de Planilha): seguem o padrão
    **largo** das telas administrativas (`max-w-6xl`/`max-w-7xl`, cards `bg-card rounded-xl border
    border-border shadow-card`) — visualmente mais próximas do padrão GERDAB do que do Portal do
    Servidor.
  - Telas de **fluxo/requerimento** (Nova Inclusão de Beneficiário, que reaproveita `FlowInclusao`):
    seguem o padrão **estreito** (`max-w-2xl`), igual ao requerimento padrão do Portal do Servidor
    — porque literalmente é o mesmo componente reaproveitado (ver `docs/MODULO_RELATORIOS.md`
    §2.4).
- Este é o único perfil que mistura os dois padrões de largura na mesma navegação — **não é uma
  inconsistência a corrigir**, é reflexo direto de a Associação ter, ao mesmo tempo, uma função de
  gestão administrativa (larga) e uma função de preenchimento assistido de requerimento (estreita,
  reaproveitando o componente do servidor).

---

## 24. Diferenças visuais intencionais entre perfis

| Aspecto | GERDAB (Admin) | Servidor | Associação |
|---|---|---|---|
| Largura do app | Larga (`max-w-6xl`/`max-w-7xl`), sem limite artificial de "moldura" | Estreita e fixa (`max-w-md`), com moldura de sombra simulando celular | Mista — larga nas telas de gestão, estreita nos fluxos de requerimento reaproveitados |
| Navegação principal | Sidebar lateral (desktop) / painel via hambúrguer (mobile) | Menu inferior fixo (5 itens) + botão de ação flutuante | Sem menu inferior nem sidebar — navegação por link/botão de topo de página |
| Cor de fundo do cabeçalho de navegação | `--sidebar` (escuro, tom de marca) | `--primary` (azul de marca) no cabeçalho fixo do topo | Sem cabeçalho fixo colorido — cabeçalho de página normal (fundo `--background`) |
| Itens de menu variam por papel | Sim — "Parâmetros" só para papel "gerência" (`getAdminRole()`) | Não há papéis distintos dentro do Portal do Servidor | Não há papéis distintos dentro da Área da Associação |
| Densidade de informação por tela | Alta (tabelas largas, múltiplos filtros) | Baixa (uma ação/informação por vez, cards empilhados) | Alta nas telas de gestão; baixa nos fluxos de requerimento |

Essas diferenças são **decisões de arquitetura de informação já validadas** (ver
`docs/MODULO_RELATORIOS.md` §3.6, "Correção arquitetural — separação de perfis") — não devem ser
uniformizadas em produção "para simplificar". Cada perfil tem uma proposta de uso diferente
(consulta administrativa consolidada vs. autoatendimento individual vs. atendimento assistido) e a
diferença visual reforça essa distinção para quem usa o sistema.

---

## 25. Matriz de componentes

| Componente | Onde aparece | Especificação visual | Comportamento | Responsividade | Referência no protótipo | Status |
|---|---|---|---|---|---|---|
| Botão primário | Toda ação principal de tela/formulário | `bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-light` | Hover muda para `--primary-light`; disabled = opacidade 50% + cursor not-allowed | Não reflui — mesmo tamanho em toda largura de tela | `associacao.upload.tsx`, dezenas de outros | Confirmado |
| Botão primário em pílula | 3 links de requerimento recorrente (Área da Associação) | Mesma base + `rounded-full shadow-card` | Igual ao primário padrão | Empilha em `flex-wrap` quando não cabe | `associacao.gerenciamento.$id.tsx` | Confirmado (variante intencional) |
| Botão secundário | Cancelar, "Voltar", ações alternativas | `border border-border rounded-md px-4 py-2 hover:bg-muted` | Hover = fundo `--muted` | Igual ao primário | Múltiplos arquivos | Confirmado |
| Botão destrutivo sólido | Confirmação de exclusão | `bg-destructive text-destructive-foreground rounded-md px-4 py-2` | — | — | Modais de confirmação | Confirmado |
| Botão destrutivo contornado | "Solicitar Exclusão", "Solicitar reenvio" | `border border-destructive/30 text-destructive rounded-md px-3 py-1.5 hover:bg-destructive/5` | — | — | `admin.servidores.$id.tsx` | Confirmado |
| Input de texto | Todo formulário | `border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring` | Foco = anel `--ring` 2px | Campos empilham em mobile (`grid-cols-1 sm:grid-cols-2`) | Múltiplos arquivos | Confirmado |
| Select | Filtros e formulários | Mesma classe do input de texto | Lista nativa do navegador | Igual ao input | `admin.servidores.index.tsx` | Aprovado para produção (manter nativo — sem customização nesta entrega) |
| Campo de busca | Listagens administrativas | Ícone `Search` 16px + input `pl-9` | — | — | `admin.servidores.index.tsx`, `associacao.gerenciamento.index.tsx` | Confirmado |
| Upload/dropzone | Envio de planilha | `border-2 border-dashed border-border rounded-xl p-12` (tokens semânticos) | Hover = fundo `--muted` | — | `associacao.upload.tsx` (cores literais da tela **não** são a especificação oficial — ver seção 27) | Aprovado para produção (tokens semânticos) |
| Card de conteúdo | Praticamente toda tela | `bg-card rounded-xl border border-border shadow-card p-{4-6}` | — | Empilha verticalmente, nunca vira grid forçado sem indicação | Onipresente | Confirmado |
| Card de indicador | Cabeçalhos de dashboard/resumo | Label pequeno uppercase + valor `text-2xl font-bold` | Clicável quando representa uma lista (leva ao filtro) | `grid-cols-2 md:grid-cols-4` | `associacao.upload.tsx`, `admin.relatorios.pagamentos.tsx` | Confirmado |
| Tabela (cabeçalho — padrão oficial) | Toda tabela nova/reimplementada | `bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground` (Variante B) | — | `overflow-x-auto` no contêiner | `admin.servidores.index.tsx`, `associacao.gerenciamento.index.tsx` | **Aprovado para produção** |
| Tabela (cabeçalho — legado) | Maioria das tabelas do protótipo hoje | `bg-muted/40 text-xs text-muted-foreground` (Variante A) | — | Igual | 10 tabelas | **Legado — não usar como referência para novas implementações** |
| Linha de tabela clicável | Listagens com drill-down | `<tr onClick>` + `hover:bg-muted/30` + `cursor-pointer` | Ações internas usam `stopPropagation` | — | `admin.servidores.index.tsx` | Confirmado |
| Badge de status | Toda indicação de status | `rounded-full px-2.5 py-0.5 text-xs font-medium` + ponto `currentColor` | Cor conforme mapa de status (seção 14) | — | `StatusBadge.tsx` | Confirmado |
| Badge de contagem | Abas, sino, menu inferior | Círculo `h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px]` | Some quando contagem é zero | — | `TabBadge`, `TabCount`, `NavTab` | Confirmado |
| Aba | Fechamento de Pagamento, ficha do servidor, comprovantes | `border-b-2` com `border-primary text-primary` (ativa) / `border-transparent text-muted-foreground` (inativa) | Troca de conteúdo abaixo, badge de contagem opcional | `overflow-x-auto` quando necessário | 4 arquivos | Confirmado |
| Modal | Edição, análise de documento, confirmações | Overlay `bg-foreground/30` + painel `bg-card rounded-2xl shadow-elevated` | Header/footer `sticky`, fecha por X ou clique fora (conforme implementação) | `max-w-{md,xl} w-full`, `max-h-[90vh] overflow-y-auto` | 5+ modais | Confirmado |
| Banner de pendência | Aviso de documentação/prazo | Classe `.pendency-banner` (borda esquerda âmbar 4px) | — | — | `styles.css` | Confirmado |
| Menu lateral (sidebar) | Navegação GERDAB | Fundo `--sidebar`, item ativo `bg-sidebar-accent` | Ativa em sub-rotas (`startsWith`) | Colapsa para painel via hambúrguer abaixo de `lg` | `AdminLayout.tsx` | Confirmado |
| Menu inferior | Navegação Portal do Servidor | `grid-cols-5`, ícone 20px + label 11px | Badge de pendência sobre ícone | Fixo, não reflui | `ServidorLayout.tsx` | Confirmado |
| Breadcrumb | Navegação contextual (Relatórios → X) | `text-xs text-muted-foreground` + link `hover:text-primary hover:underline` | Condicional via query param | — | `admin.servidores.index.tsx` | Confirmado (sem componente isolado) |
| Ação de exportação | Todas as telas de relatório (HU03-HU08) | Botão secundário "Exportar ▾" + menu com 2 itens (PDF/Excel) | Loading com `Loader2` + texto mudado | — | `ExportarRelatorio.tsx` | Confirmado |
| Toast | Mensagens de sistema | Padrão default da biblioteca `sonner` | — | — | `__root.tsx` (`<Toaster />`) | **Aprovado para produção** (manter padrão default, sem customização adicional) |

---

## 26. Checklist de validação antes de produção

Usar tela a tela, comparando lado a lado com o protótipo real (não com um print estático — abrir o
protótipo rodando e o ambiente de produção lado a lado):

- [ ] **Fonte correta:** Inter carregada, com o fallback completo (`ui-sans-serif, system-ui,
      sans-serif`), nunca uma fonte do sistema operacional sozinha.
- [ ] **Pesos corretos:** apenas 400/500/600/700 em uso; nenhum peso 300, 800 ou 900 aparecendo.
- [ ] **Tamanhos de texto:** H1 em 24px (desktop admin) ou 20px (mobile/Servidor/Associação);
      corpo em 14px; labels/auxiliares em 12px — conferir com DevTools, não a olho.
- [ ] **Cores:** primária, semânticas e de status batendo com os valores OKLCH da seção 4 —
      conferir com um color picker sobre a tela renderizada, não por comparação visual.
- [ ] **Espaçamentos:** padding de página `16px`/`32px` (mobile/desktop), espaçamento entre seções
      em `24px`, padding de card em `16-24px` conforme a seção 6.
- [ ] **Alinhamentos:** colunas numéricas/monetárias alinhadas à direita, texto à esquerda,
      contagens/ícones ao centro — nas tabelas.
- [ ] **Bordas e radius:** `--border` em toda borda padrão; `rounded-md` em controles, `rounded-xl`
      em cards, `rounded-full` em badges/chips, `rounded-2xl` em modais.
- [ ] **Ícones:** biblioteca lucide-react (ou equivalente com o mesmo traço/peso visual), tamanhos
      16px (padrão), 20px (cabeçalhos/navegação), nunca ícones de outra família misturados.
- [ ] **Estados de interação:** hover, foco (anel visível), disabled (opacidade 50%) presentes e
      com a cor/comportamento certos em todo elemento interativo.
- [ ] **Tabelas:** cabeçalho na **Variante B** (`bg-muted/50 text-xs uppercase tracking-wide
      text-muted-foreground` — padrão oficial de produção, ver seção 13), linha `border-t`, linha
      clicável com `stopPropagation` nas ações internas.
- [ ] **Responsividade:** breakpoints em 640px/768px/1024px reproduzindo exatamente as
      reorganizações descritas na seção 20 (não outros breakpoints arbitrários).
- [ ] **Ausência de scroll horizontal desnecessário:** tabelas só rolam horizontalmente quando a
      tela é mais estreita que o conteúdo real — nunca uma barra de rolagem por overflow acidental
      de layout.
- [ ] **Comportamento em mobile:** Portal do Servidor mantém a largura de "celular" mesmo em
      desktop (não expande para ocupar a tela); menu inferior com 5 itens, nunca mais.
- [ ] **Fidelidade de modais:** overlay em 30% de opacidade do `--foreground`, painel com
      `rounded-2xl` e `shadow-elevated`, header/footer fixos quando o conteúdo rola.
- [ ] **Estados vazios:** mensagem centralizada, com ícone quando o protótipo tiver ícone, nunca
      uma tabela/lista simplesmente em branco sem texto.
- [ ] **Loading:** ícone `Loader2` girando + texto descritivo mudado (nunca skeleton, a menos que
      explicitamente decidido em contrário — ver seção 10.5).
- [ ] **Disabled:** opacidade 50%, cursor "not-allowed", sem hover ativo, em todo botão/campo
      desabilitado.
- [ ] **Mensagens de erro/sucesso:** cor `--destructive`/`--success` (ou tokens de status
      correspondentes), nunca vermelho/verde genéricos de framework.

---

## 27. Divergências entre o protótipo e possíveis padrões genéricos de implementação

Situações reais, encontradas no próprio código do protótipo, em que um desenvolvedor — seguindo o
padrão default de um framework/biblioteca, ou copiando a tela "errada" como referência — entregaria
algo visualmente diferente do restante do sistema:

1. **`associacao.upload.tsx` usa cores Tailwind literais (`slate-*`, `green-*`, `amber-*`,
   `red-*`) em vez dos tokens semânticos** (`--background`, `--card`, `--muted-foreground`,
   `--success`, `--warning`, `--destructive`) usados no resto da aplicação. Um desenvolvedor que
   usasse esta tela como referência de "cor de fundo"/"cor de texto secundário" reproduziria uma
   paleta cinza-azulada (`slate`) sutilmente diferente da paleta oficial (`oklch` com leve matiz
   azul de marca) usada em todo o restante do sistema. **Mesmo problema afeta:**
   `IncluirDependenteForm.tsx`, `associacao.tsx`, `primeiro-acesso.tsx`, `servidor.inicio.tsx`,
   `servidor.requerimento.exclusao.tsx`, `servidor.requerimento.novo-plano.tsx` — 7 arquivos ao
   todo usam paleta literal em vez de tokens. **Decisão fechada (ver Log de decisões):** produção
   usa exclusivamente os tokens semânticos (seção 4/5) — as cores literais dessas 7 telas **não**
   estabelecem padrão para novas implementações, mesmo aparecendo hoje no código do protótipo.
2. **Duas variantes de cabeçalho de tabela coexistiam no protótipo** (seção 13) — um desenvolvedor
   que copiasse uma tabela mais antiga como modelo entregaria cabeçalhos em minúsculas normais;
   copiando uma mais recente, entregaria uppercase com tracking. **Decisão fechada (ver Log de
   decisões):** a Variante B (`bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground`)
   é o padrão oficial de produção; a Variante A permanece só como referência histórica do
   protótipo, nunca como modelo para tela nova.
3. **Um componente de UI framework (ex.: Material UI `<Button>`, Ant Design `<Select>`, Bootstrap
   `.btn`) traz, por padrão, seu próprio radius, sombra, tipografia e paleta.** Nenhum desses
   defaults bate com os valores desta especificação (radius 8px em controles, sombra com tom azul
   de marca, Inter em vez da fonte padrão do framework, paleta OKLCH em vez da paleta padrão do
   framework). Se a implementação usar uma biblioteca de componentes, **todo componente usado
   precisa ser restilizado**, nunca aceito com o visual "de fábrica" da biblioteca.
4. **Radius genérico "tudo igual"** é um padrão comum de frameworks de UI (definir um único
   `--radius` global e aplicá-lo a tudo). O protótipo **não** faz isso — usa 5 valores de radius
   diferentes por papel do elemento (seção 8). Aplicar um radius único a todos os componentes
   divergiria visivelmente do protótipo em botões (que ficariam menos ou mais arredondados que o
   esperado) e em badges (que precisam ser `rounded-full`, nunca um radius fixo em px).
5. **Sombra genérica de framework** (cinza neutra, tipo `0 1px 3px rgba(0,0,0,0.1)`) é o padrão
   default de praticamente todo design system de mercado. O protótipo usa uma sombra com **tom de
   cor de marca** (`rgba(15, 45, 82, ...)`, seção 9) — uma sombra cinza neutra genérica ficaria
   perceptivelmente "mais fria" que o protótipo.
6. **Datepicker/dropdown customizado de biblioteca** — **decisão fechada nesta entrega (ver Log de
   decisões):** manter o `<select>` e os campos de data nativos do navegador, exatamente como no
   protótipo — nenhum componente customizado de data ou de select deve ser introduzido sem
   requisito funcional específico ou aprovação própria. Registrado aqui como lembrete de risco:
   caso uma necessidade funcional concreta justifique um desses componentes em rodada futura, o
   estilo *fechado* (o campo antes de abrir) precisa continuar idêntico ao input padrão (seção
   11.2/11.4) — bibliotecas desse tipo comumente trazem bordas, altura de campo e ícones próprios,
   diferentes do padrão aqui documentado.
7. **Skeleton loading (placeholders cinza pulsantes)** é um padrão extremamente comum em produção
   moderna, mas **não existe em nenhuma tela do protótipo** (nenhuma ocorrência de `animate-pulse`
   encontrada). **Decisão fechada (ver Log de decisões):** não aplicável nesta entrega — produção
   reproduz exclusivamente o padrão real (spinner + texto descritivo, seção 10.5). Um desenvolvedor
   acostumado a esse padrão não deve introduzi-lo "por boa prática" sem uma decisão nova e
   explícita, fora desta entrega.
8. **Fallback de fonte incompleto** — é comum production builds carregarem só `font-family:
   'Inter', sans-serif` (omitindo `ui-sans-serif, system-ui`). Isso muda sutilmente a fonte
   renderizada em navegadores/SOs que resolvem esses fallbacks de forma diferente antes do
   carregamento do Google Fonts terminar (flash de fonte diferente, ou fonte final diferente em
   fallback de erro de rede). A cadeia completa (seção 2) deve ser reproduzida exatamente.
9. **Uso de `font-weight: bold` (700) via `<b>`/`<strong>` nativo do navegador em vez da classe
   `font-bold`** — visualmente idêntico na maioria dos casos, mas quebra se algum reset de CSS do
   framework de produção alterar o peso default de `<strong>`. Melhor usar explicitamente as
   classes de peso (400/500/600/700) descritas na seção 2, nunca depender de semântica HTML default
   para visual.
10. **Menu inferior com mais de 5 itens ou com item "Relatórios" reintroduzido** — historicamente
    já aconteceu no próprio protótipo (seção 21.2) e foi revertido por prejudicar o layout mobile.
    Um desenvolvedor que não tiver acesso ao histórico de decisões (`docs/MODULO_RELATORIOS.md`)
    poderia reintroduzir esse item "para completude", contrariando uma decisão de UX já testada e
    revertida.
