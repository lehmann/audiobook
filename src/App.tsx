import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AudioProvider } from './context/AudioContext'
import LibraryPage from './pages/LibraryPage'
import UploadPage from './pages/UploadPage'
import BookDetailPage from './pages/BookDetailPage'
import PlayerBar from './components/PlayerBar'

export default function App() {
  return (
    <BrowserRouter>
      <AudioProvider>
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/book/:id" element={<BookDetailPage />} />
        </Routes>
        <PlayerBar />
      </AudioProvider>
    </BrowserRouter>
  )
}
