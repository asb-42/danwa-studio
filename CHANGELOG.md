# Changelog

All notable changes to **danwa-studio** (the Svelte/SvelteKit admin/dev
frontend for the Danwa Debate Engine) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project does **not** follow [Semantic Versioning](https://semver.org/)
strictly yet — the major version has not reached 1.0.0.

## [Unreleased]

### Repo setup & manage orchestration (Phase 9 + 11)
- **Mirror of `danwa/repo-templates/`** as a local
  [`repo-templates/`](repo-templates/) directory containing all three
  template subdirs (`danwa/`, `danwa-core/`, `danwa-studio/`). The
  `danwa-studio/manage.sh` and `danwa-studio/setup.sh` shims at the
  repo root delegate to `repo-templates/danwa-studio/{manage,setup}.sh`.
- **Canonical templates now in-repo:**
  [`repo-templates/danwa-studio/manage.sh`](repo-templates/danwa-studio/manage.sh)
  and [`repo-templates/danwa-studio/setup.sh`](repo-templates/danwa-studio/setup.sh)
  are the single source of truth for the studio manage procedure
  (Vite dev-server lifecycle, status JSON, clean).
- **[`scripts/libdanwa.sh`](scripts/libdanwa.sh)** v1.0.0 vendored.
  `setup.sh` copies it into [`.lib/libdanwa.sh`](.lib/libdanwa.sh) on
  first run.
- **[`tests/scripts/`](tests/scripts/)** bats suite mirrored from danwa
  (10 files, 110+ tests).
- **[`.danwa-config`](.danwa-config)** added (REPO_NAME="danwa-studio",
  BACKEND_PORT=8000, FRONTEND_PORT=5174, SIBLINGS=("danwa-core")).
- **[`manage.sh`](manage.sh)** + **[`setup.sh`](setup.sh)** thin shims
  added (delegate to templates).
- **[`INSTALL.md`](INSTALL.md)** added (Phase 9): prerequisites,
  quickstart, sibling-setup full-stack mode, SystemManagementView
  backend-restart hint, libdanwa.sh reference, troubleshooting, file map.
- **[`.github/workflows/test-scripts.yml`](.github/workflows/test-scripts.yml)**
  added (Phase 11): runs the bats suite on every push/PR to main.
- Test results: **126/127 pass** (one pre-existing Phase-6 failure in
  `setup_studio.bats:123` — unrelated to this mirror).
- Smoke test: `bash manage.sh help` and `bash manage.sh status` work
  end-to-end through the shim.
