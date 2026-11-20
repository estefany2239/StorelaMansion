// =========================================================
// FOOTER COMPARTIDO DE LA TIENDA PÚBLICA · Store La Mansión
// Copia fiel del footer del landing (marca con corona,
// redes, Navegación, Categorías y Atención al cliente).
// No depende del landing: sus estilos usan el prefijo
// .sitio-footer y sus propias variables (con respaldo),
// y respeta el tema claro/oscuro vía el prop `tema`
// (la misma fuente que usa el navbar compartido) o, si
// no llega, el data-theme del <html> / localStorage.
// =========================================================

import { Mail, MapPin, Truck } from "lucide-react";

import "./Footer.css";

/* =========================================================
   ICONOS (copia de los del landing para el mismo aspecto)
   ========================================================= */

function Svg({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function Corona({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 34"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 9 14 19 24 5 34 19 43 9 39 27H9Z" />
      <path d="M11 32c9 2.5 17 2.5 26 0" />
    </svg>
  )
}

function IconoInstagram() {
  return (
    <Svg>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" />
    </Svg>
  )
}

function IconoTikTok() {
  return (
    <Svg>
      <path
        d="M16.5 3c.3 2.6 1.9 4.6 4.5 4.9v3.2c-1.6 0-3.1-.5-4.5-1.3v6.4c0 3.6-2.9 6.5-6.5 6.5S3.5 19.8 3.5 16.2 6.4 9.7 10 9.7c.3 0 .6 0 .9.1v3.3c-.3-.1-.6-.1-.9-.1-1.8 0-3.2 1.4-3.2 3.2s1.4 3.2 3.2 3.2 3.3-1.4 3.3-3.3V3z"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  )
}

function IconoFacebook() {
  return (
    <Svg>
      <path
        d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.4H7.6V14h2.8v8z"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  )
}

function IconoYouTube() {
  return (
    <Svg>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/* =========================================================
   CONTENIDO (mismo que el footer del landing)
   ========================================================= */

const ANIO_ACTUAL = new Date().getFullYear()

// Enlaces de Navegación. Los que llevan "#" bajan a la sección
// del landing usando onNavigateSection (el mecanismo del
// navbar); "/licencias" abre la página de licencias.
const ENLACES_FOOTER = [
  { texto: 'Inicio', destino: '#inicio' },
  { texto: 'Sobre nosotros', destino: '#nosotros' },
  { texto: 'Productos', destino: '#productos' },
  { texto: 'Contacto', destino: '#contacto' },
  { texto: 'Licencias y derechos de autor', destino: '/licencias' }
]

// Las mismas categorías del footer del landing: las 6 primeras
// de la lista de la tienda. Si no hay datos cargados, esta
// lista estática es el respaldo.
const CATEGORIAS_FOOTER = [
  'Tenis',
  'Camisetas',
  'Gorras',
  'Buzos',
  'Relojes',
  'Vestidos'
]

const REDES = [
  { nombre: 'Instagram', url: '#', Icono: IconoInstagram },
  { nombre: 'TikTok', url: '#', Icono: IconoTikTok },
  { nombre: 'Facebook', url: '#', Icono: IconoFacebook },
  { nombre: 'YouTube', url: '#', Icono: IconoYouTube }
]

/* =========================================================
   TEMA
   Prop `tema` ('claro' | 'oscuro'): la misma fuente que usa
   el navbar compartido. Respaldo: data-theme del <html> y
   localStorage ("storemansion-theme").
   ========================================================= */

const temaRespaldo = () => {
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    return 'oscuro'
  }
  try {
    return localStorage.getItem('storemansion-theme') === 'dark'
      ? 'oscuro'
      : 'claro'
  } catch {
    return 'claro'
  }
}

/* =========================================================
   NAVEGACIÓN
   - Secciones del landing: onNavigateSection (mismo
     mecanismo del navbar). Respaldo: scroll si la sección
     ya está en el DOM, o enlace a /#seccion.
   - Categorías: onVerCategoria (mismo flujo del navbar;
     las de público directo van al listado directo).
     Respaldo: /#categorias.
   ========================================================= */

export default function Footer({
  tema,
  categorias,
  onNavigateSection,
  onVerCategoria,
}) {
  const temaActual = tema === 'claro' || tema === 'oscuro' ? tema : temaRespaldo()
  const categoriasFooter =
    Array.isArray(categorias) && categorias.length > 0
      ? categorias
      : CATEGORIAS_FOOTER

  const irASeccionFooter = (seccionId) => (evento) => {
    evento.preventDefault()
    if (onNavigateSection) {
      onNavigateSection(seccionId)
      return
    }
    const seccion = document.getElementById(seccionId)
    if (seccion) {
      seccion.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.location.assign(`/#${seccionId}`)
    }
  }

  const abrirCategoria = (nombre) => (evento) => {
    evento.preventDefault()
    if (onVerCategoria) {
      onVerCategoria(nombre)
      return
    }
    window.location.assign('/#categorias')
  }

  return (
    <footer id="contacto" className="sitio-footer" data-tema={temaActual}>
      <div className="sitio-footer-grid">
        {/* Columna 1: marca, descripción y redes */}
        <div className="sitio-footer-marca">
          <Corona className="sitio-footer-corona" />
          <strong>STORE LA MANSIÓN</strong>
          <span className="sitio-footer-destacado">FASHION PREMIUM</span>
          <p>
            Prendas exclusivas diseñadas para quienes aprecian la distinción y el lujo en cada
            detalle.
          </p>
          <div className="sitio-footer-redes">
            {REDES.map(({ nombre, url, Icono }) => (
              <a key={nombre} href={url} aria-label={nombre} title={nombre}>
                <Icono />
              </a>
            ))}
          </div>
        </div>

        {/* Columna 2: Navegación */}
        <div className="sitio-footer-columna">
          <h4>Navegación</h4>
          <ul>
            {ENLACES_FOOTER.map((enlace) => (
              <li key={enlace.texto}>
                {enlace.destino.startsWith('#') ? (
                  <a
                    href={enlace.destino}
                    onClick={irASeccionFooter(enlace.destino.slice(1))}
                  >
                    {enlace.texto}
                  </a>
                ) : (
                  <a href={enlace.destino}>{enlace.texto}</a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Columna 3: Categorías */}
        <div className="sitio-footer-columna">
          <h4>Categorías</h4>
          <ul>
            {categoriasFooter.map((nombre) => (
              <li key={nombre}>
                <a href="#categorias" onClick={abrirCategoria(nombre)}>
                  {nombre}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Columna 4: Atención al cliente */}
        <div className="sitio-footer-columna">
          <h4>Atención al cliente</h4>
          <ul className="sitio-footer-contacto">
            <li>
              <MapPin size={18} className="sitio-footer-icono-dorado" />
              <span>
                <strong>Ubicación:</strong> Medellín, Colombia
              </span>
            </li>
            <li>
              <Mail size={18} className="sitio-footer-icono-dorado" />
              <span>
                <strong>Correo:</strong> contacto@storelamansion.com
              </span>
            </li>
            <li>
              <Truck size={18} className="sitio-footer-icono-dorado" />
              <span>
                <strong>Envíos:</strong> Cobertura nacional
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Derechos de autor */}
      <div className="sitio-footer-derechos">
        <span>© {ANIO_ACTUAL} Store La Mansión. Todos los derechos reservados.</span>
      </div>
    </footer>
  )
}
