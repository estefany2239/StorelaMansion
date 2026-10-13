import express from 'express'
import cors from 'cors'
import productosRouter from './routes/productos.js'
import authRouter from './routes/auth.js'
import clientesRouter from './routes/clientes.js'
import pedidosRouter from './routes/pedidos.js'

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
  res.json({ status: 'ok', app: 'Store La Mansión API' })
})

app.use('/api/productos', productosRouter)
app.use('/api/auth', authRouter)
app.use('/api/clientes', clientesRouter)
app.use('/api/pedidos', pedidosRouter)

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
})

export default app