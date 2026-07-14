# DOX: src/views/

## Purpose

Page-level Svelte 5 view components for Danwa Studio. Each view is a full page rendered by the router.

## Ownership

- **Dashboard**: `DashboardView.svelte` — main dashboard
- **Module Management**: `ModulesView.svelte`, `ModulePublishingView.svelte` — module install/publish
- **Blueprint**: `BlueprintCanvasView.svelte` — visual workflow editor
- **LLM**: `LLMAgentsView.svelte`, `LLMProfilesView.svelte`, `BYOKManager.svelte` — LLM management
- **Input/Output**: `InputComposerView.svelte`, `OutputComposerView.svelte` — I/O pipelines
- **Workflow**: `WorkflowExecView.svelte`, `WorkflowTemplatesView.svelte` — workflow execution
- **Administration**: `UsersView.svelte`, `TenantsView.svelte`, `SystemManagementView.svelte`, `ServerHealthView.svelte` — admin
- **Content**: `PromptsView.svelte`, `RolesView.svelte`, `ToneProfilesView.svelte`, `ActionTemplatesView.svelte` — content management
- **Other**: `CatalogView.svelte`, `ProposalsView.svelte`, `TranslationsView.svelte`, `DiffView.svelte`, `ReplayView.svelte`, `ProfileView.svelte`, `LoginView.svelte`

## Local Contracts

- Each view is a self-contained Svelte 5 component
- Views import from `src/lib/` for API calls and stores
- Views use i18n keys via `t('key')` for translations
- Views follow consistent layout patterns (grid, flex)

## Work Guidance

- Follow existing view patterns for new views
- Keep views focused on single responsibility
- Extract reusable logic to `src/lib/`
- Use existing components from `src/components/`

## Verification

- Verify views render correctly
- Check responsive behavior
- Test i18n key coverage

## Child DOX Index

| Child | Purpose |
|-------|---------|
| (flat structure, 26 view files) |
