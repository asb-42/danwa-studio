#!/usr/bin/env bats
#
# tests/scripts/start_pid_capture.bats — Regression test for the
# `$! is empty` bug fixed in 2026-06-22.
#
# Background: the start_studio() function in the danwa-studio manage
# template used the pattern
#     (cd DIR && nohup CMD &)
# which spawns the job inside a subshell, so `$!` outside the subshell
# was empty. Same pattern existed in 4 places in danwa-core's
# orchestrator template.
#
# These tests verify the fix:
#   - DANWA_USE_MOCK=1 start writes a non-empty pid file
#   - The captured pid is a real process
#   - stop cleans up properly

setup() {
    TEST_TMP="$(mktemp -d /tmp/danwa-studio-start-pid-XXXXXX)"
    export TEST_TMP
    PROJECT_DIR="$TEST_TMP/danwa-studio"
    mkdir -p "$PROJECT_DIR"
    export PROJECT_DIR
    export DANWA_PROJECT_DIR="$PROJECT_DIR"

    MANAGE_SCRIPT="$(cd "${BATS_TEST_DIRNAME}/../.." && pwd)/repo-templates/danwa-studio/manage.sh"
    LIBDANWA_PATH="$(cd "${BATS_TEST_DIRNAME}/../.." && pwd)/scripts/libdanwa.sh"

    cat > "$PROJECT_DIR/.danwa-config" <<EOF
REPO_NAME="danwa-studio"
BACKEND_PORT=18000
STUDIO_PORT=15174
EOF

    mkdir -p "$PROJECT_DIR/.lib"
    cp "$LIBDANWA_PATH" "$PROJECT_DIR/.lib/libdanwa.sh"

    export DANWA_USE_MOCK=1
    export STUDIO_PORT=15174
}

teardown() {
    # best-effort cleanup
    bash "$MANAGE_SCRIPT" stop >/dev/null 2>&1 || true
    rm -rf "$TEST_TMP"
    unset DANWA_PROJECT_DIR DANWA_USE_MOCK STUDIO_PORT
}

@test "start (mock): writes a non-empty studio.pid file" {
    run bash "$MANAGE_SCRIPT" start
    [ "$status" -eq 0 ]
    [ -f "$PROJECT_DIR/pids/studio.pid" ]
    local pid
    pid="$(cat "$PROJECT_DIR/pids/studio.pid")"
    [ -n "$pid" ]
}

@test "start (mock): captured pid is a real running process" {
    bash "$MANAGE_SCRIPT" start >/dev/null 2>&1
    local pid
    pid="$(cat "$PROJECT_DIR/pids/studio.pid")"
    [ -n "$pid" ]
    # kill -0 succeeds if the process exists (any uid if same user)
    run kill -0 "$pid"
    [ "$status" -eq 0 ]
}

@test "start (mock): does NOT print '\$! is empty' or similar set-but-unset error" {
    run bash "$MANAGE_SCRIPT" start
    [ "$status" -eq 0 ]
    [[ ! "$output" == *"ist nicht gesetzt"* ]]
    [[ ! "$output" == *"is unbound"* ]]
    [[ ! "$output" == *"unbound variable"* ]]
}

@test "start (mock): stop cleans up the pid file" {
    bash "$MANAGE_SCRIPT" start >/dev/null 2>&1
    [ -f "$PROJECT_DIR/pids/studio.pid" ]
    bash "$MANAGE_SCRIPT" stop >/dev/null 2>&1
    # After stop, either the pid file is gone OR the process is dead
    if [[ -f "$PROJECT_DIR/pids/studio.pid" ]]; then
        local pid
        pid="$(cat "$PROJECT_DIR/pids/studio.pid")"
        run kill -0 "$pid"
        [ "$status" -ne 0 ]
    fi
}

@test "start (mock): status shows running (not stopped)" {
    bash "$MANAGE_SCRIPT" start >/dev/null 2>&1
    run bash "$MANAGE_SCRIPT" status
    [ "$status" -eq 0 ]
    [[ "$output" == *"running"* ]]
}