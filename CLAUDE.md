# CLAUDE.md

## Commits
Never create git commits automatically. The user commits manually.

## Dev server
```bash
npm run dev    # http://localhost:5173
npm run build  # verify compilation before reporting a change as done
```

## Production deployment
- **Runtime:** Docker container (isolated — no Node or nginx on the host)
- **Image:** multi-stage — `node:20-alpine` builds, `nginx:alpine` serves
- **Port:** host `6001` → container `80`
- **Public access:** Cloudflare Tunnel → `localhost:6001`
- **App dir:** `/home/lehmann/github/audiobook`
- **Install:** `sudo bash deploy/install.sh` (one-time)
- **Auto-update:** systemd timer `audiobook-update.timer` — every 10 min, runs `docker compose up -d --build`

### Deploy files
| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build: node:20-alpine → nginx:alpine |
| `docker-compose.yml` | Service definition; maps host 6001 → container 80 |
| `.dockerignore` | Excludes node_modules, dist, .git from build context |
| `deploy/nginx-container.conf` | nginx config inside the container (port 80, SPA routing) |
| `deploy/install.sh` | One-time install: Docker, git, clone, `docker compose up`, systemd timer |
| `deploy/update.sh` | `git pull` + `docker compose up -d --build` if commits found |
| `deploy/audiobook-update.service` | Systemd oneshot service que roda `update.sh` como `User=lehmann` (evita erro de ownership do Git) |
| `deploy/audiobook-update.timer` | Systemd timer — fires 2 min after boot, then every 10 min |
| `deploy/cloudflared.yml` | Cloudflare Tunnel config template |

### Useful server commands
```bash
# Container status and logs
docker compose ps
docker compose logs -f

# Force manual update (rode como lehmann, não root)
sudo -u lehmann bash /home/lehmann/github/audiobook/deploy/update.sh

# Check update timer and logs
systemctl status audiobook-update.timer
journalctl -u audiobook-update -n 50

# Reaplicar o service após mudanças no arquivo
sudo cp /home/lehmann/github/audiobook/deploy/audiobook-update.service /etc/systemd/system/
sudo systemctl daemon-reload
```

## Architecture — key invariants

### Single audio element
`AudioContext.tsx` creates **one** `Audio()` instance on mount and holds it in `audioRef`. Never create a second one, never unmount it, never recreate it. Changing tracks means: revoke the old blob URL → create a new one → set `audio.src` → call `audio.play()`. Violating this breaks background playback on iOS.

### Storage split
- **IndexedDB** (`src/services/db.ts`, via `idb`) — audio `Blob`s and book metadata. All reads/writes are async.
- **localStorage** (`src/services/playbackState.ts`) — playback state only (`bookId`, `trackIndex`, `position`, `volume`, `speed`). Keep this tiny.

### Media Session API
Handlers are registered in `registerMediaSessionHandlers()` inside `AudioContext.tsx` every time `loadBook()` is called. Metadata (`MediaMetadata`) is updated in `updateMediaSession()` on track change. This is what drives lock-screen controls — don't remove it.

### Blob URL lifecycle
Every time a track is loaded a blob URL is created with `URL.createObjectURL`. The previous URL must be revoked first (`URL.revokeObjectURL(blobUrlRef.current)`). The ref `blobUrlRef` tracks the current URL. On unmount, the cleanup in the first `useEffect` revokes the last URL.

## File map

| File | Responsibility |
|---|---|
| `src/services/db.ts` | IndexedDB schema, open/upgrade, CRUD for `books` and `tracks` |
| `src/services/playbackState.ts` | Load/save `audiobook-state` from localStorage |
| `src/context/AudioContext.tsx` | Audio element lifecycle, state, controls, Media Session, auto-restore on mount |
| `src/components/BookCard.tsx` | Library card — cover image or placeholder, title, author, "In Progress" badge |
| `src/components/PlayerBar.tsx` | Fixed bottom bar — seek range, play/pause, skip ±30s, prev/next track, speed cycle, volume |
| `src/components/TrackList.tsx` | Track list for BookDetailPage, animated playing indicator |
| `src/pages/LibraryPage.tsx` | Grid of BookCards, loading skeleton, empty state, "Add Book" button |
| `src/pages/UploadPage.tsx` | Two-step wizard: (1) file drop/reorder, (2) metadata form + cover image |
| `src/pages/BookDetailPage.tsx` | Book detail: cover, metadata, TrackList, delete with confirmation |
| `src/App.tsx` | BrowserRouter, AudioProvider wrapper, three routes, PlayerBar rendered outside routes |

## IndexedDB schema (v1)

```
audiobook-db
  books     { id, title, author, language, notes, coverBlob?, createdAt, trackCount }
            index: by-created (createdAt)
  tracks    { id, bookId, name, index, blob, size, type }
            index: by-book (bookId)
```

`getTracksForBook(bookId)` sorts results by `index` — order is determined at upload time.

## Playback state shape

```ts
// localStorage key: "audiobook-state"
{
  bookId: string | null,
  trackIndex: number,   // 0-based
  position: number,     // seconds
  volume: number,       // 0–1
  speed: number         // e.g. 1, 1.25, 1.5
}
```

Position is saved to localStorage on `timeupdate` at most once every 5 seconds (throttled via `lastSaveRef`).

## Styling
Tailwind CSS 3, dark mode applied via `class` strategy. `<html>` gets `class="dark"` in `main.tsx`. Base colours: background `slate-900`, cards `slate-800`, borders `slate-700`, accent `indigo-500/600`. `PlayerBar` is `fixed bottom-0`; pages use `pb-24` to avoid overlap.

Range inputs (`<input type="range">`) are styled inline with a `linear-gradient` background to show fill progress — Tailwind alone cannot do this.

## Node version
Node 18.17.1 is installed. `vite-plugin-pwa` / `workbox-build` require Node ≥19.9 and are not active. Do not add them unless the Node version is upgraded first.
