import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Pitch } from './pages/Pitch'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/invertir" element={<Dashboard />} />
        <Route path="/pitch" element={<Pitch />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
