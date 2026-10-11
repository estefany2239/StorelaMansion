import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// GET /api/productos
// Filtros opcionales: ?genero=mujer&categoria=Tenis&talla=36&color=Negro
router.get('/', async (req, res) => {
  try {
    const { genero, categoria, talla, color } = req.query
    const condiciones = ['p.estado = TRUE']
    const valores = []

    const agregar = (sql, valor) => {
      valores.push(valor)
      condiciones.push(sql.replace('?', `$${valores.length}`))
    }

    if (genero) agregar("(p.genero = ? OR p.genero = 'unisex')", genero)
    if (categoria) agregar('LOWER(c.nombre) = LOWER(?)', categoria)
    if (talla) agregar('t.nombre = ?', talla)
    if (color) agregar('LOWER(co.nombre) = LOWER(?)', color)

    const { rows } = await pool.query(
      `SELECT v.id_variante, p.id_producto, p.nombre, p.precio::float8 AS precio,
              p.genero, c.nombre AS categoria, t.nombre AS talla,
              co.nombre AS color, co.codigo_hex, v.stock, v.imagen
       FROM producto_variante v
       JOIN producto p ON p.id_producto = v.id_producto
       LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
       LEFT JOIN talla t ON t.id_talla = v.id_talla
       LEFT JOIN color co ON co.id_color = v.id_color
       WHERE ${condiciones.join(' AND ')}
       ORDER BY p.id_producto`,
      valores
    )

    res.json(rows)
  } catch (error) {
    console.error('Error en /api/productos:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar los productos' })
  }
})

export default router