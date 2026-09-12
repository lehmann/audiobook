import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, Music, Image, ArrowLeft, ChevronRight, Loader2 } from 'lucide-react'
import { saveBook, saveTrack } from '../services/db'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const ACCEPTED_TYPES = [
  'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/aac',
  'audio/flac', 'audio/x-m4a', 'audio/m4a', 'audio/mp3',
  'video/mp4', 'video/x-m4v',
]

function isAcceptedFile(file: File): boolean {
  return file.type.startsWith('audio/') || ACCEPTED_TYPES.includes(file.type)
}

export default function UploadPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [audioFiles, setAudioFiles] = useState<File[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    author: '',
    language: '',
    notes: '',
  })

  const handleAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(isAcceptedFile)
    if (files.length) setAudioFiles((prev) => [...prev, ...files])
  }, [])

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).filter(isAcceptedFile)
    setAudioFiles((prev) => [...prev, ...files])
    e.target.value = ''
  }

  const removeAudioFile = (idx: number) => {
    setAudioFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const moveFile = (from: number, to: number) => {
    setAudioFiles((prev) => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    const url = URL.createObjectURL(file)
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(url)
  }

  const removeCover = () => {
    setCoverFile(null)
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview)
      setCoverPreview(null)
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || audioFiles.length === 0) return
    setSaving(true)
    try {
      const bookId = generateId()
      await saveBook({
        id: bookId,
        title: form.title.trim(),
        author: form.author.trim(),
        language: form.language.trim(),
        notes: form.notes.trim(),
        coverBlob: coverFile ?? undefined,
        createdAt: Date.now(),
        trackCount: audioFiles.length,
      })

      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i]
        await saveTrack({
          id: generateId(),
          bookId,
          name: file.name.replace(/\.[^.]+$/, ''),
          index: i,
          blob: file,
          size: file.size,
          type: file.type || 'audio/mpeg',
        })
      }

      navigate('/')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-10">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => (step === 2 ? setStep(1) : navigate('/'))}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-white font-bold text-lg">Add Audiobook</h1>
          <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
            <span className={step === 1 ? 'text-indigo-400 font-medium' : ''}>Files</span>
            <ChevronRight size={12} />
            <span className={step === 2 ? 'text-indigo-400 font-medium' : ''}>Details</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {step === 1 ? (
          <>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleAudioDrop}
              onClick={() => audioInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-indigo-400 bg-indigo-900/20'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
              }`}
            >
              <Upload size={40} className="mx-auto mb-3 text-slate-500" />
              <p className="text-slate-300 font-medium mb-1">Drop audio files here</p>
              <p className="text-slate-500 text-sm">or click to browse · MP3, M4A, OGG, WAV, FLAC, MP4</p>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,video/mp4,video/x-m4v"
                multiple
                className="hidden"
                onChange={handleAudioChange}
              />
            </div>

            {/* File list */}
            {audioFiles.length > 0 && (
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-slate-300 text-sm font-medium">
                    {audioFiles.length} {audioFiles.length === 1 ? 'file' : 'files'} selected
                  </span>
                  <span className="text-slate-500 text-xs">Drag rows to reorder</span>
                </div>
                {audioFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 last:border-0">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (idx > 0) moveFile(idx, idx - 1) }}
                        className="text-slate-500 hover:text-slate-300 leading-none text-xs disabled:opacity-30"
                        disabled={idx === 0}
                      >
                        ▲
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (idx < audioFiles.length - 1) moveFile(idx, idx + 1) }}
                        className="text-slate-500 hover:text-slate-300 leading-none text-xs disabled:opacity-30"
                        disabled={idx === audioFiles.length - 1}
                      >
                        ▼
                      </button>
                    </div>
                    <span className="text-slate-500 text-xs w-5 text-center">{idx + 1}</span>
                    <Music size={14} className="text-slate-500 flex-shrink-0" />
                    <p className="text-slate-300 text-sm truncate flex-1">{file.name}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeAudioFile(idx) }}
                      className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={audioFiles.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Continue to Details
            </button>
          </>
        ) : (
          <>
            {/* Cover image */}
            <div className="flex gap-4 items-start">
              <div
                onClick={() => coverInputRef.current?.click()}
                className="w-28 h-28 flex-shrink-0 bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 hover:border-slate-500 cursor-pointer overflow-hidden flex items-center justify-center transition-colors relative"
              >
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCover() }}
                      className="absolute top-1 right-1 bg-slate-900/80 rounded-full p-0.5"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <Image size={24} className="mx-auto text-slate-500 mb-1" />
                    <p className="text-slate-500 text-xs">Cover</p>
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wide">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Book title"
                    className="w-full bg-slate-800 text-white rounded-lg px-3 py-2.5 text-sm border border-slate-700 focus:border-indigo-500 outline-none placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wide">Author</label>
                  <input
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    placeholder="Author name"
                    className="w-full bg-slate-800 text-white rounded-lg px-3 py-2.5 text-sm border border-slate-700 focus:border-indigo-500 outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wide">Language</label>
              <input
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                placeholder="e.g. English, Português"
                className="w-full bg-slate-800 text-white rounded-lg px-3 py-2.5 text-sm border border-slate-700 focus:border-indigo-500 outline-none placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wide">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any notes about this book..."
                rows={3}
                className="w-full bg-slate-800 text-white rounded-lg px-3 py-2.5 text-sm border border-slate-700 focus:border-indigo-500 outline-none resize-none placeholder:text-slate-600"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.title.trim() || saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save to Library'
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
