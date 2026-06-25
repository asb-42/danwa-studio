# Architecture Gap Analysis — danwa-studio / danwa-core / danwa-modules

**Date:** 2026-06-25  
**Status:** Analysis complete, remediation pending  
**Related:** [`danwa`](../danwa/) (legacy end-user frontend) for reference

## What it is

This document catalogs known integration gaps between the four repositories of the Danwa ecosystem — `danwa` (legacy end-user frontend), `danwa-studio` (builder/admin/dev frontend), `danwa-core` (backend & APIs), and `danwa-modules` (optional content: UI translations, prompt templates, workflows, etc.).

The gaps were identified during a codebase review of `danwa-studio` after the migration split from the original `danwa` monolith. They represent conceptual or architectural holes where required functionality is either missing, only partially implemented, or misaligned between repos.

## Architecture overview

```
┌────────────────────────────────────────────────────────────┐
│                        danwa-modules                        │
│  (GitHub repo + Releases: prompts, workflows, translations) │
│  index.json — 153 modules · ui-translations/ — 59 packs   │
└────────┬──────────────────────────────────────────┬────────┘
         │ GitHub Releases (ZIP)                    │ plain HTTP (?)
         │ (install-from-repo)                      │ (VITE_MODULES_BASE_URL)
         ▼                                          ▼
┌─────────────────────┐              ┌───────────────────────────────┐
│     danwa-core      │              │        danwa-studio            │
│  (Backend + APIs)   │◄──── REST ───►  (Builder/Admin Frontend)     │
│                     │   /api/v1/   │                               │
│  ┌───────────────┐  │              │  ┌─────────────────────────┐  │
│  │ ui_i18n.py    │──┤              │  │ i18n/loader.js          │  │
│  │ (REST API)    │  │              │  │ (VITE_MODULES_BASE_URL) │  │
│  ├───────────────┤  │              │  ├─────────────────────────┤  │
│  │ modules.py    │──┤              │  │ TranslationsView        │──┤
│  │ (repo-index)  │  │              │  │ (uses REST API ✓)       │  │
│  ├───────────────┤  │              │  ├─────────────────────────┤  │
│  │ ui_translation │  │             │  │ ModulesView             │──┤
│  │ _service.py   │  │              │  │ (uses REST API ✓)       │  │
│  ├───────────────┤  │              │  ├─────────────────────────┤  │
│  │ module_profile│  │              │  │ PromptsView             │──┤
│  │ _sync.py      │  │              │  │ (read-only from modules)│  │
│  └───────────────┘  │              │  └─────────────────────────┘  │
└─────────────────────┘              │  ┌─────────────────────────┐  │
         │                           │  │ api.js                  │  │
         │ (file: pnpm link)         │  │ (fallback — @danwa/*    │  │
         │ ❌ not built              │  │  packages not built)    │  │
         ▼                           │  └─────────────────────────┘  │
┌─────────────────────┐              └───────────────────────────────┘
│  danwa-core/packages │
│  api-client, i18n,   │
│  ui-core (no dist/)  │
└─────────────────────┘

danwa (end-user frontend) — not in scope here, referenced for legacy i18n design
```

## Gap 1: UI i18n Delivery to Frontend

**Severity:** HIGH — danwa-studio cannot display non-English UI strings in production.

### Current state

The frontend i18n loader (`danwa-studio/src/lib/i18n/loader.js:112-132`) expects to fetch static JSON files:

```javascript
const MODULES_BASE_URL = import.meta.env.VITE_MODULES_BASE_URL || '/modules';

async function loadLocale(locale) {
  // Tries: fetch(`${MODULES_BASE_URL}/i18n-${locale}/ui_strings.json`)
}
```

The backend provides a full REST API for UI translations (`danwa-core/backend/services/ui_translation_service.py`) backed by a SQLite DB (`data/i18n/ui_translations.db`), with endpoints at `/api/v1/i18n/*` (`danwa-core/backend/api/routers/ui_i18n.py`). This includes locale discovery, bulk LLM translation, and coverage stats.

The `TranslationsView.svelte` (`danwa-studio/src/views/TranslationsView.svelte`) already uses the REST API correctly (`getSupportedLocales()`, `getTranslationStats()`, etc.).

**danwa-modules** contains 59 language-pack modules in `ui-translations/` directory, each with a `ui_strings.json` file and a `manifest.json`. These are listed in `index.json` with type `language-pack` and downloadable via GitHub Releases.

### Root cause

No bridge exists between the backend REST API and the frontend's static-file expectation. The `VITE_MODULES_BASE_URL` defaults to `/modules`, but no static file server is configured to serve danwa-modules content at that path. The original `danwa` (end-user frontend) used the same static-file loading pattern and presumably worked because `danwa-core` served the modules directory as static files — this server is missing or not configured for `danwa-studio`'s build.

### Affected files

| File | Role |
|---|---|
| `danwa-studio/src/lib/i18n/loader.js` | Static-file fetcher; needs REST fallback or config change |
| `danwa-core/backend/api/routers/ui_i18n.py` | REST endpoints exist, unused by frontend loader |
| `danwa-core/backend/services/ui_translation_service.py` | SQLite-backed translation storage |
| `danwa-studio/src/views/TranslationsView.svelte` | Working example of correct REST API usage |
| `danwa-modules/ui-translations/` | 59 language-pack source files |

---

## Gap 2: Auto-sync from danwa-modules

**Severity:** MEDIUM — new modules (prompts, workflows, agent cores) do not appear until manually installed.

### Current state

`ModuleProfileSync` (`danwa-core/backend/services/module_profile_sync.py:38-87`) reads **only from the local `modules/` directory** on disk. It checks the `module_registry` SQLite DB for `enabled` status, but does **not** fetch anything from the remote `danwa-modules` GitHub repo.

The Module Router (`danwa-core/backend/api/routers/modules.py:91-165`) provides three manual endpoints:
- `GET /api/v1/modules/repo-index` — fetches `index.json` from GitHub (cached 24h)
- `POST /api/v1/modules/install-from-repo` — downloads a ZIP from GitHub Releases and extracts to local `modules/`
- `GET /api/v1/modules/check-repo-updates` — semver comparison between installed and remote

The studio's `ModulesView.svelte` (`danwa-studio/src/views/ModulesView.svelte`) exposes a "Show Repo" panel that calls these endpoints, but the flow requires manual admin intervention: view repo → install each module → enable it.

### Root cause

The architecture assumes an admin-driven workflow via the Studio UI. There is no background job, CLI command, or startup hook that automatically syncs enabled modules from `danwa-modules`. After a fresh deploy, prompts, workflows, and agent cores only appear once someone manually installs them.

### Affected files

| File | Role |
|---|---|
| `danwa-core/backend/services/module_profile_sync.py` | Reads local `modules/` only; no remote trigger |
| `danwa-core/backend/api/routers/modules.py` | Manual install/check-update endpoints |
| `danwa-studio/src/views/ModulesView.svelte` | UI for manual repo browsing |
| `danwa-studio/src/views/PromptsView.svelte` | Consumer — shows prompt templates only after install |

---

## Gap 3: danwa-core Package Builds

**Severity:** MEDIUM — `@danwa/*` package imports rely on fragile `file:` protocol symlinks.

### Current state

`danwa-studio/package.json:28-30` declares local file dependencies:

```json
"@danwa/api-client": "file:../danwa-core/packages/api-client",
"@danwa/i18n": "file:../danwa-core/packages/i18n",
"@danwa/ui-core": "file:../danwa-core/packages/ui-core",
```

The studio's own API wrapper (`danwa-studio/src/lib/api.js:3-8`) explicitly documents that these packages are **not built**:

```javascript
// The original import of @danwa/api-client has been removed because
// the danwa-core monorepo's api-client package has not been built
// (dist/ is missing) and the symlink in node_modules/@danwa/ is not
// followed by rolldown in production builds.
```

The `api.js` provides a minimal `request()` function and a placeholder `api` object as a fallback. Blueprint API functions in `src/lib/blueprint/api.js`, `src/lib/i18n/api.js`, and `src/lib/modules/api.js` all use this local `request()` instead of the `@danwa/api-client` package.

### Root cause

The `danwa-core/packages/` directory contains three packages with `package.json` and source files, but no `dist/` output directory. They were never built with a bundler/compiler. The `file:` protocol in `package.json` resolves to the source directory, which lacks the entry points that Vite/rolldown expect in production builds.

### Affected files

| File | Role |
|---|---|
| `danwa-studio/package.json` | Declares broken `file:` deps |
| `danwa-studio/src/lib/api.js` | Manual fallback (adds maintenance burden) |
| `danwa-core/packages/api-client/` | Source only, no `dist/` |
| `danwa-core/packages/i18n/` | Source only, no `dist/` |
| `danwa-core/packages/ui-core/` | Source only, no `dist/` |

---

## Gap 4: Workflow Templates Source Ambiguity

**Severity:** LOW — unclear whether workflow templates come from DB, modules, or both.

### Current state

The Studio's `WorkflowTemplatesView.svelte` uses `/api/v1/workflow-templates`. `ModuleProfileSync.get_workflow_templates_from_modules()` (`danwa-core/backend/services/module_profile_sync.py:287-305`) can provide workflow templates from enabled module directories, but it is unclear whether this function is actually wired into the `workflow_templates.py` router.

The `danwa-modules` `index.json` contains entries with type `workflow-template` in the `workflows/` category — these have download URLs pointing to GitHub Releases.

### Root cause

The `workflow_templates.py` router needs investigation to determine its data source. If it reads from a DB, then workflow templates have a different lifecycle than prompt templates (which are module-exclusive). This may create maintenance confusion when modules are updated.

### Affected files

| File | Role |
|---|---|
| `danwa-core/backend/api/routers/workflow_templates.py` | Router — source unclear |
| `danwa-core/backend/services/module_profile_sync.py:287-305` | Module-based provider exists |
| `danwa-studio/src/views/WorkflowTemplatesView.svelte` | Consumer |
| `danwa-modules/workflows/` | 10 workflow modules in repo |

---

## Gap 5: Language Pack Installation Flow

**Severity:** MEDIUM — language packs can be installed but the frontend cannot consume them.

### Current state

The backend can:
- Discover installed language-pack modules and make them available via `get_installed_locales()` (`ui_translation_service.py:1229-1308`)
- Export a locale's strings as a downloadable ZIP pack (`modules.py:460-507`, `ui_i18n.py:315-374`)
- Merge `langpack:*` namespace translations on top of the global namespace in API responses (`ui_i18n.py:240-245`)

The `TranslationsView.svelte` correctly shows coverage and stats for locales from both the DB (`global` namespace) and installed language packs (`langpack:*` namespaces).

However, the frontend i18n loader (`loader.js`) does **not** call the REST API to fetch these translations — it still tries to load static files (see Gap 1). Even if a language pack was installed and enabled in danwa-core, the studio's UI would still fall back to English.

### Root cause

This is a downstream effect of Gap 1. The installation pipeline (repo → install → enable → DB) works correctly; only the final delivery to the browser is broken.

### Affected files

| File | Role |
|---|---|
| `danwa-studio/src/lib/i18n/loader.js` | Delivery endpoint — broken (see Gap 1) |
| `danwa-core/backend/services/ui_translation_service.py:1229-1308` | Locale discovery works |
| `danwa-core/backend/api/routers/modules.py:460-507` | Language-pack export works |
| `danwa-core/backend/api/routers/ui_i18n.py:240-245` | `langpack:*` merging works |
| `danwa-studio/src/views/TranslationsView.svelte` | Management UI works |

---

## Dependency Map

| Dependency | From | To | Status | Notes |
|---|---|---|---|---|
| `@danwa/api-client` | danwa-studio | danwa-core/packages | ❌ Broken | No `dist/` |
| `@danwa/i18n` | danwa-studio | danwa-core/packages | ❌ Broken | No `dist/` |
| `@danwa/ui-core` | danwa-studio | danwa-core/packages | ❌ Broken | No `dist/` |
| Module index (`index.json`) | danwa-core | danwa-modules | ✅ Works | Cached 24h |
| Module ZIP downloads | danwa-core | GitHub Releases | ✅ Works | `install-from-repo` |
| UI translations (REST API) | danwa-studio | danwa-core | ✅ Works | `TranslationsView` |
| UI translations (static files) | danwa-studio | — | ❌ Broken | Gap 1 |
| Prompt templates | danwa-studio → danwa-core | modules/local | ⚠️ Partial | Read-only, manual install (Gap 2) |
| Workflow templates | danwa-studio | danwa-core | ⚠️ Unclear | Gap 4 |
| Language-packs (install) | danwa-core | danwa-modules | ✅ Works | Repo install works |
| Language-packs (delivery) | danwa-studio | — | ❌ Broken | Gap 1 / 5 |

---

## Recommended Remediation Sequence

### Priority 1 — Unblock i18n for danwa-studio users

1. **Fix UI i18n delivery**
   Make the frontend i18n loader call `/api/v1/i18n/{locale}` (REST API) instead of fetching static JSON files. The REST endpoint already supports namespace merging (`global` + `langpack:*`), so installed language packs would become visible immediately.

2. **Verify language-pack discovery**
   Confirm that `get_installed_locales()` in `ui_translation_service.py:1229-1308` correctly includes locales from repo-installed language-pack modules whose module_registry entry is `enabled = 1`.

### Priority 2 — Enable content consumption

3. **Add auto-sync capability**
   Create a CLI command (`danwa modules sync-from-repo`) and/or a startup hook that fetches the repo index and installs/updates modules marked with `"auto_sync": true` in the index. Consider a `systemd` timer or a background thread.

4. **Build danwa-core packages**
   Add `build` scripts to each of `packages/api-client`, `packages/i18n`, `packages/ui-core`. Target ESM output so Vite/rolldown can resolve them. If build infra is too heavy, migrate studio to its own stable API wrapper and remove the `file:` deps.

### Priority 3 — Clarify ownership

5. **Document workflow templates source**
   Investigate `workflow_templates.py` — decide whether workflow templates should follow the module-based pattern (like prompt templates) or remain DB-managed.

6. **Align language-pack end-to-end flow**
   After Gap 1 is fixed, verify the complete pipeline: `ModulesView → install from repo → enable → studio UI shows translations in the chosen locale`.

---

## File Map (Quick Navigation)

```
danwa-studio/
├── src/lib/
│   ├── api.js                          # Gap 3 - fallback wrapper
│   ├── i18n/
│   │   ├── api.js                      # Gap 1 - REST API wrappers (working)
│   │   └── loader.js                   # Gap 1, 5 - static-file fetcher (broken)
│   ├── modules/api.js                  # Gap 2 - REST wrappers (working)
│   └── blueprint/api.js                # Working - prompt templates etc.
├── src/views/
│   ├── TranslationsView.svelte         # Gap 1 - uses REST correctly
│   ├── ModulesView.svelte              # Gap 2 - manual repo UI
│   ├── PromptsView.svelte              # Gap 2 - read-only from modules
│   └── WorkflowTemplatesView.svelte    # Gap 4 - source unclear
├── package.json                        # Gap 3 - broken file: deps
└── docs/2026-06-25_architecture-gap-analysis.md  # this file

danwa-core/
├── backend/api/routers/
│   ├── ui_i18n.py                      # Gap 1 - REST endpoints
│   ├── modules.py                      # Gap 2, 5 - repo index, install, export
│   ├── prompt_templates.py             # Gap 2 - read-only from modules (working)
│   └── workflow_templates.py           # Gap 4 - source unclear
├── backend/services/
│   ├── ui_translation_service.py       # Gap 1, 5 - locale discovery + DB
│   └── module_profile_sync.py          # Gap 2, 4 - reads local modules/
├── packages/
│   ├── api-client/                     # Gap 3 - needs build
│   ├── i18n/                           # Gap 3 - needs build
│   └── ui-core/                        # Gap 3 - needs build
└── modules/                            # Local module install target

danwa-modules/
├── index.json                          # 153 modules (prompts, bundles, cores...)
├── ui-translations/                    # 59 language-pack modules
├── workflows/                          # 10 workflow template modules
├── agent-*/                            # Agent cores, bundles, patterns
└── llm-profiles/                       # LLM profile modules
```

---

## Open Questions

These questions are explicitly left open for in-depth investigation before implementation:

1. **UI i18n delivery approach** — Should the fix use the REST API (Option A: adapt `loader.js` to call `/api/v1/i18n/{locale}`) or add static file serving in danwa-core (Option B: serve the `modules/` directory at the `/modules` URL prefix)? Option A is architecturally simpler and aligns with the existing `TranslationsView` pattern; Option B matches the original `danwa` design.

2. **Auto-sync scope** — Should auto-sync apply to all modules in the repo index, only to a whitelist, or to currently enabled modules only? How should local edits be handled when a sync would overwrite them — merge, skip, flag?

3. **Package build target** — Should `@danwa/*` packages be published to a local registry (pnpm workspace, GitHub Packages), converted to in-repo source files, or simply removed and replaced with stable in-tree wrappers?

4. **Workflow templates source** — Should workflow templates follow the module-based pattern (read-only from `danwa-modules`, like prompt templates) or remain DB-managed? The answer depends on whether admins need to edit workflow templates or only consume them.
