import express from 'express'
import cors from 'cors'
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
import pruebasRouter from './routes/pruebas.js'
import { modoSimulacion } from './services/correos.js'

const app = express()

// CORS_ORIGIN admite una lista separada por comas (varios dominios:
// producción de Vercel + http://localhost:5173, etc.). Si no se define,
// se conserva el valor por defecto de desarrollo.
const origenesPermitidos = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean)

app.use(cors({ origin: origenesPermitidos }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Store La Mansión API',
    commit: (process.env.RENDER_GIT_COMMIT || 'local').slice(0, 7),
  })
})

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
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
})

export default app