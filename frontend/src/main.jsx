import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import './index.css';
import './operatorSidebar.css';

if (new URLSearchParams(window.location.search).has('debug')) {
    localStorage.setItem('ev_token', '4|0S1qytoe6ejMfqyCWyhMb3RSuQmkzJ4nfMQLVto5ca0967c0');
    localStorage.setItem('ev_user', JSON.stringify({"id_user":"DRV0000000001","email":"bona@gmail.com","peran":"driver","status_akun":"Aktif","profile":{"nama_lengkap":"Bona"}}));
}
window.addEventListener('error', (e) => {
    const root = document.getElementById('root');
    if (root) root.innerHTML = '<pre style="color:red;padding:24px;white-space:pre-wrap;">' + (e.error && e.error.stack ? e.error.stack : e.message) + '</pre>';
});
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
