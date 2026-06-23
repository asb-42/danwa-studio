# Danwa Studio

A visual workflow and agent management platform for LLM-powered applications. Danwa Studio provides a comprehensive interface for designing, managing, and executing complex multi-agent workflows with a node-based visual editor.

## Features

- **Visual Blueprint Editor** - Drag-and-drop node-based workflow designer powered by @xyflow/svelte
- **Multi-Agent Orchestration** - Define and manage complex agent personas with specialized roles (Critic, Analyst, Creative, Strategist, etc.)
- **Prompt Engineering** - Create, version, and manage prompt templates with variable interpolation
- **Tone Profiles** - Define consistent communication styles across agents
- **LLM Profile Management** - Configure and manage multiple LLM providers and model configurations
- **Workflow Execution & Monitoring** - Real-time execution tracking with replay and diff capabilities
- **Workflow Templates** - Save and reuse common workflow patterns
- **Multi-Tenancy** - Isolated environments for teams and organizations
- **Role-Based Access Control** - Fine-grained permissions system
- **Internationalization** - Built-in i18n support
- **BYOK (Bring Your Own Keys)** - Secure API key management per user
- **System Health Monitoring** - Server health and performance dashboards

## Tech Stack

- **Frontend**: Svelte 5, Vite
- **Styling**: Tailwind CSS, @tailwindcss/typography
- **Visual Editor**: @xyflow/svelte (React Flow for Svelte)
- **Graph Layout**: ELK.js (elkjs) for automatic node layout
- **Validation**: Zod
- **Markdown**: marked
- **Sanitization**: DOMPurify
- **Graph Analysis**: Cytoscape.js

## Project Structure

```
src/
├── components/
│   ├── blueprint/           # Visual editor components
│   │   ├── nodes/           # Node type definitions (25+ agent types)
│   │   ├── forms/           # Configuration forms for nodes
│   │   └── panels/          # Side panels (Inspector, Proposals, etc.)
│   ├── Header.svelte
│   ├── Sidebar.svelte
│   └── ConfirmDialog.svelte
├── views/                   # Page-level components (20+ views)
│   ├── BlueprintCanvasView.svelte
│   ├── LLMAgentsView.svelte
│   ├── PromptsView.svelte
│   ├── WorkflowExecView.svelte
│   └── ...
├── lib/
│   ├── api/                 # API client modules
│   ├── elk-service.js       # Graph layout service
│   └── workflowExec.js      # Workflow execution logic
├── stores.js                # Global state management
├── App.svelte               # Main app with routing
└── main.js                  # Entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

### Environment

The application expects a running Danwa backend API. Configure the API endpoint in your environment or through the UI settings.

## Key Concepts

### Blueprints
Visual workflows composed of connected nodes representing agents, inputs, outputs, and control flow. Blueprints can be saved as templates for reuse.

### Agents
Specialized LLM personas with defined roles, prompts, and capabilities. 25+ built-in agent types including:
- **Creative** - Ideation and brainstorming
- **Critic** - Evaluation and feedback
- **Analyst** - Data analysis and synthesis
- **Strategist** - Planning and decision-making
- **Mediator** - Conflict resolution
- **FactChecker** - Verification and validation
- **Optimizer** - Performance improvement
- And many more...

### Phases
Sequential stages in a workflow that group related agents and control execution flow.

### Templates
Reusable workflow patterns that can be instantiated with different configurations.

## Architecture

- **Hash-based Routing** - Client-side routing without server configuration
- **Reactive State** - Svelte 5 runes ($state, $derived) for fine-grained reactivity
- **Component Composition** - Modular, reusable component architecture
- **Service Layer** - Separated API, layout, and execution services

## Related Packages

This project consumes local packages from `danwa-core`:
- `@danwa/api-client` - Type-safe API client
- `@danwa/ui-core` - Shared UI components
- `@danwa/i18n` - Internationalization utilities

## License

AGPL-3.0 License - see [LICENSE](LICENSE) for details.