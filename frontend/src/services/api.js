const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function obtenerProductos(filtros = {}) {
  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor) params.append(clave, valor)
  })

  const respuesta = await fetch(`${API_URL}/api/productos?${params}`)
  if (!respuesta.ok) throw new Error('No se pudieron cargar los productos')
  return respuesta.json()
}