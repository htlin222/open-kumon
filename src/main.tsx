import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/klee-one/400.css'
import '@fontsource/klee-one/600.css'
import './print/print.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
