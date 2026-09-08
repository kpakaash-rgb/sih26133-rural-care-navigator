import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './pages/worker/worker.css'
import WorkerApp from './pages/worker/WorkerApp'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WorkerApp />
  </StrictMode>,
)
