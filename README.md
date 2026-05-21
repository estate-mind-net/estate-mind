# EstateMind

AI Investment Intelligence for Real Estate.

## Monorepo Structure

This is an npm workspaces monorepo.

```
estatemind/
├── apps/
│   ├── web/          # Vite + React marketing/landing app (Spark-exported)
│   └── app/          # Future: full product app (placeholder)
├── packages/
│   ├── shared/       # Future: shared business logic and utilities (placeholder)
│   ├── ui/           # Future: shared UI component library (placeholder)
│   └── types/        # Future: shared TypeScript types (placeholder)
├── db/
│   └── migrations/   # Future: database migration files (placeholder)
├── prompts/          # AI prompt templates (placeholder)
├── docs/             # Project documentation
│   ├── README.md
│   ├── PRD.md
│   ├── MIGRATION_NOTES.md
│   ├── PRODUCTION-READY.md
│   ├── SECURITY.md
│   └── REFACTOR.md
└── package.json      # Root workspace manager
```

## Getting Started

Install all dependencies from the root:

```bash
npm install
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev:web` | Start the Vite dev server for `apps/web` |
| `npm run build:web` | Production build for `apps/web` |
| `npm run preview:web` | Preview the production build of `apps/web` |
| `npm run lint:web` | Lint `apps/web` |

## Apps

### `apps/web`

The current Vite + React application, originally exported from GitHub Spark. Contains the full EstateMind UI including the landing page, dashboard, deal analyzer, portfolio analytics, and investment pipeline.

**Stack:** React 19, Vite, Tailwind CSS v4, Radix UI, Recharts, Framer Motion, TanStack Query.

To work directly inside the app:

```bash
cd apps/web
npm run dev
```

## Documentation

See the [`/docs`](./docs/) folder for detailed project documentation including the PRD, migration notes, security considerations, and refactor plans.
