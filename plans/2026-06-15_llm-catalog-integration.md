# Plan: catwalk + llm_db Integration

**Datum:** 2026-06-15
**Status:** Entwurf (zur User-Approval)
**Vorgänger:** `2026-06-15_danwa-studio.md` (Sprint 6 abgeschlossen)
**Quellen:** `charmbracelet/catwalk` (main) + `agentjido/llm_db` (main)

---

## 1. Ziel

Zwei öffentliche LLM-Kataloge als **Single Source of Truth** für die
`llm-profiles`-Module in `danwa-modules` anzubinden:

| Repo | Format | Provider-Datei pro Anbieter | Modell-Keys |
|---|---|---|---|
| [`charmbracelet/catwalk`](https://github.com/charmbracelet/catwalk/tree/main/internal/providers/configs) | JSON pro Provider (Dict mit `name`/`id`/`api_key`/`models[]`) | `openai.json`, `anthropic.json`, `groq.json`, `openrouter.json`, … (30+ Dateien) | Array |
| [`agentjido/llm_db`](https://github.com/agentjido/llm_db/tree/main/priv/llm_db/providers) | JSON pro Provider (Dict mit `id`/`name`/`base_url`/`models{}`) | `openai.json`, `anthropic.json`, `bedrock.json`, … (60+ Dateien) | Dict |

Beide Repos liefern **deutlich mehr Informationen** als unser aktuelles
Danwa-Schema (`provider`, `model`, `cost_per_1k_input/output`,
`context_window`, `max_tokens`, `temperature`, `timeout`, `a2a_*`,
`fallback_llm_profile_id`). Insbesondere:
- **catwalk**: `cost_per_1m_in/out/in_cached/out_cached`, `can_reason`,
  `reasoning_levels[]`, `default_reasoning_effort`, `supports_attachments`,
  `default_large_model_id`, `default_small_model_id`, Provider-Level
  `api_key`-Template + `api_endpoint`
- **llm_db**: `capabilities.{chat,embeddings,json,reasoning,streaming,tools}`,
  `cost.{input,output,cache_read,cache_write}`, `modalities.{input,output}`,
  `limits.{context,output}`, `lifecycle.status`, `knowledge` cutoff,
  `release_date`, `last_updated`, `family`, `aliases[]`, `tags[]`, `env[]`

---

## 2. Schemata (Ist vs Soll)

### 2.1 Aktueller `LLMProfile` (backend/blueprints/models.py:32)
```python
id, name, profile_type, provider, model,
api_base, api_key_env, account_id_env,
max_tokens, context_window, temperature, timeout,
cost_per_1k_input, cost_per_1k_output,
protocol, a2a_endpoint, a2a_timeout, fallback_llm_profile_id,
service_eligible
```

### 2.2 Geplanter `LLMProfile` (Sprint 7 — additive, backwards-compat)
Alle existierenden Felder bleiben. Hinzu kommen (alle `Optional`/`=None`):
```python
# ---- Cost (catwalk: per-1M; llm_db: per-1K — wir normalisieren auf per-1K) ----
cost_per_1m_input: float | None          # catwalk: cost_per_1m_in
cost_per_1m_output: float | None         # catwalk: cost_per_1m_out
cost_per_1m_cached_input: float | None    # catwalk: cost_per_1m_in_cached
cost_per_1m_cached_output: float | None   # catwalk: cost_per_1m_out_cached
cost_currency: str | None = "USD"         # llm_db: pricing_defaults.currency

# ---- Reasoning (catwalk) ----
can_reason: bool = False
reasoning_levels: list[str] = []          # ["low","medium","high","xhigh"]
default_reasoning_effort: str | None

# ---- Capabilities (llm_db) ----
capabilities: dict[str, Any] = {}         # {"chat": true, "tools": {"enabled": true}, "json": {...}, ...}
modalities: dict[str, list[str]] = {}     # {"input": ["text","image"], "output": ["text"]}
lifecycle_status: str | None             # "active" | "deprecated" | "retired"
knowledge_cutoff: str | None             # "2024-07-31"
release_date: str | None
last_updated: str | None
family: str | None
aliases: list[str] = []
tags: list[str] = []

# ---- Provider-level (catwalk only) ----
api_endpoint_template: str | None         # z.B. "$ANTHROPIC_API_ENDPOINT"
default_large_model_id: str | None
default_small_model_id: str | None
```

### 2.3 Kompatibilität
Bestehende Profile in `danwa-modules/llm-profiles/llm-*` brauchen keine
Migration — die neuen Felder sind alle `Optional` und der Studio-
Schema-Editor zeigt sie nur, wenn sie gesetzt sind.

---

## 3. Architektur

### 3.1 Datenfluss

```
┌──────────────────────┐
│  GitHub: catwalk     │──┐
│  + llm_db (raw JSON) │  │  fetch_catalog.py
└──────────────────────┘  │  (subprocess git clone, ggf. cached)
                          ▼
                  ┌───────────────────┐
                  │ Normalized Catalog │   {"providers": {
                  │ (in-memory cache)   │     "openai": {
                  └───────────────────┘      "name": "OpenAI",
                            │                 "endpoint": "...",
                            │                 "models": {
                            │                   "gpt-5.5": {
                            │                     "context_window": 1050000,
                            │                     "cost": {input: 5.0, output: 30.0, ...},
                            │                     "capabilities": {...},
                            │                     "modalities": {...}
                            │                   }
                            │                 }
                            │               }}
                            ▼
                  ┌─────────────────────────┐
                  │   Danwa ModuleService    │   upsert_by_id()
                  │   (save_profile_schema)  │   match key = (provider, model)
                  └─────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────────┐
              │ danwa-modules/llm-profiles/    │  each model → own dir
              │   <sha-hash>/                  │   llm-<sha>/
              │     manifest.json              │     manifest.json
              │     profile.yaml               │     profile.yaml
              └──────────────────────────────┘
```

### 3.2 Modul-ID Schema
Aktuell: `llm-<uuid>` (z.B. `llm-018f1b67-...`). Wir behalten das
Pattern — der SHA-Hash wird aus `f"{provider}:{model}"` (sha256[:8])
deterministisch berechnet, damit wiederholte Imports idempotent sind
und Updates den selben Pfad treffen.

### 3.3 Match / Sync-Logik
Pro `(provider, model)` Tupel:
1. **Existiert lokal**: Update `profile.yaml` mit neuen Feldern (alle
   neuen Felder werden gemerged — alte Werte bleiben wenn upstream
   keinen Wert liefert).
2. **Existiert nicht lokal**: Neu anlegen (vollständiges `manifest.json`
   + `profile.yaml`).
3. **Lokal existiert, upstream nicht**: Behalten + `marked_stale: true`
   ins manifest schreiben (UI zeigt "⚠ upstream gone"), nach 90 Tagen
   als deprecated markieren.

### 3.4 Neue Backend-Endpoints (`danwa-core`)
| Methode | Pfad | Zweck |
|---|---|---|
| GET  | `/api/v1/catalog/sources`                  | Liste der verfügbaren Quellen (catwalk, llm_db) + Status (last_fetch_at, sha) |
| POST | `/api/v1/catalog/sources/{name}/fetch`     | Holt Repo (git clone/pull) in Cache (`data/llm-catalog/`), normalisiert, gibt Anzahl Models pro Provider zurück |
| GET  | `/api/v1/catalog/catalog`                  | Liefert den normalisierten Cache (für Studio-Preview) |
| POST | `/api/v1/catalog/import`                   | Body: `{ sources: [...], providers?: [...], dry_run?: bool }` → Diff-Report (would_create, would_update, would_stale) + optional Apply |
| POST | `/api/v1/catalog/import/{module_id}/publish` | Convenience: einen importierten Module per Git-Publisher (already existierend) ins `danwa-modules`-Repo schieben |

### 3.5 Pydantic-Modelle (`backend/llm_catalog/`)
- `SourceSpec` (name, repo_url, branch, paths)
- `RawModelEntry` (Provider-Metadaten + Raw-Model-Dict)
- `NormalizedModel` (vereinheitlichtes Schema, unabhängig von der Quelle)
- `ImportReport` (per-provider: created/updated/skipped/stale counts)
- `ImportRequest` (sources, providers, dry_run)

### 3.6 Frontend (`danwa-studio`)
Neue View **`CatalogView`** unter Sidebar-Sektion **CONFIGURE → 📚 LLM Catalog**
(route `/catalog`), mit Tabs:

1. **Sources**: Liste der verfügbaren Repos, "Fetch" Button pro Source,
   "Fetch all" Master-Button, last-fetch-At-Timestamp + Git-SHA
2. **Preview**: Normalisierter Katalog als durchsuchbare Tabelle
   (Filter: provider, model, can_reason, has_vision). Spalten: Provider,
   Model, Context, Max Out, Input/Output $/1M, Reasoning, Caps-Icons
3. **Import-Diff**: Wenn Cache aktuell, zeigt einen "Run Diff" Button,
   der per POST /import?dry_run=true einen Report holt und in einer
   Tabelle anzeigt: would_create / would_update / would_stale
   (sortierbar, filterbar). "Apply" Button führt den Import aus.
4. **Stale List**: Tabelle aller Module, die als `_stale: true`
   markiert sind, mit "delete local copy" Action.

Plus: 3 Buttons im Header (`Import all`, `Publish new`, `Update all`) —
sparen Klicks wenn man ohne Diff einfach alles durchpumpen will.

### 3.7 Match zwischen LLMProfile und Catalog
| LLMProfile field | catwalk source | llm_db source |
|---|---|---|
| `provider`           | file stem (e.g. `openai.json` → `openai`) | file stem (e.g. `openai.json` → `openai`) |
| `model`              | `models[].id`                              | `models[}.id` |
| `api_key_env`        | `api_key` (e.g. `$OPENAI_API_KEY`)          | `env[0]` (selten, meist env-var name) |
| `api_base`           | `api_endpoint` (template → resolve later)   | `base_url` |
| `max_tokens`         | `default_max_tokens`                       | `limits.output` |
| `context_window`     | `context_window`                            | `limits.context` |
| `cost_per_1k_input`  | `cost_per_1m_in / 1000`                     | `cost.input` |
| `cost_per_1k_output` | `cost_per_1m_out / 1000`                    | `cost.output` |
| `can_reason`         | `can_reason`                                | `capabilities.reasoning.enabled` |
| `reasoning_levels`   | `reasoning_levels`                          | (n/a) |
| `modalities`         | (n/a)                                       | `modalities` |
| `knowledge_cutoff`   | (n/a)                                       | `knowledge` |

`catwalk` ist primary für **Reasoning + Cost (per-1M, cached)**,
`llm_db` ist primary für **Capabilities + Modalities + Lifecycle**;
wir mergen mit "first non-null wins" Priorität `catwalk` > `llm_db`.

---

## 4. Implementierungs-Phasen

### Phase 1 — Backend: Schema + Fetcher (3–4 LoC Tage)
| Schritt | Datei | Inhalt |
|---|---|---|
| 1.1 | `backend/blueprints/models.py` | `LLMProfile` um neue Optional-Felder erweitern |
| 1.2 | `backend/llm_catalog/__init__.py` (neu) | Package-Init |
| 1.3 | `backend/llm_catalog/sources.py` (neu) | Source-Registry: `SOURCES = {"catwalk": SourceSpec(...), "llm_db": SourceSpec(...)}` |
| 1.4 | `backend/llm_catalog/fetcher.py` (neu) | `git clone` in `data/llm-catalog/<name>/`, ggf. `git pull` wenn vorhanden; `fetch_source(name) -> Path` |
| 1.5 | `backend/llm_catalog/normalize.py` (neu) | Catwalk: parse → `NormalizedModel`; llm_db: parse → `NormalizedModel`; merge: "catwalk wins on cost+reasoning, llm_db wins on caps+modalities" |
| 1.6 | `backend/api/routers/catalog.py` (neu) | 4 Endpoints (s.o.) |
| 1.7 | `backend/main.py` | `include_router(catalog.router, prefix="/api/v1/catalog")` |
| 1.8 | `backend/core/config.py` | 5 neue `DANWA_CATALOG_*` settings (cache dir, default sources) |

### Phase 2 — Backend: Import-Logik (2–3 LoC Tage)
| Schritt | Datei | Inhalt |
|---|---|---|
| 2.1 | `backend/llm_catalog/import_engine.py` (neu) | `diff(local, catalog) -> ImportReport`; `apply(report) -> {created: [ids], updated: [ids], staled: [ids]}`; idempotent (deterministische ID); nutzt `ModuleService` (oder neu zu schreibender `ModuleInstaller.upsert`) |
| 2.2 | `backend/api/routers/catalog.py` (extend) | `POST /import` mit `dry_run` Flag → liefert `ImportReport` ohne Disk-Schreibe; ohne `dry_run` → apply + return final `ImportReport` |
| 2.3 | `backend/llm_catalog/id_strategy.py` (neu) | `module_id_for(provider, model) -> str` = `f"llm-{sha256(provider+':'+model)[:8]}"` |

### Phase 3 — Studio-Frontend (3–4 LoC Tage)
| Schritt | Datei | Inhalt |
|---|---|---|
| 3.1 | `src/lib/catalog/api.js` (neu) | 4 Wrappers (listSources, fetchSource, getCatalog, runImport) |
| 3.2 | `src/views/CatalogView.svelte` (neu) | 4 Tabs (Sources, Preview, Import-Diff, Stale), 3 Master-Buttons, Filter-Bar |
| 3.3 | `src/App.svelte` | `import CatalogView from './views/CatalogView.svelte'` + `{#case '/catalog'}` |
| 3.4 | `src/components/Sidebar.svelte` | Neuer Eintrag `📚 LLM Catalog` unter CONFIGURE |
| 3.5 | `src/lib/i18n/loader.js` (extend) | Neue Keys: `catalog.title`, `catalog.fetch`, `catalog.import`, `catalog.diff`, `catalog.stale`, `catalog.source.{catwalk,llm_db}` |

### Phase 4 — Polish + Publish-Integration (1–2 LoC Tage)
| Schritt | Datei | Inhalt |
|---|---|---|
| 4.1 | `src/views/CatalogView.svelte` (extend) | "Publish new" Button → batched Aufruf von `POST /api/v1/modules/{id}/publish` für alle `would_create` aus dem letzten Diff |
| 4.2 | `backend/llm_catalog/import_engine.py` (extend) | `apply()` triggert optional direkt den `ModulePublisher` (oder returned Liste der neu erstellten `module_id`s für Studio-side publish) — Entscheidung: Studio-side, da Publisher opt-in via env ist |

### Phase 5 — Tests + Doku (1 LoC Tag)
- Backend: `tests/llm_catalog/test_normalize.py` (Sample JSON → NormalizedModel), `test_id_strategy.py` (Determinismus)
- Studio: manueller Klick-Test, da keine Test-Infrastruktur existiert
- Doku: `docs/2026-06-15_llm-catalog-integration.md` (Walkthrough)

---

## 5. Konfiguration (env vars)

```bash
# .env additions
DANWA_CATALOG_CACHE_DIR=data/llm-catalog
DANWA_CATALOG_DEFAULT_SOURCES=catwalk,llm_db
DANWA_CATALOG_CATWALK_REPO=https://github.com/charmbracelet/catwalk.git
DANWA_CATALOG_CATWALK_BRANCH=main
DANWA_CATALOG_CATWALK_PATH=internal/providers/configs
DANWA_CATALOG_LLMDB_REPO=https://github.com/agentjido/llm_db.git
DANWA_CATALOG_LLMDB_BRANCH=main
DANWA_CATALOG_LLMDB_PATH=priv/llm_db/providers
```

Alle haben Defaults — läuft ohne Konfiguration out of the box.

---

## 6. Sicherheit / Performance

- **Subprocess-Bound**: `git clone` mit 60s Timeout, Cache-Größe-Limit 500 MB
- **Read-only Cache**: `data/llm-catalog/` ist read-only, fetched bei jedem Aufruf neu (kein dirty-write zwischen services)
- **Defence in depth**: Filenames in `internal/providers/configs` sind ASCII + alphanum + `-`; Pfad-Traversal-Check (kein `..` oder absolute paths)
- **Rate-Limit**: `slowapi` (already im backend) konfiguriert auf max 1 fetch/minute pro source

---

## 7. Test-Plan (Backend, weil Studio kein Test-Framework hat)

- `test_normalize_catwalk.py` — openai.json + anthropic.json → NormalizedModel[]
- `test_normalize_llm_db.py` — openai.json + anthropic.json → NormalizedModel[]
- `test_merge_priority.py` — gleicher model in beiden Quellen → catwalk wins für cost/reasoning
- `test_id_strategy.py` — `("openai", "gpt-5.5")` und `("openai", "GPT-5.5")` → gleicher ID (case-insensitive)
- `test_import_diff.py` — local fixtures vs. catalog → expected ImportReport
- Live-Test: `curl -X POST /api/v1/catalog/import?dry_run=true` mit echtem Cache

---

## 8. Risiken & Gegenmaßnahmen

| Risiko | Impact | Gegenmaßnahme |
|---|---|---|
| Catwalk/LLM-DB Schema-Drift | Import schlägt | Defensive `dict.get(...)` überall; `try/except` pro Provider, Fehler pro Provider sammeln statt abort |
| Sehr viele Models (1000+) | Langsames UI | Pagination + Suche; Server-side Filter |
| Provider mit `api_key="$VAR_NAME"` Templates | User hat Variable nicht gesetzt | Template wird 1:1 in `api_key_env` übernommen; Studio zeigt Hinweis |
| Idempotenz gebrochen (Provider umbenannt) | Doppelte Module | Match auch über normalized `name` zusätzlich zu `id` |
| `catwalk` 1 MB+ openrouter.json | Slow parse | Streaming JSON parse; only load on tab switch |

---

## 9. Out-of-Scope (für spätere Sprints)

- **Auto-Push** der neu importierten Module ins `danwa-modules`-Repo
  (macht Phase 4.1 explizit nur Studio-side, weil Publisher opt-in
  via env-var ist)
- **Update-Scheduler** (z.B. täglich per Cron fetchen + Diff anzeigen)
- **Andere Quellen** (openrouter/models, public llm-prices, …) — Pattern
  ist offen, neuer `SourceSpec` reicht
- **Module-Profile erweitern um `metadata: { catalog_source, catalog_id, last_synced_at }`** für Audit-Trail

---

## 10. Erfolgskriterien

- ✅ `POST /api/v1/catalog/sources/catwalk/fetch` lädt ~30 Provider-Dateien in <10s
- ✅ `POST /api/v1/catalog/import?dry_run=true` zeigt korrekten Diff (10+ Models neu, 5+ aktualisiert, 0 stale)
- ✅ `Import all` in der Studio-CatalogView erstellt die Module ohne manuellen Eingriff
- ✅ `Publish new` in der Studio-CatalogView pusht sie ins danwa-modules Repo (mit Publisher enabled)
- ✅ Bestehende Module (`/api/v1/modules/`) lesen und schreiben weiterhin korrekt (Regression-frei)
