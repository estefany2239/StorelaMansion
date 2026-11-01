import { Router } from 'express'
import { pool } from '../config/db.js'
import {
  verificarToken,
  bloquearCambioPendiente,
  requierePrivilegio,
  requierePrivilegioAlguno,
} from '../middlewares/auth.js'

const router = Router()

// Todas las rutas exigen token y que no haya un cambio de contraseña pendiente
router.use(verificarToken, bloquearCambioPendiente)

class ErrorHttp extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const ESTADOS_PEDIDO = ['Registrado', 'En preparación', 'Despachado', 'Entregado', 'Cancelado']

// Filtros compartidos por la lista de pedidos (estado, búsqueda y pestaña
// "con saldo"). Devuelve WHERE + parámetros para las 3 consultas.
const filtrosLista = (query) => {
  const fragmentos = ['a.es_contra_entrega IS TRUE', "a.estado_pedido <> 'Cancelado'"]
  const valores = []

  const pestana = String(query.pestana || 'saldo').trim()
  if (pestana !== 'todos') {
    fragmentos.push('a.saldo_pendiente > 0')
  }

  const estado = String(query.estado || '').trim()
  if (estado) {
    if (!ESTADOS_PEDIDO.includes(estado)) {
      throw new ErrorHttp(400, `Estado inválido. Usa: ${ESTADOS_PEDIDO.join(', ')}`)
    }
    valores.push(estado)
    fragmentos.push(`a.estado_pedido = $${valores.length}`)
  }

  const q = String(query.q ?? '').trim()
  if (q) {
    const patron = `%${q.toLowerCase().replace(/\s+/g, '%')}%`
    valores.push(patron)
    const patronPos = valores.length
    // Solo se iguala contra el número de pedido cuando q es numérico.
    valores.push(/^\d+$/.test(q) ? String(Number(q)) : '')
    const numeroPos = valores.length
    fragmentos.push(
      `(LOWER(TRIM(u.nombres || ' ' || u.apellidos)) LIKE $${patronPos} ` +
      `OR (a.id_pedido::text = $${numeroPos} AND $${numeroPos} <> ''))`
    )
  }

  return { where: `WHERE ${fragmentos.join(' AND ')}`, valores }
}

// GET / -> pedidos de CONTRA ENTREGA no cancelados desde la vista
// pedido_abonos. Requiere Abonos:Consultar: es el panel del personal.
router.get('/', requierePrivilegio('Abonos', 'Consultar'), async (req, res) => {
  try {
    const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1)
    const limite = Math.min(100, Math.max(1, Number.parseInt(req.query.limite, 10) || 20))

    const { where, valores } = filtrosLista(req.query)
    const sqlBase = `
      FROM pedido_abonos a
      JOIN usuario u ON u.id_usuario = a.id_usuario
      ${where}
    `

    const { rows: data } = await pool.query(
      `SELECT a.id_pedido,
              a.id_usuario,
              TRIM(u.nombres || ' ' || u.apellidos) AS cliente,
              TO_CHAR(a.fecha, 'YYYY-MM-DD') AS fecha,
              a.estado_pedido,
              a.metodo_pago,
              a.total::float8 AS total,
              a.total_abonado::float8 AS total_abonado,
              a.saldo_pendiente::float8 AS saldo_pendiente,
              a.porcentaje_pagado,
              a.estado_monto,
              a.cantidad_pagos
       ${sqlBase}
       ORDER BY a.id_pedido DESC
       LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
      [...valores, limite, (pagina - 1) * limite]
    )

    const { rows: conteo } = await pool.query(
      `SELECT COUNT(*)::int AS total ${sqlBase}`,
      valores
    )
    const total = conteo[0].total

    const { rows: resumenRows } = await pool.query(
      `SELECT COALESCE(SUM(a.saldo_pendiente) FILTER (WHERE a.saldo_pendiente > 0), 0)::float8 AS total_saldo_pendiente,
              COALESCE(SUM(a.total_abonado), 0)::float8 AS total_abonado,
              COUNT(*) FILTER (WHERE a.saldo_pendiente > 0)::int AS pedidos_con_saldo,
              COUNT(*)::int AS pedidos_total
       ${sqlBase}`,
      valores
    )

    res.json({
      data,
      resumen: resumenRows[0],
      paginacion: {
        pagina,
        limite,
        total,
        paginas: Math.max(1, Math.ceil(total / limite)),
      },
    })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error('Error en GET /api/abonos:', error.message)
    res.status(500).json({ error: 'No se pudieron cargar los pedidos con abonos' })
  }
})

// GET /configuracion -> monto mínimo vigente (mostrarlo en el formulario de
// abonos). Basta con Consultar o Actualizar del módulo Abonos.
router.get(
  '/configuracion',
  requierePrivilegioAlguno('Abonos:Consultar', 'Abonos:Actualizar'),
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT monto_minimo::float8 AS monto_minimo,
                actualizado_en, actualizado_por
           FROM configuracion_abonos
          WHERE id = 1`
      )
      res.json(rows[0] || { monto_minimo: 1, actualizado_en: null, actualizado_por: null })
    } catch (error) {
      console.error('Error en GET /api/abonos/configuracion:', error.message)
      res.status(500).json({ error: 'No se pudo cargar la configuración de abonos' })
    }
  }
)

// PUT /configuracion -> cambia el monto mínimo (Abonos:Actualizar).
router.put('/configuracion', requierePrivilegio('Abonos', 'Actualizar'), async (req, res) => {
  try {
    const crudo = Number(req.body?.monto_minimo)
    if (!Number.isFinite(crudo) || crudo <= 0) {
      return res.status(400).json({
        error: 'El monto mínimo del abono debe ser un número positivo',
        campo: 'monto_minimo',
      })
    }
    if (crudo > 99999999) {
      return res.status(400).json({
        error: 'El monto mínimo excede el máximo permitido (99999999)',
        campo: 'monto_minimo',
      })
    }
    const montoMinimo = Math.round(crudo * 100) / 100

    const { rows } = await pool.query(
      `INSERT INTO configuracion_abonos (id, monto_minimo, actualizado_por)
       VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE
            SET monto_minimo = EXCLUDED.monto_minimo,
                actualizado_por = EXCLUDED.actualizado_por,
                actualizado_en = now()
       RETURNING monto_minimo::float8 AS monto_minimo,
                 actualizado_en, actualizado_por`,
      [montoMinimo, req.usuario.id]
    )
    res.json(rows[0])
  } catch (error) {
    console.error('Error en PUT /api/abonos/configuracion:', error.message)
    res.status(500).json({ error: 'No se pudo guardar la configuración de abonos' })
  }
})

export default router
