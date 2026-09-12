import { Music, Play } from 'lucide-react'
import { TrackRecord } from '../services/db'
import { useAudio } from '../context/AudioContext'

interface Props {
  tracks: TrackRecord[]
  bookId: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function TrackList({ tracks, bookId }: Props) {
  const { currentTrack, currentBook, isPlaying, loadBook, play, pause } = useAudio()

  const handleTrackClick = (track: TrackRecord) => {
    if (currentBook?.id === bookId && currentTrack?.id === track.id) {
      isPlaying ? pause() : play()
    } else {
      loadBook(bookId, track.index, 0).then(() => play())
    }
  }

  return (
    <div className="space-y-1">
      {tracks.map((track) => {
        const isActive = currentBook?.id === bookId && currentTrack?.id === track.id
        return (
          <div
            key={track.id}
            onClick={() => handleTrackClick(track)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              isActive
                ? 'bg-indigo-600/20 border border-indigo-500/30'
                : 'hover:bg-slate-700'
            }`}
          >
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
              {isActive && isPlaying ? (
                <div className="flex gap-0.5 items-end h-5">
                  <div className="w-1 bg-indigo-400 animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                  <div className="w-1 bg-indigo-400 animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                  <div className="w-1 bg-indigo-400 animate-bounce" style={{ height: '40%', animationDelay: '300ms' }} />
                </div>
              ) : isActive ? (
                <Play size={16} className="text-indigo-400 fill-indigo-400" />
              ) : (
                <span className="text-slate-500 text-sm">{track.index + 1}</span>
              )}
            </div>
            <Music size={16} className={`flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${isActive ? 'text-indigo-300 font-medium' : 'text-slate-300'}`}>
                {track.name}
              </p>
              <p className="text-slate-500 text-xs">{formatSize(track.size)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
