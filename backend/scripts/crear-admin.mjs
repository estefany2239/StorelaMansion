import 'dotenv/config'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const rl = readline.createInterface({ input, output })

try {
  const nombre = (await rl.question('Nombre completo: ')).trim()
  const correo = (await rl.question('Correo: ')).trim().toLowerCase()
  const contrasena = await rl.question('Contraseña (mínimo 8 caracteres): ')

  if (!nombre || !correo.includes('@') || contrasena.length < 8) {
    throw new Error('Datos inválidos: revisa el nombre, el correo y que la contraseña tenga 8 caracteres o más')
  }

  const rol = await pool.query("SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Administrador'")
  if (!rol.rows[0].id) {
    throw new Error("Falta el rol 'Administrador' en la tabla rol")
  }

  const [nombres, ...resto] = nombre.split(/\s+/)
  const apellidos = resto.join(' ')
  const hash = await bcrypt.hash(contrasena, 10)

  const existente = await pool.query(
    'SELECT id_usuario FROM usuario WHERE LOWER(correo) = $1',
    [correo]
  )

  if (existente.rowCount > 0) {
    await pool.query(
      'UPDATE usuario SET id_rol = $1, contrasena = $2, estado = TRUE WHERE id_usuario = $3',
      [rol.rows[0].id, hash, existente.rows[0].id_usuario]
    )
    console.log('Ese correo ya existía: ahora es Administrador y se actualizó su contraseña.')
  } else {
    await pool.query(
      `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol)
       VALUES ($1, $2, $3, $4, $5)`,
      [nombres, apellidos, correo, hash, rol.rows[0].id]
    )
    console.log('Administrador creado con éxito.')
  }
} catch (error) {
  console.error('Error:', error.message)
} finally {
  rl.close()
  await pool.end()
}