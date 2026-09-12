#!/usr/bin/env bash
# deploy/update.sh
# Pull latest changes from GitHub and rebuild if anything changed.
# Called by the audiobook-update.service (systemd timer).
# Can also be run manually: sudo bash /opt/audiobook/deploy/update.sh

set -euo pipefail

APP_DIR="/opt/audiobook"
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

# ── 3. Re-install deps only if package.json or lockfile changed ───────────────
DEPS_CHANGED=$(git diff "$LOCAL" HEAD -- package.json package-lock.json | wc -l)
if [ "$DEPS_CHANGED" -gt 0 ]; then
  log "Dependencies changed — running npm ci..."
  npm ci
else
  log "Dependencies unchanged — skipping npm ci"
fi

# ── 4. Rebuild ────────────────────────────────────────────────────────────────
log "Building..."
npm run build

# nginx reads files from disk on each request; no reload needed.
log "Done — running $(git rev-parse --short HEAD)"
