import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { BookRecord } from '../services/db'
import { loadPlaybackState } from '../services/playbackState'

interface Props {
  book: BookRecord
}

export default function BookCard({ book }: Props) {
  const navigate = useNavigate()
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [inProgress, setInProgress] = useState(false)

  useEffect(() => {
    if (book.coverBlob) {
      const url = URL.createObjectURL(book.coverBlob)
      setCoverUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [book.coverBlob])

  useEffect(() => {
    const state = loadPlaybackState()
    if (state.bookId === book.id && state.position > 5) {
      setInProgress(true)
    }
  }, [book.id])

  return (
    <div
      className="bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:bg-slate-700 transition-colors shadow-lg group"
      onClick={() => navigate(`/book/${book.id}`)}
    >
      <div className="aspect-square bg-slate-700 relative overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={48} className="text-slate-500" />
          </div>
        )}
        {inProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-600">
            <div className="h-full bg-indigo-500 w-1/3" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-white font-semibold text-sm truncate">{book.title}</h3>
        {book.author && (
          <p className="text-slate-400 text-xs truncate mt-0.5">{book.author}</p>
        )}
        <p className="text-slate-500 text-xs mt-1">
          {book.trackCount} {book.trackCount === 1 ? 'track' : 'tracks'}
          {inProgress && (
            <span className="ml-2 text-indigo-400 font-medium">In Progress</span>
          )}
        </p>
      </div>
    </div>
  )
}
