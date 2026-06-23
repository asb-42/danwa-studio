#!/usr/bin/env bats
#
# tests/scripts/a11y_warnings.bats — Regression: vite-plugin-svelte
# should emit zero a11y / state / unused-css warnings during a
# production build. CI uses this to catch regressions.
#
# Why this test exists: vite-plugin-svelte 5.x promotes many
# a11y_*/state_referenced_locally/css_unused_selector warnings
# to build errors by default. They show up in CI logs and block
# builds. This test pins the count to 0 so any future regression
# is caught.
#
# Pre-fix baseline (2026-06-23):
#   a11y_interactive_supports_focus              8
#   a11y_click_events_have_key_events            8
#   a11y_no_noninteractive_element_interactions  8
#   a11y_label_has_associated_control            1
#   css_unused_selector                          7
#   state_referenced_locally                     5
#   TOTAL                                       37
#
# Strategy: run `npx vite build` in the studio repo, capture
# stderr, count unique rule-code hits via Python, assert 0.

setup() {
    REPO_ROOT="$(cd "${BATS_TEST_DIRNAME}/../.." && pwd)"
    export REPO_ROOT
    # Pre-condition: node_modules must be present
    [ -d "$REPO_ROOT/node_modules" ] || skip "node_modules not installed — run 'npm install' first"
    [ -f "$REPO_ROOT/vite.config.js" ] || skip "vite.config.js not present"
}

teardown() {
    :
}

@test "vite build: emits 0 svelte.dev/e/* warnings" {
    # Run the build; capture stderr to a temp file
    local log
    log="$(mktemp)"
    cd "$REPO_ROOT"
    npx vite build >/dev/null 2>"$log"
    # Build must succeed (exit 0)
    # Count warning-rule references in stderr
    local count
    count="$(python3 -c "
import re, sys
text = open('$log').read()
rules = re.findall(r'svelte\.dev/e/(\\w+)', text)
# Filter out non-warning URLs (e.g. references in doc links)
# Real warnings appear as standalone URL lines after the
# '[vite-plugin-svelte]' prefix.
print(len(rules))
")"
    rm -f "$log"
    # After all a11y fixes landed, expect 0. The pre-fix count was
    # 37 — see commit 3ba9038 for the baseline.
    [ "$count" -eq 0 ] || {
        echo "Expected 0 warnings, got $count"
        false
    }
}

@test "vite build: rule codes are not the pre-fix set" {
    # Asserts that the specific a11y rules from the baseline are
    # no longer present (catches partial fixes).
    local log
    log="$(mktemp)"
    cd "$REPO_ROOT"
    npx vite build >/dev/null 2>"$log"
    local offenders
    offenders="$(python3 -c "
import re
text = open('$log').read()
rules = set(re.findall(r'svelte\.dev/e/(\\w+)', text))
pre_fix = {
    'a11y_interactive_supports_focus',
    'a11y_click_events_have_key_events',
    'a11y_no_noninteractive_element_interactions',
    'a11y_label_has_associated_control',
    'css_unused_selector',
    'state_referenced_locally',
}
hits = rules & pre_fix
print(','.join(sorted(hits)))
")"
    rm -f "$log"
    [ -z "$offenders" ] || {
        echo "Pre-fix a11y rules still present: $offenders"
        false
    }
}
