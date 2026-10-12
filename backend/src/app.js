import express from 'express'
import cors from 'cors'
import productosRouter from './routes/productos.js'
import authRouter from './routes/auth.js'
import clientesRouter from './routes/clientes.js'
import pedidosRouter from './routes/pedidos.js'

const app = express()

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: corsOrigin }))
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