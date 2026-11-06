import { Router } from 'express'
import { pool } from '../config/db.js'
import { verificarToken, bloquearCambioPendiente, soloRoles } from '../middlewares/auth.js'

const router = Router()

router.use(verificarToken, bloquearCambioPendiente, soloRoles('Cliente'))

const MAXIMO_FAVORITOS = 200

const leerIdProducto = (req, res) => {
  const id = Number(req.params.idProducto)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'El identificador del producto debe ser un entero positivo' })
    return null
  }
  return id
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id_producto,
              p.nombre,
              p.precio::float8 AS precio,
              c.nombre AS categoria,
              (
                SELECT v.imagen
                  FROM producto_variante v
                 WHERE v.id_producto = p.id_producto
                   AND v.imagen IS NOT NULL
                   AND v.imagen <> ''
                 ORDER BY v.id_variante
                 LIMIT 1
              ) AS imagen,
              EXISTS (
                SELECT 1
                  FROM producto_variante v
                 WHERE v.id_producto = p.id_producto
                   AND v.stock > 0
              ) AS disponible
         FROM favorito f
         JOIN producto p ON p.id_producto = f.id_producto
         LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
        WHERE f.id_usuario = $1
          AND p.estado = TRUE
        ORDER BY f.creado_en DESC, f.id_producto DESC`,
      [req.usuario.id]
    )
    res.json(rows)
  } catch (error) {
    console.error('Error en /api/favoritos:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar tus favoritos' })
  }
})

router.get('/ids', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.id_producto
         FROM favorito f
         JOIN producto p ON p.id_producto = f.id_producto
        WHERE f.id_usuario = $1
          AND p.estado = TRUE
        ORDER BY f.creado_en DESC, f.id_producto DESC`,
      [req.usuario.id]
    )
    res.json(rows.map((fila) => fila.id_producto))
  } catch (error) {
    console.error('Error en /api/favoritos/ids:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar tus favoritos' })
  }
})

router.post('/:idProducto', async (req, res) => {
  const idProducto = leerIdProducto(req, res)
  if (idProducto === null) return

  try {
    const { rows: producto } = await pool.query(
      'SELECT estado FROM producto WHERE id_producto = $1',
      [idProducto]
    )
    if (producto.length === 0 || !producto[0].estado) {
      return res.status(404).json({ error: 'El producto no existe o está inactivo' })
    }


    const { rows: yaEsta } = await pool.query(
      'SELECT 1 FROM favorito WHERE id_usuario = $1 AND id_producto = $2',
      [req.usuario.id, idProducto]
    )
    if (yaEsta.length > 0) {
      return res.json({ ok: true, agregado: false, mensaje: 'El producto ya estaba en tus favoritos' })
    }

    const { rows: conteo } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM favorito WHERE id_usuario = $1',
      [req.usuario.id]
    )
    if (conteo[0].total >= MAXIMO_FAVORITOS) {
      return res.status(409).json({
        error: `Puedes tener máximo ${MAXIMO_FAVORITOS} favoritos; quita alguno para agregar otro`,
      })
    }

    await pool.query(
      'INSERT INTO favorito (id_usuario, id_producto) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.usuario.id, idProducto]
    )
    res.json({ ok: true, agregado: true, mensaje: 'Producto agregado a tus favoritos' })
  } catch (error) {
    console.error('Error al agregar favorito:', error.message)
    res.status(500).json({ error: 'No se pudo agregar el producto a tus favoritos' })
  }
})

router.delete('/:idProducto', async (req, res) => {
  const idProducto = leerIdProducto(req, res)
  if (idProducto === null) return

  try {
    await pool.query(
      'DELETE FROM favorito WHERE id_usuario = $1 AND id_producto = $2',
      [req.usuario.id, idProducto]
    )
    res.json({ ok: true, mensaje: 'Producto eliminado de tus favoritos' })
  } catch (error) {
    console.error('Error al quitar favorito:', error.message)
    res.status(500).json({ error: 'No se pudo quitar el producto de tus favoritos' })
  }
})

export default router
