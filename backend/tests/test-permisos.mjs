// Pruebas de autorización por permisos de BD (sin usar el nombre del rol).
// Requiere el backend corriendo en http://localhost:3000 (npm run dev).
//
// Cubre:
//   - login devuelve `permisos` leídos de la BD (Administrador y Vendedor).
//   - requierePrivilegio: 403 cuando falta el permiso, 200 cuando lo tiene.
//   - El Vendedor recibe 403 en /api/admin/usuarios y 200 en
//     PATCH /api/pedidos/:id/estado.
//   - CRUD de /api/admin/roles con sus reglas.

import 'dotenv/config'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const BASE = 'http://localhost:3000/api'
const ADMIN_EMAIL = 'admin-prueba-permisos@test.com'
const VENDEDOR_EMAIL = 'vendedor-prueba-permisos@test.com'
const EXTRA_EMAIL = 'extra-prueba-permisos@test.com'
const CLAVE_ADMIN = crypto.randomBytes(16).toString('base64url')
const CLAVE_VENDEDOR = crypto.randomBytes(16).toString('base64url')
const CLAVE_EXTRA = crypto.randomBytes(16).toString('base64url')

const ROL_PRUEBA = 'RolPruebaPermisos'
const ROL_CON_USUARIOS = 'RolPruebaConUsuarios'
const CORREOS_PRUEBA = [ADMIN_EMAIL, VENDEDOR_EMAIL, EXTRA_EMAIL]
const ROLES_PRUEBA = [
  ROL_PRUEBA,
  ROL_CON_USUARIOS,
  'RolPermisoMalo',
  'RolCambiarEstado',
  'OtraCosa',
]

let fallos = 0
let idPedido = null

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
    if (idPedido) {
      await pool.query('DELETE FROM pedido WHERE id_pedido = $1', [idPedido])
      idPedido = null
    }
    await pool.query('DELETE FROM usuario WHERE correo = ANY($1::text[])', [CORREOS_PRUEBA])
    await pool.query(
      `DELETE FROM rol_permiso WHERE id_rol IN (SELECT id_rol FROM rol WHERE nombre = ANY($1::text[]))`,
      [ROLES_PRUEBA]
    )
    await pool.query('DELETE FROM rol WHERE nombre = ANY($1::text[])', [ROLES_PRUEBA])
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
  }
}

const preparar = async () => {
  await limpiar()
  fallos = 0

  const roles = await pool.query('SELECT id_rol, nombre FROM rol')
  const idAdmin = roles.rows.find((r) => r.nombre === 'Administrador')?.id_rol
  const idVendedor = roles.rows.find((r) => r.nombre === 'Vendedor')?.id_rol
  if (!idAdmin || !idVendedor) throw new Error('Faltan los roles Administrador/Vendedor')

  const hashAdmin = await bcrypt.hash(CLAVE_ADMIN, 10)
  const hashVendedor = await bcrypt.hash(CLAVE_VENDEDOR, 10)

  const admin = await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado)
     VALUES ('Admin', 'Permisos', $1, $2, $3, TRUE) RETURNING id_usuario`,
    [ADMIN_EMAIL, hashAdmin, idAdmin]
  )
  await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado)
     VALUES ('Vendedor', 'Permisos', $1, $2, $3, TRUE)`,
    [VENDEDOR_EMAIL, hashVendedor, idVendedor]
  )

  const pedido = await pool.query(
    `INSERT INTO pedido (id_usuario, fecha, subtotal, descuento, iva, total, estado)
     VALUES ($1, CURRENT_DATE, 0, 0, 0, 0, 'Registrado') RETURNING id_pedido`,
    [admin.rows[0].id_usuario]
  )
  idPedido = pedido.rows[0].id_pedido

  return { idAdmin, idVendedor }
}

const main = async () => {
  await preparar()

  // ---- Login y permisos ----
  const loginAdmin = await pedir('POST', '/auth/login', {
    body: { correo: ADMIN_EMAIL, contrasena: CLAVE_ADMIN },
  })
  comprobar('login admin (200)', loginAdmin.status === 200, `status=${loginAdmin.status}`)
  const tokenAdmin = loginAdmin.data?.token
  const permisosAdmin = loginAdmin.data?.usuario?.permisos || []
  comprobar(
    'login admin incluye permisos de BD (>=40 y con Usuarios:Consultar)',
    permisosAdmin.includes('Usuarios:Consultar') && permisosAdmin.length >= 40,
    `n=${permisosAdmin.length}`
  )

  const loginVendedor = await pedir('POST', '/auth/login', {
    body: { correo: VENDEDOR_EMAIL, contrasena: CLAVE_VENDEDOR },
  })
  comprobar('login vendedor (200)', loginVendedor.status === 200, `status=${loginVendedor.status}`)
  const tokenVendedor = loginVendedor.data?.token
  const permisosVendedor = loginVendedor.data?.usuario?.permisos || []
  comprobar(
    'login vendedor: exactamente sus 4 permisos',
    permisosVendedor.length === 4 && permisosVendedor.includes('Pedidos:Cambiar estado'),
    JSON.stringify(permisosVendedor)
  )

  // ---- requierePrivilegio en /api/admin/usuarios ----
  const adminUsuarios = await pedir('GET', '/admin/usuarios', { token: tokenAdmin })
  comprobar(
    'admin GET /api/admin/usuarios -> 200',
    adminUsuarios.status === 200,
    `status=${adminUsuarios.status}`
  )

  const vendedorUsuarios = await pedir('GET', '/admin/usuarios', { token: tokenVendedor })
  comprobar(
    'vendedor GET /api/admin/usuarios -> 403 (Usuarios:Consultar)',
    vendedorUsuarios.status === 403 && vendedorUsuarios.data?.codigo === 'FORBIDDEN',
    `status=${vendedorUsuarios.status} codigo=${vendedorUsuarios.data?.codigo} req=${vendedorUsuarios.data?.permisoRequerido}`
  )

  const sinToken = await pedir('GET', '/admin/usuarios')
  comprobar('GET /api/admin/usuarios sin token -> 401', sinToken.status === 401, `status=${sinToken.status}`)

  // ---- Vendedor sí puede cambiar estado de un pedido ----
  const vendedorEstado = await pedir('PATCH', `/pedidos/${idPedido}/estado`, {
    token: tokenVendedor,
    body: { estado: 'En preparación' },
  })
  comprobar(
    'vendedor PATCH /api/pedidos/:id/estado -> 200 (Pedidos:Cambiar estado)',
    vendedorEstado.status === 200,
    `status=${vendedorEstado.status} estado=${vendedorEstado.data?.estado}`
  )

  // ---- Vendedor NO tiene Pedidos:Eliminar (no existe en su rol) ----
  const vendedorLista = await pedir('GET', '/pedidos', { token: tokenVendedor })
  comprobar(
    'vendedor GET /api/pedidos -> 200 (Pedidos:Consultar)',
    vendedorLista.status === 200,
    `status=${vendedorLista.status}`
  )

  // ---- Roles: catálogo y listado ----
  const adminRoles = await pedir('GET', '/admin/roles', { token: tokenAdmin })
  comprobar('admin GET /api/admin/roles -> 200', adminRoles.status === 200, `status=${adminRoles.status}`)

  const vendedorRoles = await pedir('GET', '/admin/roles', { token: tokenVendedor })
  comprobar(
    'vendedor GET /api/admin/roles -> 403 (Roles:Consultar)',
    vendedorRoles.status === 403,
    `status=${vendedorRoles.status}`
  )

  const catalogo = await pedir('GET', '/admin/roles/permisos', { token: tokenAdmin })
  const modulos = catalogo.data?.modulos || []
  comprobar(
    'admin GET /api/admin/roles/permisos -> 200 con módulos',
    catalogo.status === 200 && modulos.length >= 10,
    `status=${catalogo.status} modulos=${modulos.length}`
  )

  // ---- Roles: crear ----
  const crear = await pedir('POST', '/admin/roles', {
    token: tokenAdmin,
    body: { nombre: ROL_PRUEBA, permisos: ['Ventas:Consultar', 'Pedidos:Consultar'] },
  })
  comprobar(
    'admin POST /api/admin/roles -> 201 con id',
    crear.status === 201 && Number.isInteger(crear.data?.id),
    `status=${crear.status} id=${crear.data?.id}`
  )
  const idRol = crear.data?.id

  const duplicado = await pedir('POST', '/admin/roles', {
    token: tokenAdmin,
    body: { nombre: ROL_PRUEBA.toUpperCase(), permisos: [] },
  })
  comprobar(
    'POST rol duplicado (sin distinguir mayúsculas) -> 409',
    duplicado.status === 409,
    `status=${duplicado.status}`
  )

  const nombreVacio = await pedir('POST', '/admin/roles', {
    token: tokenAdmin,
    body: { nombre: '   ', permisos: [] },
  })
  comprobar('POST rol sin nombre -> 400', nombreVacio.status === 400, `status=${nombreVacio.status}`)

  const permisoMalo = await pedir('POST', '/admin/roles', {
    token: tokenAdmin,
    body: { nombre: 'RolPermisoMalo', permisos: ['Inexistente:Consultar'] },
  })
  comprobar('POST rol con permiso inexistente -> 400', permisoMalo.status === 400, `status=${permisoMalo.status}`)

  const cambiarEstadoMalo = await pedir('POST', '/admin/roles', {
    token: tokenAdmin,
    body: { nombre: 'RolCambiarEstado', permisos: ['Productos:Cambiar estado'] },
  })
  comprobar(
    'POST rol con "Productos:Cambiar estado" -> 400 (solo Ventas/Pedidos)',
    cambiarEstadoMalo.status === 400,
    `status=${cambiarEstadoMalo.status} error=${cambiarEstadoMalo.data?.error}`
  )

  // ---- Roles: detalle ----
  const detalle = await pedir('GET', `/admin/roles/${idRol}`, { token: tokenAdmin })
  comprobar(
    'admin GET /api/admin/roles/:id -> 200 con permisos',
    detalle.status === 200 && Array.isArray(detalle.data?.permisos) && detalle.data.permisos.includes('Ventas:Consultar'),
    `status=${detalle.status} permisos=${JSON.stringify(detalle.data?.permisos)}`
  )

  // ---- Roles: editar (reemplaza permisos) ----
  const editado = await pedir('PUT', `/admin/roles/${idRol}`, {
    token: tokenAdmin,
    body: { nombre: ROL_PRUEBA, permisos: ['Pedidos:Consultar', 'Pedidos:Cambiar estado', 'Clientes:Consultar'] },
  })
  comprobar(
    'PUT rol reemplaza permisos -> 200',
    editado.status === 200 &&
      editado.data?.permisos?.length === 3 &&
      editado.data.permisos.includes('Clientes:Consultar') &&
      !editado.data.permisos.includes('Ventas:Consultar'),
    `status=${editado.status} permisos=${JSON.stringify(editado.data?.permisos)}`
  )

  // ---- Roles: rol protegido Administrador ----
  const rolesTodos = await pedir('GET', '/admin/roles', { token: tokenAdmin })
  const idAdminRol = rolesTodos.data?.find((r) => r.nombre === 'Administrador')?.id

  const editarAdmin = await pedir('PUT', `/admin/roles/${idAdminRol}`, {
    token: tokenAdmin,
    body: { nombre: 'OtraCosa', permisos: [] },
  })
  comprobar(
    'PUT rol Administrador -> 403 (protegido)',
    editarAdmin.status === 403,
    `status=${editarAdmin.status}`
  )

  const desactivarAdmin = await pedir('PATCH', `/admin/roles/${idAdminRol}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Inactivo' },
  })
  comprobar(
    'PATCH estado rol Administrador -> 403 (protegido)',
    desactivarAdmin.status === 403,
    `status=${desactivarAdmin.status}`
  )

  const eliminarAdmin = await pedir('DELETE', `/admin/roles/${idAdminRol}`, { token: tokenAdmin })
  comprobar(
    'DELETE rol Administrador -> 403 (protegido)',
    eliminarAdmin.status === 403,
    `status=${eliminarAdmin.status}`
  )

  // ---- Roles: estado del rol de prueba ----
  const desactivarPrueba = await pedir('PATCH', `/admin/roles/${idRol}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Inactivo' },
  })
  comprobar(
    'PATCH estado rol de prueba (sin usuarios) -> 200 Inactivo',
    desactivarPrueba.status === 200 && desactivarPrueba.data?.estado === 'Inactivo',
    `status=${desactivarPrueba.status} estado=${desactivarPrueba.data?.estado}`
  )

  // ---- Roles: no eliminar/desactivar rol con usuarios ----
  const crearConUsuarios = await pedir('POST', '/admin/roles', {
    token: tokenAdmin,
    body: { nombre: ROL_CON_USUARIOS, permisos: ['Pedidos:Consultar'] },
  })
  const idRolConUsuarios = crearConUsuarios.data?.id
  comprobar('POST rol con usuarios -> 201', crearConUsuarios.status === 201, `status=${crearConUsuarios.status}`)

  const hashExtra = await bcrypt.hash(CLAVE_EXTRA, 10)
  await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado)
     VALUES ('Extra', 'Permisos', $1, $2, $3, TRUE)`,
    [EXTRA_EMAIL, hashExtra, idRolConUsuarios]
  )

  const desactivarConUsuarios = await pedir('PATCH', `/admin/roles/${idRolConUsuarios}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Inactivo' },
  })
  comprobar(
    'PATCH estado rol con usuarios -> 409',
    desactivarConUsuarios.status === 409,
    `status=${desactivarConUsuarios.status}`
  )

  const eliminarConUsuarios = await pedir('DELETE', `/admin/roles/${idRolConUsuarios}`, { token: tokenAdmin })
  comprobar(
    'DELETE rol con usuarios -> 409',
    eliminarConUsuarios.status === 409,
    `status=${eliminarConUsuarios.status}`
  )

  // ---- Roles: eliminar rol sin usuarios ----
  const eliminarPrueba = await pedir('DELETE', `/admin/roles/${idRol}`, { token: tokenAdmin })
  comprobar(
    'DELETE rol de prueba (sin usuarios) -> 200',
    eliminarPrueba.status === 200,
    `status=${eliminarPrueba.status}`
  )

  const yaNoExiste = await pedir('GET', `/admin/roles/${idRol}`, { token: tokenAdmin })
  comprobar('GET rol eliminado -> 404', yaNoExiste.status === 404, `status=${yaNoExiste.status}`)
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
