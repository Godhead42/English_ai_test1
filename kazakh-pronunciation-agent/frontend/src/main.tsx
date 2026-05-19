import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DemoApp from './DemoApp.tsx'

const isDemo = window.location.pathname.startsWith('/demo');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDemo ? <DemoApp /> : <App />}
  </StrictMode>,
)
