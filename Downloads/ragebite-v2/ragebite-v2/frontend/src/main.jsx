import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#181818',
            color: '#F2EEE8',
            border: '1px solid #252525',
            fontFamily: "'Syne', sans-serif",
            fontSize: '13px',
            borderRadius: '10px',
          },
          success: {
            iconTheme: { primary: '#00E676', secondary: '#181818' },
            style: { border: '1px solid rgba(0,230,118,0.3)' },
          },
          error: {
            iconTheme: { primary: '#FF3C1A', secondary: '#181818' },
            style: { border: '1px solid rgba(255,60,26,0.3)' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
