// Pruebas del flujo de invitación de usuarios (contraseña temporal):
//   1. Un administrador crea un Vendedor sin contraseña.
//   2. El backend genera la contraseña temporal y envía la invitación
//      (simulada cuando no hay BREVO_API_KEY).
//   3. El correo simulado solo enlaza al login (?vista=login).
//   4. Con la contraseña temporal el login marca cambioContrasena
//      (pantalla "Establecer nueva contraseña", no el panel).
//   5. Tras cambiar la contraseña, el login queda limpio y el rol
//      Vendedor permite entrar al panel administrativo.
//
// Requiere el backend corriendo en http://localhost:3000 (npm run dev).

import 'dotenv/config'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import pg from 'pg'
import { enviarCorreo, modoSimulacion, buzonSimulado } from '../src/services/correos.js'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const BASE = 'http://localhost:3000/api'
const ADMIN_EMAIL = 'admin-prueba-invitacion@test.com'
const VENDEDOR_EMAIL = 'vendedor-prueba-invitacion@test.com'
const ADMIN2_EMAIL = 'admin2-prueba-invitacion@test.com'
const CLAVE_ADMIN = crypto.randomBytes(16).toString('base64url')
const CLAVE_NUEVA = crypto.randomBytes(16).toString('base64url') + 'Aa1'

const ENLACE_LOGIN = process.env.APP_LOGIN_URL || 'http://localhost:5173/?vista=login'
const SIN_BREVO = !process.env.BREVO_API_KEY

const CORREOS_PRUEBA = [ADMIN_EMAIL, VENDEDOR_EMAIL, ADMIN2_EMAIL]

let fallos = 0

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

const pedir = async (metodo, ruta, { token, body } = {}) => {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await respuesta.json()
  } catch {
    data = null
  }
  return { status: respuesta.status, data }
}

const limpiar = async () => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM usuario WHERE correo = ANY($1::text[])',
      [CORREOS_PRUEBA]
    )
    if (rowCount > 0) console.log(`\n=== LIMPIEZA: ${rowCount} usuario(s) de prueba eliminados ===`)
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
  }
}

const prepararAdmin = async () => {
  await limpiar()
  fallos = 0

  const rolAdmin = await pool.query("SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Administrador'")
  if (!rolAdmin.rows[0].id) throw new Error("Falta el rol 'Administrador'")

  const hash = await bcrypt.hash(CLAVE_ADMIN, 10)
  await pool.query(
    `INSERT INTO usuario (nombres, apellidos, correo, contrasena, id_rol, estado)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    ['Admin', 'Invitacion', ADMIN_EMAIL, hash, rolAdmin.rows[0].id]
  )
}

const main = async () => {
  await prepararAdmin()

  const loginAdmin = await pedir('POST', '/auth/login', {
    body: { correo: ADMIN_EMAIL, contrasena: CLAVE_ADMIN },
  })
  comprobar('login admin (200)', loginAdmin.status === 200, `status=${loginAdmin.status}`)
  const tokenAdmin = loginAdmin.data?.token
  if (!tokenAdmin) {
    console.error('No se obtuvo token de administrador; se abortan las pruebas.')
    return
  }

  // 0.5) El backend rechaza cualquier contraseña al crear usuarios
  const CORREO_INTRUSO = 'intruso-password-invitacion@test.com'
  const crearConClave = await pedir('POST', '/admin/usuarios', {
    token: tokenAdmin,
    body: {
      nombre: 'Intruso Password',
      correo: CORREO_INTRUSO,
      telefono: '3000000000',
      direccion: 'Calle 0',
      rol: 'Cliente',
      estado: 'Activo',
      contrasena: 'clave-prohibida-123',
    },
  })
  comprobar(
    'crear con contraseña -> 400 (rechazado)',
    crearConClave.status === 400,
    `status=${crearConClave.status}`
  )
  const intruso = await pool.query('SELECT 1 FROM usuario WHERE correo = $1', [CORREO_INTRUSO])
  comprobar('la contraseña rechazada no crea el usuario', intruso.rowCount === 0)

  // 1) Crear un Vendedor SIN contraseña desde el panel
  const crear = await pedir('POST', '/admin/usuarios', {
    token: tokenAdmin,
    body: {
      nombre: 'Vendedor Invitacion',
      correo: VENDEDOR_EMAIL,
      telefono: '3001234567',
      direccion: 'Calle 1 # 2-3',
      rol: 'Vendedor',
      estado: 'Activo',
    },
  })
  comprobar('crear vendedor sin contraseña -> 201', crear.status === 201, `status=${crear.status}`)

  const contrasenaTemporal = crear.data?.contrasenaTemporal
  comprobar(
    'el backend devuelve una contraseña temporal',
    typeof contrasenaTemporal === 'string' && contrasenaTemporal.length >= 8
  )
  comprobar(
    'crea el vendedor con rol Vendedor',
    crear.data?.rol === 'Vendedor',
    `rol=${crear.data?.rol}`
  )
  comprobar(
    'enlace de invitación solo apunta al login (?vista=login)',
    crear.data?.enlaceInvitacion === ENLACE_LOGIN,
    `enlace=${crear.data?.enlaceInvitacion}`
  )
  comprobar(
    'la invitación queda marcada como enviada',
    crear.data?.invitacionEnviada === true,
    `invitacionEnviada=${crear.data?.invitacionEnviada} modo=${crear.data?.modoCorreo}`
  )
  if (SIN_BREVO) {
    comprobar(
      'sin BREVO_API_KEY el envío queda en modo simulado',
      crear.data?.modoCorreo === 'simulado',
      `modo=${crear.data?.modoCorreo}`
    )
  }

  // 2) Bandera en base de datos
  const { rows: filaDb } = await pool.query(
    `SELECT cambio_contrasena_obligatorio, invitacion_enviada, contrasena_temporal_vencimiento
     FROM usuario WHERE correo = $1`,
    [VENDEDOR_EMAIL]
  )
  const db = filaDb[0]
  comprobar('BD: cambio_contrasena_obligatorio = TRUE', db?.cambio_contrasena_obligatorio === true)
  comprobar('BD: invitacion_enviada = TRUE', db?.invitacion_enviada === true)
  comprobar(
    'BD: vencimiento en el futuro',
    db?.contrasena_temporal_vencimiento && new Date(db.contrasena_temporal_vencimiento) > new Date(),
    `vence=${db?.contrasena_temporal_vencimiento}`
  )

  // 3) Bandeja de correos simulados (modo de prueba: /api/pruebas)
  if (SIN_BREVO) {
    const sinToken = await pedir('GET', '/pruebas/invitaciones-simuladas')
    comprobar('bandeja simulada sin token -> 401', sinToken.status === 401, `status=${sinToken.status}`)

    const bandeja = await pedir('GET', '/pruebas/invitaciones-simuladas', { token: tokenAdmin })
    comprobar('bandeja simulada (admin) -> 200', bandeja.status === 200, `status=${bandeja.status}`)

    const invitacion = (bandeja.data?.correos || []).find((c) => c.para === VENDEDOR_EMAIL)
    comprobar('el vendedor recibió la invitación simulada', Boolean(invitacion))

    if (invitacion) {
      comprobar('el correo contiene la contraseña temporal', invitacion.texto.includes(contrasenaTemporal))
      comprobar('el correo enlaza al login (?vista=login)', invitacion.texto.includes(ENLACE_LOGIN))
      comprobar(
        'el correo NO enlaza a cambiar-contrasena',
        !invitacion.texto.includes('vista=cambiar-contrasena') &&
          !invitacion.html.includes('vista=cambiar-contrasena')
      )
      comprobar('el correo trae asunto de invitación', /invitación/i.test(invitacion.asunto))
    }
  }

  // 3b) La lista de usuarios expone el estado de la invitación
  const lista = await pedir('GET', '/admin/usuarios', { token: tokenAdmin })
  const filaLista = (lista.data || []).find((u) => u.correo === VENDEDOR_EMAIL)
  comprobar('la lista incluye al vendedor creado', Boolean(filaLista))
  comprobar(
    'la lista marca la invitación como enviada',
    filaLista?.invitacionEnviada === true,
    `invitacionEnviada=${filaLista?.invitacionEnviada}`
  )
  comprobar(
    'la lista marca el cambio de contraseña como pendiente',
    filaLista?.cambioContrasenaPendiente === true,
    `cambioContrasenaPendiente=${filaLista?.cambioContrasenaPendiente}`
  )

  // 3c) Reenviar invitación: genera una contraseña temporal NUEVA
  const reenvio = await pedir('POST', `/admin/usuarios/${filaLista?.id}/reenviar-invitacion`, {
    token: tokenAdmin,
  })
  comprobar('reenviar invitación -> 200', reenvio.status === 200, `status=${reenvio.status}`)
  const contrasenaReenviada = reenvio.data?.contrasenaTemporal
  comprobar(
    'el reenvío genera una contraseña temporal nueva y distinta',
    typeof contrasenaReenviada === 'string' &&
      contrasenaReenviada.length >= 8 &&
      contrasenaReenviada !== contrasenaTemporal
  )
  comprobar(
    'el reenvío marca la invitación como enviada',
    reenvio.data?.invitacionEnviada === true
  )

  // 3d) Límite de frecuencia: reenviar de inmediato -> 429
  const reenvioSeguido = await pedir('POST', `/admin/usuarios/${filaLista?.id}/reenviar-invitacion`, {
    token: tokenAdmin,
  })
  comprobar(
    'segundo reenvío inmediato -> 429 REINVITE_RATE_LIMITED',
    reenvioSeguido.status === 429 && reenvioSeguido.data?.codigo === 'REINVITE_RATE_LIMITED',
    `status=${reenvioSeguido.status} codigo=${reenvioSeguido.data?.codigo}`
  )

  const loginVieja = await pedir('POST', '/auth/login', {
    body: { correo: VENDEDOR_EMAIL, contrasena: contrasenaTemporal },
  })
  comprobar(
    'la contraseña temporal anterior ya no sirve (401)',
    loginVieja.status === 401,
    `status=${loginVieja.status}`
  )

  const claveActiva = contrasenaReenviada

  // 4) Login con la contraseña temporal: solo llega hasta
  //    "Establecer nueva contraseña" (cambioContrasena), nunca al panel
  const loginTemporal = await pedir('POST', '/auth/login', {
    body: { correo: VENDEDOR_EMAIL, contrasena: claveActiva },
  })
  comprobar('login con contraseña temporal (200)', loginTemporal.status === 200, `status=${loginTemporal.status}`)
  comprobar(
    'el login marca cambioContrasena (debe cambiar la contraseña)',
    loginTemporal.data?.usuario?.cambioContrasena === true,
    `cambioContrasena=${loginTemporal.data?.usuario?.cambioContrasena}`
  )
  comprobar(
    'el usuario temporal sigue siendo Vendedor',
    loginTemporal.data?.usuario?.rol === 'Vendedor',
    `rol=${loginTemporal.data?.usuario?.rol}`
  )
  const tokenTemporal = loginTemporal.data?.token

  // 4b) Contraseña temporal vencida: el login debe rechazarse
  await pool.query(
    `UPDATE usuario SET contrasena_temporal_vencimiento = NOW() - INTERVAL '1 hour'
     WHERE correo = $1`,
    [VENDEDOR_EMAIL]
  )
  const loginVencido = await pedir('POST', '/auth/login', {
    body: { correo: VENDEDOR_EMAIL, contrasena: claveActiva },
  })
  comprobar(
    'login con temporal vencida -> 403',
    loginVencido.status === 403,
    `status=${loginVencido.status}`
  )
  await pool.query(
    `UPDATE usuario SET contrasena_temporal_vencimiento = NOW() + INTERVAL '48 hours'
     WHERE correo = $1`,
    [VENDEDOR_EMAIL]
  )

  // 5) Establecer la contraseña nueva (con el token de la sesión temporal)
  const cambiar = await pedir('POST', '/auth/cambiar-contrasena', {
    token: tokenTemporal,
    body: { contrasenaActual: claveActiva, contrasenaNueva: CLAVE_NUEVA },
  })
  comprobar('cambiar-contrasena -> 200', cambiar.status === 200, `status=${cambiar.status} error=${cambiar.data?.error || ''}`)

  const cambiarMala = await pedir('POST', '/auth/cambiar-contrasena', {
    token: tokenTemporal,
    body: { contrasenaActual: 'clave-que-no-es', contrasenaNueva: CLAVE_NUEVA },
  })
  comprobar(
    'cambiar-contrasena con actual incorrecta -> 401',
    cambiarMala.status === 401,
    `status=${cambiarMala.status}`
  )

  // 6) Login con la contraseña propia: sin bandera, entra al panel
  const loginFinal = await pedir('POST', '/auth/login', {
    body: { correo: VENDEDOR_EMAIL, contrasena: CLAVE_NUEVA },
  })
  comprobar('login con contraseña nueva (200)', loginFinal.status === 200, `status=${loginFinal.status}`)
  comprobar(
    'ya no pide cambio de contraseña (puede entrar a /admin)',
    !loginFinal.data?.usuario?.cambioContrasena,
    `cambioContrasena=${loginFinal.data?.usuario?.cambioContrasena}`
  )
  comprobar(
    'tras el cambio el rol Vendedor permite el acceso al panel',
    loginFinal.data?.usuario?.rol === 'Vendedor',
    `rol=${loginFinal.data?.usuario?.rol}`
  )

  const { rows: filaFinal } = await pool.query(
    'SELECT cambio_contrasena_obligatorio, contrasena_temporal_vencimiento FROM usuario WHERE correo = $1',
    [VENDEDOR_EMAIL]
  )
  comprobar('BD: banderas limpias tras el cambio', filaFinal[0]?.cambio_contrasena_obligatorio === false)
  comprobar(
    'BD: vencimiento limpio tras el cambio',
    filaFinal[0]?.contrasena_temporal_vencimiento === null
  )

  // 6b) El SERVIDOR bloquea las rutas privadas con la contraseña temporal.
  //     Se usa un administrador invitado para probar también el "panel".
  const crearAdmin2 = await pedir('POST', '/admin/usuarios', {
    token: tokenAdmin,
    body: {
      nombre: 'Admin Dos',
      correo: ADMIN2_EMAIL,
      telefono: '3009999999',
      direccion: 'Calle 9 # 9-9',
      rol: 'Administrador',
      estado: 'Activo',
    },
  })
  comprobar('crear administrador invitado -> 201', crearAdmin2.status === 201, `status=${crearAdmin2.status}`)
  const claveAdmin2 = crearAdmin2.data?.contrasenaTemporal

  const loginAdmin2 = await pedir('POST', '/auth/login', {
    body: { correo: ADMIN2_EMAIL, contrasena: claveAdmin2 },
  })
  comprobar('login del admin invitado con la temporal (200)', loginAdmin2.status === 200, `status=${loginAdmin2.status}`)
  comprobar(
    'el admin invitado trae cambioContrasena = true',
    loginAdmin2.data?.usuario?.cambioContrasena === true
  )
  const tokenAdmin2Temporal = loginAdmin2.data?.token

  const panelBloqueado = await pedir('GET', '/admin/usuarios', { token: tokenAdmin2Temporal })
  comprobar(
    'con la temporal, el panel -> 403 PASSWORD_CHANGE_REQUIRED',
    panelBloqueado.status === 403 && panelBloqueado.data?.codigo === 'PASSWORD_CHANGE_REQUIRED',
    `status=${panelBloqueado.status} codigo=${panelBloqueado.data?.codigo}`
  )

  const pedidosBloqueado = await pedir('GET', '/pedidos', { token: tokenAdmin2Temporal })
  comprobar(
    'con la temporal, pedidos -> 403 PASSWORD_CHANGE_REQUIRED',
    pedidosBloqueado.status === 403 && pedidosBloqueado.data?.codigo === 'PASSWORD_CHANGE_REQUIRED',
    `status=${pedidosBloqueado.status} codigo=${pedidosBloqueado.data?.codigo}`
  )

  const perfilBloqueado = await pedir('GET', '/auth/perfil', { token: tokenAdmin2Temporal })
  comprobar(
    'con la temporal, el perfil -> 403 PASSWORD_CHANGE_REQUIRED',
    perfilBloqueado.status === 403 && perfilBloqueado.data?.codigo === 'PASSWORD_CHANGE_REQUIRED',
    `status=${perfilBloqueado.status} codigo=${perfilBloqueado.data?.codigo}`
  )

  // Cambiar la contraseña SÍ está permitido con la temporal.
  const claveAdmin2Nueva = crypto.randomBytes(16).toString('base64url') + 'Aa1'
  const cambiarAdmin2 = await pedir('POST', '/auth/cambiar-contrasena', {
    token: tokenAdmin2Temporal,
    body: { contrasenaActual: claveAdmin2, contrasenaNueva: claveAdmin2Nueva },
  })
  comprobar(
    'con la temporal, cambiar-contrasena está permitido (200)',
    cambiarAdmin2.status === 200,
    `status=${cambiarAdmin2.status} error=${cambiarAdmin2.data?.error || ''}`
  )

  // Con la contraseña propia, todo vuelve a funcionar.
  const loginAdmin2Final = await pedir('POST', '/auth/login', {
    body: { correo: ADMIN2_EMAIL, contrasena: claveAdmin2Nueva },
  })
  const tokenAdmin2 = loginAdmin2Final.data?.token

  const panelOk = await pedir('GET', '/admin/usuarios', { token: tokenAdmin2 })
  comprobar('tras el cambio, el panel -> 200', panelOk.status === 200, `status=${panelOk.status}`)

  const pedidosOk = await pedir('GET', '/pedidos', { token: tokenAdmin2 })
  comprobar('tras el cambio, pedidos -> 200', pedidosOk.status === 200, `status=${pedidosOk.status}`)

  const perfilOk = await pedir('GET', '/auth/perfil', { token: tokenAdmin2 })
  comprobar(
    'tras el cambio, el perfil -> 200 e incluye el correo',
    perfilOk.status === 200 && perfilOk.data?.email === ADMIN2_EMAIL,
    `status=${perfilOk.status} email=${perfilOk.data?.email}`
  )

  // 7) Unidad: modo producción y "nunca se imprime la contraseña".
  //    Estas pruebas llaman a correos.js directamente (proceso de prueba),
  //    no al servidor en ejecución.
  const envOriginal = {
    NODE_ENV: process.env.NODE_ENV,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    CORREO_REMITENTE: process.env.CORREO_REMITENTE,
  }

  const capturarConsola = async (fn) => {
    const salida = []
    const logOriginal = console.log
    const errorOriginal = console.error
    console.log = (...args) => salida.push(args.join(' '))
    console.error = (...args) => salida.push(args.join(' '))
    try {
      await fn()
    } catch {
      // los errores se reflejan en las comprobaciones de quien llama
    } finally {
      console.log = logOriginal
      console.error = errorOriginal
    }
    return salida.join('\n')
  }

  const claveSecreta = 'CLAVE-SECRETA-QUE-NO-DEBE-LOGUEARSE'

  // 7a) Simulación (fuera de producción): guarda en memoria, no imprime
  process.env.NODE_ENV = 'test'
  delete process.env.BREVO_API_KEY
  comprobar('sin producción ni BREVO_API_KEY: modoSimulacion() = true', modoSimulacion() === true)

  const tamanoAntes = buzonSimulado.length
  const salidaSimulada = await capturarConsola(async () => {
    await enviarCorreo({
      para: 'log-test@test.com',
      asunto: 'Prueba de log',
      html: `<p>${claveSecreta}</p>`,
      texto: `clave ${claveSecreta}`,
    })
  })
  comprobar(
    'simulación: el correo queda en la bandeja en memoria',
    buzonSimulado.length === tamanoAntes + 1
  )
  comprobar(
    'simulación: la contraseña NO aparece en la consola',
    !salidaSimulada.includes(claveSecreta)
  )

  // 7b) Producción sin BREVO_API_KEY: no simula, el envío falla
  process.env.NODE_ENV = 'production'
  delete process.env.BREVO_API_KEY
  comprobar('en producción: modoSimulacion() = false', modoSimulacion() === false)

  const tamanoAntesProd = buzonSimulado.length
  let falloProduccion = false
  await capturarConsola(async () => {
    try {
      await enviarCorreo({
        para: 'prod-test@test.com',
        asunto: 'Prueba producción',
        html: `<p>${claveSecreta}</p>`,
        texto: claveSecreta,
      })
    } catch {
      falloProduccion = true
    }
  })
  comprobar('producción sin BREVO_API_KEY: el envío se reporta como fallido', falloProduccion)
  comprobar(
    'producción sin BREVO_API_KEY: no se guarda nada en la bandeja',
    buzonSimulado.length === tamanoAntesProd
  )

  // 7c) Producción con clave pero sin remitente: también falla
  process.env.BREVO_API_KEY = 'clave-falsa-para-no-llamar-a-brevo'
  delete process.env.CORREO_REMITENTE
  let falloSinRemitente = false
  await capturarConsola(async () => {
    try {
      await enviarCorreo({
        para: 'prod-test@test.com',
        asunto: 'Prueba producción',
        html: `<p>${claveSecreta}</p>`,
        texto: claveSecreta,
      })
    } catch {
      falloSinRemitente = true
    }
  })
  comprobar('producción sin CORREO_REMITENTE: el envío se reporta como fallido', falloSinRemitente)

  // Restaurar el entorno
  for (const [clave, valor] of Object.entries(envOriginal)) {
    if (valor === undefined) delete process.env[clave]
    else process.env[clave] = valor
  }

  // 8) Modo de prueba: en producción la bandeja simulada NO existe (404).
  //    Se levanta una instancia aparte de la app con NODE_ENV=production.
  process.env.NODE_ENV = 'production'
  let servidorProd = null
  let poolApp = null
  try {
    const { default: appProd } = await import('../src/app.js?modo-produccion')
    servidorProd = appProd.listen(0)
    await new Promise((resolve) => servidorProd.once('listening', resolve))
    const puertoProd = servidorProd.address().port
    const respuesta = await fetch(`http://localhost:${puertoProd}/api/pruebas/invitaciones-simuladas`)
    comprobar(
      'producción: /api/pruebas/invitaciones-simuladas -> 404',
      respuesta.status === 404,
      `status=${respuesta.status}`
    )
  } catch (error) {
    comprobar('producción: la bandeja simulada responde 404', false, error.message)
  } finally {
    if (servidorProd) await new Promise((resolve) => servidorProd.close(resolve))
    const db = await import('../src/config/db.js')
    poolApp = db.pool
    if (poolApp) await poolApp.end().catch(() => {})
    if (envOriginal.NODE_ENV === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = envOriginal.NODE_ENV
  }
}

try {
  await main()
} catch (error) {
  console.error('Error inesperado en las pruebas:', error.message)
  fallos += 1
} finally {
  await limpiar()
  await pool.end()
  console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
  process.exitCode = fallos === 0 ? 0 : 1
}
