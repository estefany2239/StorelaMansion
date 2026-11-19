// ============================================================
// PRUEBAS HTTP DE PROVEEDORES Y COMPRAS
//
// Requiere:
//   - backend corriendo (node src/server.js o npm run dev);
//   - backend/.env con DATABASE_URL y JWT_SECRET;
//   - CONFIRMAR_BD_DESARROLLO=desarrollo en el entorno.
//
// Las escrituras se bloquean si no se confirma explícitamente que la
// conexión es la rama de desarrollo de Neon. Nunca se debe ejecutar contra
// production.
//
// Uso (PowerShell):
//   $env:CONFIRMAR_BD_DESARROLLO="desarrollo"
//   node tests/test-proveedores-compras.mjs
//
// El script crea datos temporales y los elimina al final.
// ============================================================

import 'dotenv/config'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import pg from 'pg'
import { generarExcedenteCompra, pool as poolServicio } from '../src/services/compras.js'

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en backend/.env')
  process.exit(1)
}

// Host estricto de Neon desarrollo (tomado de backend/.env.example). Cualquier
// otra conexión aborta antes de escribir.
const HOST_NEON_DESARROLLO_ESPERADO =
  'ep-noisy-morning-b4mhr7p4-pooler.c-6.us-east-2.aws.neon.tech'
try {
  const urlBD = new URL(process.env.DATABASE_URL)
  if (urlBD.hostname !== HOST_NEON_DESARROLLO_ESPERADO) {
    console.error(
      `DATABASE_URL no apunta al host de Neon desarrollo esperado. ` +
        `host=${urlBD.hostname} esperado=${HOST_NEON_DESARROLLO_ESPERADO}`
    )
    process.exit(1)
  }
} catch (error) {
  console.error('DATABASE_URL no es una URL válida:', error.message)
  process.exit(1)
}
if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en backend/.env')
  process.exit(1)
}
if (process.env.NODE_ENV === 'production') {
  console.error('Este script no se puede ejecutar con NODE_ENV=production')
  process.exit(1)
}
if (String(process.env.CONFIRMAR_BD_DESARROLLO || '').toLowerCase() !== 'desarrollo') {
  console.error(
    'Falta la confirmación de base de datos. Ejecuta con:\n' +
      '  CONFIRMAR_BD_DESARROLLO=desarrollo node tests/test-proveedores-compras.mjs\n' +
      'Después de verificar que DATABASE_URL apunta a la rama desarrollo de Neon.'
  )
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const BASE =
  process.env.API_URL || `http://127.0.0.1:${process.env.PORT || 3000}/api`
const SUFIJO = crypto.randomBytes(4).toString('hex')

const proveedores = new Set()
const compras = new Set()
const productos = new Set()
const variantes = new Set()
const ventas = new Set()

let idVendedor = null
let fallos = 0

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

const pedir = async (metodo, ruta, { token, body } = {}) => {
  const url = `${BASE}${ruta}`
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  let respuesta
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    console.error('Error en petición HTTP:')
    console.error('  URL:', url)
    console.error('  Método:', metodo)
    console.error('  message:', error?.message)
    console.error('  cause:', error?.cause)
    console.error('  cause.code:', error?.cause?.code)
    console.error('  error completo:', error)
    throw error
  }
  let data = null
  try {
    data = await respuesta.json()
  } catch {
    data = null
  }
  return { status: respuesta.status, data }
}

const tokenDeRol = async (rol) => {
  const { rows } = await pool.query(
    `SELECT u.id_usuario
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE r.nombre = $1
        AND u.estado = TRUE
        AND u.cambio_contrasena_obligatorio = FALSE
      ORDER BY u.id_usuario
      LIMIT 1`,
    [rol]
  )
  if (rows.length === 0) throw new Error(`No hay un usuario ${rol} activo`)
  return jwt.sign({ id: rows[0].id_usuario, rol }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  })
}

const crearVendedor = async () => {
  const { rows: rol } = await pool.query(
    "SELECT MIN(id_rol) AS id FROM rol WHERE nombre = 'Vendedor'"
  )
  if (!rol[0].id) throw new Error("Falta el rol 'Vendedor'")

  const { rows } = await pool.query(
    `INSERT INTO usuario
       (nombres, apellidos, correo, contrasena, id_rol, estado,
        cambio_contrasena_obligatorio)
     VALUES ('Vendedor', 'Compras Prueba', $1, $2, $3, TRUE, FALSE)
     RETURNING id_usuario`,
    [
      `vendedor-compras-${SUFIJO}@test.com`,
      crypto.randomBytes(24).toString('base64url'),
      rol[0].id,
    ]
  )
  idVendedor = rows[0].id_usuario
  return jwt.sign({ id: idVendedor, rol: 'Vendedor' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  })
}

const stockDe = async (idVariante) => {
  const { rows } = await pool.query(
    'SELECT stock FROM producto_variante WHERE id_variante = $1',
    [idVariante]
  )
  return rows[0]?.stock
}

const idUsuarioDeRol = async (rol) => {
  const { rows } = await pool.query(
    `SELECT u.id_usuario
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE r.nombre = $1
        AND u.estado = TRUE
        AND u.cambio_contrasena_obligatorio = FALSE
      ORDER BY u.id_usuario
      LIMIT 1`,
    [rol]
  )
  if (rows.length === 0) throw new Error(`No hay un usuario ${rol} activo`)
  return rows[0].id_usuario
}

// Invoca la generación de excedente otra vez, con la compra bloqueada, para
// comprobar que es idempotente y no inserta un segundo GENERADO.
const repetirGeneracionExcedente = async (idCompra, registradoPor) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT id_compra FROM compra WHERE id_compra = $1 FOR UPDATE', [
      idCompra,
    ])
    const generado = await generarExcedenteCompra(client, idCompra, registradoPor)
    await client.query('COMMIT')
    return generado
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

const crearProducto = async (etiqueta) => {
  const { rows: p } = await pool.query(
    `INSERT INTO producto (nombre, descripcion, precio, stock_minimo, estado, codigo)
     VALUES ($1, $2, $3, 0, TRUE, $4)
     RETURNING id_producto`,
    [
      `Producto compras ${etiqueta} ${SUFIJO}`,
      'Producto temporal de pruebas de compras',
      1000,
      `CMP-${SUFIJO}-${etiqueta}`,
    ]
  )
  const idProducto = p[0].id_producto
  productos.add(idProducto)

  const { rows: v } = await pool.query(
    'INSERT INTO producto_variante (id_producto, stock) VALUES ($1, 0) RETURNING id_variante',
    [idProducto]
  )
  variantes.add(v[0].id_variante)
  return v[0].id_variante
}

// ------------------------------------------------------------
// Verificación de conexión y esquema (solo lectura)
// ------------------------------------------------------------
const TABLAS_REQUERIDAS = {
  proveedor: [
    'id_proveedor',
    'nombre',
    'tipo_documento',
    'documento',
    'contacto',
    'telefono',
    'correo',
    'direccion',
    'ciudad',
    'estado',
    'creado_por',
    'creado_en',
    'actualizado_en',
  ],
  compra: [
    'id_compra',
    'codigo',
    'id_proveedor',
    'registrado_por',
    'fecha',
    'estado',
    'costo_original',
    'costo_final',
    'valor_pagado',
    'observaciones',
    'creado_en',
    'actualizado_en',
    'cerrado_en',
  ],
  detalle_compra: [
    'id_detalle',
    'id_compra',
    'id_variante',
    'cantidad_solicitada',
    'cantidad_cancelada',
    'costo_unitario',
    'motivo_cancelacion',
  ],
  recepcion_compra: [
    'id_recepcion',
    'id_compra',
    'recibido_por',
    'fecha_recepcion',
    'clave_idempotencia',
    'observaciones',
    'creado_en',
  ],
  detalle_recepcion: [
    'id_detalle_recepcion',
    'id_recepcion',
    'id_compra',
    'id_detalle',
    'cantidad_recibida',
  ],
  movimiento_saldo_proveedor: [
    'id_movimiento',
    'id_proveedor',
    'id_compra_origen',
    'id_compra_destino',
    'id_movimiento_origen',
    'tipo',
    'monto',
    'registrado_por',
    'clave_idempotencia',
    'observaciones',
    'creado_en',
  ],
}

const verificarConexionYEsquema = async () => {
  const { rows } = await pool.query(
    `SELECT current_database() AS base,
            current_user AS usuario,
            inet_server_addr()::text AS host`
  )
  const ident = rows[0]
  console.log(
    `[bd] base=${ident.base} usuario=${ident.usuario} host=${ident.host || 'local'}`
  )

  if (/prod/i.test(ident.base)) {
    throw new Error('La base de datos parece ser de producción; se abortan las pruebas')
  }

  // Neon puede exponer el nombre de la rama; si no existe, no es un error.
  // Cuando está disponible, se exige que sea la rama de desarrollo.
  try {
    const { rows: rama } = await pool.query(
      "SELECT current_setting('neon.branch_name', true) AS rama"
    )
    if (rama[0]?.rama) {
      console.log(`[bd] rama Neon: ${rama[0].rama}`)
      if (!/desarrollo/i.test(rama[0].rama)) {
        throw new Error(
          `La rama Neon "${rama[0].rama}" no es desarrollo; se abortan las pruebas`
        )
      }
    }
  } catch (error) {
    if (String(error.message).includes('no es desarrollo')) throw error
    // La configuración no está disponible en este servidor.
  }

  const nombres = Object.keys(TABLAS_REQUERIDAS)
  const { rows: existentes } = await pool.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [nombres]
  )
  const setExistentes = new Set(existentes.map((r) => r.table_name))
  const faltantesTablas = nombres.filter((n) => !setExistentes.has(n))
  if (faltantesTablas.length > 0) {
    throw new Error(`Faltan tablas: ${faltantesTablas.join(', ')}`)
  }

  const { rows: columnas } = await pool.query(
    `SELECT table_name, column_name, data_type, character_maximum_length, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [nombres]
  )
  const mapa = new Map()
  const info = new Map()
  for (const fila of columnas) {
    if (!mapa.has(fila.table_name)) mapa.set(fila.table_name, new Set())
    mapa.get(fila.table_name).add(fila.column_name)
    info.set(`${fila.table_name}.${fila.column_name}`, fila)
  }

  for (const [tabla, requeridas] of Object.entries(TABLAS_REQUERIDAS)) {
    const presentes = mapa.get(tabla) || new Set()
    const faltantes = requeridas.filter((c) => !presentes.has(c))
    if (faltantes.length > 0) {
      throw new Error(`A ${tabla} le faltan columnas: ${faltantes.join(', ')}`)
    }
  }

  // Suposiciones de tipo que el código usa directamente. Si la rama real
  // difiere, es mejor abortar antes de escribir que fallar a mitad del flujo.
  const estadoProveedor = info.get('proveedor.estado')
  if (estadoProveedor?.data_type !== 'boolean') {
    throw new Error(
      `proveedor.estado se esperaba boolean y es ${estadoProveedor?.data_type || 'desconocido'}`
    )
  }

  const estadoCompra = info.get('compra.estado')
  if (!['character varying', 'text'].includes(estadoCompra?.data_type)) {
    throw new Error(
      `compra.estado se esperaba texto y es ${estadoCompra?.data_type || 'desconocido'}`
    )
  }
  if (
    estadoCompra.character_maximum_length !== null &&
    estadoCompra.character_maximum_length < 21
  ) {
    throw new Error(
      `compra.estado debe permitir al menos 21 caracteres (Parcialmente recibida); ` +
        `la columna tiene ${estadoCompra.character_maximum_length}`
    )
  }

  // Según el esquema real, ambas columnas son NOT NULL + UNIQUE. El código
  // exige clave en recepciones y aplicaciones, y genera una interna para los
  // excedentes; si la columna fuese nullable, el test lo detecta antes de
  // escribir.
  for (const columna of [
    'recepcion_compra.clave_idempotencia',
    'movimiento_saldo_proveedor.clave_idempotencia',
  ]) {
    const infoColumna = info.get(columna)
    if (infoColumna?.is_nullable !== 'NO') {
      throw new Error(
        `${columna} se esperaba NOT NULL según el esquema real; ` +
          `is_nullable=${infoColumna?.is_nullable ?? 'desconocido'}`
      )
    }
  }

  console.log('[bd] Las seis tablas, sus columnas, tipos y claves NOT NULL existen')
}

// ------------------------------------------------------------
// Limpieza
// ------------------------------------------------------------
const limpiar = async () => {
  try {
    const idsCompras = [...compras]
    const idsProveedores = [...proveedores]
    const idsProductos = [...productos]
    const idsVariantes = [...variantes]
    const idsVentas = [...ventas]

    if (idsProveedores.length > 0) {
      // Primero los APLICADO: referencian por id_movimiento_origen a los
      // GENERADO del mismo proveedor.
      await pool.query(
        "DELETE FROM movimiento_saldo_proveedor WHERE id_proveedor = ANY($1::int[]) AND tipo = 'APLICADO'",
        [idsProveedores]
      )
      await pool.query(
        'DELETE FROM movimiento_saldo_proveedor WHERE id_proveedor = ANY($1::int[])',
        [idsProveedores]
      )
    }
    if (idsCompras.length > 0) {
      await pool.query(
        'DELETE FROM detalle_recepcion WHERE id_compra = ANY($1::int[])',
        [idsCompras]
      )
      await pool.query(
        'DELETE FROM recepcion_compra WHERE id_compra = ANY($1::int[])',
        [idsCompras]
      )
      await pool.query(
        'DELETE FROM detalle_compra WHERE id_compra = ANY($1::int[])',
        [idsCompras]
      )
      await pool.query('DELETE FROM compra WHERE id_compra = ANY($1::int[])', [
        idsCompras,
      ])
    }
    if (idsProveedores.length > 0) {
      await pool.query(
        'DELETE FROM proveedor WHERE id_proveedor = ANY($1::int[])',
        [idsProveedores]
      )
    }
    if (idsVentas.length > 0) {
      await pool.query('DELETE FROM detalle_venta WHERE id_venta = ANY($1::int[])', [
        idsVentas,
      ])
      await pool.query('DELETE FROM venta WHERE id_venta = ANY($1::int[])', [
        idsVentas,
      ])
    }
    if (idsVariantes.length > 0) {
      await pool.query(
        'DELETE FROM producto_variante WHERE id_variante = ANY($1::int[])',
        [idsVariantes]
      )
    }
    if (idsProductos.length > 0) {
      await pool.query('DELETE FROM producto WHERE id_producto = ANY($1::int[])', [
        idsProductos,
      ])
    }
    if (idVendedor) {
      await pool.query('DELETE FROM usuario WHERE id_usuario = $1', [idVendedor])
    }
  } catch (error) {
    console.error('Error en la limpieza:', error.message)
    console.error('IDs pendientes de limpieza:', {
      proveedores: [...proveedores],
      compras: [...compras],
      productos: [...productos],
      variantes: [...variantes],
      ventas: [...ventas],
      vendedor: idVendedor,
    })
  }
  // El servicio importa su propio pool; no se usa para las consultas de la
  // prueba, pero se cierra para no dejar handles abiertos.
  await poolServicio.end().catch(() => {})
  await pool.end()
}

// ------------------------------------------------------------
// Flujo principal
// ------------------------------------------------------------
const main = async () => {
  await verificarConexionYEsquema()

  const token = await tokenDeRol('Administrador')
  const idAdmin = await idUsuarioDeRol('Administrador')
  const tokenVendedor = await crearVendedor()

  console.log('\n--- PROVEEDORES ---')

  const proveedorBase = {
    nombre: `Proveedor ${SUFIJO}`,
    tipo_documento: 'NIT',
    documento: `NIT-${SUFIJO}`,
    contacto: 'Contacto Prueba',
    telefono: '+57 300 123 4567',
    correo: `proveedor-${SUFIJO}@test.com`,
    direccion: 'Calle 1 # 2-3',
    ciudad: 'Medellín',
  }

  const crearProveedor = await pedir('POST', '/admin/proveedores', {
    token,
    body: proveedorBase,
  })
  comprobar(
    '1. Crear proveedor -> 201',
    crearProveedor.status === 201,
    `status=${crearProveedor.status} error=${crearProveedor.data?.error}`
  )
  const idProveedor = crearProveedor.data?.id
  if (!idProveedor) throw new Error('No se obtuvo el id del proveedor')
  proveedores.add(idProveedor)

  const sinNombre = await pedir('POST', '/admin/proveedores', {
    token,
    body: { ...proveedorBase, nombre: '', documento: `SIN-NOMBRE-${SUFIJO}` },
  })
  comprobar(
    '2a. Crear proveedor sin nombre -> 400',
    sinNombre.status === 400,
    `status=${sinNombre.status}`
  )

  const sinDocumento = await pedir('POST', '/admin/proveedores', {
    token,
    body: { ...proveedorBase, documento: '', nombre: `Sin documento ${SUFIJO}` },
  })
  comprobar(
    '2b. Crear proveedor sin documento -> 400',
    sinDocumento.status === 400,
    `status=${sinDocumento.status}`
  )

  const actualizarProveedor = await pedir('PUT', `/admin/proveedores/${idProveedor}`, {
    token,
    body: { contacto: 'Contacto Actualizado', ciudad: 'Bogotá' },
  })
  comprobar(
    '3. Actualizar proveedor -> 200',
    actualizarProveedor.status === 200 &&
      actualizarProveedor.data?.contacto === 'Contacto Actualizado',
    `status=${actualizarProveedor.status}`
  )

  const inactivar = await pedir(
    'PATCH',
    `/admin/proveedores/${idProveedor}/estado`,
    { token, body: { estado: false } }
  )
  comprobar(
    '4. Inactivar proveedor -> 200 y estado=false',
    inactivar.status === 200 && inactivar.data?.estado === false,
    `status=${inactivar.status} estado=${inactivar.data?.estado}`
  )

  // Productos temporales para las compras.
  const variante1 = await crearProducto('A')
  const variante2 = await crearProducto('B')
  const variante3 = await crearProducto('C')
  const variante4 = await crearProducto('D')

  const proveedorInactivo = await pedir('POST', '/admin/compras', {
    token,
    body: {
      id_proveedor: idProveedor,
      items: [{ id_variante: variante1, cantidad: 1, costo_unitario: 100 }],
    },
  })
  comprobar(
    '4b. Crear compra con proveedor inactivo -> 409',
    proveedorInactivo.status === 409,
    `status=${proveedorInactivo.status}`
  )

  const reactivar = await pedir(
    'PATCH',
    `/admin/proveedores/${idProveedor}/estado`,
    { token, body: { estado: true } }
  )
  comprobar(
    '4c. Reactivar proveedor -> 200 y estado=true',
    reactivar.status === 200 && reactivar.data?.estado === true,
    `status=${reactivar.status}`
  )

  console.log('\n--- COMPRAS: CREACIÓN Y CONFIRMACIÓN ---')

  const compra1 = await pedir('POST', '/admin/compras', {
    token,
    body: {
      id_proveedor: idProveedor,
      observaciones: 'Compra de prueba 1',
      items: [{ id_variante: variante1, cantidad_solicitada: 5, costo_unitario: 1000 }],
    },
  })
  comprobar(
    '5. Crear compra en Borrador -> 201',
    compra1.status === 201 && compra1.data?.estado === 'Borrador',
    `status=${compra1.status} estado=${compra1.data?.estado}`
  )
  const idCompra1 = compra1.data?.id
  if (!idCompra1) throw new Error('No se obtuvo el id de la compra 1')
  compras.add(idCompra1)
  comprobar(
    '5b. Costo original calculado en backend = 5000',
    compra1.data?.resumen?.costo_original === 5000,
    `costo_original=${compra1.data?.resumen?.costo_original}`
  )

  const stockInicial1 = await stockDe(variante1)
  comprobar(
    '6. Crear compra no modifica el stock',
    stockInicial1 === 0,
    `stock=${stockInicial1}`
  )

  const confirmar1 = await pedir('POST', `/admin/compras/${idCompra1}/confirmar`, {
    token,
  })
  comprobar(
    '7. Confirmar compra -> 200 y estado Confirmada',
    confirmar1.status === 200 && confirmar1.data?.estado === 'Confirmada',
    `status=${confirmar1.status} estado=${confirmar1.data?.estado}`
  )
  comprobar(
    '7b. Confirmar compra no modifica el stock',
    (await stockDe(variante1)) === 0
  )

  console.log('\n--- COMPRAS: RECEPCIÓN PARCIAL ---')

  const detalle1 = compra1.data?.detalles?.[0]
  const clave1 = `rec-${SUFIJO}-1`

  const recepcionSinClave = await pedir(
    'POST',
    `/admin/compras/${idCompra1}/recepciones`,
    {
      token,
      body: {
        items: [{ id_detalle: detalle1.id_detalle, cantidad_recibida: 2 }],
      },
    }
  )
  comprobar(
    '8a. Recepción sin clave de idempotencia -> 400',
    recepcionSinClave.status === 400,
    `status=${recepcionSinClave.status} error=${recepcionSinClave.data?.error}`
  )
  comprobar(
    '8a-bis. La recepción rechazada sin clave no modifica el stock',
    (await stockDe(variante1)) === 0,
    `stock=${await stockDe(variante1)}`
  )

  const recepcion1 = await pedir(
    'POST',
    `/admin/compras/${idCompra1}/recepciones`,
    {
      token,
      body: {
        clave_idempotencia: clave1,
        observaciones: 'Primera recepción parcial',
        items: [{ id_detalle: detalle1.id_detalle, cantidad_recibida: 2 }],
      },
    }
  )
  comprobar(
    '8. Recepción parcial -> 201',
    recepcion1.status === 201,
    `status=${recepcion1.status} error=${recepcion1.data?.error}`
  )
  comprobar(
    '8b. Estado Parcialmente recibida',
    recepcion1.data?.estado === 'Parcialmente recibida',
    `estado=${recepcion1.data?.estado}`
  )
  comprobar(
    '9. Inventario incrementado exactamente en 2',
    (await stockDe(variante1)) === 2,
    `stock=${await stockDe(variante1)}`
  )
  comprobar(
    '9b. Costo final recalculado a 2000',
    recepcion1.data?.resumen?.costo_final === 2000,
    `costo_final=${recepcion1.data?.resumen?.costo_final}`
  )

  const recepcion2 = await pedir(
    'POST',
    `/admin/compras/${idCompra1}/recepciones`,
    {
      token,
      body: {
        clave_idempotencia: `rec-${SUFIJO}-2`,
        items: [{ id_detalle: detalle1.id_detalle, cantidad_recibida: 3 }],
      },
    }
  )
  comprobar(
    '10. Segunda recepción -> 201',
    recepcion2.status === 201,
    `status=${recepcion2.status} error=${recepcion2.data?.error}`
  )
  comprobar(
    '11. Estado Recibida al completar lo solicitado',
    recepcion2.data?.estado === 'Recibida',
    `estado=${recepcion2.data?.estado}`
  )
  comprobar(
    '11b. Stock total = 5 y costo final = 5000',
    (await stockDe(variante1)) === 5 &&
      recepcion2.data?.resumen?.costo_final === 5000
  )

  console.log('\n--- COMPRAS: VALIDACIONES DE RECEPCIÓN ---')

  const compra2 = await pedir('POST', '/admin/compras', {
    token,
    body: {
      id_proveedor: idProveedor,
      items: [{ id_variante: variante2, cantidad_solicitada: 10, costo_unitario: 300 }],
    },
  })
  const idCompra2 = compra2.data?.id
  if (!idCompra2) throw new Error('No se obtuvo el id de la compra 2')
  compras.add(idCompra2)
  await pedir('POST', `/admin/compras/${idCompra2}/confirmar`, { token })

  const detalle2 = compra2.data?.detalles?.[0]

  const recibirDemasiado = await pedir(
    'POST',
    `/admin/compras/${idCompra2}/recepciones`,
    {
      token,
      body: {
        clave_idempotencia: `rec-${SUFIJO}-3`,
        items: [{ id_detalle: detalle2.id_detalle, cantidad_recibida: 11 }],
      },
    }
  )
  comprobar(
    '12. Intentar recibir más de lo solicitado -> 409',
    recibirDemasiado.status === 409,
    `status=${recibirDemasiado.status}`
  )
  comprobar(
    '12b. El intento rechazado no modifica el stock',
    (await stockDe(variante2)) === 0
  )

  const recepcion3 = await pedir(
    'POST',
    `/admin/compras/${idCompra2}/recepciones`,
    {
      token,
      body: {
        clave_idempotencia: `rec-${SUFIJO}-4`,
        items: [{ id_detalle: detalle2.id_detalle, cantidad_recibida: 4 }],
      },
    }
  )
  comprobar(
    '10b. Recepción parcial de la compra 2 -> 201 y stock 4',
    recepcion3.status === 201 && (await stockDe(variante2)) === 4,
    `status=${recepcion3.status} stock=${await stockDe(variante2)}`
  )

  const repetirRecepcion = await pedir(
    'POST',
    `/admin/compras/${idCompra1}/recepciones`,
    {
      token,
      body: {
        clave_idempotencia: clave1,
        observaciones: 'Primera recepción parcial',
        items: [{ id_detalle: detalle1.id_detalle, cantidad_recibida: 2 }],
      },
    }
  )
  comprobar(
    '13. Repetir recepción con la misma clave -> idempotente y sin stock doble',
    repetirRecepcion.status === 201 &&
      repetirRecepcion.data?.recepcion_idempotente === true &&
      (await stockDe(variante1)) === 5,
    `status=${repetirRecepcion.status} stock=${await stockDe(variante1)}`
  )

  console.log('\n--- COMPRAS: CIERRE CON FALTANTES ---')

  const cerrar = await pedir('POST', `/admin/compras/${idCompra2}/cerrar`, {
    token,
    body: { motivo: 'El proveedor no entregará el resto' },
  })
  comprobar(
    '14. Cerrar compra con faltantes -> 200',
    cerrar.status === 200 && cerrar.data?.estado === 'Cerrada con faltantes',
    `status=${cerrar.status} estado=${cerrar.data?.estado}`
  )
  comprobar(
    '14b. Se cancelaron exactamente 6 unidades pendientes',
    cerrar.data?.resumen?.total_cancelado === 6 &&
      cerrar.data?.resumen?.total_pendiente === 0,
    `cancelado=${cerrar.data?.resumen?.total_cancelado} pendiente=${cerrar.data?.resumen?.total_pendiente}`
  )
  comprobar(
    '14c. Las unidades canceladas no incrementan el stock',
    (await stockDe(variante2)) === 4,
    `stock=${await stockDe(variante2)}`
  )
  comprobar(
    '15. Costo original intacto (3000) y costo final según lo recibido (1200)',
    cerrar.data?.resumen?.costo_original === 3000 &&
      cerrar.data?.resumen?.costo_final === 1200,
    `original=${cerrar.data?.resumen?.costo_original} final=${cerrar.data?.resumen?.costo_final}`
  )

  console.log('\n--- COMPRAS: PAGOS Y SALDO A FAVOR ---')

  const pagoParcial = await pedir('POST', `/admin/compras/${idCompra2}/pago`, {
    token,
    body: { monto: 500 },
  })
  comprobar(
    '16. Pago parcial -> 201, saldo pendiente 700 y estado Parcialmente pagada',
    pagoParcial.status === 201 &&
      pagoParcial.data?.valor_pagado === 500 &&
      pagoParcial.data?.saldo_pendiente === 700 &&
      pagoParcial.data?.estado_pago === 'Parcialmente pagada',
    `status=${pagoParcial.status} pagado=${pagoParcial.data?.valor_pagado} saldo=${pagoParcial.data?.saldo_pendiente}`
  )

  const pagoTotal = await pedir('POST', `/admin/compras/${idCompra2}/pago`, {
    token,
    body: { monto: 1000 },
  })
  comprobar(
    '17. Pago que cubre el total -> 201, cubierto 1500 y excedente 300',
    pagoTotal.status === 201 &&
      pagoTotal.data?.valor_pagado === 1500 &&
      pagoTotal.data?.estado_pago === 'Pagada' &&
      pagoTotal.data?.excedente_generado === 300,
    `status=${pagoTotal.status} pagado=${pagoTotal.data?.valor_pagado} excedente=${pagoTotal.data?.excedente_generado}`
  )

  const proveedorDetalle = await pedir('GET', `/admin/proveedores/${idProveedor}`, {
    token,
  })
  comprobar(
    '18. Saldo a favor generado y visible en el proveedor = 300',
    proveedorDetalle.data?.saldo_disponible === 300,
    `saldo=${proveedorDetalle.data?.saldo_disponible}`
  )

  const { rows: movimientosGenerados } = await pool.query(
    `SELECT id_movimiento, clave_idempotencia
       FROM movimiento_saldo_proveedor
      WHERE id_proveedor = $1 AND tipo = 'GENERADO'
      ORDER BY id_movimiento
      LIMIT 1`,
    [idProveedor]
  )
  const idMovimientoGenerado = movimientosGenerados[0]?.id_movimiento
  comprobar(
    '18b. Existe un movimiento GENERADO asociado a la compra',
    Boolean(idMovimientoGenerado)
  )
  comprobar(
    '18c. El movimiento GENERADO tiene clave interna no nula',
    typeof movimientosGenerados[0]?.clave_idempotencia === 'string' &&
      movimientosGenerados[0].clave_idempotencia.startsWith('sys~excedente~'),
    `clave=${movimientosGenerados[0]?.clave_idempotencia}`
  )

  const { rows: generadoAntes } = await pool.query(
    `SELECT COUNT(*)::int AS total, COALESCE(SUM(monto), 0)::float8 AS monto
       FROM movimiento_saldo_proveedor
      WHERE id_proveedor = $1 AND tipo = 'GENERADO'`,
    [idProveedor]
  )
  const generadoRepetido = await repetirGeneracionExcedente(idCompra2, idAdmin)
  const { rows: generadoDespues } = await pool.query(
    `SELECT COUNT(*)::int AS total, COALESCE(SUM(monto), 0)::float8 AS monto
       FROM movimiento_saldo_proveedor
      WHERE id_proveedor = $1 AND tipo = 'GENERADO'`,
    [idProveedor]
  )
  comprobar(
    '18d. Repetir la generación del excedente no duplica el saldo',
    generadoRepetido === 0 &&
      generadoDespues[0].total === generadoAntes[0].total &&
      generadoDespues[0].monto === generadoAntes[0].monto,
    `retorno=${generadoRepetido} antes=${generadoAntes[0].monto} despues=${generadoDespues[0].monto}`
  )

  // Compra 3: se usará para aplicar el saldo a favor.
  const compra3 = await pedir('POST', '/admin/compras', {
    token,
    body: {
      id_proveedor: idProveedor,
      items: [{ id_variante: variante3, cantidad_solicitada: 2, costo_unitario: 400 }],
    },
  })
  const idCompra3 = compra3.data?.id
  if (!idCompra3) throw new Error('No se obtuvo el id de la compra 3')
  compras.add(idCompra3)
  await pedir('POST', `/admin/compras/${idCompra3}/confirmar`, { token })

  const aplicarSinClave = await pedir(
    'POST',
    `/admin/compras/${idCompra3}/aplicar-saldo`,
    { token, body: { monto: 200 } }
  )
  comprobar(
    '19a. Aplicar saldo sin clave de idempotencia -> 400',
    aplicarSinClave.status === 400,
    `status=${aplicarSinClave.status} error=${aplicarSinClave.data?.error}`
  )

  const aplicarParcial = await pedir(
    'POST',
    `/admin/compras/${idCompra3}/aplicar-saldo`,
    {
      token,
      body: { monto: 200, clave_idempotencia: `saldo-${SUFIJO}-1` },
    }
  )
  comprobar(
    '19. Aplicar 200 de saldo a otra compra del mismo proveedor -> 201',
    aplicarParcial.status === 201 &&
      aplicarParcial.data?.monto_aplicado === 200 &&
      aplicarParcial.data?.saldo_aplicado === 200 &&
      aplicarParcial.data?.saldo_pendiente === 600,
    `status=${aplicarParcial.status} aplicado=${aplicarParcial.data?.monto_aplicado} pendiente=${aplicarParcial.data?.saldo_pendiente}`
  )

  const consumirDemasiado = await pedir(
    'POST',
    `/admin/compras/${idCompra3}/aplicar-saldo`,
    {
      token,
      body: { monto: 500, clave_idempotencia: `saldo-${SUFIJO}-2` },
    }
  )
  comprobar(
    '21. Intentar consumir más saldo del disponible -> 409',
    consumirDemasiado.status === 409,
    `status=${consumirDemasiado.status}`
  )

  const aplicarResto = await pedir(
    'POST',
    `/admin/compras/${idCompra3}/aplicar-saldo`,
    {
      token,
      body: { monto: 100, clave_idempotencia: `saldo-${SUFIJO}-3` },
    }
  )
  comprobar(
    '19b. Aplicar los 100 restantes -> 201 y saldo del proveedor en 0',
    aplicarResto.status === 201 &&
      aplicarResto.data?.monto_aplicado === 100 &&
      aplicarResto.data?.saldo_disponible_proveedor === 0,
    `status=${aplicarResto.status} disponible=${aplicarResto.data?.saldo_disponible_proveedor}`
  )

  const { rows: aplicados } = await pool.query(
    `SELECT clave_idempotencia
       FROM movimiento_saldo_proveedor
      WHERE id_proveedor = $1 AND tipo = 'APLICADO'
      ORDER BY id_movimiento`,
    [idProveedor]
  )
  comprobar(
    '19c. Los movimientos APLICADO tienen clave de idempotencia no nula',
    aplicados.length >= 2 &&
      aplicados.every(
        (m) => typeof m.clave_idempotencia === 'string' && m.clave_idempotencia.length > 0
      ),
    `claves=${aplicados.map((m) => m.clave_idempotencia).join(', ')}`
  )
  comprobar(
    '19d. Las claves APLICADO son únicas',
    new Set(aplicados.map((m) => m.clave_idempotencia)).size === aplicados.length,
    `total=${aplicados.length}`
  )

  // Proveedor B y compra B para intentar aplicar saldo de A en B.
  const proveedorB = await pedir('POST', '/admin/proveedores', {
    token,
    body: {
      nombre: `Proveedor B ${SUFIJO}`,
      tipo_documento: 'CC',
      documento: `CC-${SUFIJO}`,
      correo: `proveedor-b-${SUFIJO}@test.com`,
      ciudad: 'Cali',
    },
  })
  const idProveedorB = proveedorB.data?.id
  if (!idProveedorB) throw new Error('No se obtuvo el id del proveedor B')
  proveedores.add(idProveedorB)

  const compraB = await pedir('POST', '/admin/compras', {
    token,
    body: {
      id_proveedor: idProveedorB,
      items: [{ id_variante: variante4, cantidad_solicitada: 1, costo_unitario: 100 }],
    },
  })
  const idCompraB = compraB.data?.id
  if (!idCompraB) throw new Error('No se obtuvo el id de la compra B')
  compras.add(idCompraB)

  const aplicarOtroProveedor = await pedir(
    'POST',
    `/admin/compras/${idCompraB}/aplicar-saldo`,
    {
      token,
      body: {
        monto: 50,
        id_movimiento_origen: idMovimientoGenerado,
        clave_idempotencia: `saldo-${SUFIJO}-4`,
      },
    }
  )
  comprobar(
    '20. Intentar aplicar saldo de otro proveedor -> 400',
    aplicarOtroProveedor.status === 400,
    `status=${aplicarOtroProveedor.status} error=${aplicarOtroProveedor.data?.error}`
  )

  // ----------------------------------------------------------
  // Aplicación que consume varios movimientos de origen: cada
  // fila APLICADO debe llevar una clave única y no nula.
  // ----------------------------------------------------------
  const crearCompraConSaldo = async (etiqueta, montoPago) => {
    const compra = await pedir('POST', '/admin/compras', {
      token,
      body: {
        id_proveedor: idProveedor,
        items: [{ id_variante: variante3, cantidad: 1, costo_unitario: 100 }],
      },
    })
    const idCompra = compra.data?.id
    if (!idCompra) throw new Error(`No se obtuvo el id de la compra ${etiqueta}`)
    compras.add(idCompra)

    const detalle = compra.data?.detalles?.[0]
    await pedir('POST', `/admin/compras/${idCompra}/confirmar`, { token })
    const recepcion = await pedir(
      'POST',
      `/admin/compras/${idCompra}/recepciones`,
      {
        token,
        body: {
          clave_idempotencia: `rec-${SUFIJO}-${etiqueta}`,
          items: [{ id_detalle: detalle.id_detalle, cantidad_recibida: 1 }],
        },
      }
    )
    if (recepcion.status !== 201) {
      throw new Error(
        `No se pudo recibir la compra ${etiqueta}: ${recepcion.data?.error}`
      )
    }

    const pago = await pedir('POST', `/admin/compras/${idCompra}/pago`, {
      token,
      body: { monto: montoPago },
    })
    if (pago.status !== 201) {
      throw new Error(`No se pudo pagar la compra ${etiqueta}: ${pago.data?.error}`)
    }
    return idCompra
  }

  await crearCompraConSaldo('multi-1', 200)
  await crearCompraConSaldo('multi-2', 200)

  const compraMultiDestino = await pedir('POST', '/admin/compras', {
    token,
    body: {
      id_proveedor: idProveedor,
      items: [{ id_variante: variante3, cantidad_solicitada: 5, costo_unitario: 100 }],
    },
  })
  const idCompraMultiDestino = compraMultiDestino.data?.id
  if (!idCompraMultiDestino) {
    throw new Error('No se obtuvo el id de la compra multi-destino')
  }
  compras.add(idCompraMultiDestino)
  await pedir('POST', `/admin/compras/${idCompraMultiDestino}/confirmar`, { token })

  const claveMulti = `saldo-${SUFIJO}-multi`
  const aplicarMulti = await pedir(
    'POST',
    `/admin/compras/${idCompraMultiDestino}/aplicar-saldo`,
    { token, body: { monto: 150, clave_idempotencia: claveMulti } }
  )
  comprobar(
    '19e. Aplicación que consume dos movimientos de origen -> 201',
    aplicarMulti.status === 201 && aplicarMulti.data?.monto_aplicado === 150,
    `status=${aplicarMulti.status} aplicado=${aplicarMulti.data?.monto_aplicado}`
  )

  const { rows: aplicadosMulti } = await pool.query(
    `SELECT clave_idempotencia, monto::float8 AS monto
       FROM movimiento_saldo_proveedor
      WHERE id_proveedor = $1
        AND tipo = 'APLICADO'
        AND (clave_idempotencia = $2
             OR LEFT(clave_idempotencia, LENGTH($2) + 1) = $2 || '~')
      ORDER BY id_movimiento`,
    [idProveedor, claveMulti]
  )
  comprobar(
    '19f. La aplicación multi-origen crea una clave única por movimiento',
    aplicadosMulti.length === 2 &&
      aplicadosMulti.every(
        (m) => typeof m.clave_idempotencia === 'string' && m.clave_idempotencia.length > 0
      ) &&
      new Set(aplicadosMulti.map((m) => m.clave_idempotencia)).size === 2 &&
      aplicadosMulti.some((m) => m.clave_idempotencia === claveMulti) &&
      aplicadosMulti.some((m) => m.clave_idempotencia === `${claveMulti}~1`),
    `claves=${aplicadosMulti.map((m) => m.clave_idempotencia).join(', ')}`
  )

  const { rows: nulos } = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM movimiento_saldo_proveedor
      WHERE id_proveedor = $1 AND clave_idempotencia IS NULL`,
    [idProveedor]
  )
  comprobar(
    '19g. Ningún movimiento de saldo quedó con clave NULL',
    nulos[0].total === 0,
    `con_clave_null=${nulos[0].total}`
  )

  console.log('\n--- PERMISOS Y REGRESIÓN ---')

  const proveedoresVendedor = await pedir('GET', '/admin/proveedores', {
    token: tokenVendedor,
  })
  comprobar(
    '22a. Vendedor sin Proveedores:Consultar -> 403',
    proveedoresVendedor.status === 403,
    `status=${proveedoresVendedor.status}`
  )

  const comprasVendedor = await pedir('POST', '/admin/compras', {
    token: tokenVendedor,
    body: {
      id_proveedor: idProveedor,
      items: [{ id_variante: variante1, cantidad: 1, costo_unitario: 100 }],
    },
  })
  comprobar(
    '22b. Vendedor sin Compras:Crear -> 403',
    comprasVendedor.status === 403,
    `status=${comprasVendedor.status}`
  )

  // Regresión de Ventas: vender y anular una unidad restaura el stock.
  const venta = await pedir('POST', '/ventas', {
    token,
    body: {
      items: [{ id_variante: variante1, cantidad: 1 }],
      metodo_pago: 'Efectivo',
      nombre_cliente: 'Cliente Prueba Compras',
    },
  })
  comprobar(
    '23a. Ventas sigue funcionando: crear venta -> 201',
    venta.status === 201,
    `status=${venta.status} error=${venta.data?.error}`
  )
  if (venta.data?.id) {
    ventas.add(venta.data.id)
    const anularVenta = await pedir('PATCH', `/ventas/${venta.data.id}/estado`, {
      token,
      body: { estado: 'Anulada' },
    })
    comprobar(
      '23b. Ventas sigue funcionando: anular venta -> 200 y stock restaurado',
      anularVenta.status === 200 && (await stockDe(variante1)) === 5,
      `status=${anularVenta.status} stock=${await stockDe(variante1)}`
    )
  }

  const pedidos = await pedir('GET', '/pedidos?pagina=1', { token })
  comprobar(
    '23c. Pedidos sigue funcionando: listar -> 200',
    pedidos.status === 200,
    `status=${pedidos.status}`
  )

  // Anulación de una compra sin recepción.
  const compraAnular = await pedir('POST', '/admin/compras', {
    token,
    body: {
      id_proveedor: idProveedor,
      items: [{ id_variante: variante3, cantidad: 1, costo_unitario: 50 }],
    },
  })
  const idCompraAnular = compraAnular.data?.id
  if (idCompraAnular) {
    compras.add(idCompraAnular)
    await pedir('POST', `/admin/compras/${idCompraAnular}/confirmar`, { token })
    const anularCompra = await pedir(
      'POST',
      `/admin/compras/${idCompraAnular}/anular`,
      { token }
    )
    comprobar(
      '9c. Anular compra Confirmada sin recepción -> 200 y estado Anulada',
      anularCompra.status === 200 && anularCompra.data?.estado === 'Anulada',
      `status=${anularCompra.status} estado=${anularCompra.data?.estado}`
    )
  }

  console.log('\n--- RESUMEN ---')
  console.log(fallos === 0 ? 'TODAS LAS PRUEBAS PASARON' : `${fallos} PRUEBA(S) FALLARON`)
  return fallos
}

main()
  .then(async (fallos) => {
    await limpiar()
    process.exit(fallos === 0 ? 0 : 1)
  })
  .catch(async (error) => {
    console.error('\nError fatal:', error?.message)
    console.error('Causa:', error?.cause)
    console.error('Código de causa:', error?.cause?.code)
    console.error('Error completo:', error)
    await limpiar()
    process.exit(1)
  })
