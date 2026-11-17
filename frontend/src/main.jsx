import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ToastProvider from './shared/components/notifications/ToastProvider.jsx'
import './shared/styles/variables.css'

// Ruta pública /licencias: página independiente "Licencias y derechos de
// autor" (Paso 3 del licenciamiento). Se comprueba la ruta ANTES de montar
// la app para que el componente y sus datos no entren en el bundle inicial.
// La página no requiere sesión y no afecta las vistas existentes.
const rutaLimpia = window.location.pathname.replace(/\/+$/, '')

if (rutaLimpia === '/licencias') {
  import('./features/licencias/Licencias.jsx').then((modulo) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <ToastProvider>
          <modulo.default />
        </ToastProvider>
      </StrictMode>,
    )
  })
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>,
  )
}
