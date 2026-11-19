import { Router } from 'express'
import { verificarToken, soloRoles, bloquearCambioPendiente } from '../middlewares/auth.js'
import { buzonSimulado, modoSimulacion } from '../services/correos.js'

// MODO DE PRUEBA: este router solo se monta cuando NO estamos en producción
// y NO hay BREVO_API_KEY (ver app.js). En producción la ruta ni siquiera
// existe, por lo que responde 404; así nunca se exponen contraseñas
// temporales en un entorno real.
const router = Router()

router.use(verificarToken, bloquearCambioPendiente, soloRoles('Administrador'))

// Doble de prueba del correo: devuelve los correos "enviados" en memoria.
router.get('/invitaciones-simuladas', (req, res) => {
  if (!modoSimulacion()) {
    return res.status(404).json({ error: 'Not Found', path: req.originalUrl })
  }
  res.json({ correos: buzonSimulado })
})

export default router
