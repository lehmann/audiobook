# Audiobook Player

A client-side progressive web app for listening to audiobooks. All audio files and metadata are stored locally in the browser — no server, no account required.

## Features

- **Local storage** — audio blobs stored in IndexedDB; no upload to any server
- **Multi-file books** — a single book can span multiple audio files (parts/chapters)
- **Full player controls** — play/pause, seek, ±30s skip, next/prev track, speed (0.5×–2×), volume
- **Resume where you left off** — playback position, track, volume and speed are persisted per book
- **Background audio** — keeps playing when the screen locks; lock-screen controls via Media Session API
- **Installable** — add to home screen on iOS/Android as a standalone app (PWA manifest)
- **Dark UI** — designed for comfortable use in low-light conditions

## Getting started

```bash
npm install
npm run dev      # development server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build locally
```

> **Node requirement:** Node 18.17+ is sufficient for development. The `vite-plugin-pwa` service worker requires Node ≥19.9 — see [PWA notes](#pwa--background-audio) below.

## How to use

1. Open the app and tap **+ Add Book**
2. **Step 1 — Files:** drop or select one or more audio files (MP3, M4A, OGG, WAV, FLAC). Reorder them with the ▲▼ buttons if needed.
3. **Step 2 — Details:** enter the title (required), author, language, notes, and an optional cover image.
4. Tap **Save to Library** — the book appears in your library immediately.
5. Tap a book card to open it, then press play. The player bar appears at the bottom of every page.
6. Close the browser tab or lock your screen — audio continues playing and lock-screen controls appear.

## Project structure

```
src/
  services/
    db.ts               IndexedDB CRUD — books and tracks stores (via idb)
    playbackState.ts    Persist/restore playback state to localStorage
  context/
    AudioContext.tsx    Global audio state; single persistent <audio> element;
                        Media Session API registration
  components/
    BookCard.tsx        Library grid card
    PlayerBar.tsx       Fixed bottom player bar
    TrackList.tsx       Clickable track list with playing indicator
  pages/
    LibraryPage.tsx     Book grid with loading skeleton and empty state
    UploadPage.tsx      Two-step upload wizard (files → metadata)
    BookDetailPage.tsx  Book detail view with cover, metadata, tracks, delete
  App.tsx               Router and AudioProvider wrapper
public/
  manifest.json         PWA manifest (name, icons, theme colour)
```

## Storage model

| What | Where | Why |
|---|---|---|
| Audio blobs | IndexedDB (`audiobook-db`) | No size limit; binary-safe |
| Book metadata | IndexedDB (`books` store) | Co-located with tracks |
| Playback state | `localStorage` (`audiobook-state`) | Tiny JSON; survives page reload |

## PWA & background audio

Background audio playback works via the HTML5 `<audio>` element and the **Media Session API** — this does not require a service worker. The app ships a `public/manifest.json` enabling "Add to Home Screen" on iOS and Android.

A full service worker (offline cache, background sync) requires `vite-plugin-pwa`, which needs Node ≥19.9. To enable it, upgrade Node and uncomment the plugin in `vite.config.ts`:

```bash
nvm install 20   # or nvm install lts
npm install -D vite-plugin-pwa workbox-window
```

## Self-hosting on Ubuntu Server

Runs as an isolated Docker container — no Node.js or nginx installed on the host. Safe to deploy alongside other services with different dependency versions.

### Architecture

```
Internet → Cloudflare Tunnel → host :6001 → Docker container → nginx :80 → dist/
                                                   ↑
                                         auto-update every 10 min
                                         (git pull + docker compose up --build)
```

The Docker image uses a multi-stage build: `node:20-alpine` compiles the Vite app, then `nginx:alpine` serves the static files (~25 MB final image).

### Installation (one-time, run as root)

```bash
# On the Ubuntu server
git clone https://github.com/lehmann/audiobook.git /home/lehmann/github/audiobook
sudo bash /home/lehmann/github/audiobook/deploy/install.sh
```

The script installs Docker Engine + Compose plugin, clones the repo, builds the image, starts the container on port 6001, and sets up a systemd timer for auto-updates.

### Auto-update

A systemd timer (`audiobook-update.timer`) runs every 10 minutes. It checks for new commits on `main`; if found, it pulls and runs `docker compose up -d --build`. Docker layer caching makes rebuilds fast when only source files changed.

The service runs as `User=lehmann` (not root) to avoid Git's ownership check (`detected dubious ownership`), which rejects operations on directories owned by a different user.

```bash
# Check container status
docker compose -f /home/lehmann/github/audiobook/docker-compose.yml ps

# Watch container logs
docker compose -f /home/lehmann/github/audiobook/docker-compose.yml logs -f

# Watch update logs
journalctl -u audiobook-update -f

# Trigger a manual update
sudo -u lehmann bash /home/lehmann/github/audiobook/deploy/update.sh
```

### Cloudflare Tunnel

The tunnel forwards HTTPS traffic from your domain to `localhost:6001`. See `deploy/cloudflared.yml` for the full setup steps.

```bash
# Quick summary (after cloudflared is installed and authenticated)
cloudflared tunnel create audiobook
cloudflared tunnel route dns audiobook <your-domain>
sudo cp /home/lehmann/github/audiobook/deploy/cloudflared.yml /etc/cloudflared/config.yml
# Edit /etc/cloudflared/config.yml — fill in tunnel ID, credentials path, domain
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

## Tech stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 (dark mode) |
| Storage | `idb` wrapper for IndexedDB |
| Routing | React Router 6 |
| Icons | Lucide React |
