# KingDev's Finance Engine

A personal finance application built with Next.js, FastAPI, and PostgreSQL. The interface includes a dashboard, transactions, budgets, goals, reports, and financial planning tools.

The backend persists transactions, shared categories, and monthly budgets through SQLAlchemy and Alembic, with PostgreSQL running in Docker. Category budgets automatically count matching expenses in their month. Goals and most tools still use browser component state.

## Documentation

- [Backend setup and Docker/PostgreSQL walkthrough](backend/README.md): configuration, API behavior, troubleshooting and verification.
- [Migration guide](backend/migrations/README): current schema, Alembic workflow, revision review and rollback.
- [Coding-agent instructions](AGENTS.md): repository-specific development guidance.

## Pages and features

| Route | Available behavior | Current limitations |
| --- | --- | --- |
| `/` | Landing page, project links and backend health indicator. | Health confirms the API responds, not database readiness. |
| `/dashboard` | Selected-month income, expenses and savings; cumulative transaction balance; category spending; five recent saved transactions; real budget progress for the selected period. | Most financial metrics are calculated in the browser. Income/expense charts use the current calendar year independently of the page selector. Add Transaction has no action here. |
| `/transactions` | Saves and deletes PostgreSQL transactions; category suggestions come from the shared category table; client-side search and filters; loading/error/empty states. | No edit UI, server pagination or account model yet; bank filter options remain fixed. |
| `/budgets` | Creates one budget per category/month/year or an optional All categories budget; displays backend spending, remaining and usage; supports deletion. | No edit UI is connected; updates are available through the API. |
| `/goals` | Creates savings/debt-payoff goals locally; displays progress; confirms deletion and shows a toast. | Goals reset on reload. Add Entry fields do not update contributions, income or expenses. No goal API exists. |
| `/reports` | Selected-month income, expenses and net cash flow; category spending; income/expense charts; weekly category filter; monthly history; real budget performance for the selected period. | Most calculations use saved API transactions in the browser. Filter scope differs by widget; weekly category choices remain fixed. |
| `/tools` | Subscription Checker, Paycheck Splitter, Salary Converter, Bill Splitter, Compound Interest, Trip Budget and Wish List. | Browser-only tools; the wish list is the only tool that persists its inputs. |
| `/ai` | Page heading and description. | No AI service or assistant is connected. |
| `/settings` | Import CSV, Preferences, Downloadables, Rules, Categories and Clear Data tabs. | Panels are placeholders; import/export and Clear Data have no implemented backend operations. |

Shared UI includes a collapsible sidebar, responsive layouts, themes, page transitions, form controls, chart tooltips, dialogs, Sonner toasts and a custom 404 page.

### Financial tools

| Tool | Current behavior | Storage |
| --- | --- | --- |
| Subscription Checker | Starts with five sample subscriptions; supports adding, deleting, marking paid, and choosing a local image icon. Calculates annual cost, monthly average, and status counts. Marking paid changes the displayed status; it does not record a ledger payment or advance the renewal schedule. | React state; changes reset when the component is remounted or the page is reloaded. |
| Paycheck Splitter | Allocates a paycheck across editable categories, with optional tithes. Defaults to Needs 50%, Wants 30%, and Savings 20% after tithes. | React state. |
| Salary Converter | Converts between hourly, daily, weekly, biweekly, monthly, and yearly pay using editable hours and weeks worked. | React state. |
| Bill Splitter | Calculates tip, tax, total bill, and per-person amounts. | React state. |
| Compound Interest | Projects principal growth and monthly contributions using a selected compounding frequency. | React state. |
| Trip Budget | Edits a sample trip's travel, lodging, food, other expenses, reserves, refundable holds, actual amounts, and planning checklist. | React state. |
| Wish List | Adds, edits, and removes items; ranks them by ratings, affordability, and deadlines; offers buy-order, budget-plan, deadline, and comparison views. | Browser localStorage. |

Tool estimates and planning amounts do not update dashboard balances, transactions, budgets, or goals.


## Technology

Versions reflect [frontend/package.json](frontend/package.json) and [backend/pyproject.toml](backend/pyproject.toml).

| Area | Current technology |
| --- | --- |
| Frontend | Next.js `16.3.5` App Router, React/React DOM `19.2.8`, TypeScript `^5` |
| Styling/UI | Tailwind CSS `^4`, shadcn configuration, React Aria Components, Radix UI, Motion, next-themes, Sonner |
| Charts | Recharts `3.8.0` |
| Frontend checks | Biome `2.4.2`, TypeScript strict mode |
| Frontend packages | pnpm `12.8.1`; workspace includes `frontend` only |
| Backend | Python `>=3.13`; `.python-version` selects 3.13; FastAPI `>=0.142.2` |
| Validation | Pydantic transaction and budget schemas |
| Database | PostgreSQL 17 in Docker |
| ORM/driver | SQLAlchemy `>=2.1.1`, Psycopg `>=3.2,<4` with binary extra |
| Migrations | Alembic `>=1.20.0`; current head `0002` |
| Backend packages | uv, `pyproject.toml`, `uv.lock`, python-dotenv |
| Tests | 28 backend regressions using unittest and FastAPI TestClient |
| API docs | FastAPI Swagger, ReDoc and OpenAPI |

React Compiler is enabled. The root layout uses Geist, Geist Mono, DM Sans and Nunito Sans through `next/font/google`. Authentication, Pytest adoption, GitHub Actions, bank integration, Redis and workers remain future work. Only PostgreSQL is currently containerized.

## Local setup

### Prerequisites

- Node.js 20.9 or newer, matching the installed Next.js guide.
- pnpm 12.8.1, matching the frontend manifest.
- Python 3.13 and uv.
- Docker Desktop running Linux containers, with Docker Compose available.

For a new pnpm installation: `npm install --global pnpm@12.8.1`. On Windows, use `pnpm.cmd` if PowerShell execution policy blocks the launcher.

### 1. Configure the backend

From the repository root:

```powershell
cd backend
uv sync --locked
```

For a fresh checkout, create `backend/.env` with your chosen local database password in both settings:

```dotenv
POSTGRES_PASSWORD='YOUR_LOCAL_PASSWORD'
DATABASE_URL='postgresql+psycopg://finance_user:YOUR_LOCAL_PASSWORD@127.0.0.1:5433/finance_engine'
```

Preserve existing local settings if already configured. These are placeholders, not working credentials. URL-encode reserved password characters in `DATABASE_URL`; keep the actual password in `POSTGRES_PASSWORD`. Environment files are ignored by Git.

The backend and Alembic read `DATABASE_URL` from the process environment first, then `backend/.env`. A blank process-level value also takes precedence. Compose reads `POSTGRES_PASSWORD` for database initialization.

### 2. Start PostgreSQL and migrate

Still in `backend/`:

```powershell
docker compose config --quiet
docker compose up -d --wait --wait-timeout 60 db
uv run alembic upgrade head
uv run alembic current
uv run alembic check
```

The service is `db`, container is `finance-engine-db`, database is `finance_engine` and role is `finance_user`. Windows clients connect to **127.0.0.1:5433**, forwarding to PostgreSQL's internal port 5432. Port 5433 avoids the separate example project's database on port 5432.

Data is stored in the named volume `backend_finance_engine_postgres_data`. Revision `0001` creates `budgets` and `transactions`; `0002` adds `categories` and category references. Existing budgets retain their All categories scope. No transactions are seeded. Apply these supplied migrations instead of generating another initial revision.

Expected checks: `0002 (head)` and `No new upgrade operations detected.` See the [backend guide](backend/README.md) for lifecycle commands and troubleshooting.

### 3. Start the API

In the backend terminal:

```powershell
uv run uvicorn backend.main:app --app-dir src --reload --host 127.0.0.1 --port 8000
```

Keep it running. Visit [health](http://127.0.0.1:8000/health) or [Swagger](http://127.0.0.1:8000/docs). `uv run backend` only invokes the original hello-world console command.

`/health` checks the API process; `/budgets`, `/transactions` and `/categories` exercise database access. Financial routes require a configured, reachable, migrated database; health and docs can work without PostgreSQL.

### 4. Configure and start the frontend

Set `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Use no trailing slash. This URL is public and must not contain database credentials. Older chart/page consumers require it; the shared finance API helper also supplies a localhost fallback.

In a second terminal, from the repository root:

```powershell
pnpm install
pnpm --dir frontend dev
```

Open **http://localhost:3001**. Backend CORS allows `http://localhost:3001` and `http://127.0.0.1:3001`. Restart Next.js after changing its environment file and the API after changing database configuration.

Keep the backend available for API-dependent components. Recent transactions now fetch after mounting with loading/error states. Google font compilation can require network access.

## Current REST API

Routes are unversioned and unauthenticated. There are no `/api/v1` endpoints yet.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/` | API welcome message. |
| GET | `/health` | `{"status":"Ok"}`; no PostgreSQL check. |
| GET | `/categories` | Shared category names, sorted alphabetically. |
| GET | `/transactions` | Saved transactions, descending date/ID; no server-side filtering or pagination. |
| POST | `/transactions` | Saves a transaction and resolves/creates its category; returns 201. |
| GET / PATCH / DELETE | `/transactions/{id}` | Read, partially update, or delete a saved transaction; missing ID returns 404. Delete returns 204. |
| GET | `/budgets` | Persistent budgets with calculated totals; optional `month` and `year` filters. |
| POST | `/budgets` | Saves a category or overall monthly budget; returns 201. Duplicate category/month/year returns 409. |
| GET | `/budgets/{id}` | Reads a budget and expense totals; missing ID returns 404. |
| PUT | `/budgets/{id}` | Updates supplied fields; omitted fields are preserved. `category: null` means All categories; other explicit nulls are rejected. |
| DELETE | `/budgets/{id}` | Deletes a budget; returns 204. |
| GET | `/docs`, `/redoc`, `/openapi.json` | Generated API documentation. |

Budget request:

```json
{
  "category": "Groceries",
  "month": 10,
  "year": 2026,
  "amount": "400.00"
}
```

Budget responses contain `id`, `category`, `month`, `year`, **`budget`**, `spent`, `remaining` and `usage_percentage`. Decimal amounts serialize as strings. Budget cards and progress widgets display these backend totals.

Valid transaction request (POST saves it):

```json
{
  "date": "2026-10-01",
  "merchant": "Coffee Shop",
  "category": "Dining",
  "bank": "Chase",
  "type": "expense",
  "amount": "4.50",
  "pie-color": "var(--chart-orange-2)"
}
```

The schema requires a date, nonempty text fields, lowercase `income`/`expense`, and a positive amount with at most two decimal places. `pie-color` (or `pie_color`) is optional and defaults to `var(--chart-1)`. Invalid bodies return 422. The frontend refreshes saved transactions and mounted budget views after writes.

### How category budgets work

1. On **Budgets**, choose **Add Budget → One category**, enter or select `Groceries`, choose October 2026, and set a limit of `$400`.
2. On **Transactions**, save a `$125` **expense** categorized as `Groceries`, dated in October 2026.
3. The budget shows **$125 spent, $275 remaining, 31.25% used**. Dashboard/report budget widgets show the same totals when October 2026 is selected.

Only the category, transaction date, and `expense` type determine inclusion; the merchant and bank do not. Existing matching expenses count even if entered before the budget. Changing a transaction's amount/category/date/type or deleting it affects the totals on the next read. Transaction editing currently uses `PATCH /transactions/{id}` in Swagger.

Category names share one database record: `Groceries`, `groceries`, and ` Groceries ` resolve to the same stored name. The first budget or transaction using a new name creates it; both forms offer these names as suggestions. Category renaming/deletion and the Settings category-management panel remain future work.

You may have Groceries and Dining budgets in the same month, but only one budget per category/month/year. **All categories** (`category: null`) counts every expense in the month. The existing monthly budget was preserved this way. Overall and category budgets overlap: do not add their spent figures together. Each budget is a spending limit, not a transfer of money or an account balance.

## Architecture and data

```text
Next.js :3001
  +-- HTTP -> FastAPI :8000
  |             +-- /transactions, /categories, /budgets
  |                    +-- SQLAlchemy + Psycopg -> PostgreSQL :5433
  +-- Browser calculations -> dashboard and reports
  +-- React state -> goals and most tools
  +-- localStorage -> wish list and theme preferences
```

| Feature | Source and scope |
| --- | --- |
| Transactions/recent transactions | PostgreSQL records; integer IDs, Decimal amounts serialized as strings. |
| Dashboard metrics | Browser calculations. Selected-month net income is labeled savings; cumulative transaction balance is not an account balance. |
| Category pie chart | Saved expenses filtered by selected month/year; colors use `pie-color`. |
| Area/bar income-expense charts | Twelve months of the current calendar year, independent of the page's selected year. |
| Weekly report | Category and selected month/year filters; four buckets: days 1-7, 8-14, 15-21 and 22 through month-end. |
| Monthly history/category breakdown | Up to six populated months for history; all fetched expenses for category breakdown. Neither follows page filters. |
| Budget API | PostgreSQL budgets/categories/transactions; sums only expenses in the budget's category and month, or all categories for an overall budget. Remaining may be negative. |
| Budget cards | Backend `budget`, `spent`, `remaining`, and `usage_percentage`; no independent financial recalculation. |
| Budget progress/performance | `/budgets?month=...&year=...`, follows the dashboard/report selected period. |
| Goals/tools | Browser state with no user account or backend synchronization. |

Both JSON fixtures in `frontend/src/data/` remain unused by current charts. The old `backend/src/backend/transactions.py` sample router remains on disk but is no longer registered or used by FastAPI. Sample records are not inserted into PostgreSQL.

## Known integration gaps

- **Editing:** add frontend budget/transaction edit forms for the existing update endpoints.
- **Fetching:** consolidate remaining repeated chart/page requests; the shared list hook already refreshes budgets, category choices, transaction tables and recent transactions on writes/window focus.
- **Analytics:** centralize financial calculations and make filter scope consistent.
- **Goals/tools:** implement goal entries, persistence and synchronization.
- **Features:** accounts, category rename/delete management, persistent subscriptions, CSV import and settings management remain incomplete.
- **Security/delivery:** users, authentication, ownership checks, frontend tests, GitHub Actions and production API/frontend images are not implemented.

`frontend/src/types/api.ts` defines shared Budget, Category and Transaction response types for the connected forms/cards. Some older analytics components still define local types. API validation, foreign keys and budget uniqueness constraints exist, but this remains a development application without user isolation.

## Repository structure

```text
kingdevs-finance-engine/
|-- README.md
|-- AGENTS.md
|-- pnpm-workspace.yaml           # frontend workspace only
|-- pnpm-lock.yaml
|-- frontend/
|   |-- package.json
|   |-- next.config.ts            # React Compiler enabled
|   |-- biome.json
|   |-- tsconfig.json             # strict; @/* -> src/*
|   +-- src/
|       |-- app/                  # pages, layout, styles, 404
|       |-- components/           # features and shared UI
|       |-- data/                 # retained unused chart fixtures
|       |-- lib/                  # finance API helper and refreshable list hook
|       +-- types/api.ts          # Budget, Category and Transaction responses
+-- backend/
    |-- README.md                 # setup and API guide
    |-- docker-compose.yml        # PostgreSQL only
    |-- pyproject.toml
    |-- uv.lock
    |-- alembic.ini
    |-- migrations/
    |   |-- README                # migration workflow
    |   |-- env.py
    |   |-- script.py.mako
    |   +-- versions/             # 0001 foundation; 0002 category budgets
    |-- tests/test_backend.py
    +-- src/backend/
        |-- main.py
        |-- transactions.py       # retained sample router; unused
        |-- database/             # Base, URL loading, sessions
        |-- models/               # Budget, Category and Transaction
        |-- schemas/              # Pydantic requests/responses
        |-- services/             # shared category resolution
        +-- routes/               # budgets, categories and persisted transactions
```

There is no root `package.json`. Python package management is separate from pnpm. The root App Router layout provides fonts, theme, sidebar and toasts. Shared UI primitives live in `frontend/src/components/ui`.

## Development commands and verification

From the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm --dir frontend dev` | Next.js development on port 3001. |
| `pnpm --dir frontend lint` | Read-only Biome checks. |
| `pnpm --dir frontend exec tsc --noEmit --incremental false` | Typecheck without writing incremental metadata. |
| `pnpm --dir frontend build` | Production build; configure the API URL first. |
| `pnpm --dir frontend start -p 3001` | Serve an existing build on the CORS-compatible port. Without `-p`, Next defaults to 3000. |
| `pnpm --dir frontend format` | Format source files; writes changes. |

From `backend/`:

| Command | Purpose |
| --- | --- |
| `uv sync --locked` | Install locked Python dependencies. |
| `docker compose ps` | Inspect this project's database service. |
| `docker compose logs --tail 50 db` | Read database logs. |
| `docker compose stop db` | Stop PostgreSQL while retaining data. |
| `uv run alembic current` | Show database revision. |
| `uv run alembic check` | Compare database schema with model metadata. |
| `uv run python -B -m unittest discover -s tests -v` | Run the 28 backend regressions. |

The suite covers imports/configuration, persistent transaction CRUD, category reuse, category/month/type isolation, budget CRUD/conflicts, validation, leap days, migration preservation and guarded rollback. It uses isolated SQLite memory and renders PostgreSQL migration SQL. All 28 tests passed during category integration; live PostgreSQL checks also passed and their rows were rolled back. Migration `0002` was applied, the existing budget was preserved, and `alembic check` reported no pending changes. TestClient emits an httpx deprecation warning; SQLite expression-index reflection also warns, so PostgreSQL schema parity was checked separately.

The frontend typecheck currently reports eight pre-existing errors in Compound Interest, Paycheck Splitter, Salary Converter and Trip Budget UI props; no category-integration file reports a type error. No full browser end-to-end run is claimed. No frontend automated suite or GitHub Actions workflow is present. `backend-test.tsx` is a UI health indicator.

The root lockfile contains frontend dependencies and separate package-manager metadata; use the manifest's pnpm version and review installation changes. Before editing Next.js code, follow [AGENTS.md](AGENTS.md) and the bundled guides in `frontend/node_modules/next/dist/docs/`.

## Next development steps

1. Fix the existing tool-component type errors and establish frontend checks.
2. Add edit forms, transaction pagination and category management; consolidate analytics fetching.
3. Introduce users, JWT/refresh sessions and owner-scoped authorization.
4. Add accounts, goals/contributions, subscriptions and settings persistence.
5. Centralize dashboard/reports and build CSV import.
6. Expand financial/security coverage, adopt Pytest if desired, add frontend tests and GitHub Actions.
7. Package API/frontend deployment and document backup/recovery.
8. Add Redis, RQ/Celery, OAuth expansion or bank synchronization when required.

Tests and migrations should accompany backend changes. PostgreSQL is required for transactions, categories and budgets; Redis and workers remain deferred.
