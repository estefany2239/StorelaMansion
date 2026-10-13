import 'dotenv/config'
import app from './src/app.js'

// Variables obligatorias. Se comprueba solo su presencia: nunca se imprime
// su valor (podría contener credenciales o el secreto JWT).
const requeridas = ['DATABASE_URL', 'JWT_SECRET']
const faltantes = requeridas.filter((nombre) => !process.env[nombre])

if (faltantes.length > 0) {
  console.error(
    `[config] Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. ` +
      'Defínelas en backend/.env (ver backend/.env.example).'
  )
  process.exit(1)
}

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Store La Mansión API escuchando en http://localhost:${PORT}`)
})
