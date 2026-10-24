import 'dotenv/config'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
// 127.0.0.1 evita que Node resuelva "localhost" a IPv6 (::1).
const BASE = 'http://127.0.0.1:3000/api'

const SUFIX = crypto.randomBytes(4).toString('hex')
const CORREO = `cliente-stock-${SUFIX}@test.com`
const CLAVE = crypto.randomBytes(16).toString('base64url')

let fallos = 0
const comprobar = (nombre, cond, detalle = '') => {
  console.log(`${cond ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!cond) fallos += 1
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
  try { data = await respuesta.json() } catch { data = null }
  return { status: respuesta.status, data }
}

const baseItems = { metodo_pago: 'Transferencia', banco: 'Nequi', direccion: 'Calle 1 # 2-3' }

const pedidoCon = (idVariante, cantidad, extra = {}) =>
  pedir('POST', '/pedidos', {
    token,
    body: { items: [{ id_variante: idVariante, cantidad }], ...baseItems, ...extra },
  })

const stockDe = async (idVariante) => {
  const { rows } = await pool.query('SELECT stock FROM producto_variante WHERE id_variante = $1', [idVariante])
  return rows[0]?.stock
}

const cuentaPedidos = async () => {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM pedido WHERE id_usuario = $1', [idUsuario])
  return rows[0].n
}

let token = null
let idUsuario = null
const creados = { productos: [], variantes: [] }

const nuevoProducto = async (nombre, precio, stock, { estado = true } = {}) => {
  const { rows: p } = await pool.query(
    `INSERT INTO producto (nombre, descripcion, precio, stock_minimo, estado, codigo)
     VALUES ($1, $2, $3, 0, $4, $5)
     RETURNING id_producto`,
    [nombre, 'Prueba temporal de control de stock', precio, estado, `STOCK-${SUFIX}-${creados.productos.length}`]
  )
  const idProducto = p[0].id_producto
  creados.productos.push(idProducto)

  const { rows: v } = await pool.query(
    'INSERT INTO producto_variante (id_producto, stock) VALUES ($1, $2) RETURNING id_variante',
    [idProducto, stock]
  )
  creados.variantes.push(v[0].id_variante)
  return v[0].id_variante
}

const limpiar = async () => {
  try {
    const idsPedido = (await pool.query('SELECT id_pedido FROM pedido WHERE id_usuario = $1', [idUsuario])).rows.map((r) => r.id_pedido)
    if (idsPedido.length) {
      await pool.query('DELETE FROM pago WHERE id_pedido = ANY($1::int[])', [idsPedido])
      await pool.query('DELETE FROM detalle_pedido WHERE id_pedido = ANY($1::int[])', [idsPedido])
      await pool.query('DELETE FROM domicilio WHERE id_pedido = ANY($1::int[])', [idsPedido])
      await pool.query('DELETE FROM pedido WHERE id_pedido = ANY($1::int[])', [idsPedido])
    }
    if (creados.variantes.length) {
      await pool.query('DELETE FROM producto_variante WHERE id_variante = ANY($1::int[])', [creados.variantes])
    }
    if (creados.productos.length) {
      await pool.query('DELETE FROM producto WHERE id_producto = ANY($1::int[])', [creados.productos])
    }
    if (idUsuario) await pool.query('DELETE FROM usuario WHERE id_usuario = $1', [idUsuario])
    console.log(`\n=== LIMPIEZA === pedidos=${idsPedido.length} variantes=${creados.variantes.length} productos=${creados.productos.length} usuario=${idUsuario ? 1 : 0}`)
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
  }
}

const main = async () => {
  // 1) Cliente de prueba + token
  const rol = await pool.query("SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Cliente'")
  if (!rol.rows[0].id) throw new Error("Falta el rol 'Cliente'")
  const hash = await bcrypt.hash(CLAVE, 10)
  const { rows } = await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado)
     VALUES ('Stock', 'Prueba', $1, $2, $3, TRUE) RETURNING id_usuario`,
    [CORREO, hash, rol.rows[0].id]
  )
  idUsuario = rows[0].id_usuario

  const login = await pedir('POST', '/auth/login', { body: { correo: CORREO, contrasena: CLAVE } })
  comprobar('login cliente de prueba (200)', login.status === 200, `status=${login.status}`)
  token = login.data?.token
  if (!token) throw new Error('No se obtuvo token')

  // 2) Productos con stock controlado
  const vStock1 = await nuevoProducto(`STOCK UNIDAD ${SUFIX}`, 1000, 1)
  const vStock7 = await nuevoProducto(`STOCK SIETE ${SUFIX}`, 2000, 7)
  const vStock10 = await nuevoProducto(`STOCK DIEZ ${SUFIX}`, 500, 10)
  const vAgotado = await nuevoProducto(`STOCK CERO ${SUFIX}`, 900, 0)
  const vInactivo = await nuevoProducto(`STOCK INACTIVO ${SUFIX}`, 700, 5, { estado: false })
  const vCarrera = await nuevoProducto(`STOCK CARRERA ${SUFIX}`, 300, 1)

  const pedidosBase = await cuentaPedidos()

  // 3) Stock insuficiente: pide 2 con 1 disponible
  const excede = await pedidoCon(vStock1, 2)
  comprobar('stock insuficiente -> 409', excede.status === 409, `status=${excede.status}`)
  comprobar('mensaje informa unidades disponibles', /disponible[s]?:?\s*1/i.test(String(excede.data?.error || '')), `msg=${excede.data?.error}`)
  comprobar('stock intacto tras 409', (await stockDe(vStock1)) === 1, `stock=${await stockDe(vStock1)}`)
  comprobar('no se creó ningún pedido (409)', (await cuentaPedidos()) === pedidosBase)

  // 4) Compra exacta del último disponible
  const exacta = await pedidoCon(vStock1, 1)
  comprobar('cantidad igual al stock -> 201', exacta.status === 201, `status=${exacta.status} ${JSON.stringify(exacta.data)}`)
  comprobar('stock queda en 0', (await stockDe(vStock1)) === 0, `stock=${await stockDe(vStock1)}`)
  comprobar('total calculado por el backend', exacta.data?.total === 1000, `total=${exacta.data?.total}`)
  comprobar('estado inicial Registrado', exacta.data?.estado === 'Registrado', `estado=${exacta.data?.estado}`)

  // 5) Producto ahora agotado
  const agotado = await pedidoCon(vStock1, 1)
  comprobar('producto agotado -> 409', agotado.status === 409, `status=${agotado.status}`)
  comprobar('mensaje indica 0 disponibles', /disponible[s]?:?\s*0/i.test(String(agotado.data?.error || '')), `msg=${agotado.data?.error}`)
  comprobar('agotado no crea pedido', (await cuentaPedidos()) === pedidosBase + 1)

  // 6) El catálogo refleja el stock 0 (fuente del refresco del frontend)
  const catalogo = await pedir('GET', '/productos')
  const fila = Array.isArray(catalogo.data) ? catalogo.data.find((r) => r.id_variante === vStock1) : null
  comprobar('GET /productos devuelve la variante', Boolean(fila))
  comprobar('GET /productos reporta stock 0', fila?.stock === 0, `stock=${fila?.stock}`)

  // 7) Cantidades inválidas (400) sin tocar el stock
  for (const [etiqueta, cantidad] of [['0', 0], ['-1', -1], ['2.5', 2.5], ['texto', 'abc'], ['vacía', '']]) {
    const r = await pedidoCon(vStock7, cantidad)
    comprobar(`cantidad ${etiqueta} -> 400`, r.status === 400, `status=${r.status} msg=${r.data?.error}`)
  }
  comprobar('stock 7 intacto tras cantidades inválidas', (await stockDe(vStock7)) === 7, `stock=${await stockDe(vStock7)}`)

  const varianteInexistente = await pedidoCon(99999999, 1)
  comprobar('variante inexistente -> 400', varianteInexistente.status === 400, `status=${varianteInexistente.status}`)

  const varianteAgotada = await pedidoCon(vAgotado, 1)
  comprobar('variante con stock 0 -> 409', varianteAgotada.status === 409, `status=${varianteAgotada.status}`)

  // 8) Producto inactivo
  const inactivo = await pedidoCon(vInactivo, 1)
  comprobar('producto inactivo -> 409', inactivo.status === 409, `status=${inactivo.status}`)
  comprobar('mensaje de producto no disponible', /no est[aá] disponible/i.test(String(inactivo.data?.error || '')), `msg=${inactivo.data?.error}`)
  comprobar('stock del inactivo intacto', (await stockDe(vInactivo)) === 5, `stock=${await stockDe(vInactivo)}`)

  // 9) Descontar el stock completo de una variante
  const todo = await pedidoCon(vStock10, 10)
  comprobar('compra del 100% del stock -> 201', todo.status === 201, `status=${todo.status} ${JSON.stringify(todo.data)}`)
  comprobar('stock 10 queda en 0', (await stockDe(vStock10)) === 0, `stock=${await stockDe(vStock10)}`)
  const despuesTodo = await pedidoCon(vStock10, 1)
  comprobar('y luego -> 409', despuesTodo.status === 409, `status=${despuesTodo.status}`)

  // 10) Carrera: dos pedidos simultáneos por la última unidad
  const antesCarrera = await cuentaPedidos()
  const [a, b] = await Promise.all([pedidoCon(vCarrera, 1), pedidoCon(vCarrera, 1)])
  const estados = [a.status, b.status].sort()
  comprobar('carrera: exactamente un 201 y un 409', estados[0] === 201 && estados[1] === 409, `statuses=${estados.join(',')}`)
  comprobar('carrera: stock final 0', (await stockDe(vCarrera)) === 0, `stock=${await stockDe(vCarrera)}`)
  comprobar('carrera: solo un pedido nuevo', (await cuentaPedidos()) === antesCarrera + 1, `pedidos=${await cuentaPedidos()} antes=${antesCarrera}`)

  // 11) Acumulación en el mismo pedido (dos líneas con la misma variante)
  const vAcum = await nuevoProducto(`STOCK ACUMULA ${SUFIX}`, 100, 5)
  const acum = await pedir('POST', '/pedidos', {
    token,
    body: {
      items: [
        { id_variante: vAcum, cantidad: 3 },
        { id_variante: vAcum, cantidad: 3 },
      ],
      ...baseItems,
    },
  })
  comprobar('dos líneas iguales que suman 6 con stock 5 -> 409', acum.status === 409, `status=${acum.status} msg=${acum.data?.error}`)
  comprobar('stock de la acumulada intacto', (await stockDe(vAcum)) === 5, `stock=${await stockDe(vAcum)}`)

  const acumOk = await pedir('POST', '/pedidos', {
    token,
    body: {
      items: [
        { id_variante: vAcum, cantidad: 3 },
        { id_variante: vAcum, cantidad: 2 },
      ],
      ...baseItems,
    },
  })
  comprobar('dos líneas iguales que suman 5 con stock 5 -> 201', acumOk.status === 201, `status=${acumOk.status} msg=${acumOk.data?.error}`)
  comprobar('stock de la acumulada queda en 0', (await stockDe(vAcum)) === 0, `stock=${await stockDe(vAcum)}`)
}

try {
  await main()
} catch (error) {
  console.error('Error inesperado en las pruebas de stock:', error.message)
  fallos += 1
} finally {
  await limpiar()
  await pool.end()
  console.log(`\n=== RESULTADO STOCK: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
  process.exitCode = fallos === 0 ? 0 : 1
}
