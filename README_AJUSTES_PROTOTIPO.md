# Ajustes aplicados no protótipo Pró-Saúde

Este pacote contém o protótipo ajustado para reforçar as regras levantadas na ata e nos modelos de requerimento enviados.

## Principais mudanças

- Separação clara das fases do projeto na página inicial e no dashboard GERDAB.
- Fase 1 destacada como foco atual: cadastro de servidores, dependentes, carga inicial e requerimentos.
- Fases 2 e 3 marcadas como evolutivas: comprovação mensal, OCR/IA, retroativos, alterações de valor, relatórios, SEI/FIG e notificações.
- Painel GERDAB responsivo para celular e desktop.
- Parâmetros do sistema restritos ao perfil **Gerência GERDAB**.
- Fluxo de inclusão/mudança de plano atualizado para contemplar:
  - primeira inclusão;
  - mudança de plano, categoria ou operadora;
  - processo SEI;
  - plano anterior;
  - valor do titular e do grupo familiar;
  - justificativa de alteração de valor;
  - anexos do contrato/declaração, exclusão anterior e documento da operadora.
- Fila de aprovação com checklist por tipo de requerimento e documentos coerentes com o caso.
- Cadastro de servidor com campos adicionais: RG, endereço, tipo de plano, operadora e ANS.
- Cálculo demonstrativo de reembolso com percentual de 90% e teto configurável.
- Alertas para pendências de dependentes, IRPF e limite de idade.

## Como rodar

```bash
npm install
npm run dev
```

Depois, abra o link local exibido no terminal, normalmente:

```bash
http://localhost:5173
```

Na tela de login, selecione o perfil desejado:

- Servidor: acessa o portal mobile do servidor.
- Analista: acessa o painel GERDAB sem parâmetros.
- Gerência: acessa o painel GERDAB com parâmetros do sistema.
