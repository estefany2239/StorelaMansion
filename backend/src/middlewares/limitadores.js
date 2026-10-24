import { rateLimit } from 'express-rate-limit'

// Límites de tasa POR IP, en memoria (Fase A).
//
// El backend corre con UNA sola instancia en Render, así que no hace falta
// un store compartido: si algún día hay varias instancias, los contadores
// habrán de pasarse a Redis o a una tabla de Postgres.
//
// RATE_LIMIT_OFF=1 desactiva TODOS los límites. Es únicamente para los
// tests existentes (se ejecutan con esa variable para que sigan pasando
// igual que antes de esta fase); nunca debe definirse en producción.
//
// Las cantidades por ventana se leen en cada petición y las ventanas al
// arrancar, de modo que se pueden ajustar por variables de entorno sin
// redeploy.

const desactivado = () => process.env.RATE_LIMIT_OFF === '1'

const enteroPositivo = (clave, defecto) => {
  const valor = Number(process.env[clave])
  return Number.isInteger(valor) && valor > 0 ? valor : defecto
}

const mensajeLimite = 'Demasiadas peticiones desde esta conexión. Intenta más tarde.'

const crearLimitador = ({ ventanaClave, ventanaDefecto, maximoClave, maximoDefecto }) =>
  rateLimit({
    windowMs: enteroPositivo(ventanaClave, ventanaDefecto) * 60_000,
    limit: () => enteroPositivo(maximoClave, maximoDefecto),
    skip: desactivado,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    statusCode: 429,
    handler: (req, res, siguiente, opciones) => {
      res.status(opciones.statusCode || 429).json({
        error: mensajeLimite,
        codigo: 'RATE_LIMITED',
      })
    },
  })

// Inicios de sesión fallidos o repetidos desde la misma IP.
export const limitadorLogin = crearLimitador({
  ventanaClave: 'LOGIN_VENTANA_MIN',
  ventanaDefecto: 15,
  maximoClave: 'LOGIN_MAX_POR_IP',
  maximoDefecto: 10,
})

// Registros públicos desde la misma IP.
export const limitadorRegistro = crearLimitador({
  ventanaClave: 'REGISTRO_VENTANA_MIN',
  ventanaDefecto: 60,
  maximoClave: 'REGISTRO_MAX_POR_IP',
  maximoDefecto: 5,
})

// Validación de códigos y cambio de contraseña por recuperación: no envían
// correo, pero son el paso que un atacante bombardea para adivinar el código.
export const limitadorRecuperacionCodigos = crearLimitador({
  ventanaClave: 'RECUPERACION_CODIGOS_VENTANA_MIN',
  ventanaDefecto: 15,
  maximoClave: 'RECUPERACION_CODIGOS_MAX_POR_IP',
  maximoDefecto: 20,
})
