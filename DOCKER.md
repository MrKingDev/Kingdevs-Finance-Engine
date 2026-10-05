# Run Finance Engine with Docker

The frontend, FastAPI backend, and PostgreSQL can all run in Docker. A one-shot migration service applies Alembic revisions before the API starts.

## Start the application

1. Start Docker Desktop with Linux containers. Use Docker Compose 2.24.4 or newer (the optional verification override uses `!override`; the root file uses `include`).
2. For a fresh checkout only, copy the backend configuration template. This command preserves an existing `.env`:

   ```powershell
   if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
   ```

3. In `backend/.env`, replace the example password with your chosen local PostgreSQL password. If the database already contains data, preserve its existing password. `DATABASE_URL` is for Python running directly on your host; use the same password, URL-encoded if necessary. Containers receive the password and host separately, so URL encoding is not needed for `POSTGRES_PASSWORD` itself.
4. From the repository root:

   ```powershell
   docker compose config --quiet
   docker compose up --build -d --wait --wait-timeout 180
   docker compose ps
   ```

5. Open **http://localhost:3001/tools** for the Subscription Checker. Docker API documentation is at **http://localhost:8001/docs**.

For Docker-only usage, Node.js, pnpm, Python, and uv are installed in the build images; they do not need to be installed on your host. The first build needs internet access for images, locked dependencies, and the existing Google fonts used by Next.js.

Docker publishes the API on host port **8001**, keeping it separate from the local Python development server on 8000. Inside Docker the API still listens on 8000. If port 3001 or 8001 is occupied, choose different `FRONTEND_PORT` / `BACKEND_PORT` values in `backend/.env`, then rerun Compose. An explicit `BACKEND_PORT` overrides the default. The browser's API calls still work because they use a same-origin proxy. Changing the host database port also requires updating the host-only `DATABASE_URL` if you use local Python.

## How the services connect

```text
Browser :3001
     |
     v
frontend (Next.js, internal :3001)
     |
     | /api/* -> http://backend:8000/*
     v
backend (FastAPI, internal :8000)
     |
     | SQLAlchemy + Psycopg -> db:5432
     v
db (PostgreSQL 17)
     |
     v
backend_finance_engine_postgres_data (named volume)

Startup: db healthy -> migrate completed -> backend ready -> frontend healthy
```

`localhost` inside a container identifies that container. That is why the API uses `db:5432`, not the host's `127.0.0.1:5433`. The browser cannot resolve Docker service names, so it calls `/api` on the frontend instead. Next rewrites those requests to the backend over the Compose network.

The Docker frontend is built with `NEXT_PUBLIC_API_URL=/api`. Next public variables are built into client JavaScript; changing them only on a running container does not rebuild that JavaScript. The proxy destination is set during this build. Local `pnpm dev` continues using `frontend/.env.local` with the direct API URL.

The root `compose.yaml` includes `backend/docker-compose.yml`. Both intentionally use Compose project name **backend**, preserving the existing `finance-engine-db` container identity and `backend_finance_engine_postgres_data` volume. Do not switch project names for normal use: a new project creates a different empty volume.

All published ports bind to `127.0.0.1`. This remains a local, single-user app; authentication and owner-scoped authorization are not implemented. The Docker setup does not make these APIs suitable for public internet exposure.

## Files involved

| File | Purpose |
| --- | --- |
| `compose.yaml` | Root command entry point, keeping the existing Compose project. |
| `backend/docker-compose.yml` | Database, migrations, backend, frontend, ports, volume, dependencies, and health checks. |
| `backend/Dockerfile` | Installs locked Python dependencies with uv and runs the API as a non-root user. Includes migration files. |
| `frontend/Dockerfile` | Uses the pnpm workspace lockfile, builds Next standalone output, copies static/public assets, and runs as a non-root user. |
| `.dockerignore` | Excludes local dependencies, secrets, build output, and backend files from the frontend image context. |
| `backend/.dockerignore` | Excludes the local virtual environment, bytecode, caches, and real environment files from the backend image context. |
| `backend/.env.example`, `frontend/.env.example` | Safe, trackable setup templates containing no real credentials. |

Docker ignores control image build contexts. They do not control Git tracking. The backend directory is excluded only from the frontend's build context; the backend has its own Docker build context.

## Separate demo workspace

Run `docker compose -f compose.demo.yaml up --build -d --wait --wait-timeout 180` from the repository root. Open `http://localhost:3002/dashboard` or `http://localhost:3002/settings#download`. API docs are at `http://localhost:8002/docs`.

This standalone Compose file does not include the normal configuration. Project `finance-engine-demo` uses database `finance_engine_demo`, volume `finance-engine-demo_demo_postgres_data`, and separate images, network and demo-only credentials. PostgreSQL has no published demo host port. Override `DEMO_FRONTEND_PORT` or `DEMO_BACKEND_PORT` if needed; published ports bind to loopback.

Startup order: database health → migrations → guarded seeder → backend readiness → frontend. The seed inserts 168 fictional transactions across six months, 42 budgets, 12 categories, five subscriptions and five payment records only when financial tables are empty. Reruns preserve edits and do not duplicate rows. The demo frontend shows a banner and three example goals; normal builds default to demo mode off.

`docker compose -f compose.demo.yaml down` retains sample data. To deliberately discard **only demo data** and seed fresh dates, run `docker compose -f compose.demo.yaml down --volumes`, then start the demo again. Keep the explicit demo file argument; never remove normal application volumes casually.

## Downloads and large uploads

ReportLab and bundled DejaVu fonts generate both PDF formats inside the backend. No Chrome, system font package, or network request is needed to render reports. Rebuild the backend image after dependency/font changes.

CSV uploads allow 500,000 nonempty data records and 50,000,000 bytes. The Next proxy permits 51,000,000 bytes including multipart overhead and a ten-minute timeout. The backend batches processing, stores its temporary duplicate index on disk, and commits once. Containers need writable temporary space and database capacity; the non-root runtime can use `/tmp`. Other reverse proxies must allow compatible sizes/timeouts. Monthly downloads have a separate 10,000-transaction limit.

With the isolated verification stack running, `backend/scripts/verify_large_csv.py` tests an exact 50 MB / 500,000-row file through port 13001's Next proxy, commits to verification PostgreSQL, checks duplicate retry and pagination, and removes its own fixtures. `backend/scripts/verify_downloads_demo_ui.py` checks the real demo download buttons with Windows Chrome. See the backend README for test commands.

## Useful commands

Run from the repository root:

```powershell
docker compose ps
docker compose logs --tail 80 backend frontend migrate
docker compose exec backend alembic current
docker compose exec backend alembic check
docker compose stop
docker compose up -d --wait
```

After changing application code, rebuild with `docker compose up --build -d --wait`. These are production-style images, not bind-mounted development servers.

`docker compose stop` retains containers and data. `docker compose down` removes this project's containers/network but retains its named database volume. **Do not add `-v` to normal shutdown commands: it deletes database storage.**

To continue local development, run only PostgreSQL with `docker compose up -d --wait db`, apply `uv run alembic upgrade head` from `backend/`, and run FastAPI/Next locally as described in the READMEs. Avoid running a Docker API/frontend and a local server on the same host port.

## Subscription behavior

Subscriptions and payment history now persist in PostgreSQL through migration `0005`. The frontend supports add, edit, category selection, PNG/JPEG/WebP icons up to 2 MiB, archive/restore, deletion of entries without history, and recording/viewing payments.

Record payment advances exactly one calendar billing period and handles short months/leap years. Repeating the same request cannot pay the next occurrence accidentally. Monthly/yearly estimates are calculated by the backend in USD; due status uses UTC dates.

A recorded payment is a confirmation of something you already paid. It does not charge a card, cancel a provider, or create an expense transaction. Budgets continue to use saved expense transactions. This separation prevents imported expenses from being counted a second time automatically.

Clear Data keeps its existing scope: transactions, budgets, and categories. Subscriptions, their payments, and import rules remain; category references become null when categories are cleared.

## Git tracking

`.gitignore` excludes real `.env` files, virtual environments, generated bytecode, caches, dependency directories, and build output. It explicitly permits `.env.example` and `.env.*.example` templates.

Backend Python source, models, schemas, routes, services, migrations, tests, scripts, `alembic.ini`, `.python-version`, `pyproject.toml`, `uv.lock`, Docker files, and documentation are not ignored. New files still need to be added in your normal Git workflow; being visible to Git is different from being committed.

Some bytecode files were already tracked before this change. Ignore rules do not untrack existing files. Their removal from Git's index is a separate cleanup; never remove the corresponding Python source.

## Isolated verification stack

The verification override uses project `finance-engine-verify`, its own named database volume, and ports **13001 / 18000 / 15433**. Its password is a disposable test credential. It does not reuse your normal database volume.

After building the normal images:

```powershell
docker compose build backend frontend
docker compose -p finance-engine-verify -f compose.yaml -f backend/scripts/docker-compose.verify.yml up -d --no-build --wait
docker compose -p finance-engine-verify -f compose.yaml -f backend/scripts/docker-compose.verify.yml exec backend alembic check
```

Open `http://localhost:13001/tools`. With Python dependencies already available locally, run the real browser smoke check from `backend/`:

```powershell
.venv/Scripts/python.exe -B scripts/verify_subscriptions_ui.py
```

The script requires Windows Chrome and writes test subscriptions only to port 13001's verification stack. It checks add/category selection, persistence after reload, editing, payment history, and archiving. Backend regressions run with `uv run python -B -m unittest discover -s tests -q` using disposable SQLite databases; PostgreSQL concurrency and migration parity are checked separately against the verification stack.

To stop/remove just the verification containers while retaining the test volume:

```powershell
docker compose -p finance-engine-verify -f compose.yaml -f backend/scripts/docker-compose.verify.yml down
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `POSTGRES_PASSWORD` missing | Set it in `backend/.env`; do not print full `docker compose config` output because it contains resolved credentials. Use `config --quiet`. |
| Port already allocated | A local dev server or another project owns that host port. Adjust the host port variables or stop the relevant server. |
| Database authentication fails after editing password | Existing PostgreSQL volumes retain their original password. Changing the environment variable does not update an existing database role. Restore the matching credential or deliberately rotate it. |
| Migration service fails | Inspect `docker compose logs migrate`; the API waits for migrations to finish successfully. |
| Backend is healthy but browser requests fail | Check `/api/health/ready` through the frontend and its logs. Rebuild the image if the build-time proxy configuration changed. |
| New subscription table is missing in local development | Apply `uv run alembic upgrade head` from `backend/`; Docker's migration job only runs when the Docker stack starts. |
| Subscriptions look empty after changing project name | Check which named volume that Compose project uses before making any changes to existing data. |
