# danwa-studio Test-Suite

Vitest-basierte Test-Suite für das danwa-studio Frontend. Sichert die zentralen
JavaScript-Module gegen Regressionen ab.

## Schnellstart

```bash
# Tests ausführen
npm test
# oder
npx vitest run

# Mit Coverage-Report
npm run test:coverage
# oder
npx vitest run --coverage

# Watch-Modus für Entwicklung
npm run test:watch
```

## Aktueller Status

| Metrik | Wert |
|--------|------|
| **Test-Dateien** | 10 |
| **Tests** | 159 |
| **Laufzeit** | ~650 ms |
| **Coverage (Statements)** | 87.3% |
| **Coverage (Branches)** | 91.7% |
| **Coverage (Lines)** | 87.3% |

Coverage auf Modulebene:

| Modul | Statements | Branches |
|-------|-----------|----------|
| `src/stores.js` | 100% | 100% |
| `src/lib/api.js` | 100% | 100% |
| `src/lib/blueprint/registry.js` | 100% | 100% |
| `src/lib/blueprint/edgeWiring.js` | 100% | 100% |
| `src/lib/blueprint/dnd.js` | 100% | 94% |
| `src/lib/blueprint/layout.js` | 100% | 92% |
| `src/lib/blueprint/validation.js` | 92.5% | 83.7% |
| `src/lib/blueprint/api.js` | 73.2% | 100% |
| `src/lib/catalog/api.js` | 83.9% | 92.9% |
| `src/lib/i18n/loader.js` | 100% | 85.2% |

## Architektur

```
tests/
├── README.md                        # Diese Datei
├── setup.js                         # Globale Vitest-Setup (jsdom, mocks)
├── _stubs/                          # Stubs für npm-Pakete
│   ├── api-client.js                # @danwa/api-client
│   ├── ui-core.js                   # @danwa/ui-core
│   ├── i18n.js                      # @danwa/i18n
│   └── elk-service.js               # (Fallback)
├── lib/
│   ├── api.test.js                  # generischer request() Wrapper
│   ├── catalog/
│   │   └── api.test.js              # LLM-Catalog REST-Client
│   ├── i18n/
│   │   └── loader.test.js           # i18n-Loader (EN-Fallback, fetch, subscribe)
│   └── blueprint/
│       ├── api.test.js              # Blueprint REST-Client (CRUD)
│       ├── registry.test.js         # Node/Edge-Registry
│       ├── validation.test.js       # Edge-Connection-Validierung
│       ├── dnd.test.js              # Drag-&-Drop-Helpers
│       ├── edgeWiring.test.js       # Post-Phase-3 No-Ops
│       └── layout.test.js           # ELK-Auto-Layout (gemockt)
└── stores.test.js                   # Svelte-Stores: page, user, notifications
```

## Test-Strategie

### 1. Pure-Function-Tests (Standard)

Die meisten Tests sind reine Unit-Tests ohne I/O. Beispiele:

- [`registry.test.js`](tests/lib/blueprint/registry.test.js) — `registerNode`, `getNodesByCategory`, …
- [`validation.test.js`](tests/lib/blueprint/validation.test.js) — `validateConnection`, `getWorkflowEdgeType`, …
- [`dnd.test.js`](tests/lib/blueprint/dnd.js) — `screenToFlowPosition`, `createDraftNode`, …

### 2. Fetch-Mocking für HTTP-Clients

Tests für `lib/api.js`, `lib/catalog/api.js` und `lib/blueprint/api.js`
mocken `globalThis.fetch` (bzw. `request()`). So können URL-Bau, Encoding,
Query-Parameter etc. geprüft werden, ohne echte HTTP-Requests.

### 3. jsdom für DOM-abhängige Module

`tests/setup.js` konfiguriert `jsdom` mit URL, sodass `localStorage`,
`navigator` und `crypto` verfügbar sind. Der i18n-Loader schreibt/liest
`localStorage` — der jsdom-URL-Fix verhindert `SecurityError`.

### 4. ELK-Mocking

`lib/elk-service.js` ist ein dünner Wrapper, der das echte ELK.js aufrufen
sollte. In den Tests wird `runLayout` per `vi.mock` ersetzt, damit die
Tests nicht von einer nativen WASM-Bibliothek abhängen.

### 5. Package-Stubs

Die Workspace-Pakete `@danwa/api-client`, `@danwa/ui-core`, `@danwa/i18n`
sind in CI möglicherweise nicht installiert. Vitest-Aliase in
[`vitest.config.js`](vitest.config.js) zeigen auf minimale Stubs in
`tests/_stubs/`, sodass die Importe auflösen, ohne dass die echten Pakete
installiert sein müssen.

## Konventionen

### Pfade

Da Vite die Tests ausgehend vom CWD auflöst, verwenden alle Test-Dateien
relative Imports, deren Tiefe der Verzeichnistiefe entspricht:

- `tests/*.test.js` → `'../src/...'`
- `tests/lib/*.test.js` → `'../../src/...'`
- `tests/lib/blueprint/*.test.js` → `'../../../src/...'`

### Fixtures & Mocks

- `beforeEach` setzt Stores / Mocks zurück, damit Tests unabhängig laufen.
- `vi.clearAllMocks()` + `vi.restoreAllMocks()` in `afterEach`.
- `vi.mock('@danwa/...')` für Workspace-Pakete (in `setup.js` global).
- `vi.mock('../../../src/lib/api.js')` für lokale Module, die wir ersetzen wollen.

### Konventionen

- **describe**-Blöcke gruppieren nach Funktion / Modul.
- Test-Namen beschreiben das Verhalten, nicht die Implementierung:
  `it('rejects missing sub claim')` statt `it('test 1')`.
- Keine Test-Klassen (nur Funktionen — einfacher zu navigieren).

## Hinzufügen neuer Tests

1. Erstelle `tests/<pfad>/<modul>.test.js` mit dem richtigen Import-Pfad.
2. Verwende `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';`.
3. Falls dein Modul auf `@danwa/...` zugreift, prüfe, ob ein Stub nötig ist
   (siehe `tests/_stubs/`).
4. Falls dein Modul `fetch` ruft, mocke `globalThis.fetch` per `vi.fn()`.

## CI-Integration

```yaml
- name: Frontend tests
  run: |
    npm ci
    npm test
```

`npm test` (= `vitest run`) beendet mit Exit-Code ≠ 0, wenn Tests fehlschlagen.

## Bekannte Lücken / nächste Schritte

Diese erste Test-Suite fokussiert auf **pure-Logik-Module** ohne Svelte-Komponenten.
Ausbaufähige Bereiche:

1. **Svelte-Komponenten** — `@testing-library/svelte` + Svelte-Component-Tests.
2. **Stores mit Side-Effects** — `derived`-Stores, komplexe Subscribe-Patterns.
3. **Workflow-Session-Store** (`store.svelte.js`) — groß, svelte-5-`$state`-basiert.
4. **ELK-Integration** — sobald `elk-service.js` den echten ELK-Aufruf
   implementiert, sollten die `runLayout` Mock-Tests gegen einen kleinen
   bekannten Graph verglichen werden.
5. **A2A-Adapter** — `src/lib/a2a/*` ist noch nicht getestet.
