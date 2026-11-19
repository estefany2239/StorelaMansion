import crypto from 'node:crypto'

// Protecciones anti-automatización del registro público (Fase A):
//
// 1. Campo trampa (`website`): un input oculto que una persona nunca rellena.
//    Si llega con contenido, el bot rellenó todo el formulario.
// 2. Tiempo mínimo de envío (`ts`): el navegador manda el instante en que se
//    abrió el formulario. Entre ese instante y el envío deben pasar al menos
//    REGISTRO_TIEMPO_MINIMO_MS. Una petición hecha a mano a la API no lleva
//    `ts` (o lleva uno inventado a la carta), y una automatización directa
//    sobre el endpoint cae aquí.
//
// Ambas capas son baratas y consultables desde consola, así que sólo suben el
// coste de un ataque tonto: no sustituyen al CAPTCHA (Fase C).
//
// El rechazo es SILENCIOSO: se responde como si el registro hubiera salido
// bien, sin crear la cuenta y sin decirle al atacante que algo falló. En el
// log sólo queda un aviso genérico, nunca el cuerpo de la petición.

// Mínimo razonable para rellenar nombre, correo, teléfono, documento,
// contraseña y fecha de nacimiento a mano.
const tiempoMinimoMs = () => {
  const ms = Number(process.env.REGISTRO_TIEMPO_MINIMO_MS)
  return Number.isInteger(ms) && ms > 0 ? ms : 3000
}

// Tolerancia al reloj del cliente (adelantado/atrás respecto del servidor).
const desvioMs = () => {
  const ms = Number(process.env.REGISTRO_DESVIO_MAX_MS)
  return Number.isInteger(ms) && ms > 0 ? ms : 120000
}

export const proteccionRegistro = (req, res, next) => {
  const trampa = String(req.body?.website ?? '').trim()
  const ts = Number(req.body?.ts)
  const ahora = Date.now()

  const honeypotLleno = trampa !== ''
  const tsAusente = !Number.isFinite(ts) || ts <= 0
  const demasiadoRapido = !tsAusente && ahora - ts < tiempoMinimoMs()
  const relojImposible = !tsAusente && ts - ahora > desvioMs()

  if (honeypotLleno || tsAusente || demasiadoRapido || relojImposible) {
    console.warn('[auth] registro descartado por la protección anti-bot')
    return res.status(201).json({
      id: crypto.randomInt(100000, 999999),
      mensaje: 'Cuenta creada con éxito',
    })
  }

  next()
}
