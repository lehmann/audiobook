import { openDB, DBSchema, IDBPDatabase } from 'idb'

export interface BookRecord {
  id: string
  title: string
  author: string
  language: string
  notes: string
  coverBlob?: Blob
  createdAt: number
  trackCount: number
}

export interface TrackRecord {
  id: string
  bookId: string
  name: string
  index: number
  blob: Blob
  size: number
  type: string
}

interface AudiobookDB extends DBSchema {
  books: {
    key: string
    value: BookRecord
    indexes: { 'by-created': number }
  }
  tracks: {
    key: string
    value: TrackRecord
    indexes: { 'by-book': string }
  }
}

let dbPromise: Promise<IDBPDatabase<AudiobookDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AudiobookDB>('audiobook-db', 1, {
      upgrade(db) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' })
        bookStore.createIndex('by-created', 'createdAt')

        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' })
        trackStore.createIndex('by-book', 'bookId')
      },
    })
  }
  return dbPromise
}

export async function saveBook(book: BookRecord): Promise<void> {
  const db = await getDB()
  await db.put('books', book)
}

export async function getBook(id: string): Promise<BookRecord | undefined> {
  const db = await getDB()
  return db.get('books', id)
}

export async function getAllBooks(): Promise<BookRecord[]> {
  const db = await getDB()
  return db.getAllFromIndex('books', 'by-created')
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['books', 'tracks'], 'readwrite')
  await tx.objectStore('books').delete(id)
  const trackIndex = tx.objectStore('tracks').index('by-book')
  const tracks = await trackIndex.getAllKeys(id)
  for (const key of tracks) {
    await tx.objectStore('tracks').delete(key)
  }
  await tx.done
}

export async function saveTrack(track: TrackRecord): Promise<void> {
  const db = await getDB()
  await db.put('tracks', track)
}

export async function getTrack(id: string): Promise<TrackRecord | undefined> {
  const db = await getDB()
  return db.get('tracks', id)
}

export async function getTracksForBook(bookId: string): Promise<TrackRecord[]> {
  const db = await getDB()
  const tracks = await db.getAllFromIndex('tracks', 'by-book', bookId)
  return tracks.sort((a, b) => a.index - b.index)
}
