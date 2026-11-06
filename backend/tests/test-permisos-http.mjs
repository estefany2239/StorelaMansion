// Verificación HTTP de la autorización por permisos, con el backend corriendo.
//
// Genera los tokens firmando JWT con JWT_SECRET (dotenv/config) para un
// usuario real de cada rol (creados aquí como prueba y eliminados al final).
// Nunca imprime secretos: solo estados HTTP y resultados.
//
// Comprobaciones:
//   1) GET  /api/admin/usuarios        (Administrador) -> 200
//   2) GET  /api/admin/usuarios        (Vendedor)      -> 403
//   3) PATCH /api/pedidos/:id/estado   (Vendedor)      -> distinto de 403
//   4) GET  /api/admin/roles           (Administrador) -> 200

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
const SUFijo = crypto.randomBytes(4).toString('hex')
const ADMIN_EMAIL = `admin-http-${SUFijo}@test.com`
const VENDEDOR_EMAIL = `vendedor-http-${SUFijo}@test.com`

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

// Firma el mismo JWT que crearToken() en src/routes/auth.js.
const firmarToken = (usuario) =>
  jwt.sign({ id: usuario.id_usuario, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '8h' })

const limpiar = async () => {
  try {
    if (idPedido) {
      await pool.query('DELETE FROM pedido WHERE id_pedido = $1', [idPedido])
      idPedido = null
    }
    await pool.query('DELETE FROM usuario WHERE correo = ANY($1::text[])', [
      [ADMIN_EMAIL, VENDEDOR_EMAIL],
    ])
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
  }
}

const preparar = async () => {
  await limpiar()
  fallos = 0

  const roles = await pool.query('SELECT id_rol, nombre FROM rol WHERE estado = TRUE')
  const rolAdmin = roles.rows.find((r) => r.nombre === 'Administrador')
  const rolVendedor = roles.rows.find((r) => r.nombre === 'Vendedor')
  if (!rolAdmin || !rolVendedor) throw new Error('Faltan los roles Administrador/Vendedor')

  const hash = await bcrypt.hash(crypto.randomBytes(16).toString('base64url'), 10)

  const admin = await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado)
     VALUES ('Admin', 'HTTP', $1, $2, $3, TRUE)
     RETURNING id_usuario`,
    [ADMIN_EMAIL, hash, rolAdmin.id_rol]
  )
  const vendedor = await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado)
     VALUES ('Vendedor', 'HTTP', $1, $2, $3, TRUE)
     RETURNING id_usuario`,
    [VENDEDOR_EMAIL, hash, rolVendedor.id_rol]
  )

  const pedido = await pool.query(
    `INSERT INTO pedido (id_usuario, fecha, subtotal, descuento, iva, total, estado)
     VALUES ($1, CURRENT_DATE, 0, 0, 0, 0, 'Registrado') RETURNING id_pedido`,
    [admin.rows[0].id_usuario]
  )
  idPedido = pedido.rows[0].id_pedido

  return {
    tokenAdmin: firmarToken({ id_usuario: admin.rows[0].id_usuario, rol: 'Administrador' }),
    tokenVendedor: firmarToken({ id_usuario: vendedor.rows[0].id_usuario, rol: 'Vendedor' }),
  }
}

const main = async () => {
  const { tokenAdmin, tokenVendedor } = await preparar()

  const r1 = await pedir('GET', '/admin/usuarios', { token: tokenAdmin })
  comprobar('1) GET /api/admin/usuarios con Administrador -> 200', r1.status === 200, `status=${r1.status}`)

  const r2 = await pedir('GET', '/admin/usuarios', { token: tokenVendedor })
  comprobar(
    '2) GET /api/admin/usuarios con Vendedor -> 403',
    r2.status === 403 && r2.data?.codigo === 'FORBIDDEN',
    `status=${r2.status} codigo=${r2.data?.codigo} permisoRequerido=${r2.data?.permisoRequerido}`
  )

  const r3 = await pedir('PATCH', `/pedidos/${idPedido}/estado`, {
    token: tokenVendedor,
    body: { estado: 'En preparación' },
  })
  comprobar(
    '3) PATCH /api/pedidos/:id/estado con Vendedor -> distinto de 403',
    r3.status !== 403,
    `status=${r3.status}`
  )

  const r4 = await pedir('GET', '/admin/roles', { token: tokenAdmin })
  comprobar('4) GET /api/admin/roles con Administrador -> 200', r4.status === 200, `status=${r4.status}`)
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
