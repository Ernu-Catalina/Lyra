// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'

// Your root component
import App from './App.tsx'

// Auth context provider (from your auth folder)
import { AuthProvider } from './auth/AuthProvider.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)