// Pruebas del correo de bienvenida del registro público:
//   1. POST /api/auth/register crea la cuenta (201) y el backend DISPARA el
//      correo de bienvenida sin esperarlo: la respuesta llega antes de que
//      Brevo conteste (no bloquea el registro).
//   2. El correo usa la identidad visual actual (LA MANSIÓN, dorado #c9a227),
//      enlaza a la tienda (APP_LOGIN_URL sin ?vista=login) y NO contiene
//      contraseñas ni datos sensibles.
//   3. Un nombre con HTML se ESCAPA en el plantilla (&lt;script&gt;).
//   4. Si Brevo rechaza la clave, el registro igual responde 201 y el fallo
//      queda SOLO en el log del servidor (sin contraseñas ni claves).
//
// Si BREVO_API_KEY está configurada, los casos 1-3 hacen envíos REALES a
// la API de Brevo (destinos de prueba @test.com). El caso 4 usa una clave
// inválida temporal para forzar el rechazo.
//
// Requiere DATABASE_URL y las variables de correo en backend/.env.
// Los usuarios de prueba se eliminan al terminar.

import 'dotenv/config'
import crypto from 'node:crypto'
import pg from 'pg'
import { plantillaBienvenida } from '../src/services/correos.js'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const SUFIJO = crypto.randomBytes(4).toString('hex')
const CORREO_A = `bienvenida-a-${SUFIJO}@test.com`
const CORREO_B = `bienvenida-b-${SUFIJO}@test.com`
const CORREO_C = `bienvenida-c-${SUFIJO}@test.com`
const CORREOS_PRUEBA = [CORREO_A, CORREO_B, CORREO_C]

const CLAVE_SECRETA = 'NoDebeAparecerEnElCorreo123*'
const NOMBRE_CON_HTML = `Eva <script>alert("xss")</script> ${SUFIJO}`

// URL esperada del botón: la raíz del frontend derivada de APP_LOGIN_URL.
const enlaceTiendaEsperado = (() => {
  const url = new URL(process.env.APP_LOGIN_URL || 'http://localhost:5173/?vista=login')
  url.search = ''
  url.hash = ''
  return url.toString()
})()

let fallos = 0
let BASE = ''
const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

// --- Intercepción de fetch: observa las llamadas a Brevo sin imprimir
// claves (nunca se registra el encabezado api-key) y puede demorar la
// respuesta para probar que el registro no queda bloqueado.
const fetchOriginal = globalThis.fetch
let retrasoBrevoMs = 0
const llamadasBrevo = []

globalThis.fetch = async (url, options = {}) => {
  const destino = String(url)
  if (!destino.includes('api.brevo.com')) return fetchOriginal(url, options)

  let cuerpo = null
  try {
    cuerpo = JSON.parse(options.body)
  } catch {
    cuerpo = null
  }
  const registro = {
    asunto: cuerpo?.subject,
    para: cuerpo?.to?.[0]?.email,
    html: cuerpo?.htmlContent,
    texto: cuerpo?.textContent,
    status: null,
    messageId: null,
  }
  llamadasBrevo.push(registro)

  if (retrasoBrevoMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, retrasoBrevoMs))
  }

  const respuesta = await fetchOriginal(url, options)
  const datos = await respuesta.clone().json().catch(() => ({}))
  registro.status = respuesta.status
  registro.messageId = datos.messageId || null
  return respuesta
}

const esperarLlamada = async (correo, timeoutMs = 20000) => {
  const limite = Date.now() + timeoutMs
  while (Date.now() < limite) {
    const llamada = llamadasBrevo.find((l) => l.para === correo && l.status !== null)
    if (llamada) return llamada
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return null
}

const registrar = async (nombre, correo, contrasena) => {
  const inicio = Date.now()
  const respuesta = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre,
      correo,
      contrasena,
      telefono: '3001234567',
      tipo_documento: 'CC',
      documento: String(crypto.randomBytes(4).readUInt32BE(0)).slice(0, 10),
      fecha_nacimiento: '1990-01-01',
      // Fase A: el registro exige la marca de tiempo del formulario; sin ella
      // el servidor descarta la petición (respuesta falsa, sin crear cuenta).
      ts: Date.now() - 5000,
      // Fase C: Turnstile. La clave local es la de prueba de Cloudflare,
      // que siempre aprueba este token.
      turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
    }),
  })
  const data = await respuesta.json().catch(() => null)
  return { status: respuesta.status, data, ms: Date.now() - inicio }
}

const limpiar = async () => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM usuario WHERE correo = ANY($1::text[])',
      [CORREOS_PRUEBA]
    )
    if (rowCount > 0) console.log(`\n=== LIMPIEZA: ${rowCount} usuario(s) de prueba eliminados ===`)
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
  }
}

const main = async () => {
  await limpiar()
  fallos = 0

  if (!process.env.BREVO_API_KEY) {
    console.log(
      'AVISO: no hay BREVO_API_KEY; los envíos quedarán simulados en memoria ' +
        '(esto no prueba el envío real a la API).'
    )
  }

  const { default: app } = await import('../src/app.js')
  const servidor = app.listen(0)
  await new Promise((resolve) => servidor.once('listening', resolve))
  BASE = `http://localhost:${servidor.address().port}/api`

  try {
    // --- 1) Registro con envío real y respuesta NO bloqueada -----------
    retrasoBrevoMs = 3000
    const registroA = await registrar(`Prueba Bienvenida ${SUFIJO}`, CORREO_A, CLAVE_SECRETA)
    comprobar('registro -> 201', registroA.status === 201, `status=${registroA.status}`)
    comprobar(
      'la respuesta NO espera a Brevo (llega antes del retraso simulado)',
      registroA.ms < 2500,
      `ms=${registroA.ms}`
    )

    const llamadaA = await esperarLlamada(CORREO_A)
    comprobar('el backend disparó el correo de bienvenida a Brevo', Boolean(llamadaA))
    if (llamadaA) {
      comprobar(
        'Brevo aceptó el envío (2xx con messageId)',
        llamadaA.status >= 200 && llamadaA.status < 300 && Boolean(llamadaA.messageId),
        `status=${llamadaA.status}`
      )
      comprobar(
        'asunto de bienvenida',
        llamadaA.asunto === '¡Bienvenido a Store La Mansión!',
        `asunto=${llamadaA.asunto}`
      )
      comprobar('usa la identidad visual actual', llamadaA.html.includes('LA MANSI') && llamadaA.html.includes('#c9a227'))
      comprobar('botón "Ir a la tienda"', llamadaA.html.includes('Ir a la tienda'))
      comprobar(
        'el enlace apunta a la tienda (sin ?vista=login)',
        llamadaA.html.includes(enlaceTiendaEsperado) && !llamadaA.html.includes('vista=login'),
        `esperado=${enlaceTiendaEsperado}`
      )
      comprobar('trae versión de texto plano', typeof llamadaA.texto === 'string' && llamadaA.texto.length > 0)
      comprobar(
        'el correo NO contiene la contraseña del registro',
        !llamadaA.html.includes(CLAVE_SECRETA) && !llamadaA.texto.includes(CLAVE_SECRETA)
      )
      comprobar('el correo NO menciona contraseñas temporales', !/contrase[ñn]a temporal/i.test(llamadaA.html))
    }

    // --- 2) Nombre con HTML: se escapa en la plantilla -----------------
    retrasoBrevoMs = 0
    const registroB = await registrar(NOMBRE_CON_HTML, CORREO_B, CLAVE_SECRETA)
    comprobar('registro con nombre hostil -> 201', registroB.status === 201, `status=${registroB.status}`)
    const llamadaB = await esperarLlamada(CORREO_B)
    if (llamadaB) {
      comprobar(
        'el nombre se ESCAPA en el HTML (sin <script> crudo)',
        llamadaB.html.includes('&lt;script&gt;') && !llamadaB.html.includes('<script>alert')
      )
      comprobar(
        'el correo NO contiene la contraseña del registro',
        !llamadaB.html.includes(CLAVE_SECRETA) && !llamadaB.texto.includes(CLAVE_SECRETA)
      )
    } else {
      comprobar('llegó el correo del registro con nombre hostil', false)
    }

    // --- 3) Proveedor falla (clave inválida): el registro sobrevive ---
    // La captura del log se mantiene hasta que el envío en segundo plano
    // termine: el error llega DESPUÉS de la respuesta 201.
    const claveOriginal = process.env.BREVO_API_KEY
    process.env.BREVO_API_KEY = `clave-invalida-temporal-${SUFIJO}`

    const salidaLog = []
    const errorOriginal = console.error
    console.error = (...args) => {
      salidaLog.push(args.map(String).join(' '))
      errorOriginal(...args)
    }

    try {
      const registroC = await registrar(`Prueba Fallo Brevo ${SUFIJO}`, CORREO_C, CLAVE_SECRETA)
      comprobar(
        'con la clave de Brevo inválida el registro SIGUE siendo 201',
        registroC.status === 201,
        `status=${registroC.status} error=${registroC.data?.error || ''}`
      )

      const llamadaC = await esperarLlamada(CORREO_C)
      comprobar(
        'Brevo rechazó el envío (4xx/5xx)',
        Boolean(llamadaC) && llamadaC.status >= 400,
        `status=${llamadaC?.status}`
      )
      // Pequeña espera: el console.error del servicio llega tras la respuesta.
      await new Promise((resolve) => setTimeout(resolve, 300))

      const logFallo = salidaLog.join('\n')
      comprobar(
        'el fallo queda registrado en el log del servidor',
        logFallo.includes('[registro] No se pudo enviar el correo de bienvenida')
      )
      comprobar(
        'el log NO imprime la contraseña ni la clave de Brevo',
        !logFallo.includes(CLAVE_SECRETA) && !logFallo.includes(`clave-invalida-temporal-${SUFIJO}`)
      )
      const creada = await pool.query('SELECT 1 FROM usuario WHERE correo = $1', [CORREO_C])
      comprobar('la cuenta del registro fallido CONSERVA creada en la base', creada.rowCount === 1)
    } finally {
      console.error = errorOriginal
      process.env.BREVO_API_KEY = claveOriginal
    }

    // --- 4) Unidad: la plantilla no filtra datos sensibles -------------
    const plantilla = plantillaBienvenida({
      nombre: `Otro <b>Nombre</b> ${SUFIJO}`,
      enlaceTienda: enlaceTiendaEsperado,
    })
    comprobar('plantilla con asunto de bienvenida', /bienvenido/i.test(plantilla.asunto))
    comprobar('plantilla escapa el nombre', plantilla.html.includes('&lt;b&gt;'))
    comprobar('plantilla trae texto plano con el enlace', plantilla.texto.includes(enlaceTiendaEsperado))
    comprobar(
      'la plantilla no muestra contraseñas temporales ni bloques de clave',
      !/contrase[ñn]a temporal/i.test(plantilla.html) &&
        !plantilla.html.includes('CONTRASEÑA TEMPORAL') &&
        !plantilla.texto.includes('CONTRASEÑA TEMPORAL')
    )
  } finally {
    retrasoBrevoMs = 0
    await new Promise((resolve) => servidor.close(resolve))
  }
}

try {
  await main()
} catch (error) {
  console.error('Error inesperado en las pruebas:', error.message)
  fallos += 1
} finally {
  await limpiar()
  await pool.end()
  console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
  process.exitCode = fallos === 0 ? 0 : 1
}
