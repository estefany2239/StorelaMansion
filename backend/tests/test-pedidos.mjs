import 'dotenv/config'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const BASE = 'http://localhost:3000/api'
const ADMIN_EMAIL = 'admin-prueba-pedidos@test.com'
const CLIENTE_EMAIL = 'cliente-prueba-pedidos@test.com'
const CLIENTE2_EMAIL = 'cliente2-prueba-pedidos@test.com'
const VENDEDOR_EMAIL = 'vendedor-prueba-pedidos@test.com'

const CORREOS_PRUEBA = [ADMIN_EMAIL, CLIENTE_EMAIL, CLIENTE2_EMAIL, VENDEDOR_EMAIL]

// Contraseñas aleatorias por ejecución (no se imprimen ni se guardan).
const CLAVE_ADMIN = crypto.randomBytes(16).toString('base64url')
const CLAVE_CLIENTE = crypto.randomBytes(16).toString('base64url')
const CLAVE_CLIENTE2 = crypto.randomBytes(16).toString('base64url')
const CLAVE_VENDEDOR = crypto.randomBytes(16).toString('base64url')

const originalStock = new Map()
let fallos = 0

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

const pedir = async (metodo, ruta, { token, body } = {}) => {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await respuesta.json()
  } catch {
    data = null
  }
  return { status: respuesta.status, data }
}

const limpiar = async () => {
  try {
    for (const [idVariante, stock] of originalStock) {
      await pool.query('UPDATE producto_variante SET stock = $1 WHERE id_variante = $2', [
        stock,
        idVariante,
      ])
    }

    const { rows: usuarios } = await pool.query(
      'SELECT id_usuario FROM usuario WHERE correo = ANY($1::text[])',
      [CORREOS_PRUEBA]
    )
    const ids = usuarios.map((u) => u.id_usuario)

    let pedidosIds = []
    if (ids.length > 0) {
      const r = await pool.query('SELECT id_pedido FROM pedido WHERE id_usuario = ANY($1::int[])', [ids])
      pedidosIds = r.rows.map((x) => x.id_pedido)
    }

    const conteos = { pago: 0, detalle_pedido: 0, domicilio: 0, pedido: 0, usuario: 0 }

    if (pedidosIds.length > 0) {
      conteos.pago = (await pool.query('DELETE FROM pago WHERE id_pedido = ANY($1::int[])', [pedidosIds])).rowCount
      conteos.detalle_pedido = (await pool.query('DELETE FROM detalle_pedido WHERE id_pedido = ANY($1::int[])', [pedidosIds])).rowCount
      conteos.domicilio = (await pool.query('DELETE FROM domicilio WHERE id_pedido = ANY($1::int[])', [pedidosIds])).rowCount
      conteos.pedido = (await pool.query('DELETE FROM pedido WHERE id_usuario = ANY($1::int[])', [ids])).rowCount
    }

    if (ids.length > 0) {
      conteos.usuario = (await pool.query('DELETE FROM usuario WHERE correo = ANY($1::text[])', [CORREOS_PRUEBA])).rowCount
    }

    console.log('\n=== LIMPIEZA (solo datos de prueba) ===')
    console.log(
      `pago: ${conteos.pago} | detalle_pedido: ${conteos.detalle_pedido} | domicilio: ${conteos.domicilio} | pedido: ${conteos.pedido} | usuario: ${conteos.usuario}`
    )
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
  }
}

const prepararUsuarios = async () => {
  // Limpieza previa por si quedó algo de una corrida anterior.
  await limpiar()
  originalStock.clear()
  fallos = 0

  const rolAdmin = await pool.query("SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Administrador'")
  if (!rolAdmin.rows[0].id) throw new Error("Falta el rol 'Administrador'")

  const rolVendedor = await pool.query("SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Vendedor'")
  if (!rolVendedor.rows[0].id) throw new Error("Falta el rol 'Vendedor'")

  const hashAdmin = await bcrypt.hash(CLAVE_ADMIN, 10)
  await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    ['Admin', 'Prueba', ADMIN_EMAIL, hashAdmin, rolAdmin.rows[0].id]
  )

  const hashVendedor = await bcrypt.hash(CLAVE_VENDEDOR, 10)
  await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    ['Vendedor', 'Prueba', VENDEDOR_EMAIL, hashVendedor, rolVendedor.rows[0].id]
  )

  await pedir('POST', '/auth/register', {
    body: {
      nombre: 'Cliente Prueba',
      correo: CLIENTE_EMAIL,
      contrasena: CLAVE_CLIENTE,
      telefono: '3001112233',
      tipo_documento: 'CC',
      documento: '1000000011',
      fecha_nacimiento: '1995-06-15',
      ts: Date.now() - 5000,
    },
  })
  await pedir('POST', '/auth/register', {
    body: {
      nombre: 'Cliente Dos',
      correo: CLIENTE2_EMAIL,
      contrasena: CLAVE_CLIENTE2,
      telefono: '3004445566',
      tipo_documento: 'CC',
      documento: '1000000022',
      fecha_nacimiento: '1992-03-20',
      ts: Date.now() - 5000,
    },
  })
}

const main = async () => {
  await prepararUsuarios()

  // 1) Login de ambos roles
  const loginAdmin = await pedir('POST', '/auth/login', {
    body: { correo: ADMIN_EMAIL, contrasena: CLAVE_ADMIN },
  })
  const loginCliente = await pedir('POST', '/auth/login', {
    body: { correo: CLIENTE_EMAIL, contrasena: CLAVE_CLIENTE },
  })
  const loginCliente2 = await pedir('POST', '/auth/login', {
    body: { correo: CLIENTE2_EMAIL, contrasena: CLAVE_CLIENTE2 },
  })
  const loginVendedor = await pedir('POST', '/auth/login', {
    body: { correo: VENDEDOR_EMAIL, contrasena: CLAVE_VENDEDOR },
  })
  comprobar('login admin (200)', loginAdmin.status === 200, `status=${loginAdmin.status}`)
  comprobar('login cliente (200)', loginCliente.status === 200, `status=${loginCliente.status}`)
  comprobar('login cliente 2 (200)', loginCliente2.status === 200, `status=${loginCliente2.status}`)
  comprobar('login vendedor (200)', loginVendedor.status === 200, `status=${loginVendedor.status}`)

  const tokenAdmin = loginAdmin.data?.token
  const tokenCliente = loginCliente.data?.token
  const tokenCliente2 = loginCliente2.data?.token
  const tokenVendedor = loginVendedor.data?.token
  if (!tokenAdmin || !tokenCliente || !tokenCliente2 || !tokenVendedor) {
    console.error('No se obtuvieron tokens; se abortan las pruebas de pedidos.')
    return
  }

  // 2) Variante de prueba con stock suficiente
  const { rows: variantes } = await pool.query(
    `SELECT pv.id_variante, pv.stock, p.precio::float8 AS precio
     FROM producto_variante pv
     JOIN producto p ON p.id_producto = pv.id_producto
     WHERE p.estado = TRUE AND pv.stock >= 5
     ORDER BY pv.id_variante
     LIMIT 1`
  )
  if (variantes.length === 0) {
    console.error('No hay variantes activas con stock suficiente para probar.')
    return
  }
  const variante = variantes[0]
  originalStock.set(variante.id_variante, variante.stock)

  // Datos de entrega válidos según el catálogo DIVIPOLA versionado
  // (ANTIOQUIA / COPACABANA, municipio real del Valle de Aburrá).
  const ENTREGA = {
    nombre_entrega: 'Cliente Prueba',
    telefono_entrega: '3001112233',
    departamento_codigo: '05',
    municipio_codigo: '05212',
    barrio: 'Centro',
    direccion: 'Calle 1 # 2-3',
  }

  const FUERA_VALLE = {
    departamento_codigo: '76',
    municipio_codigo: '76001',
    direccion: 'Calle 5 # 10-20',
  }

  // 3) Permisos
  const sinToken = await pedir('GET', '/pedidos')
  comprobar('sin token -> 401', sinToken.status === 401, `status=${sinToken.status}`)

  const clienteEnAdmin = await pedir('GET', '/pedidos', { token: tokenCliente })
  comprobar('cliente en ruta admin -> 403', clienteEnAdmin.status === 403, `status=${clienteEnAdmin.status}`)

  // 4) Errores de validación (no deben tocar stock)
  const varianteInexistente = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: 99999999, cantidad: 1 }],
      metodo_pago: 'Transferencia',
      banco: 'Nequi',
      ...ENTREGA,
    },
  })
  comprobar('variante inexistente -> 400', varianteInexistente.status === 400, `status=${varianteInexistente.status}`)

  const cantidadInvalida = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: variante.id_variante, cantidad: 0 }],
      metodo_pago: 'Transferencia',
      banco: 'Nequi',
      ...ENTREGA,
    },
  })
  comprobar('cantidad inválida -> 400', cantidadInvalida.status === 400, `status=${cantidadInvalida.status}`)

  const stockInsuficiente = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: variante.id_variante, cantidad: variante.stock + 1 }],
      metodo_pago: 'Transferencia',
      banco: 'Nequi',
      ...ENTREGA,
    },
  })
  comprobar('stock insuficiente -> 409', stockInsuficiente.status === 409, `status=${stockInsuficiente.status}`)

  const metodoInvalido = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: { items: [{ id_variante: variante.id_variante, cantidad: 1 }], metodo_pago: 'Bitcoin', ...ENTREGA },
  })
  comprobar('método de pago inválido -> 400', metodoInvalido.status === 400, `status=${metodoInvalido.status}`)

  const transferenciaSinBanco = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: { items: [{ id_variante: variante.id_variante, cantidad: 1 }], metodo_pago: 'Transferencia', ...ENTREGA },
  })
  comprobar('transferencia sin banco -> 400', transferenciaSinBanco.status === 400, `status=${transferenciaSinBanco.status}`)

  // 4b) Validaciones de entrega (campos nuevos del checkout)
  const sinDireccion = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: { items: [{ id_variante: variante.id_variante, cantidad: 1 }], metodo_pago: 'Transferencia', banco: 'Nequi', ...ENTREGA, direccion: '' },
  })
  comprobar('sin dirección -> 400', sinDireccion.status === 400, `status=${sinDireccion.status}`)
  comprobar('sin dirección indica el campo', sinDireccion.data?.campo === 'direccion', `campo=${sinDireccion.data?.campo}`)

  const municipioAjeno = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: { items: [{ id_variante: variante.id_variante, cantidad: 1 }], metodo_pago: 'Transferencia', banco: 'Nequi', ...ENTREGA, municipio_codigo: '76001' },
  })
  comprobar('municipio ajeno al departamento -> 400', municipioAjeno.status === 400, `status=${municipioAjeno.status}`)
  comprobar('municipio ajeno indica el campo', municipioAjeno.data?.campo === 'municipio_codigo', `campo=${municipioAjeno.data?.campo}`)

  const nombreNumeros = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: { items: [{ id_variante: variante.id_variante, cantidad: 1 }], metodo_pago: 'Transferencia', banco: 'Nequi', ...ENTREGA, nombre_entrega: 'Juan123' },
  })
  comprobar('nombre con números -> 400', nombreNumeros.status === 400, `status=${nombreNumeros.status}`)
  comprobar('nombre con números indica el campo', nombreNumeros.data?.campo === 'nombre_entrega', `campo=${nombreNumeros.data?.campo}`)

  const telefonoLetras = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: { items: [{ id_variante: variante.id_variante, cantidad: 1 }], metodo_pago: 'Transferencia', banco: 'Nequi', ...ENTREGA, telefono_entrega: 'tres-cero-cero' },
  })
  comprobar('teléfono con letras -> 400', telefonoLetras.status === 400, `status=${telefonoLetras.status}`)
  comprobar('teléfono con letras indica el campo', telefonoLetras.data?.campo === 'telefono_entrega', `campo=${telefonoLetras.data?.campo}`)

  const barrioVacio = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: { items: [{ id_variante: variante.id_variante, cantidad: 1 }], metodo_pago: 'Transferencia', banco: 'Nequi', ...ENTREGA, barrio: '  ' },
  })
  comprobar('barrio vacío -> 400', barrioVacio.status === 400, `status=${barrioVacio.status}`)
  comprobar('barrio vacío indica el campo', barrioVacio.data?.campo === 'barrio', `campo=${barrioVacio.data?.campo}`)

  const domicilioFuera = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: variante.id_variante, cantidad: 1 }],
      metodo_pago: 'Transferencia',
      banco: 'Nequi',
      metodo_envio: 'Domicilio',
      nombre_entrega: 'Cliente Prueba',
      telefono_entrega: '3001112233',
      barrio: 'Centro',
      ...FUERA_VALLE,
    },
  })
  comprobar('Domicilio fuera del Valle -> 400', domicilioFuera.status === 400, `status=${domicilioFuera.status}`)
  comprobar('Domicilio fuera indica metodo_envio', domicilioFuera.data?.campo === 'metodo_envio', `campo=${domicilioFuera.data?.campo}`)

  const transportadoraDentro = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: variante.id_variante, cantidad: 1 }],
      metodo_pago: 'Transferencia',
      banco: 'Nequi',
      metodo_envio: 'Transportadora',
      nombre_entrega: 'Cliente Prueba',
      telefono_entrega: '3001112233',
      ...ENTREGA,
    },
  })
  comprobar('Transportadora dentro del Valle -> 400', transportadoraDentro.status === 400, `status=${transportadoraDentro.status}`)
  comprobar('Transportadora dentro indica metodo_envio', transportadoraDentro.data?.campo === 'metodo_envio', `campo=${transportadoraDentro.data?.campo}`)

  // El stock no debe haber cambiado tras los intentos fallidos.
  const { rows: stockTrasErrores } = await pool.query(
    'SELECT stock FROM producto_variante WHERE id_variante = $1',
    [variante.id_variante]
  )
  comprobar('stock intacto tras errores', stockTrasErrores[0].stock === variante.stock, `stock=${stockTrasErrores[0].stock}`)

  // 5) Creación válida
  const crear = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: variante.id_variante, cantidad: 1 }],
      metodo_pago: 'Transferencia',
      banco: 'Nequi',
      ...ENTREGA,
      direccion: 'Calle 1 # 2-3',
    },
  })
  comprobar('crear pedido -> 201', crear.status === 201, `status=${crear.status}`)
  const pedido = crear.data
  comprobar('total calculado por el backend', pedido?.total === variante.precio, `total=${pedido?.total} esperado=${variante.precio}`)
  comprobar('Domicilio en Valle de Aburrá -> método Domicilio', pedido?.metodo_envio === 'Domicilio', `metodo=${pedido?.metodo_envio}`)
  comprobar('costo de envío por confirmar', pedido?.costo_envio === null && pedido?.costo_envio_pendiente === true, `costo=${pedido?.costo_envio} pendiente=${pedido?.costo_envio_pendiente}`)
  comprobar('estado inicial Registrado', pedido?.estado === 'Registrado', `estado=${pedido?.estado}`)
  comprobar('pedido incluye items', Array.isArray(pedido?.items) && pedido.items.length === 1)
  comprobar('respuesta trae departamento', pedido?.departamento === 'ANTIOQUIA', `departamento=${pedido?.departamento}`)
  comprobar('respuesta trae municipio', pedido?.municipio === 'COPACABANA', `municipio=${pedido?.municipio}`)
  comprobar('respuesta trae barrio', pedido?.barrio === 'Centro', `barrio=${pedido?.barrio}`)
  comprobar('respuesta trae destinatario', pedido?.nombre_destinatario === 'Cliente Prueba', `nombre=${pedido?.nombre_destinatario}`)

  const { rows: stockTrasCrear } = await pool.query(
    'SELECT stock FROM producto_variante WHERE id_variante = $1',
    [variante.id_variante]
  )
  comprobar('stock descontado', stockTrasCrear[0].stock === variante.stock - 1, `stock=${stockTrasCrear[0].stock}`)

  // Columnas nuevas de domicilio persistidas con los nombres del catálogo.
  const { rows: domicilioRows } = await pool.query(
    `SELECT direccion_entrega, departamento, municipio, barrio, nombre_destinatario, telefono_destinatario
     FROM domicilio WHERE id_pedido = $1`,
    [pedido.id]
  )
  const dom = domicilioRows[0]
  comprobar('domicilio guarda solo la calle en direccion_entrega', dom?.direccion_entrega === 'Calle 1 # 2-3', `direccion=${dom?.direccion_entrega}`)
  comprobar('domicilio guarda departamento oficial', dom?.departamento === 'ANTIOQUIA', `departamento=${dom?.departamento}`)
  comprobar('domicilio guarda municipio oficial', dom?.municipio === 'COPACABANA', `municipio=${dom?.municipio}`)
  comprobar('domicilio guarda barrio', dom?.barrio === 'Centro', `barrio=${dom?.barrio}`)
  comprobar('domicilio guarda teléfono destinatario', dom?.telefono_destinatario === '3001112233', `tel=${dom?.telefono_destinatario}`)

  if (!pedido?.id) {
    console.error('No se creó el pedido; se omiten las pruebas dependientes.')
    return
  }

  // 6) Consultas
  const mis = await pedir('GET', '/pedidos/mis', { token: tokenCliente })
  comprobar('GET /mis (cliente) -> 200', mis.status === 200, `status=${mis.status}`)
  comprobar('GET /mis contiene el pedido', Array.isArray(mis.data) && mis.data.some((p) => p.id === pedido.id))
  const pedidoMis = Array.isArray(mis.data) ? mis.data.find((p) => p.id === pedido.id) : null
  comprobar('GET /mis trae ubicación nueva', pedidoMis?.departamento === 'ANTIOQUIA' && pedidoMis?.municipio === 'COPACABANA' && pedidoMis?.barrio === 'Centro', `dep=${pedidoMis?.departamento} mun=${pedidoMis?.municipio} barrio=${pedidoMis?.barrio}`)
  comprobar('GET /mis trae destinatario', pedidoMis?.nombre_destinatario === 'Cliente Prueba' && pedidoMis?.telefono_destinatario === '3001112233', `nombre=${pedidoMis?.nombre_destinatario} tel=${pedidoMis?.telefono_destinatario}`)
  comprobar('GET /mis trae costo de envío pendiente', pedidoMis?.costo_envio === null && pedidoMis?.costo_envio_pendiente === true, `costo=${pedidoMis?.costo_envio} pendiente=${pedidoMis?.costo_envio_pendiente}`)

  const listaAdmin = await pedir('GET', '/pedidos', { token: tokenAdmin })
  comprobar('GET / (admin) -> 200', listaAdmin.status === 200, `status=${listaAdmin.status}`)
  comprobar('lista admin contiene el pedido', Array.isArray(listaAdmin.data) && listaAdmin.data.some((p) => p.id === pedido.id))

  const detalleAdmin = await pedir('GET', `/pedidos/${pedido.id}`, { token: tokenAdmin })
  comprobar('GET /:id (admin) -> 200', detalleAdmin.status === 200, `status=${detalleAdmin.status}`)
  comprobar('detalle admin trae items', Array.isArray(detalleAdmin.data?.items) && detalleAdmin.data.items.length === 1)
  comprobar('detalle admin trae cliente', Boolean(detalleAdmin.data?.cliente))

  const detalleCliente = await pedir('GET', `/pedidos/${pedido.id}`, { token: tokenCliente })
  comprobar('GET /:id (cliente dueño) -> 200', detalleCliente.status === 200, `status=${detalleCliente.status}`)

  // 6b) Otro cliente no puede ver el pedido ajeno (403 o 404)
  const ajeno = await pedir('GET', `/pedidos/${pedido.id}`, { token: tokenCliente2 })
  comprobar('otro cliente GET /:id ajeno -> 403/404', ajeno.status === 403 || ajeno.status === 404, `status=${ajeno.status}`)

  // 6c) El rol Vendedor entra a la lista de pedidos
  const listaVendedor = await pedir('GET', '/pedidos', { token: tokenVendedor })
  comprobar('GET / (vendedor) -> 200', listaVendedor.status === 200, `status=${listaVendedor.status}`)

  // 7) Cambio de estado
  const aDespachado = await pedir('PATCH', `/pedidos/${pedido.id}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Despachado' },
  })
  comprobar('PATCH a Despachado -> 200', aDespachado.status === 200 && aDespachado.data?.estado === 'Despachado', `estado=${aDespachado.data?.estado}`)

  const estadoInvalido = await pedir('PATCH', `/pedidos/${pedido.id}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Teletransportado' },
  })
  comprobar('PATCH estado inválido -> 400', estadoInvalido.status === 400, `status=${estadoInvalido.status}`)

  const pedidoInexistente = await pedir('PATCH', '/pedidos/99999999/estado', {
    token: tokenAdmin,
    body: { estado: 'Despachado' },
  })
  comprobar('PATCH pedido inexistente -> 404', pedidoInexistente.status === 404, `status=${pedidoInexistente.status}`)

  const cancelar = await pedir('PATCH', `/pedidos/${pedido.id}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Cancelado' },
  })
  comprobar('PATCH a Cancelado -> 200', cancelar.status === 200 && cancelar.data?.estado === 'Cancelado', `estado=${cancelar.data?.estado}`)

  const { rows: stockTrasCancelar } = await pool.query(
    'SELECT stock FROM producto_variante WHERE id_variante = $1',
    [variante.id_variante]
  )
  comprobar('stock restaurado al cancelar', stockTrasCancelar[0].stock === variante.stock, `stock=${stockTrasCancelar[0].stock}`)

  const cancelarDeNuevo = await pedir('PATCH', `/pedidos/${pedido.id}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Cancelado' },
  })
  comprobar('no recancelar -> 409', cancelarDeNuevo.status === 409, `status=${cancelarDeNuevo.status}`)

  // 7b) Fuera del Valle de Aburrá solo se permite Transportadora. Se crea
  // después de comprobar la restauración de stock del pedido cancelado.
  const crearTransportadora = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: variante.id_variante, cantidad: 1 }],
      metodo_pago: 'Transferencia',
      banco: 'Nequi',
      metodo_envio: 'Transportadora',
      nombre_entrega: 'Cliente Prueba',
      telefono_entrega: '3001112233',
      ...FUERA_VALLE,
    },
  })
  comprobar('Transportadora fuera del Valle -> 201', crearTransportadora.status === 201, `status=${crearTransportadora.status} error=${crearTransportadora.data?.error}`)
  const pedidoTransportadora = crearTransportadora.data
  comprobar('Transportadora se guarda como método', pedidoTransportadora?.metodo_envio === 'Transportadora', `metodo=${pedidoTransportadora?.metodo_envio}`)
  comprobar('Transportadora conserva ubicación DANE', Boolean(pedidoTransportadora?.departamento && pedidoTransportadora?.municipio), `dep=${pedidoTransportadora?.departamento} mun=${pedidoTransportadora?.municipio}`)
  comprobar('Transportadora no exige barrio', pedidoTransportadora?.barrio === null, `barrio=${pedidoTransportadora?.barrio}`)
  comprobar('costo de Transportadora por confirmar', pedidoTransportadora?.costo_envio === null && pedidoTransportadora?.costo_envio_pendiente === true, `costo=${pedidoTransportadora?.costo_envio} pendiente=${pedidoTransportadora?.costo_envio_pendiente}`)

  // 8) Crédito se retiró del checkout: como método nuevo se rechaza.
  const crearCredito = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: variante.id_variante, cantidad: 1 }],
      metodo_pago: 'Crédito',
      ...ENTREGA,
    },
  })
  comprobar('crear con Crédito -> 400', crearCredito.status === 400, `status=${crearCredito.status}`)
  comprobar(
    'mensaje de Crédito ya no disponible',
    crearCredito.data?.error === 'Este método de pago ya no está disponible',
    `error=${crearCredito.data?.error}`
  )

  // 8b) Recoger en tienda: exige ubicación solo para validar que el
  // municipio pertenezca al Valle de Aburrá; no pide dirección ni barrio.
  const crearRecoger = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: variante.id_variante, cantidad: 1 }],
      metodo_pago: 'Transferencia',
      banco: 'Nequi',
      metodo_envio: 'Recoger en tienda',
      departamento_codigo: '05',
      municipio_codigo: '05212',
      nombre_entrega: 'Cliente Prueba',
      telefono_entrega: '3001112233',
    },
  })
  comprobar('crear con Recoger en tienda -> 201', crearRecoger.status === 201, `status=${crearRecoger.status} error=${crearRecoger.data?.error}`)
  comprobar('recoger guarda destinatario', crearRecoger.data?.nombre_destinatario === 'Cliente Prueba', `nombre=${crearRecoger.data?.nombre_destinatario}`)
  comprobar('recoger guarda ubicación para validar zona', Boolean(crearRecoger.data?.departamento && crearRecoger.data?.municipio), `dep=${crearRecoger.data?.departamento}`)
  comprobar('recoger no guarda barrio', crearRecoger.data?.barrio === null, `barrio=${crearRecoger.data?.barrio}`)
  comprobar('recoger no cobra envío', crearRecoger.data?.costo_envio === 0 && crearRecoger.data?.costo_envio_pendiente === false, `costo=${crearRecoger.data?.costo_envio} pendiente=${crearRecoger.data?.costo_envio_pendiente}`)

  // 9) Segundo pedido (Contra entrega) para probar el rol Vendedor y el
  // estado Entregado.
  const crearB = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: variante.id_variante, cantidad: 1 }],
      metodo_pago: 'Contra entrega',
      banco: 'Nequi',
      ...ENTREGA,
      direccion: 'Carrera 43A # 6S-45',
    },
  })
  comprobar('crear segundo pedido -> 201', crearB.status === 201, `status=${crearB.status}`)
  const pedidoB = crearB.data
  comprobar(
    'contra entrega nace pendiente de verificación',
    pedidoB?.monto_pagado === 0 &&
      pedidoB?.estado_pago === 'Pendiente de verificación',
    `monto=${pedidoB?.monto_pagado} estado=${pedidoB?.estado_pago}`
  )

  const confirmarB = await pedir('POST', `/pedidos/${pedidoB.id}/pago/confirmar`, {
    token: tokenAdmin,
  })
  comprobar(
    'admin confirma el abono del 50 %',
    confirmarB.status === 200 &&
      confirmarB.data?.monto_pagado === Math.round(variante.precio * 0.5) &&
      confirmarB.data?.estado_pago === 'Pago confirmado',
    `status=${confirmarB.status} monto=${confirmarB.data?.monto_pagado} estado=${confirmarB.data?.estado_pago}`
  )

  // Contra entrega también está permitida con Transportadora (fuera del
  // Valle de Aburrá).
  const crearContraTransportadora = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: {
      items: [{ id_variante: variante.id_variante, cantidad: 1 }],
      metodo_pago: 'Contra entrega',
      banco: 'Nequi',
      metodo_envio: 'Transportadora',
      nombre_entrega: 'Cliente Prueba',
      telefono_entrega: '3001112233',
      ...FUERA_VALLE,
    },
  })
  const pedidoContraTransportadora = crearContraTransportadora.data
  comprobar('contra entrega con Transportadora -> 201', crearContraTransportadora.status === 201, `status=${crearContraTransportadora.status} error=${pedidoContraTransportadora?.error}`)
  comprobar('contra entrega fuera del Valle usa Transportadora', pedidoContraTransportadora?.metodo_envio === 'Transportadora', `metodo=${pedidoContraTransportadora?.metodo_envio}`)
  comprobar(
    'contra entrega con Transportadora nace pendiente',
    pedidoContraTransportadora?.monto_pagado === 0 &&
      pedidoContraTransportadora?.estado_pago === 'Pendiente de verificación',
    `monto=${pedidoContraTransportadora?.monto_pagado} estado=${pedidoContraTransportadora?.estado_pago}`
  )

  if (!pedidoB?.id) {
    console.error('No se creó el segundo pedido; se omiten sus pruebas.')
    return
  }

  const vendedorPasaEstado = await pedir('PATCH', `/pedidos/${pedidoB.id}/estado`, {
    token: tokenVendedor,
    body: { estado: 'En preparación' },
  })
  comprobar('vendedor PATCH estado -> 200', vendedorPasaEstado.status === 200 && vendedorPasaEstado.data?.estado === 'En preparación', `status=${vendedorPasaEstado.status} estado=${vendedorPasaEstado.data?.estado}`)

  const aEntregado = await pedir('PATCH', `/pedidos/${pedidoB.id}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Entregado' },
  })
  comprobar('PATCH a Entregado -> 200', aEntregado.status === 200 && aEntregado.data?.estado === 'Entregado', `estado=${aEntregado.data?.estado}`)

  const cancelarEntregado = await pedir('PATCH', `/pedidos/${pedidoB.id}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Cancelado' },
  })
  comprobar('no cancelar Entregado -> 409', cancelarEntregado.status === 409, `status=${cancelarEntregado.status}`)

  const modificarEntregado = await pedir('PATCH', `/pedidos/${pedidoB.id}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Despachado' },
  })
  comprobar('no modificar Entregado -> 409', modificarEntregado.status === 409, `status=${modificarEntregado.status}`)
}

try {
  await main()
} catch (error) {
  console.error('Error inesperado en las pruebas:', error.message)
  fallos += 1
} finally {
  await limpiar()
  await pool.end()
  console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
  process.exitCode = fallos === 0 ? 0 : 1
}
