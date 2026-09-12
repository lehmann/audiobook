import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Library } from 'lucide-react'
import { getAllBooks, BookRecord } from '../services/db'
import BookCard from '../components/BookCard'

export default function LibraryPage() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<BookRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllBooks().then((b) => {
      setBooks(b.reverse())
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 pb-28">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library size={22} className="text-indigo-400" />
            <h1 className="text-white font-bold text-lg">My Library</h1>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-2 rounded-lg transition-colors font-medium"
          >
            <Plus size={16} />
            Add Book
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-xl animate-pulse">
                <div className="aspect-square bg-slate-700 rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-700 rounded w-3/4" />
                  <div className="h-2 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen size={64} className="text-slate-700 mb-4" />
            <h2 className="text-slate-400 text-xl font-semibold mb-2">No books yet</h2>
            <p className="text-slate-600 text-sm mb-6">Upload your first audiobook to get started</p>
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-lg transition-colors font-medium"
            >
              <Plus size={18} />
              Add your first book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
