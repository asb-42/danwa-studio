#!/usr/bin/env bash
# danwa-studio/manage.sh — Thin shim that delegates to the canonical template.
#
# Canonical source of truth: repo-templates/danwa-studio/manage.sh
# (This shim exists so `bash manage.sh <cmd>` at the repo root keeps
#  working exactly as before, while the actual logic — and tests —
#  live in the template.)
#
# Mirrors the strategy from plans/2026-06-22_repo-setup-orchestration.md
# §3.2 step 6 (Phase 6 — adopted by danwa-studio in Phase 6).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/repo-templates/danwa-studio/manage.sh"

if [[ ! -f "$TEMPLATE" ]]; then
    echo "ERROR: canonical manage template not found at $TEMPLATE" >&2
    echo "Hint: git pull — repo-templates/danwa-studio/manage.sh is the source of truth." >&2
    exit 1
fi

# Forward all env overrides (DANWA_PROJECT_DIR, DANWA_USE_MOCK, …)
# and all CLI arguments unchanged. Set DANWA_PROJECT_DIR to THIS script's
# dir (= repo root) unless the caller already supplied one.
export DANWA_PROJECT_DIR="${DANWA_PROJECT_DIR:-$SCRIPT_DIR}"
exec bash "$TEMPLATE" "$@"