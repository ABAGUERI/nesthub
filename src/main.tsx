import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("VITE_SUPABASE_URL =", import.meta.env.VITE_SUPABASE_URL);
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
