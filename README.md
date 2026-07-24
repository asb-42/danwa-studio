# Danwa Studio

Admin and developer frontend for the Danwa Multi-Agent Debate Platform. Provides a visual workflow editor, module management, LLM profile configuration, and system administration tools.

## Features

- **Visual Blueprint Editor** — drag-and-drop node-based workflow designer (@xyflow/svelte)
- **Multi-Agent Orchestration** — define and manage agent personas with specialized roles
- **Prompt Engineering** — create, version, and manage prompt templates with variable interpolation
- **Tone Profiles** — define consistent communication styles across agents
- **LLM Profile Management** — configure multiple LLM providers and model configurations
- **Interactive Mode** — action templates for real-time human-in-the-loop debates
- **Workflow Execution & Monitoring** — real-time execution tracking with replay and diff
- **Workflow Templates** — save and reuse common workflow patterns
- **Module Management** — browse, install, and publish modules from the catalog
- **Input/Output Composers** — configure modular pipelines for processing and rendering
- **Multi-Tenancy** — isolated environments for teams and organizations
- **Role-Based Access Control** — fine-grained permissions system
- **Internationalization** — i18n support with language switcher
- **Dark Mode** — full dark theme support across all views
- **BYOK (Bring Your Own Keys)** — secure API key management per user
- **System Health Monitoring** — server health and performance dashboards

## Tech Stack

- **Frontend**: Svelte 5, Vite, Tailwind CSS
- **Visual Editor**: @xyflow/svelte
- **Graph Layout**: ELK.js (elkjs)
- **Validation**: Zod
- **Markdown**: marked + DOMPurify
- **Graph Analysis**: Cytoscape.js

## Project Structure

```
src/
├── components/
│   ├── blueprint/           # Visual editor (canvas, nodes, forms, panels, edges)
│   ├── input/               # Input components (A2A, plugins, STT, template picker)
│   ├── workflow/            # Workflow components (phases, snapshots)
│   ├── modules/             # Module detail modal
│   ├── Header.svelte
│   ├── Sidebar.svelte
│   ├── ConfirmDialog.svelte
│   ├── LanguageSwitcher.svelte
│   └── MarkdownRenderer.svelte
├── views/                   # 27 page-level views
│   ├── BlueprintCanvasView.svelte
│   ├── LLMAgentsView.svelte
│   ├── LLMProfilesView.svelte
│   ├── PromptsView.svelte
│   ├── WorkflowExecView.svelte
│   ├── ActionTemplatesView.svelte
│   ├── ModulesView.svelte
│   ├── CatalogView.svelte
│   ├── BYOKManager.svelte
│   └── ...
├── lib/
│   ├── api/                 # API client modules
│   ├── stores/              # Svelte stores (auth, theme, phase snapshots)
│   ├── admin/               # Admin API layer
│   ├── catalog/             # Catalog API layer
│   ├── i18n/                # Internationalization
│   ├── blueprint/           # Blueprint engine (layout, validation, registry, DnD)
│   ├── input/               # Input composer logic
│   ├── proposals/           # Proposal management
│   ├── publishing/          # Module publishing
│   ├── elk-service.js       # Graph layout service
│   ├── stores.js            # Global state management
│   ├── workflowExec.js      # Workflow execution logic
│   ├── workflowSession.js   # Workflow session management
│   ├── workflowSSE.js       # SSE streaming for workflows
│   └── transcriptNormalizer.js
├── App.svelte               # Main app with routing
└── main.js                  # Entry point
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Testing

Unit tests use Vitest and cover stores, API clients, blueprint logic, i18n, auth, dark theme, and catalog:

```bash
npm test                  # run all tests
npm test -- --watch       # watch mode
```

## Architecture

- **Hash-based Routing** — client-side routing without server configuration
- **Reactive State** — Svelte 5 runes ($state, $derived) for fine-grained reactivity
- **Component Composition** — modular, reusable component architecture
- **Service Layer** — separated API, layout, and execution services

## Related Packages

This project consumes local packages from `danwa-core`:
- `@danwa/api-client` — type-safe API client
- `@danwa/ui-core` — shared UI components
- `@danwa/i18n` — internationalization utilities

## License

AGPL-3.0 — see [LICENSE](LICENSE) for details.
