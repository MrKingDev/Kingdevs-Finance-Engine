# Local AI with financial context

The assistant uses Ollama's `/api/chat` endpoint. Open **Settings > Local AI** to check the connection, then open **AI** and select a financial month.

## Docker setup (from the repository root)

```powershell
docker compose -f backend/docker-compose.yml -f compose.ai.yaml up -d ollama
docker compose -f backend/docker-compose.yml -f compose.ai.yaml exec ollama ollama pull qwen3:4b
docker compose -f backend/docker-compose.yml -f compose.ai.yaml up -d --build
```

Use both Compose files for subsequent starts. The overlay connects the backend to `http://ollama:11434`, persists models in `finance_engine_ollama`, disables Ollama cloud features, and does not publish Ollama's port. The first model download needs internet access; inference runs locally. CPU inference may be slow. GPU configuration depends on your hardware; see [Ollama's Docker guide](https://docs.ollama.com/docker).

The existing migration service applies migration `0007` for bank badge colors on startup. Existing finance data is preserved.

## Windows Ollama instead

1. Install [Ollama for Windows](https://ollama.com/download/windows) and leave it running.
2. Run `ollama pull qwen3:4b` in PowerShell.
3. Use the standard Compose configuration: `docker compose -f backend/docker-compose.yml up -d --build`.
4. Check **Settings > Local AI > Check AI connection**.

Standard Compose defaults to `http://host.docker.internal:11434`. If Windows Ollama's listening interface prevents the container connecting, prefer the container setup above. Do not expose the API publicly.

For a backend running directly on your host, the default URL is `http://127.0.0.1:11434`. To override in the PowerShell session that starts the backend:

```powershell
$env:OLLAMA_BASE_URL = "http://127.0.0.1:11434"
$env:OLLAMA_MODEL = "qwen3:4b"
```

Compose reads `OLLAMA_BASE_URL` and `OLLAMA_MODEL` from `backend/.env`; direct Python uses environment variables. After changing Compose settings, recreate the backend with the same Compose files. Pull the exact model name you configure. The default is the published [qwen3:4b model](https://ollama.com/library/qwen3:4b).

## Financial access and limits

Each question gets a fresh, read-only database snapshot containing:

- Full income, expense and net cash-flow totals for the selected month, computed in SQL with decimal amounts.
- Up to 30 expense categories ranked by spending, and the latest 30 transactions with IDs, merchants, dates, banks, categories and amounts.
- Up to 30 monthly budgets, including actual spend and remaining budget.
- Up to 30 current active subscriptions and current goals with aggregated entries.

The prompt and response metadata identify omitted rows. Monthly totals include all matching transactions regardless of sample size. Goal/subscription state is current, not historical; net cash flow is not a bank balance. Ask about a different month by changing the selector. Questions do not carry chat history. Empty datasets are explicitly represented by zero totals and empty lists.

No database credentials, environment secrets, icons, or arbitrary files are sent. The model has no SQL execution, record-writing, or external tools. Record text is marked as untrusted data in the prompt. Answers remain model-generated and should be compared with the displayed ledger for important decisions. If you change OLLAMA_BASE_URL to a remote server, that server receives the snapshot.

A missing model is reported by the connection check. An unavailable server returns a helpful error; model timeouts are limited to 120 seconds. Model downloads are explicit commands, not automatic side effects of opening the app.

Protocol reference: [Ollama chat API](https://docs.ollama.com/api/chat).

## Model missing despite downloading it

Windows Ollama and the Ollama container have separate model libraries. Run `ollama list` for Windows or `docker compose -f backend/docker-compose.yml -f compose.ai.yaml exec ollama ollama list` for Docker. Set `OLLAMA_MODEL` in `backend/.env` to the exact installed tag on the configured server, then recreate the backend using the same Compose files. For this Docker setup use `OLLAMA_MODEL=qwen3:4b`. A custom Windows tag such as `qwen3:4b-instruct` is not automatically available in Docker.
