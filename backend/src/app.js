import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import productosRouter from './routes/productos.js'
import authRouter from './routes/auth.js'
import clientesRouter from './routes/clientes.js'
import pedidosRouter from './routes/pedidos.js'
import ventasRouter from './routes/ventas.js'
import productosAdminRouter from './routes/productosAdmin.js'
import usuariosAdminRouter from './routes/usuariosAdmin.js'
import categoriasRouter from './routes/categorias.js'
import categoriasAdminRouter from './routes/categoriasAdmin.js'
import rolesAdminRouter from './routes/rolesAdmin.js'
import tallasAdminRouter from './routes/tallasAdmin.js'
import coloresAdminRouter from './routes/coloresAdmin.js'
import configuracionRouter from './routes/configuracion.js'
import pruebasRouter from './routes/pruebas.js'
import { modoSimulacion } from './services/correos.js'
import { limitadorGeneral } from './middlewares/limitadores.js'
import { guardSesion } from './middlewares/guardSesion.js'

const app = express()

// Detrás de un proxy (Render, Vercel, etc.) req.ip debe leerse de
// X-Forwarded-For para que el límite de recuperación por IP funcione
// por usuario real. En local no hay proxy y el valor no cambia.
app.set('trust proxy', 1)

// Cabeceras de seguridad por defecto (X-Frame-Options, X-Content-Type-Options,
// HSTS, etc.). Cross-Origin-Resource-Policy se abre a 'cross-origin' porque el
// navegador consume la API desde otro origen (Vercel).
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// CORS_ORIGIN admite una lista separada por comas (varios dominios:
// producción de Vercel + http://localhost:5173, etc.). Si no se define,
// se conserva el valor por defecto de desarrollo.
const origenesPermitidos = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean)

app.use(cors({ origin: origenesPermitidos }))

// Cuerpos acotados: una petición enorme sólo sirve para saturar memoria.
// El rechazo se responde como 413 genérico en el manejador de errores.
app.use(express.json({ limit: '100kb' }))

// /api/health se monta ANTES del limitador general para que la sonda de
// Render (y el monitoreo) nunca pueda quedar bloqueada por una ráfaga.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Store La Mansión API',
    commit: (process.env.RENDER_GIT_COMMIT || 'local').slice(0, 7),
  })
})

// Barrera general de tasa por IP (Fase B).
app.use(limitadorGeneral)

// DENEGAR POR DEFECTO: todo lo que sigue, hasta la lista blanca de
// middlewares/rutasPublicas.js, exige un token válido y vivo.
app.use('/api', guardSesion)

app.use('/api/productos', productosRouter)
app.use('/api/auth', authRouter)
app.use('/api/clientes', clientesRouter)
app.use('/api/pedidos', pedidosRouter)
app.use('/api/ventas', ventasRouter)
app.use('/api/admin/productos', productosAdminRouter)
app.use('/api/admin/usuarios', usuariosAdminRouter)
app.use('/api/categorias', categoriasRouter)
app.use('/api/admin/categorias', categoriasAdminRouter)
app.use('/api/admin/roles', rolesAdminRouter)
app.use('/api/admin/tallas', tallasAdminRouter)
app.use('/api/admin/colores', coloresAdminRouter)
app.use('/api/configuracion', configuracionRouter)

// MODO DE PRUEBA: la bandeja de correos simulados (que contiene contraseñas
// temporales) solo se monta fuera de producción y sin BREVO_API_KEY. En
// producción esta ruta no existe y responde 404.
if (modoSimulacion()) {
  app.use('/api/pruebas', pruebasRouter)
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  // JSON mal formado: el cuerpo enviado NO se ecoa ni se registra (puede
  // contener credenciales a medio escribir).
  if (err?.type === 'entity.parse.failed') {
    console.error('[http] Cuerpo JSON inválido:', req.method, req.path)
    return res.status(400).json({ error: 'La petición no es válida' })
  }

  // Cuerpo por encima del límite.
  if (err?.type === 'entity.too.large') {
    console.error('[http] Cuerpo demasiado grande:', req.method, req.path)
    return res.status(413).json({ error: 'La petición es demasiado grande' })
  }

  const estado = Number(err?.status || err?.statusCode)
  if (estado >= 400 && estado < 500) {
    console.error('[http]', estado, req.method, req.path)
    return res.status(estado).json({ error: 'La petición no es válida' })
  }

  // 5xx: al cliente sólo un mensaje genérico; el detalle queda en el registro.
  console.error('[http] 500', err?.message, err?.stack)
  res.status(500).json({ error: 'Error interno del servidor' })
})

export default app