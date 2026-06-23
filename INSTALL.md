# Installing & Running danwa-studio

> **Quickstart guide** for the `danwa-studio` admin/dev frontend.
> For architecture and feature list see [`README.md`](README.md).

This document is part of the multi-repo orchestration described in
[`plans/2026-06-22_repo-setup-orchestration.md`](../../danwa/plans/2026-06-22_repo-setup-orchestration.md)
(Phase 9).

---

## Prerequisites

| Tool | Min version | How to install |
|------|-------------|----------------|
| **Node.js** | 22.x | `nvm install 22` (or use your distro's package manager) |
| **npm** | bundled with Node | comes with Node.js |
| **curl** | any | usually pre-installed |
| **git** | any | usually pre-installed |

The shared bash library `libdanwa.sh` lives in
[`scripts/libdanwa.sh`](scripts/libdanwa.sh) (vendored copy at
[`.lib/libdanwa.sh`](.lib/libdanwa.sh) after `setup.sh`).

**Current `libdanwa.sh` version:** **v1.0.0** (see `LIBDANWA_VERSION`
at the top of the library).

The studio consumes the **`danwa-core` backend** at port 8000. You'll
need it running to see real data — see
[`../danwa-core/INSTALL.md`](../danwa-core/INSTALL.md).

---

## Quickstart

Three commands get you running from a fresh clone:

```bash
# 1. Install dependencies (Node 22, npm install, vendoring libdanwa.sh)
bash setup.sh

# 2. Start the studio frontend (Vite, port 5174)
bash manage.sh start

# 3. Open the studio
xdg-open http://localhost:5174  # or visit it in your browser
```

The studio will start on **http://localhost:5174**. It talks to the
backend on **http://localhost:8000**.

For the **interactive dashboard**:

```bash
bash manage.sh dashboard
```

For a quick **status overview**:

```bash
bash manage.sh status
```

---

## Sibling-Setup (Full Stack)

`danwa-studio` is the **admin/dev** companion to the user-facing `danwa`
app. Both consume the same `danwa-core` backend. Recommended layout:

```
parent-dir/
├── danwa-core/        # Backend (uvicorn + FastAPI, port 8000)
├── danwa/             # User-frontend (Vite, port 5173)
└── danwa-studio/      # Admin/dev-frontend (Vite, port 5174)  ← THIS REPO
```

### One-stop full-stack setup

```bash
mkdir ~/danwa-stack && cd ~/danwa-stack
git clone https://github.com/asb-42/danwa-core.git
git clone https://github.com/asb-42/danwa-studio.git  # this repo
git clone https://github.com/asb-42/danwa.git

cd danwa-core
bash setup.sh
bash manage.sh start   # starts backend + auto-detects danwa + danwa-studio
```

The orchestrator picks up `danwa-studio` from the parent dir
automatically. Default ports:

| Component | Port | URL |
|-----------|------|-----|
| danwa-core backend | 8000 | http://localhost:8000/docs |
| danwa (user-app) | 5173 | http://localhost:5173 |
| danwa-studio (admin/dev) | 5174 | http://localhost:5174 |

### Standalone setup (studio only)

If you only want the studio (e.g. for development):

```bash
cd danwa-studio
bash setup.sh
bash manage.sh start
```

You must run `danwa-core` separately (e.g. `cd ../danwa-core && bash manage.sh start be`),
or the studio will show "backend not reachable" warnings.

---

## SystemManagementView — Backend Restart Button

The studio's `SystemManagementView` exposes a **graceful backend-restart
button**. Under the hood it calls:

```
POST http://localhost:8000/api/v1/system/restart-backend
```

The endpoint (`backend/api/routers/system_control.py` in `danwa-core`)
sends `SIGTERM` to the running uvicorn process after 200 ms. If
`danwa-core/manage.sh` was started with `BACKEND_WATCHER_ENABLED=1`,
its watcher loop detects the death and respawns the backend.

**Do not kill the backend with `kill -9` from your terminal** if the
watcher is enabled — use the Studio restart button so the watcher can
bring it back up.

Other useful endpoints (all on danwa-core):

| Endpoint | Purpose |
|----------|---------|
| `GET  /api/v1/system/status` | Health + pids + uptime (always 200) |
| `POST /api/v1/system/stop-backend` | Graceful stop (no auto-respawn) |
| `POST /api/v1/system/restart-backend` | Graceful restart (with watcher) |
| `POST /api/v1/system/reload-config` | Reload LLM profiles / prompts |

The studio's status panel polls `GET /api/v1/system/status` and shows
the JSON shape:

```json
{
  "backend":  { "pid": 12345, "alive": true,  "port": 8000 },
  "frontend": { "pid": null,  "alive": false, "port": 5173 },
  "studio":   { "pid": 12350, "alive": true,  "port": 5174 },
  "watcher_enabled": true,
  "version": "1.0.0"
}
```

---

## Shared Library — `libdanwa.sh`

All `setup.sh` and `manage.sh` scripts in the `danwa-*` repo family
source a shared bash library called **`libdanwa.sh`**
([`scripts/libdanwa.sh`](scripts/libdanwa.sh)). It provides:

- Colorised logging (`log_info`, `log_ok`, `log_warn`, `log_error`)
- Process management (`pid_running`, `kill_pid`, `wait_for_url`, `wait_for_port`)
- Toolchain checks (`check_node_version`, `check_python_version`, `check_uv_installed`)
- Repo-config loading (`load_repo_config`, `discover_siblings`)

**Current version:** **v1.0.0**.

On first `bash setup.sh`, the library is **vendored** into
[`.lib/libdanwa.sh`](.lib/libdanwa.sh) for offline operation. To update
to a newer release:

```bash
bash setup.sh            # re-vendors if the source-of-truth file changed
```

The `manage.sh` shim refuses to start if the vendored library is on an
incompatible major version (anything not matching `v1.*`).

---

## Troubleshooting

### `ERROR: libdanwa.sh not found. Run setup.sh first.`

You tried to run `manage.sh` before `setup.sh`. Fix:

```bash
bash setup.sh
```

If `setup.sh` itself can't find `libdanwa.sh`:

```bash
cp scripts/libdanwa.sh .lib/libdanwa.sh
```

### Studio UI loads but shows "Backend nicht erreichbar"

The studio needs the backend on port 8000. Either:

- Start it: `cd ../danwa-core && bash manage.sh start be`, or
- Check `BACKEND_PORT` in your `.danwa-config` matches the actual backend port.

### Port 5174 already in use

Another Vite dev-server (or another studio instance) is bound to the
port. Either stop it or pick a different port:

```bash
STUDIO_PORT=5274 bash manage.sh start
```

### `npm install` fails in `setup.sh`

Usually a Node version mismatch. Verify:

```bash
node --version    # must be v22.x or later
```

If you use `nvm`: `nvm use 22` (or `nvm install 22`).

### Vitest regressions after my changes

The studio has its own Vitest suite (`vitest.config.js` + `tests/`).
Run them in isolation from the bats suite:

```bash
npm run test      # vitest (frontend)
bats tests/scripts/   # bash (setup/manage)
```

---

## Files in this repo

| Path | Purpose |
|------|---------|
| [`setup.sh`](setup.sh) | Thin shim → [`repo-templates/danwa-studio/setup.sh`](repo-templates/danwa-studio/setup.sh) |
| [`manage.sh`](manage.sh) | Thin shim → [`repo-templates/danwa-studio/manage.sh`](repo-templates/danwa-studio/manage.sh) |
| [`repo-templates/danwa-studio/manage.sh`](repo-templates/danwa-studio/manage.sh) | Canonical manage template |
| [`.danwa-config`](.danwa-config) | Repo metadata (BACKEND_PORT=8000, FRONTEND_PORT=5174) |
| [`scripts/libdanwa.sh`](scripts/libdanwa.sh) | Shared bash library v1.0.0 |
| [`.lib/libdanwa.sh`](.lib/libdanwa.sh) | Vendored copy (created by `setup.sh`) |
| [`tests/scripts/`](tests/scripts/) | bats test suite (mirrored from danwa) |
| `tests/` (Vitest) | frontend component tests (159 tests) |

---

## See also

- [`README.md`](README.md) — project overview, admin features, sprint history
- [`plans/2026-06-22_repo-setup-orchestration.md`](../../danwa/plans/2026-06-22_repo-setup-orchestration.md) — multi-repo orchestration plan (Phases 1–11)
- `../danwa-core/INSTALL.md` — install guide for the backend (sibling)
- `../danwa/INSTALL.md` — install guide for the user-app frontend (sibling)