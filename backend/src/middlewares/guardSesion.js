import { verificarToken } from './auth.js'
import { esPublica } from './rutasPublicas.js'

// Guard de DENEGAR POR DEFECTO (Fase B, ajuste F).
//
// Se monta ANTES que todos los routers de /api: cualquier petición que no
// aparezca en la lista blanca de rutasPublicas.js necesita un token válido y
// vivo. Una ruta "olvidada" en la lista blanca se detecta como 401/403 en las
// pruebas; una ruta nueva que alguien exponga sin entrar en la lista
// simplemente queda protegida.
//
// No se responde nada aquí: verificarToken se encarga (401 sin token, 401 con
// token inválido o de recuperación, 403 con la cuenta inactiva, 500 si la
// base de datos no responde).
export function guardSesion(req, res, next) {
  const ruta = (req.originalUrl || '').split('?')[0]
  const clave = `${req.method.toUpperCase()} ${ruta}`

  if (esPublica(clave)) {
    return next()
  }

  // verificarToken es asincrónica; si por lo que sea rechazara la promesa
  // (Express 4 no la captura), aquí se evita un rechazo sin atender.
  Promise.resolve(verificarToken(req, res, next)).catch((error) => {
    console.error('Error al verificar la sesión:', error.message)
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo verificar la sesión' })
    }
  })
}
