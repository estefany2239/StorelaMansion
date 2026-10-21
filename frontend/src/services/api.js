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

export async function obtenerCategorias() {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}/api/categorias`)
  } catch {
    throw new Error('No se pudieron cargar las categorías')
  }
  if (!respuesta.ok) throw new Error('No se pudieron cargar las categorías')
  return respuesta.json()
}

// identificacion (opcional): tipoDocumento ('CC' | 'CE' | 'NIT' |
// 'Pasaporte'), documento y fechaNacimiento ('YYYY-MM-DD'). El registro
// también funciona sin esos campos.
export async function registrarUsuario(
  nombre,
  correo,
  contrasena,
  { tipoDocumento = '', documento = '', fechaNacimiento = '' } = {}
) {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        correo,
        contrasena,
        tipo_documento: tipoDocumento,
        documento,
        fecha_nacimiento: fechaNacimiento
      })
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

// Datos del usuario autenticado (incluye sus permisos "Módulo:Privilegio").
// Se usa al cargar la app para refrescar la sesión guardada.
export async function obtenerPerfil() {
  return peticionAdmin('/api/auth/perfil', {
    mensajeError: 'No se pudo cargar el perfil'
  })
}

// Cambia la contraseña del usuario autenticado (incluye el paso de
// contraseña temporal de la invitación).
export async function cambiarContrasena(contrasenaActual, contrasenaNueva) {
  return peticionAdmin('/api/auth/cambiar-contrasena', {
    metodo: 'POST',
    cuerpo: { contrasenaActual, contrasenaNueva },
    mensajeError: 'No se pudo cambiar la contraseña'
  })
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

const peticionAdmin = async (ruta, { metodo = 'GET', cuerpo, mensajeError } = {}) => {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders()
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }
  return procesarRespuesta(respuesta, mensajeError)
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

// ===== VENTAS (módulo Ventas del panel) =====

export async function obtenerVentas() {
  return peticionAdmin('/api/ventas', {
    mensajeError: 'No se pudieron cargar las ventas'
  })
}

export async function obtenerVenta(id) {
  return peticionAdmin(`/api/ventas/${id}`, {
    mensajeError: 'No se pudo cargar la venta'
  })
}

// La única transición permitida por el backend es Completada -> Anulada.
export async function anularVenta(id) {
  return peticionAdmin(`/api/ventas/${id}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado: 'Anulada' },
    mensajeError: 'No se pudo anular la venta'
  })
}

// Variantes activas con stock > 0 para el formulario de venta.
export async function obtenerVariantesVenta() {
  return peticionAdmin('/api/ventas/variantes', {
    mensajeError: 'No se pudieron cargar las variantes'
  })
}

// Clientes activos para el formulario de venta.
export async function obtenerClientesVenta() {
  return peticionAdmin('/api/ventas/clientes', {
    mensajeError: 'No se pudieron cargar los clientes'
  })
}

// Crea una venta en el mostrador. El precio lo toma el backend del producto.
export async function crearVenta(datos) {
  return peticionAdmin('/api/ventas', {
    metodo: 'POST',
    cuerpo: datos,
    mensajeError: 'No se pudo registrar la venta'
  })
}

export async function obtenerProductosAdmin() {
  return peticionAdmin('/api/admin/productos', {
    mensajeError: 'No se pudieron cargar los productos'
  })
}

export async function obtenerCatalogosAdmin() {
  return peticionAdmin('/api/admin/productos/catalogos', {
    mensajeError: 'No se pudieron cargar las opciones'
  })
}

export async function crearProductoAdmin(datos) {
  return peticionAdmin('/api/admin/productos', {
    metodo: 'POST',
    cuerpo: datos,
    mensajeError: 'No se pudo crear el producto'
  })
}

export async function actualizarProductoAdmin(id, datos) {
  return peticionAdmin(`/api/admin/productos/${id}`, {
    metodo: 'PUT',
    cuerpo: datos,
    mensajeError: 'No se pudo actualizar el producto'
  })
}

export async function cambiarEstadoProductoAdmin(id, estado) {
  return peticionAdmin(`/api/admin/productos/${id}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado },
    mensajeError: 'No se pudo cambiar el estado del producto'
  })
}

export async function eliminarProductoAdmin(id) {
  return peticionAdmin(`/api/admin/productos/${id}`, {
    metodo: 'DELETE',
    mensajeError: 'No se pudo eliminar el producto'
  })
}

export async function obtenerCategoriasAdmin() {
  return peticionAdmin('/api/admin/categorias', {
    mensajeError: 'No se pudieron cargar las categorías'
  })
}

export async function crearCategoriaAdmin(datos) {
  return peticionAdmin('/api/admin/categorias', {
    metodo: 'POST',
    cuerpo: datos,
    mensajeError: 'No se pudo crear la categoría'
  })
}

export async function actualizarCategoriaAdmin(id, datos) {
  return peticionAdmin(`/api/admin/categorias/${encodeURIComponent(id)}`, {
    metodo: 'PUT',
    cuerpo: datos,
    mensajeError: 'No se pudo actualizar la categoría'
  })
}

export async function cambiarEstadoCategoriaAdmin(id, estado) {
  return peticionAdmin(`/api/admin/categorias/${encodeURIComponent(id)}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado },
    mensajeError: 'No se pudo cambiar el estado de la categoría'
  })
}

export async function eliminarCategoriaAdmin(id) {
  return peticionAdmin(`/api/admin/categorias/${encodeURIComponent(id)}`, {
    metodo: 'DELETE',
    mensajeError: 'No se pudo eliminar la categoría'
  })
}

export async function obtenerUsuariosAdmin() {
  return peticionAdmin('/api/admin/usuarios', {
    mensajeError: 'No se pudieron cargar los usuarios'
  })
}

export async function obtenerRolesAdmin() {
  return peticionAdmin('/api/admin/usuarios/roles', {
    mensajeError: 'No se pudieron cargar los roles'
  })
}

// ===== ROLES (CRUD del módulo Roles) =====

export async function listarRolesAdmin() {
  return peticionAdmin('/api/admin/roles', {
    mensajeError: 'No se pudieron cargar los roles'
  })
}

export async function obtenerCatalogoPermisosAdmin() {
  return peticionAdmin('/api/admin/roles/permisos', {
    mensajeError: 'No se pudo cargar el catálogo de permisos'
  })
}

export async function crearRolAdmin(datos) {
  return peticionAdmin('/api/admin/roles', {
    metodo: 'POST',
    cuerpo: datos,
    mensajeError: 'No se pudo crear el rol'
  })
}

export async function actualizarRolAdmin(id, datos) {
  return peticionAdmin(`/api/admin/roles/${encodeURIComponent(id)}`, {
    metodo: 'PUT',
    cuerpo: datos,
    mensajeError: 'No se pudo actualizar el rol'
  })
}

export async function cambiarEstadoRolAdmin(id, estado) {
  return peticionAdmin(`/api/admin/roles/${encodeURIComponent(id)}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado },
    mensajeError: 'No se pudo cambiar el estado del rol'
  })
}

export async function eliminarRolAdmin(id) {
  return peticionAdmin(`/api/admin/roles/${encodeURIComponent(id)}`, {
    metodo: 'DELETE',
    mensajeError: 'No se pudo eliminar el rol'
  })
}

export async function crearUsuarioAdmin(datos) {
  return peticionAdmin('/api/admin/usuarios', {
    metodo: 'POST',
    cuerpo: datos,
    mensajeError: 'No se pudo crear el usuario'
  })
}

export async function actualizarUsuarioAdmin(id, datos) {
  return peticionAdmin(`/api/admin/usuarios/${id}`, {
    metodo: 'PUT',
    cuerpo: datos,
    mensajeError: 'No se pudo actualizar el usuario'
  })
}

export async function cambiarEstadoUsuarioAdmin(id, estado) {
  return peticionAdmin(`/api/admin/usuarios/${id}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado },
    mensajeError: 'No se pudo cambiar el estado del usuario'
  })
}

export async function reenviarInvitacionUsuarioAdmin(id) {
  return peticionAdmin(`/api/admin/usuarios/${id}/reenviar-invitacion`, {
    metodo: 'POST',
    mensajeError: 'No se pudo reenviar la invitación'
  })
}

export async function eliminarUsuarioAdmin(id) {
  return peticionAdmin(`/api/admin/usuarios/${id}`, {
    metodo: 'DELETE',
    mensajeError: 'No se pudo eliminar el usuario'
  })
}

// ===== TALLAS (CRUD del módulo Tallas) =====

export async function obtenerTallasAdmin() {
  return peticionAdmin('/api/admin/tallas', {
    mensajeError: 'No se pudieron cargar las tallas'
  })
}

export async function crearTallaAdmin(datos) {
  return peticionAdmin('/api/admin/tallas', {
    metodo: 'POST',
    cuerpo: datos,
    mensajeError: 'No se pudo crear la talla'
  })
}

export async function actualizarTallaAdmin(id, datos) {
  return peticionAdmin(`/api/admin/tallas/${id}`, {
    metodo: 'PUT',
    cuerpo: datos,
    mensajeError: 'No se pudo actualizar la talla'
  })
}

export async function cambiarEstadoTallaAdmin(id, estado) {
  return peticionAdmin(`/api/admin/tallas/${id}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado },
    mensajeError: 'No se pudo cambiar el estado de la talla'
  })
}

export async function eliminarTallaAdmin(id) {
  return peticionAdmin(`/api/admin/tallas/${id}`, {
    metodo: 'DELETE',
    mensajeError: 'No se pudo eliminar la talla'
  })
}

// ===== COLORES (CRUD del módulo Colores) =====

export async function obtenerColoresAdmin() {
  return peticionAdmin('/api/admin/colores', {
    mensajeError: 'No se pudieron cargar los colores'
  })
}

export async function crearColorAdmin(datos) {
  return peticionAdmin('/api/admin/colores', {
    metodo: 'POST',
    cuerpo: datos,
    mensajeError: 'No se pudo crear el color'
  })
}

export async function actualizarColorAdmin(id, datos) {
  return peticionAdmin(`/api/admin/colores/${id}`, {
    metodo: 'PUT',
    cuerpo: datos,
    mensajeError: 'No se pudo actualizar el color'
  })
}

export async function cambiarEstadoColorAdmin(id, estado) {
  return peticionAdmin(`/api/admin/colores/${id}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado },
    mensajeError: 'No se pudo cambiar el estado del color'
  })
}

export async function eliminarColorAdmin(id) {
  return peticionAdmin(`/api/admin/colores/${id}`, {
    metodo: 'DELETE',
    mensajeError: 'No se pudo eliminar el color'
  })
}