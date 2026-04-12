import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register PWA Service Worker
import { registerSW } from 'virtual:pwa-register'
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true })
}

// Apply theme as early as possible to prevent flashing
const savedTheme = localStorage.getItem('wabiri-theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
