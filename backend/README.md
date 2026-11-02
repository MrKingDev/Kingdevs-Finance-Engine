# Finance Engine backend

FastAPI + SQLAlchemy + PostgreSQL, with Pydantic validation, Alembic migrations and ReportLab exports. Commands below run from `backend/` unless stated otherwise.

## Run locally

Requirements: Python 3.13, uv and a reachable PostgreSQL database. The commands below use Docker Desktop to run PostgreSQL 17, and run FastAPI directly on the host.

Preserve an existing `.env`. For a new checkout, create it from the template:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Set `POSTGRES_PASSWORD` and the password in `DATABASE_URL` to the same value. URL-encode reserved characters in the URL only. The template uses host port 5433. Then:

```powershell
uv sync --locked
docker compose up -d --wait db
uv run alembic upgrade head
uv run uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Python 3.13 is selected. Local PostgreSQL is `finance_engine` on `127.0.0.1:5433`, role `finance_user`. API docs: `/docs`, `/redoc`, `/openapi.json`. Full Docker startup runs from the repository root with `docker compose up --build -d --wait --wait-timeout 180`; Docker publishes the API on 8001.

## Configuration and structure

Configuration precedence: process `DATABASE_URL`, then Docker connection components when `POSTGRES_HOST` exists, then local `backend/.env`. An explicitly blank URL is an error. Use `postgresql+psycopg://...`; URL-encode reserved password characters for host URLs. Docker passes connection components separately.

Existing PostgreSQL volumes retain their role password; changing an initialization environment variable does not change that password.

| Setting | Used by | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | Host API and Alembic | PostgreSQL URL, normally pointing to `127.0.0.1:5433/finance_engine`. |
| `POSTGRES_PASSWORD` | Compose and container database connections | Password for the configured database role. |
| `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_DB` | Container API and Alembic | Compose supplies `db`, `finance_user` and `finance_engine`. |
| `POSTGRES_PORT` | Compose host binding / container connection | Template uses host 5433; Compose explicitly supplies internal 5432 to API containers. |
| `BACKEND_PORT`, `FRONTEND_PORT` | Normal Compose host bindings | Defaults are 8001 and 3001. These do not change the local uvicorn command. |
| `DEMO_MODE` | Demo seeder | Must be `true` alongside database name `finance_engine_demo` before sample finances can be inserted. |
| `OLLAMA_BASE_URL` | AI route | Ollama server URL; defaults to `http://127.0.0.1:11434`. Must be reachable from the backend process/container. |
| `OLLAMA_MODEL` | AI route | Installed Ollama model name; defaults to `qwen3:4b-instruct`. |

`/health` and API documentation work without a database connection. `/health/ready` performs `SELECT 1`; financial endpoints also require the expected migrations. Successful liveness alone does not prove that the database or schema is ready.

| Location under src/backend | Responsibility |
| --- | --- |
| `main.py` | FastAPI, CORS, routes and health checks. |
| `database/` | One Base, lazy engine, dependency-injected sessions and configuration. |
| `models/` | SQLAlchemy tables, relationships, constraints and indexes. |
| `schemas/` | Pydantic request/response validation. |
| `routes/` | HTTP handling. |
| `services/csv_import.py` | Column mapping, row normalization, rules and small edited-row commits. |
| `services/csv_stream.py` | Full-file scanning, sampled previews, disk duplicate index and atomic batch inserts. |
| `services/subscriptions.py` | Billing dates, estimates, payments and retries. |
| `services/exports.py` | Monthly transaction snapshot, Decimal totals and safe CSV. |
| `services/report_pdf.py` | Styled/basic PDF layouts and detail-table pagination. |
| `assets/fonts/` | DejaVu fonts and license; included in Docker. |
| `seed_demo.py` | Guarded fictional sample data. |

`migrations/` holds revisions 0001 through 0006. `tests/` and `scripts/` provide isolated verification. Runtime dependencies are declared in `pyproject.toml` and locked in `uv.lock`.

Goals use `GET/POST /goals`, `GET/DELETE /goals/{id}`, and `GET/POST /goals/{id}/entries`. Entries retain their type (income, expense or contribution), date, note and positive Decimal amount. Goal responses aggregate progress from saved entries. Deleting a goal also deletes its entries; Clear Data retains both. Goal entries do not create ledger transactions. Apply migration `0006` before starting the updated API.

## API routes

Paths are relative to the API root; Docker browsers prepend `/api`. There is currently no `/api/v1` prefix or authentication layer. Use `/docs` for request schemas and response examples.

| Methods | Path | Purpose |
| --- | --- | --- |
| GET | `/health`, `/health/ready` | Process liveness / actual database query. |
| GET, POST | `/transactions` | Legacy full list / create. |
| GET | `/transactions/page` | Filtered pages of 50. |
| GET | `/transactions/banks` | Distinct bank labels. |
| GET, PATCH, DELETE | `/transactions/{id}` | Read/update/delete. |
| GET, POST | `/categories` | Shared categories. |
| GET | `/categories/colors` | Approved chart palette. |
| PATCH | `/categories/{name}` | Update color. |
| GET, POST | `/budgets` | Monthly overall/category budgets. |
| GET, PUT, DELETE | `/budgets/{id}` | Read/update/delete budget. |
| GET, POST | `/rules` | Saved CSV description rules. |
| PUT, DELETE | `/rules/{id}` | Edit/delete rule. |
| POST | `/imports/csv/preview` | Validate every row; return at most 1,000 preview rows. |
| POST | `/imports/csv/commit` | Commit up to 1,000 selected/edited JSON rows. |
| POST | `/imports/csv/file` | Revalidate and atomically import a whole CSV. |
| POST | `/imports/backup/preview` | Validate a complete version 1 JSON backup (up to 50 MB) and preview new/existing record counts. |
| POST | `/imports/backup` | Revalidate, merge, and commit a complete backup atomically; retain existing records and remap related IDs. |
| GET, POST | `/subscriptions` | List/create subscriptions. |
| GET | `/subscriptions/overview`, `/subscriptions/summary` | Due status and estimates. |
| GET, PATCH, DELETE | `/subscriptions/{id}` | Read/edit/delete where history permits. |
| GET, POST | `/subscriptions/{id}/payments` | History / record a payment. |
| GET | `/exports/periods` | Available report years. |
| GET | `/exports/backup.json` | Complete versioned JSON backup of every saved application table, across all dates, with exact decimal amounts and IDs. |
| GET | `/exports/transactions.csv?month=10&year=2026` | Monthly spreadsheet report. |
| GET | `/exports/report.pdf?month=10&year=2026&style=styled` | Styled PDF; use `style=basic` for plain. |
| GET, POST | `/goals` | List/create savings or debt payoff goals with aggregated progress. |
| GET, DELETE | `/goals/{id}` | Read/delete a goal; deletion also removes its entries. |
| GET, POST | `/goals/{id}/entries` | List dated entries / add an entry and return updated goal totals. |
| POST | `/ai/chat` | Forward a single question to Ollama and return its reply. |
| DELETE | `/data/clear` | Confirmed deletion of transactions, budgets and categories. |

### Local AI

`POST /ai/chat` accepts `{"message": "How can I organize a monthly budget?"}` and returns `{"reply": "..."}`. Messages must contain 1–4,000 characters; whitespace-only messages return 400. Schema validation failures return 422.

The route uses HTTPX to call Ollama's `/api/chat` with streaming disabled, a 120-second timeout and `num_predict=512`. It sends a system instruction and the current question only. Financial records and conversation history are not included or saved by this route.

Run Ollama separately with the selected model installed. Set `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in the backend process environment to override the defaults. Docker users must explicitly supply them to the backend service; the current Compose files do not forward them or start Ollama. Inside a container, `127.0.0.1` refers to that container.

Connection failures return 503, timeouts return 504, and upstream HTTP errors or invalid replies return 502. Other finance features do not require Ollama.

### Transaction pages

`/transactions/page` accepts `page`, `search`, `type`, `category`, `bank`, `start_date`, `end_date`, `min_amount`, and `max_amount`.

Response fields: `items`, `total` (filtered count), `overall_total`, `page`, `page_size=50`, and `pages`. Filtering occurs before counting/paging. Search covers merchant/category/bank and treats percent/underscore literally. Ordering is date descending, then ID descending. Dates/amounts are inclusive.

Invalid ranges return 422. Requests beyond the final page clamp to the last page, including after deletion. Empty results return page 1 of 1. Legacy consumers retain the original full-list endpoint.

## Financial rules

- Amounts are positive `NUMERIC(12,2)`; direction is a separate `income|expense` field.
- Saved category names are shared references with case-insensitive uniqueness. APIs resolve canonical names.
- Category colors use a 17-token allowlist; current category colors override legacy transaction colors.
- Budgets are unique per category/month/year, with a separate partial uniqueness constraint for an overall null-category budget.
- Spending sums expense transactions in the calendar month and optional category. Income does not count.
- Decimal is used for backend money calculations. Exports/subscription estimates display USD.
- Account ownership and currency conversion are not implemented.

## CSV import

### Formats and limits

Maximums are **500,000 nonempty data records** (header excluded) and **50 MB = 50,000,000 bytes**. Preview and whole-file commit both enforce them.

Supported: UTF-8 with optional BOM, comma/semicolon/tab delimiters, quoted and multiline fields, ISO dates or explicit MDY/DMY. Headers require 2 to 50 unique normalized names; cells are limited to 4,096 characters. Amounts use US decimal notation with at most two decimal places.

Suggested normalized columns:

```text
date,merchant,category,bank,type,amount
```

The UI includes an LLM reformatting note and matching downloadable template. Dates should be YYYY-MM-DD, amounts positive, and type explicit. Review converted data; never infer that positive values are automatically income. The form's bank name is authoritative for all records in that import.

Multipart fields: `file`, `bank`, optional JSON `mapping`, `amount_mode`, `date_format`, `expense_sign`, and `default_category`. Small previews also accept bounded `type_overrides`.

### Classification and review

Automatic classification prioritizes explicit debit/credit or recognized type labels, then enabled saved rules. Rules use case-insensitive whole-word/phrase matching; longer matches win. Valid file categories take precedence over rule categories. The fallback only fills unresolved categories.

Files up to 1,000 rows retain row editing/selection. Larger files are fully scanned but return only the first 1,000 rows and complete counts for valid, invalid, income, expense, duplicate and uncategorized records. The first issue identifies problems beyond the visible sample.

Large imports use the original file and are all-or-nothing except explicitly skipped duplicates. Resolve file errors, mapping, sign conventions, rules and fallback categories before importing. The frontend does not submit a 500,000-element JSON array.

### Memory, duplicates and transactions

Uploaded files are spooled and read incrementally. Processing/insertion batches contain 1,000 rows. A temporary SQLite file holds SHA-256 duplicate keys with a small page cache; it is deleted afterward and is not a persistent application database.

Keys include date, normalized merchant/bank, type and cent-normalized amount. Category is excluded. Saved bank transactions are streamed into the index; incoming duplicates are caught across batches. PostgreSQL CSV commits share an advisory lock and recheck duplicates after acquiring it.

All batches share **one final database commit**. Invalid later rows, malformed CSV, size/count violations and database failures roll back previous insert batches.

Imports are synchronous worker-thread requests, not durable jobs. The Docker Next proxy allows 51 MB including multipart overhead and a ten-minute timeout. Keep the tab open; after a disconnect, preview before retrying because the server may have finished. Other reverse proxies need matching limits.

## Downloads

Exports select the requested month's transactions, join current category colors and calculate Decimal income, expenses, net cash flow and category spending. Subscription estimates, goal entries and planning values are not ledger transactions.

Styled PDFs match the supplied US Letter example: navy header, DejaVu Sans, three white summary cards, expense doughnut and transaction count. The cover shows up to six legend entries; smaller categories can be grouped visually while full category and transaction details follow.

Basic PDFs use the same data in a plain printable layout. Tables wrap long strings, repeat headers and paginate. User strings are escaped before paragraph rendering. Empty months produce valid reports.

ReportLab runs without a browser, system fonts or network access. Bundled fonts are embedded as subsets. Downloads are generated in memory, carry attachment filenames and use `Cache-Control: no-store`. More than 10,000 transactions in a month returns 413 rather than a partial export.

CSV includes UTF-8 BOM, explicit type and positive amounts. Formula-like text gets a leading apostrophe; this may appear in reimported descriptions. It is a spreadsheet report, not a byte-for-byte backup.

See [ReportLab's layout documentation](https://docs.reportlab.com/reportlab/userguide/ch5_platypus/) and the [font README](src/backend/assets/fonts/README.md).

## Subscriptions and deletion

Monthly/annual subscriptions support categories, payment labels, optional icons and archive status. PNG/JPEG/WebP icons remain limited to **2 MiB**, independently of the CSV limit.

Payment recording locks the subscription, inserts one unique billing occurrence and advances one anchored period. Identical retries return the existing payment; conflicting retries return 409. Short months and leap years are handled. Due status uses UTC dates. Entries with payment history must be archived instead of deleted.

A recorded payment never charges a provider or inserts an expense automatically. Clear Data retains subscriptions, history and import rules while deleting transactions, budgets and categories; their category references become null.

## Demo

From the repository root:

```powershell
docker compose -f compose.demo.yaml up --build -d --wait --wait-timeout 180
```

The seeder requires `DEMO_MODE=true` and exact database name `finance_engine_demo`. It runs after migrations, only when transactions/budgets/subscriptions are empty, within one transaction and advisory lock. Reruns preserve existing data. Normal startup/migrations never seed sample finances.

`uv run python -m backend.seed_demo --as-of YYYY-MM-DD` supports reproducible dates within 2001 through 2099 in an explicitly configured demo database. Do not point the normal development configuration at the demo merely to run this command; the separate Compose setup configures it for you. The frontend demo uses ports 3002/8002 and separate storage.

## Verification

The current test runner is Python's standard-library `unittest`, not Pytest. Run from `backend/`:

```powershell
uv sync --locked
uv run python -B -m unittest discover -s tests -q
```

| Test module | Coverage |
| --- | --- |
| test_backend | Configuration, migrations, categories, budgets, transactions, Clear Data. |
| test_csv_import | Bank formats, mapping, rules, directions, selected-row commits. |
| test_csv_stream | Sample bounds, full-file validation, cross-batch duplicates, limits and rollback. |
| test_subscriptions | Dates, estimates, payments, persistence and retries. |
| test_exports | Parsed PDF content/pagination, financial totals, CSV safety and directions. |
| test_demo | Database safeguards, fixture integrity, atomicity and reruns. |
| test_transaction_pages | Page boundaries, ordering, filtering, empty pages and deletion. |
| test_goals | Goal and entry validation, persistence, aggregated totals, deletion and Clear Data retention. |

Tests use disposable SQLite databases. `pypdf` is dev-only for assertions; production uses ReportLab without dev dependencies. PostgreSQL integration and browser checks are documented in [DOCKER.md](../DOCKER.md).

`scripts/verify_large_csv.py` targets only the isolated verification ports 13001/15433, tests 500,000 rows and an exact 50 MB file, then removes its own synthetic rows. Browser scripts target explicitly documented demo/verification URLs.

## Troubleshooting and boundaries

| Symptom | Check |
| --- | --- |
| Cannot import Base | Use the shared declarative Base and register models. |
| Missing DATABASE_URL | Configure local .env or Docker connection components; inspect unintended blank overrides. |
| Port 8000 occupied | Docker uses host 8001; local Python can use 8000 or another free port. |
| Password authentication failed | Match the existing database role password. |
| Database not up to date | Apply existing migrations before autogeneration. |
| Missing ReportLab | Run uv sync --locked or rebuild the backend image. |
| Import blocked | Resolve the reported row, direction, category or file limit and preview again. |
| Large request interrupted | Configure proxy limits, check saved records, then retry if needed. |

The API has no authentication, ownership isolation, bank integration, Redis or durable background queue. Analytics still using the legacy full-list endpoint may be slow on very large ledgers. Docker packaging alone does not make this a public deployment.

Related guides: [project overview](../README.md), [frontend](../frontend/README.md), [migrations](migrations/README), [Docker operations](../DOCKER.md), and [PDF fonts](src/backend/assets/fonts/README.md).
