import { rateLimit } from 'express-rate-limit'

// Límites de tasa POR IP, en memoria (Fase A + B).
//
// El backend corre con UNA sola instancia en Render, así que no hace falta
// un store compartido: si algún día hay varias instancias, los contadores
// habrán de pasarse a Redis o a una tabla de Postgres.
//
// RATE_LIMIT_OFF=1 desactiva TODOS los límites. Es únicamente para los
// tests existentes (se ejecutan con esa variable para que sigan pasando
// igual que antes de esta fase); nunca debe definirse en producción.
//
// Fuera de producción (NODE_ENV !== 'production') los máximos por defecto
// son mucho más altos para no bloquear el desarrollo local; las pruebas que
// fijan sus propios máximos por variables de entorno los siguen respetando.
//
// Las cantidades por ventana se leen en cada petición y las ventanas al
// arrancar, de modo que se pueden ajustar por variables de entorno sin
// redeploy.

const desactivado = () => process.env.RATE_LIMIT_OFF === '1'

const esProduccion = () => process.env.NODE_ENV === 'production'

const enteroPositivo = (clave, defecto) => {
  const valor = Number(process.env[clave])
  return Number.isInteger(valor) && valor > 0 ? valor : defecto
}

const mensajeLimite = 'Demasiados intentos, intenta de nuevo en unos minutos.'

const crearLimitador = ({
  ventanaClave,
  ventanaDefecto,
  maximoClave,
  maximoDefecto,
  maximoDesarrollo,
  soloFallos = false,
}) =>
  rateLimit({
    windowMs: enteroPositivo(ventanaClave, ventanaDefecto) * 60_000,
    // Fuera de producción los valores por defecto son mucho más altos para
    // no bloquear las pruebas locales. Si se define la variable de entorno,
    // ésta siempre tiene prioridad (también en desarrollo y en los tests).
    limit: () =>
      enteroPositivo(
        maximoClave,
        esProduccion() ? maximoDefecto : (maximoDesarrollo ?? maximoDefecto)
      ),
    skip: desactivado,
    // Cuando sólo se cuentan los fallos, un inicio de sesión correcto no
    // consume el presupuesto de la IP: sólo los intentos rechazados pesan.
    skipSuccessfulRequests: soloFallos,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    statusCode: 429,
    handler: (req, res, siguiente, opciones) => {
      res.status(opciones.statusCode || 429).json({
        message: mensajeLimite,
        // Se conserva `error` para los clientes y pruebas que ya lo leían.
        error: mensajeLimite,
        codigo: 'RATE_LIMITED',
      })
    },
  })

// Barrera general de la API: corta ráfagas de cualquier origen (scraping,
// fuerza bruta distribuida en una misma IP, bucles rotos). Va montada DESPUÉS
// de /api/health para que la sonda de Render no pueda quedar bloqueada.
export const limitadorGeneral = crearLimitador({
  ventanaClave: 'GENERAL_VENTANA_MIN',
  ventanaDefecto: 15,
  maximoClave: 'GENERAL_MAX_POR_IP',
  maximoDefecto: 300,
  maximoDesarrollo: 10000,
})

// Inicios de sesión fallidos desde la misma IP.
export const limitadorLogin = crearLimitador({
  ventanaClave: 'LOGIN_VENTANA_MIN',
  ventanaDefecto: 15,
  maximoClave: 'LOGIN_MAX_POR_IP',
  maximoDefecto: 10,
  maximoDesarrollo: 1000,
  soloFallos: true,
})

// Registros públicos desde la misma IP.
export const limitadorRegistro = crearLimitador({
  ventanaClave: 'REGISTRO_VENTANA_MIN',
  ventanaDefecto: 60,
  maximoClave: 'REGISTRO_MAX_POR_IP',
  maximoDefecto: 5,
  maximoDesarrollo: 1000,
})

// Validación de códigos y cambio de contraseña por recuperación: no envían
// correo, pero son el paso que un atacante bombardea para adivinar el código.
export const limitadorRecuperacionCodigos = crearLimitador({
  ventanaClave: 'RECUPERACION_CODIGOS_VENTANA_MIN',
  ventanaDefecto: 15,
  maximoClave: 'RECUPERACION_CODIGOS_MAX_POR_IP',
  maximoDefecto: 20,
  maximoDesarrollo: 1000,
})
