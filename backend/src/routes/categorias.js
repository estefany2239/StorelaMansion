import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// GET /api/categorias -> solo categorías activas, ordenadas y con sus géneros.
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT codigo AS id, nombre, descripcion,
              COALESCE(generos, '{}') AS generos,
              COALESCE(imagen, '') AS imagen,
              orden
         FROM categoria
        WHERE estado = TRUE
        ORDER BY orden, nombre`
    )
    res.json(rows)
  } catch (error) {
    console.error('Error en /api/categorias:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar las categorías' })
  }
})

export default router
