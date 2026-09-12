#!/usr/bin/env bash
# deploy/update.sh
# Pull latest changes from GitHub and rebuild the Docker image if anything changed.
# Called by the audiobook-update.service (systemd timer).
# Can also be run manually: sudo bash /home/lehmann/github/audiobook/deploy/update.sh

set -euo pipefail

APP_DIR="/home/lehmann/github/audiobook"
BRANCH="main"
LOG_TAG="audiobook-update"

log()  { echo "[$LOG_TAG] $*"; }
fail() { echo "[$LOG_TAG] ERROR: $*" >&2; exit 1; }

[ -d "$APP_DIR/.git" ] || fail "$APP_DIR is not a git repository"
cd "$APP_DIR"

# ── 1. Fetch remote ───────────────────────────────────────────────────────────
git fetch origin "$BRANCH" --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  log "Already up to date ($(git rev-parse --short HEAD))"
  exit 0
fi

log "Update: $(git rev-parse --short HEAD) → $(git rev-parse --short "$REMOTE")"

# ── 2. Pull ───────────────────────────────────────────────────────────────────
git pull origin "$BRANCH" --ff-only

# ── 3. Rebuild image and restart container ────────────────────────────────────
# --build forces image rebuild; --no-deps skips pulling unrelated services.
# Docker layer cache means only changed layers are rebuilt (fast when only
# src/ changed; slower when package.json changed).
docker compose up -d --build

log "Done — running $(git rev-parse --short HEAD)"
