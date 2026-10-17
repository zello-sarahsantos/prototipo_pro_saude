# Backend Pró-Saúde — protótipo de orquestração

Este protótipo ilustra o fluxo de produção no qual o **backend** é a fonte de verdade:

1. recebe o anexo autenticado;
2. guarda o original e cria o comprovante com status `EM_ANALISE`;
3. solicita a extração assíncrona à IA e guarda o ID de execução;
4. consulta a IA em segundo plano;
5. armazena a leitura original e suas evidências;
6. preserva campos e pareceres inseridos manualmente pelo analista.

A IA não atualiza este banco. Ela somente devolve a leitura pelo endpoint HTTP.

## Executar no computador de teste

Com o port-forward da IA ativo em `http://127.0.0.1:8002`:

```powershell
cd services/backend-prototipo
..\ia\.venv\Scripts\python.exe -m uvicorn main:app --port 8003 --reload
```

Abra `http://127.0.0.1:8003/docs`.

## Endpoints principais

- `POST /comprovantes`: grava imediatamente e devolve `201` com status `EM_ANALISE`.
- `GET /comprovantes/{id}`: mostra situação da IA, leitura original e valores manuais.
- `PATCH /comprovantes/{id}/campos/{campo}`: analista confirma/corrige um campo; esse valor não é sobrescrito pela IA.
- `POST /comprovantes/{id}/parecer`: decisão final humana.

O SQLite é apenas a simulação do Oracle. Em produção, estas operações pertencem ao backend/Mule e às tabelas do Pró-Saúde.
