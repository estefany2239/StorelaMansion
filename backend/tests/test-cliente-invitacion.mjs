// BLOQUE B2 — PASO 3: pruebas por API de la invitación a clientes.
//
// Arranca su propia instancia del backend en un puerto efímero con el envío
// de correos SIMULADO (se borra BREVO_API_KEY antes de importar la app y se
// fuerza NODE_ENV != production): CERO correos reales.
//
// Reglas que respeta:
// - No modifica la base con SQL: la única consulta es la identificación del
//   administrador (SELECT id/rol) y las lecturas de invariantes; todo lo
//   demás se hace por API (crear, invitar, cambiar contraseña, borrar).
// - Nunca imprime contraseñas, tokens, claves ni correos: solo OK/FALLO y
//   estados HTTP. Las claves temporales se leen del buzón simulado en
//   memoria, se usan en las peticiones y se descartan.
// - Borra TODOS los clientes de prueba al final, aunque algo falle.
//
// Uso:  node test-cliente-invitacion.mjs

import 'dotenv/config'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import pg from 'pg'

// Cero correos reales: sin clave de Brevo y fuera de producción, para que
// modoSimulacion() sea true también al montar /api/pruebas.
delete process.env.BREVO_API_KEY
process.env.NODE_ENV = 'test'

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en backend/.env')
  process.exit(1)
}

const { default: app } = await import('../src/app.js')
const { buzonSimulado } = await import('../src/services/correos.js')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

let BASE = ''
let invariantesAntes = null

const SUF = crypto.randomBytes(3).toString('hex')
const DOMINIO = 'b2inv.test'
const correo = (letra) => `inv-${letra}-${SUF}@${DOMINIO}`
const esCorreoDePrueba = (valor) =>
  String(valor || '').startsWith('inv-') && String(valor || '').endsWith(`@${DOMINIO}`)

const CORREO_A = correo('a') // se crea con invitación
const CORREO_B = correo('b') // se crea como ficha (sin invitación)
const CORREO_C = correo('c') // se crea con invitación en un envío que falla
const CORREO_D = correo('d') // solo para el 409 de documento repetido
const CORREO_R = correo('r') // cuenta real creada en el registro público
const DOCUMENTO_A = `9${String(Date.now()).slice(-8)}`

let fallos = 0
let servidor = null
let idA = null // primer cliente creado aquí (con invitación)
let idR = null // cuenta real creada en el registro público

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

// Firma el mismo JWT que crearToken() en src/routes/auth.js.
const firmarToken = (usuario) =>
  jwt.sign({ id: usuario.id_usuario, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '8h' })

// Último correo simulado enviado a una dirección (el buzón guarda lo más
// reciente al principio). Nunca se imprime su contenido.
const correoSimulado = (para) => buzonSimulado.find((entrada) => entrada.para === para)

const extraerClave = (para) => {
  const entrada = correoSimulado(para)
  const coincidencia = entrada ? /^Contraseña temporal: (\S+)$/m.exec(entrada.texto) : null
  return coincidencia ? coincidencia[1] : null
}

const invariantes = async () => {
  const total = await pool.query('SELECT COUNT(*)::int AS n FROM usuario')
  const invitadas = await pool.query(
    'SELECT id_usuario FROM usuario WHERE invitacion_enviada = TRUE ORDER BY id_usuario'
  )
  const pendientes = await pool.query(
    'SELECT id_usuario FROM usuario WHERE cambio_contrasena_obligatorio = TRUE ORDER BY id_usuario'
  )
  return {
    total: total.rows[0].n,
    invitadas: invitadas.rows.map((r) => r.id_usuario),
    pendientes: pendientes.rows.map((r) => r.id_usuario),
  }
}

// Borrado por API: primero inactivo y después eliminado (nunca SQL).
const limpiarPruebas = async (token) => {
  if (!token) return
  const { data } = await pedir('GET', '/clientes', { token })
  const filas = Array.isArray(data) ? data : []
  for (const fila of filas.filter((f) => esCorreoDePrueba(f.correo))) {
    const id = Number(fila.id)
    if (fila.estado === 'Activo') {
      await pedir('PATCH', `/admin/usuarios/${id}/estado`, {
        token,
        body: { estado: 'Inactivo' },
      })
    }
    await pedir('DELETE', `/admin/usuarios/${id}`, { token })
  }
}

const main = async () => {
  // ---------- servidor propio en puerto efímero ----------
  servidor = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => servidor.once('listening', resolve))
  const puerto = servidor.address().port
  BASE = `http://127.0.0.1:${puerto}/api`

  // ---------- identificación del administrador (solo SELECT) ----------
  const { rows } = await pool.query(
    `SELECT u.id_usuario, r.nombre AS rol
     FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
     WHERE r.nombre = 'Administrador' AND u.estado = TRUE
       AND u.cambio_contrasena_obligatorio = FALSE
     ORDER BY u.id_usuario
     LIMIT 1`
  )
  if (rows.length === 0) throw new Error('No hay un administrador activo para las pruebas')
  const tokenAdmin = firmarToken({ id_usuario: rows[0].id_usuario, rol: rows[0].rol })

  // Filas de una corrida anterior (por si una ejecución quedó a medias).
  await limpiarPruebas(tokenAdmin)

  invariantesAntes = await invariantes()

  const cliente = (extra) => ({
    nombre: 'Prueba Invitacion',
    correo: CORREO_A,
    telefono: '3001234567',
    direccion: 'Calle Falsa 123',
    tipo_documento: 'CC',
    documento: DOCUMENTO_A,
    fecha_nacimiento: '1995-04-12',
    invitar: true,
    ...extra,
  })

  // =====================================================
  // 1) Crear cliente con invitación
  // =====================================================
  const r1 = await pedir('POST', '/clientes', { token: tokenAdmin, body: cliente() })
  idA = r1.data?.id
  comprobar('1) Crear cliente con invitación -> 201', r1.status === 201, `status=${r1.status}`)
  comprobar(
    '1) La respuesta trae la invitación como enviada y la marca de cuenta con acceso',
    r1.data?.invitacionEnviada === true && r1.data?.accesoWeb === true,
    `invitacionEnviada=${r1.data?.invitacionEnviada} accesoWeb=${r1.data?.accesoWeb}`
  )
  comprobar(
    '1) La respuesta NO incluye la contraseña temporal',
    !('contrasenaTemporal' in (r1.data || {}))
  )
  comprobar(
    '1) Queda pendiente el cambio de contraseña',
    r1.data?.cambioContrasenaPendiente === true
  )
  const correoA = correoSimulado(CORREO_A)
  comprobar('1) El correo salió simulado', Boolean(correoA), `modo=${r1.data?.modoCorreo}`)
  comprobar(
    '1) El correo trae clave temporal, vencimiento y enlace al login',
    Boolean(correoA) &&
      /Contraseña temporal: \S+/.test(correoA.texto) &&
      /vence/i.test(correoA.texto) &&
      correoA.texto.includes('?vista=login')
  )
  const claveA1 = extraerClave(CORREO_A)
  comprobar('1) La clave temporal llegó solo al correo', Boolean(claveA1))

  // =====================================================
  // 2) Crear cliente como ficha (sin invitar)
  // =====================================================
  const antesB = buzonSimulado.length
  const r2 = await pedir('POST', '/clientes', {
    token: tokenAdmin,
    body: cliente({
      nombre: 'Prueba Ficha Cliente',
      correo: CORREO_B,
      documento: null,
      tipo_documento: null,
      invitar: false,
    }),
  })
  comprobar('2) Crear cliente sin invitación -> 201', r2.status === 201, `status=${r2.status}`)
  comprobar(
    '2) Queda como ficha sin acceso y sin invitación',
    r2.data?.accesoWeb === false &&
      r2.data?.invitacionEnviada === false &&
      r2.data?.cambioContrasenaPendiente === false,
    `accesoWeb=${r2.data?.accesoWeb} invitacionEnviada=${r2.data?.invitacionEnviada}`
  )
  comprobar('2) No se envió ningún correo', buzonSimulado.length === antesB)

  // =====================================================
  // 3) Correo repetido de una CUENTA REAL (registro público)
  // =====================================================
  const clavePropia = crypto.randomBytes(12).toString('base64url')
  const reg = await pedir('POST', '/auth/register', {
    body: { nombre: 'Cuenta Real', correo: CORREO_R, contrasena: clavePropia },
  })
  comprobar('3) Registro público -> 201', reg.status === 201, `status=${reg.status}`)
  idR = reg.data?.id

  const r3 = await pedir('POST', '/clientes', {
    token: tokenAdmin,
    body: cliente({ nombre: 'Correo Repetido', correo: CORREO_R, documento: null, tipo_documento: null }),
  })
  comprobar('3) Correo de cuenta real rechazado -> 409', r3.status === 409, `status=${r3.status}`)
  comprobar(
    '3) Mensaje exacto: el cliente entra con su contraseña',
    r3.data?.error === 'Este correo ya tiene una cuenta; el cliente puede entrar con su contraseña',
    `codigo=${r3.data?.codigo}`
  )

  // =====================================================
  // 4) Documento repetido
  // =====================================================
  const r4 = await pedir('POST', '/clientes', {
    token: tokenAdmin,
    body: cliente({ nombre: 'Documento Repetido', correo: CORREO_D, documento: DOCUMENTO_A }),
  })
  comprobar('4) Documento repetido -> 409', r4.status === 409, `status=${r4.status}`)
  comprobar(
    '4) Mensaje claro de documento duplicado',
    /documento/i.test(r4.data?.error || ''),
    r4.data?.error
  )

  // =====================================================
  // 5) Reenvío: clave nueva, la anterior deja de servir y límite de frecuencia
  // =====================================================
  const r5 = await pedir('POST', `/admin/usuarios/${idA}/reenviar-invitacion`, { token: tokenAdmin })
  comprobar('5) Reenviar invitación -> 200', r5.status === 200, `status=${r5.status}`)
  comprobar('5) El reenvío queda marcado como enviado', r5.data?.invitacionEnviada === true)
  // Nota: el reenvío de Usuarios sí devuelve la clave temporal a la vista de
  // administración (allí se comparte a mano si el correo falla); el módulo de
  // Clientes la descarta antes de guardar la fila en el estado.
  comprobar(
    '5) El reenvío trae las marcas que usa la tabla de clientes',
    r5.data?.invitacionEnviada === true &&
      r5.data?.cambioContrasenaPendiente === true &&
      r5.data?.accesoWeb === true,
    `accesoWeb=${r5.data?.accesoWeb} cambioPendiente=${r5.data?.cambioContrasenaPendiente}`
  )
  const claveA2 = extraerClave(CORREO_A)
  comprobar(
    '5) El reenvío generó una clave temporal DISTINTA',
    Boolean(claveA1 && claveA2) && claveA1 !== claveA2
  )

  const viejo = await pedir('POST', '/auth/login', { body: { correo: CORREO_A, contrasena: claveA1 } })
  comprobar('5) La clave anterior ya no sirve -> 401', viejo.status === 401, `status=${viejo.status}`)

  const r5b = await pedir('POST', `/admin/usuarios/${idA}/reenviar-invitacion`, { token: tokenAdmin })
  comprobar(
    '5) Reenvío repetido de inmediato -> 429 con código de límite',
    r5b.status === 429 && r5b.data?.codigo === 'REINVITE_RATE_LIMITED',
    `status=${r5b.status} codigo=${r5b.data?.codigo}`
  )

  // =====================================================
  // 6) Envío fallido (sin configuración de correo) y recuperación posterior
  // =====================================================
  const antesC = buzonSimulado.length
  process.env.NODE_ENV = 'production' // en producción no se simula: falta BREVO_API_KEY
  const r6 = await pedir('POST', '/clientes', {
    token: tokenAdmin,
    body: cliente({ nombre: 'Prueba Envio Fallo', correo: CORREO_C, documento: null, tipo_documento: null }),
  })
  process.env.NODE_ENV = 'test'
  comprobar('6) El cliente se crea aunque el correo falle -> 201', r6.status === 201, `status=${r6.status}`)
  comprobar(
    '6) Queda marcado como no enviado',
    r6.data?.invitacionEnviada === false,
    `modoCorreo=${r6.data?.modoCorreo}`
  )
  comprobar('6) No hubo correo simulado', buzonSimulado.length === antesC)

  const r6b = await pedir('POST', `/admin/usuarios/${r6.data?.id}/reenviar-invitacion`, {
    token: tokenAdmin,
  })
  comprobar(
    '6) El reenvío posterior sí sale -> invitación enviada',
    r6b.status === 200 && r6b.data?.invitacionEnviada === true,
    `status=${r6b.status}`
  )

  // =====================================================
  // 7) Entrada con la clave temporal y cambio obligatorio
  // =====================================================
  const login1 = await pedir('POST', '/auth/login', { body: { correo: CORREO_A, contrasena: claveA2 } })
  comprobar(
    '7) Login con la clave temporal -> pide cambio de contraseña',
    login1.status === 200 && login1.data?.usuario?.cambioContrasena === true,
    `status=${login1.status}`
  )
  const tokenTemporal = login1.data?.token

  const bloqueo = await pedir('GET', '/clientes', { token: tokenTemporal })
  comprobar(
    '7) El panel queda bloqueado hasta cambiar la contraseña -> 403',
    bloqueo.status === 403 && bloqueo.data?.codigo === 'PASSWORD_CHANGE_REQUIRED',
    `status=${bloqueo.status} codigo=${bloqueo.data?.codigo}`
  )

  const clavePropiaCliente = crypto.randomBytes(12).toString('base64url')
  const cambio = await pedir('POST', '/auth/cambiar-contrasena', {
    token: tokenTemporal,
    body: { contrasenaActual: claveA2, contrasenaNueva: clavePropiaCliente },
  })
  comprobar('7) Cambio de contraseña -> 200', cambio.status === 200, `status=${cambio.status}`)

  const login2 = await pedir('POST', '/auth/login', {
    body: { correo: CORREO_A, contrasena: clavePropiaCliente },
  })
  comprobar(
    '7) Después del cambio entra limpio (sin cambio pendiente)',
    login2.status === 200 && !login2.data?.usuario?.cambioContrasena,
    `status=${login2.status}`
  )
  comprobar(
    '7) El rol Cliente entra con permisos vacíos',
    Array.isArray(login2.data?.usuario?.permisos) && login2.data.usuario.permisos.length === 0
  )
  const login3 = await pedir('POST', '/auth/login', { body: { correo: CORREO_A, contrasena: claveA2 } })
  comprobar('7) La clave temporal ya no sirve -> 401', login3.status === 401, `status=${login3.status}`)

  // =====================================================
  // 8) Jamás se manda invitación a una cuenta que ya conoce su contraseña
  // =====================================================
  const rechazoR = await pedir('POST', `/admin/usuarios/${idR}/reenviar-invitacion`, {
    token: tokenAdmin,
  })
  comprobar(
    '8) Rechazo de invitación a cuenta real -> 409 con código',
    rechazoR.status === 409 && rechazoR.data?.codigo === 'CUENTA_REAL_SIN_INVITACION',
    `status=${rechazoR.status} codigo=${rechazoR.data?.codigo}`
  )
  comprobar(
    '8) El mensaje es el de entrar con su contraseña',
    rechazoR.data?.error === 'Este correo ya tiene una cuenta; el cliente puede entrar con su contraseña'
  )

  const rechazoA = await pedir('POST', `/admin/usuarios/${idA}/reenviar-invitacion`, {
    token: tokenAdmin,
  })
  comprobar(
    '8) Tampoco se reenvía a quien ya cambió su contraseña -> 409',
    rechazoA.status === 409 && rechazoA.data?.codigo === 'CUENTA_REAL_SIN_INVITACION',
    `status=${rechazoA.status}`
  )

  // =====================================================
  // 9) Estado final en la tabla de clientes
  // =====================================================
  const lista = await pedir('GET', '/clientes', { token: tokenAdmin })
  const filaA = (lista.data || []).find((f) => f.correo === CORREO_A)
  const filaB = (lista.data || []).find((f) => f.correo === CORREO_B)
  comprobar(
    '9) La invitación enviada se ve en la tabla',
    filaA?.invitacionEnviada === true && filaA?.accesoWeb === true,
    `invitacionEnviada=${filaA?.invitacionEnviada}`
  )
  comprobar(
    '9) La ficha sigue viéndose como sin invitación',
    filaB?.invitacionEnviada === false && filaB?.accesoWeb === false
  )
}

main()
  .catch((error) => {
    console.error('Error inesperado:', error.message)
    fallos += 1
  })
  .finally(async () => {
    let tokenAdmin = null
    try {
      const { rows } = await pool.query(
        `SELECT u.id_usuario, r.nombre AS rol
         FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
         WHERE r.nombre = 'Administrador' AND u.estado = TRUE
           AND u.cambio_contrasena_obligatorio = FALSE
         ORDER BY u.id_usuario LIMIT 1`
      )
      if (rows.length > 0) {
        tokenAdmin = firmarToken({ id_usuario: rows[0].id_usuario, rol: rows[0].rol })
      }
      await limpiarPruebas(tokenAdmin)

      const despues = await invariantes()
      if (invariantesAntes) {
        comprobar(
          'INVARIANTE) No cambió el total de usuarios',
          despues.total === invariantesAntes.total,
          `antes=${invariantesAntes.total} despues=${despues.total}`
        )
        comprobar(
          'INVARIANTE) No cambió el conjunto de cuentas con invitación enviada',
          JSON.stringify(despues.invitadas) === JSON.stringify(invariantesAntes.invitadas)
        )
        comprobar(
          'INVARIANTE) No cambió el conjunto de cambios de contraseña pendientes',
          JSON.stringify(despues.pendientes) === JSON.stringify(invariantesAntes.pendientes)
        )
      }
    } catch (error) {
      console.error('Error en la limpieza:', error.message)
      fallos += 1
    } finally {
      if (servidor) servidor.close()
      await pool.end()
      console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
      process.exit(fallos === 0 ? 0 : 1)
    }
  })
