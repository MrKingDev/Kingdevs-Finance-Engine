# King Dev's Finance Engine

A personal finance application for viewing income, expenses, transactions, budgets, savings goals, and reports in one interface.

The project currently contains a Next.js frontend powered by sample data. The `backend/` directory is reserved for future development and contains only a placeholder. There is no financial API, database, authentication, or bank integration yet.

## Pages and features

| Route | What is available | Current limitations |
| --- | --- | --- |
| `/` | A basic home page within the shared application layout. | Displays `Hello World`; does not redirect to the dashboard. |
| `/dashboard` | Balance, income, expense, and savings cards; spending chart; switchable area/bar chart; budget progress; five most recent transactions. | Summary amounts are hardcoded. Month/year selectors do not filter the data, and Add Transaction has no action. |
| `/transactions` | A responsive transaction table with date, merchant, category, bank, type, and amount; search and filter controls. | The table displays bundled sample records. Search, filtering, clearing filters, adding, and deleting transactions are not connected to application logic. |
| `/budgets` | Sample budget cards with budget, spent, remaining, and usage indicators. | Cards contain repeated placeholder values; adding and deleting budgets are not implemented. |
| `/goals` | Savings/debt payoff goal form, target dates, progress cards, and entry fields for income, expenses, and contributions. | Values are placeholders; creating goals, recording entries, and deleting goals are not implemented. |
| `/reports` | Spending, income/expense, weekly spending, and budget comparisons; monthly history and category breakdown. | Charts use sample data and summary cards show placeholder values. The category selector does not filter the chart. |
| `/tools` | A page heading and description. | Financial tools are not implemented. |
| `/ai` | An AI assistant page heading and description. | No assistant, model configuration, or AI service is connected. |
| `/settings` | Tabs for Import CSV, Preferences, Downloadables, Rules, and Categories. | Tab contents are placeholders; importing, exporting, preferences, and rule/category management are not implemented. |

The shared interface includes a collapsible sidebar, responsive layouts, light/dark/system themes, animated page entrances, chart tooltips, and reusable form controls. Unknown routes display a custom 404 page with links to the home page and dashboard.

## Technology

Versions below reflect [frontend/package.json](frontend/package.json).

| Area | Technology |
| --- | --- |
| Framework | Next.js `16.3.5`, App Router |
| UI | React and React DOM `19.2.8` |
| Language | TypeScript `^5`, with strict mode enabled |
| Styling | Tailwind CSS `^4`, PostCSS, CSS theme variables, `tw-animate-css` |
| Components | shadcn configuration using the `aria-nova` style, React Aria Components, Radix UI |
| Charts | Recharts `3.8.0` |
| Motion and themes | Motion `^13.4.0`, next-themes `^0.4.6` |
| Icons and dates | Lucide React, `@internationalized/date`, date-fns |
| Code quality | Biome `2.4.2` |
| Package manager | pnpm `12.4.2` |

React Compiler is enabled in `frontend/next.config.ts`. The root layout configures Geist, Geist Mono, DM Sans, and Nunito Sans through `next/font/google`.

## Getting started

### Prerequisites

- Node.js **20.9 or newer**, as required by the installed Next.js version.
- pnpm **12.4.2**, matching the frontend's `packageManager` declaration.

If pnpm is not installed, install the declared version:

```sh
npm install --global pnpm@12.4.2
```

### Run locally

From the repository root:

```sh
pnpm install
pnpm --dir frontend dev
```

Open **http://localhost:3001/dashboard**. The development script explicitly uses port `3001`. Visiting `/` shows the placeholder home page.

No `.env` file, API keys, database, backend process, or sign-in is required for the current sample interface. Dependency installation requires network access; the configured Google fonts may also require network access during compilation.

The tracked root `pnpm-lock.yaml` currently records pnpm tooling rather than the frontend's full dependency graph. A fresh installation may resolve frontend dependency ranges and update the lockfile.

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

The production server requires a successful build first. The repository does not currently include automated tests, a test script, a CI workflow, or container/deployment configuration.

## Repository structure

```text
kingdevs-finance-engine/
|-- backend/
|   `-- backend.txt                # Backend placeholder
|-- frontend/
|   |-- public/                    # Static SVG assets
|   |-- src/
|   |   |-- app/
|   |   |   |-- layout.tsx         # Fonts, theme provider, sidebar, page shell
|   |   |   |-- page.tsx           # Placeholder home page
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
|   |   |   |-- transactions/      # Transaction table
|   |   |   |-- ui/                # Shared UI primitives
|   |   |   |-- header.tsx         # Collapsible sidebar navigation
|   |   |   |-- pageTransitions.tsx
|   |   |   `-- theme-provider.tsx
|   |   |-- data/                  # Bundled sample JSON
|   |   `-- lib/utils.ts           # Shared class-name utility
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

Pages and components import local JSON or define sample values directly. There are no API routes, server actions, or application fetch calls. React state handles interface interactions such as sidebar expansion and area/bar chart selection. Financial records are not persisted through the interface.

| Data source | Shape | Used for |
| --- | --- | --- |
| [transactionData.json](frontend/src/data/transactionData.json) | `id`, `date`, `merchant`, `category`, `bank`, `type`, `amount` | Transaction table, recent transactions, monthly history, and category breakdown. |
| [incomeExpenseChartData.json](frontend/src/data/incomeExpenseChartData.json) | `date`, `income`, `expenses` | Shared area and bar charts showing sample monthly totals. |
| [spendingChartData.json](frontend/src/data/spendingChartData.json) | `category`, `amount`, `fill` | Spending doughnut chart, total spending, and category colors. |
| Constants inside pages/components | Metrics, budgets, goals, and weekly spending | Placeholder cards and comparison charts. |

Transaction amounts are stored as positive numbers; `type` determines whether the interface treats them as income or expenses. The transaction fixture uses `MM/DD/YYYY` dates, while the income/expense fixture uses `YYYY-MM-DD` dates. Currency displays use US dollar formatting.

Recent transactions are sorted by date and limited to five entries. Monthly history groups transactions by month, subtracts expenses from income, and shows up to six months represented in the data. Category breakdown totals non-income transactions by category.

The chart fixtures and hardcoded summary values are independent of the transaction fixture, so figures across cards, charts, and tables are not expected to reconcile.

## Configuration and development

- **Routing and layout:** `frontend/src/app` contains route pages, the shared layout, and the 404 page.
- **Theme and styling:** `frontend/src/app/globals.css` defines light/dark colors, chart palettes, metric colors, and Tailwind theme mappings. Theme selection is handled by next-themes.
- **UI configuration:** `frontend/components.json` defines shadcn aliases, the `aria-nova` style, the `mist` base color, and Lucide icons.
- **TypeScript:** `frontend/tsconfig.json` enables strict checking and the `@/*` source alias.
- **Formatting and linting:** `frontend/biome.json` uses two-space indentation, recommended checks, and React/Next.js rules.
- **Workspace:** `pnpm-workspace.yaml` includes only `frontend` and disables dependency build scripts for `sharp` and `unrs-resolver`.
- **Generated files:** Dependency directories, `.next`, build output, environment files, and TypeScript build metadata are ignored by Git.

For code changes, use `pnpm --dir frontend lint` to check code style and `pnpm --dir frontend build` to check production compilation.

Coding agents should read [AGENTS.md](AGENTS.md) and the relevant guides bundled with the installed Next.js package under `frontend/node_modules/next/dist/docs/` before changing application code.

## Backend status

[backend/backend.txt](backend/backend.txt) currently contains `backend coming soon`. No backend runtime, dependencies, endpoints, database schema, migrations, or setup commands have been defined. The frontend's sample data is the only source of financial information in the current project.
