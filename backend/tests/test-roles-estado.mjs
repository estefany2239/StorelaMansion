// Verificación del módulo Roles por API, con el backend corriendo en :3000.
//
// Comprobaciones:
//   1) Rol temporal: se crea, se desactiva y se reactiva (interruptor operativo)
//   2) Administrador y Cliente: PATCH /estado -> 403 (rol del sistema)
//   3) Administrador y Cliente: DELETE -> 403 (rol del sistema)
//   4) Administrador y Cliente: su estado sigue Activo tras los intentos
//   5) Vendedor: PATCH /estado (Activo) -> distinto de 403 (sigue operativo)
//   6) Login: usuario temporal de administrador -> 200; clave errónea -> 401;
//      usuario público recién registrado -> 200
//   7) El rol temporal se desactiva y se elimina; la lista final no lo contiene
//
// El rol temporal y los usuarios temporales se crean con SQL solo al preparar
// y se borran SIEMPRE al final (aunque una prueba falle). No se imprimen
// contraseñas, tokens ni datos de personas: solo estados HTTP y mensajes.

import 'dotenv/config'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import pg from 'pg'

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en backend/.env')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const BASE = 'http://localhost:3000/api'

const SUFIJO = crypto.randomBytes(4).toString('hex')
const ADMIN_CORREO = `roles-admin-${SUFIJO}@test.com`
const PUBLICO_CORREO = `roles-publico-${SUFIJO}@test.com`
const CLAVE = crypto.randomBytes(18).toString('base64url')
const NOMBRE_ROL_TEMP = `RolPrueba ${SUFIJO}`
const CORREOS_TEMPORALES = [ADMIN_CORREO, PUBLICO_CORREO]

let fallos = 0
let idRolTemporal = null

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
    await pool.query('DELETE FROM usuario WHERE correo = ANY($1::text[])', [CORREOS_TEMPORALES])
    await pool.query(
      'DELETE FROM rol_permiso WHERE id_rol IN (SELECT id_rol FROM rol WHERE nombre = $1)',
      [NOMBRE_ROL_TEMP]
    )
    await pool.query('DELETE FROM rol WHERE nombre = $1', [NOMBRE_ROL_TEMP])
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
  }
}

const preparar = async () => {
  await limpiar()
  fallos = 0

  const roles = await pool.query('SELECT id_rol, nombre FROM rol')
  const rolAdmin = roles.rows.find((r) => r.nombre === 'Administrador')
  if (!rolAdmin) throw new Error('Falta el rol Administrador')

  const hash = await bcrypt.hash(CLAVE, 10)
  await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado, cambio_contrasena_obligatorio)
     VALUES ('Rol', 'Prueba', $1, $2, $3, TRUE, FALSE)`,
    [ADMIN_CORREO, hash, rolAdmin.id_rol]
  )
}

const login = async (correo, contrasena) => {
  const r = await pedir('POST', '/auth/login', { body: { correo, contrasena } })
  return { status: r.status, token: r.data?.token || null }
}

const main = async () => {
  await preparar()

  // --- Acceso de los usuarios ---
  const admin = await login(ADMIN_CORREO, CLAVE)
  comprobar('6a) Login de usuario administrador -> 200', admin.status === 200, `status=${admin.status}`)
  if (!admin.token) throw new Error('No se pudo obtener el token del administrador temporal')

  const mala = await login(ADMIN_CORREO, `otra-clave-${SUFIJO}`)
  comprobar('6b) Login con clave errónea -> 401', mala.status === 401, `status=${mala.status}`)

  const registro = await pedir('POST', '/auth/register', {
    body: { nombre: `Publico ${SUFIJO}`, correo: PUBLICO_CORREO, contrasena: CLAVE },
  })
  comprobar('6c) Registro público -> 201', registro.status === 201, `status=${registro.status}`)

  const publico = await login(PUBLICO_CORREO, CLAVE)
  comprobar('6d) Login de usuario público -> 200', publico.status === 200, `status=${publico.status}`)

  // --- Interruptor de un rol temporal ---
  const creacion = await pedir('POST', '/admin/roles', {
    token: admin.token,
    body: { nombre: NOMBRE_ROL_TEMP, permisos: ['Roles:Consultar'] },
  })
  comprobar('1a) Crear rol temporal -> 201', creacion.status === 201, `status=${creacion.status} ${creacion.data?.error || ''}`)
  idRolTemporal = creacion.data?.id || null
  if (!idRolTemporal) throw new Error('No se pudo crear el rol temporal')

  const aInactivo = await pedir('PATCH', `/admin/roles/${idRolTemporal}/estado`, {
    token: admin.token,
    body: { estado: 'Inactivo' },
  })
  comprobar(
    '1b) Desactivar rol temporal -> 200 e Inactivo',
    aInactivo.status === 200 && aInactivo.data?.estado === 'Inactivo',
    `status=${aInactivo.status} estado=${aInactivo.data?.estado}`
  )

  const aActivo = await pedir('PATCH', `/admin/roles/${idRolTemporal}/estado`, {
    token: admin.token,
    body: { estado: 'Activo' },
  })
  comprobar(
    '1c) Reactivar rol temporal -> 200 e Activo',
    aActivo.status === 200 && aActivo.data?.estado === 'Activo',
    `status=${aActivo.status} estado=${aActivo.data?.estado}`
  )

  // --- Protección de los roles del sistema ---
  const lista = await pedir('GET', '/admin/roles', { token: admin.token })
  const roles = Array.isArray(lista.data) ? lista.data : []
  const adminRol = roles.find((r) => r.nombre === 'Administrador')
  const clienteRol = roles.find((r) => r.nombre === 'Cliente')
  const vendedorRol = roles.find((r) => r.nombre === 'Vendedor')

  comprobar('2a) La lista incluye Administrador y Cliente', Boolean(adminRol && clienteRol))
  if (!adminRol || !clienteRol) throw new Error('No se encontraron los roles del sistema')

  const rAdmin = await pedir('PATCH', `/admin/roles/${adminRol.id}/estado`, {
    token: admin.token,
    body: { estado: 'Inactivo' },
  })
  comprobar(
    '2b) Desactivar Administrador -> 403',
    rAdmin.status === 403 && String(rAdmin.data?.error || '').includes('no se puede desactivar'),
    `status=${rAdmin.status} ${rAdmin.data?.error || ''}`
  )

  const rCliente = await pedir('PATCH', `/admin/roles/${clienteRol.id}/estado`, {
    token: admin.token,
    body: { estado: 'Inactivo' },
  })
  comprobar(
    '2c) Desactivar Cliente -> 403',
    rCliente.status === 403 && String(rCliente.data?.error || '').includes('no se puede desactivar'),
    `status=${rCliente.status} ${rCliente.data?.error || ''}`
  )

  const dAdmin = await pedir('DELETE', `/admin/roles/${adminRol.id}`, { token: admin.token })
  comprobar(
    '3a) Eliminar Administrador -> 403',
    dAdmin.status === 403 && String(dAdmin.data?.error || '').includes('no se puede eliminar'),
    `status=${dAdmin.status} ${dAdmin.data?.error || ''}`
  )

  const dCliente = await pedir('DELETE', `/admin/roles/${clienteRol.id}`, { token: admin.token })
  comprobar(
    '3b) Eliminar Cliente -> 403',
    dCliente.status === 403 && String(dCliente.data?.error || '').includes('no se puede eliminar'),
    `status=${dCliente.status} ${dCliente.data?.error || ''}`
  )

  const trasAdmin = await pedir('GET', `/admin/roles/${adminRol.id}`, { token: admin.token })
  const trasCliente = await pedir('GET', `/admin/roles/${clienteRol.id}`, { token: admin.token })
  comprobar(
    '4) Administrador y Cliente siguen Activo',
    trasAdmin.data?.estado === 'Activo' && trasCliente.data?.estado === 'Activo',
    `admin=${trasAdmin.data?.estado} cliente=${trasCliente.data?.estado}`
  )

  if (vendedorRol) {
    const rVendedor = await pedir('PATCH', `/admin/roles/${vendedorRol.id}/estado`, {
      token: admin.token,
      body: { estado: 'Activo' },
    })
    comprobar(
      '5) Vendedor no está protegido (PATCH Activo) -> distinto de 403',
      rVendedor.status !== 403,
      `status=${rVendedor.status} ${rVendedor.data?.error || ''}`
    )
  } else {
    comprobar('5) Vendedor no está protegido (PATCH Activo) -> distinto de 403', false, 'no existe el rol Vendedor')
  }

  // --- El rol temporal se elimina siempre ---
  const apagado = await pedir('PATCH', `/admin/roles/${idRolTemporal}/estado`, {
    token: admin.token,
    body: { estado: 'Inactivo' },
  })
  comprobar('7a) Desactivar rol temporal para eliminarlo -> 200', apagado.status === 200, `status=${apagado.status}`)

  const borrado = await pedir('DELETE', `/admin/roles/${idRolTemporal}`, { token: admin.token })
  comprobar('7b) Eliminar rol temporal -> 200', borrado.status === 200, `status=${borrado.status}`)

  const final = await pedir('GET', '/admin/roles', { token: admin.token })
  const sigue = (Array.isArray(final.data) ? final.data : []).some((r) => r.nombre === NOMBRE_ROL_TEMP)
  comprobar('7c) El rol temporal ya no aparece en la lista', !sigue)
}

main()
  .catch((error) => {
    console.error('Error inesperado:', error.message)
    fallos += 1
  })
  .finally(async () => {
    await limpiar()
    await pool.end()
    console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
    process.exitCode = fallos === 0 ? 0 : 1
  })
