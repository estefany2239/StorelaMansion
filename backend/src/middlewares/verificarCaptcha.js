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
//   - success != true -> 400 CAPTCHA_INVALIDO
//   - sin secreto, timeout (3 s), error de red o respuesta inválida -> 503
//     CAPTCHA_NO_DISPONIBLE (nunca se deja pasar sin verificar).
//
// No hay ningún bypass por NODE_ENV ni por otra variable: en local y en
// producción se verifica igual. La diferencia está sólo en el arranque
// (server.js exige secreto en producción) y en las claves: fuera de
// producción se usan las claves de prueba de Cloudflare.
//
// Las respuestas son genéricas: nunca se devuelve ni se registra en el log
// el token enviado ni el cuerpo de la petición; en el log sólo se anota el
// código de error de Cloudflare (ya sin datos personales).

const URL_SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const LONGITUD_MAXIMA_TOKEN = 2048
const TIMEOUT_MS = 3000

// Claves de prueba de Cloudflare (siempre aprueban / siempre fallan).
// Empiezan por 1x0000, 2x0000 o 3x0000 y son de uso público y gratuito:
// sólo para desarrollo y pruebas, NUNCA en Render ni en Vercel.
export const esClaveDePrueba = (secreto) =>
  /^(1x0000|2x0000|3x0000)/.test(String(secreto || ''))

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

  const cuerpo = new URLSearchParams({
    secret: secreto,
    response: token,
    remoteip: req.ip || '',
  })
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), TIMEOUT_MS)

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
    const motivo = error?.name === 'AbortError' ? 'timeout tras 3 s' : 'error de red'
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
      ? verificacion['error-codes'].join(',')
      : 'sin-codigos'
    // En el log sólo va el código de Cloudflare: nunca el token.
    console.error(`[captcha] siteverify rechazó el token: ${codigos}`)
    return rechazarInvalido(res)
  }

  // Con claves de prueba Cloudflare no devuelve `action`, así que la
  // comprobación de acción sólo se exige con un secreto real.
  if (!esClaveDePrueba(secreto) && verificacion.action !== accion) {
    console.error(
      `[captcha] acción incorrecta: esperada=${accion} recibida=${String(verificacion.action ?? '')}`
    )
    return rechazarInvalido(res)
  }

  next()
}
