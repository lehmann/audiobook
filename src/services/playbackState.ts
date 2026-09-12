const KEY = 'audiobook-state'

export interface PlaybackState {
  bookId: string | null
  trackIndex: number
  position: number
  volume: number
  speed: number
}

const defaults: PlaybackState = {
  bookId: null,
  trackIndex: 0,
  position: 0,
  volume: 1,
  speed: 1,
}

export function loadPlaybackState(): PlaybackState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return { ...defaults }
  }
}

export function savePlaybackState(state: Partial<PlaybackState>): void {
  try {
    const current = loadPlaybackState()
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...state }))
  } catch {
    // storage full or unavailable
  }
}

export function clearPlaybackState(): void {
  localStorage.removeItem(KEY)
}
