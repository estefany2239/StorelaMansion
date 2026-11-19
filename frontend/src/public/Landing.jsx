import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gem,
  Menu,
  Moon,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Sun,
  Truck,
  X
} from 'lucide-react'
import { obtenerProductos } from '../shared/services/api'
import Footer from '../shared/components/footer/Footer'

/* =========================================================
   IMÁGENES LOCALES (src/assets/img)
   ========================================================= */

import camisaImg from '../assets/img/camisa.png'
import busoImg from '../assets/img/buso.png'
import tenImg from '../assets/img/ten.png'
import sudImg from '../assets/img/sud.png'
import pantalonetaImg from '../assets/img/lone.png'
import vestidoImg from '../assets/img/top.png'
import gorraImg from '../assets/img/jorda.png'
import relojImg from '../assets/img/reloj.png'
import perfumeImg from '../assets/img/per.jpeg'

import jetaImg from '../assets/img/jeta.png'
import tarImg from '../assets/img/tar.png'
import loneProductoImg from '../assets/img/lone.png'
import topProductoImg from '../assets/img/top.png'

import './Landing.css'

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const URL_API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/* =========================================================
   PROPS (todo lo maneja App.jsx, la landing no tiene estado global)
   - tema: 'claro' | 'oscuro' (el global de data-theme)
   - onAlternarTema: cambia el tema global
   - onIrALogin: abre la vista login existente
   - onVerProducto(producto): abre ProductDetailPage
   - onVerCategoria(nombre): abre CategoryProductsView
   - onVerTodos(): abre la página "Todos los productos"
   - renderFavorito(producto): opcional, devuelve el botón de favorito
     existente (BotonFavorito). Si no se pasa, no se muestra corazón.
   ========================================================= */

/* =========================================================
   ICONOS
   La corona se comparte con el navbar; los iconos de redes
   del footer ahora viven en shared/components/footer/Footer.
   ========================================================= */

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

/* =========================================================
   CONTENIDO
   TODO: reemplaza los "#" de redes con las URLs reales.
   ========================================================= */

const ENLACES = [
  { texto: 'Inicio', destino: '#inicio' },
  { texto: 'Productos', destino: '#productos' },
  { texto: 'Sobre nosotros', destino: '#nosotros' },
  { texto: 'Categorías', destino: '#categorias' }
]

// Fotos de respaldo para las categorías, por nombre (en minúsculas).
// Se usan primero; si no hay foto local, se usa la de la base de datos.
const IMAGEN_CATEGORIA_LOCAL = {
  camisetas: camisaImg,
  camiseta: camisaImg,
  buzos: busoImg,
  buso: busoImg,
  tenis: tenImg,
  sudaderas: sudImg,
  sudadera: sudImg,
  pantalonetas: pantalonetaImg,
  vestidos: vestidoImg,
  vestido: vestidoImg,
  gorras: gorraImg,
  relojes: relojImg,
  perfumes: perfumeImg,
  perfume: perfumeImg
}

// Fotos locales de productos, por nombre EXACTO del producto en la base de datos.
// Ejemplo: 'Tenis Urban Classic': tenisUrbanImg (primero importa la foto arriba).
const IMAGEN_PRODUCTO_LOCAL = {
  'Tenis Urban Classic': jetaImg,
  'Tenis Sport Low': tarImg,
  'Tenis Street Runner': loneProductoImg,
  'Tenis Platform Chic': topProductoImg
}

const BENEFICIOS = [
  { texto: 'Calidad premium', Icono: Gem },
  { texto: 'Envíos a todo el país', Icono: Truck },
  { texto: 'Compra segura', Icono: ShieldCheck }
]

const DATOS_TIENDA = [
  { Icono: Calendar, principal: '4 de diciembre de 2019', secundario: 'Fecha de fundación' },
  { Icono: Store, principal: 'Medellín, Villa Hermosa', secundario: 'Nuestra tienda' },
  { Icono: Star, principal: 'Miles de clientes', secundario: 'Satisfechos' }
]

// Categorías que siempre se muestran en la tienda, en este orden.
// Las que no existan en la base de datos igual aparecen, con su foto local
// (o el recuadro con la corona si no hay foto).
const CATEGORIAS_TIENDA = [
  'Tenis',
  'Camisetas',
  'Gorras',
  'Buzos',
  'Relojes',
  'Vestidos',
  'Pantalonetas',
  'Sudaderas',
  'Perfumes'
]

/* =========================================================
   HELPERS
   ========================================================= */

// Convierte la ruta de imagen del backend en una URL que el navegador pueda abrir.
const urlImagenProducto = (imagen) => {
  if (!imagen) return null
  if (/^(https?:|data:|blob:)/.test(imagen)) return imagen
  return `${URL_API}${imagen.startsWith('/') ? '' : '/'}${imagen}`
}

// Clave de categoría: sin mayúsculas, sin tildes y en singular, para que
// camiseta = camisetas, buso = buzo = buzos, relojes = reloj, etc. y no se
// dupliquen tarjetas.
const claveCategoria = (nombre) => {
  let clave = String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (clave.endsWith('es') && clave.length > 4) {
    clave = clave.slice(0, -2)
  } else if (clave.endsWith('s') && clave.length > 3) {
    clave = clave.slice(0, -1)
  }
  // El panel llama "Busos" a los buzos: es la misma categoría.
  if (clave === 'buzo') clave = 'buso'
  return clave
}

// Foto local de la categoría probando su clave en singular y los plurales.
const imagenCategoriaLocal = (clave) =>
  IMAGEN_CATEGORIA_LOCAL[clave] ||
  IMAGEN_CATEGORIA_LOCAL[`${clave}s`] ||
  IMAGEN_CATEGORIA_LOCAL[`${clave}es`] ||
  null

/* =========================================================
   AGRUPADO DE PRODUCTOS
   /api/productos devuelve UNA fila por variante (talla/color).
   Aquí se deja una tarjeta por id_producto.
   La foto local tiene prioridad; si no hay, se usa la de la base de datos.
   ========================================================= */

const agruparPorProducto = (variantes) => {
  const mapa = new Map()
  variantes.forEach((variante) => {
    if (!mapa.has(variante.id_producto)) {
      mapa.set(variante.id_producto, {
        id_producto: variante.id_producto,
        nombre: variante.nombre,
        imagen: IMAGEN_PRODUCTO_LOCAL[variante.nombre] || urlImagenProducto(variante.imagen),
        categoria: variante.categoria
      })
    }
  })
  return [...mapa.values()]
}

/* =========================================================
   CATEGORÍAS DESDE LA BASE DE DATOS
   Una tarjeta por cada categoría que exista en los productos.
   La foto local tiene prioridad; si no hay, se usa la del producto.
   ========================================================= */

const construirCategorias = (variantes) => {
  // Categorías reales de la base, sin duplicados por clave normalizada.
  const enBase = new Map()
  variantes.forEach((variante) => {
    const nombre = (variante.categoria || '').trim()
    if (!nombre) return
    const clave = claveCategoria(nombre)
    if (!enBase.has(clave)) {
      enBase.set(clave, {
        nombre,
        imagen: imagenCategoriaLocal(clave) || urlImagenProducto(variante.imagen) || null
      })
    }
  })

  const tarjetas = []
  const vistas = new Set()

  // Primero las categorías de la tienda, en el orden de CATEGORIAS_TIENDA.
  // Si la categoría existe en la base se usa su nombre real (para que el
  // filtro de onVerCategoria siga funcionando) y su foto local o la del
  // producto; si no existe, se muestra igual con el nombre de la lista y
  // su foto local (o el recuadro con la corona).
  CATEGORIAS_TIENDA.forEach((nombreLista) => {
    const clave = claveCategoria(nombreLista)
    vistas.add(clave)
    const base = enBase.get(clave)
    tarjetas.push({
      nombre: base ? base.nombre : nombreLista,
      imagen: (base && base.imagen) || imagenCategoriaLocal(clave) || null
    })
  })

  // Después, cualquier categoría de la base que no esté en la lista.
  enBase.forEach((categoria, clave) => {
    if (!vistas.has(clave)) tarjetas.push(categoria)
  })

  return tarjetas
}

/* =========================================================
   PÁGINA
   ========================================================= */

import NavbarCategoria from '../features/categories/NavbarCategoria'

export default function Landing({
  tema = 'claro',
  onAlternarTema,
  onIrALogin,
  onVerProducto,
  onVerCategoria,
  onVerTodos,
  renderFavorito,
  user,
  onNavigate,
  onLogout,
  cartCount = 0,
  onCartClick,
  onNavigateSection,
}) {
  // null = cargando; [] = sin datos o error; [...] = variantes reales.
  const [variantes, setVariantes] = useState(null)
  const [errorProductos, setErrorProductos] = useState('')
  const carruselRef = useRef(null)

  // Destacados: los primeros 12 productos del catálogo (3 filas de 4).
  // Si hay menos de 12 disponibles, se muestran los que haya.
  const productos = useMemo(() => {
    if (variantes === null) return null
    const vistos = new Set()
    const conImagen = []
    for (const producto of agruparPorProducto(variantes)) {
      if (!producto.imagen) continue
      const id = producto.id_producto
      if (vistos.has(id)) continue
      vistos.add(id)
      conImagen.push(producto)
    }
    return conImagen.slice(0, 8)
  }, [variantes])

  const categorias = useMemo(
    () => (variantes === null ? [] : construirCategorias(variantes)),
    [variantes]
  )

  // Mueve el carrusel de categorías una tarjeta a la vez.
  const desplazarCarrusel = (direccion) => {
    const carrusel = carruselRef.current
    if (!carrusel) return
    const tarjeta = carrusel.querySelector('.landing-categoria')
    const separacion = parseFloat(getComputedStyle(carrusel).columnGap) || 0
    const paso = tarjeta ? tarjeta.offsetWidth + separacion : carrusel.clientWidth
    carrusel.scrollBy({ left: direccion * paso, behavior: 'smooth' })
  }

  useEffect(() => {
    let cancelado = false

    obtenerProductos()
      .then((respuesta) => {
        if (cancelado) return
        setVariantes(Array.isArray(respuesta) ? respuesta : [])
      })
      .catch(() => {
        if (cancelado) return
        setVariantes([])
        setErrorProductos('No se pudieron cargar los productos en este momento.')
      })

    return () => {
      cancelado = true
    }
  }, [])

  const cerrarMenu = () => setMenuAbierto(false)

  const irALoginDesdeMenu = () => {
    cerrarMenu()
    onIrALogin?.()
  }

  const renderCategorias = () => {
    if (variantes === null) {
      return <p className="landing-vacio">Cargando categorías...</p>
    }

    if (categorias.length === 0) {
      return <p className="landing-vacio">Pronto tendremos categorías disponibles.</p>
    }

    return categorias.map((categoria) => (
      <button
        key={categoria.nombre}
        type="button"
        className="landing-categoria"
        onClick={() => onVerCategoria?.(categoria.nombre)}
      >
        {categoria.imagen ? (
          <img src={categoria.imagen} alt={categoria.nombre} loading="lazy" />
        ) : (
          <div className="landing-imagen-vacia">
            <Corona />
          </div>
        )}
        <div className="landing-categoria-pie">
          <span className="landing-categoria-nombre">{categoria.nombre}</span>
          <span className="landing-categoria-ver">
            Ver colección <ArrowRight size={14} />
          </span>
        </div>
      </button>
    ))
  }

  const ImagenDestacado = ({ src, alt }) => {
    const [fallo, setFallo] = useState(false)
    const mostrar = src && !fallo
    return (
      <>
        <div className="landing-imagen-vacia" aria-hidden="true">
          <ShoppingBag size={34} />
        </div>
        {mostrar && (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFallo(true)}
          />
        )}
      </>
    )
  }

  const renderProductos = () => {
    if (productos === null) {
      return Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="landing-producto landing-producto--cargando" aria-hidden="true" />
      ))
    }

    if (productos.length === 0) {
      return (
        <p className="landing-vacio">
          {errorProductos || 'Pronto tendremos productos disponibles.'}
        </p>
      )
    }

    return productos.map((producto) => (
      <article key={producto.id_producto} className="landing-producto">
        <div className="landing-producto-imagen">
          <button
            type="button"
            className="landing-producto-enlace"
            onClick={() => onVerProducto?.(producto)}
            aria-label={`Ver ${producto.nombre}`}
          >
            <ImagenDestacado src={producto.imagen} alt={producto.nombre} />
          </button>

          {renderFavorito && (
            <div className="landing-favorito-slot">{renderFavorito(producto)}</div>
          )}
        </div>

        <button
          type="button"
          className="landing-producto-texto landing-producto-enlace"
          onClick={() => onVerProducto?.(producto)}
        >
          <h3>{producto.nombre}</h3>
          <p>{producto.categoria || ''}</p>
        </button>
      </article>
    ))
  }

  return (
    <div className="landing" data-tema={tema}>
      <div className="landing-fondo" aria-hidden="true" />

      {/* ================= NAVBAR ================= */}
      <NavbarCategoria
        tema={tema}
        user={user}
        onAlternarTema={onAlternarTema}
        onIrALogin={onIrALogin}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onNavigateSection={(seccion) => {
          if (onNavigateSection) onNavigateSection(seccion);
          else {
            const el = document.getElementById(seccion);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        onVerCategoria={onVerCategoria}
        cartCount={cartCount}
        onCartClick={onCartClick}
      />

      {/* ================= HERO ================= */}
      <section id="inicio" className="landing-hero">
        <div className="landing-hero-fondo" aria-hidden="true">
          <img
            src={tema === 'oscuro' ? '/landing/heroosc.jpeg' : '/landing/hero-claro.jpg'}
            alt=""
          />
        </div>

        <div className="landing-hero-contenido">
          <p className="landing-eyebrow landing-eyebrow--claro">LA MANSIÓN</p>

          <h1 className="landing-hero-titulo">
            <span>Más que una tienda,</span>
            <span className="landing-dorado landing-hero-cursiva">somos una familia.</span>
          </h1>

          <p className="landing-hero-descripcion">
            Moda urbana, estilo y calidad en un solo lugar. Descubre las mejores prendas y
            lleva tu estilo al siguiente nivel.
          </p>

          <div className="landing-hero-botones">
            <a href="#productos" className="landing-btn landing-btn-dorado">
              <ShoppingBag size={18} />
              Comprar ahora
            </a>
            <a href="#nosotros" className="landing-btn landing-btn-contorno">
              Conoce más
              <ArrowRight size={18} />
            </a>
          </div>

          <ul className="landing-beneficios">
            {BENEFICIOS.map(({ texto, Icono }) => (
              <li key={texto}>
                <Icono size={22} className="landing-dorado" />
                <span>{texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="landing-ola" aria-hidden="true" />
      <div className="landing-ola-linea" aria-hidden="true" />

      {/* ================= CATEGORÍAS ================= */}
      <section id="categorias" className="landing-seccion">
        <div className="landing-encabezado">
          <p className="landing-eyebrow">NUESTRAS CATEGORÍAS</p>
          <h2>Encuentra tu estilo</h2>
        </div>

        <div className="landing-categorias-wrap">
          <button
            type="button"
            className="landing-carrusel-flecha landing-carrusel-flecha--izq"
            onClick={() => desplazarCarrusel(-1)}
            aria-label="Categoría anterior"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="landing-categorias" ref={carruselRef}>
            {renderCategorias()}
          </div>

          <button
            type="button"
            className="landing-carrusel-flecha landing-carrusel-flecha--der"
            onClick={() => desplazarCarrusel(1)}
            aria-label="Siguiente categoría"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* ================= PRODUCTOS DESTACADOS ================= */}
      <section id="productos" className="landing-seccion">
        <div className="landing-encabezado landing-encabezado--destacados">
          <p className="landing-eyebrow">PRODUCTOS DESTACADOS</p>
          <h2>Lo más destacado</h2>
          <button
            type="button"
            className="landing-btn landing-btn-dorado landing-btn-ver-mas"
            onClick={() => onVerTodos?.()}
          >
            Ver más
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="landing-productos">{renderProductos()}</div>
      </section>

      <div className="landing-ola" aria-hidden="true" />
      <div className="landing-ola-linea" aria-hidden="true" />

      {/* ================= SOBRE NOSOTROS ================= */}
      <section id="nosotros" className="landing-seccion landing-sobre">
        <div className="landing-sobre-imagen">
          <img
            src={tema === 'oscuro' ? '/landing/tienda.jpeg' : '/landing/tienda-interior.jpg'}
            alt="Interior de la tienda La Mansión"
            loading="lazy"
          />
        </div>

        <div className="landing-sobre-texto">
          <Corona className="landing-corona-decor" />
          <p className="landing-eyebrow">SOBRE NOSOTROS</p>
          <h2>La Mansión</h2>
          <p className="landing-sobre-frase landing-dorado">Calidad que se nota.</p>
          <p>
            Somos una tienda apasionada por la moda, el estilo y la autenticidad. Cada prenda
            está seleccionada pensando en ti, para que te sientas cómodo, seguro y siempre a
            la moda.
          </p>
          <a href="#nosotros" className="landing-btn landing-btn-dorado">
            Conoce nuestra historia
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* ================= INFORMACIÓN DE LA TIENDA ================= */}
      <section className="landing-seccion landing-seccion--compacta">
        <div className="landing-barra">
          {DATOS_TIENDA.map(({ Icono, principal, secundario }) => (
            <div key={principal} className="landing-barra-item">
              <Icono size={30} className="landing-dorado" />
              <div>
                <strong>{principal}</strong>
                <small>{secundario}</small>
              </div>
            </div>
          ))}
          <p className="landing-barra-frase landing-dorado">
            Tu estilo,
            <br />
            nuestra pasión.
          </p>
        </div>
      </section>

      <div className="landing-ola" aria-hidden="true" />

      {/* ================= FOOTER ================= */}
      {/* Componente compartido (mismo aspecto que antes); conserva
          el ancla id="contacto" para el enlace "Contacto". */}
      <Footer
        tema={tema}
        onNavigateSection={onNavigateSection}
        onVerCategoria={onVerCategoria}
      />
    </div>
  )
}