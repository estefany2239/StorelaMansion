import { useEffect, useState } from 'react'
import { obtenerCategorias } from '../services/api'
import { urlImagen } from '../utils/imagenes'
import { categories as categoriesRespaldo } from '../data/categories'

// categories.js es SOLO un respaldo temporal: la fuente de verdad es la base
// de datos (GET /api/categorias). Ver el TODO en ese archivo.
const construirRespaldo = () =>
  categoriesRespaldo.map((c) => ({
    id: c.id,
    name: c.name,
    descripcion: '',
    genders: Array.isArray(c.genders) ? c.genders : [],
    image: c.image,
  }))

// Fila de la API -> formato que ya usa el landing (id, name, genders, image).
const adaptar = (c) => ({
  id: c.id,
  name: c.nombre,
  descripcion: c.descripcion || '',
  genders: Array.isArray(c.generos) ? c.generos : [],
  image: urlImagen(c.imagen),
})

const REINTENTO_MS = 3000

// Categorías del landing. Mientras la API responde (o si falla) usa el
// respaldo local para no dejar el carrusel en blanco, avisa de forma discreta
// y reintenta una vez por si el servidor estaba despertando.
export function useCategorias() {
  const [categorias, setCategorias] = useState(() => construirRespaldo().filter((c) => c.image))
  const [cargando, setCargando] = useState(true)
  const [usandoRespaldo, setUsandoRespaldo] = useState(true)

  useEffect(() => {
    let cancelado = false
    let temporizador = null

    const cargar = async (intento) => {
      try {
        const filas = await obtenerCategorias()
        if (cancelado) return
        // El carrusel solo muestra categorías con imagen (las demás siguen
        // disponibles en el panel, en Productos y en la tienda).
        setCategorias(filas.map(adaptar).filter((c) => c.image))
        setUsandoRespaldo(false)
        setCargando(false)
      } catch (error) {
        console.error('[categorias] No se pudo leer /api/categorias:', error.message)
        if (intento === 0) {
          temporizador = setTimeout(() => cargar(1), REINTENTO_MS)
          return
        }
        if (cancelado) return
        setUsandoRespaldo(true)
        setCargando(false)
      }
    }

    cargar(0)

    return () => {
      cancelado = true
      if (temporizador) clearTimeout(temporizador)
    }
  }, [])

  return { categorias, cargando, usandoRespaldo }
}
