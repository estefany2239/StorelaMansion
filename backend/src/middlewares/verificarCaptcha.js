// Fase C — verificación de Cloudflare Turnstile.
//
// `verificarCaptcha({ accion })` devuelve un middleware que exige un token
// válido de Turnstile en `req.body.turnstileToken` antes de que la ruta haga
// nada. El widget se pinta con `data-action` igual a `accion` y el servidor
// exige que siteverify devuelva esa misma acción: así un token de registro no
// sirve para recuperar la contraseña (ni al revés).
//
// FALLA CERRADO en todos los caminos de error:
//   - token ausente  -> 400 CAPTCHA_REQUERIDO
//   - success != true, acción incorrecta u hostname no permitido -> 400
//     CAPTCHA_INVALIDO
//   - sin secreto, falta TURNSTILE_HOSTNAMES en producción, timeout
//     (TURNSTILE_TIMEOUT_MS, 10 s por defecto), error de red o respuesta
//     inválida -> 503 CAPTCHA_NO_DISPONIBLE (nunca se deja pasar sin verificar).
//
// También se valida `hostname` contra TURNSTILE_HOSTNAMES para que un token
// emitido para otro sitio no sirva aquí. En desarrollo, si la variable falta,
// se permiten localhost y 127.0.0.1; en producción es obligatoria.
//
// No hay ningún bypass por NODE_ENV ni por otra variable: en local y en
// producción se verifica igual. La diferencia está sólo en el arranque
// (server.js exige secreto y hostnames en producción) y en las claves: fuera
// de producción se pueden usar las claves de prueba de Cloudflare, que no
// devuelven hostname ni action y por eso se saltan esas dos comprobaciones.
// Las claves de prueba nunca se aceptan en producción.
//
// Las respuestas son genéricas: nunca se devuelve ni se registra en el log
// el token enviado ni el cuerpo de la petición; en el log sólo se anota el
// código de error de Cloudflare (ya sin datos personales).

const URL_SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const LONGITUD_MAXIMA_TOKEN = 2048
const TIMEOUT_POR_DEFECTO_MS = 10000
const HOSTNAMES_LOCALES = ['localhost', '127.0.0.1']
const HOSTNAMES_LOCALES_PROHIBIDOS = new Set([...HOSTNAMES_LOCALES, '::1'])
const HOSTNAME_VALIDO = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
const ERRORES_NO_DISPONIBLES = new Set([
  'invalid-input-secret',
  'missing-input-secret',
  'internal-error',
])

// Claves de prueba de Cloudflare (siempre aprueban / siempre fallan).
// Empiezan por 1x0000, 2x0000 o 3x0000 y son de uso público y gratuito:
// sólo para desarrollo y pruebas, NUNCA en Render ni en Vercel.
export const esClaveDePrueba = (secreto) =>
  /^(1x0000|2x0000|3x0000)/.test(String(secreto || ''))

const leerHostnames = (valor = process.env.TURNSTILE_HOSTNAMES) => [
  ...new Set(
    String(valor || '')
      .split(',')
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean)
  ),
]

const normalizarHostname = (valor) =>
  String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')

// Lista de hostnames que siteverify debe devolver. En desarrollo, si la
// variable no está definida, se aceptan los hostnames locales habituales.
export const hostnamesEsperados = ({
  hostnames = process.env.TURNSTILE_HOSTNAMES,
  produccion = process.env.NODE_ENV === 'production',
} = {}) => {
  const lista = leerHostnames(hostnames)
  if (lista.length > 0) return lista
  return produccion ? [] : [...HOSTNAMES_LOCALES]
}

// Describe el problema de TURNSTILE_HOSTNAMES, o null si está bien. En
// desarrollo la ausencia no es un error: se usan los hostnames locales.
export const problemaDeHostnames = ({
  hostnames = process.env.TURNSTILE_HOSTNAMES,
  produccion = false,
} = {}) => {
  const lista = leerHostnames(hostnames)
  if (lista.length === 0) {
    return produccion
      ? 'Falta TURNSTILE_HOSTNAMES: en producción debes declarar el hostname exacto del frontend (sin protocolo, puerto ni ruta).'
      : null
  }

  const invalidos = lista.filter((hostname) => !HOSTNAME_VALIDO.test(hostname))
  if (invalidos.length > 0) {
    return `TURNSTILE_HOSTNAMES contiene hostnames no válidos: ${invalidos.join(', ')}. Usa hostnames exactos, sin protocolo, puerto ni ruta.`
  }

  if (produccion) {
    const locales = lista.filter((hostname) => HOSTNAMES_LOCALES_PROHIBIDOS.has(hostname))
    if (locales.length > 0) {
      return `TURNSTILE_HOSTNAMES no puede incluir hostnames locales en producción: ${locales.join(', ')}.`
    }
  }

  return null
}

const leerTimeoutMs = () => {
  const valor = Number(process.env.TURNSTILE_TIMEOUT_MS)
  return Number.isFinite(valor) && valor > 0 ? valor : TIMEOUT_POR_DEFECTO_MS
}

// Describe el problema del secreto, o null si está bien. Se usa en el
// arranque (producción exige secreto real) y en las pruebas. Nunca devuelve
// el valor del secreto.
export const problemaDelSecreto = ({ secreto = process.env.TURNSTILE_SECRET_KEY, produccion = false } = {}) => {
  if (!secreto) {
    return produccion
      ? 'Falta TURNSTILE_SECRET_KEY: en producción el registro y la recuperación no pueden funcionar sin Turnstile.'
      : 'Falta TURNSTILE_SECRET_KEY: Turnstile queda bloqueado (los endpoints afectados responderán 503 CAPTCHA_NO_DISPONIBLE).'
  }
  if (esClaveDePrueba(secreto)) {
    return produccion
      ? 'TURNSTILE_SECRET_KEY es una clave de prueba de Cloudflare (1x0000…): no puede usarse en producción.'
      : null
  }
  return null
}

const rechazarRequerido = (res) =>
  res.status(400).json({
    error: 'Completa la verificación de seguridad para continuar.',
    codigo: 'CAPTCHA_REQUERIDO',
  })

const rechazarInvalido = (res) =>
  res.status(400).json({
    error: 'La verificación de seguridad no es válida. Inténtalo de nuevo.',
    codigo: 'CAPTCHA_INVALIDO',
  })

const rechazarNoDisponible = (res) =>
  res.status(503).json({
    error: 'La verificación de seguridad no está disponible. Inténtalo más tarde.',
    codigo: 'CAPTCHA_NO_DISPONIBLE',
  })

// req es la petición entrante; se usa sólo para enviar `remoteip` (la IP del
// cliente según Express, con trust proxy) y nunca se registra el token.
export const verificarCaptcha = ({ accion }) => async (req, res, next) => {
  const secreto = process.env.TURNSTILE_SECRET_KEY
  const token = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken.trim() : ''

  if (!token) {
    return rechazarRequerido(res)
  }
  if (token.length > LONGITUD_MAXIMA_TOKEN) {
    console.error('[captcha] token demasiado largo, se descarta sin verificar')
    return rechazarInvalido(res)
  }
  if (!secreto) {
    console.error('[captcha] falta TURNSTILE_SECRET_KEY, se responde CAPTCHA_NO_DISPONIBLE')
    return rechazarNoDisponible(res)
  }

  const esPrueba = esClaveDePrueba(secreto)
  const hostnames = esPrueba ? [] : hostnamesEsperados()
  if (!esPrueba && hostnames.length === 0) {
    console.error('[captcha] falta TURNSTILE_HOSTNAMES, se responde CAPTCHA_NO_DISPONIBLE')
    return rechazarNoDisponible(res)
  }

  const cuerpo = new URLSearchParams({
    secret: secreto,
    response: token,
    remoteip: req.ip || '',
  })
  const timeoutMs = leerTimeoutMs()
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), timeoutMs)

  let verificacion
  try {
    const respuesta = await fetch(URL_SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo,
      signal: control.signal,
    })

    if (!respuesta.ok) {
      console.error(`[captcha] siteverify respondió ${respuesta.status}`)
      return rechazarNoDisponible(res)
    }

    verificacion = await respuesta.json().catch(() => null)
  } catch (error) {
    const motivo = error?.name === 'AbortError' ? `timeout tras ${timeoutMs} ms` : 'error de red'
    console.error(`[captcha] no se pudo verificar con siteverify: ${motivo}`)
    return rechazarNoDisponible(res)
  } finally {
    clearTimeout(reloj)
  }

  if (!verificacion || typeof verificacion !== 'object') {
    console.error('[captcha] respuesta inválida de siteverify')
    return rechazarNoDisponible(res)
  }

  if (verificacion.success !== true) {
    const codigos = Array.isArray(verificacion['error-codes'])
      ? verificacion['error-codes']
      : []
    const textoCodigos = codigos.length > 0 ? codigos.join(',') : 'sin-codigos'

    if (codigos.some((codigo) => ERRORES_NO_DISPONIBLES.has(codigo))) {
      console.error(`[captcha] siteverify no disponible o mal configurado: ${textoCodigos}`)
      return rechazarNoDisponible(res)
    }

    // En el log sólo va el código de Cloudflare: nunca el token.
    console.error(`[captcha] siteverify rechazó el token: ${textoCodigos}`)
    return rechazarInvalido(res)
  }

  // Con claves de prueba Cloudflare no devuelve `action` ni un hostname
  // significativo: esas dos comprobaciones sólo se exigen con secreto real.
  if (!esPrueba) {
    const hostname = normalizarHostname(verificacion.hostname)
    if (!hostname || !hostnames.includes(hostname)) {
      console.error(`[captcha] hostname no permitido: ${hostname || '(vacío)'}`)
      return rechazarInvalido(res)
    }

    if (verificacion.action !== accion) {
      console.error(
        `[captcha] acción incorrecta: esperada=${accion} recibida=${String(verificacion.action ?? '')}`
      )
      return rechazarInvalido(res)
    }
  }

  next()
}
