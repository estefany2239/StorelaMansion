// FASE B — denegar por defecto, sesión viva y endurecimiento del servidor.
//
//   1. Toda ruta fuera de la lista blanca exige token (401/403).
//   2. El estado, el rol y el cambio de contraseña se leen de la BASE DE
//      DATOS en cada petición: un token ya emitido deja de servir en cuanto
//      se desactiva la cuenta, se degrada el rol o se borra el usuario.
//   3. Los tokens de un solo uso (recuperación) no sirven como sesión.
//   4. Cuerpo JSON acotado a 100kb y errores que no aterrizan en respuestas
//      500 con mensajes internos.
//   5. El preflight CORS (OPTIONS) se resuelve ANTES del guard: 204 con las
//      cabeceras CORS, nunca 401.
//
// Arranca su propia instancia del backend en un puerto efímero, sin correo
// real (borra BREVO_API_KEY para que además se monte /api/pruebas, que es la
// única ruta protegida por soloRoles('Administrador')).
//
// Reglas que respeta:
// - Nunca imprime contraseñas, tokens ni datos de personas: sólo OK/FALLO,
//   códigos HTTP y rutas.
// - NO ejecuta SQL: la única consulta de lectura es la del administrador. El
//   cliente de prueba se crea y se borra por API (POST /api/clientes y
//   DELETE /api/admin/usuarios/:id).
// - Los marcadores secretos de las pruebas de cuerpo malo se generan aquí y
//   sólo se comprueba que NO aparezcan en la respuesta ni en el registro.
//
// Uso:  node tests/test-seguridad-b.mjs

import 'dotenv/config'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import pg from 'pg'

delete process.env.BREVO_API_KEY
process.env.NODE_ENV = 'test'

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en backend/.env')
  process.exit(1)
}

const { default: app } = await import('../src/app.js')
const { RUTAS_PUBLICAS, esPublica } = await import('../src/middlewares/rutasPublicas.js')
const { pool: poolApp } = await import('../src/config/db.js')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const PREFIJO_API = '/api'

let BASE = ''
let servidor = null
let fallos = 0
let tokenAdmin = null
let idCliente = null

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

// Igual que `pedir` del resto de pruebas, pero también devuelve el texto
// crudo (hace falta para comprobar que un fragmento no se ecoa).
const sondear = async (metodo, ruta, { token, cuerpo, crudo } = {}) => {
  const encabezados = {}
  if (cuerpo !== undefined || crudo !== undefined) encabezados['Content-Type'] = 'application/json'
  if (token) encabezados.Authorization = `Bearer ${token}`

  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: encabezados,
    body: crudo !== undefined ? crudo : cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })

  const texto = await respuesta.text().catch(() => '')
  let data = null
  try {
    data = JSON.parse(texto)
  } catch {
    data = null
  }
  return { status: respuesta.status, data, texto }
}

// Preflight CORS: OPTIONS con un Origin permitido y
// Access-Control-Request-Headers: authorization,content-type. Lo resuelve el
// middleware de CORS ANTES del guard, así que jamás debe devolver 401 ni
// llegar a ninguna ruta protegida.
const ORIGEN_PERMITIDO = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean)[0]

const preflight = async (ruta, metodoSolicitado = 'GET') => {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: 'OPTIONS',
    headers: {
      Origin: ORIGEN_PERMITIDO,
      'Access-Control-Request-Method': metodoSolicitado,
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  })
  return {
    status: respuesta.status,
    origen: respuesta.headers.get('access-control-allow-origin'),
    metodos: respuesta.headers.get('access-control-allow-methods') || '',
    encabezados: respuesta.headers.get('access-control-allow-headers') || '',
    cuerpo: await respuesta.text().catch(() => ''),
  }
}

const firmarToken = (usuario, opciones = {}) =>
  jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, {
    expiresIn: '2h',
    algorithm: 'HS256',
    ...opciones,
  })

// Las cuatro rutas elegidas cubren los tres patrones de la app:
// verificación dentro de la ruta (auth), router.use (pedidos) y router.use +
// requierePrivilegio (admin/usuarios y ventas).
const RUTAS_PROTEGIDAS = [
  ['GET', '/auth/perfil'],
  ['GET', '/pedidos/mis'],
  ['GET', '/admin/usuarios'],
  ['GET', '/ventas'],
]

// ---------- enumeración de rutas reales desde el propio router de Express ----------
const decodificarRuta = (fuente) =>
  fuente
    .replace(/^\^/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\\\//g, '/')
    .replace(/\$$/, '')

const enumerarRutas = () => {
  const encontradas = []
  const recorrer = (stack, prefijo) => {
    for (const capa of stack) {
      if (capa.route) {
        const ruta = prefijo + (capa.route.path === '/' ? '' : capa.route.path)
        for (const metodo of Object.keys(capa.route.methods)) {
          encontradas.push(`${metodo.toUpperCase()} ${ruta}`)
        }
      } else if (capa.name === 'router' && capa.handle && capa.handle.stack) {
        const base = capa.regexp && !capa.regexp.fast_slash ? decodificarRuta(capa.regexp.source) : ''
        recorrer(capa.handle.stack, prefijo + base)
      }
    }
  }
  recorrer(app._router.stack, '')
  return [...new Set(encontradas)].sort()
}

const coincideConBlanco = (descubierta, entrada) => {
  const [metodoDesc, rutaDesc] = descubierta.split(' ')
  const [metodoEntrada, rutaEntrada] = entrada.split(' ')
  if (metodoDesc !== metodoEntrada) return false
  if (rutaEntrada.endsWith('/*')) return rutaDesc.startsWith(rutaEntrada.slice(0, -1))
  return rutaDesc === rutaEntrada
}

const rutaSinPrefijo = (ruta) => {
  const sinApi = ruta.startsWith(PREFIJO_API) ? ruta.slice(PREFIJO_API.length) : ruta
  // Los parámetros (:id) se sustituyen por un valor cualquiera: no llegan a
  // usarse porque el guard responde antes.
  const conValores = sinApi.replace(/:[^/]+/g, '1')
  return conValores === '' ? '/' : conValores
}

const main = async () => {
  servidor = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => servidor.once('listening', resolve))
  BASE = `http://127.0.0.1:${servidor.address().port}/api`

  // ---------- administrador (sólo SELECT) ----------
  const { rows } = await pool.query(
    `SELECT u.id_usuario, r.nombre AS rol
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE r.nombre = 'Administrador' AND u.estado = TRUE
        AND u.cambio_contrasena_obligatorio = FALSE
      ORDER BY u.id_usuario
      LIMIT 1`
  )
  if (rows.length === 0) throw new Error('No hay un administrador activo para las pruebas')
  tokenAdmin = firmarToken({ id: rows[0].id_usuario, rol: rows[0].rol })

  // =====================================================
  // 1) Cliente de prueba (se crea y se borra por API)
  // =====================================================
  const SUFIJO = crypto.randomBytes(3).toString('hex')
  const rCliente = await sondear('POST', '/clientes', {
    token: tokenAdmin,
    cuerpo: {
      nombre: 'Prueba Fase B',
      correo: `fase-b-${SUFIJO}@faseb.test`,
      telefono: '3009998877',
      direccion: 'Calle 8 # 7-6',
      tipo_documento: 'CC',
      documento: `7${String(Date.now()).slice(-8)}`,
    },
  })
  comprobar('1) crear cliente de prueba -> 201', rCliente.status === 201, `status=${rCliente.status}`)
  idCliente = rCliente.data?.id
  if (!idCliente) throw new Error('No se pudo crear el cliente de prueba')

  const tokenCliente = firmarToken({ id: idCliente, rol: 'Cliente' })

  const controlActivo = await sondear('GET', '/auth/perfil', { token: tokenCliente })
  comprobar(
    '1) con la cuenta ACTIVA el perfil responde 200',
    controlActivo.status === 200,
    `status=${controlActivo.status}`
  )

  // =====================================================
  // 2) Rol: manda la base de datos, no el token
  // =====================================================
  const controlBandeja = await sondear('GET', '/pruebas/invitaciones-simuladas', {
    token: tokenAdmin,
  })
  comprobar(
    '2) el administrador real pasa soloRoles -> 200',
    controlBandeja.status === 200,
    `status=${controlBandeja.status}`
  )

  const tokenQueDiceAdmin = firmarToken({ id: idCliente, rol: 'Administrador' })
  const degradado = await sondear('GET', '/pruebas/invitaciones-simuladas', {
    token: tokenQueDiceAdmin,
  })
  comprobar(
    '2) token que dice Administrador pero la BD dice Cliente -> 403',
    degradado.status === 403,
    `status=${degradado.status}`
  )

  // =====================================================
  // 3) Cuenta desactivada con token todavía vigente
  // =====================================================
  const apagado = await sondear('PATCH', `/admin/usuarios/${idCliente}/estado`, {
    token: tokenAdmin,
    cuerpo: { estado: 'Inactivo' },
  })
  comprobar('3) desactivar la cuenta -> 200', apagado.status === 200, `status=${apagado.status}`)

  for (const [metodo, ruta] of RUTAS_PROTEGIDAS) {
    const r = await sondear(metodo, ruta, { token: tokenCliente })
    comprobar(
      `3) ${metodo} ${ruta} con cuenta inactiva -> 403 ACCOUNT_DISABLED`,
      r.status === 403 && r.data?.codigo === 'ACCOUNT_DISABLED',
      `status=${r.status} codigo=${r.data?.codigo}`
    )
  }

  // =====================================================
  // 4) Tokens que no son sesión
  // =====================================================
  const tokenRecuperacion = jwt.sign(
    { id: rows[0].id_usuario, proposito: 'recuperacion' },
    process.env.JWT_SECRET,
    { expiresIn: '10m', algorithm: 'HS256' }
  )
  for (const [metodo, ruta] of RUTAS_PROTEGIDAS) {
    const r = await sondear(metodo, ruta, { token: tokenRecuperacion })
    comprobar(
      `4) ${metodo} ${ruta} con token de recuperación -> 401`,
      r.status === 401,
      `status=${r.status}`
    )
  }

  const tokenFantasma = firmarToken({ id: 999999999, rol: 'Administrador' })
  const fantasma = await sondear('GET', '/auth/perfil', { token: tokenFantasma })
  comprobar(
    '4) token de un usuario que ya no existe -> 401',
    fantasma.status === 401,
    `status=${fantasma.status}`
  )

  // =====================================================
  // 5) Si la base de datos no responde, NO se deja pasar
  // =====================================================
  const consultaOriginal = poolApp.query
  poolApp.query = () => {
    throw new Error('base de datos caída (prueba de la fase B)')
  }
  try {
    const sinBase = await sondear('GET', '/auth/perfil', { token: tokenAdmin })
    comprobar('5) base de datos caída -> 500', sinBase.status === 500, `status=${sinBase.status}`)
    comprobar(
      '5) la respuesta es genérica',
      sinBase.data?.error === 'No se pudo verificar la sesión',
      JSON.stringify(sinBase.data)
    )
  } finally {
    poolApp.query = consultaOriginal
  }

  // =====================================================
  // 6) JSON mal formado: 400 genérico, sin eco ni en registro
  // =====================================================
  const marcador = `NO_DEBE_LOGUEARSE_${SUFIJO}`
  const registro = []
  const logOriginal = console.log
  const errorOriginal = console.error
  console.log = (...args) => registro.push(args.join(' '))
  console.error = (...args) => registro.push(args.join(' '))
  let roto
  try {
    roto = await sondear('POST', '/auth/login', {
      crudo: `{"correo":"prueba@faseb.test","contrasena":"${marcador}`,
    })
  } finally {
    console.log = logOriginal
    console.error = errorOriginal
  }
  const salida = registro.join('\n')
  comprobar('6) cuerpo JSON mal formado -> 400', roto.status === 400, `status=${roto.status}`)
  comprobar(
    '6) mensaje genérico y sin el fragmento enviado',
    roto.data?.error === 'La petición no es válida' && !roto.texto.includes(marcador),
    JSON.stringify(roto.data)
  )
  comprobar(
    '6) el fragmento tampoco aparece en el registro del servidor',
    !salida.includes(marcador)
  )

  // =====================================================
  // 7) Cuerpo por encima de 100kb -> 413 genérico
  // =====================================================
  const grande = await sondear('POST', '/auth/login', { cuerpo: { relleno: 'x'.repeat(120000) } })
  comprobar('7) cuerpo de 120kb -> 413', grande.status === 413, `status=${grande.status}`)
  comprobar(
    '7) mensaje genérico',
    grande.data?.error === 'La petición es demasiado grande',
    JSON.stringify(grande.data)
  )

  // =====================================================
  // 8) Denegar por defecto: se enumeran TODAS las rutas del servidor
  //    y se lanzan peticiones reales sin token.
  // =====================================================
  const descubiertas = enumerarRutas()
  comprobar(
    '8) se enumeraron las rutas del servidor',
    descubiertas.length >= 50,
    `rutas=${descubiertas.length}`
  )

  const fueraDeLista = descubiertas.filter((ruta) => !esPublica(ruta))
  const sinAutorizacion = []
  for (const clave of fueraDeLista) {
    const [metodo, ruta] = clave.split(' ')
    const respuesta = await sondear(
      metodo,
      rutaSinPrefijo(ruta),
      metodo === 'GET' ? {} : { cuerpo: {} }
    )
    if (respuesta.status !== 401 && respuesta.status !== 403) {
      sinAutorizacion.push(`${clave} -> ${respuesta.status}`)
    }
  }
  comprobar(
    '8) denegar por defecto: todo lo NO listado responde 401/403 sin token',
    sinAutorizacion.length === 0,
    sinAutorizacion.join(' | ')
  )

  // Y al revés: la lista blanca no puede estar apuntando a rutas que no
  // existan (un error de dedo) ni bloquear las que sí son públicas. Se
  // detecta el rechazo POR LA SESIÓN (el mensaje del guard), no cualquier
  // 401: un login con credencial vacía devuelve 401 legítimo, que no tiene
  // nada que ver con la sesión.
  const rechazoDeGuard = (respuesta) =>
    respuesta.status === 401 && respuesta.data?.error === 'Token no proporcionado'

  const bloqueadas = []
  let blancasComprobadas = 0
  for (const entrada of RUTAS_PUBLICAS) {
    const coincidentes = descubiertas.filter((ruta) => coincideConBlanco(ruta, entrada))
    if (coincidentes.length === 0) continue // aún no existe (p. ej. verificación de correo)
    blancasComprobadas += 1
    const [metodo, ruta] = coincidentes[0].split(' ')
    const respuesta = await sondear(
      metodo,
      rutaSinPrefijo(ruta),
      metodo === 'GET' ? {} : { cuerpo: {} }
    )
    if (rechazoDeGuard(respuesta)) {
      bloqueadas.push(`${coincidentes[0]} -> ${respuesta.status}`)
    }
  }
  comprobar(
    '8) la lista blanca deja pasar las rutas públicas existentes',
    bloqueadas.length === 0,
    bloqueadas.join(' | ')
  )
  comprobar(
    '8) se comprobaron las entradas de la lista blanca',
    blancasComprobadas >= 6,
    `entradas=${blancasComprobadas}`
  )

  // =====================================================
  // 9) Preflight CORS: se resuelve ANTES del guard
  // =====================================================
  // Tanto en una ruta privada como en una pública el preflight debe volver
  // 204 con las cabeceras CORS y con el cuerpo vacío: si llegara al guard,
  // devolvería 401 con JSON y el navegador bloquearía el propio preflight.
  const traeCors = (r) =>
    r.origen === ORIGEN_PERMITIDO &&
    /GET/i.test(r.metodos) &&
    /authorization/i.test(r.encabezados) &&
    /content-type/i.test(r.encabezados)

  const preflightPrivado = await preflight('/admin/usuarios', 'GET')
  comprobar(
    '9) preflight de una ruta privada -> 204',
    preflightPrivado.status === 204,
    `status=${preflightPrivado.status}`
  )
  comprobar(
    '9) trae las cabeceras CORS con authorization y content-type',
    traeCors(preflightPrivado),
    `origen=${preflightPrivado.origen} metodos=${preflightPrivado.metodos} headers=${preflightPrivado.encabezados}`
  )
  comprobar(
    '9) y NO llega al guard (cuerpo vacío, sin 401)',
    preflightPrivado.cuerpo === '' && preflightPrivado.status !== 401,
    `status=${preflightPrivado.status} cuerpo=${preflightPrivado.cuerpo}`
  )

  const preflightPublico = await preflight('/auth/login', 'POST')
  comprobar(
    '9) preflight de una ruta pública -> 204',
    preflightPublico.status === 204,
    `status=${preflightPublico.status}`
  )
  comprobar(
    '9) el preflight público también trae las cabeceras CORS',
    traeCors(preflightPublico),
    `origen=${preflightPublico.origen} headers=${preflightPublico.encabezados}`
  )
}

main()
  .catch((error) => {
    console.error('Error inesperado:', error.message)
    fallos += 1
  })
  .finally(async () => {
    if (idCliente && tokenAdmin) {
      try {
        const limpieza = await sondear('DELETE', `/admin/usuarios/${idCliente}`, {
          token: tokenAdmin,
        })
        if (limpieza.status !== 200) {
          console.log(`AVISO - no se pudo borrar el cliente de prueba (${limpieza.status})`)
          fallos += 1
        }
      } catch (error) {
        console.error('Error al borrar el cliente de prueba:', error.message)
        fallos += 1
      }
    }
    try {
      await pool.end()
    } catch (error) {
      console.error('Error al cerrar la conexión:', error.message)
      fallos += 1
    } finally {
      if (servidor) servidor.close()
      console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
      process.exit(fallos === 0 ? 0 : 1)
    }
  })
