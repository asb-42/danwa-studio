# LLM Catalog Integration — Walkthrough

**Added:** Sprint 7 (2026-06-15)
**Plan:** [`plans/2026-06-15_llm-catalog-integration.md`](../plans/2026-06-15_llm-catalog-integration.md)

## What it does

Pulls structured LLM metadata (cost, context window, capabilities,
modalities, reasoning, lifecycle) from public GitHub-hosted catalogs
and materialises them as `llm-profiles` modules in `danwa-modules`,
so we no longer maintain that data by hand.

**Currently integrated catalogs:**

| Source | URL | Provider-JSON path |
|---|---|---|
| `catwalk` | https://github.com/charmbracelet/catwalk | `internal/providers/configs/<provider>.json` |
| `llm_db` | https://github.com/agentjido/llm_db | `priv/llm_db/providers/<provider>.json` |

The catalog → danwa-modules pipeline is intentionally **non-destructive**:
existing profiles are merged in place, never overwritten or deleted
without an explicit flag.

## User flow (Studio)

1. Sidebar → **EVOLVE** → **📚 LLM Catalog** (route `/catalog`)
2. **Sources** tab → click `Fetch all` (first time does a `git clone`,
   subsequent calls do a `git fetch + reset` — no merge state).
3. **Preview** tab → browse the normalized catalog with
   source / provider / reasoning filters. Caps at 200 rows;
   narrow with filters to see more.
4. **Diff** tab → `Run diff (dry-run)` shows what would change
   (`create` / `update` / `skip` / `stale`). Click `Apply` to write
   into `<MODULES_DIR>/llm-profiles/`.
5. After Apply, a purple **`Publish new (N)`** button appears
   that batch-pushes all newly-created modules to the `danwa-modules`
   Git repo. Only works when the publisher env vars are set
   (`DANWA_MODULES_PUBLISH_ENABLED=true` etc.).
6. **Stale** tab → local modules that have no matching upstream
   entry. Marked with a `.stale` flag file when Apply runs;
   a separate cleanup job can act on it (out of scope here).

## Merge strategy

For models that appear in **both** catalogs (e.g. `openai/gpt-4o`):

| Field | Source of truth |
|---|---|
| `cost_per_1m_*` (and the derived `cost_per_1k_*`) | **catwalk** (per-1M native) |
| `can_reason`, `reasoning_levels`, `default_reasoning_effort` | **catwalk** |
| `capabilities`, `modalities` | **llm_db** (richer) |
| `lifecycle_status`, `knowledge_cutoff`, `release_date`, `family` | **llm_db** |
| `aliases`, `catalog_tags` | union (sorted, deduped) |
| Everything else | first non-null |

`catwalk` is the primary source for cost + reasoning; `llm_db` is the
primary for capabilities + lifecycle. This split is encoded in
`backend.llm_catalog.import_engine._merge_models()`.

## Module id

Deterministic from `(provider, normalized_model_name)`:
```
module_id = f"llm-{sha256(f'{provider}:{normalized_model}')[:8]}"
```

So a model in both catalogs gets the **same** local id and the
`Apply` step updates the same file instead of creating two copies.

`provider:normalized_model` (not `source:provider:model`) because we
want one module per real model, not per catalog entry. A separate
`module_id_for()` function keeps the source-aware variant available
for cases where the same upstream model has conflicting metadata.

## Schema additions to `BlueprintLLMProfile`

All 21 new fields are `Optional` with `None` / empty defaults. Existing
local profiles load unchanged; the studio's schema editor only
displays the new fields when they're populated.

```
catalog_source              catalog_id                  catalog_last_synced_at
cost_per_1m_input           cost_per_1m_output           cost_per_1m_cached_input
cost_per_1m_cached_output   cost_currency
can_reason                  reasoning_levels             default_reasoning_effort
capabilities (dict)         modalities (dict)             lifecycle_status
knowledge_cutoff           release_date                 last_updated
family                      aliases (list)               catalog_tags (list)
api_endpoint_template       default_large_model_id      default_small_model_id
```

## How to extend

**Add a new catalog source** (e.g. `models-table`):

1. Add a `SourceSpec` entry to `_build_sources()` in
   `backend/llm_catalog/sources.py`:
   ```python
   "models_table": SourceSpec(
       name="models_table",
       repo_url=settings.catalog_models_table_repo,
       branch=settings.catalog_models_table_branch,
       path=settings.catalog_models_table_path,
   ),
   ```
2. Add the 3 settings (`*_repo`, `*_branch`, `*_path`) to
   `Settings` in `backend/core/config.py`.
3. Add a `normalize_models_table()` function in
   `backend/llm_catalog/normalize.py` that yields `NormalizedModel`
   from the per-provider JSON shape.
4. Register it in `load_source_normalized()`'s normalizer dict
   (currently `normalize_catwalk` / `normalize_llm_db`).
5. Add the new source name to `catalog_default_sources`.

The studio side (`src/lib/catalog/api.js`, `CatalogView.svelte`)
needs **no changes** — the source list, fetch buttons, and diff
table all iterate the registry dynamically.

## Operational notes

- **Cache:** all clones live in `<DANWA_CATALOG_CACHE_DIR>` (default
  `data/llm-catalog/`).  First `Fetch` clones; subsequent `Fetch`
  fetches + resets to the remote branch (no merge state, no local
  divergence).
- **Forks / mirrors:** all `DANWA_CATALOG_*` env vars have
  defaults; override per source (e.g. `DANWA_CATALOG_CATWALK_REPO=...`)
  to point at a fork.
- **Per-file isolation:** if one provider JSON is malformed, only
  that file is skipped; the rest of the catalog still imports.
- **Path-traversal defence:** filenames in the catalog are filtered
  through `_is_safe_provider_filename()` (no `/`, `\`, or leading `.`).
- **Rate-limit hint:** the `slowapi` rate-limiter (already on the
  backend) applies; the `/api/v1/catalog/fetch-all` endpoint should
  not be hammered.
- **Tests:** `pytest tests/backend/llm_catalog/` runs 21 tests
  covering id strategy, normalization, and the import engine
  (diff / apply / stale / idempotency / per-1M → per-1K projection).

## Known limitations (deliberate, see plan §9)

- Existing local modules with the old 8-char-hash-uuid pattern
  (`llm-xxxxxxxx-xxxx-...`) are all reported as `stale` in the first
  diff run.  The new format `llm-<8hex-hash>` is what we use going
  forward; the cleanup job (out of scope here) can act on the
  `.stale` flag files.
- Stale entries are **flagged**, not deleted.  A separate cleanup
  job is the right place to enforce TTL-based deletion.
- Auto-publishing (after Apply) is not backend-side — the studio
  has a `Publish new` button.  Reason: the publisher is opt-in via
  env vars, so the UI thread is the natural place to surface the
  "publisher disabled → status=failed" feedback.
- Catalog merges are **per-(provider, model) tuple**. If the same
  model id appears with different casing in two catalogs, the
  normalized id is the same (case-insensitive) and the merged
  field set is the union.

## File map

```
danwa-core/
├── backend/
│   ├── core/config.py            # 7 new DANWA_CATALOG_* settings
│   ├── llm_catalog/
│   │   ├── __init__.py           # package docstring
│   │   ├── sources.py            # SourceSpec + registry
│   │   ├── fetcher.py            # git clone + pull
│   │   ├── normalize.py          # catwalk + llm_db parsers
│   │   ├── id_strategy.py        # module_id_for_provider_model()
│   │   └── import_engine.py      # diff + apply
│   └── api/routers/catalog.py    # 4 endpoints + 1 (now removed) stub
├── tests/backend/llm_catalog/    # 21 pytest tests

danwa-studio/
├── src/
│   ├── lib/catalog/api.js        # 5 thin wrappers
│   ├── views/CatalogView.svelte  # 4 tabs + 3 master buttons
│   ├── lib/i18n/loader.js        # 10 catalog.* keys
│   ├── components/Sidebar.svelte # 📚 LLM Catalog entry
│   └── App.svelte                # {#case '/catalog'}
├── docs/2026-06-15_llm-catalog-integration.md  # this file
└── plans/2026-06-15_llm-catalog-integration.md  # original plan
```
