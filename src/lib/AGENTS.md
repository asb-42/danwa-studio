# DOX: src/lib/

## Purpose

Core libraries for Danwa Studio: API clients, state stores, i18n, and utility functions.

## Ownership

- **API Client**: `api.js`, `api/` — HTTP client for backend communication
- **Stores**: `stores.js`, `stores/` — Svelte stores for state management
- **i18n**: `i18n/` — internationalization system
- **Blueprint**: `blueprint/` — blueprint-specific logic
- **Catalog**: `catalog/` — module catalog logic
- **Input**: `input/` — input pipeline logic
- **Modules**: `modules/` — module management logic
- **Proposals**: `proposals/` — proposal system logic
- **Publishing**: `publishing/` — module publishing logic
- **Workflow**: `workflowExec.js`, `workflowSession.js`, `workflowSSE.js` — workflow execution
- **Utilities**: `elk-service.js`, `transcriptNormalizer.js` — utility functions

## Local Contracts

- API calls use consistent error handling patterns
- Stores follow Svelte 5 store conventions
- i18n keys are organized by feature namespace

## Work Guidance

- Add new API endpoints to existing client modules
- Follow existing store patterns for new state
- Keep utility functions pure and testable

## Verification

- Run `npm run test` for unit tests
- Verify API client handles errors correctly

## Child DOX Index

| Child | Purpose |
|-------|---------|
| `src/lib/api/` | API client modules |
| `src/lib/stores/` | Svelte store modules |
| `src/lib/i18n/` | Internationalization |
| `src/lib/blueprint/` | Blueprint logic |
| `src/lib/catalog/` | Catalog logic |
| `src/lib/input/` | Input pipeline logic |
| `src/lib/modules/` | Module management |
| `src/lib/proposals/` | Proposal system |
| `src/lib/publishing/` | Publishing logic |
