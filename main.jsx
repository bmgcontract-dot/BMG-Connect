import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

if (import.meta.env.BMG_LOCAL_EMULATOR) {
  document.title = 'LOCAL TEST — BMG (ไม่มีข้อมูลจริง)';
  const banner = document.createElement('div');
  banner.textContent = 'LOCAL TEST — ข้อมูลจำลองเท่านั้น • Firebase Emulator • ปิด Google Sheets/Drive';
  banner.style.cssText = 'position:sticky;top:0;z-index:99999;background:#fef08a;color:#713f12;text-align:center;font:14px sans-serif;padding:8px';
  document.body.prepend(banner);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
