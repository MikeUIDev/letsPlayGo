import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configureNativeChrome } from './native/configureNativeChrome'
import { syncViewportHeight } from './native/syncViewportHeight'

void configureNativeChrome()
syncViewportHeight()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
