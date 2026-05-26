import React from 'react'
console.log("API KEY present:", !!import.meta.env.ANTHROPIC_API_KEY);
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)