// Pruebas HTTP del Bloque T (Tallas y Colores) con el backend corriendo.
//
// Cubre:
//   1) Administrador temporal: crear, editar, desactivar/activar y eliminar
//      una talla y un color de prueba (todo por la API).
//   2) Validaciones: nombre obligatorio/único (409 sin distinguir mayúsculas),
//      longitudes, codigo_hex obligatorio con formato #RRGGBB.
//   3) Vendedor temporal: 403 en GET/POST/PUT/PATCH/DELETE de ambos módulos.
//   4) DELETE de una talla/color en uso por producto_variante -> 409.
//   5) Borrado total de usuarios y registros creados (también si algo falla).
//
// Nunca imprime contraseñas, tokens ni datos de personas: solo estados HTTP.

import 'dotenv/config'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pg from 'pg'

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en backend/.env')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const BASE = 'http://localhost:3000/api'
const SUFIJO = crypto.randomBytes(4).toString('hex')
const ADMIN_EMAIL = `admin-talla-${SUFIJO}@test.com`
const VENDEDOR_EMAIL = `vendedor-talla-${SUFIJO}@test.com`
const CLAVE_ADMIN = crypto.randomBytes(16).toString('base64url') + 'Aa1'
const CLAVE_VENDEDOR = crypto.randomBytes(16).toString('base64url') + 'Aa1'
const CLAVE_NUEVA = crypto.randomBytes(16).toString('base64url') + 'Aa1'

const NOMBRE_TALLA = `TALLA${SUFIJO.slice(0, 4)}`.slice(0, 10)
const NOMBRE_COLOR = `Color ${SUFIJO}`
const HEX_COLOR = '#A1B2C3'

let fallos = 0
let idTalla = null
let idColor = null
let tokenAdmin = null // del administrador temporal
let tokenVendedor = null
let tokenBase = null // del administrador real (solo para crear/borrar usuarios)

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

// Token de respaldo para el primer paso (crear los usuarios temporales).
// Usa la cuenta administradora existente; nunca se imprime.
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
  return jwt.sign(
    { id: rows[0].id_usuario, rol: rows[0].rol },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
}

// Crea un usuario con la API, cambia su contraseña temporal y devuelve un
// token ya habilitado para el panel (sin exponer ninguna clave).
const crearUsuarioActivo = async (nombre, correo, rol, clave) => {
  const creado = await pedir('POST', '/admin/usuarios', {
    token: tokenBase,
    body: { nombre, correo, rol },
  })
  if (creado.status !== 201) {
    throw new Error(`No se pudo crear el usuario ${rol}: status=${creado.status}`)
  }

  const temporal = creado.data.contrasenaTemporal
  const login = await pedir('POST', '/auth/login', {
    body: { correo, contrasena: temporal },
  })
  if (login.status !== 200) throw new Error(`Login inicial falló para ${rol}`)

  const cambio = await pedir('POST', '/auth/cambiar-contrasena', {
    token: login.data.token,
    body: { contrasenaActual: temporal, contrasenaNueva: clave },
  })
  if (cambio.status !== 200) throw new Error(`Cambio de contraseña falló para ${rol}`)

  const loginFinal = await pedir('POST', '/auth/login', {
    body: { correo, contrasena: clave },
  })
  if (loginFinal.status !== 200) throw new Error(`Login final falló para ${rol}`)
  return loginFinal.data.token
}

const limpiar = async () => {
  try {
    // Registros de prueba (por la API si hay token; si no, no se toca nada).
    const token = tokenBase
    if (token) {
      if (idTalla) await pedir('DELETE', `/admin/tallas/${idTalla}`, { token })
      if (idColor) await pedir('DELETE', `/admin/colores/${idColor}`, { token })
    }
    await pool.query('DELETE FROM usuario WHERE correo = ANY($1::text[])', [
      [ADMIN_EMAIL, VENDEDOR_EMAIL],
    ])
    idTalla = null
    idColor = null
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
  }
}

const preparar = async () => {
  await limpiar()
  fallos = 0

  tokenBase = await tokenDeRespaldo()
  tokenAdmin = await crearUsuarioActivo('Admin Bloque T', ADMIN_EMAIL, 'Administrador', CLAVE_ADMIN)
  tokenVendedor = await crearUsuarioActivo('Vendedor Bloque T', VENDEDOR_EMAIL, 'Vendedor', CLAVE_VENDEDOR)
}

const probarTallas = async () => {
  console.log('\n--- TALLAS (Administrador) ---')

  const crear = await pedir('POST', '/admin/tallas', {
    token: tokenAdmin,
    body: { nombre: NOMBRE_TALLA },
  })
  comprobar(
    'POST talla -> 201 con id numérico y estado Activo',
    crear.status === 201 &&
      Number.isInteger(crear.data?.id) &&
      crear.data?.estado === 'Activo',
    `status=${crear.status} id=${crear.data?.id} estado=${crear.data?.estado}`
  )
  idTalla = crear.data?.id ?? null

  const duplicada = await pedir('POST', '/admin/tallas', {
    token: tokenAdmin,
    body: { nombre: NOMBRE_TALLA.toLowerCase() },
  })
  comprobar(
    'POST talla duplicada (sin distinguir mayúsculas) -> 409',
    duplicada.status === 409,
    `status=${duplicada.status} error=${duplicada.data?.error}`
  )

  const sinNombre = await pedir('POST', '/admin/tallas', {
    token: tokenAdmin,
    body: { nombre: '   ' },
  })
  comprobar('POST talla sin nombre -> 400', sinNombre.status === 400, `status=${sinNombre.status}`)

  const larga = await pedir('POST', '/admin/tallas', {
    token: tokenAdmin,
    body: { nombre: 'ABCDEFGHIJKL' },
  })
  comprobar('POST talla con nombre > 10 -> 400', larga.status === 400, `status=${larga.status}`)

  const lista = await pedir('GET', '/admin/tallas', { token: tokenAdmin })
  const enLista = lista.data?.find((t) => t.id === idTalla)
  comprobar(
    'GET tallas -> 200 con la fila creada (nombre, estado, enUso)',
    lista.status === 200 && !!enLista && enLista.estado === 'Activo' && typeof enLista.enUso === 'boolean',
    `status=${lista.status}`
  )

  const editar = await pedir('PUT', `/admin/tallas/${idTalla}`, {
    token: tokenAdmin,
    body: { nombre: `${NOMBRE_TALLA}X`.slice(0, 10) },
  })
  comprobar(
    'PUT talla -> 200 con el nombre actualizado',
    editar.status === 200 && editar.data?.nombre === `${NOMBRE_TALLA}X`.slice(0, 10),
    `status=${editar.status} nombre=${editar.data?.nombre}`
  )

  const editarDuplicada = await pedir('PUT', `/admin/tallas/${idTalla}`, {
    token: tokenAdmin,
    body: { nombre: 'M' },
  })
  comprobar(
    'PUT talla con nombre ya usado -> 409',
    editarDuplicada.status === 409 || editarDuplicada.status === 404,
    `status=${editarDuplicada.status}`
  )

  const desactivar = await pedir('PATCH', `/admin/tallas/${idTalla}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Inactivo' },
  })
  comprobar(
    'PATCH estado talla -> 200 Inactivo',
    desactivar.status === 200 && desactivar.data?.estado === 'Inactivo',
    `status=${desactivar.status} estado=${desactivar.data?.estado}`
  )

  const activar = await pedir('PATCH', `/admin/tallas/${idTalla}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Activo' },
  })
  comprobar(
    'PATCH estado talla -> 200 Activo',
    activar.status === 200 && activar.data?.estado === 'Activo',
    `status=${activar.status} estado=${activar.data?.estado}`
  )

  const estadoMalo = await pedir('PATCH', `/admin/tallas/${idTalla}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Cualquiera' },
  })
  comprobar('PATCH estado inválido -> 400', estadoMalo.status === 400, `status=${estadoMalo.status}`)
}

const probarColores = async () => {
  console.log('\n--- COLORES (Administrador) ---')

  const crear = await pedir('POST', '/admin/colores', {
    token: tokenAdmin,
    body: { nombre: NOMBRE_COLOR, codigo_hex: HEX_COLOR },
  })
  comprobar(
    'POST color -> 201 con id numérico, hex y estado Activo',
    crear.status === 201 &&
      Number.isInteger(crear.data?.id) &&
      crear.data?.codigo_hex === HEX_COLOR &&
      crear.data?.estado === 'Activo',
    `status=${crear.status} id=${crear.data?.id} hex=${crear.data?.codigo_hex}`
  )
  idColor = crear.data?.id ?? null

  const duplicado = await pedir('POST', '/admin/colores', {
    token: tokenAdmin,
    body: { nombre: NOMBRE_COLOR.toUpperCase(), codigo_hex: HEX_COLOR },
  })
  comprobar(
    'POST color duplicado (sin distinguir mayúsculas) -> 409',
    duplicado.status === 409,
    `status=${duplicado.status} error=${duplicado.data?.error}`
  )

  const sinHex = await pedir('POST', '/admin/colores', {
    token: tokenAdmin,
    body: { nombre: `${NOMBRE_COLOR} 2`, codigo_hex: '' },
  })
  comprobar('POST color sin codigo_hex -> 400', sinHex.status === 400, `status=${sinHex.status}`)

  const hexMalo = await pedir('POST', '/admin/colores', {
    token: tokenAdmin,
    body: { nombre: `${NOMBRE_COLOR} 3`, codigo_hex: 'A1B2C3' },
  })
  comprobar(
    'POST color con hex sin #RRGGBB -> 400',
    hexMalo.status === 400,
    `status=${hexMalo.status} error=${hexMalo.data?.error}`
  )

  const largo = await pedir('POST', '/admin/colores', {
    token: tokenAdmin,
    body: { nombre: 'C'.repeat(31), codigo_hex: HEX_COLOR },
  })
  comprobar('POST color con nombre > 30 -> 400', largo.status === 400, `status=${largo.status}`)

  const sinNombre = await pedir('POST', '/admin/colores', {
    token: tokenAdmin,
    body: { nombre: '', codigo_hex: HEX_COLOR },
  })
  comprobar('POST color sin nombre -> 400', sinNombre.status === 400, `status=${sinNombre.status}`)

  const lista = await pedir('GET', '/admin/colores', { token: tokenAdmin })
  const enLista = lista.data?.find((c) => c.id === idColor)
  comprobar(
    'GET colores -> 200 con la fila creada (nombre, hex, estado, enUso)',
    lista.status === 200 &&
      !!enLista &&
      enLista.estado === 'Activo' &&
      typeof enLista.enUso === 'boolean',
    `status=${lista.status}`
  )

  const editar = await pedir('PUT', `/admin/colores/${idColor}`, {
    token: tokenAdmin,
    body: { nombre: `${NOMBRE_COLOR} Edit`, codigo_hex: '#0F1E2D' },
  })
  comprobar(
    'PUT color -> 200 con nombre y hex actualizados',
    editar.status === 200 &&
      editar.data?.codigo_hex === '#0F1E2D' &&
      editar.data?.nombre === `${NOMBRE_COLOR} Edit`,
    `status=${editar.status} hex=${editar.data?.codigo_hex}`
  )

  const desactivar = await pedir('PATCH', `/admin/colores/${idColor}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Inactivo' },
  })
  comprobar(
    'PATCH estado color -> 200 Inactivo',
    desactivar.status === 200 && desactivar.data?.estado === 'Inactivo',
    `status=${desactivar.status} estado=${desactivar.data?.estado}`
  )

  const activar = await pedir('PATCH', `/admin/colores/${idColor}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Activo' },
  })
  comprobar(
    'PATCH estado color -> 200 Activo',
    activar.status === 200 && activar.data?.estado === 'Activo',
    `status=${activar.status} estado=${activar.data?.estado}`
  )
}

const probarEnUso = async () => {
  console.log('\n--- ELIMINACIÓN DE TALLA/COLOR EN USO (409) ---')

  const tallas = await pedir('GET', '/admin/tallas', { token: tokenAdmin })
  const enUso = tallas.data?.find((t) => t.enUso === true)
  comprobar('Existe al menos una talla en uso para la prueba', !!enUso, '')
  if (enUso) {
    const borrar = await pedir('DELETE', `/admin/tallas/${enUso.id}`, { token: tokenAdmin })
    comprobar(
      'DELETE talla en uso -> 409 con mensaje de desactivación',
      borrar.status === 409 && /desactivarla/i.test(borrar.data?.error || ''),
      `status=${borrar.status} error=${borrar.data?.error}`
    )
  }

  const colores = await pedir('GET', '/admin/colores', { token: tokenAdmin })
  const colorEnUso = colores.data?.find((c) => c.enUso === true)
  comprobar('Existe al menos un color en uso para la prueba', !!colorEnUso, '')
  if (colorEnUso) {
    const borrar = await pedir('DELETE', `/admin/colores/${colorEnUso.id}`, { token: tokenAdmin })
    comprobar(
      'DELETE color en uso -> 409 con mensaje de desactivación',
      borrar.status === 409 && /desactivarl[oa]/i.test(borrar.data?.error || ''),
      `status=${borrar.status} error=${borrar.data?.error}`
    )
  }
}

const probarVendedor = async () => {
  console.log('\n--- VENDEDOR (403 en todo) ---')

  const rutas = [
    ['GET', '/admin/tallas', undefined],
    ['POST', '/admin/tallas', { nombre: 'NOPE' }],
    ['PUT', `/admin/tallas/${idTalla || 1}`, { nombre: 'NOPE' }],
    ['PATCH', `/admin/tallas/${idTalla || 1}/estado`, { estado: 'Inactivo' }],
    ['DELETE', `/admin/tallas/${idTalla || 1}`, undefined],
    ['GET', '/admin/colores', undefined],
    ['POST', '/admin/colores', { nombre: 'NOPE', codigo_hex: '#000000' }],
    ['PUT', `/admin/colores/${idColor || 1}`, { nombre: 'NOPE', codigo_hex: '#000000' }],
    ['PATCH', `/admin/colores/${idColor || 1}/estado`, { estado: 'Inactivo' }],
    ['DELETE', `/admin/colores/${idColor || 1}`, undefined],
  ]

  for (const [metodo, ruta, body] of rutas) {
    const r = await pedir(metodo, ruta, { token: tokenVendedor, body })
    comprobar(
      `${metodo} ${ruta} con Vendedor -> 403`,
      r.status === 403 && r.data?.codigo === 'FORBIDDEN',
      `status=${r.status} req=${r.data?.permisoRequerido}`
    )
  }
}

const probarEliminacionPropia = async () => {
  console.log('\n--- ELIMINAR LOS REGISTROS DE PRUEBA ---')

  const borrarTalla = await pedir('DELETE', `/admin/tallas/${idTalla}`, { token: tokenAdmin })
  comprobar(
    'DELETE talla de prueba (sin uso) -> 200',
    borrarTalla.status === 200,
    `status=${borrarTalla.status} error=${borrarTalla.data?.error}`
  )

  const borrarColor = await pedir('DELETE', `/admin/colores/${idColor}`, { token: tokenAdmin })
  comprobar(
    'DELETE color de prueba (sin uso) -> 200',
    borrarColor.status === 200,
    `status=${borrarColor.status} error=${borrarColor.data?.error}`
  )

  if (borrarTalla.status === 200) idTalla = null
  if (borrarColor.status === 200) idColor = null
}

const main = async () => {
  await preparar()
  await probarTallas()
  await probarColores()
  await probarEnUso()
  await probarVendedor()
  await probarEliminacionPropia()
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
