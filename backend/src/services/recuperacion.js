import crypto from 'node:crypto'
import { enviarCorreo, plantillaRecuperacion, modoSimulacion } from './correos.js'

const claveConfig = 'RECUPERACION_HMAC_SECRETO'

export const faltaSecretoRecuperacion = () => !process.env[claveConfig]

export const hmacCodigo = (codigo) => {
  const secreto = process.env[claveConfig]
  if (!secreto) {
    throw new Error(`Falta ${claveConfig} en el archivo .env del backend`)
  }
  return crypto.createHmac('sha256', secreto).update(String(codigo)).digest('hex')
}

export const compararHmac = (a, b) => {
  const bufA = Buffer.from(String(a || ''), 'hex')
  const bufB = Buffer.from(String(b || ''), 'hex')
  if (bufA.length === 0 || bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export const generarCodigo = () =>
  String(crypto.randomInt(0, 1000000)).padStart(6, '0')

export const minutosVigencia = () => {
  const minutos = Number(process.env.RECUPERACION_CODIGO_MINUTOS)
  return Number.isInteger(minutos) && minutos > 0 ? minutos : 15
}

export const intentosMaximos = () => {
  const intentos = Number(process.env.RECUPERACION_INTENTOS_MAX)
  return Number.isInteger(intentos) && intentos > 0 ? intentos : 5
}

const segundosReenvioCorreo = () => {
  const segundos = Number(process.env.RECUPERACION_REENVIO_SEGUNDOS)
  return Number.isInteger(segundos) && segundos >= 0 ? segundos : 60
}

const maximoPorIp = () => {
  const maximo = Number(process.env.RECUPERACION_MAX_POR_IP)
  return Number.isInteger(maximo) && maximo > 0 ? maximo : 5
}

const ventanaIpMinutos = () => {
  const minutos = Number(process.env.RECUPERACION_VENTANA_IP_MINUTOS)
  return Number.isInteger(minutos) && minutos > 0 ? minutos : 15
}

const solicitudesPorCorreo = new Map()
const solicitudesPorIp = new Map()

const podar = (mapa, ahora, ventanaMs) => {
  for (const [clave, tiempos] of mapa) {
    const vivos = tiempos.filter((t) => ahora - t < ventanaMs)
    if (vivos.length === 0) mapa.delete(clave)
    else mapa.set(clave, vivos)
  }
}

export const esperaCorreo = (correo) => {
  const ultimo = solicitudesPorCorreo.get(correo)
  if (!ultimo) return 0
  const limite = segundosReenvioCorreo() * 1000
  const transcurrido = Date.now() - ultimo
  return transcurrido >= limite ? 0 : Math.ceil((limite - transcurrido) / 1000)
}

export const registrarSolicitudCorreo = (correo) => {
  solicitudesPorCorreo.set(correo, Date.now())
  if (solicitudesPorCorreo.size > 5000) {
    podar(solicitudesPorCorreo, Date.now(), segundosReenvioCorreo() * 1000)
  }
}

export const superadoLimiteIp = (ip) => {
  const ahora = Date.now()
  const ventanaMs = ventanaIpMinutos() * 60 * 1000
  podar(solicitudesPorIp, ahora, ventanaMs)
  const tiempos = solicitudesPorIp.get(ip) || []
  return tiempos.length >= maximoPorIp()
}

export const registrarSolicitudIp = (ip) => {
  const ahora = Date.now()
  const ventanaMs = ventanaIpMinutos() * 60 * 1000
  const tiempos = (solicitudesPorIp.get(ip) || []).filter((t) => ahora - t < ventanaMs)
  tiempos.push(ahora)
  solicitudesPorIp.set(ip, tiempos)
}

export const enviarCodigoRecuperacion = async ({ nombre, para, codigo, minutos }) => {
  try {
    const plantilla = plantillaRecuperacion({ nombre, codigo, minutos })
    const resultado = await enviarCorreo({
      para,
      asunto: plantilla.asunto,
      html: plantilla.html,
      texto: plantilla.texto,
    })
    return resultado
  } catch (err) {
    console.error('[recuperacion] No se pudo enviar el código de recuperación:', err.message)
    return { ok: false, modo: modoSimulacion() ? 'simulado' : 'brevo' }
  }
}
