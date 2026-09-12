#!/usr/bin/env bash
# deploy/install.sh
# One-time installation on Ubuntu Server.
# Run as root: sudo bash deploy/install.sh
#
# What this does:
#   1. Installs Node.js 20, nginx, git
#   2. Clones the repo to /home/lehmann/github/audiobook
#   3. Builds the app
#   4. Configures nginx to serve on port 6001
#   5. Installs a systemd timer for auto-update

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
REPO_URL="https://github.com/lehmann/audiobook.git"
APP_DIR="/home/lehmann/github/audiobook"
HTTP_PORT="6001"
BRANCH="main"
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[install]${NC} $*"; }
warn()    { echo -e "${YELLOW}[install]${NC} $*"; }
error()   { echo -e "${RED}[install]${NC} $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || error "Must run as root (sudo bash deploy/install.sh)"

# ── 1. Node.js 20 ────────────────────────────────────────────────────────────
if command -v node &>/dev/null && node -e "process.exit(parseInt(process.version.slice(1)) >= 20 ? 0 : 1)" 2>/dev/null; then
  info "Node.js $(node -v) already installed"
else
  info "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
info "node $(node -v) | npm $(npm -v)"

# ── 2. System packages ────────────────────────────────────────────────────────
info "Installing nginx and git..."
apt-get install -y nginx git

# ── 3. Clone or update repo ───────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  warn "Repo already exists at $APP_DIR — pulling latest"
  git -C "$APP_DIR" pull origin "$BRANCH"
else
  info "Cloning repo to $APP_DIR..."
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

# ── 4. Build ──────────────────────────────────────────────────────────────────
info "Installing dependencies and building..."
cd "$APP_DIR"
npm ci
npm run build
info "Build complete → $APP_DIR/dist"

# ── 5. Nginx site config ──────────────────────────────────────────────────────
info "Configuring nginx on port $HTTP_PORT..."
cat > /etc/nginx/sites-available/audiobook << NGINX
server {
    listen $HTTP_PORT;
    server_name _;

    root $APP_DIR/dist;
    index index.html;

    # SPA: all routes fall back to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Immutable cache for hashed assets (Vite output in /assets/)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json
               image/svg+xml image/x-icon application/wasm;
    gzip_min_length 1024;
}
NGINX

ln -sf /etc/nginx/sites-available/audiobook /etc/nginx/sites-enabled/audiobook

nginx -t
systemctl enable nginx
systemctl reload nginx
info "nginx reloaded"

# ── 6. Systemd timer for auto-update ─────────────────────────────────────────
info "Installing systemd auto-update timer..."
cp "$APP_DIR/deploy/audiobook-update.service" /etc/systemd/system/
cp "$APP_DIR/deploy/audiobook-update.timer"   /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now audiobook-update.timer
info "Timer enabled: $(systemctl status audiobook-update.timer --no-pager -l | grep Active)"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo ""
echo -e "  App URL (internal): ${YELLOW}http://localhost:$HTTP_PORT${NC}"
echo -e "  App dir:            $APP_DIR"
echo -e "  Nginx config:       /etc/nginx/sites-available/audiobook"
echo -e "  Auto-update:        every 10 minutes via systemd timer"
echo ""
echo -e "  ${YELLOW}Next: configure Cloudflare Tunnel${NC}"
echo -e "  1. Install cloudflared:  https://pkg.cloudflare.com/index.html"
echo -e "  2. Authenticate:         cloudflared tunnel login"
echo -e "  3. Create tunnel:        cloudflared tunnel create audiobook"
echo -e "  4. Route DNS:            cloudflared tunnel route dns audiobook <your-domain>"
echo -e "  5. Configure tunnel:     see deploy/cloudflared.yml"
echo -e "  6. Install as service:   cloudflared service install"
echo ""
