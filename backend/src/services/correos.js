// Envío de correos transaccionales con Brevo (API v3 SMTP).
//
// Documentación consultada en esta sesión:
// https://developers.brevo.com/reference/send-transac-email
//   - POST https://api.brevo.com/v3/smtp/email
//   - Autenticación con el encabezado "api-key"
//   - Cuerpo JSON: sender { email, name }, to [{ email }], subject,
//     htmlContent y textContent
//   - Respuesta 201 con messageId; errores 400 con message
//
// Si BREVO_API_KEY no está definido (solo fuera de producción), el envío se
// SIMULA: el correo queda guardado en memoria (buzonSimulado), accesible a
// través del endpoint GET /api/admin/usuarios/invitaciones-simuladas. NADA
// se imprime en la consola: la contraseña temporal nunca aparece en logs.
//
// En producción (NODE_ENV=production) la simulación está prohibida: si falta
// BREVO_API_KEY o CORREO_REMITENTE, enviarCorreo lanza error y el envío
// queda marcado como fallido (invitacion_enviada = FALSE).

import crypto from 'node:crypto'

const MAXIMO_BUZON = 50

// Correos simulados de esta ejecución del servidor (solo en memoria).
export const buzonSimulado = []

// La simulación solo existe fuera de producción. En NODE_ENV=production
// nunca se simula: si falta la configuración, enviarCorreo lanza error.
export const modoSimulacion = () =>
  process.env.NODE_ENV !== 'production' && !process.env.BREVO_API_KEY

const escaparHtml = (texto) =>
  String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Contraseña temporal de 12 caracteres (letras y números, sin ambiguos
// como 0/O/1/l). Se genera con crypto para que sea impredecible.
export const generarContrasenaTemporal = (longitud = 12) => {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(longitud)
  let clave = ''
  for (let i = 0; i < longitud; i += 1) {
    clave += alfabeto[bytes[i] % alfabeto.length]
  }
  return clave
}

const formatearVencimiento = (vencimiento) => {
  if (!vencimiento) return ''
  try {
    return new Date(vencimiento).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      dateStyle: 'long',
      timeStyle: 'short',
    })
  } catch {
    return new Date(vencimiento).toISOString()
  }
}

// El enlace SIEMPRE apunta al login (?vista=login). La pantalla de cambio
// de contraseña solo aparece después de iniciar sesión con la clave
// temporal; nunca se enlaza directamente.
export const plantillaInvitacion = ({
  nombre,
  contrasenaTemporal,
  enlaceLogin,
  vencimiento,
}) => {
  const nombreEscapado = escaparHtml(nombre || 'usuario')
  const enlaceEscapado = escaparHtml(enlaceLogin)
  const claveEscapada = escaparHtml(contrasenaTemporal)
  const vencimientoTexto = escaparHtml(formatearVencimiento(vencimiento))

  const asunto = 'Invitación a La Mansión Store'

  const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#e8e8e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#141414;border:1px solid rgba(201,162,39,0.25);border-radius:16px;padding:32px;">
          <tr>
            <td style="text-align:center;padding-bottom:24px;">
              <h1 style="margin:0;font-size:22px;letter-spacing:4px;color:#ffffff;">LA MANSI<span style="color:#c9a227;">ÓN</span></h1>
              <p style="margin:6px 0 0;font-size:11px;letter-spacing:5px;color:rgba(255,255,255,0.45);">STORE</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 8px 20px;">
              <h2 style="margin:0 0 12px;font-size:18px;color:#ffffff;">Hola, ${nombreEscapado}</h2>
              <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">
                Se creó tu cuenta en La Mansión Store. Usa la contraseña
                temporal que aparece más abajo para iniciar sesión; al entrar
                deberás establecer una contraseña propia.
              </p>
              <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.5);">CONTRASEÑA TEMPORAL</p>
              <p style="margin:0 0 18px;font-family:Consolas,Menlo,monospace;font-size:20px;letter-spacing:3px;color:#c9a227;">
                ${claveEscapada}
              </p>
              ${vencimientoTexto ? `<p style="margin:0 0 18px;font-size:12px;color:rgba(255,255,255,0.5);">Vence: ${vencimientoTexto}</p>` : ''}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:#c9a227;border-radius:10px;">
                    <a href="${enlaceEscapado}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#111111;text-decoration:none;">
                      Ir a iniciar sesión
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.5);word-break:break-all;">
                Si el botón no funciona, copia este enlace en tu navegador:<br>${enlaceEscapado}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  const texto = [
    'Invitación a La Mansión Store',
    '',
    `Hola ${nombre || 'usuario'},`,
    '',
    'Se creó tu cuenta en La Mansión Store. Inicia sesión con esta contraseña',
    'temporal y, al entrar, deberás establecer una contraseña propia:',
    '',
    `Contraseña temporal: ${contrasenaTemporal}`,
    vencimientoTexto ? `Vence: ${vencimientoTexto}` : '',
    '',
    `Inicia sesión aquí: ${enlaceLogin}`,
  ]
    .filter(Boolean)
    .join('\n')

  return { asunto, html, texto }
}

// Invitación del CLIENTE creado desde el panel de administración. Es el
// mismo correo de invitación con dos cosas extra: la bienvenida a la tienda
// y el CORREO DE ACCESO (la única vez que la plataforma se lo recuerda).
// Todo lo que se inserta en el HTML (nombre, correo, clave, vencimiento y
// enlace) pasa por escaparHtml; el enlace sigue apuntando solo a ?vista=login.
export const plantillaInvitacionCliente = ({
  nombre,
  correo,
  contrasenaTemporal,
  enlaceLogin,
  vencimiento,
}) => {
  const nombreEscapado = escaparHtml(nombre || 'cliente')
  const correoEscapado = escaparHtml(correo || '')
  const enlaceEscapado = escaparHtml(enlaceLogin)
  const claveEscapada = escaparHtml(contrasenaTemporal)
  const vencimientoTexto = escaparHtml(formatearVencimiento(vencimiento))

  const asunto = 'Bienvenido a Store La Mansión'

  const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#e8e8e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#141414;border:1px solid rgba(201,162,39,0.25);border-radius:16px;padding:32px;">
          <tr>
            <td style="text-align:center;padding-bottom:24px;">
              <h1 style="margin:0;font-size:22px;letter-spacing:4px;color:#ffffff;">LA MANSI<span style="color:#c9a227;">ÓN</span></h1>
              <p style="margin:6px 0 0;font-size:11px;letter-spacing:5px;color:rgba(255,255,255,0.45);">STORE</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 8px 20px;">
              <h2 style="margin:0 0 12px;font-size:18px;color:#ffffff;">Hola, ${nombreEscapado}</h2>
              <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">
                ¡Bienvenido a Store La Mansión! Tu cuenta ya está lista. Usa el
                correo de acceso y la contraseña temporal que aparecen más abajo
                para iniciar sesión; al entrar deberás crear tu propia contraseña.
              </p>
              <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.5);">CORREO DE ACCESO</p>
              <p style="margin:0 0 18px;font-family:Consolas,Menlo,monospace;font-size:16px;color:#ffffff;word-break:break-all;">
                ${correoEscapado}
              </p>
              <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.5);">CONTRASEÑA TEMPORAL</p>
              <p style="margin:0 0 18px;font-family:Consolas,Menlo,monospace;font-size:20px;letter-spacing:3px;color:#c9a227;">
                ${claveEscapada}
              </p>
              <p style="margin:0 0 18px;font-size:12px;color:rgba(255,255,255,0.5);">
                Esta contraseña es temporal${vencimientoTexto ? ` y vence: ${vencimientoTexto}` : ''}.
                Solo la verás una vez: guárdala para entrar.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:#c9a227;border-radius:10px;">
                    <a href="${enlaceEscapado}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#111111;text-decoration:none;">
                      Entrar a la tienda
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.5);word-break:break-all;">
                Si el botón no funciona, copia este enlace en tu navegador:<br>${enlaceEscapado}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  const texto = [
    'Bienvenido a Store La Mansión',
    '',
    `Hola ${nombre || 'cliente'},`,
    '',
    'Tu cuenta ya está lista. Usa este correo y la contraseña temporal para',
    'entrar a la tienda; al entrar deberás crear tu propia contraseña:',
    '',
    `Correo de acceso: ${correo}`,
    `Contraseña temporal: ${contrasenaTemporal}`,
    vencimientoTexto ? `Es temporal. Vence: ${vencimientoTexto}` : 'Es temporal.',
    '',
    `Entra aquí: ${enlaceLogin}`,
  ]
    .filter(Boolean)
    .join('\n')

  return { asunto, html, texto }
}

// Bienvenida del registro PÚBLICO (POST /api/auth/register): la cuenta ya
// existe y el usuario conoce su propia contraseña, así que este correo NO
// lleva contraseñas ni datos sensibles, solo la confirmación y un botón a
// la tienda. Misma identidad visual que las invitaciones. Todo lo que se
// inserta en el HTML (nombre y enlace) pasa por escaparHtml.
export const plantillaBienvenida = ({ nombre, enlaceTienda }) => {
  const nombreEscapado = escaparHtml(nombre || 'cliente')
  const enlaceEscapado = escaparHtml(enlaceTienda)

  const asunto = '¡Bienvenido a Store La Mansión!'

  const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#e8e8e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#141414;border:1px solid rgba(201,162,39,0.25);border-radius:16px;padding:32px;">
          <tr>
            <td style="text-align:center;padding-bottom:24px;">
              <h1 style="margin:0;font-size:22px;letter-spacing:4px;color:#ffffff;">LA MANSI<span style="color:#c9a227;">ÓN</span></h1>
              <p style="margin:6px 0 0;font-size:11px;letter-spacing:5px;color:rgba(255,255,255,0.45);">STORE</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 8px 20px;">
              <h2 style="margin:0 0 12px;font-size:18px;color:#ffffff;">Hola, ${nombreEscapado}</h2>
              <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">
                ¡Bienvenido a Store La Mansión! Tu cuenta fue creada correctamente
                y ya puedes iniciar sesión con tu correo y tu contraseña.
              </p>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">
                Conoce nuestra colección y realiza tus compras cuando quieras.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:#c9a227;border-radius:10px;">
                    <a href="${enlaceEscapado}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#111111;text-decoration:none;">
                      Ir a la tienda
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.5);word-break:break-all;">
                Si el botón no funciona, copia este enlace en tu navegador:<br>${enlaceEscapado}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  const texto = [
    '¡Bienvenido a Store La Mansión!',
    '',
    `Hola ${nombre || 'cliente'},`,
    '',
    'Tu cuenta fue creada correctamente y ya puedes iniciar sesión con tu',
    'correo y tu contraseña.',
    '',
    'Conoce nuestra colección y realiza tus compras cuando quieras.',
    '',
    `Entra a la tienda aquí: ${enlaceTienda}`,
  ].join('\n')

  return { asunto, html, texto }
}

// Código de recuperación de contraseña (flujo público "Olvidé mi
// contraseña"). El correo lleva el código de 6 dígitos y su vigencia; no
// incluye enlaces con token ni contraseñas. Todo lo que se inserta en el
// HTML (nombre y código) pasa por escaparHtml.
export const plantillaRecuperacion = ({ nombre, codigo, minutos }) => {
  const nombreEscapado = escaparHtml(nombre || 'cliente')
  const codigoEscapado = escaparHtml(codigo)

  const asunto = 'Código de recuperación de contraseña'

  const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#e8e8e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#141414;border:1px solid rgba(201,162,39,0.25);border-radius:16px;padding:32px;">
          <tr>
            <td style="text-align:center;padding-bottom:24px;">
              <h1 style="margin:0;font-size:22px;letter-spacing:4px;color:#ffffff;">LA MANSI<span style="color:#c9a227;">ÓN</span></h1>
              <p style="margin:6px 0 0;font-size:11px;letter-spacing:5px;color:rgba(255,255,255,0.45);">STORE</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 8px 20px;">
              <h2 style="margin:0 0 12px;font-size:18px;color:#ffffff;">Hola, ${nombreEscapado}</h2>
              <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);">
                Recibimos una solicitud para recuperar tu contraseña. Usa el
                código que aparece más abajo en la pantalla de recuperación.
              </p>
              <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.5);">CÓDIGO DE VERIFICACIÓN</p>
              <p style="margin:0 0 18px;font-family:Consolas,Menlo,monospace;font-size:26px;letter-spacing:6px;color:#c9a227;">
                ${codigoEscapado}
              </p>
              <p style="margin:0 0 18px;font-size:12px;color:rgba(255,255,255,0.5);">
                Vence en ${minutos} minutos y solo puede usarse una vez.
              </p>
              <p style="margin:0 0 0;font-size:12px;color:rgba(255,255,255,0.5);">
                Si tú no pediste este código, ignora este correo: tu contraseña no cambiará.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  const texto = [
    'Código de recuperación de contraseña',
    '',
    `Hola ${nombre || 'cliente'},`,
    '',
    'Recibimos una solicitud para recuperar tu contraseña. Usa este código',
    'en la pantalla de recuperación:',
    '',
    `Código: ${codigo}`,
    `Vence en ${minutos} minutos y solo puede usarse una vez.`,
    '',
    'Si tú no pediste este código, ignora este correo: tu contraseña no cambiará.',
  ].join('\n')

  return { asunto, html, texto }
}

// Envía un correo. Devuelve { ok, modo }. Lanza error si Brevo lo rechaza
// o si falta la configuración (nunca se reporta éxito sin envío real).
// En modo simulación el correo solo queda en memoria (buzonSimulado);
// no se imprime nada en consola.
export const enviarCorreo = async ({ para, asunto, html, texto }) => {
  if (modoSimulacion()) {
    buzonSimulado.unshift({
      para,
      asunto,
      html,
      texto,
      enviadoEn: new Date().toISOString(),
    })
    if (buzonSimulado.length > MAXIMO_BUZON) buzonSimulado.pop()
    return { ok: true, modo: 'simulado' }
  }

  // En producción, conBrevo configurado o no, hace falta remitente y clave.
  if (!process.env.BREVO_API_KEY) {
    throw new Error(
      'Falta BREVO_API_KEY: en producción no se simula el envío de correos'
    )
  }
  if (!process.env.CORREO_REMITENTE) {
    throw new Error('Falta CORREO_REMITENTE en la configuración del backend')
  }

  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: process.env.CORREO_REMITENTE,
        name: process.env.CORREO_REMITENTE_NOMBRE || 'La Mansión Store',
      },
      to: [{ email: para }],
      subject: asunto,
      htmlContent: html,
      textContent: texto,
    }),
  })

  const datos = await respuesta.json().catch(() => ({}))

  if (!respuesta.ok) {
    throw new Error(
      `Brevo rechazó el correo (${respuesta.status}): ${datos.message || 'error desconocido'}`
    )
  }

  return { ok: true, modo: 'brevo', messageId: datos.messageId }
}
