// ============================================================
// Lista blanca de rutas PÚBLICAS (Fase B: denegar por defecto).
//
// Denegar por defecto sólo sirve si la lista es explícita y corta: cualquier
// ruta que no esté aquí exige sesión. Añadir una ruta pública aquí es una
// decisión consciente (y pasa por revisión), no un olvido.
//
// Formato: "MÉTODO /ruta/completa"
//   - "GET /api/health"                 exacta
//   - "POST /api/auth/recuperar/*"      todo lo que cuelgue de ese prefijo
//
// La ruta /api/health se monta ANTES del guard para que la sonda de
// Render/monitoreo responda aunque haya limitador general activo.
// ============================================================

export const RUTAS_PUBLICAS = [
  'GET /api/health',
  'POST /api/auth/register',
  'POST /api/auth/login',
  'POST /api/auth/recuperar/*',
  'POST /api/auth/verificar',
  'POST /api/auth/verificar/reenviar',
  'GET /api/productos',
  'GET /api/categorias',
]

const exactas = new Set(RUTAS_PUBLICAS.filter((clave) => !clave.endsWith('/*')))

const prefijos = RUTAS_PUBLICAS.filter((clave) => clave.endsWith('/*')).map(
  (clave) => clave.slice(0, -1) // deja el "/" final: "POST /api/auth/recuperar/"
)

export const esPublica = (clave) => exactas.has(clave) || prefijos.some((p) => clave.startsWith(p))
