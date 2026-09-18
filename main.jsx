import React from 'react'
import ReactDOM from 'react-dom/client'

const rootModule = import.meta.env.VITE_APP_MODE === 'legacy-recovery'
  ? import('./src/recovery/RecoveryApp.jsx')
  : import('./App.jsx')

rootModule.then(({ default: RootApp }) => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <RootApp />
    </React.StrictMode>,
  )
})
