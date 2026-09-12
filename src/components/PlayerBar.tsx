import { useNavigate } from 'react-router-dom'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronUp,
} from 'lucide-react'
import { useAudio } from '../context/AudioContext'

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export default function PlayerBar() {
  const navigate = useNavigate()
  const {
    currentBook,
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    speed,
    play,
    pause,
    seek,
    setVolume,
    setSpeed,
    nextTrack,
    prevTrack,
    skipForward,
    skipBackward,
    tracks,
  } = useAudio()

  if (!currentBook || !currentTrack) return null

  const progress = duration > 0 ? (position / duration) * 100 : 0
  const currentSpeedIdx = SPEEDS.indexOf(speed)

  const cycleSpeed = () => {
    const nextIdx = (currentSpeedIdx + 1) % SPEEDS.length
    setSpeed(SPEEDS[nextIdx])
  }

  const toggleMute = () => {
    setVolume(volume > 0 ? 0 : 1)
  }

  const currentTrackIdx = tracks.findIndex((t) => t.id === currentTrack.id)
  const hasNext = currentTrackIdx < tracks.length - 1
  const hasPrev = currentTrackIdx > 0 || (currentBook !== null)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-2xl z-50">
      {/* Progress bar */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={position}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full bg-slate-700 cursor-pointer"
          style={{
            background: `linear-gradient(to right, #6366f1 ${progress}%, #475569 ${progress}%)`,
          }}
        />
      </div>

      <div className="px-4 py-2 flex items-center gap-3">
        {/* Track info */}
        <div
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate(`/book/${currentBook.id}`)}
        >
          <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{currentTrack.name}</p>
            <p className="text-slate-400 text-xs truncate">{currentBook.title}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={skipBackward}
            className="p-2 text-slate-300 hover:text-white transition-colors"
            title="Back 30s"
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={hasPrev ? prevTrack : undefined}
            className={`p-1 transition-colors ${hasPrev ? 'text-slate-300 hover:text-white' : 'text-slate-600'}`}
            disabled={!hasPrev}
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={isPlaying ? pause : play}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center transition-colors mx-1"
          >
            {isPlaying ? (
              <Pause size={20} className="text-white fill-white" />
            ) : (
              <Play size={20} className="text-white fill-white ml-0.5" />
            )}
          </button>

          <button
            onClick={hasNext ? nextTrack : undefined}
            className={`p-1 transition-colors ${hasNext ? 'text-slate-300 hover:text-white' : 'text-slate-600'}`}
            disabled={!hasNext}
          >
            <SkipForward size={14} />
          </button>

          <button
            onClick={skipForward}
            className="p-2 text-slate-300 hover:text-white transition-colors"
            title="Forward 30s"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Time */}
        <div className="text-slate-400 text-xs hidden sm:block whitespace-nowrap">
          {formatTime(position)} / {formatTime(duration)}
        </div>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="text-slate-400 hover:text-white text-xs font-mono w-10 text-center hidden sm:block"
        >
          {speed}x
        </button>

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-1">
          <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors">
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-20 bg-slate-600"
            style={{
              background: `linear-gradient(to right, #6366f1 ${volume * 100}%, #475569 ${volume * 100}%)`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
