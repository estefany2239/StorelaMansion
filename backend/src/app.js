import express from 'express'
import cors from 'cors'

const app = express()

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: corsOrigin }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Store La Mansión API' })
})

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
})

export default app
