#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./autoupdater.sh
#   ./autoupdater.sh /path/to/autoupdater.conf
#
# WARNING:
#   FORCE_UPDATE=true discards all local changes.

CONFIG_FILE="${1:-$(dirname "$0")/autoupdater.conf}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Config file not found: $CONFIG_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

REPO_DIR="${REPO_DIR:-$(pwd)}"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
FORCE_UPDATE="${FORCE_UPDATE:-true}"
PULL_IMAGES="${PULL_IMAGES:-true}"
BUILD_IMAGES="${BUILD_IMAGES:-true}"
REMOVE_ORPHANS="${REMOVE_ORPHANS:-true}"
RUN_HEALTHCHECKS="${RUN_HEALTHCHECKS:-true}"
HEALTH_URLS="${HEALTH_URLS:-http://localhost/ http://localhost:8000/health http://localhost:8001/health http://localhost:8002/health http://localhost:8003/health http://localhost:8004/health}"

cd "$REPO_DIR"

echo "[1/6] Fetch latest changes..."
git fetch "$REMOTE" --prune

if [[ "$FORCE_UPDATE" == "true" ]]; then
  echo "[2/6] FORCE_UPDATE=true -> hard reset to $REMOTE/$BRANCH"
  git reset --hard "$REMOTE/$BRANCH"
  git clean -fd
else
  echo "[2/6] Safe mode -> pull with fast-forward only"
  git checkout "$BRANCH"
  git pull --ff-only "$REMOTE" "$BRANCH"
fi

COMPOSE_CMD=(docker compose -f "$COMPOSE_FILE")

if [[ "$PULL_IMAGES" == "true" ]]; then
  echo "[3/6] Pull images..."
  "${COMPOSE_CMD[@]}" pull || true
else
  echo "[3/6] Skip image pull."
fi

if [[ "$BUILD_IMAGES" == "true" ]]; then
  echo "[4/6] Build services..."
  "${COMPOSE_CMD[@]}" build --pull
else
  echo "[4/6] Skip build."
fi

UP_ARGS=(-d)
if [[ "$BUILD_IMAGES" == "true" ]]; then
  UP_ARGS+=(--build)
fi
if [[ "$REMOVE_ORPHANS" == "true" ]]; then
  UP_ARGS+=(--remove-orphans)
fi

echo "[5/6] Start services..."
"${COMPOSE_CMD[@]}" up "${UP_ARGS[@]}"

if [[ "$RUN_HEALTHCHECKS" != "true" ]]; then
  echo "[6/6] Health checks disabled."
  echo "Done."
  exit 0
fi

echo "[6/6] Health checks..."
FAILED=0
for url in $HEALTH_URLS; do
  if curl -fsS --max-time 5 "$url" >/dev/null; then
    echo "  OK   $url"
  else
    echo "  FAIL $url"
    FAILED=1
  fi
done

if [[ $FAILED -eq 1 ]]; then
  echo "Done with failed health checks."
  exit 2
fi

echo "Done. All checks passed."
