import { useEffect, useState } from 'react'
import { obtenerProductos } from '../services/api'
import { urlImagen } from '../utils/imagenes'

// Nombre de la categoría en Neon -> id que usa el catálogo del frontend
const ID_CATEGORIA = {
  camisetas: 'camisetas',
  buzos: 'busos',
  tenis: 'tenis',
  sudaderas: 'blusas',
}

const sinTildes = (texto) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const formatearPrecio = (valor) => '$' + Number(valor).toLocaleString('es-CO')

// Convierte una fila de la API al formato que ya usa el catálogo
const adaptarProducto = (p) => {
  const categoria = sinTildes(p.categoria || '')
  return {
    id: p.id_variante,
    grupoId: p.id_producto,
    name: p.nombre,
    categoryId: ID_CATEGORIA[categoria] || categoria,
    gender: p.genero,
    size: p.talla || '',
    color: p.color || '',
    // Stock real de la variante (producto_variante.stock). Viaja en el
    // producto y se copia a cada línea del carrito para respetar el tope.
    // Sin dato (null/undefined/vacío) queda null y no se aplica tope local.
    stock:
      p.stock === null || p.stock === undefined || p.stock === ""
        ? null
        : Number.isFinite(Number(p.stock))
          ? Number(p.stock)
          : null,
    price: formatearPrecio(p.precio),
    image: urlImagen(p.imagen),
  }
}

// Se pide una sola vez y se reutiliza en todas las pantallas.
// Los suscriptores permiten que un refresco (stock que cambió mientras el
// cliente compra) actualice TODAS las instancias del hook, no solo la que
// lo pidió.
let cache = null
const suscriptores = new Set()

const notificar = (filas) => {
  suscriptores.forEach((suscriptor) => suscriptor(filas))
}

// Suscripción a los resultados del catálogo. Sirve para quien necesite
// reaccionar al dato recién pedido sin guardar estado propio: p. ej. el
// carrito, que recorta sus cantidades al stock real. Devuelve la función
// para darse de baja (se usa como limpieza del effect).
export const suscribirCatalogo = (suscriptor) => {
  suscriptores.add(suscriptor)
  return () => suscriptores.delete(suscriptor)
}

const cargarCatalogo = () => {
  if (!cache) {
    cache = obtenerProductos()
      .then((filas) => {
        const datos = filas.map(adaptarProducto)
        // Avisa también el primer resultado (no solo los refrescos
        // manuales): así quien se suscriba no depende del effect de este
        // hook para enterarse del stock inicial.
        notificar(datos)
        return datos
      })
      .catch((error) => {
        cache = null
        throw error
      })
  }
  return cache
}

// Vuelve a pedir el catálogo al backend (stock y precios reales) y avisa a
// todas las vistas suscritas. Devuelve las filas nuevas o null si falla.
export const refrescarCatalogo = async () => {
  cache = null
  try {
    // cargarCatalogo ya notifica a los suscriptores al resolverse.
    return await cargarCatalogo()
  } catch {
    return null
  }
}

export function useCatalogo() {
  const [catalogo, setCatalogo] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    const suscriptor = (filas) => {
      if (activo) setCatalogo(filas)
    }
    suscriptores.add(suscriptor)

    cargarCatalogo()
      .then((datos) => activo && setCatalogo(datos))
      .catch(() => activo && setCatalogo([]))
      .finally(() => activo && setCargando(false))

    return () => {
      activo = false
      suscriptores.delete(suscriptor)
    }
  }, [])

  return { catalogo, cargando, refrescar: refrescarCatalogo }
}