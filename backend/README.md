# Finance Engine backend

Run commands in this guide from the repository's `backend/` directory unless otherwise stated.

See the [project README](../README.md) for frontend setup and feature status, and the [migration guide](migrations/README) for Alembic schema changes and rollback.

## Requirements

- Python 3.13 and uv; dependencies are declared in `pyproject.toml` and resolved in `uv.lock`.
- Docker Desktop running Linux containers and Docker Compose for local PostgreSQL.
- The frontend runs separately with Node.js and pnpm; only PostgreSQL is containerized here.

## Working setup

PostgreSQL now runs in this project's Docker container. FastAPI and Alembic run on Windows through the Python environment managed by uv.

| Setting | Value |
| --- | --- |
| Compose file | `backend/docker-compose.yml` |
| Compose project | `backend` (derived from this directory's name) |
| Database service | `db` |
| Container | `finance-engine-db` |
| Image | `postgres:17` |
| Windows connection | `127.0.0.1:5433` |
| Container's PostgreSQL port | `5432` |
| Database | `finance_engine` |
| Database role | `finance_user` |
| Persistent volume | `backend_finance_engine_postgres_data` |
| Applied migration | `0003 (head)` |
| Tables | `budgets`, `categories`, `transactions`, `alembic_version` |

The separate `finance-engine-example` project retains its PostgreSQL container on port 5432. Its containers, credentials, and volume were left untouched.

```text
Windows
  Next.js                  FastAPI / Alembic
  localhost:3001           Python + SQLAlchemy + Psycopg
       |                            |
       +--- HTTP to :8000 ----------+
                                    |
                           127.0.0.1:5433
                                    |
Docker Desktop                      v
  finance-engine-db       PostgreSQL :5432
                                    |
                        database: finance_engine
                                    |
                  backend_finance_engine_postgres_data
```

Only PostgreSQL is containerized by this Compose file. The API and frontend have their own development commands.

## Why the errors happened

There were three successive problems:

1. **Python import error.** Alembic loaded `migrations/env.py`, which imported `Base` from `backend.database`. That package's `__init__.py` was empty. Python does not automatically export classes from other files in a package. In addition, `database/base.py` contained copied Alembic code that imported itself; `get_db` and the transaction model were missing.
2. **Missing database configuration.** After the imports were repaired, the backend correctly detected the blank `DATABASE_URL`. A driver and model definitions do not tell the backend which database to connect to.
3. **Docker port conflict.** The new Compose file tried to publish `5432:5432`, but another project already occupied the host's port 5432. Docker reported `port is already allocated`, leaving `finance-engine-db` in the Created state.

The Python layer now has one shared SQLAlchemy base, a session dependency, registered models, and working Alembic metadata. The Psycopg driver and dotenv reader are declared and locked. This project's Docker port mapping and backend URL now use port 5433. Its previously configured password was preserved and moved out of the Compose file into the ignored `.env`.

The later category-budget change exposed a separate model error: the budget uniqueness constraint named `category`, but no such column existed. SQLAlchemy checks constraints when building model metadata and raised `ConstraintColumnNotFoundError` before Alembic could run. The model and migration now both define the column and its relationship. Merely mentioning a field in a constraint does not create that field or link it to transactions.

## What each file does

| File | Purpose |
| --- | --- |
| `docker-compose.yml` | Defines the database container, port mapping, initialization settings, volume, and health check. |
| `.env` | Holds the local database password and the backend connection URL. Git ignores this file. |
| `pyproject.toml` / `uv.lock` | Declare and lock Python dependencies, including Psycopg. |
| `src/backend/database/base.py` | Defines the shared SQLAlchemy model registry. |
| `src/backend/database/database.py` | Reads the URL and supplies a separate session per request. |
| `src/backend/models/` | Defines the expected database tables. |
| `alembic.ini` | Locates the migration scripts and Python source package. |
| `migrations/env.py` | Connects Alembic to the same URL and model metadata used by the backend. |
| `migrations/versions/0001_create_budgets_and_transactions.py` | Creates the first financial tables and their constraints. |
| `migrations/versions/0002_category_budgets.py` | Adds shared categories, foreign keys, category budget uniqueness, and preserves existing data. |
| `migrations/versions/0003_category_colors.py` | Adds validated category colors, preserving existing names, links and financial rows. |
| `src/backend/category_colors.py` | Defines the 17 permitted tokens from the frontend's chart palette. |
| `src/backend/services/categories.py` | Resolves saved category names regardless of capitalization/outer spaces; rejects unknown categories. |
| `src/backend/routes/transactions.py` | Persists transaction CRUD; the old sample router is not registered. |
| `src/backend/routes/budgets.py` | Persists budgets and computes spending from matching saved expenses. |
| `src/backend/routes/categories.py` | Lists/creates categories, lists the chart palette and updates category colors. |
| `src/backend/main.py` | Creates FastAPI and registers the routes. |

## Step 1: Understand the connection settings

The existing local `backend/.env` was configured during setup. For a fresh checkout, create it with your chosen local password. Its structure is:

```dotenv
POSTGRES_PASSWORD='YOUR_EXISTING_PASSWORD'
DATABASE_URL='postgresql+psycopg://finance_user:YOUR_EXISTING_PASSWORD@127.0.0.1:5433/finance_engine'
```

These are placeholders, not working credentials. Preserve actual values if the file is already configured. Git ignores `.env`; the password is not stored in the Compose file.

- `POSTGRES_PASSWORD` is read by Docker Compose and passed to PostgreSQL when it initializes an empty data volume.
- `DATABASE_URL` is read by the Python backend and Alembic.
- `postgresql+psycopg` selects PostgreSQL and the installed Psycopg driver.
- `finance_user` is the database login.
- `127.0.0.1:5433` is the address used by programs running on Windows.
- `finance_engine` is the database inside the PostgreSQL server.

Reserved characters in the password must be URL-encoded in `DATABASE_URL`; `POSTGRES_PASSWORD` retains the actual password. The application resolves `.env` relative to the backend directory. A process-level `DATABASE_URL` takes precedence, including an explicitly empty value. Restart the API after changing connection settings because it caches its session factory. See SQLAlchemy's [Psycopg connection documentation](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#module-sqlalchemy.dialects.postgresql.psycopg).

Docker's initialization variables apply when the data directory is empty. Editing `POSTGRES_PASSWORD` later does not change the password of a role already stored in the volume. The image creates the role from `POSTGRES_USER` with superuser privileges; this setup is for local development. See the [official PostgreSQL image documentation](https://hub.docker.com/_/postgres).

## Step 2: Understand the Compose file

The service has these responsibilities:

- `image: postgres:17` selects the PostgreSQL 17 image already present locally.
- `container_name: finance-engine-db` gives this project's container a recognizable name.
- `restart: unless-stopped` allows Docker to restart the service unless you explicitly stop it.
- `POSTGRES_USER: finance_user` and `POSTGRES_DB: finance_engine` set the initial role and database.
- `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?...}` requires the password from `.env` instead of keeping it in the tracked Compose file.
- `127.0.0.1:5433:5432` publishes the database on the Windows loopback address at port 5433 and forwards connections to port 5432 inside this container.
- The named volume mounts at `/var/lib/postgresql/data`, the data location used by this PostgreSQL 17 image.
- `pg_isready` checks readiness every five seconds. This confirms PostgreSQL is accepting connections; it does not verify that application tables have been migrated.

Each container has its own networking context, so both projects can use internal port 5432. Their published Windows ports must differ. If the API is containerized later on the same Compose network, it would connect to `db:5432`; the current Windows-hosted API uses `127.0.0.1:5433`. See Docker's [Compose service reference](https://docs.docker.com/reference/compose-file/services/).

## Step 3: Start and check PostgreSQL

Open Docker Desktop. From the repository root, enter `backend/`, then:

```powershell
cd backend
docker compose config --quiet
docker compose up -d --wait --wait-timeout 60 db
docker compose ps
```

`config --quiet` validates configuration without printing resolved secrets. `up` creates or updates this project's service; `-d` runs it in the background, and `--wait` waits for the health check. The expected result is `finance-engine-db` running and healthy with `127.0.0.1:5433->5432/tcp`. See [docker compose up](https://docs.docker.com/reference/cli/docker/compose/up/).

For startup diagnostics:

```powershell
docker compose logs --tail 50 db
docker compose exec db pg_isready -U finance_user -d finance_engine
```

The service was verified healthy during setup. These commands are the repeatable startup procedure; use `docker compose ps` to check its current state.

## Step 4: Apply and verify the database schema

```powershell
uv sync --locked
uv run alembic upgrade head
uv run alembic current
uv run alembic check
```

- `uv sync --locked` installs the declared Python dependencies at their locked versions.
- `upgrade head` applies pending migration files. Revisions `0001` through `0003` have been applied locally; a fresh checkout needs all three.
- `current` should report `0003 (head)`.
- `check` should report `No new upgrade operations detected.`

Docker creates the PostgreSQL server and database. Alembic creates the application's tables inside that database. SQLAlchemy models describe the desired schema but do not create it on their own.

The initial migration creates `budgets` and `transactions`; `0002` adds shared `categories` and the budget/transaction references; `0003` adds category chart colors. Alembic records its revision in `alembic_version`. Budgets that predate categories are preserved with `category = NULL`, keeping their original All categories scope. Existing transaction categories are backfilled and normalized by `0002`; no demo transactions are inserted.

For a future model change, the workflow is:

```powershell
uv run alembic revision --autogenerate -m "describe the model change"
# Review the generated migration file before applying it.
uv run alembic upgrade head
uv run alembic check
```

`revision --autogenerate` writes a proposed migration by comparing the database with the model metadata. `upgrade` executes migrations. Your original "create budgets table" revision is already supplied, so generating it again is unnecessary. See [Alembic autogeneration](https://alembic.sqlalchemy.org/en/latest/autogenerate.html).

## Step 5: Start FastAPI

In a backend terminal:

```powershell
uv run uvicorn backend.main:app --app-dir src --reload --host 127.0.0.1 --port 8000
```

Keep that terminal open while developing. Restart an already-running backend to pick up the new connection configuration.

- API: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Swagger: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- OpenAPI schema: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

`uv run backend` still invokes the original hello-world entry point; use Uvicorn to run the API.

In another PowerShell terminal, verify:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/budgets
```

`/health` reports that the API is running. `/budgets` actually queries PostgreSQL; on a fresh database, the underlying JSON is `[]`. Once budgets are saved, it returns those records. PowerShell may display no output for an empty array.

## Step 6: Link a category budget to expenses

First create `Groceries` in **Settings → Categories**, or use `POST /categories` in Swagger with `{"name":"Groceries","color":"chart-emerald-2"}`. If it already exists, select it instead of creating a duplicate. Category and transaction/budget creation are now separate actions.

Open `/docs`, expand `POST /budgets`, select **Try it out**, and send:

```json
{
  "category": "Groceries",
  "month": 10,
  "year": 2026,
  "amount": "400.00"
}
```

Expected status: **201 Created**. On an empty transaction table, the response includes a budget of `"400.00"`, spent of zero, remaining of `"400.00"`, and usage of `0.0`. PostgreSQL generates the ID; do not assume it starts at 1. `Groceries` must already exist; otherwise the API returns 422.

Next send `POST /transactions`:

```json
{
  "date": "2026-10-03",
  "merchant": "Supermarket",
  "category": "Groceries",
  "bank": "Chase",
  "type": "expense",
  "amount": "125.00"
}
```

This returns **201 Created** and saves the expense. `GET /budgets/{id}` now returns the following shape (the ID is illustrative):

```json
{
  "id": 123,
  "category": "Groceries",
  "month": 10,
  "year": 2026,
  "budget": "400.00",
  "spent": "125.00",
  "remaining": "275.00",
  "usage_percentage": 31.25
}
```

The request field is `amount`; the response field is `budget`. The frontend now uses `budget`, `spent`, `remaining` and `usage_percentage` from the API. Money remains Decimal/NUMERIC in Python/PostgreSQL and is serialized as strings; the frontend converts it for display.

The relationship is:

```text
categories.name = "Groceries"
       ^                              ^
       | foreign key                  | foreign key
budgets.category                 transactions.category
month=10, year=2026               date=2026-10-03
amount=400.00                    type=expense, amount=125.00

spent     = SUM(expense amounts for this category within this month)
remaining = budget amount - spent
usage     = spent / budget amount * 100
```

Rules:

- Matching is by shared category, transaction date, and `expense` type. Income, other categories and other months are excluded; bank/merchant do not affect inclusion.
- Existing expenses count even if the budget is created later. Totals are computed when reading budgets, so transaction edits/deletes cannot leave a stored spending counter out of sync.
- The canonical name is reused for different capitalization and surrounding spaces: `Groceries`, `groceries`, and ` Groceries ` all refer to one category. Other spelling differences are different categories.
- A category can have one budget per month/year. Groceries and Dining may both have budgets in October. Duplicating Groceries for October returns 409, enforced in PostgreSQL as well as the API.
- `category: null` (or omitted on creation) means **All categories**. Existing monthly budgets retain this scope. A partial unique index allows at most one overall budget per period.
- Overall and category budgets overlap; their spending figures must not be added together. Deleting a budget deletes only the limit; it does not delete the transactions or category.
- Overspending makes remaining negative and usage greater than 100%. Progress bars stop visually at 100% while the numerical totals remain accurate.
- Budgets do not recur automatically into later months, reserve account funds, or move money. Category renaming/deletion and transaction splitting are not implemented.

`PUT /budgets/{id}` updates supplied fields and preserves omitted ones. Setting `category` to null changes a category budget to All categories (subject to uniqueness); other explicit null fields are rejected. `PATCH /transactions/{id}` updates a saved transaction. Update forms are not yet connected in the UI; use Swagger. All these examples write to your local database.

Names must be nonblank and at most 100 characters. Invalid periods, nonpositive amounts, excess decimal places and amounts beyond `NUMERIC(12, 2)` return 422.

In the UI, create a category in Settings, create a budget with **One category**, then select that same category when adding an expense. Choose the budget's month/year on Dashboard or Reports to see its progress. Both forms use saved-category dropdowns backed by `GET /categories`. Budget, category, pie-chart and transaction views refresh after frontend writes and when their window regains focus. External API edits appear on refresh/focus; there is no live push connection. Wish List and Paycheck Splitter retain their separate categories.

## Step 7: Inspect the database directly

Open PostgreSQL's SQL shell inside this project's container:

```powershell
docker compose exec db psql -U finance_user -d finance_engine
```

At its SQL prompt:

```sql
\dt
SELECT version_num FROM alembic_version;
SELECT name, color FROM categories ORDER BY name;
SELECT id, category, month, year, amount FROM budgets;
SELECT count(*) FROM transactions;
\q
```

`\dt` lists tables; `\q` exits. This avoids installing a separate Windows psql client.

A desktop database client can use host `127.0.0.1`, port `5433`, database `finance_engine`, user `finance_user`, and the password from your local `.env`.

## Daily start, stop, and persistence

| Task | Command from backend |
| --- | --- |
| Start database and wait for readiness | `docker compose up -d --wait db` |
| Check this project's container | `docker compose ps` |
| Read recent database logs | `docker compose logs --tail 50 db` |
| Stop this database | `docker compose stop db` |
| Start an existing stopped container | `docker compose start db` |
| Restart this database | `docker compose restart db` |
| Stop API server | Press Ctrl+C in its Uvicorn terminal |
| Check migration state | `uv run alembic current` |
| Check models against the database | `uv run alembic check` |

The named volume holds database files separately from the container. Stopping or restarting the service retains those files. `docker compose down` removes this Compose project's containers/network while retaining its named volume by default. The `-v` option removes that volume and its database data, so it is not part of the normal stop procedure. See [docker compose down](https://docs.docker.com/reference/cli/docker/compose/down/).

Changing the directory name or passing a different Compose project name changes default resource names. Keep using this backend directory and its existing Compose project to reconnect to the same volume.

## Troubleshooting

| Symptom | Meaning and next action |
| --- | --- |
| `DATABASE_URL is not configured` | The backend did not find a nonblank URL. Check `backend/.env` and any process-level override. |
| `POSTGRES_PASSWORD ... required` from Compose | The local `.env` lacks the password Compose needs. |
| `port is already allocated` | Another service owns the published host port. This project uses 5433; the other project retains 5432. |
| Connection refused | Confirm Docker Desktop is running and `docker compose ps` shows the service running with port 5433. |
| Password authentication failed | The URL password differs from the role's actual password. Editing the initialization variable alone does not rotate an existing database password. |
| `relation ... does not exist` | Verify the target database, then apply `uv run alembic upgrade head`. |
| `Target database is not up to date` | Apply existing revisions before trying to autogenerate another one. |
| Empty budget list | No budget rows have been saved yet; this is a successful database read. |
| Budget spending stays zero | Check that the expense was saved through the API, uses the budget's category and lies within its month/year. Income is excluded. Old demo transactions are not seeded. |
| Budget returns 409 | A budget already exists for that category/month/year, including case/space variants; each period also allows only one All categories budget. |
| Cards disagree with Swagger | Restart stale frontend/backend processes, confirm both use the same API URL, and refresh the page. Cards now display API totals directly. |
| Add Transaction returns 422 | Read the validation detail; check date, nonblank category, required text fields, positive amount and two-decimal precision. Color is now optional. |

## Current API behavior and remaining work

Paths are unversioned and unauthenticated; no `/api/v1` prefix or user isolation is implemented.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/` | API welcome message. |
| GET | `/health` | Process health only; no database query. |
| GET | `/categories` | Returns names/colors as `[{"name":"Groceries","color":"chart-emerald-2"}]`, sorted alphabetically. |
| GET | `/categories/colors` | Returns allowed chart tokens and readable labels. |
| POST | `/categories` | Creates a category, 201; duplicate name, 409; invalid name/color, 422. |
| PATCH | `/categories/{name}` | Changes only the saved color; URL-encode names. Missing category, 404; invalid color, 422. |
| GET | `/transactions` | Database transactions ordered by descending date/ID; no pagination or server filters. |
| POST | `/transactions` | Saves a transaction using an existing category, 201; unknown category, 422. |
| GET | `/transactions/{id}` | Reads one saved transaction, 200; missing ID, 404. |
| PATCH | `/transactions/{id}` | Updates supplied fields; omitted fields unchanged, explicit null rejected. |
| DELETE | `/transactions/{id}` | Deletes a transaction, 204; missing ID, 404. |
| GET | `/budgets` | Database budgets with calculated totals; optional `month` and `year` query filters. |
| POST | `/budgets` | Creates a budget, 201; duplicate category/month/year, 409. |
| GET | `/budgets/{id}` | Reads a budget and computed totals; missing ID, 404. |
| PUT | `/budgets/{id}` | Partial field update; omitted fields preserved. `category: null` means All categories; other explicit nulls rejected. |
| DELETE | `/budgets/{id}` | Deletes a budget, 204; missing ID, 404. |
| GET | `/docs`, `/redoc`, `/openapi.json` | Generated API documentation. |

- Spending counts saved expenses in the category and month, including its last day. All categories budgets omit only the category filter.
- `src/backend/routes/transactions.py` is the registered persistent router. The retained `src/backend/transactions.py` sample file is unused.
- The category name is currently the natural primary key. Foreign keys prevent dangling budget/transaction references and restrict deletion of referenced categories. A future category-management feature should consider stable IDs and explicit rename behavior.
- There are no category rename/delete endpoints, account records, transaction pagination, recurring budgets, or edit forms yet. Remaining dashboard/report aggregates still run in the browser; budget aggregates run in the backend.
- Authentication and ownership scoping are not implemented; these routes remain a local development feature.

Valid transaction POST body (create `Dining` in Settings first):

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

Legacy `pie-color` or `pie_color` input is accepted but overridden with the category's color. The response always derives `pie-color` from the saved category. Type must be lowercase `income` or `expense`; amount must be positive with at most two decimal places and fit `NUMERIC(12, 2)`. A valid POST saves the row and makes it available to transactions, analytics and matching budgets.

## How the Settings category creator is made

The category is a shared record containing a **name** and a **chart color token**. Names remain the existing primary/foreign keys, so this feature does not reassign transactions or budgets. Creation happens explicitly in Settings; selecting a category elsewhere only references that saved record.

```text
Settings > Categories
  name + palette color -> POST /categories -> categories(name, color)
                                                  |
                       GET /categories -----------+
                        |             |            |
                 Transaction       Budget      Report filter
                   dropdown       dropdown       dropdown
                        |
                 saved transaction
                        |
                JOIN categories on name
                        |
             response pie-color = var(--saved-token)
                        |
               spending pie chart slice
```

### Backend pieces

| File | Responsibility |
| --- | --- |
| `src/backend/category_colors.py` | A Literal allowlist of 17 `chart-*-2` tokens. They correspond to CSS variables already defined in `frontend/src/app/globals.css`. |
| `src/backend/models/category.py` | Stores `name` and non-null `color VARCHAR(32)`; keeps case-insensitive name uniqueness and adds the database color CHECK. |
| `src/backend/schemas/category.py` | Validates trimmed, nonblank names of at most 100 characters and only supported palette colors. |
| `src/backend/routes/categories.py` | Handles listing, creation and color updates. Duplicate names return 409 rather than overwriting another category's color. `/categories/colors` supplies the frontend palette. |
| `src/backend/services/categories.py` | Requires a saved category for transaction and category-budget writes; unknown names return 422 with a Settings instruction. Existing case/space normalization remains. |
| `src/backend/models/transaction.py` | Eagerly loads the category relationship and exposes `category_chart_color`, avoiding one category query per transaction in list responses. |
| `src/backend/schemas/transaction.py` | Serializes that derived color under the existing `pie-color` response key. |
| `migrations/versions/0003_category_colors.py` | Adds the color column/check/default and backfills from the earliest transaction with a supported palette color; otherwise uses blue. Existing financial rows and links remain unchanged. |

The color token is stored as `chart-emerald-2`, not arbitrary CSS or a hex string. The renderer wraps it as `var(--chart-emerald-2)`, so it uses the application's existing styling. Color labels are also shown in Settings; color alone is not the only way to distinguish options. Multiple categories may intentionally share a color.

Transaction rows retain their legacy `pie_color` column for schema compatibility, but it is no longer authoritative. Reads join the current category color; writes fill the legacy column from that category and ignore a caller's color override. Thus changing a category color does not require rewriting every historical transaction. Renames/deletion remain outside this feature.

### Frontend pieces

| File (under `frontend/src/`) | Responsibility |
| --- | --- |
| `components/settings/pages/categories.tsx` | Category-name form, keyboard-accessible radio swatches, saved-category list, color updates, duplicate/error messages and success feedback. |
| `components/settings/settingsPannel.tsx` | Mounts the creator in the Categories tab and supports `/settings#categories` links. |
| `components/categories/categorySelect.tsx` | Shared dropdown with saved names, color dots, loading/error/empty states, retry and a link to Settings. Filters may also choose All categories. |
| `app/budgets/page.tsx`, `app/transactions/page.tsx` | Use the shared selector instead of free-text category inputs. All categories budgets remain supported. |
| `app/reports/page.tsx`, `components/charts/barChart2.tsx` | Weekly filter uses saved categories, with null representing All categories so a real category named `all` still works. |
| `components/charts/pieChart.tsx` | Groups selected-month expenses and uses the category-derived response color for each slice; shows fetch errors and empty periods. |
| `lib/use-finance-list.ts`, `lib/finance-api.ts` | Refetch mounted lists/charts after category or financial writes and on window focus. |

Wish List and Paycheck Splitter deliberately retain their existing separate categories. The creator does not import or change those tool values.

### Try the API

Create a category:

```http
POST /categories
Content-Type: application/json

{"name":"Groceries","color":"chart-emerald-2"}
```

Recolor that category (including existing transaction responses):

```http
PATCH /categories/Groceries
Content-Type: application/json

{"color":"chart-orange-2"}
```

The database stores the new color; the next transaction read returns `"pie-color":"var(--chart-orange-2)"`. Refresh or focus an already-open chart to see the change. Budget spending still depends only on amount, category, type and date. No new packages are needed.

## Verification history and repeatable checks

During the earlier Docker/PostgreSQL setup (these are historical results, not a claim of current container state):

- The database container became healthy on `127.0.0.1:5433`.
- A real connection through the backend's configured driver authenticated as `finance_user` in `finance_engine`.
- Migration `0001` ran against PostgreSQL successfully.
- `alembic current` reported `0001 (head)`; `alembic check` found no pending schema changes.
- FastAPI's test client successfully queried the live PostgreSQL-backed budgets endpoint.
- Budget create/read/update/delete, expense aggregation, duplicate conflicts, and invalid input were checked against PostgreSQL. Verification rows were wrapped in a transaction and rolled back; both financial tables were left empty.
- The then-existing 17 regression tests passed.

During the category-budget integration:

- Migration `0002` applied successfully to local PostgreSQL; `alembic check` reported no new upgrade operations.
- The existing budget's ID, period and amount were preserved, with category null (All categories).
- A live PostgreSQL/API verification created two category budgets and an expense, checked category isolation, recategorized and deleted the expense, and checked duplicate conflicts and period filtering. Verification writes were rolled back; no demo data was retained.
- All **28 regression tests passed**, including migration backfill/preservation, foreign keys, category normalization, date/type isolation, transaction edits/deletes and guarded downgrade.
- Frontend typechecking still reports eight pre-existing errors in unrelated financial tools; the category-budget changes introduced no reported type errors. No browser end-to-end run is claimed.

The Settings-category feature expands the suite to **35 passing tests**. Added cases cover category creation/duplicates, every palette token existing in CSS, invalid colors, unknown categories on create/update, recoloring historical transactions, special characters in names, the database color constraint, and migration preservation/downgrade. Migration `0003` and a live PostgreSQL category/color/budget flow were verified; existing data was preserved and temporary verification writes were rolled back. Frontend typechecking still reports the same eight unrelated tool errors.

Scoped lint passed for all nine changed frontend files. The running frontend returned HTTP 200 for Settings, Budgets, Transactions and Reports; this verifies route rendering, not a full browser interaction test.

Run the repeatable regression suite with:

```powershell
uv run python -B -m unittest discover -s tests -v
```

That suite uses disposable SQLite memory for isolation and renders PostgreSQL migration SQL without connecting. Live PostgreSQL verification was performed separately. Starlette TestClient emits an `httpx` deprecation warning, and SQLite cannot reflect the expression-based category index for comparison; neither failed the suite. PostgreSQL `alembic check` separately verified the actual schema. See FastAPI's [test client documentation](https://fastapi.tiangolo.com/tutorial/testing/).
