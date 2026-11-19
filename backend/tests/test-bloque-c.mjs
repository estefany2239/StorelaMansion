// Pruebas HTTP del Bloque C (código de producto PROD-000001 y tallas según
// la categoría) con el backend corriendo.
//
// Cubre (todo por la API, sin SQL de modificación):
//   1) GET /catalogos: categorías con tipo_talla y tallas con tipo deducido.
//   2) Tenis (numerica): talla 38 -> 201; talla M -> 400.
//   3) Camiseta (letra): talla M -> 201; talla 38 -> 400.
//   4) Gorra (ninguna): sin talla -> 201 con id_talla NULL; con talla -> 400.
//   5) El código sale PROD-xxxxxx y no cambia al editar.
//   6) Las gorras existentes siguen apareciendo en la tienda pública.
//
// Borra todos los productos creados al terminar, incluso si algo falla.
// Nunca imprime contraseñas, tokens ni datos de personas.

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

let fallos = 0
let token = null
const creados = [] // ids de variantes creadas por la prueba

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

const pedir = async (metodo, ruta, body) => {
  const headers = { 'Content-Type': 'application/json' }
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

// Token de respaldo de una cuenta administradora activa (solo se usa el id y
// el rol para firmar; nunca se imprime ningún dato personal).
const tokenDeRespaldo = async () => {
  const { rows } = await pool.query(
    `SELECT u.id_usuario, r.nombre AS rol
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE r.nombre = 'Administrador'
        AND u.estado = TRUE
        AND u.cambio_contrasena_obligatorio = FALSE
      ORDER BY u.id_usuario
      LIMIT 1`
  )
  if (rows.length === 0) throw new Error('No hay ninguna cuenta administradora activa disponible')
  return jwt.sign({ id: rows[0].id_usuario, rol: rows[0].rol }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  })
}

const limpiar = async () => {
  try {
    for (const id of creados.splice(0)) {
      await pedir('DELETE', `/admin/productos/${id}`)
    }
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
  }
}

const productoBase = (categoria, talla, extra = {}) => ({
  nombre: `Prueba Bloque C ${SUFIJO} ${categoria} ${talla || 'sin talla'}`,
  categoria,
  genero: 'mujer',
  talla,
  color: extra.color,
  precio: 1000,
  stock: 1,
  estado: 'Activo',
  imagen: '',
  ...extra.campos,
})

const main = async () => {
  token = await tokenDeRespaldo()

  console.log('\n--- CATALOGOS ---')
  const cat = await pedir('GET', '/admin/productos/catalogos')
  comprobar('GET /catalogos -> 200', cat.status === 200, `status=${cat.status}`)

  const porCodigo = new Map((cat.data?.categorias || []).map((c) => [c.id, c]))
  comprobar('Tenis tiene tipo_talla numerica', porCodigo.get('tenis')?.tipoTalla === 'numerica',
    `tipo=${porCodigo.get('tenis')?.tipoTalla}`)
  for (const codigo of ['camisetas', 'busos', 'blusas', 'pantalonetas', 'vestidos']) {
    comprobar(`Categoria ${codigo} tiene tipo_talla letra`, porCodigo.get(codigo)?.tipoTalla === 'letra',
      `tipo=${porCodigo.get(codigo)?.tipoTalla}`)
  }
  for (const codigo of ['gorras', 'perfumes', 'relojes']) {
    comprobar(`Categoria ${codigo} tiene tipo_talla ninguna`, porCodigo.get(codigo)?.tipoTalla === 'ninguna',
      `tipo=${porCodigo.get(codigo)?.tipoTalla}`)
  }

  const tallas = cat.data?.tallas || []
  comprobar('Las tallas vienen como { nombre, tipo }', tallas.every((t) => t.nombre && t.tipo),
    `ejemplo=${JSON.stringify(tallas[0])}`)
  for (const esperada of ['37.5', '38.5', '39', '39.5', '40', '41', '42', 'XXL']) {
    comprobar(`Existe la talla ${esperada}`, tallas.some((t) => t.nombre === esperada))
  }
  comprobar('La talla 38.5 se deduce numérica', tallas.find((t) => t.nombre === '38.5')?.tipo === 'numerica')
  comprobar('La talla XXL se deduce de letra', tallas.find((t) => t.nombre === 'XXL')?.tipo === 'letra')

  const color = (cat.data?.colores || [])[0]
  comprobar('Hay al menos un color activo para las pruebas', Boolean(color), `color=${color}`)
  if (!color) throw new Error('No hay colores activos')

  console.log('\n--- TENIS (numerica) ---')
  const tenisOk = await pedir('POST', '/admin/productos', productoBase('Tenis', '38', { color }))
  comprobar('POST tenis con talla 38 -> 201', tenisOk.status === 201, `status=${tenisOk.status} error=${tenisOk.data?.error}`)
  if (tenisOk.status === 201) creados.push(tenisOk.data.id)
  comprobar(
    'El tenis creado tiene codigo PROD-xxxxxx',
    /^PROD-\d{6}$/.test(tenisOk.data?.codigo || ''),
    `codigo=${tenisOk.data?.codigo}`
  )
  comprobar('El tenis creado conserva la talla 38', tenisOk.data?.talla === '38', `talla=${tenisOk.data?.talla}`)

  const tenisMala = await pedir('POST', '/admin/productos', productoBase('Tenis', 'M', { color }))
  comprobar(
    'POST tenis con talla M -> 400 con mensaje claro',
    tenisMala.status === 400 && /num[eé]ricas/i.test(tenisMala.data?.error || ''),
    `status=${tenisMala.status} error=${tenisMala.data?.error}`
  )

  console.log('\n--- CAMISETA (letra) ---')
  const camisetaOk = await pedir('POST', '/admin/productos', productoBase('Camisetas', 'M', { color }))
  comprobar('POST camiseta con talla M -> 201', camisetaOk.status === 201, `status=${camisetaOk.status} error=${camisetaOk.data?.error}`)
  if (camisetaOk.status === 201) creados.push(camisetaOk.data.id)
  comprobar(
    'La camiseta creada tiene codigo PROD-xxxxxx',
    /^PROD-\d{6}$/.test(camisetaOk.data?.codigo || ''),
    `codigo=${camisetaOk.data?.codigo}`
  )

  const camisetaMala = await pedir('POST', '/admin/productos', productoBase('Camisetas', '38', { color }))
  comprobar(
    'POST camiseta con talla 38 -> 400 con mensaje claro',
    camisetaMala.status === 400 && /letra/i.test(camisetaMala.data?.error || ''),
    `status=${camisetaMala.status} error=${camisetaMala.data?.error}`
  )

  console.log('\n--- GORRA (ninguna) ---')
  const gorraOk = await pedir('POST', '/admin/productos', productoBase('Gorras', '', { color }))
  comprobar('POST gorra sin talla -> 201', gorraOk.status === 201, `status=${gorraOk.status} error=${gorraOk.data?.error}`)
  if (gorraOk.status === 201) creados.push(gorraOk.data.id)
  comprobar('La gorra creada queda con talla NULL', gorraOk.data?.talla == null, `talla=${gorraOk.data?.talla}`)
  comprobar(
    'La gorra creada tiene codigo PROD-xxxxxx',
    /^PROD-\d{6}$/.test(gorraOk.data?.codigo || ''),
    `codigo=${gorraOk.data?.codigo}`
  )

  const gorraConTalla = await pedir('POST', '/admin/productos', productoBase('Gorras', 'M', { color }))
  comprobar(
    'POST gorra con talla -> 400 con mensaje claro',
    gorraConTalla.status === 400 && /no lleva talla/i.test(gorraConTalla.data?.error || ''),
    `status=${gorraConTalla.status} error=${gorraConTalla.data?.error}`
  )

  console.log('\n--- EL CODIGO NO CAMBIA AL EDITAR ---')
  if (tenisOk.status === 201) {
    const editar = await pedir('PUT', `/admin/productos/${tenisOk.data.id}`, {
      ...productoBase('Tenis', '38', { color }),
      nombre: `Prueba Bloque C editada ${SUFIJO}`,
      codigo: 'PROD-999999',
      precio: 2000,
    })
    comprobar('PUT del tenis -> 200', editar.status === 200, `status=${editar.status} error=${editar.data?.error}`)
    comprobar(
      'El codigo sigue siendo el original tras editar',
      editar.data?.codigo === tenisOk.data?.codigo,
      `antes=${tenisOk.data?.codigo} despues=${editar.data?.codigo}`
    )
  }

  console.log('\n--- GORRAS EN LA TIENDA PUBLICA ---')
  const tienda = await pedir('GET', '/productos?categoria=Gorras')
  comprobar('GET /api/productos?categoria=Gorras -> 200', tienda.status === 200, `status=${tienda.status}`)
  const gorras = (tienda.data || []).filter((p) => p.categoria === 'Gorras')
  comprobar('Hay gorras visibles en la tienda', gorras.length > 0, `total=${gorras.length}`)
  comprobar('Las gorras de la tienda no traen talla', gorras.every((p) => p.talla == null))
  comprobar(
    'Las gorras de la tienda traen id_variante para agregar al carrito',
    gorras.every((p) => Number.isInteger(p.id_variante) && p.id_variante > 0)
  )
}

main()
  .catch((error) => {
    console.error('Error inesperado en las pruebas:', error.message)
    fallos += 1
  })
  .finally(async () => {
    await limpiar()
    await pool.end()
    console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
    process.exitCode = fallos === 0 ? 0 : 1
  })
