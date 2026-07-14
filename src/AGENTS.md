# DOX: src/

## Purpose

Svelte 5 frontend application for Danwa Studio: the main UI for managing modules, workflows, blueprints, LLM profiles, and administration.

## Ownership

- **Entry Point**: `src/main.js` — application bootstrap
- **App Root**: `src/App.svelte` — root component with routing
- **Views**: `src/views/` — 26 view components (pages)
- **Components**: `src/components/` — reusable UI components
- **Libraries**: `src/lib/` — API clients, stores, utilities
- **Stores**: `src/stores.js`, `src/stores/` — state management
- **Styles**: `src/app.css` — global styles

## Local Contracts

- Svelte 5 runes syntax (`$state`, `$derived`, `$effect`, `$props`)
- Stores use Svelte 5 `writable`/`readable` from `svelte/store`
- API calls go through `src/lib/api.js` or `src/lib/api/` modules
- i18n keys used via `t('key')` from `src/lib/i18n/`

## Work Guidance

- Follow Svelte 5 runes syntax (not legacy `$:` reactive statements)
- Use existing component patterns from `src/components/`
- Keep business logic in `src/lib/`, UI in `src/views/` and `src/components/`
- Use i18n keys for all user-facing strings

## Verification

- Run `npm run check` for type checking
- Run `npm run lint` for linting
- Run `npm run test` for unit tests

## Child DOX Index

| Child | Purpose |
|-------|---------|
| `src/views/` | 26 page-level view components |
| `src/components/` | Reusable UI components (blueprint, input, workflow, sidebar) |
| `src/lib/` | API clients, stores, i18n, utilities |
