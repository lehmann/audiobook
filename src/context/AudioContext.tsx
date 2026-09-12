import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { BookRecord, TrackRecord, getBook, getTracksForBook } from '../services/db'
import { loadPlaybackState, savePlaybackState } from '../services/playbackState'

interface AudioContextValue {
  currentBook: BookRecord | null
  currentTrack: TrackRecord | null
  tracks: TrackRecord[]
  isPlaying: boolean
  position: number
  duration: number
  volume: number
  speed: number
  loadBook: (bookId: string, trackIndex?: number, position?: number) => Promise<void>
  play: () => void
  pause: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  setSpeed: (s: number) => void
  nextTrack: () => void
  prevTrack: () => void
  skipForward: () => void
  skipBackward: () => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const lastSaveRef = useRef<number>(0)

  const [currentBook, setCurrentBook] = useState<BookRecord | null>(null)
  const [tracks, setTracks] = useState<TrackRecord[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [speed, setSpeedState] = useState(1)

  const currentTrack = tracks[currentTrackIndex] ?? null

  // Create single persistent audio element
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const savedState = loadPlaybackState()
    setVolumeState(savedState.volume)
    setSpeedState(savedState.speed)
    audio.volume = savedState.volume
    audio.playbackRate = savedState.speed

    const onTimeUpdate = () => {
      setPosition(audio.currentTime)
      const now = Date.now()
      if (now - lastSaveRef.current > 5000) {
        lastSaveRef.current = now
        savePlaybackState({ position: audio.currentTime })
      }
    }
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      // auto-advance handled via effect watching currentTrackIndex
      setCurrentTrackIndex((prev) => {
        const nextIdx = prev + 1
        return nextIdx // will be resolved against tracks in a separate effect
      })
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  // Handle auto-advance: when currentTrackIndex changes and we have tracks
  const tracksRef = useRef<TrackRecord[]>([])
  tracksRef.current = tracks

  useEffect(() => {
    if (!tracksRef.current.length) return
    const audio = audioRef.current!
    const track = tracksRef.current[currentTrackIndex]
    if (!track) return

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    const url = URL.createObjectURL(track.blob)
    blobUrlRef.current = url
    audio.src = url
    audio.playbackRate = speed

    savePlaybackState({ trackIndex: currentTrackIndex, position: 0 })
    setPosition(0)
    setDuration(0)

    updateMediaSession(tracksRef.current[currentTrackIndex], currentBook)
  }, [currentTrackIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateMediaSession(track: TrackRecord | null, book: BookRecord | null) {
    if (!('mediaSession' in navigator) || !track) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: book?.author ?? '',
      album: book?.title ?? '',
    })
  }

  const loadBook = useCallback(
    async (bookId: string, trackIndex = 0, startPosition = 0) => {
      const audio = audioRef.current!
      const [book, bookTracks] = await Promise.all([
        getBook(bookId),
        getTracksForBook(bookId),
      ])
      if (!book || !bookTracks.length) return

      setCurrentBook(book)
      setTracks(bookTracks)

      const idx = Math.min(trackIndex, bookTracks.length - 1)
      const track = bookTracks[idx]

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      const url = URL.createObjectURL(track.blob)
      blobUrlRef.current = url
      audio.src = url
      audio.playbackRate = speed
      audio.volume = volume

      setCurrentTrackIndex(idx)
      setPosition(startPosition)
      setDuration(0)

      await new Promise<void>((resolve) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay)
          resolve()
        }
        audio.addEventListener('canplay', onCanPlay)
        audio.load()
      })

      if (startPosition > 0) {
        audio.currentTime = startPosition
      }

      savePlaybackState({ bookId, trackIndex: idx, position: startPosition })
      updateMediaSession(track, book)
      registerMediaSessionHandlers()
    },
    [speed, volume],
  )

  function registerMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => play())
    navigator.mediaSession.setActionHandler('pause', () => pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack())
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack())
    navigator.mediaSession.setActionHandler('seekbackward', (details) =>
      skipBy(-(details.seekOffset ?? 30)),
    )
    navigator.mediaSession.setActionHandler('seekforward', (details) =>
      skipBy(details.seekOffset ?? 30),
    )
  }

  const play = useCallback(() => {
    audioRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current!
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0))
    savePlaybackState({ position: audio.currentTime })
  }, [])

  function skipBy(delta: number) {
    const audio = audioRef.current!
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0))
  }

  const skipForward = useCallback(() => skipBy(30), [])
  const skipBackward = useCallback(() => skipBy(-30), [])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolumeState(clamped)
    if (audioRef.current) audioRef.current.volume = clamped
    savePlaybackState({ volume: clamped })
  }, [])

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s)
    if (audioRef.current) audioRef.current.playbackRate = s
    savePlaybackState({ speed: s })
  }, [])

  const nextTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => {
      const next = prev + 1
      if (next >= tracksRef.current.length) return prev
      return next
    })
  }, [])

  const prevTrack = useCallback(() => {
    const audio = audioRef.current!
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    setCurrentTrackIndex((prev) => Math.max(0, prev - 1))
  }, [])

  // Restore state on mount
  useEffect(() => {
    const state = loadPlaybackState()
    if (state.bookId) {
      loadBook(state.bookId, state.trackIndex, state.position)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AudioCtx.Provider
      value={{
        currentBook,
        currentTrack,
        tracks,
        isPlaying,
        position,
        duration,
        volume,
        speed,
        loadBook,
        play,
        pause,
        seek,
        setVolume,
        setSpeed,
        nextTrack,
        prevTrack,
        skipForward,
        skipBackward,
      }}
    >
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}
