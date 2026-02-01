#!/usr/bin/env bash
set -euo pipefail

: "${TRIANGULATOR_HOME_DIR:=$HOME/.triangulator-local}"
: "${TRIANGULATOR_BROWSER_PROFILE_DIR:=$TRIANGULATOR_HOME_DIR/browser-profile}"

export TRIANGULATOR_HOME_DIR
export TRIANGULATOR_BROWSER_PROFILE_DIR

exec triangulator --engine browser --browser-manual-login --browser-keep-browser "$@"
