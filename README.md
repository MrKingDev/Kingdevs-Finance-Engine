# KingDev's Finance Engine

A personal finance dashboard built with Next.js, FastAPI, and PostgreSQL. Track transactions, category budgets, savings/debt goals and subscriptions; import bank CSV files, download monthly PDF or CSV reports, and ask general finance questions through an optional local Ollama assistant.

## Choose a setup

| Setup | Frontend | API | Database access from the host |
| --- | --- | --- | --- |
| Separate populated demo | `http://localhost:3002` | `http://localhost:8002` | Not published. |
| Your data, all services in Docker | `http://localhost:3001` | `http://localhost:8001` | `127.0.0.1:5433` |
| Local Next.js/FastAPI, PostgreSQL in Docker | `http://localhost:3001` | `http://localhost:8000` | `127.0.0.1:5433` |

These are the default ports. The two normal setups share the normal database; the demo has separate storage. Run one normal frontend at a time on port 3001.

For Docker-only use, install Docker Desktop with Linux containers and Docker Compose 2.24.4 or newer. Python, Node.js, uv and pnpm are installed inside the build images. The first build requires internet access to download images, dependencies and the frontend's Google fonts.

## Try the populated demo

With Docker Desktop running, execute from the repository root:

```powershell
docker compose -f compose.demo.yaml up --build -d --wait --wait-timeout 180
```

Open **[Demo dashboard](http://localhost:3002/dashboard)** or **[Settings downloads](http://localhost:3002/settings#download)**. Demo API docs: [localhost:8002/docs](http://localhost:8002/docs).

The demo has its own database, volume, network, images, and ports. It does not read your normal database configuration. A **Demo workspace** banner identifies it.

The sample dataset contains 168 fictional transactions across six months, 42 overall/category budgets, 12 categories, five subscriptions, five payment records, and three saved goals with nine entries. It is anchored to the first startup date; the current month's illustrative transactions are distributed across elapsed days. Repeated startup preserves existing records and edits.

Stop the demo without deleting its data:

```powershell
docker compose -f compose.demo.yaml down
```

See [Docker operations](DOCKER.md#separate-demo-workspace) for deliberate demo resets.

## Run with your own data

Preserve an existing `backend/.env`. For a new checkout:

```powershell
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Set `POSTGRES_PASSWORD` in that file. If you also run Python locally, put the same password in `DATABASE_URL`, URL-encoding reserved characters in the URL. Preserve credentials for an existing database. Then run:

```powershell
docker compose up --build -d --wait --wait-timeout 180
```

Open **[localhost:3001](http://localhost:3001)**. Docker API docs use **[localhost:8001/docs](http://localhost:8001/docs)**; PostgreSQL uses host port **5433**. Internal API/database ports remain 8000/5432.

This is a local, single-user application. Authentication and per-user authorization are not implemented. Docker publishes ports on loopback.

## Features

| Page | Behavior | Storage and limits |
| --- | --- | --- |
| Dashboard | Income, expenses, balance, category spending, annual charts, recent transactions, budget progress. | Saved API transactions/budgets. Annual area/bar charts follow the selected year. |
| Transactions | Create/delete, search, category/type/bank/date/amount filters, Previous/Next controls. | PostgreSQL; server filtering and **50 rows per page**. No edit UI yet. |
| Budgets | Overall or category monthly budgets with spent, remaining and usage amounts. | PostgreSQL; actuals count matching expense transactions. |
| Reports | Monthly cards, category spending, annual area/bar charts, weekly spending, history and budget performance. | Area/bar charts follow the selected year. Other widgets retain their documented scopes. |
| Goals | Savings/debt goals, dated income/expense/contribution entries and progress cards. | PostgreSQL; goals and entries survive reloads. Entries are separate from ledger transactions. |
| Tools | Subscriptions, paycheck/salary/bill calculators, compound interest, trip budget and wish list. | Subscriptions/payments: PostgreSQL. Wish list: localStorage. Other planning tools: component state. |
| Settings | CSV import, downloads, saved import rules, shared categories/colors and Clear Data. | **500,000 rows / 50 MB** per import; separate 10,000-transaction monthly export limit. |
| AI | Ask general finance questions through a local Ollama model. | Requires a separately running Ollama service. No access to financial records or saved conversation history. |

### Categories and budgets

Create categories in Settings and select a chart color. Transactions, budgets, subscriptions, imports and report filters use saved categories. Recoloring updates charts and newly generated PDFs.

An October Housing budget counts October expense transactions assigned to Housing. An All categories budget counts every expense in its month. Income does not count as spending. Wish List and Paycheck Splitter keep their separate planning categories.

### Imports

1. Open **Settings > Imports > CSV transactions**, enter the bank name and select a UTF-8 CSV.
2. Preview the file. Explicit bank type/debit/credit data takes precedence; saved description rules can classify rent, salary and other descriptions.
3. Resolve ambiguous signs and missing categories, then import.

The UI includes a note suggesting that an LLM can reformat a CSV into:

```text
date,merchant,category,bank,type,amount
```

Use YYYY-MM-DD dates, positive amounts and explicit `income` or `expense`. Preserve direction and review the result; positive rent must not become income. The bank name entered in the form is authoritative for the import.

Up to 1,000 rows can be selected and edited individually. Larger files are fully scanned but only the first 1,000 rows are displayed. They import the entire file using columns, saved rules and an optional fallback category. Every nonduplicate row must be valid and classified.

Limits are inclusive: **500,000 nonempty data records**, excluding the header, and **50,000,000 bytes**. The backend processes 1,000-row batches, uses a temporary disk duplicate index, and commits once. Any invalid row or failed batch rolls back the whole file. Large requests may take minutes; keep the tab open. Re-preview before retrying an interrupted request.

To restore a complete backup, open **Settings > Imports > JSON backup**, select the `.json` file from **Download All Data**, preview it, then choose **Import & Save Backup**. Backups up to 50 MB are validated in full and merged in one database transaction. Existing records are kept; matching transactions and history entries are skipped, while legitimate repeated entries in a backup retain their counts. Matching categories, bank preferences, monthly budgets, import rules, goals (name/type), and subscriptions (name/cycle/billing anchor/payment method) keep their current values. Related IDs are remapped automatically. Browser wish list items merge by ID; existing theme and wish list budget preferences are kept.

Imported records are committed to PostgreSQL and survive closing the browser, restarting the app, and restarting its containers. The database uses the existing named Docker volume. Imports never clear existing data or run automatically on startup.

### Downloads

In **Settings > Downloadables**, select a month and year:

| Button | Result |
| --- | --- |
| Download PDF | Reference-style navy header, income/expense/net cards, spending doughnut, transaction count and additional detail pages. |
| Download Basic PDF | Plain printable summary, category totals and transaction tables. |
| Download CSV | UTF-8 spreadsheet file using the six columns above, with explicit direction and safe text cells. |

PDFs use USD, Decimal totals, saved category colors and bundled fonts. Empty months produce valid reports. Exports do not change data. Months above 10,000 transactions are rejected without truncation.

### Subscriptions and Clear Data

Subscriptions support add/edit, category selection, raster icons, archive/restore, payment recording and history. Recording a payment advances one billing period. It does not charge a provider or insert a ledger expense; enter/import that expense separately to avoid double counting.

Typing `CLEAR` in Settings deletes transactions, budgets and categories. It retains goals and entries, subscriptions, payments, import rules and browser-only tools; removed category references become null.

### Local AI assistant

The **AI** page sends one question at a time to `POST /ai/chat`. The backend forwards it to Ollama, using `http://127.0.0.1:11434` and model `qwen3:4b-instruct` by default. Ollama must be running separately with the selected model installed; it is not included in either Compose stack.

To use another Ollama server or installed model, set these environment variables in the PowerShell terminal that starts the local backend:

```powershell
$env:OLLAMA_BASE_URL = "http://127.0.0.1:11434"
$env:OLLAMA_MODEL = "qwen3:4b-instruct"
```

Then start uvicorn as shown below and open `/ai`. The assistant receives only the current question, without transactions, balances, budgets or prior messages. Questions are limited to 4,000 characters; the backend uses a 120-second request timeout.

For Docker, configure these variables on the **backend service** with an Ollama address reachable from that container. Its loopback address refers to the container itself. The current Compose files do not forward Ollama variables, so setting them only in your host terminal does not configure the container.

## Local development

Requirements: Python 3.13 with uv, Node 20.9+ (Docker uses Node 22), pnpm 12.8.1 and PostgreSQL 17.

Prepare `backend/.env` as described above before starting the database. Keep its `DATABASE_URL` consistent with the database password and host port. `uv sync --locked` installs the backend into its local environment; pnpm uses the workspace lockfile at the repository root.

From `backend/`:

```powershell
uv sync --locked
docker compose up -d --wait db
uv run alembic upgrade head
uv run uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, from the repository root:

```powershell
pnpm install --frozen-lockfile
if (!(Test-Path frontend/.env.local)) { Copy-Item frontend/.env.example frontend/.env.local }
pnpm --dir frontend dev
```

Use `pnpm.cmd` on Windows if the PowerShell launcher is blocked. The local frontend uses API port 8000; Docker uses a same-origin `/api` proxy. Avoid running two frontend servers on 3001.

## Repository and checks

```text
frontend/src/app/                 Next.js pages and layout
frontend/src/components/          Features and shared UI
frontend/src/lib/                 API helpers and chart calculations
backend/src/backend/
  database/, models/, schemas/    Persistence and validation
  routes/, services/             API and business logic
  assets/fonts/                  PDF fonts and license
  seed_demo.py                   Guarded fictional dataset
backend/migrations/              Alembic revisions 0001 through 0006
backend/tests/, backend/scripts/  Regression and integration checks
compose.yaml                     Normal workspace
compose.demo.yaml                Separate populated demo
```

From `backend/`: `uv run python -B -m unittest discover -s tests -q`.

From `frontend/`: `pnpm exec tsc --noEmit --incremental false` and `pnpm build`.

Backend tests use Python's `unittest` and disposable SQLite databases. PostgreSQL and browser checks supplement them; see the backend/Docker guides. Source, migrations, tests, lockfiles, templates, Docker files and font assets remain trackable; real environment files and generated caches are ignored.

## Documentation and remaining work

| Guide | What it covers |
| --- | --- |
| [Frontend](frontend/README.md) | Development, configuration, pages, data flows and frontend checks. |
| [Backend](backend/README.md) | Database setup, API routes, financial rules, imports, exports and tests. |
| [Migrations](backend/migrations/README) | Revision history, schema changes, rollback and migration errors. |
| [Docker operations](DOCKER.md) | Service connections, volumes, demo setup, verification and troubleshooting. |
| [PDF fonts](backend/src/backend/assets/fonts/README.md) | Bundled font assets, supported text and redistribution terms. |
| [Agent instructions](AGENTS.md) | Repository rules for coding agents. |

No users/accounts, JWT/OAuth, bank sync, durable background jobs, Redis or CI pipeline are implemented yet. Most analytics still load the full transaction list; very large ledgers would benefit from backend aggregates beyond the paginated transaction screen. Monthly export limits are independent of import limits.

Local financial assistant setup: [LOCAL_AI.md](LOCAL_AI.md). Bank badge colors can be customized in **Settings > Preferences**.

In Preferences, bank renames update existing transactions. Deleting a bank with transactions requires choosing a replacement; no transactions are deleted. Removed banks stay out of the selectors until explicitly added again.
