#!/usr/bin/env bash
# deploy/install.sh
# One-time installation on Ubuntu Server.
# Run as root: sudo bash deploy/install.sh
#
# What this does:
#   1. Installs Docker Engine + Compose plugin
#   2. Installs git
#   3. Clones the repo to /home/lehmann/github/audiobook
#   4. Builds and starts the Docker container (port 6001)
#   5. Installs a systemd timer for auto-update

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
REPO_URL="https://github.com/lehmann/audiobook.git"
APP_DIR="/home/lehmann/github/audiobook"
APP_USER="lehmann"
HTTP_PORT="6001"
BRANCH="main"
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[install]${NC} $*"; }
warn()  { echo -e "${YELLOW}[install]${NC} $*"; }
error() { echo -e "${RED}[install]${NC} $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || error "Must run as root (sudo bash deploy/install.sh)"

# ── 1. Docker Engine ──────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  info "Docker already installed: $(docker --version)"
else
  info "Installing Docker Engine..."
  curl -fsSL https://get.docker.com | sh
fi

# Compose v2 plugin (included in modern Docker installs; install explicitly if missing)
if ! docker compose version &>/dev/null; then
  info "Installing docker-compose-plugin..."
  apt-get install -y docker-compose-plugin
fi
info "$(docker compose version)"

# ── 2. Git ────────────────────────────────────────────────────────────────────
apt-get install -y git

# ── 3. Add app user to docker group ──────────────────────────────────────────
if id "$APP_USER" &>/dev/null; then
  usermod -aG docker "$APP_USER"
  info "Added $APP_USER to docker group (re-login required for shell access)"
fi

# ── 4. Clone or update repo ───────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  warn "Repo already exists at $APP_DIR — pulling latest"
  git -C "$APP_DIR" pull origin "$BRANCH"
else
  info "Cloning repo to $APP_DIR..."
  # Create parent dir if needed
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ── 5. Build and start container ──────────────────────────────────────────────
info "Building Docker image and starting container..."
cd "$APP_DIR"
docker compose up -d --build
info "Container running → http://localhost:$HTTP_PORT"

# ── 6. Systemd timer for auto-update ─────────────────────────────────────────
info "Installing systemd auto-update timer..."
cp "$APP_DIR/deploy/audiobook-update.service" /etc/systemd/system/
cp "$APP_DIR/deploy/audiobook-update.timer"   /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now audiobook-update.timer
info "Timer enabled"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo ""
echo -e "  App URL (internal): ${YELLOW}http://localhost:$HTTP_PORT${NC}"
echo -e "  App dir:            $APP_DIR"
echo -e "  Container:          docker compose ps"
echo -e "  Logs:               docker compose logs -f"
echo -e "  Auto-update:        every 10 min (systemd timer)"
echo ""
