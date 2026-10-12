import jwt from 'jsonwebtoken'

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
