# KingDev's Finance Engine

A personal finance application for viewing income, expenses, transactions, budgets, savings goals, and reports in one interface.

The project contains a Next.js frontend and an early FastAPI backend. The frontend fetches sample transactions from the API, supports transaction filtering, and provides local goal management and financial tools. PostgreSQL persistence, authentication, and bank integration are not implemented yet.

The backend currently returns a fixed transaction list. Its create endpoint validates and echoes a transaction without saving it. Goals and most tools use temporary React state; the wish list saves its data in browser localStorage.

## Pages and features

| Route | What is available | Current limitations |
| --- | --- | --- |
| `/` | Landing page with dashboard, developer website, and GitHub links, plus a backend health indicator. | The indicator checks `/health`; it does not verify a database connection. |
| `/dashboard` | Balance, income, expense, and savings cards; spending chart; switchable area/bar chart; budget progress; five most recent transactions. | Summary amounts are hardcoded. Month/year selectors do not filter the data, and Add Transaction has no action. |
| `/transactions` | Fetches API transactions; filters by merchant/category/bank search, type, category, bank, dates, and amount; supports clearing filters and loading/error states. | Filtering is client-side over fixed API records. Add Transaction has no handler. Delete sends a request, but the backend has no delete endpoint. |
| `/budgets` | Sample budget cards with budget, spent, remaining, and usage indicators. | Cards contain repeated placeholder values; adding and deleting budgets are not implemented. |
| `/goals` | Creates savings/debt-payoff goals in a dialog; displays target, progress, and income/expense summaries; confirms deletion and displays a toast. | Goals reset on reload. Add Entry fields are present but do not update income, expenses, or contributions. No goal API exists. |
| `/reports` | Sample charts and summary cards, plus monthly history/category breakdown that fetch transactions from the API. | Report calculations remain in the frontend; income type comparisons need fixing. Summary cards and chart datasets do not reconcile with API transactions. |
| `/tools` | Subscription Checker, Paycheck Splitter, Salary Converter, Bill Splitter, Compound Interest, Trip Budget, and Wish List tabs. | Tools run in the browser. Only the wish list persists its inputs across reloads; none connects to a financial backend. |
| `/ai` | An AI assistant page heading and description. | No assistant, model configuration, or AI service is connected. |
| `/settings` | Tabs for Import CSV, Preferences, Downloadables, Rules, Categories, and Clear Data. | Import/export and management panels are placeholders. Clear Data has no deletion handler; its database/reseeding description does not reflect an implemented backend. |

The shared interface includes a collapsible sidebar, responsive layouts, light/dark/system themes, animated page entrances, chart tooltips, reusable form controls, confirmation dialogs, and Sonner toasts. Unknown routes display a custom 404 page with links to the home page and dashboard.

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

Frontend versions below reflect [frontend/package.json](frontend/package.json).

| Area | Technology |
| --- | --- |
| Framework | Next.js `16.3.5`, App Router |
| UI | React and React DOM `19.2.8` |
| Language | TypeScript `^5`, with strict mode enabled |
| Styling | Tailwind CSS `^4`, PostCSS, CSS theme variables, `tw-animate-css` |
| Components | shadcn configuration using the `aria-nova` style, React Aria Components, Radix UI |
| Charts | Recharts `3.8.0` |
| Motion and themes | Motion `^13.4.0`, next-themes `^0.4.6` |
| Toasts | Sonner `^2.0.8` |
| Icons and dates | Lucide React, React Icons, `@internationalized/date`, date-fns |
| Code quality | Biome `2.4.2` |
| Package manager | pnpm `12.8.1` |

React Compiler is enabled in `frontend/next.config.ts`. The root layout configures Geist, Geist Mono, DM Sans, and Nunito Sans through `next/font/google`.

Backend requirements are declared in [backend/pyproject.toml](backend/pyproject.toml), with resolved dependencies in `backend/uv.lock`.

| Area | Current backend setup |
| --- | --- |
| Python | `>=3.13`; `.python-version` selects `3.13` |
| API | `fastapi[standard]>=0.142.2`, including the development/server tooling |
| Validation | Pydantic transaction create/update/read schemas with dates, lowercase types, and positive Decimal amounts |
| ORM dependency | `sqlalchemy>=2.1.1`; database and model files are still empty |
| Migrations dependency | `alembic>=1.20.0`; migration environment initialized but not connected to model metadata or a database |
| Package management | uv, `pyproject.toml`, `uv.lock`, and the `uv_build` build backend |

## Getting started

### Prerequisites

- Node.js **20.9 or newer**, as required by the installed Next.js version.
- pnpm **12.8.1**, matching the frontend's `packageManager` declaration.
- Python **3.13** and **uv** for the backend. See the [uv project guide](https://docs.astral.sh/uv/guides/projects/) for environment and dependency management.

If pnpm is not installed, install the declared version:

```sh
npm install --global pnpm@12.8.1
```

### 1. Start the backend

In one terminal, starting from the repository root:

```sh
cd backend
uv sync --locked
uv run uvicorn backend.main:app --app-dir src --reload --host 127.0.0.1 --port 8000
```

The FastAPI application is `backend.main:app`, defined in `backend/src/backend/main.py`. Uvicorn serves that application using its module and attribute name. [FastAPI server documentation](https://fastapi.tiangolo.com/deployment/manually/)

Open [API health](http://127.0.0.1:8000/health) or [Swagger UI](http://127.0.0.1:8000/docs). Health returns `{"status":"Ok"}`. No PostgreSQL instance or backend database credentials are needed for the current sample endpoints.

The project's `uv run backend` console command only prints `Hello from backend!`; it does **not** start the API. Use the Uvicorn command above.

### 2. Configure the frontend

Create or update `frontend/.env.local` with the API base URL, without a trailing slash:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

The frontend reads this value for health and transaction requests. Put the file in `frontend/`, not the repository root or `frontend/src/`, and restart Next.js after changing it. `NEXT_PUBLIC_` values are visible to the browser; this variable contains a public API address, not a secret.

The backend allows browser origins `http://localhost:3001` and `http://127.0.0.1:3001`. A different frontend hostname or port requires a corresponding CORS configuration change.

### 3. Start the frontend

In a second terminal, from the repository root:

```sh
pnpm install
pnpm --dir frontend dev
```

Open **http://localhost:3001** for the landing page, **http://localhost:3001/transactions** for transaction filtering, or **http://localhost:3001/dashboard** for the dashboard. Keep the backend running for API-dependent components. No sign-in is required.

Dependency installation requires network access; the configured Google fonts may also require network access during compilation. Some dashboard/report components fetch at module scope, so frontend compilation or rendering can also depend on API availability.

The root `pnpm-lock.yaml` contains the frontend dependency graph and package-manager metadata, including pnpm `12.4.2` tooling. The setup version above follows the frontend manifest's `12.8.1` declaration. Review any lockfile changes produced by installation.

On Windows PowerShell, use `pnpm.cmd` in place of `pnpm` if script execution policy prevents the PowerShell launcher from running.

## Commands

Application scripts live in `frontend/package.json`; there is no root `package.json`. Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install workspace dependencies. |
| `pnpm --dir frontend dev` | Start the development server on port `3001`. |
| `pnpm --dir frontend build` | Create a production build. |
| `pnpm --dir frontend start` | Serve an existing production build on port `3000` by default. |
| `pnpm --dir frontend lint` | Run Biome checks without rewriting files. |
| `pnpm --dir frontend format` | Format files with Biome; this command writes changes. |

For a local production run on port `3001`:

```sh
pnpm --dir frontend build
pnpm --dir frontend start -p 3001
```

The production server requires a successful build first. Configure `NEXT_PUBLIC_API_URL` before building. The repository does not currently include an automated test suite, a test script, a CI workflow, or container/deployment configuration.

Backend commands, run from `backend/`:

| Command | Purpose |
| --- | --- |
| `uv sync --locked` | Synchronize the Python environment using the existing manifest and lockfile. |
| `uv run uvicorn backend.main:app --app-dir src --reload --host 127.0.0.1 --port 8000` | Run the development API on port `8000`. |

Alembic is present, but migrations are not ready to apply: `target_metadata` is `None`, the connection URL is still a template value, and there are no revision files.

## Current API

The API currently uses unversioned paths. It does **not** expose the planned `/api/v1` routes or require authentication.

| Method | Path | Current behavior |
| --- | --- | --- |
| GET | `/` | Returns `{"message":"Finance Engine API"}`. |
| GET | `/health` | Returns `{"status":"Ok"}`; process response only, no database readiness check. |
| GET | `/transactions` | Returns 30 fixed sample transactions from `backend/src/backend/transactions.py`. No pagination or server-side filtering. |
| POST | `/transactions` | Validates `TransactionCreate`, returns a `TransactionRead` with fixed `id: 1`, and does not persist the result. Current success status is 200. |
| GET | `/docs` | Swagger UI. |
| GET | `/redoc` | ReDoc API reference. |
| GET | `/openapi.json` | Generated OpenAPI schema. |

There are no transaction detail, update, or delete routes. `backend/src/backend/routes/transactions.py` contains a separate two-record sample router, but `main.py` imports the router in `backend/src/backend/transactions.py`; the `routes/` copy is not registered.

Example body for `POST /transactions`:

```json
{
  "date": "2026-10-01",
  "merchant": "Coffee Shop",
  "category": "Dining",
  "bank": "Chase",
  "type": "expense",
  "amount": "4.50"
}
```

The schema requires a valid date, nonempty merchant/category/bank, `income` or `expense`, and a positive amount with at most two decimal places. Invalid input receives FastAPI validation errors. Posting this example does not change the subsequent GET list. `TransactionUpdate` exists as a schema but has no endpoint yet.

## Repository structure

```text
kingdevs-finance-engine/
|-- backend/
|   |-- .python-version           # Python 3.13
|   |-- pyproject.toml            # Python dependencies and package configuration
|   |-- uv.lock                   # Resolved Python dependencies
|   |-- alembic.ini               # Migration configuration template
|   |-- migrations/
|   |   |-- env.py                # target_metadata is not configured yet
|   |   |-- script.py.mako
|   |   `-- README
|   |-- README.md                 # Currently empty
|   `-- src/backend/
|       |-- __init__.py           # Placeholder console command
|       |-- main.py               # FastAPI app, CORS, health, sample create route
|       |-- transactions.py       # Registered 30-record sample GET router
|       |-- routes/transactions.py # Separate, unregistered sample router
|       |-- schemas/transaction.py # Pydantic request/response schemas
|       |-- models/transaction.py # Empty model placeholder
|       `-- database/database.py  # Empty database placeholder
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |   |-- layout.tsx         # Fonts, theme provider, sidebar, page shell
|   |   |   |-- page.tsx           # Landing page, navigation, backend status
|   |   |   |-- not-found.tsx      # Custom 404 page
|   |   |   |-- globals.css        # Tailwind imports and theme/chart tokens
|   |   |   |-- dashboard/
|   |   |   |-- transactions/
|   |   |   |-- budgets/
|   |   |   |-- goals/
|   |   |   |-- reports/
|   |   |   |-- tools/
|   |   |   |-- ai/
|   |   |   `-- settings/          # Each route directory contains page.tsx
|   |   |-- components/
|   |   |   |-- budgets/           # Budget cards
|   |   |   |-- charts/            # Spending, cash flow, and budget charts
|   |   |   |-- dashboard/         # Metrics and recent transactions
|   |   |   |-- goal/              # Goal cards and entry fields
|   |   |   |-- reports/           # Monthly and category summaries
|   |   |   |-- settings/          # Settings tabs
|   |   |   |-- tools/             # Calculators, subscriptions, trip planner, wish list
|   |   |   |-- transactions/      # Transaction table
|   |   |   |-- ui/                # Shared UI primitives
|   |   |   |-- header.tsx         # Collapsible sidebar navigation
|   |   |   |-- backend-test.tsx   # Health indicator, not an automated test
|   |   |   |-- pageTransitions.tsx
|   |   |   `-- theme-provider.tsx
|   |   |-- data/                  # Two bundled chart JSON fixtures
|   |   |-- lib/utils.ts           # Shared class-name utility
|   |   `-- types/api.ts           # Empty placeholder for future API types
|   |-- biome.json
|   |-- components.json           # shadcn configuration
|   |-- next.config.ts
|   |-- package.json
|   |-- postcss.config.mjs
|   `-- tsconfig.json
|-- AGENTS.md                      # Repository instructions for coding agents
|-- CLAUDE.md                      # Reference to agent instructions
|-- pnpm-workspace.yaml            # Workspace includes frontend only
|-- pnpm-lock.yaml
`-- README.md
```

## Architecture and data

The App Router defines pages in `frontend/src/app`. The root layout wraps every page with the theme provider and sidebar. Feature components live under `src/components`, and reusable UI primitives live under `src/components/ui`. The `@/*` import alias resolves to `frontend/src/*`.

This is a mixed frontend/backend prototype. FastAPI supplies sample transactions, while chart JSON, hardcoded metrics, and browser state still supply other features. There are no Next.js API route handlers or server actions; frontend fetch calls target the separate FastAPI server through `NEXT_PUBLIC_API_URL`.

```text
Next.js frontend (port 3001)
  |-- HTTP /health and /transactions -> FastAPI (port 8000)
  |                                      `-- Fixed Python sample records
  |-- JSON fixtures / constants -> Charts and summary cards
  |-- React state -> Goals, subscriptions, calculators, trip planner
  `-- localStorage -> Wish list and theme

PostgreSQL is not connected.
```

| Data source | Shape | Used for |
| --- | --- | --- |
| [Transaction API sample data](backend/src/backend/transactions.py) | `id`, `date`, `merchant`, `category`, `bank`, `type`, `amount` | Transaction table, recent transactions, monthly history, and category breakdown fetch this endpoint. |
| [incomeExpenseChartData.json](frontend/src/data/incomeExpenseChartData.json) | `date`, `income`, `expenses` | Shared area and bar charts showing sample monthly totals. |
| [spendingChartData.json](frontend/src/data/spendingChartData.json) | `category`, `amount`, `fill` | Spending doughnut chart, total spending, and category colors. |
| Constants inside pages/components | Dashboard/report metrics, budgets, and weekly spending | Placeholder cards and comparison charts. |
| `app/goals/page.tsx` | Local goal array and creation form | Goal creation/deletion; cards derive progress and remaining amount from goal fields. |
| `tools/subscriptions.tsx` | Initial subscription array and local form/list state | Subscription tracking and estimated recurring costs. |
| `tools/trip-budget.tsx` | Sample expense options, checklist, and editable local state | Trip planning and cost comparisons. |
| `tools/wish-list.tsx` | Items and budget stored in localStorage | Wish-list editing, scoring, deadlines, and budget planning. |
| Calculator component state | User-entered amounts, rates, percentages, and periods | Paycheck, salary, bill, and compound-interest calculations. |

The GET transaction samples use integer IDs, ISO `YYYY-MM-DD` dates, lowercase `income`/`expense` types, and positive numeric amounts. The create/read Pydantic schemas use Decimal amounts; the POST response serializes the amount as a string. The frontend table currently declares a string ID and numeric amount, so the shared request/response contract still needs alignment. Currency displays use US dollar formatting.

Recent transactions are sorted by date and limited to five entries. Monthly history and category breakdown compute their aggregates in the frontend. Both still check `type === "Income"`, although the API returns lowercase `income`; their current calculations therefore misclassify income and should not be treated as accurate financial reports.

The previous `frontend/src/data/transactionData.json` file is no longer present. The two remaining chart fixtures and hardcoded summary values are independent of the API transaction samples, so figures across cards, charts, and tables are not expected to reconcile.

### Browser persistence

The wish list uses the localStorage keys `what-to-buy-items` and `what-to-buy-budget`. These values belong to the browser profile and site origin, not an authenticated account. They do not sync across devices and can be lost if site data is cleared. A different port or hostname has separate browser storage.

Theme selection is also persisted locally by next-themes. Goals, subscription changes, trip plans, and calculator inputs are not saved across reloads. Uploading a subscription icon reads the image into local component state; it does not upload a file to a server.

## Known integration gaps

- **Transaction writes:** POST echoes a validated object with a fixed ID. The frontend delete handler calls an endpoint that does not exist. Add Transaction is not connected to a form or API call.
- **Fetching:** The transaction table has two equivalent mount effects, causing duplicate GET requests. Recent transactions, monthly history, and category breakdown fetch at module scope and have no coordinated refresh after mutations.
- **Reports:** Uppercase income comparisons conflict with the API's lowercase values. Major totals remain split between API samples, JSON fixtures, and constants.
- **Goals:** Create/delete work only in component state. Add Entry has no submission handler, so contribution/income/expense fields remain at their initial values.
- **Database and migrations:** SQLAlchemy and Alembic are installed dependencies, but engine/session/model files and migration metadata are not implemented. No PostgreSQL driver is declared in the backend manifest.
- **Authentication and delivery:** No user ownership, JWT/OAuth, automated test suite, Docker setup, or GitHub Actions workflow exists yet. The API is a local development prototype.

## Configuration and development

- **Routing and layout:** `frontend/src/app` contains route pages, the shared layout, and the 404 page.
- **Theme and styling:** `frontend/src/app/globals.css` defines light/dark colors, chart palettes, metric colors, and Tailwind theme mappings. Theme selection is handled by next-themes.
- **UI configuration:** `frontend/components.json` defines shadcn aliases, the `aria-nova` style, the `mist` base color, and Lucide icons.
- **TypeScript:** `frontend/tsconfig.json` enables strict checking and the `@/*` source alias.
- **API configuration:** Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local`; the current backend does not consume database environment settings.
- **Backend entry point:** `backend/src/backend/main.py` defines the FastAPI application; `backend/src/backend/__init__.py` only defines the placeholder console command.
- **Validation and migrations:** Transaction schemas are in `backend/src/backend/schemas/transaction.py`; Alembic configuration is present but unfinished.
- **Formatting and linting:** `frontend/biome.json` uses two-space indentation, recommended checks, and React/Next.js rules.
- **Workspace:** `pnpm-workspace.yaml` includes only `frontend` and disables dependency build scripts for `sharp` and `unrs-resolver`.
- **Generated files:** Dependency directories, `.next`, build output, environment files, and TypeScript build metadata are ignored by Git.

For code changes, use `pnpm --dir frontend lint` to check code style and `pnpm --dir frontend build` to check production compilation.

No automated backend tests are defined yet. `frontend/src/components/backend-test.tsx` is a UI health indicator, not a test suite. The current API can be inspected manually through `/docs`; a successful `/health` response does not validate persistence or financial calculations.

Coding agents should read [AGENTS.md](AGENTS.md) and the relevant guides bundled with the installed Next.js package under `frontend/node_modules/next/dist/docs/` before changing application code.

## Backend roadmap

Backend development has started: the Python package, uv lockfile, FastAPI application, Pydantic transaction schemas, sample endpoints, and Alembic skeleton now exist. The next steps are to connect PostgreSQL, implement SQLAlchemy models/sessions, configure migration metadata, and replace the fixed transaction responses with persistent operations. `frontend/src/types/api.ts` remains an empty placeholder, not a generated API contract.

The intended architecture is:

```text
Next.js / React frontend
          |
       HTTPS / REST
          |
    FastAPI backend
          |
    SQLAlchemy services
          |
      PostgreSQL
```

| Area | Technology | Current status |
| --- | --- | --- |
| Backend | Python + FastAPI | Implemented as an initial sample API |
| Database | PostgreSQL | Planned; not connected |
| ORM | SQLAlchemy 2.x | Dependency present; models and sessions pending |
| Validation | Pydantic | Transaction schemas implemented |
| Authentication | JWT access tokens, refresh sessions, OAuth support | Planned |
| Migrations | Alembic | Skeleton initialized; metadata, connection, and revisions pending |
| API documentation | FastAPI OpenAPI / Swagger | Available for the current routes |
| Testing | Pytest | Planned; no project test suite |
| Containers | Docker / Docker Compose | Planned |
| CI/CD | GitHub Actions | Planned |
| Later caching | Redis | Deferred until needed |
| Later background jobs | RQ or Celery | Deferred until durable jobs are needed |

Remaining implementation sequence:

1. Complete backend configuration, PostgreSQL connectivity, SQLAlchemy sessions/models, Alembic metadata, database readiness checks, and initial tests.
2. Users, secure authentication, sessions, and owner-scoped authorization.
3. Persistent accounts, categories, and transaction CRUD; align frontend types, pagination, and mutation behavior with the API.
4. Persistent budgets, goals, contributions, subscriptions, and preferences; connect the existing UI forms.
5. Shared backend calculations for dashboard and reports.
6. CSV preview, validation, duplicate review, import history, and atomic import.
7. Expanded financial, API, database, and security tests.
8. Container packaging, CI/CD, production configuration, and recovery procedures.
9. Optional caching, workers, bank synchronization, OAuth expansion, notifications, and saved-tool synchronization.

Tests, migrations, and authorization should accompany each feature as it is introduced. Redis, background workers, and PostgreSQL are not required to run the current fixed-data API; PostgreSQL becomes necessary when persistent finance operations are implemented.
