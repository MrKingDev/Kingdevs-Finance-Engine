# Finance Engine frontend

Next.js 16.3.5 App Router, React 19, TypeScript, Tailwind 4, shadcn-style React Aria controls, and Recharts.

## Source layout

| Directory | Responsibility |
| --- | --- |
| `src/app/` | App Router pages, shared layout and global styles. |
| `src/components/` | Dashboard, transactions, budgets, charts, settings, tools and shared UI. |
| `src/lib/` | API helpers, refresh events and data hooks. |
| `src/types/` | TypeScript API and feature contracts. |
| `src/data/` | Static feature data and opt-in demo goals. |
| `public/` | Static files served by Next.js. |

## Development

From the repository root:

```powershell
pnpm install --frozen-lockfile
if (!(Test-Path frontend/.env.local)) { Copy-Item frontend/.env.example frontend/.env.local }
pnpm --dir frontend dev
```

Use `pnpm.cmd` on Windows if needed. The dev server listens on **3001** and normally calls the local API on **8000**. Start the backend using its [guide](../backend/README.md). The project pins pnpm 12.8.1; use Node 20.9+ (Docker uses Node 22).

Before modifying Next.js code, follow [AGENTS.md](../AGENTS.md) and consult the installed guides in `node_modules/next/dist/docs/`.

## API configuration

| Variable | Local development | Docker builds |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` from `.env.local`, also the code fallback. | `/api` |
| `DOCKER_BACKEND_URL` | Unset for a direct connection. | `http://backend:8000`, used by the Next rewrite. |
| `NEXT_PUBLIC_DEMO_MODE` | Unset for normal use. | `true` in demo builds; `false` otherwise. |

Never put passwords or tokens in `NEXT_PUBLIC_*` variables: their values are included in browser code. If you change the local API port, update `.env.local` and restart Next. The current backend permits direct browser requests from `localhost:3001` and `127.0.0.1:3001`; Docker uses the frontend's same-origin proxy.

## Docker and demo

Normal workspace, from the repository root: `docker compose up --build -d --wait`.

Populated demo: `docker compose -f compose.demo.yaml up --build -d --wait --wait-timeout 180`.

Open [localhost:3002/dashboard](http://localhost:3002/dashboard) for the demo. Its API/database are separate from normal data. The demo build sets `NEXT_PUBLIC_DEMO_MODE=true`, shows a banner and initializes three goals from `src/data/demo-goals.ts`. Normal builds default to demo mode off.

Docker browsers call `/api`; Next rewrites requests to `http://backend:8000`. Public variables are compiled into JavaScript, so changes require a rebuild. Demo goals remain frontend state and reset on reload.

## Main data flows

| Feature | Implementation |
| --- | --- |
| API helpers | `src/lib/finance-api.ts`: URL, errors and change notifications. |
| Reactive lists | `use-finance-list.ts`: fetch on mount/focus/finance changes with cancellation. |
| Transactions | `transactionsTable.tsx`: server search/filtering and 50-row pages; changing filters resets pagination. Deletion refreshes/clamps pages. Saved bank names populate the filter. |
| Annual area/bar charts | `use-income-expense-chart.ts`: 12 monthly buckets for the year supplied by Reports/Dashboard. Both variants use the same calculation. |
| CSV import | `settings/pages/csvImport.tsx`: bank/file upload, validation, rules, small-row editing and whole-file imports. |
| Downloads | `settings/pages/downloadables.tsx`: month/year selectors, three download buttons, busy/error states. |
| Categories | Shared saved category names/colors across transactions, budgets, imports, subscriptions and filters. |
| Subscriptions | Backend CRUD, payments, archive and history through `use-subscriptions.ts`. |

Shared controls wrap React Aria: selects use `selectedKey`, `onSelectionChange` and item `id`; buttons use `onPress` and `isDisabled`. Check local wrappers before copying examples for another library.

## Import behavior

The frontend and backend accept **500,000 rows and 50,000,000 bytes**. Files up to 1,000 rows support row selection/editing. Larger files are scanned in full, display a bounded sample, and import the entire file after validation.

The upload note suggests using an LLM to reformat columns as:

```text
date,merchant,category,bank,type,amount
```

Use YYYY-MM-DD, positive amounts and accurate income/expense types. Preview the result. The bank field entered in the form is authoritative; a CSV bank column does not override it.

Bank columns and saved rules classify rows. A fallback category only fills unresolved categories. Large files must have every nonduplicate row valid; failures roll back all insert batches. The UI never creates a 500,000-element JSON commit.

The Docker proxy permits 51 MB including multipart overhead and a ten-minute timeout. Other proxies require compatible limits. Large requests currently run synchronously; keep the page open and re-preview after an interruption.

## Downloadables

Open `/settings#download`:

- **Download PDF**: reference-style navy overview, summary cards, category doughnut and detail pages.
- **Download Basic PDF**: plain printable summary/tables using the same data.
- **Download CSV**: spreadsheet-safe transactions with explicit income/expense types.

The backend creates files. The frontend checks response status/content type, downloads a Blob and releases its object URL. Dates initialize after mount to avoid hydration mismatches. Empty months are allowed; monthly exports have a separate 10,000-transaction limit.

## Checks and current limits

From `frontend/`:

```powershell
pnpm exec tsc --noEmit --incremental false
pnpm build
```

`pnpm lint` checks with Biome; `pnpm format` modifies files. Docker production builds run TypeScript checks. Browser smoke scripts live in `backend/scripts/`; their target environments and prerequisites are documented in the [Docker guide](../DOCKER.md#isolated-verification-stack). There is no frontend unit-test script configured in `package.json`.

The transaction screen uses server pagination. Most analytics still load the full ledger and calculate locally, so very large ledgers would benefit from backend aggregation. Goals and most tools are not persisted; Wish List uses localStorage. There is no authentication or AI backend yet.

See the [project README](../README.md), [backend README](../backend/README.md), and [Docker guide](../DOCKER.md).
