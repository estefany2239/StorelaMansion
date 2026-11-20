# API de Proveedores y Compras

Documentación operativa de los endpoints implementados en:

- `backend/src/routes/proveedoresAdmin.js`
- `backend/src/routes/comprasAdmin.js`
- `backend/src/services/compras.js`

No se crearon tablas ni columnas: el módulo usa exclusivamente las seis tablas
que ya existen en PostgreSQL (`proveedor`, `compra`, `detalle_compra`,
`recepcion_compra`, `detalle_recepcion`, `movimiento_saldo_proveedor`).

---

## 1. Base y autenticación

- Base local: `http://localhost:3000/api`
- Todas las rutas son privadas. Envían:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

El token se obtiene con `POST /api/auth/login`. El middleware existente lee el
rol y los permisos desde la base en cada petición, por lo que un cambio de
permisos surte efecto sin volver a iniciar sesión.

---

## 2. Permisos utilizados

### Proveedores

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/admin/proveedores` | `Proveedores:Consultar` |
| GET | `/admin/proveedores/:id` | `Proveedores:Consultar` |
| POST | `/admin/proveedores` | `Proveedores:Crear` |
| PUT | `/admin/proveedores/:id` | `Proveedores:Actualizar` |
| PATCH | `/admin/proveedores/:id/estado` | `Proveedores:Cambiar estado` |

### Compras

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/admin/compras/variantes` | `Compras:Crear` |
| GET | `/admin/compras` | `Compras:Consultar` |
| GET | `/admin/compras/:id` | `Compras:Consultar` |
| POST | `/admin/compras` | `Compras:Crear` |
| PUT | `/admin/compras/:id` | `Compras:Actualizar` |
| POST | `/admin/compras/:id/confirmar` | `Compras:Confirmar` |
| POST | `/admin/compras/:id/recepciones` | `Compras:Registrar recepcion` |
| POST | `/admin/compras/:id/cerrar` | `Compras:Cerrar` |
| POST | `/admin/compras/:id/anular` | `Compras:Anular` |
| POST | `/admin/compras/:id/pago` | `Compras:Registrar pago` |
| POST | `/admin/compras/:id/aplicar-saldo` | `Compras:Aplicar saldo` |

`GET /admin/compras/variantes` usa `Compras:Crear` siguiendo el mismo patrón
que `GET /api/ventas/variantes`, que usa `Ventas:Crear`.

Un usuario sin el permiso recibe `403`.

---

## 3. Proveedores

### 3.1 Listar

```http
GET /api/admin/proveedores?pagina=1&limite=20&q=texto&estado=activo
```

Parámetros opcionales:

- `q`: busca en nombre, documento, contacto y correo.
- `estado`: `activo`, `inactivo`, `true` o `false`.
- `pagina`: entero desde 1.
- `limite`: entero entre 1 y 100 (por defecto 20).

Respuesta:

```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Proveedor Ejemplo",
      "tipo_documento": "NIT",
      "documento": "900123456-7",
      "contacto": "Ana Pérez",
      "telefono": "+57 300 123 4567",
      "correo": "ana@proveedor.com",
      "direccion": "Calle 1 # 2-3",
      "ciudad": "Medellín",
      "estado": true,
      "estado_label": "Activo",
      "creado_por": 1,
      "creado_por_nombre": "Administrador",
      "compras_total": 3,
      "compras_costo": 1500000,
      "compras_pagado": 800000,
      "saldo_disponible": 200000
    }
  ],
  "paginacion": {
    "pagina": 1,
    "limite": 20,
    "total": 1,
    "paginas": 1
  }
}
```

### 3.2 Consultar uno

```http
GET /api/admin/proveedores/1
```

Incluye `resumen_compras`, `saldo_disponible` y las últimas cinco compras.

### 3.3 Crear

```http
POST /api/admin/proveedores
```

```json
{
  "nombre": "Proveedor Ejemplo",
  "tipo_documento": "NIT",
  "documento": "900123456-7",
  "contacto": "Ana Pérez",
  "telefono": "+57 300 123 4567",
  "correo": "ana@proveedor.com",
  "direccion": "Calle 1 # 2-3",
  "ciudad": "Medellín",
  "estado": true
}
```

Obligatorios: `nombre` y `documento`. `tipo_documento` toma `NIT` si se omite.
El nombre y los espacios internos se normalizan; el documento se guarda en
mayúsculas. Se valida el formato básico de correo, teléfono y documento.

Respuestas: `201`, `400` por validación y `409` si el documento ya existe.

### 3.4 Actualizar

```http
PUT /api/admin/proveedores/1
```

Acepta actualización parcial: los campos omitidos conservan su valor. No se
puede cambiar `id_proveedor`. El estado no se cambia por esta ruta; se usa
`PATCH /estado`.

### 3.5 Activar o inactivar

```http
PATCH /api/admin/proveedores/1/estado
```

```json
{ "estado": false }
```

También acepta `"Activo"` / `"Inactivo"` o `true` / `false`. No existe borrado
físico de proveedores.

---

## 4. Compras

### 4.1 Estados

```
Borrador
  └── confirmar ──> Confirmada
                        └── recepción parcial ──> Parcialmente recibida
                                                      ├── completar ──> Recibida
                                                      └── cerrar con faltantes
                                                              ──> Cerrada con faltantes

Borrador o Confirmada sin recepción ── anular ──> Anulada
```

- Crear y editar una compra **no** modifican el inventario.
- Confirmar **no** modifica el inventario.
- La recepción es el **único** proceso de Compras que incrementa
  `producto_variante.stock`.
- Cerrar con faltantes no incrementa el inventario.
- Anular no borra historial ni altera el inventario.

### 4.2 Buscar variantes

```http
GET /api/admin/compras/variantes?q=camiseta&limite=50
```

Devuelve un arreglo de variantes de productos activos:

```json
[
  {
    "id_variante": 10,
    "id_producto": 3,
    "codigo": "CAM-001",
    "producto": "Camiseta básica",
    "precio": 50000,
    "id_talla": 2,
    "talla": "M",
    "id_color": 1,
    "color": "Negro",
    "stock": 8
  }
]
```

### 4.3 Listar compras

```http
GET /api/admin/compras?pagina=1&limite=20&id_proveedor=1&estado=Confirmada&desde=2026-11-01&hasta=2026-11-30&q=texto
```

- `id_proveedor`: filtra por proveedor.
- `estado`: uno o varios separados por coma. Valores válidos: `Borrador`,
  `Confirmada`, `Parcialmente recibida`, `Recibida`,
  `Cerrada con faltantes`, `Anulada`.
- `desde` y `hasta`: formato `YYYY-MM-DD`.
- `q`: busca en código, proveedor, documento y observaciones.
- `pagina` / `limite`: paginación.

Cada fila incluye totales de unidades, `valor_cubierto`, `saldo_pendiente` y
`estado_pago` calculado.

### 4.4 Detalle

```http
GET /api/admin/compras/1
```

Incluye:

- proveedor;
- líneas con solicitado, recibido, cancelado y pendiente;
- recepciones con sus líneas;
- movimientos de saldo;
- `resumen` con costo original, costo final, valor pagado, saldo aplicado,
  valor cubierto, saldo pendiente, estado de pago y saldo disponible del
  proveedor.

### 4.5 Crear compra (Borrador)

```http
POST /api/admin/compras
```

```json
{
  "id_proveedor": 1,
  "fecha": "2026-11-09",
  "observaciones": "Compra inicial",
  "items": [
    {
      "id_variante": 10,
      "cantidad_solicitada": 10,
      "costo_unitario": 25000
    }
  ]
}
```

Alias aceptados: `items`, `detalles` o `lineas`; `cantidad` por
`cantidad_solicitada`; `costo` por `costo_unitario`.

Validaciones:

- proveedor existente y activo;
- al menos una línea;
- variantes existentes y de producto activo;
- cantidades enteras mayores que cero;
- costos unitarios iguales o mayores que cero;
- sin variantes repetidas.

El backend calcula `costo_original = suma(cantidad_solicitada * costo_unitario)`
y lo deja también como `costo_final` inicial. No toca stock.

### 4.6 Editar compra

```http
PUT /api/admin/compras/1
```

Mismo cuerpo que la creación. Solo se permite en estado `Borrador` y si no hay
recepciones. Recalcula `costo_original` y `costo_final`. No toca stock.

### 4.7 Confirmar

```http
POST /api/admin/compras/1/confirmar
```

Sin cuerpo. Solo desde `Borrador`. Cambia a `Confirmada`. No incrementa stock.

### 4.8 Registrar recepción

```http
POST /api/admin/compras/1/recepciones
```

```json
{
  "clave_idempotencia": "recepcion-2026-11-09-001",
  "fecha_recepcion": "2026-11-09",
  "observaciones": "Llegaron 2 de 5",
  "items": [
    {
      "id_detalle": 15,
      "cantidad_recibida": 2
    }
  ]
}
```

Alias: `items`, `detalles` o `lineas`; `cantidad` por `cantidad_recibida`.

`clave_idempotencia` es **obligatoria**. Se acepta en el body
(`clave_idempotencia`) o en el encabezado `Idempotency-Key`. Si no se
proporciona, la API responde `400` con un mensaje claro. La columna real
`recepcion_compra.clave_idempotencia` es `NOT NULL` + `UNIQUE`. Un reintento
con la misma clave no vuelve a mover stock.

Reglas:

- la compra debe estar `Confirmada` o `Parcialmente recibida`;
- la cantidad debe ser entera y mayor que cero;
- no puede superar lo solicitado menos lo ya recibido y lo cancelado;
- todas las líneas deben pertenecer a la compra;
- la clave de idempotencia evita duplicar la recepción y el stock.

La operación se ejecuta en una transacción:

1. bloquea la compra (`FOR UPDATE`);
2. bloquea las variantes afectadas;
3. valida pendientes;
4. inserta `recepcion_compra`;
5. inserta `detalle_recepcion`;
6. incrementa `producto_variante.stock` solo por lo recibido;
7. recalcula `costo_final`;
8. actualiza el estado a `Parcialmente recibida` o `Recibida`;
9. si quedó terminal, genera el excedente una sola vez;
10. confirma la transacción.

Si se repite la misma clave, responde `201` con
`"recepcion_idempotente": true` y no vuelve a incrementar el stock.

### 4.9 Cerrar con faltantes

```http
POST /api/admin/compras/1/cerrar
```

```json
{
  "motivo": "El proveedor no entregará el resto",
  "lineas": [
    {
      "id_detalle": 15,
      "cantidad_cancelada": 3,
      "motivo": "Faltante informado por el proveedor"
    }
  ]
}
```

Si se omite el cuerpo, se cancelan todas las unidades pendientes con el motivo
por defecto `Cierre con faltantes`. Si se envían líneas, deben cubrir
exactamente lo pendiente de cada detalle.

Reglas:

- debe existir al menos una recepción;
- no puede quedar ninguna unidad pendiente sin resolver;
- lo cancelado no puede superar lo pendiente;
- se conserva el motivo en `detalle_compra.motivo_cancelacion`;
- el costo original no cambia;
- el costo final se recalcula solo con lo recibido;
- el estado pasa a `Cerrada con faltantes`;
- se registra `cerrado_en`;
- no se incrementa stock.

Si todas las unidades ya fueron recibidas, el estado queda en `Recibida`, no en
`Cerrada con faltantes`.

### 4.10 Anular

```http
POST /api/admin/compras/1/anular
```

Sin cuerpo. Solo desde `Borrador` o `Confirmada`, y solo si no hay unidades
recibidas ni pagos ni saldo aplicado. Cambia a `Anulada`. No borra historial ni
toca inventario.

> La protección adicional de pagos/saldo aplicado evita que el dinero quede sin
> destino al anular. Si se necesita anular una compra pagada, primero debe
> resolverse el pago por fuera de esta operación.

### 4.11 Registrar pago

```http
POST /api/admin/compras/1/pago
```

```json
{ "monto": 500000 }
```

Acumula el valor en `compra.valor_pagado`. No existe tabla de pagos
individuales. No modifica `costo_original` ni `costo_final`.

Respuesta:

```json
{
  "id_compra": 1,
  "monto_registrado": 500000,
  "costo_original": 1000000,
  "costo_final": 800000,
  "valor_pagado": 500000,
  "saldo_aplicado": 0,
  "valor_cubierto": 500000,
  "saldo_pendiente": 300000,
  "estado_pago": "Parcialmente pagada",
  "saldo_disponible_proveedor": 0,
  "excedente_generado": 0
}
```

Estados de pago calculados:

- `Pendiente`: valor cubierto = 0.
- `Parcialmente pagada`: 0 < valor cubierto < costo final.
- `Pagada`: valor cubierto >= costo final.

`valor cubierto = valor_pagado + saldo a favor aplicado`.

### 4.12 Aplicar saldo a favor

```http
POST /api/admin/compras/1/aplicar-saldo
```

```json
{
  "monto": 200000,
  "id_movimiento_origen": 12,
  "clave_idempotencia": "saldo-2026-11-09-001"
}
```

- `id_movimiento_origen` es opcional. Si se omite, se consumen los movimientos
  `GENERADO` del proveedor en orden FIFO.
- Solo se puede aplicar saldo del mismo proveedor de la compra destino.
- No se puede aplicar más saldo del disponible.
- No se puede aplicar un movimiento a la misma compra que lo generó.
- Cada consumo se registra como `APLICADO` con `id_movimiento_origen` e
  `id_compra_destino`.
- La clave de idempotencia evita aplicar dos veces la misma operación.

El saldo disponible se calcula siempre desde el historial:

```
saldo = suma(GENERADO) - suma(APLICADO)
```

---

## 5. Generación automática del excedente

Cuando una compra llega a `Recibida` o `Cerrada con faltantes`, y también
cuando entra un pago posterior a una compra terminal, el backend calcula:

```
excedente = max(0, valor_pagado + saldo_aplicado - costo_final)
```

Si el excedente supera lo ya generado para esa compra, inserta un movimiento
`GENERADO` por la diferencia. Así nunca se duplica el mismo saldo y los pagos
posteriores solo generan la diferencia nueva.

---

## 6. Códigos de error

| Código | Uso |
|---|---|
| `400` | Datos inválidos, campos obligatorios, formatos, cantidades no enteras, estados inválidos. |
| `401` | Token ausente, inválido o expirado. |
| `403` | Usuario sin el permiso requerido. |
| `404` | Proveedor o compra no encontrados. |
| `409` | Conflicto de negocio: estado no permitido, stock/pendiente insuficiente, documento duplicado, saldo insuficiente, recepción duplicada. |
| `500` | Error interno o de base de datos. |

Las respuestas de error tienen la forma:

```json
{ "error": "Descripción legible" }
```

---

## 7. Pruebas

El script de integración está en:

```
backend/tests/test-proveedores-compras.mjs
```

Requiere el backend corriendo, las dependencias instaladas (`npm install` en
`backend/`) y `backend/.env` con `DATABASE_URL` y `JWT_SECRET` (el mismo
`JWT_SECRET` con el que corre el backend). Antes de escribir, verifica la
conexión y el esquema de las seis tablas. Las escrituras se bloquean salvo que
se confirme explícitamente la rama de desarrollo:

```powershell
cd backend
$env:CONFIRMAR_BD_DESARROLLO="desarrollo"
node tests/test-proveedores-compras.mjs
```

Si el backend no escucha en `http://127.0.0.1:3000`, define `API_URL`
(por ejemplo, `http://127.0.0.1:4000/api`) o `PORT` antes de ejecutar.

El script imprime la base, el usuario y el host conectados, comprueba que las
tablas y columnas requeridas existan, ejecuta los casos funcionales y limpia
los datos temporales.

Casos cubiertos: creación/validación/edición/inactivación de proveedores;
creación de compra sin tocar stock; confirmación; recepción parcial y total;
incremento exacto de inventario; recepción superior a lo pendiente; repetición
idempotente; cierre con faltantes; costo original vs. costo final; pago parcial
y pago que cubre el total; generación y aplicación de saldo a favor; saldo de
otro proveedor; consumo excesivo; permisos `403`; y regresión de Ventas y
Pedidos.

---

## 8. Notas de compatibilidad

- No se modificaron `ventas.js`, `pedidos.js` ni `estadosPedido.js`.
- No se agregaron rutas a la lista blanca pública.
- No se ejecutaron migraciones ni DDL.
- `proveedor.estado` se trata como booleano, igual que el resto del esquema del
  proyecto.
- `compra.estado` usa exactamente los nombres solicitados: `Borrador`,
  `Confirmada`, `Parcialmente recibida`, `Recibida`,
  `Cerrada con faltantes`, `Anulada`.
- En una compra `Borrador`, `costo_final` se inicializa igual a
  `costo_original`. Al recibir o cerrar se recalcula con lo efectivamente
  recibido.
