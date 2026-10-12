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

export async function registrarUsuario(nombre, correo, contrasena) {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, correo, contrasena })
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}))
    throw new Error(data.error || 'No se pudo registrar el usuario')
  }
  return respuesta.json()
}

export async function iniciarSesion(correo, contrasena) {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, contrasena })
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}))
    throw new Error(data.error || 'Correo o contraseña incorrectos')
  }
  return respuesta.json()
}

export async function obtenerClientes() {
  const respuesta = await fetch(`${API_URL}/api/clientes`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  })
  if (!respuesta.ok) throw new Error('No se pudieron cargar los clientes')
  return respuesta.json()
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
})

const procesarRespuesta = async (respuesta, mensajeError) => {
  if (respuesta.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = '/'
    throw new Error('Sesión expirada')
  }

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}))
    throw new Error(data.error || mensajeError)
  }

  return respuesta.json()
}

export async function crearCliente(datos) {
  const respuesta = await fetch(`${API_URL}/api/clientes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos)
  })
  return procesarRespuesta(respuesta, 'No se pudo crear el cliente')
}

export async function actualizarCliente(id, datos) {
  const respuesta = await fetch(`${API_URL}/api/clientes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos)
  })
  return procesarRespuesta(respuesta, 'No se pudo actualizar el cliente')
}

export async function cambiarEstadoCliente(id) {
  const respuesta = await fetch(`${API_URL}/api/clientes/${id}/estado`, {
    method: 'PATCH',
    headers: authHeaders()
  })
  return procesarRespuesta(respuesta, 'No se pudo cambiar el estado del cliente')
}

export async function eliminarCliente(id) {
  const respuesta = await fetch(`${API_URL}/api/clientes/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  return procesarRespuesta(respuesta, 'No se pudo eliminar el cliente')
}

export async function crearPedido(pedido) {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(pedido)
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }
  return procesarRespuesta(respuesta, 'No se pudo crear el pedido')
}

export async function obtenerMisPedidos() {
  const respuesta = await fetch(`${API_URL}/api/pedidos/mis`, {
    headers: authHeaders()
  })
  return procesarRespuesta(respuesta, 'No se pudieron cargar tus pedidos')
}

export async function obtenerPedidos() {
  const respuesta = await fetch(`${API_URL}/api/pedidos`, {
    headers: authHeaders()
  })
  return procesarRespuesta(respuesta, 'No se pudieron cargar los pedidos')
}

export async function obtenerPedido(id) {
  const respuesta = await fetch(`${API_URL}/api/pedidos/${id}`, {
    headers: authHeaders()
  })
  return procesarRespuesta(respuesta, 'No se pudo cargar el pedido')
}

export async function cambiarEstadoPedido(id, estado) {
  const respuesta = await fetch(`${API_URL}/api/pedidos/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ estado })
  })
  return procesarRespuesta(respuesta, 'No se pudo cambiar el estado del pedido')
}