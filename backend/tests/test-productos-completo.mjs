// Pruebas HTTP del alta/edición de productos con variantes por categoría.
// Requiere el backend corriendo y backend/.env con JWT_SECRET y DATABASE_URL.
//
// Cubre:
//   1) Camisetas (letra): S/M/L; editar solo S conserva M y L intactas.
//   2) Tenis (numerica): 38 y 38.5.
//   3) Gorras/Perfumes (ninguna): una variante sin talla con stock general.
//   4) Validaciones: stock negativo/decimal, tallas repetidas y color único.
//   5) Ventas: selector y venta de un producto sin talla.
//   6) DELETE de una variante con venta -> 409; sin venta -> 200.
//   7) Vendedor sin permiso de Productos -> 403.
//
// Limpia los productos, ventas y usuarios temporales creados.

import 'dotenv/config'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import pg from 'pg'

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en backend/.env')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const PUERTO = process.env.PORT || 3000
const BASE = `http://localhost:${PUERTO}/api`
const SUFIJO = crypto.randomBytes(4).toString('hex')
const CORREO_VENDEDOR = `vendedor-completo-${SUFIJO}@test.com`

let fallos = 0
let token = null
let tokenVendedor = null
let idVendedor = null
const productos = new Set()
const ventas = new Set()

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

const pedir = async (metodo, ruta, body, usarToken = token) => {
  const headers = { 'Content-Type': 'application/json' }
  if (usarToken) headers.Authorization = `Bearer ${usarToken}`
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

const tokenDeRol = async (rol) => {
  const { rows } = await pool.query(
    `SELECT u.id_usuario
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE r.nombre = $1
        AND u.estado = TRUE
        AND u.cambio_contrasena_obligatorio = FALSE
      ORDER BY u.id_usuario
      LIMIT 1`,
    [rol]
  )
  if (rows.length === 0) throw new Error(`No hay un usuario ${rol} activo`)
  return jwt.sign({ id: rows[0].id_usuario, rol }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

const crearVendedor = async () => {
  const { rows: rol } = await pool.query("SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Vendedor'")
  if (!rol[0].id) throw new Error("Falta el rol 'Vendedor'")

  const { rows } = await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado, cambio_contrasena_obligatorio)
     VALUES ('Vendedor', 'Prueba', $1, $2, $3, TRUE, FALSE)
     RETURNING id_usuario`,
    [CORREO_VENDEDOR, crypto.randomBytes(24).toString('base64url'), rol[0].id]
  )
  idVendedor = rows[0].id_usuario
  return jwt.sign({ id: idVendedor, rol: 'Vendedor' }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

const limpiar = async () => {
  try {
    if (ventas.size > 0) {
      const ids = [...ventas]
      await pool.query('DELETE FROM detalle_venta WHERE id_venta = ANY($1::int[])', [ids])
      await pool.query('DELETE FROM venta WHERE id_venta = ANY($1::int[])', [ids])
    }
    if (productos.size > 0) {
      const ids = [...productos]
      await pool.query('DELETE FROM producto_variante WHERE id_producto = ANY($1::int[])', [ids])
      await pool.query('DELETE FROM producto WHERE id_producto = ANY($1::int[])', [ids])
    }
    if (idVendedor) {
      await pool.query('DELETE FROM usuario WHERE id_usuario = $1', [idVendedor])
    }
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
  }
  await pool.end()
}

const base = (extra = {}) => ({
  nombre: `Prueba completo ${SUFIJO}`,
  categoria: 'Camisetas',
  genero: 'mujer',
  precio: 1000,
  estado: 'Activo',
  imagen: '',
  ...extra,
})

const variante = (producto, talla) =>
  (producto?.variantes || []).find((v) => (v.talla ?? null) === (talla ?? null))

const main = async () => {
  token = await tokenDeRol('Administrador')
  tokenVendedor = await crearVendedor()

  const cat = await pedir('GET', '/admin/productos/catalogos')
  comprobar('GET catalogos -> 200', cat.status === 200, `status=${cat.status}`)
  const color = (cat.data?.colores || [])[0]
  comprobar('Hay un color activo para las pruebas', Boolean(color), `color=${color}`)
  if (!color) throw new Error('No hay colores activos')

  console.log('\n--- CAMISETAS (letra) ---')
  const camisa = await pedir('POST', '/admin/productos/completo', base({
    color,
    variantes: [
      { talla: 'S', stock: 2 },
      { talla: 'M', stock: 3 },
      { talla: 'L', stock: 0 },
    ],
  }))
  comprobar('Crear camisa S/M/L -> 201', camisa.status === 201, `status=${camisa.status} error=${camisa.data?.error}`)
  if (camisa.status === 201) productos.add(camisa.data.id_producto)
  const camisaId = camisa.data?.id_producto
  const camisaInicial = camisa.data?.variantes || []
  comprobar('La camisa tiene 3 variantes', camisaInicial.length === 3, `total=${camisaInicial.length}`)
  comprobar('Las 3 variantes comparten el color', camisaInicial.every((v) => v.color === color))
  const s = variante(camisa.data, 'S')
  const m = variante(camisa.data, 'M')
  const l = variante(camisa.data, 'L')

  const editar = await pedir('PUT', `/admin/productos/producto/${camisaId}/completo`, base({
    color,
    variantes: [
      { id_variante: s?.id, talla: 'S', stock: 9 },
      { talla: 'XL', stock: 4 },
    ],
  }))
  comprobar('Editar solo S y agregar XL -> 200', editar.status === 200, `status=${editar.status} error=${editar.data?.error}`)
  const trasEditar = await pedir('GET', `/admin/productos/producto/${camisaId}`)
  comprobar('GET producto -> 200', trasEditar.status === 200, `status=${trasEditar.status}`)
  comprobar('Quedan 4 variantes (no se borraron las omitidas)', (trasEditar.data?.variantes || []).length === 4,
    `total=${(trasEditar.data?.variantes || []).length}`)
  comprobar('S quedó con stock 9', variante(trasEditar.data, 'S')?.stock === 9,
    `stock=${variante(trasEditar.data, 'S')?.stock}`)
  comprobar('M conservó su stock 3', variante(trasEditar.data, 'M')?.stock === 3,
    `stock=${variante(trasEditar.data, 'M')?.stock}`)
  comprobar('L conservó su stock 0', variante(trasEditar.data, 'L')?.stock === 0,
    `stock=${variante(trasEditar.data, 'L')?.stock}`)
  comprobar('XL se agregó con stock 4', variante(trasEditar.data, 'XL')?.stock === 4,
    `stock=${variante(trasEditar.data, 'XL')?.stock}`)
  comprobar('El id de S no cambió', variante(trasEditar.data, 'S')?.id_variante === s?.id,
    `antes=${s?.id} despues=${variante(trasEditar.data, 'S')?.id_variante}`)

  const porCombinacion = await pedir('PUT', `/admin/productos/producto/${camisaId}/completo`, base({
    color,
    variantes: [{ talla: 'M', stock: 5 }],
  }))
  comprobar('Editar M sin id (por producto+talla+color) -> 200', porCombinacion.status === 200,
    `status=${porCombinacion.status} error=${porCombinacion.data?.error}`)
  const trasCombinacion = await pedir('GET', `/admin/productos/producto/${camisaId}`)
  comprobar('Editar por combinación no duplica tallas', (trasCombinacion.data?.variantes || []).length === 4,
    `total=${(trasCombinacion.data?.variantes || []).length}`)
  comprobar('M quedó con stock 5', variante(trasCombinacion.data, 'M')?.stock === 5,
    `stock=${variante(trasCombinacion.data, 'M')?.stock}`)
  comprobar('El id de M se conservó', variante(trasCombinacion.data, 'M')?.id_variante === m?.id,
    `antes=${m?.id} despues=${variante(trasCombinacion.data, 'M')?.id_variante}`)

  const repetida = await pedir('PUT', `/admin/productos/producto/${camisaId}/completo`, base({
    color,
    variantes: [{ talla: 'M', stock: 1 }, { talla: 'M', stock: 2 }],
  }))
  comprobar('Tallas repetidas al editar -> 400', repetida.status === 400,
    `status=${repetida.status} error=${repetida.data?.error}`)

  const negativo = await pedir('PUT', `/admin/productos/producto/${camisaId}/completo`, base({
    color,
    variantes: [{ talla: 'S', stock: -1 }],
  }))
  comprobar('Stock negativo -> 400', negativo.status === 400, `status=${negativo.status}`)

  const decimal = await pedir('PUT', `/admin/productos/producto/${camisaId}/completo`, base({
    color,
    variantes: [{ talla: 'S', stock: 1.5 }],
  }))
  comprobar('Stock decimal -> 400', decimal.status === 400, `status=${decimal.status}`)

  const sinCambios = await pedir('GET', `/admin/productos/producto/${camisaId}`)
  comprobar('Tras los errores, M sigue con stock 5', variante(sinCambios.data, 'M')?.stock === 5,
    `stock=${variante(sinCambios.data, 'M')?.stock}`)
  comprobar('Tras los errores, S sigue con stock 9', variante(sinCambios.data, 'S')?.stock === 9,
    `stock=${variante(sinCambios.data, 'S')?.stock}`)

  console.log('\n--- TENIS (numerica) ---')
  const tenis = await pedir('POST', '/admin/productos/completo', base({
    nombre: `Tenis completo ${SUFIJO}`,
    categoria: 'Tenis',
    color,
    variantes: [
      { talla: '38', stock: 1 },
      { talla: '38.5', stock: 2 },
    ],
  }))
  comprobar('Crear tenis 38/38.5 -> 201', tenis.status === 201,
    `status=${tenis.status} error=${tenis.data?.error}`)
  if (tenis.status === 201) productos.add(tenis.data.id_producto)
  const tenisM = await pedir('POST', '/admin/productos/completo', base({
    nombre: `Tenis inválido ${SUFIJO}`,
    categoria: 'Tenis',
    color,
    variantes: [{ talla: 'M', stock: 1 }],
  }))
  comprobar('Tenis con talla M -> 400 con mensaje de tallas numéricas',
    tenisM.status === 400 && /num[eé]ricas/i.test(tenisM.data?.error || ''),
    `status=${tenisM.status} error=${tenisM.data?.error}`)

  console.log('\n--- GORRAS (ninguna) ---')
  const gorra = await pedir('POST', '/admin/productos/completo', base({
    nombre: `Gorra completa ${SUFIJO}`,
    categoria: 'Gorras',
    color,
    stock: 6,
  }))
  comprobar('Crear gorra con stock general -> 201', gorra.status === 201,
    `status=${gorra.status} error=${gorra.data?.error}`)
  if (gorra.status === 201) productos.add(gorra.data.id_producto)
  const gorraId = gorra.data?.id_producto
  const gorraInicial = gorra.data?.variantes || []
  comprobar('La gorra tiene una sola variante', gorraInicial.length === 1, `total=${gorraInicial.length}`)
  comprobar('La variante de la gorra no tiene talla', gorraInicial[0]?.talla == null,
    `talla=${gorraInicial[0]?.talla}`)
  comprobar('La gorra tiene stock 6', gorraInicial[0]?.stock === 6, `stock=${gorraInicial[0]?.stock}`)

  const gorraEditar = await pedir('PUT', `/admin/productos/producto/${gorraId}/completo`, base({
    nombre: `Gorra completa ${SUFIJO}`,
    categoria: 'Gorras',
    color,
    stock: 8,
  }))
  comprobar('Editar stock general de la gorra -> 200', gorraEditar.status === 200,
    `status=${gorraEditar.status} error=${gorraEditar.data?.error}`)
  const gorraTrasEditar = await pedir('GET', `/admin/productos/producto/${gorraId}`)
  comprobar('La gorra sigue con una variante', (gorraTrasEditar.data?.variantes || []).length === 1)
  comprobar('La gorra quedó con stock 8', variante(gorraTrasEditar.data, null)?.stock === 8,
    `stock=${variante(gorraTrasEditar.data, null)?.stock}`)

  const gorraDos = await pedir('PUT', `/admin/productos/producto/${gorraId}/completo`, base({
    nombre: `Gorra completa ${SUFIJO}`,
    categoria: 'Gorras',
    color,
    variantes: [{ stock: 1 }, { stock: 2 }],
  }))
  comprobar('Gorra con dos variantes -> 400', gorraDos.status === 400, `status=${gorraDos.status}`)

  const gorraTalla = await pedir('PUT', `/admin/productos/producto/${gorraId}/completo`, base({
    nombre: `Gorra completa ${SUFIJO}`,
    categoria: 'Gorras',
    color,
    variantes: [{ talla: 'M', stock: 1 }],
  }))
  comprobar('Gorra con talla -> 400', gorraTalla.status === 400, `status=${gorraTalla.status}`)

  console.log('\n--- PERFUME (ninguna) ---')
  const perfume = await pedir('POST', '/admin/productos/completo', base({
    nombre: `Perfume completo ${SUFIJO}`,
    categoria: 'Perfumes',
    genero: 'hombre',
    color,
    variantes: [{ stock: 3 }],
  }))
  comprobar('Crear perfume sin talla -> 201', perfume.status === 201,
    `status=${perfume.status} error=${perfume.data?.error}`)
  if (perfume.status === 201) productos.add(perfume.data.id_producto)

  console.log('\n--- UN SOLO COLOR POR PRODUCTO ---')
  const dosColores = await pedir('POST', '/admin/productos/completo', base({
    nombre: `Dos colores ${SUFIJO}`,
    color,
    colores: [
      { color, tallas: [{ talla: 'S', stock: 1 }] },
      { color, tallas: [{ talla: 'M', stock: 1 }] },
    ],
  }))
  comprobar('Dos bloques de color -> 400', dosColores.status === 400,
    `status=${dosColores.status} error=${dosColores.data?.error}`)

  console.log('\n--- VENTAS DE UN PRODUCTO SIN TALLA ---')
  const tallasVenta = await pedir('GET', `/ventas/productos/${gorraId}/tallas`)
  comprobar('GET tallas de venta -> 200', tallasVenta.status === 200, `status=${tallasVenta.status}`)
  const sinTalla = (tallasVenta.data || []).find((t) => t.id_talla == null)
  comprobar('Ventas ofrece "Sin talla"', sinTalla?.nombre === 'Sin talla',
    `nombre=${sinTalla?.nombre}`)

  const coloresVenta = await pedir('GET', `/ventas/productos/${gorraId}/colores?talla=`)
  comprobar('GET colores con talla vacía -> 200', coloresVenta.status === 200,
    `status=${coloresVenta.status} error=${coloresVenta.data?.error}`)
  const colorVenta = (coloresVenta.data || []).find((c) => c.nombre === color)
  comprobar('El color de la gorra aparece con stock', colorVenta?.stock === 8,
    `stock=${colorVenta?.stock}`)

  const coloresNull = await pedir('GET', `/ventas/productos/${gorraId}/colores?talla=null`)
  comprobar('GET colores con talla=null (frontend) -> 200', coloresNull.status === 200,
    `status=${coloresNull.status} error=${coloresNull.data?.error}`)

  const varianteVenta = await pedir(
    'GET',
    `/ventas/productos/${gorraId}/variante?talla=&color=${colorVenta?.id}`
  )
  comprobar('GET variante sin talla -> 200', varianteVenta.status === 200,
    `status=${varianteVenta.status} error=${varianteVenta.data?.error}`)
  comprobar('La variante devuelta no tiene talla', varianteVenta.data?.id_talla == null,
    `id_talla=${varianteVenta.data?.id_talla}`)
  const varianteNull = await pedir(
    'GET',
    `/ventas/productos/${gorraId}/variante?talla=null&color=${colorVenta?.id}`
  )
  comprobar('GET variante con talla=null (frontend) -> 200', varianteNull.status === 200,
    `status=${varianteNull.status}`)

  const venta = await pedir('POST', '/ventas', {
    items: [{ id_variante: varianteVenta.data?.id_variante, cantidad: 1 }],
    metodo_pago: 'Efectivo',
    nombre_cliente: 'Prueba Completo',
  })
  comprobar('Vender una gorra desde Ventas -> 201', venta.status === 201,
    `status=${venta.status} error=${venta.data?.error}`)
  if (venta.status === 201) ventas.add(venta.data.id)

  const borrarConVenta = await pedir('DELETE', `/admin/productos/${varianteVenta.data?.id_variante}`)
  comprobar('DELETE variante con venta -> 409', borrarConVenta.status === 409,
    `status=${borrarConVenta.status} error=${borrarConVenta.data?.error}`)

  console.log('\n--- ELIMINAR VARIANTE SIN VENTAS ---')
  const lActual = variante((await pedir('GET', `/admin/productos/producto/${camisaId}`)).data, 'L')
  const borrarLibre = await pedir('DELETE', `/admin/productos/${lActual?.id_variante}`)
  comprobar('DELETE variante sin ventas -> 200', borrarLibre.status === 200,
    `status=${borrarLibre.status} error=${borrarLibre.data?.error}`)
  const trasBorrar = await pedir('GET', `/admin/productos/producto/${camisaId}`)
  comprobar('El producto conserva las demás variantes', (trasBorrar.data?.variantes || []).length === 3,
    `total=${(trasBorrar.data?.variantes || []).length}`)
  comprobar('La variante L ya no está', variante(trasBorrar.data, 'L') == null)

  console.log('\n--- PERMISOS ---')
  const vendedor = await pedir('POST', '/admin/productos/completo', base({
    nombre: `Sin permiso ${SUFIJO}`,
    color,
    variantes: [{ talla: 'S', stock: 1 }],
  }), tokenVendedor)
  comprobar('Vendedor creando producto -> 403', vendedor.status === 403, `status=${vendedor.status}`)
}

main()
  .catch((error) => {
    console.error('Error inesperado en las pruebas:', error.message)
    fallos += 1
  })
  .finally(async () => {
    await limpiar()
    console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
    process.exitCode = fallos === 0 ? 0 : 1
  })
