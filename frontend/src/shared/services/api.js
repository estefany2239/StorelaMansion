const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const MENSAJE_DEMASIADOS_INTENTOS =
  'Demasiados intentos, intenta de nuevo en unos minutos.'

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

// identificacion: tipoDocumento ('CC' | 'CE' | 'NIT' | 'Pasaporte'),
// documento y fechaNacimiento ('YYYY-MM-DD'); en el registro público son
// obligatorios, igual que telefono. Si el backend rechaza la petición con
// `campo`, el error lo lleva añadido para mostrarlo bajo ese input.
//
// `ts` es el instante en que se abrió el formulario y `website` el campo
// trampa (siempre vacío: sólo un relleno automático lo rellena). El backend
// los usa para descartar registros automáticos sin decirle al atacante que
// algo falló, por eso van siempre en la petición.
//
// `turnstileToken` es el token de Turnstile (Fase C): sin él el backend
// responde 400 CAPTCHA_REQUERIDO y no se crea la cuenta.
export async function registrarUsuario(
  nombre,
  correo,
  contrasena,
  {
    telefono = '',
    tipoDocumento = '',
    documento = '',
    fechaNacimiento = '',
    website = '',
    ts = 0,
    turnstileToken = ''
  } = {}
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
        telefono,
        tipo_documento: tipoDocumento,
        documento,
        fecha_nacimiento: fechaNacimiento,
        website,
        ts,
        turnstileToken
      })
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}))
    const error = new Error(
      respuesta.status === 429
        ? data.message || data.error || MENSAJE_DEMASIADOS_INTENTOS
        : data.error || 'No se pudo registrar el usuario'
    )
    error.status = respuesta.status
    if (data.campo) error.campo = data.campo
    if (data.codigo) error.codigo = data.codigo
    throw error
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
    const error = new Error(
      respuesta.status === 429
        ? data.message || data.error || MENSAJE_DEMASIADOS_INTENTOS
        : data.error || 'Correo o contraseña incorrectos'
    )
    error.status = respuesta.status
    if (data.codigo) error.codigo = data.codigo
    throw error
  }
  return respuesta.json()
}

// Flujo público de recuperación de contraseña (código de 6 dígitos por
// correo). Solicitar siempre responde igual, exista o no el correo.
// `turnstileToken` es obligatorio (Fase C): sin él responde
// 400 CAPTCHA_REQUERIDO y no se envía ningún código.
export async function solicitarCodigoRecuperacion(correo, turnstileToken = '') {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}/api/auth/recuperar/solicitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, turnstileToken })
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}))
    const error = new Error(data.error || 'No se pudo enviar el código')
    if (data.codigo) error.codigo = data.codigo
    throw error
  }
  return respuesta.json()
}

// Valida el código contra el backend y devuelve un token corto para
// restablecer la contraseña.
export async function verificarCodigoRecuperacion(correo, codigo) {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}/api/auth/recuperar/verificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, codigo })
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}))
    const error = new Error(data.error || 'El código es incorrecto o ha expirado')
    if (data.campo) error.campo = data.campo
    throw error
  }
  return respuesta.json()
}

export async function restablecerContrasena(token, contrasena) {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}/api/auth/recuperar/restablecer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, contrasena })
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}))
    const error = new Error(data.error || 'No se pudo restablecer la contraseña')
    if (data.campo) error.campo = data.campo
    throw error
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

// Actualiza los datos personales del PROPIO usuario autenticado
// (tarjeta "Datos personales" de Configuración). La identidad la toma
// el backend del token, nunca del cuerpo de la petición.
// datos: { nombre, correo, telefono, documento? }
export async function actualizarMiPerfil(datos) {
  return peticionAdmin('/api/clientes/mio', {
    metodo: 'PUT',
    cuerpo: datos,
    mensajeError: 'No se pudieron actualizar tus datos'
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
    const error = new Error(data.error || mensajeError)
    // Código HTTP del backend: 409 se usa para conflictos de stock y
    // permite refrescar las cantidades permitidas en el carrito.
    error.status = respuesta.status
    // El backend indica el campo inválido/duplicado para que el
    // formulario lo muestre debajo del input correcto.
    if (data.campo) error.campo = data.campo
    throw error
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

// Sube el comprobante de pago de un pedido. El FormData fija el
// Content-Type multipart (con su boundary); no se debe enviar a mano.
export async function subirComprobantePedido(id, archivo) {
  const formData = new FormData()
  formData.append('comprobante', archivo)

  let respuesta
  try {
    respuesta = await fetch(`${API_URL}/api/pedidos/${id}/comprobantes`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }
  return procesarRespuesta(respuesta, 'No se pudo subir el comprobante')
}

// Historial de comprobantes de pago de un pedido (más reciente primero).
export async function obtenerComprobantesPedido(id) {
  return peticionAdmin(`/api/pedidos/${id}/comprobantes`, {
    mensajeError: 'No se pudieron cargar los comprobantes'
  })
}

// El archivo se sirve con el token: se descarga como Blob para mostrarlo con
// un object URL y no exponer la URL privada del backend.
export async function obtenerArchivoComprobantePedido(id, idComprobante) {
  let respuesta
  try {
    respuesta = await fetch(
      `${API_URL}/api/pedidos/${id}/comprobantes/${idComprobante}/archivo`,
      { headers: authHeaders() }
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  if (respuesta.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = '/'
    throw new Error('Sesión expirada')
  }

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}))
    const error = new Error(data.error || 'No se pudo cargar el comprobante')
    error.status = respuesta.status
    throw error
  }

  return respuesta.blob()
}

export async function aprobarComprobantePedido(id, idComprobante) {
  return peticionAdmin(
    `/api/pedidos/${id}/comprobantes/${idComprobante}/aprobar`,
    {
      metodo: 'POST',
      mensajeError: 'No se pudo aprobar el comprobante'
    }
  )
}

export async function rechazarComprobantePedido(id, idComprobante, motivo) {
  return peticionAdmin(
    `/api/pedidos/${id}/comprobantes/${idComprobante}/rechazar`,
    {
      metodo: 'POST',
      cuerpo: { motivo },
      mensajeError: 'No se pudo rechazar el comprobante'
    }
  )
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

export async function confirmarPagoPedido(id) {
  return peticionAdmin(`/api/pedidos/${id}/pago/confirmar`, {
    metodo: 'POST',
    mensajeError: 'No se pudo confirmar el pago'
  })
}

export async function rechazarPagoPedido(id) {
  return peticionAdmin(`/api/pedidos/${id}/pago/rechazar`, {
    metodo: 'POST',
    mensajeError: 'No se pudo rechazar el pago'
  })
}

// ===== CONFIGURACIÓN DEL NEGOCIO =====

// Datos opcionales que aparecen en el comprobante de venta. Si la tabla aún
// no existe, la llamada falla y el PDF usa solo el nombre por defecto.
export async function obtenerConfiguracionNegocio() {
  return peticionAdmin('/api/configuracion/negocio', {
    mensajeError: 'No se pudo cargar la configuración del negocio'
  })
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

// Indicadores del módulo Ventas: total, pagadas, pendientes, canceladas y
// valor total de las ventas pagadas.
export async function obtenerResumenVentas() {
  return peticionAdmin('/api/ventas/resumen', {
    mensajeError: 'No se pudo cargar el resumen de ventas'
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

// Búsqueda de productos activos con stock para el selector por pasos.
export async function buscarProductosVenta(texto) {
  const params = new URLSearchParams({ q: texto })
  return peticionAdmin(`/api/ventas/productos?${params}`, {
    mensajeError: 'No se pudieron buscar los productos'
  })
}

// Tallas del producto con su stock total (incluye las agotadas).
export async function obtenerTallasVenta(idProducto) {
  return peticionAdmin(`/api/ventas/productos/${idProducto}/tallas`, {
    mensajeError: 'No se pudieron cargar las tallas'
  })
}

// Colores con stock > 0 para un producto y talla.
export async function obtenerColoresVenta(idProducto, idTalla) {
  const params = new URLSearchParams({ talla: idTalla })
  return peticionAdmin(
    `/api/ventas/productos/${idProducto}/colores?${params}`,
    { mensajeError: 'No se pudieron cargar los colores' }
  )
}

// Variante exacta (producto + talla + color) con stock y precio actuales.
export async function obtenerVarianteVenta(idProducto, idTalla, idColor) {
  const params = new URLSearchParams({ talla: idTalla, color: idColor })
  return peticionAdmin(
    `/api/ventas/productos/${idProducto}/variante?${params}`,
    { mensajeError: 'No se pudo cargar la variante' }
  )
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