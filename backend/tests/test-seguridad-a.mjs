// FASE A — límites de tasa por IP, campo trampa y tiempo mínimo de envío.
//
// Arranca su propia instancia del backend en un puerto efímero, con los
// límites ACTIVOS (borra RATE_LIMIT_OFF si el entorno lo traía puesto) y con
// cantidades por ventana pequeñas para que la prueba sea rápida.
//
// Reglas que respeta:
// - Nunca imprime contraseñas, tokens ni datos de personas: sólo OK/FALLO,
//   códigos HTTP y correos sintéticos de prueba.
// - NO escribe en la base de datos: sólo comprueba con SELECT que los
//   registros descartados NO crearon cuenta. El camino "registro válido que
//   sí crea la cuenta" lo cubre test-bienvenida.mjs (que ya lleva el `ts`).
// - Borra los contadores de su proceso al terminar (el servidor es suyo).
//
// Uso:  node tests/test-seguridad-a.mjs

import 'dotenv/config'
import crypto from 'node:crypto'
import pg from 'pg'

delete process.env.RATE_LIMIT_OFF

// Ventanas y cantidades pequeñas: se leen al importar la aplicación.
process.env.LOGIN_MAX_POR_IP = '3'
process.env.LOGIN_VENTANA_MIN = '15'
process.env.REGISTRO_MAX_POR_IP = '7'
process.env.REGISTRO_VENTANA_MIN = '60'
process.env.RECUPERACION_CODIGOS_MAX_POR_IP = '4'
process.env.RECUPERACION_CODIGOS_VENTANA_MIN = '15'

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en backend/.env')
  process.exit(1)
}

const { default: app } = await import('../src/app.js')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

let BASE = ''
let servidor = null
let fallos = 0

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

const pedir = async (metodo, ruta, cuerpo) => {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo ?? {}),
  })
  let data = null
  try {
    data = await respuesta.json()
  } catch {
    data = null
  }
  return { status: respuesta.status, data }
}

const SUFIJO = crypto.randomBytes(3).toString('hex')

// Registro totalmente válido: si el servidor no lo descartara, SÍ crearía la
// cuenta. Sólo cambian los campos de protección.
const cuerpoValido = (clave) => ({
  nombre: `Anti Bot ${clave}`,
  correo: `fase-a-${clave}-${SUFIJO}@fasea.test`,
  contrasena: 'ClaveDePrueba123',
  telefono: '3001234567',
  tipo_documento: 'CC',
  documento: String(crypto.randomBytes(4).readUInt32BE(0)).slice(0, 10),
  fecha_nacimiento: '1990-01-01',
  ts: Date.now() - 5000,
  website: '',
})

const existeEnBase = async (correo) => {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM usuario WHERE LOWER(correo) = $1',
    [correo.toLowerCase()]
  )
  return rowCount > 0
}

const main = async () => {
  servidor = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => servidor.once('listening', resolve))
  BASE = `http://127.0.0.1:${servidor.address().port}/api`

  // =====================================================
  // 1) Protección anti-bot del registro
  // =====================================================
  const sinTs = cuerpoValido('sints')
  delete sinTs.ts
  const r1 = await pedir('POST', '/auth/register', sinTs)
  comprobar('1) Registro SIN la marca de tiempo -> 201 (respuesta falsa)', r1.status === 201, `status=${r1.status}`)
  comprobar('1) y la cuenta NO se creó', !(await existeEnBase(sinTs.correo)))

  const conTrampa = cuerpoValido('trampa')
  conTrampa.website = 'https://ejemplo-de-bot.test'
  const r2 = await pedir('POST', '/auth/register', conTrampa)
  comprobar('2) Registro con el campo trampa relleno -> 201 (respuesta falsa)', r2.status === 201, `status=${r2.status}`)
  comprobar('2) y la cuenta NO se creó', !(await existeEnBase(conTrampa.correo)))

  const muyRapido = cuerpoValido('rapido')
  muyRapido.ts = Date.now()
  const r3 = await pedir('POST', '/auth/register', muyRapido)
  comprobar('3) Registro enviado sin tiempo mínimo -> 201 (respuesta falsa)', r3.status === 201, `status=${r3.status}`)
  comprobar('3) y la cuenta NO se creó', !(await existeEnBase(muyRapido.correo)))

  const relojFuturo = cuerpoValido('futuro')
  relojFuturo.ts = Date.now() + 10 * 60 * 1000
  const r4 = await pedir('POST', '/auth/register', relojFuturo)
  comprobar('4) Registro con reloj imposible -> 201 (respuesta falsa)', r4.status === 201, `status=${r4.status}`)
  comprobar('4) y la cuenta NO se creó', !(await existeEnBase(relojFuturo.correo)))

  // Cuerpo completo y con `ts` correcto, pero SIN teléfono: si la protección
  // lo dejara pasar, el validador responde 400 por el campo obligatorio. Si
  // lo descartara, respondería 201 (falso). Sirve de control positivo sin
  // llegar a crear ninguna cuenta.
  const conTs = cuerpoValido('valido')
  delete conTs.telefono
  const r5 = await pedir('POST', '/auth/register', conTs)
  comprobar(
    '5) Registro con ts correcto PASA la protección y llega al validador -> 400',
    r5.status === 400,
    `status=${r5.status}`
  )

  // =====================================================
  // 2) Límite de registros por IP (máximo 7 por ventana)
  // =====================================================
  // Llevamos 5 peticiones de registro (1..5). Las 6 y 7 agotan la ventana
  // (cuerpo con `ts` válido pero sin nombre: las rechaza el validador) y la
  // octava debe caer en el límite.
  const vistos = [r1.status, r2.status, r3.status, r4.status, r5.status]
  for (let i = 6; i <= 7; i += 1) {
    const r = await pedir('POST', '/auth/register', { ts: Date.now() - 5000 })
    vistos.push(r.status)
  }
  const rLimite = await pedir('POST', '/auth/register', { ts: Date.now() - 5000 })
  vistos.push(rLimite.status)
  comprobar(
    '6) Registro por IP: las primeras 7 peticiones no están limitadas',
    vistos.slice(0, 7).every((s) => s !== 429),
    vistos.join(',')
  )
  comprobar('6) la octava petición de registro -> 429', rLimite.status === 429, `status=${rLimite.status}`)
  comprobar(
    '6) el 429 lleva error genérico y código RATE_LIMITED',
    rLimite.data?.codigo === 'RATE_LIMITED' && Boolean(rLimite.data?.error),
    JSON.stringify(rLimite.data)
  )

  // =====================================================
  // 3) Límite de login por IP (máximo 3 por ventana)
  // =====================================================
  const login = () =>
    pedir('POST', '/auth/login', {
      correo: `nunca-existe-${SUFIJO}@fasea.test`,
      contrasena: 'clave-erronea-123',
    })
  const l1 = await login()
  const l2 = await login()
  const l3 = await login()
  const l4 = await login()
  comprobar(
    '7) Login: los tres primeros intentos devuelven 401 (no 429)',
    [l1.status, l2.status, l3.status].every((s) => s === 401),
    `${l1.status},${l2.status},${l3.status}`
  )
  comprobar('7) el cuarto intento de login -> 429', l4.status === 429, `status=${l4.status}`)

  // =====================================================
  // 4) Límite de intentos de código de recuperación (máximo 4)
  // =====================================================
  const verificarCodigo = () =>
    pedir('POST', '/auth/recuperar/verificar', {
      correo: `nunca-existe-${SUFIJO}@fasea.test`,
      codigo: '000000',
    })
  const c1 = await verificarCodigo()
  const c2 = await verificarCodigo()
  const c3 = await verificarCodigo()
  const c4 = await verificarCodigo()
  const c5 = await verificarCodigo()
  comprobar(
    '8) Recuperación: los cuatro primeros intentos no están limitados',
    [c1.status, c2.status, c3.status, c4.status].every((s) => s !== 429),
    `${c1.status},${c2.status},${c3.status},${c4.status}`
  )
  comprobar('8) el quinto intento de código -> 429', c5.status === 429, `status=${c5.status}`)

  // =====================================================
  // 5) Interruptor para los tests existentes
  // =====================================================
  process.env.RATE_LIMIT_OFF = '1'
  const sinLimite = await login()
  comprobar(
    '9) Con RATE_LIMIT_OFF=1 el login vuelve a responder 401 (sin 429)',
    sinLimite.status === 401,
    `status=${sinLimite.status}`
  )
  delete process.env.RATE_LIMIT_OFF
}

main()
  .catch((error) => {
    console.error('Error inesperado:', error.message)
    fallos += 1
  })
  .finally(async () => {
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
