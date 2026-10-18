import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

export function verificarToken(req, res, next) {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' })
  }

  const token = header.slice(7).trim()

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

export function soloRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' })
    }
    next()
  }
}

// Bloquea cualquier ruta privada mientras el usuario tenga una contraseña
// temporal pendiente (cambio_contrasena_obligatorio = true). Comprueba la
// BASE DE DATOS en cada petición, no solo el token. Solo se permiten cambiar
// la contraseña (POST /api/auth/cambiar-contrasena) y cerrar sesión (que es
// del lado del navegador).
export async function bloquearCambioPendiente(req, res, next) {
  try {
    const id = req.usuario?.id
    if (!id) {
      return res.status(401).json({ error: 'Token no proporcionado' })
    }

    const { rows } = await pool.query(
      'SELECT cambio_contrasena_obligatorio FROM usuario WHERE id_usuario = $1',
      [id]
    )

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    if (rows[0].cambio_contrasena_obligatorio) {
      return res.status(403).json({
        error: 'Debes cambiar tu contraseña temporal antes de continuar',
        codigo: 'PASSWORD_CHANGE_REQUIRED',
      })
    }

    next()
  } catch (error) {
    console.error('Error al comprobar el cambio de contraseña:', error.message)
    res.status(500).json({ error: 'No se pudo verificar tu cuenta' })
  }
}
