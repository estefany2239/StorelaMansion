// FASE C — Cloudflare Turnstile (registro y recuperación de contraseña).
//
// Arranca su propia instancia del backend en un puerto efímero y comprueba
// que las dos rutas públicas exigen un token de Turnstile válido, con fallo
// cerrado en todos los caminos de error.
//
// Las respuestas de siteverify se SIMULAN sustituyendo globalThis.fetch
// (sin red) para los casos de fallo, de acción y de token reutilizado; el
// caso de éxito usa la clave de prueba de Cloudflare que trae backend/.env,
// con el token de prueba XXXX.DUMMY.TOKEN.XXXX.
//
// Reglas que respeta:
// - Nunca imprime el token, el secreto ni datos de personas: sólo OK/FALLO,
//   códigos HTTP y correos sintéticos de prueba.
// - NO escribe en la base de datos: sólo comprueba con SELECT que un
//   registro rechazado NO creó cuenta.
// - Restaura globalThis.fetch, el secreto y su servidor al terminar.
//
// Uso:  node tests/test-seguridad-c.mjs

import 'dotenv/config'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

// Esta prueba no mide límites de tasa: los apaga en su propio proceso.
process.env.RATE_LIMIT_OFF = '1'

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en backend/.env')
  process.exit(1)
}

const SECRETARIO_ORIGINAL = process.env.TURNSTILE_SECRET_KEY
const CARPETA_BACKEND = fileURLToPath(new URL('..', import.meta.url))

const { default: app } = await import('../src/app.js')
const { problemaDelSecreto } = await import('../src/middlewares/verificarCaptcha.js')
const { esperaCorreo } = await import('../src/services/recuperacion.js')
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

// ------------------------------------------------------------------
// Simulación de siteverify y de la API de correo, sin red real.
// ------------------------------------------------------------------
const fetchOriginal = globalThis.fetch

let simulacion = null // null = dejar pasar a siteverify (clave de prueba)
let llamadasSiteverify = 0
let cuerpoSiteverify = null
let llamadasBrevo = 0

const simularSiteverify = (valor) => {
  simulacion = valor
}
const siteverifyReal = () => {
  simulacion = null
}

globalThis.fetch = async (url, opciones = {}) => {
  const destino = String(url)

  if (destino.includes('challenges.cloudflare.com')) {
    llamadasSiteverify += 1
    if (opciones.body) cuerpoSiteverify = String(opciones.body)

    if (!simulacion) return fetchOriginal(url, opciones)

    if (simulacion.tipo === 'timeout') {
      // Se dispara cuando el AbortController del middleware corta a los 3 s.
      return new Promise((_, rechazar) => {
        opciones.signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted')
          error.name = 'AbortError'
          rechazar(error)
        })
      })
    }
    if (simulacion.tipo === 'red') throw new TypeError('fetch failed')
    if (simulacion.tipo === 'http') {
      return new Response('upstream no disponible', { status: simulacion.status ?? 502 })
    }
    if (simulacion.tipo === 'texto') {
      return new Response('esto no es json', { status: 200 })
    }
    return new Response(JSON.stringify(simulacion.valor), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  // Ninguna prueba de esta fase debe enviar correos reales.
  if (destino.includes('api.brevo.com')) {
    llamadasBrevo += 1
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  }

  return fetchOriginal(url, opciones)
}

const SUFIJO = crypto.randomBytes(3).toString('hex')

const tokenDePrueba = 'XXXX.DUMMY.TOKEN.XXXX'

// Cuerpo con la marca de tiempo válida para que el campo trampa deje pasar
// la petición y llegue Turnstile (y después el validador de datos). Todos
// los envíos llevan token salvo los que prueban exactamente lo contrario.
const cuerpo = (clave, extra = {}) => ({
  correo: `fase-c-${clave}-${SUFIJO}@fasec.test`,
  contrasena: 'ClaveDePrueba123',
  ts: Date.now() - 5000,
  website: '',
  turnstileToken: tokenDePrueba,
  ...extra,
})

const existeEnBase = async (correo) => {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM usuario WHERE LOWER(correo) = $1',
    [correo.toLowerCase()]
  )
  return rowCount > 0
}

// Ejecuta src/server.js como proceso hijo y devuelve su código de salida y
// lo que imprimió. Sólo se comprueban los mensajes de configuración: nunca
// se imprime el valor de ninguna variable.
const arrancarServidor = (variables) =>
  new Promise((resolver) => {
    const hijo = spawn(process.execPath, ['src/server.js'], {
      cwd: CARPETA_BACKEND,
      env: { ...process.env, ...variables },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let salida = ''
    hijo.stdout.on('data', (dato) => {
      salida += String(dato)
    })
    hijo.stderr.on('data', (dato) => {
      salida += String(dato)
    })
    const reloj = setTimeout(() => {
      hijo.kill()
      resolver({ codigo: null, salida })
    }, 20000)
    hijo.on('exit', (codigo) => {
      clearTimeout(reloj)
      resolver({ codigo, salida })
    })
  })

const main = async () => {
  servidor = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => servidor.once('listening', resolve))
  BASE = `http://127.0.0.1:${servidor.address().port}/api`

  // =====================================================
  // 1) Registro SIN token
  // =====================================================
  // Único registro que va SIN token: `undefined` hace que JSON.stringify
  // omita el campo del todo (ni siquiera vacío).
  const sinToken = cuerpo('sin-token', { turnstileToken: undefined })
  llamadasSiteverify = 0
  const r1 = await pedir('POST', '/auth/register', sinToken)
  comprobar('1) Registro sin turnstileToken -> 400 CAPTCHA_REQUERIDO',
    r1.status === 400 && r1.data?.codigo === 'CAPTCHA_REQUERIDO',
    `status=${r1.status} codigo=${r1.data?.codigo}`)
  comprobar('1) no se contacta con siteverify', llamadasSiteverify === 0,
    `llamadas=${llamadasSiteverify}`)
  comprobar('1) y no se creó la cuenta', !(await existeEnBase(sinToken.correo)))

  // =====================================================
  // 2) Token rechazado por Cloudflare (simulado)
  // =====================================================
  simularSiteverify({ tipo: 'json', valor: { success: false, 'error-codes': ['invalid-input-response'] } })
  const rechazado = cuerpo('rechazado')
  const r2 = await pedir('POST', '/auth/register', rechazado)
  comprobar('2) Token rechazado -> 400 CAPTCHA_INVALIDO',
    r2.status === 400 && r2.data?.codigo === 'CAPTCHA_INVALIDO',
    `status=${r2.status} codigo=${r2.data?.codigo}`)
  comprobar('2) y no se creó la cuenta', !(await existeEnBase(rechazado.correo)))

  // =====================================================
  // 3) Token válido (clave de prueba de Cloudflare, con red real)
  // =====================================================
  siteverifyReal()
  const valido = cuerpo('valido', { nombre: '' })
  llamadasSiteverify = 0
  cuerpoSiteverify = null
  const r3 = await pedir('POST', '/auth/register', valido)
  comprobar('3) Token válido pasa Turnstile y llega al validador de datos -> 400 por campo',
    r3.status === 400 && r3.data?.campo === 'nombre',
    `status=${r3.status} campo=${r3.data?.campo} codigo=${r3.data?.codigo}`)
  comprobar('3) y no se creó la cuenta', !(await existeEnBase(valido.correo)))

  const parametros = new URLSearchParams(cuerpoSiteverify || '')
  comprobar('4) siteverify recibe remoteip con la IP del cliente',
    String(parametros.get('remoteip') || '').includes('127.0.0.1'),
    `remoteip=${parametros.get('remoteip') ? '(presente)' : '(ausente)'}`)
  comprobar('4) y recibe el token y el secreto enviados',
    parametros.get('response') === tokenDePrueba && Boolean(parametros.get('secret')))

  // =====================================================
  // 5) Timeout (los 3 s del AbortController) y error de red
  // =====================================================
  const porTiempo = cuerpo('timeout')
  simularSiteverify({ tipo: 'timeout' })
  const r5 = await pedir('POST', '/auth/register', porTiempo)
  comprobar('5) Timeout de siteverify -> 503 CAPTCHA_NO_DISPONIBLE',
    r5.status === 503 && r5.data?.codigo === 'CAPTCHA_NO_DISPONIBLE',
    `status=${r5.status} codigo=${r5.data?.codigo}`)
  comprobar('5) y no se creó la cuenta', !(await existeEnBase(porTiempo.correo)))

  simularSiteverify({ tipo: 'red' })
  const r6 = await pedir('POST', '/auth/register', cuerpo('red'))
  comprobar('6) Error de red -> 503 CAPTCHA_NO_DISPONIBLE',
    r6.status === 503 && r6.data?.codigo === 'CAPTCHA_NO_DISPONIBLE',
    `status=${r6.status} codigo=${r6.data?.codigo}`)

  simularSiteverify({ tipo: 'texto' })
  const r7 = await pedir('POST', '/auth/register', cuerpo('texto'))
  comprobar('7) Respuesta inválida de siteverify -> 503 CAPTCHA_NO_DISPONIBLE',
    r7.status === 503 && r7.data?.codigo === 'CAPTCHA_NO_DISPONIBLE',
    `status=${r7.status} codigo=${r7.data?.codigo}`)

  simularSiteverify({ tipo: 'http', status: 502 })
  const r8 = await pedir('POST', '/auth/register', cuerpo('http'))
  comprobar('8) siteverify responde 5xx -> 503 CAPTCHA_NO_DISPONIBLE',
    r8.status === 503 && r8.data?.codigo === 'CAPTCHA_NO_DISPONIBLE',
    `status=${r8.status} codigo=${r8.data?.codigo}`)

  // =====================================================
  // 9) Secreto ausente (se borra sólo en este proceso)
  // =====================================================
  siteverifyReal()
  delete process.env.TURNSTILE_SECRET_KEY

  // Se captura el log del proceso para comprobar lo que exige la
  // especificación: fuera de producción no se sale, el middleware responde
  // 503 y el log explica por qué (sin el token).
  const lineasLog = []
  const errorOriginal = console.error
  console.error = (...argumentos) => {
    lineasLog.push(argumentos.map(String).join(' '))
    errorOriginal(...argumentos)
  }
  const r9 = await pedir('POST', '/auth/register', cuerpo('sin-secreto'))
  console.error = errorOriginal

  comprobar('9) Sin TURNSTILE_SECRET_KEY -> 503 CAPTCHA_NO_DISPONIBLE',
    r9.status === 503 && r9.data?.codigo === 'CAPTCHA_NO_DISPONIBLE',
    `status=${r9.status} codigo=${r9.data?.codigo}`)
  comprobar('9) el proceso sigue vivo y el log dice por qué (sin filtrar el token)',
    lineasLog.some((linea) => linea.includes('TURNSTILE_SECRET_KEY')) &&
      !lineasLog.some((linea) => linea.includes(tokenDePrueba)),
    `lineas=${lineasLog.length}`)
  process.env.TURNSTILE_SECRET_KEY = SECRETARIO_ORIGINAL

  // =====================================================
  // 10) Acción del widget (token de otra acción)
  // =====================================================
  process.env.TURNSTILE_SECRET_KEY = '0xsecreto-real-de-ejemplo-0123456789abcdef'
  simularSiteverify({ tipo: 'json', valor: { success: true, action: 'recuperacion' } })
  const r10 = await pedir('POST', '/auth/register', cuerpo('accion-mala'))
  comprobar('10) Secreto real + acción distinta -> 400 CAPTCHA_INVALIDO',
    r10.status === 400 && r10.data?.codigo === 'CAPTCHA_INVALIDO',
    `status=${r10.status} codigo=${r10.data?.codigo}`)

  simularSiteverify({ tipo: 'json', valor: { success: true, action: 'registro' } })
  const r11 = await pedir('POST', '/auth/register', { ...cuerpo('accion-buena'), nombre: '' })
  comprobar('10) Secreto real + acción correcta -> pasa al validador',
    r11.status === 400 && r11.data?.campo === 'nombre',
    `status=${r11.status} campo=${r11.data?.campo}`)

  // Con secreto de PRUEBA Cloudflare no devuelve action: no se exige.
  process.env.TURNSTILE_SECRET_KEY = SECRETARIO_ORIGINAL
  simularSiteverify({ tipo: 'json', valor: { success: true } })
  const r12 = await pedir('POST', '/auth/register', { ...cuerpo('clave-prueba'), nombre: '' })
  comprobar('10) Con clave de prueba no se exige action -> pasa al validador',
    r12.status === 400 && r12.data?.campo === 'nombre',
    `status=${r12.status} campo=${r12.data?.campo}`)

  // =====================================================
  // 11) Token reutilizado (timeout-or-duplicate)
  // =====================================================
  simularSiteverify({ tipo: 'json', valor: { success: true, action: 'registro' } })
  const r13 = await pedir('POST', '/auth/register', { ...cuerpo('uso-1'), nombre: '' })
  comprobar('11) Primer uso del token -> pasa Turnstile',
    r13.status === 400 && r13.data?.campo === 'nombre',
    `status=${r13.status} campo=${r13.data?.campo}`)
  simularSiteverify({
    tipo: 'json',
    valor: { success: false, 'error-codes': ['timeout-or-duplicate'] },
  })
  const r14 = await pedir('POST', '/auth/register', { ...cuerpo('uso-2'), nombre: '' })
  comprobar('11) Segundo uso del mismo token -> 400 CAPTCHA_INVALIDO',
    r14.status === 400 && r14.data?.codigo === 'CAPTCHA_INVALIDO',
    `status=${r14.status} codigo=${r14.data?.codigo}`)

  // =====================================================
  // 12) El login NO lleva Turnstile en esta fase (lo decide la Fase F)
  // =====================================================
  siteverifyReal()
  llamadasSiteverify = 0
  const r15 = await pedir('POST', '/auth/login', {
    correo: `nunca-existe-${SUFIJO}@fasec.test`,
    contrasena: 'clave-erronea-123',
  })
  comprobar('12) Login sin turnstileToken -> 401 (no exige CAPTCHA aún)',
    r15.status === 401 && r15.data?.codigo !== 'CAPTCHA_REQUERIDO',
    `status=${r15.status} codigo=${r15.data?.codigo}`)
  comprobar('12) y el login no contacta con siteverify', llamadasSiteverify === 0,
    `llamadas=${llamadasSiteverify}`)

  // =====================================================
  // 13) Solicitud de recuperación de contraseña
  // =====================================================
  const correoRecuperacion = `recuperacion-${SUFIJO}@fasec.test`
  siteverifyReal()

  const s1 = await pedir('POST', '/auth/recuperar/solicitar', { correo: correoRecuperacion })
  comprobar('13) Solicitud sin turnstileToken -> 400 CAPTCHA_REQUERIDO',
    s1.status === 400 && s1.data?.codigo === 'CAPTCHA_REQUERIDO',
    `status=${s1.status} codigo=${s1.data?.codigo}`)
  comprobar('13) el handler no corrió (no quedó marca de reenvío)',
    esperaCorreo(correoRecuperacion) === 0, `espera=${esperaCorreo(correoRecuperacion)}`)

  simularSiteverify({ tipo: 'json', valor: { success: false, 'error-codes': ['invalid-input-response'] } })
  const s2 = await pedir('POST', '/auth/recuperar/solicitar', {
    correo: correoRecuperacion,
    turnstileToken: tokenDePrueba,
  })
  comprobar('13) Solicitud con token rechazado -> 400 CAPTCHA_INVALIDO',
    s2.status === 400 && s2.data?.codigo === 'CAPTCHA_INVALIDO',
    `status=${s2.status} codigo=${s2.data?.codigo}`)
  comprobar('13) tampoco corrió el handler', esperaCorreo(correoRecuperacion) === 0,
    `espera=${esperaCorreo(correoRecuperacion)}`)

  llamadasBrevo = 0
  siteverifyReal()
  const s3 = await pedir('POST', '/auth/recuperar/solicitar', { correo: correoRecuperacion, turnstileToken: tokenDePrueba })
  comprobar('14) Con token válido la solicitud pasa Turnstile -> 200 genérico',
    s3.status === 200 && typeof s3.data?.mensaje === 'string',
    `status=${s3.status}`)
  comprobar('14) el handler sí corrió (hay marca de reenvío)',
    esperaCorreo(correoRecuperacion) > 0, `espera=${esperaCorreo(correoRecuperacion)}`)
  comprobar('14) y no se envió ningún correo (cuenta inexistente)',
    llamadasBrevo === 0, `llamadasBrevo=${llamadasBrevo}`)

  // =====================================================
  // 14) Arranque en producción (proceso hijo)
  // =====================================================
  const sinSecreto = await arrancarServidor({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: '' })
  comprobar('15) Producción sin TURNSTILE_SECRET_KEY -> el proceso termina con error',
    sinSecreto.codigo === 1, `codigo=${sinSecreto.codigo}`)
  comprobar('15) y el motivo es el secreto de Turnstile',
    /TURNSTILE_SECRET_KEY/.test(sinSecreto.salida))

  const conClavePrueba = await arrancarServidor({
    NODE_ENV: 'production',
    TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  })
  comprobar('16) Producción con clave de prueba -> el proceso termina con error',
    conClavePrueba.codigo === 1, `codigo=${conClavePrueba.codigo}`)
  comprobar('16) y el motivo es que es una clave de prueba',
    /prueba/i.test(conClavePrueba.salida))

  // =====================================================
  // 15) Reglas de configuración (unidad)
  // =====================================================
  comprobar('17) Secreto real en producción -> sin problema',
    problemaDelSecreto({ secreto: '0xsecreto-real-de-ejemplo-0123456789abcdef', produccion: true }) === null)
  comprobar('17) Clave de prueba en producción -> hay problema',
    typeof problemaDelSecreto({ secreto: '1x0000000000000000000000000000000AA', produccion: true }) === 'string')
  comprobar('17) Clave de prueba fuera de producción -> sin problema (desarrollo)',
    problemaDelSecreto({ secreto: '1x0000000000000000000000000000000AA', produccion: false }) === null)
  comprobar('17) Sin secreto fuera de producción -> lo describe (server.js sólo sale en producción)',
    typeof problemaDelSecreto({ secreto: '', produccion: false }) === 'string')
}

main()
  .catch((error) => {
    console.error('Error inesperado:', error.message)
    fallos += 1
  })
  .finally(async () => {
    globalThis.fetch = fetchOriginal
    if (SECRETARIO_ORIGINAL) process.env.TURNSTILE_SECRET_KEY = SECRETARIO_ORIGINAL
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
