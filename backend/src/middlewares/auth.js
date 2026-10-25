import jwt from 'jsonwebtoken'
import { pool } from '../config/db.js'

// ============================================================
// SESIÓN (Fase B)
//
// El token JWT sólo dice QUIÉN es; el ESTADO, el ROL y el cambio de
// contraseña pendiente se leen de la base de datos en cada petición, de
// modo que desactivar un usuario o quitarle un rol surte efecto de
// inmediato, con el token que ya tenía en la mano.
//
// Todas las operaciones son "fail-closed": si la base de datos no
// responde, la petición NO pasa (500) en lugar de dejarla continuar.
// ============================================================

// Devuelve un veredicto para que quien llame responda FUERA del try/catch:
// así next() nunca queda atrapado dentro de un bloque que captura errores.
const fallo = (status, error, codigo) => ({
  ok: false,
  status,
  cuerpo: codigo ? { error, codigo } : { error },
})

const cargarSesion = async (token) => {
  let payload
  try {
    // Sólo HS256: impide `alg: none` o cualquier otro algoritmo admisible
    // por la librería.
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    return fallo(401, 'Token inválido o expirado')
  }

  // Un payload que no sea objeto no es un token de sesión.
  if (!payload || typeof payload !== 'object' || !payload.id) {
    return fallo(401, 'Token inválido o expirado')
  }

  // Los tokens de un solo uso (recuperación de contraseña) no sirven para
  // abrir sesión ni para llamar a ninguna ruta privada.
  if (payload.proposito) {
    return fallo(401, 'Token inválido o expirado')
  }

  const { rows } = await pool.query(
    `SELECT u.id_usuario, u.estado, u.cambio_contrasena_obligatorio, r.nombre AS rol
       FROM usuario u
       LEFT JOIN rol r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = $1`,
    [payload.id]
  )

  if (rows.length === 0) {
    return fallo(401, 'Token inválido o expirado')
  }

  const fila = rows[0]
  if (!fila.estado) {
    return fallo(403, 'Tu cuenta está inactiva', 'ACCOUNT_DISABLED')
  }

  // El rol de la BD manda sobre el del token: un rol recién quitado o
  // degradado deja de servir aunque el token viejo lo diga.
  return {
    ok: true,
    usuario: { ...payload, id: fila.id_usuario, rol: fila.rol ?? null },
    pendiente: Boolean(fila.cambio_contrasena_obligatorio),
  }
}

// Autenticación. Asincrónica: consulta la base de datos.
export async function verificarToken(req, res, next) {
  // El guard de denegar por defecto ya autenticó la petición: no se repite
  // la consulta (los routers siguen llamando a este middleware a sus anchas).
  if (req.sesionVerificada) {
    return next()
  }

  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' })
  }

  const token = header.slice(7).trim()

  let veredicto
  try {
    veredicto = await cargarSesion(token)
  } catch (error) {
    // La base de datos falló: fail-closed, no se deja pasar.
    console.error('Error al verificar la sesión:', error.message)
    return res.status(500).json({ error: 'No se pudo verificar la sesión' })
  }

  if (!veredicto.ok) {
    return res.status(veredicto.status).json(veredicto.cuerpo)
  }

  req.usuario = veredicto.usuario
  req.cambioContrasenaPendiente = veredicto.pendiente
  req.sesionVerificada = true
  next()
}

export function soloRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' })
    }
    next()
  }
}

// Autoriza por permisos de la BD ("Módulo:Privilegio"), NO por nombre de rol.
// Consulta la BD en cada petición (no se cachean en el JWT) para que un cambio
// de permisos aplique de inmediato. No hay bypass para Administrador: se
// autoriza exactamente lo que diga rol_permiso. El rol del usuario se obtiene
// desde la BD a partir de req.usuario.id (usuario -> rol_permiso -> permiso).
export function requierePrivilegio(modulo, privilegio) {
  const nombre = `${modulo}:${privilegio}`
  return async (req, res, next) => {
    let permitido = false
    try {
      const id = req.usuario?.id
      if (!id) {
        return res.status(401).json({ error: 'Token no proporcionado' })
      }

      const { rows } = await pool.query(
        `SELECT 1
           FROM usuario u
           JOIN rol_permiso rp ON rp.id_rol = u.id_rol
           JOIN permiso p      ON p.id_permiso = rp.id_permiso AND p.estado = TRUE
          WHERE u.id_usuario = $1 AND p.nombre = $2 AND u.estado = TRUE
          LIMIT 1`,
        [id, nombre]
      )

      permitido = rows.length > 0
    } catch (error) {
      console.error('Error al comprobar el permiso:', error.message)
      return res.status(500).json({ error: 'No se pudieron verificar los permisos' })
    }

    if (!permitido) {
      return res.status(403).json({
        error: 'No tienes permisos para acceder a este recurso',
        codigo: 'FORBIDDEN',
        permisoRequerido: nombre,
      })
    }

    next()
  }
}

// Devuelve los permisos ("Módulo:Privilegio") del rol de un usuario.
export async function obtenerPermisos(idUsuario) {
  const { rows } = await pool.query(
    `SELECT p.nombre
       FROM usuario u
       JOIN rol_permiso rp ON rp.id_rol = u.id_rol
       JOIN permiso p      ON p.id_permiso = rp.id_permiso AND p.estado = TRUE
      WHERE u.id_usuario = $1 AND u.estado = TRUE
      ORDER BY p.nombre`,
    [idUsuario]
  )
  return rows.map((r) => r.nombre)
}

// Bloquea cualquier ruta privada mientras el usuario tenga una contraseña
// temporal pendiente (cambio_contrasena_obligatorio = true). Reutiliza la
// lectura que ya hizo verificarToken; si se usa de forma aislada, consulta la
// base de datos y también valida el estado de la cuenta.
export async function bloquearCambioPendiente(req, res, next) {
  if (!req.usuario?.id) {
    return res.status(401).json({ error: 'Token no proporcionado' })
  }

  let pendiente = req.cambioContrasenaPendiente

  if (typeof pendiente !== 'boolean') {
    try {
      const { rows } = await pool.query(
        'SELECT estado, cambio_contrasena_obligatorio FROM usuario WHERE id_usuario = $1',
        [req.usuario.id]
      )
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Token inválido o expirado' })
      }
      if (!rows[0].estado) {
        return res
          .status(403)
          .json({ error: 'Tu cuenta está inactiva', codigo: 'ACCOUNT_DISABLED' })
      }
      pendiente = Boolean(rows[0].cambio_contrasena_obligatorio)
      req.cambioContrasenaPendiente = pendiente
    } catch (error) {
      console.error('Error al comprobar el cambio de contraseña:', error.message)
      return res.status(500).json({ error: 'No se pudo verificar tu cuenta' })
    }
  }

  if (pendiente) {
    return res.status(403).json({
      error: 'Debes cambiar tu contraseña temporal antes de continuar',
      codigo: 'PASSWORD_CHANGE_REQUIRED',
    })
  }

  next()
}
