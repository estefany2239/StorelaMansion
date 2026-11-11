import { Router } from 'express'
import { pool } from '../config/db.js'
import {
  verificarToken,
  bloquearCambioPendiente,
  requierePrivilegio,
} from '../middlewares/auth.js'
import {
  ErrorHttp,
  idPositivo,
  normalizarNombre,
  textoOpcional,
  redondear,
} from '../services/compras.js'
import { TIPOS_DOCUMENTO } from '../utils/documentos.js'

const router = Router()

// Todo el módulo exige sesión y que no haya cambio de contraseña pendiente.
router.use(verificarToken, bloquearCambioPendiente)

const SELECT_PROVEEDOR = `
  SELECT p.id_proveedor AS id,
         p.nombre,
         p.tipo_documento,
         p.documento,
         p.contacto,
         p.telefono,
         p.correo,
         p.direccion,
         p.ciudad,
         p.estado,
         p.creado_por,
         p.creado_en,
         p.actualizado_en,
         TRIM(u.nombres || ' ' || u.apellidos) AS creado_por_nombre
    FROM proveedor p
    LEFT JOIN usuario u ON u.id_usuario = p.creado_por
`

const SALDO_PROVEEDOR_SQL = `
  COALESCE((
    SELECT SUM(CASE WHEN m.tipo = 'GENERADO' THEN m.monto
                    WHEN m.tipo = 'APLICADO' THEN -m.monto
                    ELSE 0 END)
      FROM movimiento_saldo_proveedor m
     WHERE m.id_proveedor = p.id_proveedor
  ), 0)::float8 AS saldo_disponible
`

const COMPRAS_PROVEEDOR_SQL = `
  COALESCE((SELECT COUNT(*) FROM compra c WHERE c.id_proveedor = p.id_proveedor), 0)::int
    AS compras_total,
  COALESCE((
    SELECT SUM(c.costo_final)
      FROM compra c
     WHERE c.id_proveedor = p.id_proveedor AND c.estado <> 'Anulada'
  ), 0)::float8 AS compras_costo,
  COALESCE((
    SELECT SUM(c.valor_pagado)
      FROM compra c
     WHERE c.id_proveedor = p.id_proveedor
  ), 0)::float8 AS compras_pagado
`

const normalizarDocumento = (valor) => normalizarNombre(valor).toUpperCase()

// Respeta la grafía canónica del proyecto ('Pasaporte', no 'PASAPORTE') para
// no chocar con un CHECK del esquema. Un tipo desconocido se conserva tal cual.
const normalizarTipoDocumento = (valor) => {
  const texto = normalizarNombre(valor)
  if (!texto) return ''
  const canonico = TIPOS_DOCUMENTO.find((t) => t.toLowerCase() === texto.toLowerCase())
  return canonico || texto
}

const validarCorreo = (correo) => {
  if (!correo) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
    return 'El correo no tiene un formato válido'
  }
  return null
}

const validarTelefono = (telefono) => {
  if (!telefono) return null
  if (!/^[0-9+()\-\s]{7,25}$/.test(telefono)) {
    return 'El teléfono no tiene un formato válido'
  }
  return null
}

const validarDocumento = (documento) => {
  if (!documento) return 'El documento es obligatorio'
  if (!/^[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ.\- ]{3,30}$/.test(documento)) {
    return 'El documento solo admite letras, números, puntos, guiones y espacios (3 a 30 caracteres)'
  }
  return null
}

// Lee y normaliza el cuerpo de creación. Todos los campos de texto se
// recortan y los espacios internos se colapsan.
const leerProveedor = (body) => {
  const nombre = normalizarNombre(body.nombre)
  const tipoDocumento = normalizarTipoDocumento(body.tipo_documento || 'NIT')
  const documento = normalizarDocumento(body.documento)
  const contacto = textoOpcional(body.contacto, 100, 'El contacto')
  const telefono = textoOpcional(body.telefono, 25, 'El teléfono')
  const correo = textoOpcional(body.correo, 150, 'El correo')
  const direccion = textoOpcional(body.direccion, 255, 'La dirección')
  const ciudad = textoOpcional(body.ciudad, 100, 'La ciudad')

  if (!nombre) throw new ErrorHttp(400, 'El nombre del proveedor es obligatorio')
  if (nombre.length < 2) throw new ErrorHttp(400, 'El nombre del proveedor es demasiado corto')
  if (nombre.length > 150) throw new ErrorHttp(400, 'El nombre no puede superar los 150 caracteres')
  if (!tipoDocumento) throw new ErrorHttp(400, 'El tipo de documento es obligatorio')
  if (tipoDocumento.length > 20) {
    throw new ErrorHttp(400, 'El tipo de documento no puede superar los 20 caracteres')
  }

  const errorDocumento = validarDocumento(documento)
  if (errorDocumento) throw new ErrorHttp(400, errorDocumento)

  const errorCorreo = validarCorreo(correo)
  if (errorCorreo) throw new ErrorHttp(400, errorCorreo)

  const errorTelefono = validarTelefono(telefono)
  if (errorTelefono) throw new ErrorHttp(400, errorTelefono)

  return {
    nombre,
    tipo_documento: tipoDocumento,
    documento,
    contacto,
    telefono,
    correo,
    direccion,
    ciudad,
  }
}

const leerEstado = (valor) => {
  if (typeof valor === 'boolean') return valor
  const texto = String(valor ?? '').trim().toLowerCase()
  if (['activo', 'true', '1'].includes(texto)) return true
  if (['inactivo', 'false', '0'].includes(texto)) return false
  return null
}

const existeDocumento = async (db, documento, excluirId = null) => {
  const { rows } = await db.query(
    `SELECT 1
       FROM proveedor
      WHERE UPPER(TRIM(documento)) = $1
        AND ($2::int IS NULL OR id_proveedor <> $2)
      LIMIT 1`,
    [documento, excluirId]
  )
  return rows.length > 0
}

const responderError = (res, error, mensaje) => {
  if (error instanceof ErrorHttp || error.status) {
    return res.status(error.status || 400).json({ error: error.message })
  }
  if (error.code === '23505') {
    return res.status(409).json({
      error: 'Ya existe un proveedor con ese documento o nombre',
    })
  }
  if (error.code === '23514') {
    return res.status(400).json({
      error: 'Uno de los valores enviados no está permitido por el esquema',
    })
  }
  if (error.code === '22P02') {
    return res.status(400).json({ error: 'Uno de los datos tiene un formato inválido' })
  }
  console.error(mensaje, error.message)
  return res.status(500).json({ error: mensaje })
}

// ------------------------------------------------------------------
// GET / -> lista paginada con búsqueda y filtro por estado
// ------------------------------------------------------------------
router.get('/', requierePrivilegio('Proveedores', 'Consultar'), async (req, res) => {
  try {
    const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1)
    const limite = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limite, 10) || 20)
    )

    const condiciones = []
    const valores = []

    const q = String(req.query.q ?? '').trim()
    if (q) {
      valores.push(`%${q}%`)
      condiciones.push(
        `(p.nombre ILIKE $${valores.length}
          OR p.documento ILIKE $${valores.length}
          OR COALESCE(p.contacto, '') ILIKE $${valores.length}
          OR COALESCE(p.correo, '') ILIKE $${valores.length})`
      )
    }

    if (req.query.estado !== undefined && String(req.query.estado).trim() !== '') {
      const estado = leerEstado(req.query.estado)
      if (estado === null) {
        return res.status(400).json({
          error: 'El estado debe ser activo/inactivo (o true/false)',
        })
      }
      valores.push(estado)
      condiciones.push(`p.estado = $${valores.length}`)
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''

    const { rows: conteo } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM proveedor p ${where}`,
      valores
    )
    const total = conteo[0]?.total || 0

    const { rows } = await pool.query(
      `SELECT p.id_proveedor AS id,
              p.nombre,
              p.tipo_documento,
              p.documento,
              p.contacto,
              p.telefono,
              p.correo,
              p.direccion,
              p.ciudad,
              p.estado,
              p.creado_por,
              p.creado_en,
              p.actualizado_en,
              TRIM(u.nombres || ' ' || u.apellidos) AS creado_por_nombre,
              ${COMPRAS_PROVEEDOR_SQL},
              ${SALDO_PROVEEDOR_SQL}
         FROM proveedor p
         LEFT JOIN usuario u ON u.id_usuario = p.creado_por
         ${where}
         ORDER BY p.nombre, p.id_proveedor
         LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
      [...valores, limite, (pagina - 1) * limite]
    )

    res.json({
      data: rows.map((fila) => ({
        ...fila,
        estado_label: fila.estado ? 'Activo' : 'Inactivo',
      })),
      paginacion: {
        pagina,
        limite,
        total,
        paginas: Math.max(1, Math.ceil(total / limite)),
      },
    })
  } catch (error) {
    responderError(res, error, 'No se pudieron cargar los proveedores')
  }
})

// ------------------------------------------------------------------
// GET /:id -> proveedor + resumen de compras + saldo disponible
// ------------------------------------------------------------------
router.get('/:id', requierePrivilegio('Proveedores', 'Consultar'), async (req, res) => {
  try {
    const id = idPositivo(req.params.id, 'El id del proveedor')

    const { rows } = await pool.query(`${SELECT_PROVEEDOR} WHERE p.id_proveedor = $1`, [id])
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' })
    }
    const proveedor = rows[0]

    const { rows: resumen } = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE estado IN ('Borrador', 'Confirmada', 'Parcialmente recibida'))::int AS abiertas,
              COUNT(*) FILTER (WHERE estado = 'Recibida')::int AS recibidas,
              COUNT(*) FILTER (WHERE estado = 'Cerrada con faltantes')::int AS cerradas_con_faltantes,
              COUNT(*) FILTER (WHERE estado = 'Anulada')::int AS anuladas,
              COALESCE(SUM(costo_final) FILTER (WHERE estado <> 'Anulada'), 0)::float8 AS costo_total,
              COALESCE(SUM(valor_pagado), 0)::float8 AS valor_pagado_total
         FROM compra
        WHERE id_proveedor = $1`,
      [id]
    )

    const { rows: saldo } = await pool.query(
      `SELECT COALESCE(SUM(
                CASE WHEN tipo = 'GENERADO' THEN monto
                     WHEN tipo = 'APLICADO' THEN -monto
                     ELSE 0 END
              ), 0)::float8 AS saldo_disponible
         FROM movimiento_saldo_proveedor
        WHERE id_proveedor = $1`,
      [id]
    )

    const { rows: ultimasCompras } = await pool.query(
      `SELECT c.id_compra AS id,
              c.codigo,
              TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
              c.estado,
              c.costo_original::float8 AS costo_original,
              c.costo_final::float8 AS costo_final,
              c.valor_pagado::float8 AS valor_pagado
         FROM compra c
        WHERE c.id_proveedor = $1
        ORDER BY c.id_compra DESC
        LIMIT 5`,
      [id]
    )

    res.json({
      ...proveedor,
      estado_label: proveedor.estado ? 'Activo' : 'Inactivo',
      resumen_compras: resumen[0],
      saldo_disponible: redondear(saldo[0]?.saldo_disponible),
      ultimas_compras: ultimasCompras,
    })
  } catch (error) {
    responderError(res, error, 'No se pudo cargar el proveedor')
  }
})

// ------------------------------------------------------------------
// POST / -> crear proveedor
// ------------------------------------------------------------------
router.post('/', requierePrivilegio('Proveedores', 'Crear'), async (req, res) => {
  const db = await pool.connect()
  let committed = false
  try {
    const datos = leerProveedor(req.body)
    const estado = req.body.estado === undefined ? true : leerEstado(req.body.estado)
    if (estado === null) {
      throw new ErrorHttp(400, 'El estado debe ser activo/inactivo (o true/false)')
    }

    await db.query('BEGIN')

    if (await existeDocumento(db, datos.documento)) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe un proveedor con ese documento' })
    }

    const { rows } = await db.query(
      `INSERT INTO proveedor
         (nombre, tipo_documento, documento, contacto, telefono, correo,
          direccion, ciudad, estado, creado_por, creado_en, actualizado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
       RETURNING id_proveedor`,
      [
        datos.nombre,
        datos.tipo_documento,
        datos.documento,
        datos.contacto,
        datos.telefono,
        datos.correo,
        datos.direccion,
        datos.ciudad,
        estado,
        req.usuario.id,
      ]
    )

    await db.query('COMMIT')
    committed = true

    const { rows: creado } = await db.query(
      `${SELECT_PROVEEDOR} WHERE p.id_proveedor = $1`,
      [rows[0].id_proveedor]
    )
    if (!creado[0]) {
      return res.status(404).json({ error: 'Proveedor no encontrado' })
    }
    res.status(201).json({
      ...creado[0],
      estado_label: creado[0].estado ? 'Activo' : 'Inactivo',
    })
  } catch (error) {
    if (!committed) {
      await db.query('ROLLBACK').catch(() => {})
    }
    responderError(res, error, 'No se pudo crear el proveedor')
  } finally {
    db.release()
  }
})

// ------------------------------------------------------------------
// PUT /:id -> actualizar proveedor (nunca el identificador)
// ------------------------------------------------------------------
router.put('/:id', requierePrivilegio('Proveedores', 'Actualizar'), async (req, res) => {
  const db = await pool.connect()

  try {
    const id = idPositivo(req.params.id, 'El id del proveedor')
    await db.query('BEGIN')

    const { rows: actuales } = await db.query(
      `SELECT id_proveedor, nombre, tipo_documento, documento, contacto,
              telefono, correo, direccion, ciudad
         FROM proveedor
        WHERE id_proveedor = $1
        FOR UPDATE`,
      [id]
    )
    if (actuales.length === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Proveedor no encontrado' })
    }
    const actual = actuales[0]

    // PUT admite actualización parcial: lo omitido conserva su valor.
    const nombre =
      req.body.nombre === undefined ? actual.nombre : normalizarNombre(req.body.nombre)
    const tipoDocumento =
      req.body.tipo_documento === undefined
        ? actual.tipo_documento
        : normalizarTipoDocumento(req.body.tipo_documento)
    const documento =
      req.body.documento === undefined
        ? actual.documento
        : normalizarDocumento(req.body.documento)
    const contacto =
      req.body.contacto === undefined
        ? actual.contacto
        : textoOpcional(req.body.contacto, 100, 'El contacto')
    const telefono =
      req.body.telefono === undefined
        ? actual.telefono
        : textoOpcional(req.body.telefono, 25, 'El teléfono')
    const correo =
      req.body.correo === undefined
        ? actual.correo
        : textoOpcional(req.body.correo, 150, 'El correo')
    const direccion =
      req.body.direccion === undefined
        ? actual.direccion
        : textoOpcional(req.body.direccion, 255, 'La dirección')
    const ciudad =
      req.body.ciudad === undefined
        ? actual.ciudad
        : textoOpcional(req.body.ciudad, 100, 'La ciudad')

    if (!nombre) throw new ErrorHttp(400, 'El nombre del proveedor es obligatorio')
    if (nombre.length < 2) throw new ErrorHttp(400, 'El nombre del proveedor es demasiado corto')
    if (nombre.length > 150) {
      throw new ErrorHttp(400, 'El nombre no puede superar los 150 caracteres')
    }
    if (!tipoDocumento) throw new ErrorHttp(400, 'El tipo de documento es obligatorio')
    if (tipoDocumento.length > 20) {
      throw new ErrorHttp(400, 'El tipo de documento no puede superar los 20 caracteres')
    }

    const errorDocumento = validarDocumento(documento)
    if (errorDocumento) throw new ErrorHttp(400, errorDocumento)
    const errorCorreo = validarCorreo(correo)
    if (errorCorreo) throw new ErrorHttp(400, errorCorreo)
    const errorTelefono = validarTelefono(telefono)
    if (errorTelefono) throw new ErrorHttp(400, errorTelefono)

    if (documento !== actual.documento && (await existeDocumento(db, documento, id))) {
      await db.query('ROLLBACK')
      return res.status(409).json({ error: 'Ya existe un proveedor con ese documento' })
    }

    // El estado no se cambia por PUT: tiene su propio PATCH /:id/estado.
    await db.query(
      `UPDATE proveedor
          SET nombre = $1,
              tipo_documento = $2,
              documento = $3,
              contacto = $4,
              telefono = $5,
              correo = $6,
              direccion = $7,
              ciudad = $8,
              actualizado_en = now()
        WHERE id_proveedor = $9`,
      [nombre, tipoDocumento, documento, contacto, telefono, correo, direccion, ciudad, id]
    )

    await db.query('COMMIT')

    const { rows: actualizado } = await pool.query(
      `${SELECT_PROVEEDOR} WHERE p.id_proveedor = $1`,
      [id]
    )
    res.json({
      ...actualizado[0],
      estado_label: actualizado[0].estado ? 'Activo' : 'Inactivo',
    })
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    responderError(res, error, 'No se pudo actualizar el proveedor')
  } finally {
    db.release()
  }
})

// ------------------------------------------------------------------
// PATCH /:id/estado -> activar o inactivar. No se elimina físicamente.
// ------------------------------------------------------------------
router.patch(
  '/:id/estado',
  requierePrivilegio('Proveedores', 'Cambiar estado'),
  async (req, res) => {
    try {
      const id = idPositivo(req.params.id, 'El id del proveedor')
      const estado = leerEstado(req.body.estado)
      if (estado === null) {
        return res.status(400).json({
          error: "El estado debe ser 'Activo'/'Inactivo' (o true/false)",
        })
      }

      const { rows } = await pool.query(
        `UPDATE proveedor
            SET estado = $1, actualizado_en = now()
          WHERE id_proveedor = $2
          RETURNING id_proveedor`,
        [estado, id]
      )
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Proveedor no encontrado' })
      }

      const { rows: actualizado } = await pool.query(
        `${SELECT_PROVEEDOR} WHERE p.id_proveedor = $1`,
        [id]
      )
      res.json({
        ...actualizado[0],
        estado_label: actualizado[0].estado ? 'Activo' : 'Inactivo',
      })
    } catch (error) {
      responderError(res, error, 'No se pudo cambiar el estado del proveedor')
    }
  }
)

export default router
