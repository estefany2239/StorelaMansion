import { Router } from 'express'
import { pool } from '../config/db.js'
import { verificarToken, bloquearCambioPendiente, requierePrivilegio } from '../middlewares/auth.js'

const router = Router()

router.use(verificarToken, bloquearCambioPendiente)

// GET /negocio -> datos visibles en el comprobante de venta.
// La tabla puede no existir todavía: en ese caso la ruta responde 500 y el
// frontend genera el PDF solo con el nombre por defecto.
router.get('/negocio', requierePrivilegio('Ventas', 'Consultar'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT nombre, nit, direccion, telefono, correo
         FROM configuracion_negocio
        WHERE id_configuracion = 1`
    )

    const fila = rows[0] || {}

    res.json({
      nombre: fila.nombre ?? null,
      nit: fila.nit ?? null,
      direccion: fila.direccion ?? null,
      telefono: fila.telefono ?? null,
      correo: fila.correo ?? null,
    })
  } catch (error) {
    console.error('Error en GET /api/configuracion/negocio:', error.message)
    res.status(500).json({ error: 'No se pudo cargar la configuración del negocio' })
  }
})

export default router
