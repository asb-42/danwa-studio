# DOX: src/components/

## Purpose

Reusable Svelte 5 UI components for Danwa Studio. Shared across multiple views.

## Ownership

- **Layout**: `Sidebar.svelte`, `Header.svelte` — app shell components
- **Blueprint**: `blueprint/` — blueprint canvas components
- **Input**: `input/` — input pipeline components
- **Workflow**: `workflow/` — workflow execution components
- **Modules**: `modules/` — module management components
- **Dialogs**: `ConfirmDialog.svelte` — confirmation dialogs
- **Rendering**: `MarkdownRenderer.svelte` — markdown rendering
- **i18n**: `LanguageSwitcher.svelte` — language switching

## Local Contracts

- Components use Svelte 5 runes syntax
- Props defined with `$props()` rune
- Emit events via callback props (not `createEventDispatcher`)
- Follow existing naming conventions

## Work Guidance

- Extract reusable patterns into new components
- Keep components focused and composable
- Document complex component APIs

## Verification

- Verify components render in isolation
- Check prop types and defaults

## Child DOX Index

| Child | Purpose |
|-------|---------|
| `src/components/blueprint/` | Blueprint canvas components |
| `src/components/input/` | Input pipeline components |
| `src/components/workflow/` | Workflow execution components |
| `src/components/modules/` | Module management components |
