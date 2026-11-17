import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import './index.css';
import './operatorSidebar.css';

window.addEventListener('error', (e) => {
    const root = document.getElementById('root');
    if (!root) return;

    const pre = document.createElement('pre');
    pre.style.color = 'red';
    pre.style.padding = '24px';
    pre.style.whiteSpace = 'pre-wrap';
    pre.textContent = e.error?.stack || e.message || 'Terjadi kesalahan pada aplikasi.';
    root.replaceChildren(pre);
});
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
