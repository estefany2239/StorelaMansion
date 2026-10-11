import { useEffect, useState } from 'react'
import { obtenerProductos } from '../services/api'
import { urlImagen } from '../utils/imagenes'

// Nombre de la categoría en Neon -> id que usa el catálogo del frontend
const ID_CATEGORIA = {
  camisetas: 'camisetas',
  buzos: 'busos',
  accesorios: 'accesorios',
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
    price: formatearPrecio(p.precio),
    image: urlImagen(p.imagen),
  }
}

// Se pide una sola vez y se reutiliza en todas las pantallas
let cache = null

const cargarCatalogo = () => {
  if (!cache) {
    cache = obtenerProductos()
      .then((filas) => filas.map(adaptarProducto))
      .catch((error) => {
        cache = null
        throw error
      })
  }
  return cache
}

export function useCatalogo() {
  const [catalogo, setCatalogo] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    cargarCatalogo()
      .then((datos) => activo && setCatalogo(datos))
      .catch(() => activo && setCatalogo([]))
      .finally(() => activo && setCargando(false))
    return () => {
      activo = false
    }
  }, [])

  return { catalogo, cargando }
}