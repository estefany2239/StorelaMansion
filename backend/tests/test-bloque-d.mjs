// BLOQUE D — pruebas por API de métodos de pago, método de envío y "Ver detalle".
//
// Arranca su propia instancia del backend en un puerto efímero sin correo real
// (se borra BREVO_API_KEY y se fuerza NODE_ENV != production).
//
// Reglas que respeta:
// - Nunca imprime contraseñas, tokens, claves ni datos de personas: solo
//   OK/FALLO y códigos HTTP. El cliente de prueba se crea con datos sintéticos
//   y se borra al final.
// - No crea ventas ni toca routes/ventas.js.
// - La ÚNICA escritura SQL directa es la limpieza autorizada del BLOQUE D:
//   borra solo los pedidos/pagos/domicilios/detalles creados AQUÍ (ids
//   guardados al crearlos, verificados dentro de la transacción) y restaura el
//   stock de la variante usada al valor original. Si algo no cuadra, la
//   transacción se revierte entera.
// - La limpieza se ejecuta TAMBIÉN si una prueba falla (bloque finally).
//
// Uso:  node _test-bloque-d.mjs

import 'dotenv/config'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import pg from 'pg'

delete process.env.BREVO_API_KEY
process.env.NODE_ENV = 'test'

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en backend/.env')
  process.exit(1)
}

const { default: app } = await import('../src/app.js')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

let BASE = ''
let servidor = null
let fallos = 0
let tokenAdmin = null
let tokenCliente = null
let idCliente = null

// Limpieza: ids creados aquí con sus conteos esperados por pedido.
const creados = [] // { id, pagos, domicilios, detalles }
// Variante usada y su stock original (restaurado al final).
let variante = null

const SUF = crypto.randomBytes(3).toString('hex')
const CORREO = `bloq-d-${SUF}@bloqd.test`
const DOCUMENTO = `9${String(Date.now()).slice(-8)}`

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

const pedir = async (metodo, ruta, { token, body } = {}) => {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  let data = null
  try {
    data = await respuesta.json()
  } catch {
    data = null
  }
  return { status: respuesta.status, data }
}

const firmarToken = (usuario) =>
  jwt.sign({ id: usuario.id_usuario, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '2h' })

const conteos = async () => {
  const { rows } = await pool.query(`
    SELECT (SELECT COUNT(*) FROM pedido)::int     AS pedidos,
           (SELECT COUNT(*) FROM pago)::int       AS pagos,
           (SELECT COUNT(*) FROM domicilio)::int  AS domicilios
  `)
  return rows[0]
}

// Registro de un pedido creado aquí: guarda el id y los conteos de pago,
// domicilio y detalle que la propia creación generó (para la limpieza).
const registrarPedido = async (r) => {
  if (r.status !== 201 || !r.data?.id) return r
  const id = Number(r.data.id)
  const { rows } = await pool.query(
    `SELECT (SELECT COUNT(*) FROM pago WHERE id_pedido = $1)::int          AS pagos,
            (SELECT COUNT(*) FROM domicilio WHERE id_pedido = $1)::int     AS domicilios,
            (SELECT COUNT(*) FROM detalle_pedido WHERE id_pedido = $1)::int AS detalles`,
    [id]
  )
  creados.push({ id, ...rows[0] })
  return r
}

const esperado = (id) => creados.find((c) => c.id === id)

const stockActual = async () => {
  const { rows } = await pool.query(
    'SELECT stock FROM producto_variante WHERE id_variante = $1',
    [variante.idVariante]
  )
  return rows[0]?.stock
}

// ---------- limpieza SQL transaccional (autorizada) ----------
const limpiarSQL = async () => {
  const ids = creados.map((c) => c.id)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    if (ids.length > 0) {
      // Lo que hay AHORA para estos ids debe coincidir exactamente con lo que
      // la prueba creó y registró; si no, se revierte todo.
      const { rows } = await client.query(
        `SELECT (SELECT COUNT(*) FROM pago WHERE id_pedido = ANY($1::int[]))::int           AS pagos,
                (SELECT COUNT(*) FROM domicilio WHERE id_pedido = ANY($1::int[]))::int      AS domicilios,
                (SELECT COUNT(*) FROM detalle_pedido WHERE id_pedido = ANY($1::int[]))::int AS detalles,
                (SELECT COUNT(*) FROM pedido WHERE id_pedido = ANY($1::int[]))::int         AS pedidos`,
        [ids]
      )
      const actuales = rows[0]
      const total = creados.reduce(
        (acc, c) => ({
          pagos: acc.pagos + c.pagos,
          domicilios: acc.domicilios + c.domicilios,
          detalles: acc.detalles + c.detalles,
          pedidos: acc.pedidos + 1
        }),
        { pagos: 0, domicilios: 0, detalles: 0, pedidos: 0 }
      )

      if (
        actuales.pagos !== total.pagos ||
        actuales.domicilios !== total.domicilios ||
        actuales.detalles !== total.detalles ||
        actuales.pedidos !== total.pedidos
      ) {
        throw new Error(
          `conteos inesperados (pagos ${actuales.pagos}/${total.pagos}, domicilios ${actuales.domicilios}/${total.domicilios}, detalles ${actuales.detalles}/${total.detalles}, pedidos ${actuales.pedidos}/${total.pedidos})`
        )
      }

      const borrados = []
      for (const [tabla, esperadoFilas] of [
        ['pago', total.pagos],
        ['domicilio', total.domicilios],
        ['detalle_pedido', total.detalles],
        ['pedido', total.pedidos]
      ]) {
        const r = await client.query(
          `DELETE FROM ${tabla} WHERE id_pedido = ANY($1::int[])`,
          [ids]
        )
        if (r.rowCount !== esperadoFilas) {
          throw new Error(`${tabla}: borradas ${r.rowCount}, esperadas ${esperadoFilas}`)
        }
        borrados.push(`${tabla}=${r.rowCount}`)
      }
      console.log(`Limpieza SQL: ${borrados.join(', ')}`)
    }

    if (variante) {
      const r = await client.query(
        'UPDATE producto_variante SET stock = $1 WHERE id_variante = $2',
        [variante.stockOriginal, variante.idVariante]
      )
      if (r.rowCount !== 1) {
        throw new Error(`stock: restauradas ${r.rowCount} filas, esperadas 1`)
      }
      console.log('Limpieza SQL: stock de la variante de prueba restaurado')
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Limpieza SQL revertida:', error.message)
    fallos += 1
  } finally {
    client.release()
  }
}

// Borrado del cliente de prueba por API (inactivo y después eliminado).
const limpiarCliente = async () => {
  if (!tokenAdmin || !idCliente) return
  await pedir('PATCH', `/admin/usuarios/${idCliente}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Inactivo' }
  })
  await pedir('DELETE', `/admin/usuarios/${idCliente}`, { token: tokenAdmin })
}

const main = async () => {
  // ---------- servidor propio en puerto efímero ----------
  servidor = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => servidor.once('listening', resolve))
  BASE = `http://127.0.0.1:${servidor.address().port}/api`

  // ---------- identificación del administrador (solo SELECT) ----------
  const { rows } = await pool.query(
    `SELECT u.id_usuario, r.nombre AS rol
     FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
     WHERE r.nombre = 'Administrador' AND u.estado = TRUE
       AND u.cambio_contrasena_obligatorio = FALSE
     ORDER BY u.id_usuario
     LIMIT 1`
  )
  if (rows.length === 0) throw new Error('No hay un administrador activo para las pruebas')
  tokenAdmin = firmarToken({ id_usuario: rows[0].id_usuario, rol: rows[0].rol })

  // ---------- invariantes iniciales ----------
  const conteosAntes = await conteos()

  // ---------- variante con stock para 5 pedidos de prueba ----------
  const { rows: variantes } = await pool.query(
    `SELECT pv.id_variante, pv.stock, p.precio::float8 AS precio
     FROM producto_variante pv
     JOIN producto p ON p.id_producto = pv.id_producto
     WHERE p.estado = TRUE AND pv.stock >= 6
     ORDER BY pv.id_variante
     LIMIT 1`
  )
  if (variantes.length === 0) throw new Error('No hay una variante activa con stock >= 6')
  variante = {
    idVariante: variantes[0].id_variante,
    stockOriginal: variantes[0].stock,
    precio: Number(variantes[0].precio)
  }

  // ---------- cliente de prueba (ficha sin invitación: sin clave temporal) ----------
  const rCliente = await pedir('POST', '/clientes', {
    token: tokenAdmin,
    body: {
      nombre: 'Prueba Bloque D',
      correo: CORREO,
      telefono: '3009998877',
      direccion: 'Calle 8 # 7-6',
      tipo_documento: 'CC',
      documento: DOCUMENTO
    }
  })
  comprobar('0) Crear cliente de prueba -> 201', rCliente.status === 201, `status=${rCliente.status}`)
  idCliente = rCliente.data?.id
  if (!idCliente) throw new Error('No se pudo crear el cliente de prueba')

  // JWT directo (mismo payload que crearToken de auth.js). Sin
  // cambio_contrasena_obligatorio: la ficha creada sin invitación no lo tiene.
  tokenCliente = firmarToken({ id_usuario: idCliente, rol: 'Cliente' })

  const items = [{ id_variante: variante.idVariante, cantidad: 1 }]
  const direccion = 'Nombre: Prueba Bloque D | Teléfono: 3009998877 | Ciudad: Medellín | Dirección: Calle 9 # 8-7'
  const total = variante.precio

  // =====================================================
  // 1) Transferencia Nequi + Domicilio
  // =====================================================
  const r1 = await registrarPedido(
    await pedir('POST', '/pedidos', {
      token: tokenCliente,
      body: {
        items,
        metodo_pago: 'Transferencia',
        banco: 'Nequi',
        metodo_envio: 'Domicilio',
        direccion
      }
    })
  )
  const p1 = r1.data
  comprobar('1) Transferencia Nequi -> 201', r1.status === 201, `status=${r1.status}`)
  comprobar('1) metodo_pago = "Transferencia - Nequi"', p1?.metodo_pago === 'Transferencia - Nequi', p1?.metodo_pago)
  comprobar('1) pago completo registrado (monto_pagado = total)', Number(p1?.monto_pagado) === total, `${p1?.monto_pagado}`)
  comprobar('1) saldo en 0', Number(p1?.saldo) === 0, `${p1?.saldo}`)
  comprobar('1) metodo_envio = Domicilio', p1?.metodo_envio === 'Domicilio', p1?.metodo_envio)
  comprobar('1) un pago con banco Nequi', p1?.pagos?.length === 1 && p1.pagos[0].banco === 'Nequi')
  comprobar('1) items reales adjuntados', Array.isArray(p1?.items) && p1.items.length === 1)
  comprobar('1) dirección guardada', String(p1?.direccion || '').includes('Calle 9 # 8-7'))

  // =====================================================
  // 2) Efectivo rechazado
  // =====================================================
  const r2 = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: { items, metodo_pago: 'Efectivo', metodo_envio: 'Domicilio', direccion }
  })
  comprobar('2) Efectivo -> 400', r2.status === 400, `status=${r2.status}`)

  // =====================================================
  // 3) Crédito (saldo pendiente, sin registro final al entregar)
  // =====================================================
  const r3 = await registrarPedido(
    await pedir('POST', '/pedidos', {
      token: tokenCliente,
      body: { items, metodo_pago: 'Crédito', metodo_envio: 'Domicilio', direccion }
    })
  )
  const p3 = r3.data
  comprobar('3) Crédito -> 201', r3.status === 201, `status=${r3.status}`)
  comprobar('3) monto_pagado = 0', Number(p3?.monto_pagado) === 0, `${p3?.monto_pagado}`)
  comprobar('3) saldo = total', Number(p3?.saldo) === total, `${p3?.saldo}`)

  const r3e = await pedir('PATCH', `/pedidos/${p3?.id}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Entregado' }
  })
  const p3e = r3e.data
  comprobar('3) Entregado (Crédito) -> 200', r3e.status === 200, `status=${r3e.status}`)
  comprobar(
    '3) Crédito NO registra saldo al entregar (sigue 1 pago)',
    Array.isArray(p3e?.pagos) && p3e.pagos.length === 1,
    `pagos=${p3e?.pagos?.length}`
  )
  comprobar('3) monto_pagado sigue 0', Number(p3e?.monto_pagado) === 0, `${p3e?.monto_pagado}`)

  // =====================================================
  // 4) Contra entrega: abono 50 % y saldo al entregar
  // =====================================================
  const abono50 = Math.round(total * 0.5)
  const r4 = await registrarPedido(
    await pedir('POST', '/pedidos', {
      token: tokenCliente,
      body: {
        items,
        metodo_pago: 'Contra entrega',
        banco: 'Bancolombia',
        metodo_envio: 'Domicilio',
        direccion
      }
    })
  )
  const p4 = r4.data
  comprobar('4) Contra entrega -> 201', r4.status === 201, `status=${r4.status}`)
  comprobar(
    '4) método del abono "Contra entrega - Abono 50% - Bancolombia"',
    p4?.pagos?.[0]?.metodo === 'Contra entrega - Abono 50% - Bancolombia',
    p4?.pagos?.[0]?.metodo
  )
  comprobar('4) primer pago = 50 % redondeado', Number(p4?.pagos?.[0]?.monto) === abono50, `${p4?.pagos?.[0]?.monto}`)
  comprobar('4) saldo = total - abono', Number(p4?.saldo) === total - abono50, `${p4?.saldo}`)

  const r4e = await pedir('PATCH', `/pedidos/${p4?.id}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Entregado' }
  })
  const p4e = r4e.data
  const e4 = esperado(Number(p4?.id))
  if (e4) e4.pagos = 2 // el backend registra el saldo en la misma transacción
  comprobar('4) Entregado (Contra entrega) -> 200', r4e.status === 200, `status=${r4e.status}`)
  comprobar('4) ahora hay 2 pagos', p4e?.pagos?.length === 2, `pagos=${p4e?.pagos?.length}`)
  comprobar(
    '4) segundo pago "Contra entrega - Saldo" sin banco',
    p4e?.pagos?.[1]?.metodo === 'Contra entrega - Saldo' && !p4e.pagos[1].banco,
    p4e?.pagos?.[1]?.metodo
  )
  comprobar('4) saldo cobrado completo', Number(p4e?.monto_pagado) === total, `${p4e?.monto_pagado}`)
  comprobar('4) saldo en 0 tras entregar', Number(p4e?.saldo) === 0, `${p4e?.saldo}`)

  // =====================================================
  // 5) Recoger en tienda sin dirección
  // =====================================================
  const r5 = await registrarPedido(
    await pedir('POST', '/pedidos', {
      token: tokenCliente,
      body: {
        items,
        metodo_pago: 'Transferencia',
        banco: 'Nequi',
        metodo_envio: 'Recoger en tienda',
        nombre_entrega: 'Prueba Bloque D',
        telefono_entrega: '3009998877'
      }
    })
  )
  const p5 = r5.data
  const dest5 = String(p5?.direccion || '')
  comprobar('5) Recoger en tienda sin dirección -> 201', r5.status === 201, `status=${r5.status}`)
  comprobar('5) metodo_envio = Recoger en tienda', p5?.metodo_envio === 'Recoger en tienda', p5?.metodo_envio)
  comprobar(
    '5) destino empieza con "Recoger en tienda"',
    dest5.startsWith('Recoger en tienda'),
    dest5.slice(0, 40)
  )
  comprobar('5) destino incluye nombre y teléfono', dest5.includes('Nombre: Prueba Bloque D') && dest5.includes('Teléfono: 3009998877'))
  comprobar('5) destino respeta 255 caracteres', dest5.length <= 255, `${dest5.length}`)
  const { rows: dom5 } = await pool.query(
    'SELECT metodo_envio FROM domicilio WHERE id_pedido = $1',
    [Number(p5?.id)]
  )
  comprobar('5) INSERT del domicilio escribió metodo_envio', dom5[0]?.metodo_envio === 'Recoger en tienda', dom5[0]?.metodo_envio)

  // =====================================================
  // 6) Domicilio sin dirección -> 400
  // =====================================================
  const r6 = await pedir('POST', '/pedidos', {
    token: tokenCliente,
    body: { items, metodo_pago: 'Transferencia', banco: 'Nequi', metodo_envio: 'Domicilio', direccion: '' }
  })
  comprobar('6) Domicilio sin dirección -> 400', r6.status === 400, `status=${r6.status}`)

  // =====================================================
  // 7) Contra entrega cancelado: sin saldo y stock devuelto
  // =====================================================
  const stockAntes7 = await stockActual()
  const r7 = await registrarPedido(
    await pedir('POST', '/pedidos', {
      token: tokenCliente,
      body: {
        items,
        metodo_pago: 'Contra entrega',
        banco: 'Nequi',
        metodo_envio: 'Domicilio',
        direccion
      }
    })
  )
  const p7 = r7.data
  comprobar('7) Contra entrega (cancelar) -> 201', r7.status === 201, `status=${r7.status}`)
  const stockTrasCrear7 = await stockActual()
  comprobar('7) stock descontado al crear', stockTrasCrear7 === stockAntes7 - 1, `${stockAntes7} -> ${stockTrasCrear7}`)

  const r7c = await pedir('PATCH', `/pedidos/${p7?.id}/estado`, {
    token: tokenAdmin,
    body: { estado: 'Cancelado' }
  })
  const p7c = r7c.data
  comprobar('7) Cancelado -> 200', r7c.status === 200, `status=${r7c.status}`)
  comprobar('7) sin pago de saldo al cancelar (sigue 1 pago)', p7c?.pagos?.length === 1, `pagos=${p7c?.pagos?.length}`)
  const stockTrasCancelar7 = await stockActual()
  comprobar('7) stock devuelto al cancelar', stockTrasCancelar7 === stockAntes7, `${stockTrasCancelar7}`)

  // =====================================================
  // 8) Detalle (panel) y datos del cliente
  // =====================================================
  const r8 = await pedir('GET', '/pedidos', { token: tokenAdmin })
  const idsPropios = creados.map((c) => c.id)
  const fila1 = (Array.isArray(r8.data) ? r8.data : []).find((p) => Number(p.id) === Number(p1?.id))
  comprobar('8) GET /pedidos (admin) -> 200', r8.status === 200, `status=${r8.status}`)
  comprobar('8) lista con items y pagos adjuntados', Array.isArray(fila1?.items) && Array.isArray(fila1?.pagos))
  comprobar('8) banco propio presente', fila1?.pagos?.[0]?.banco === 'Nequi')
  comprobar('8) metodo_envio en la lista', fila1?.metodo_envio === 'Domicilio')
  comprobar(
    '8) tipo_documento/documento/teléfono presentes para Consultar',
    'documento' in (fila1 || {}) && 'tipo_documento' in (fila1 || {}) && 'telefono' in (fila1 || {}),
    fila1 ? `documento=${Boolean(fila1.documento)}` : 'sin fila'
  )
  comprobar('8) todos los pedidos de prueba están en la lista', idsPropios.every((id) => (Array.isArray(r8.data) ? r8.data : []).some((p) => Number(p.id) === id)))

  const r8c = await pedir('GET', `/pedidos/${p1?.id}`, { token: tokenCliente })
  comprobar(
    '8) GET /pedidos/:id (cliente) sin documento/teléfono',
    r8c.status === 200 && !('documento' in (r8c.data || {})) && !('telefono' in (r8c.data || {})) && !('tipo_documento' in (r8c.data || {}))
  )

  const r8m = await pedir('GET', '/pedidos/mis', { token: tokenCliente })
  const mios = Array.isArray(r8m.data) ? r8m.data : []
  comprobar('8) GET /pedidos/mis -> 200', r8m.status === 200, `status=${r8m.status}`)
  comprobar('8) /mis solo devuelve pedidos propios', mios.length > 0 && mios.every((p) => Number(p.id_usuario) === Number(idCliente)))
  comprobar(
    '8) /mis sin documento/teléfono',
    mios.every((p) => !('documento' in p) && !('telefono' in p) && !('tipo_documento' in p))
  )
  comprobar('8) /mis con metodo_envio y saldo', mios.every((p) => 'metodo_envio' in p && 'saldo' in p && 'monto_pagado' in p))

  return { conteosAntes }
}

let conteosAntes = null

main()
  .then((resultado) => {
    conteosAntes = resultado?.conteosAntes || null
  })
  .catch((error) => {
    console.error('Error inesperado:', error.message)
    fallos += 1
  })
  .finally(async () => {
    try {
      // 1) Limpieza SQL de TODO lo creado aquí (también si algo falló).
      await limpiarSQL()

      // 2) Borrado del cliente de prueba por API.
      await limpiarCliente()

      // 3) Invariantes finales: mismos conteos y mismo stock que al inicio.
      const despues = await conteos()
      if (conteosAntes) {
        comprobar(
          'INVARIANTE) conteos de pedido/pago/domicilio como al inicio',
          despues.pedidos === conteosAntes.pedidos &&
            despues.pagos === conteosAntes.pagos &&
            despues.domicilios === conteosAntes.domicilios,
          `antes=${conteosAntes.pedidos}/${conteosAntes.pagos}/${conteosAntes.domicilios} despues=${despues.pedidos}/${despues.pagos}/${despues.domicilios}`
        )
      }
      if (variante) {
        const stockFinal = await stockActual()
        comprobar(
          'INVARIANTE) stock de la variante de prueba como al inicio',
          stockFinal === variante.stockOriginal,
          `antes=${variante.stockOriginal} despues=${stockFinal}`
        )
      }
      if (idCliente) {
        const { rows } = await pool.query('SELECT 1 FROM usuario WHERE id_usuario = $1', [idCliente])
        comprobar('INVARIANTE) cliente de prueba eliminado', rows.length === 0)
      }
    } catch (error) {
      console.error('Error en la verificación final:', error.message)
      fallos += 1
    } finally {
      if (servidor) servidor.close()
      await pool.end()
      console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
      process.exit(fallos === 0 ? 0 : 1)
    }
  })
