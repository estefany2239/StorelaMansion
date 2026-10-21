// Invitaciones por correo con contraseña temporal, compartidas por el
// módulo de Usuarios (backend/src/routes/usuariosAdmin.js) y el de Clientes
// (backend/src/routes/clientes.js): misma generación, mismo vencimiento,
// mismo envío y mismo límite de reenvío. Así no se duplica el flujo.
//
// Reglas del flujo:
// - La contraseña temporal solo vive en el correo; en la base se guarda el
//   hash y nunca se imprime en consola ni se responde en los errores.
// - La invitación se guarda ANTES de enviar: si el envío falla, la fila se
//   conserva con invitacion_enviada = FALSE y el administrador puede
//   reenviarla más tarde.
// - El enlace SIEMPRE apunta al login (?vista=login): la pantalla de cambio
//   de contraseña solo aparece después de entrar con la temporal.

import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import {
  enviarCorreo,
  generarContrasenaTemporal,
  modoSimulacion,
  plantillaInvitacion,
  plantillaInvitacionCliente,
} from './correos.js'

// Enlace profundo al login.
export const enlaceLogin = () =>
  process.env.APP_LOGIN_URL || 'http://localhost:5173/?vista=login'

// Horas de vigencia de la contraseña temporal (por defecto 48).
export const horasVigenciaTemporal = () => {
  const horas = Number(process.env.CONTRASENA_TEMPORAL_HORAS)
  return Number.isInteger(horas) && horas > 0 ? horas : 48
}

// Nueva contraseña temporal: devuelve la clave (para el correo), su hash
// (para la base) y el vencimiento.
export const generarClaveTemporal = async () => {
  const contrasenaTemporal = generarContrasenaTemporal()
  const hash = await bcrypt.hash(contrasenaTemporal, 10)
  const vencimiento = new Date(Date.now() + horasVigenciaTemporal() * 3600 * 1000)
  return { contrasenaTemporal, hash, vencimiento }
}

// Límite de frecuencia del reenvío: un reenvío por usuario cada
// REENVIO_INVITACION_SEGUNDOS segundos (60 por defecto). En memoria.
const ultimoReenvio = new Map()

const segundosReenvio = () => {
  const segundos = Number(process.env.REENVIO_INVITACION_SEGUNDOS)
  return Number.isInteger(segundos) && segundos >= 0 ? segundos : 60
}

// Devuelve los segundos que faltan para poder reenviar, o 0 si ya se puede.
export const esperaReenvio = (id) => {
  const ultimo = ultimoReenvio.get(id)
  if (!ultimo) return 0
  const transcurrido = Date.now() - ultimo
  const limite = segundosReenvio() * 1000
  return transcurrido >= limite ? 0 : Math.ceil((limite - transcurrido) / 1000)
}

export const marcarReenvio = (id) => {
  ultimoReenvio.set(id, Date.now())
}

// Envía la invitación por correo y, si salió bien, deja
// invitacion_enviada = TRUE en la base. NUNCA lanza: quien llama ya guardó
// la fila (o la contraseña) y debe conservarlas aunque el envío falle.
// Devuelve { ok, modo } para que la respuesta del panel lo refleje.
export const enviarInvitacion = async ({
  tipo = 'usuario',
  idUsuario,
  para,
  nombre,
  contrasenaTemporal,
  vencimiento,
}) => {
  const plantilla =
    tipo === 'cliente'
      ? plantillaInvitacionCliente({
          nombre,
          correo: para,
          contrasenaTemporal,
          enlaceLogin: enlaceLogin(),
          vencimiento,
        })
      : plantillaInvitacion({
          nombre,
          contrasenaTemporal,
          enlaceLogin: enlaceLogin(),
          vencimiento,
        })

  try {
    const resultado = await enviarCorreo({
      para,
      asunto: plantilla.asunto,
      html: plantilla.html,
      texto: plantilla.texto,
    })
    if (resultado.ok && idUsuario) {
      await pool.query('UPDATE usuario SET invitacion_enviada = TRUE WHERE id_usuario = $1', [
        idUsuario,
      ])
    }
    return resultado
  } catch (err) {
    // Solo el motivo del fallo: nunca la contraseña temporal ni el correo.
    console.error(`[${tipo}] No se pudo enviar la invitación:`, err.message)
    return { ok: false, modo: modoSimulacion() ? 'simulado' : 'brevo' }
  }
}
