import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Play,
  Pause,
  Trash2,
  Globe,
  User,
  FileText,
  Loader2,
} from 'lucide-react'
import { BookRecord, TrackRecord, getBook, getTracksForBook, deleteBook } from '../services/db'
import { useAudio } from '../context/AudioContext'
import TrackList from '../components/TrackList'
import { clearPlaybackState } from '../services/playbackState'

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentBook, isPlaying, loadBook, play, pause } = useAudio()

  const [book, setBook] = useState<BookRecord | null>(null)
  const [tracks, setTracks] = useState<TrackRecord[]>([])
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([getBook(id), getTracksForBook(id)]).then(([b, t]) => {
      setBook(b ?? null)
      setTracks(t)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (book?.coverBlob) {
      const url = URL.createObjectURL(book.coverBlob)
      setCoverUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [book?.coverBlob])

  const isCurrentBook = currentBook?.id === id

  const handlePlayPause = () => {
    if (!id) return
    if (isCurrentBook) {
      isPlaying ? pause() : play()
    } else {
      loadBook(id, 0, 0).then(() => play())
    }
  }

  const handleDelete = async () => {
    if (!id || !confirm('Delete this book? This cannot be undone.')) return
    setDeleting(true)
    await deleteBook(id)
    if (isCurrentBook) clearPlaybackState()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 size={32} className="text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <BookOpen size={48} className="text-slate-600" />
        <p className="text-slate-400">Book not found</p>
        <button onClick={() => navigate('/')} className="text-indigo-400 hover:text-indigo-300 text-sm">
          Back to library
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-28">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-white font-bold text-lg truncate flex-1">{book.title}</h1>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-slate-500 hover:text-red-400 transition-colors"
          >
            {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Book info */}
        <div className="flex gap-5">
          <div className="w-28 h-28 flex-shrink-0 bg-slate-800 rounded-xl overflow-hidden shadow-lg">
            {coverUrl ? (
              <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={36} className="text-slate-600" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <h2 className="text-white font-bold text-xl leading-tight">{book.title}</h2>
            {book.author && (
              <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                <User size={13} />
                <span>{book.author}</span>
              </div>
            )}
            {book.language && (
              <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                <Globe size={13} />
                <span>{book.language}</span>
              </div>
            )}
            <button
              onClick={handlePlayPause}
              className="mt-2 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium"
            >
              {isCurrentBook && isPlaying ? (
                <>
                  <Pause size={15} className="fill-white" /> Pause
                </>
              ) : (
                <>
                  <Play size={15} className="fill-white ml-0.5" /> Play
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notes */}
        {book.notes && (
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-2">
              <FileText size={12} />
              Notes
            </div>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">{book.notes}</p>
          </div>
        )}

        {/* Tracks */}
        <div>
          <h3 className="text-slate-400 text-xs uppercase tracking-wide mb-3">
            {tracks.length} {tracks.length === 1 ? 'Track' : 'Tracks'}
          </h3>
          <TrackList tracks={tracks} bookId={book.id} />
        </div>
      </main>
    </div>
  )
}
