# Auditoría técnica y funcional — Store La Mansión

**Fecha de la auditoría:** 2026-11-09
**Alcance:** repositorio completo (`backend/`, `frontend/`, `scripts/`, `docs/`), sin modificar código existente, sin instalar dependencias, sin ejecutar migraciones y sin alterar la base de datos.
**Método:** lectura estática de archivos, rutas, consultas SQL, migraciones y componentes. No se levantó la aplicación ni se hicieron llamadas contra la base de datos real.

---

## Convenciones de este documento

- **[Verificado]**: se comprobó directamente en el archivo indicado.
- **[Inferido]**: se deduce de consultas SQL, nombres de columnas o flujos, pero no existe un `CREATE TABLE` en el repositorio que lo confirme.
- **[No encontrado]**: se buscó y no existe evidencia en el repositorio.
- Las rutas de archivo son relativas a la raíz del repositorio.

> **Limitación principal:** el repositorio **no contiene el DDL base** de la mayoría de tablas. Solo contiene migraciones incrementales e idempotentes. Por eso, el modelo de datos de la sección 6 es una reconstrucción a partir de las consultas, no un esquema oficial. Antes de implementar Proveedores y Compras se debe obtener un volcado real del esquema (`pg_dump --schema-only`) o revisar la base en Neon.

---

## 1. Descripción general

Store La Mansión es un monorepositorio de comercio electrónico con dos aplicaciones:

1. **Tienda pública y cuenta de cliente** (`frontend/`): catálogo, categorías, detalle de producto, carrito, checkout, pago, comprobantes, favoritos, pedidos y configuración del cliente.
2. **Panel administrativo** (`frontend/src/features/admin/`): dashboard, roles, usuarios, productos, categorías, tallas, colores, ventas, clientes, pedidos, domicilios, abonos y perfil.

El **backend** (`backend/`) expone una API REST en Express sobre PostgreSQL (Neon). La autenticación es JWT y la autorización es por permisos de base de datos con formato `Módulo:Privilegio` (por ejemplo, `Productos:Consultar`). La API aplica **denegación por defecto**: todo lo que no esté en la lista blanca de rutas públicas exige token válido.

### Estado general

| Área | Estado | Evidencia |
|---|---|---|
| Tienda pública | Implementada | `frontend/src/App.jsx`, `backend/src/routes/productos.js`, `backend/src/routes/categorias.js` |
| Carrito y checkout | Implementado | `frontend/src/shared/components/cart/`, `frontend/src/features/checkout/pages/PaymentView.jsx` |
| Autenticación y recuperación | Implementada | `backend/src/routes/auth.js`, `frontend/src/features/auth/pages/` |
| Panel administrativo | Implementado en los módulos listados | `frontend/src/features/admin/AdminLayout.jsx` |
| Ventas de mostrador | Implementada | `backend/src/routes/ventas.js`, `frontend/src/features/admin/ventas/Ventas.jsx` |
| Pedidos, pagos y comprobantes | Implementado | `backend/src/routes/pedidos.js`, `backend/src/services/comprobantes.js` |
| Domicilios y envíos | Implementado | `backend/src/routes/domicilios.js`, `backend/src/utils/envios.js` |
| Abonos | Implementado | `backend/src/routes/abonos.js`, `backend/src/services/abonos.js` |
| Inventario | Implementado como stock por variante | `producto_variante.stock`, `backend/src/routes/productosAdmin.js` |
| **Proveedores** | **No implementado** | No existe ruta, tabla, componente ni permiso |
| **Compras** | **No implementado** | No existe ruta, tabla, componente ni permiso |
| Movimientos de inventario | **No implementado como historial** | Solo se actualiza `producto_variante.stock`; no hay tabla de movimientos |
| Auditoría de cambios | **No implementado** | No se encontró tabla de auditoría ni triggers |

---

## 2. Tecnologías

### Backend

| Tecnología | Versión declarada | Uso | Evidencia |
|---|---:|---|---|
| Node.js | No fijada en el repositorio | Runtime | `backend/package.json` |
| Express | `^4.21.2` | API HTTP | `backend/package.json` |
| PostgreSQL (`pg`) | `^8.23.1` | Base de datos y SQL crudo | `backend/src/config/db.js` |
| `jsonwebtoken` | `^9.0.3` | JWT HS256, expiración 8 h | `backend/src/routes/auth.js`, `backend/src/middlewares/auth.js` |
| `bcryptjs` | `^3.0.3` | Hash de contraseñas (10 rondas) | `backend/src/routes/auth.js` |
| `helmet` | `^8.3.0` | Cabeceras de seguridad | `backend/src/app.js` |
| `cors` | `^2.8.5` | Orígenes permitidos por lista | `backend/src/app.js` |
| `express-rate-limit` | `^8.7.1` | Límites por IP | `backend/src/middlewares/limitadores.js` |
| `multer` | `^2.5.0` | Subida de comprobantes en memoria | `backend/src/routes/pedidos.js` |
| `dotenv` | `^16.6.1` | Variables de entorno | `backend/src/server.js` |

- **No hay ORM.** Todas las consultas son SQL parametrizado escrito a mano en las rutas o en servicios puntuales.
- **No hay TypeScript.** El backend es JavaScript ESM (`"type": "module"`).
- **No hay framework de pruebas.** Existen scripts sueltos en `backend/tests/` (por ejemplo `test-permisos.mjs`, `test-stock.mjs`, `test-pedidos.mjs`) que se ejecutan manualmente con Node.
- **No hay linter ni script de test en `backend/package.json`.** Solo existen `dev` y `start`.

### Frontend

| Tecnología | Versión declarada | Uso | Evidencia |
|---|---:|---|---|
| React | `^19.2.8` | Interfaz | `frontend/package.json` |
| React DOM | `^19.2.8` | Render | `frontend/src/main.jsx` |
| Vite | `^8.2.2` | Build y dev server | `frontend/vite.config.js` |
| `vite-plugin-pwa` | `^2.0.0` | PWA, manifest y precaché | `frontend/vite.config.js` |
| `lucide-react` | `^1.41.0` | Iconografía | `frontend/src/features/admin/AdminLayout.jsx` |
| `jspdf` | `^4.2.1` | Comprobante de venta en PDF | `frontend/src/features/admin/ventas/comprobanteVentaPdf.js` |
| `react-router-dom` | `^7.18.3` | **Declarado pero no utilizado** | `frontend/package.json`; no hay `BrowserRouter`, `Routes` ni `useNavigate` en `frontend/src` |

- **No hay Tailwind, Material UI ni otra librería de componentes.** Los estilos son CSS propio por módulo.
- **No hay TypeScript.**
- **No hay React Router en uso.** La navegación se hace con estado manual (`currentView` en `App.jsx`, `adminView` en `AdminLayout.jsx`).
- **No hay `React.lazy` ni división de código.** Todo se importa de forma estática.

### Servicios externos e infraestructura

| Servicio | Uso | Evidencia |
|---|---|---|
| Neon / PostgreSQL | Base de datos principal | `backend/.env.example` (`DATABASE_URL`) |
| Brevo | Correos de invitación, bienvenida, recuperación y decisión de pago | `backend/src/services/correos.js`, `backend/src/services/invitaciones.js`, `backend/src/services/recuperacion.js` |
| Cloudflare Turnstile | Protección de registro y recuperación | `backend/src/middlewares/verificarCaptcha.js`, `frontend/src/shared/components/TurnstileWidget.jsx` |
| Render | Despliegue del backend (mencionado en comentarios y README) | `backend/src/app.js`, `README.md` |
| Vercel | Despliegue del frontend (mencionado en comentarios) | `backend/src/app.js` |
| DANE DIVIPOLA | Departamentos y municipios | `backend/src/data/divipola.json`, `frontend/src/shared/data/divipola.json` |
| Zonas de envío | Cálculo de costo de envío | `backend/src/data/zonas-envio.json`, `backend/src/utils/envios.js` |

**No encontrado:** `render.yaml`, `vercel.json`, `Dockerfile`, configuración de CI/CD, `.nvmrc`, `engines` en `package.json` o un archivo de versión de Node. El despliegue se deduce de comentarios y del `README.md`, no de configuración versionada.

---

## 3. Arquitectura

### 3.1 Vista de alto nivel

```text
Navegador
  ├── Tienda pública / cuenta de cliente (React SPA)
  └── Panel administrativo (React SPA, mismo bundle)
        │
        │ HTTPS + JSON / multipart
        ▼
API REST Express (Node.js)
  ├── Middlewares globales: helmet, CORS, JSON 100 kb, rate limit, guardSesion
  ├── Routers por módulo
  ├── Servicios puntuales (abonos, comprobantes, correos, estados de pedido)
  ├── Utilidades (envíos, ubicaciones, documentos)
  └── SQL parametrizado
        │
        ▼
PostgreSQL (Neon)
        │
        ├── Brevo (correo)
        └── Cloudflare Turnstile (verificación anti-bot)
```

### 3.2 Backend

**Punto de entrada:** `backend/src/server.js`

1. Carga `dotenv/config`.
2. Exige `DATABASE_URL` y `JWT_SECRET`; si faltan, termina el proceso.
3. En producción exige configuración válida de Turnstile (`TURNSTILE_SECRET_KEY`, `TURNSTILE_HOSTNAMES`) y rechaza claves de prueba.
4. Llama a `inicializarCategorias()` (crea columnas faltantes de `categoria` y siembra categorías base, solo con `INSERT`).
5. Escucha en `PORT` (por defecto 3000).

**Aplicación:** `backend/src/app.js`

Orden exacto de middlewares y montaje:

1. `app.set('trust proxy', 1)`
2. `helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })`
3. `cors({ origin: origenesPermitidos })`, donde `CORS_ORIGIN` admite lista separada por comas.
4. `express.json({ limit: '100kb' })`
5. `GET /api/health` (antes del limitador general).
6. `limitadorGeneral`.
7. `app.use('/api', guardSesion)` — denegación por defecto.
8. Routers:
   - `/api/productos`
   - `/api/favoritos`
   - `/api/auth`
   - `/api/clientes`
   - `/api/pedidos`
   - `/api/domicilios`
   - `/api/ventas`
   - `/api/abonos`
   - `/api/admin/dashboard`
   - `/api/admin/productos`
   - `/api/admin/usuarios`
   - `/api/categorias`
   - `/api/admin/categorias`
   - `/api/admin/roles`
   - `/api/admin/tallas`
   - `/api/admin/colores`
   - `/api/configuracion`
   - `/api/pruebas` solo si `modoSimulacion()` es verdadero.
9. Manejador 404: `{ error: 'Not Found', path }`.
10. Manejador de errores: JSON inválido → 400; cuerpo grande → 413; 4xx → mensaje genérico; 5xx → `{ error: 'Error interno del servidor' }` y detalle solo en log.

**Capas reales:**

- `routes/`: contiene la lógica de la mayoría de módulos (validación, SQL y respuesta). No hay controladores separados.
- `services/`: solo algunos módulos tienen lógica extraída (`abonos.js`, `comprobantes.js`, `correos.js`, `estadosPedido.js`, `invitaciones.js`, `recuperacion.js`).
- `models/`: solo `categorias.js`; no es un ORM, es una función de inicialización.
- `middlewares/`: autenticación, autorización, guard de sesión, lista blanca, rate limits, honeypot y Turnstile.
- `utils/`: documentos, envíos, ubicaciones e imágenes.
- `controllers/`: vacío (solo `.gitkeep`).

**Convención de errores:** las rutas responden `{ error: 'mensaje' }`; cuando el error es de un campo, agregan `campo` (por ejemplo, login/registro y clientes). Los conflictos de estado usan 409; los permisos, 403 con `codigo: 'FORBIDDEN'` y `permisoRequerido`.

### 3.3 Frontend

**Entrada:** `frontend/src/main.jsx` monta `<App />` dentro de `<ToastProvider>`.

**Navegación:**

- `App.jsx` mantiene `currentView` con valores como `home`, `login`, `register`, `forgot`, `cambiar-contrasena`, `categoria-genero`, `pago`, `compra-exitosa`, `mis-pedidos`, `favoritos`, `configuracion`, `admin`, `checkout-login`.
- `AdminLayout.jsx` mantiene `adminView` con los módulos del panel.
- No hay URL por vista (salvo `?vista=login` para invitaciones). El botón Atrás del navegador no navega entre vistas internas; recargar el panel vuelve al primer módulo permitido.

**Sesión:**

- El login guarda `token` y `usuario` en `localStorage`.
- Al cargar, `App.jsx` llama a `GET /api/auth/perfil` para refrescar permisos.
- `tieneAccesoPanel(user)` exige que `user.permisos` sea un arreglo con al menos un elemento.
- `tienePermiso(user, módulo, privilegio)` compara `Módulo:Privilegio` contra `user.permisos`.

**Datos:**

- `frontend/src/shared/services/api.js` centraliza la mayoría de llamadas.
- `peticionAdmin` agrega `Authorization: Bearer <token>` y, ante 401, borra la sesión y redirige a `/`.
- `procesarRespuesta` propaga `error.campo` y `error.status`.
- Algunas funciones usan `fetch` directo en lugar de `peticionAdmin` (por ejemplo, `obtenerClientes` y varias de pedidos), aunque comparten `authHeaders`.

### 3.4 Flujo de autenticación y autorización

1. `POST /api/auth/login` valida correo/contraseña con bcrypt.
2. Devuelve un JWT HS256 con `{ id, rol }`, expiración 8 h.
3. Cada petición privada pasa por `guardSesion`.
4. `guardSesion` consulta `rutasPublicas.js`; si la ruta no es pública, llama a `verificarToken`.
5. `verificarToken` verifica el JWT y vuelve a leer de la base: `estado`, `cambio_contrasena_obligatorio` y `rol` actual. Si el usuario fue desactivado o cambió de rol, el token viejo deja de servir para lo nuevo.
6. `requierePrivilegio('Módulo', 'Privilegio')` consulta `usuario → rol_permiso → permiso` y exige `permiso.estado = TRUE` y `usuario.estado = TRUE`.
7. **No hay bypass para Administrador.** El rol Administrador solo puede lo que tenga en `rol_permiso`.
8. `bloquearCambioPendiente` impide usar rutas privadas mientras `cambio_contrasena_obligatorio = TRUE`.

**Lista blanca pública** (`backend/src/middlewares/rutasPublicas.js`):

```text
GET  /api/health
POST /api/auth/register
POST /api/auth/login
POST /api/auth/recuperar/*
POST /api/auth/verificar
POST /api/auth/verificar/reenviar
GET  /api/productos
GET  /api/categorias
```

> Observación: `POST /api/auth/verificar` y `POST /api/auth/verificar/reenviar` están en la lista blanca, pero **no existen** en `backend/src/routes/auth.js`. No rompen nada, pero son entradas muertas de la lista.

---

## 4. Estructura de carpetas

```text
StorelaMansion/
├── package.json                  # Scripts raíz (dev, build, install, verificación)
├── README.md
├── .gitignore
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   ├── sql/
│   │   ├── 2026-10-22_domicilio_ubicacion_divipola.sql
│   │   ├── 2026-10-22_pedido_costo_envio.sql
│   │   ├── 2026-10-22_pedido_estado_pago.sql
│   │   ├── 2026-10-23_comprobante_pago.sql
│   │   ├── 2026-10-25_ventas_pagos_notificaciones.sql
│   │   ├── 2026-10-27_configuracion_negocio.sql      # NO APLICADA
│   │   ├── 2026-10-27_producto_nombre_unico.sql      # NO APLICAR
│   │   ├── 2026-10-27_venta_idempotencia.sql         # NO APLICADA
│   │   └── backfill_ventas_pedidos.sql
│   ├── scripts/
│   │   ├── crear-admin.mjs
│   │   └── test-db.cjs
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/db.js
│   │   ├── controllers/          # vacío (.gitkeep)
│   │   ├── data/
│   │   │   ├── divipola.json
│   │   │   └── zonas-envio.json
│   │   ├── middlewares/
│   │   │   ├── auth.js
│   │   │   ├── guardSesion.js
│   │   │   ├── honeypot.js
│   │   │   ├── limitadores.js
│   │   │   ├── rutasPublicas.js
│   │   │   └── verificarCaptcha.js
│   │   ├── models/categorias.js
│   │   ├── routes/
│   │   │   ├── abonos.js
│   │   │   ├── auth.js
│   │   │   ├── categorias.js
│   │   │   ├── categoriasAdmin.js
│   │   │   ├── clientes.js
│   │   │   ├── coloresAdmin.js
│   │   │   ├── configuracion.js
│   │   │   ├── dashboard.js
│   │   │   ├── domicilios.js
│   │   │   ├── favoritos.js
│   │   │   ├── pedidos.js
│   │   │   ├── productos.js
│   │   │   ├── productosAdmin.js
│   │   │   ├── pruebas.js
│   │   │   ├── rolesAdmin.js
│   │   │   ├── tallasAdmin.js
│   │   │   ├── usuariosAdmin.js
│   │   │   └── ventas.js
│   │   ├── services/
│   │   │   ├── abonos.js
│   │   │   ├── comprobantes.js
│   │   │   ├── correos.js
│   │   │   ├── estadosPedido.js
│   │   │   ├── invitaciones.js
│   │   │   └── recuperacion.js
│   │   └── utils/
│   │       ├── documentos.js
│   │       ├── envios.js
│   │       ├── imagenes.js
│   │       └── ubicaciones.js
│   └── tests/                    # scripts .mjs manuales
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── assets/img/           # ~200 imágenes de productos
│       ├── features/
│       │   ├── admin/
│       │   │   ├── AdminLayout.jsx
│       │   │   ├── AdminLayout.css
│       │   │   ├── AdminTheme.css
│       │   │   ├── AdminDesign.css
│       │   │   ├── abonos/
│       │   │   ├── categorias/
│       │   │   ├── clientes/
│       │   │   ├── colores/
│       │   │   ├── components/    # Pagination, Toast
│       │   │   ├── dashboard/
│       │   │   ├── domicilios/
│       │   │   ├── hooks/         # useToast
│       │   │   ├── pedidos/
│       │   │   ├── perfil/
│       │   │   ├── productos/
│       │   │   ├── roles/
│       │   │   ├── shared/        # ConfirmDialog
│       │   │   ├── tallas/
│       │   │   ├── usuarios/
│       │   │   ├── utils/         # ids.js, permisos.js
│       │   │   └── ventas/
│       │   ├── auth/pages/
│       │   ├── categories/
│       │   ├── checkout/pages/
│       │   ├── home/
│       │   ├── product/
│       │   └── store/pages/
│       └── shared/
│           ├── components/
│           ├── data/
│           ├── hooks/
│           ├── services/api.js
│           ├── styles/variables.css
│           └── utils/
├── scripts/
│   ├── generar-divipola.mjs
│   ├── verificar-divipola.mjs
│   └── verificar-zonas-envio.mjs
└── docs/
    └── comprobante-prueba-V-00012.pdf
```

**Convenciones observadas:**

- Backend: nombres de archivo en camelCase para rutas administrativas (`productosAdmin.js`) y en singular/plural según el recurso.
- Frontend: una carpeta por módulo con `Componente.jsx` y `Componente.css`.
- No hay barrel files ni alias de importación; las rutas relativas son largas (`../../../shared/services/api`).
- Los assets de imagen viven en `frontend/src/assets/img/` y se referencian por nombre desde la base y desde `shared/utils/imagenes.js`.

---

## 5. Funcionalidades existentes

### 5.1 Tienda pública

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Home con hero, categorías, destacados y "Nosotros" | Implementada | `frontend/src/features/home/`, `frontend/src/App.jsx` |
| Catálogo con filtros por género, categoría, talla y color | Implementada | `backend/src/routes/productos.js` (`GET /api/productos?genero=&categoria=&talla=&color=`) |
| Agrupación de variantes en productos visibles | Implementada en frontend | `frontend/src/shared/hooks/useCatalogo.js`, `frontend/src/shared/utils/catalogo.js` |
| Detalle de producto y selección de talla/color | Implementada | `frontend/src/features/product/ProductDetailPage.jsx` |
| Categorías públicas activas y ordenadas | Implementada | `backend/src/routes/categorias.js` |
| Carrito persistente en `localStorage` | Implementada | `frontend/src/App.jsx` (`cartStoremansion`) |
| Sincronización de stock del carrito | Implementada | `frontend/src/App.jsx`, `shared/components/cart/cantidad.js` |
| Favoritos | Implementada solo para rol Cliente | `backend/src/routes/favoritos.js`, `frontend/src/features/store/pages/MisFavoritos.jsx` |
| Registro, login y recuperación | Implementada | `backend/src/routes/auth.js`, `frontend/src/features/auth/pages/` |
| Checkout con login obligatorio | Implementado | `App.jsx` (`checkout-login`) |
| Pago con Transferencia o Contra entrega | Implementado | `backend/src/routes/pedidos.js` (`METODOS = ['Transferencia', 'Contra entrega']`) |
| Subida de comprobante de pago | Implementada | `POST /api/pedidos/:id/comprobantes`, `frontend/src/features/checkout/pages/PaymentView.jsx` |
| Pedidos del cliente | Implementado | `GET /api/pedidos/mis`, `frontend/src/features/store/pages/MisPedidos.jsx` |
| Configuración de perfil del cliente | Implementada parcialmente | `frontend/src/features/store/pages/Configuracion.jsx`, `PUT /api/clientes/mio` |

> La configuración del cliente guarda dirección, preferencias y perfil en `localStorage` (`perfilCliente`, `direccionesCliente`, `preferenciasCliente`) además de actualizar nombre/correo/teléfono/documento en el backend. No se encontró una tabla de direcciones múltiples ni preferencias persistidas en base.

### 5.2 Panel administrativo

| Módulo | Funcionalidad | Permisos usados | Archivos principales |
|---|---|---|---|
| Dashboard | Métricas del periodo: ingresos, ventas por día, pedidos por estado, saldo de abonos, domicilios, top productos, inventario, métodos de pago y clientes activos | `Dashboard:Consultar` | `backend/src/routes/dashboard.js`, `frontend/src/features/admin/dashboard/Dashboard.jsx` |
| Roles | CRUD de roles, asignación de permisos por módulo/privilegio, activar/desactivar | `Roles:Consultar/Crear/Actualizar/Cambiar estado/Eliminar` | `backend/src/routes/rolesAdmin.js`, `frontend/src/features/admin/roles/Roles.jsx` |
| Usuarios | CRUD de usuarios internos, roles, invitación, reenvío, estado | `Usuarios:Consultar/Crear/Actualizar/Cambiar estado/Eliminar` | `backend/src/routes/usuariosAdmin.js`, `frontend/src/features/admin/usuarios/Usuarios.jsx` |
| Productos | CRUD de producto + variante, carga completa con varias variantes, activar/desactivar, alerta de stock bajo | `Productos:Consultar/Crear/Actualizar/Cambiar estado/Eliminar` | `backend/src/routes/productosAdmin.js`, `frontend/src/features/admin/productos/Productos.jsx` |
| Categorías | CRUD, géneros permitidos, imagen, orden, estado | `Categorías:Consultar/Crear/Actualizar/Cambiar estado/Eliminar` | `backend/src/routes/categoriasAdmin.js`, `frontend/src/features/admin/categorias/Categorias.jsx` |
| Tallas | CRUD y estado | `Tallas:Consultar/Crear/Actualizar/Eliminar`; el cambio de estado exige `Tallas:Actualizar` | `backend/src/routes/tallasAdmin.js`, `frontend/src/features/admin/tallas/Tallas.jsx` |
| Colores | CRUD y estado | `Colores:Consultar/Crear/Actualizar/Eliminar`; el cambio de estado exige `Colores:Actualizar` | `backend/src/routes/coloresAdmin.js`, `frontend/src/features/admin/colores/Colores.jsx` |
| Ventas | Lista, resumen, venta de mostrador por pasos, anulación con devolución de stock, comprobante PDF | `Ventas:Consultar/Crear/Cambiar estado` | `backend/src/routes/ventas.js`, `frontend/src/features/admin/ventas/Ventas.jsx` |
| Clientes | CRUD de clientes, invitación, estado, pedidos asociados | `Clientes:Consultar/Crear/Actualizar/Cambiar estado/Eliminar` | `backend/src/routes/clientes.js`, `frontend/src/features/admin/clientes/Clientes.jsx` |
| Pedidos | Lista, detalle, cambio de estado, confirmar/rechazar pago, comprobantes, abonos | `Pedidos:Consultar/Actualizar/Cambiar estado` + `Abonos:Crear` para abonos | `backend/src/routes/pedidos.js`, `frontend/src/features/admin/pedidos/Pedidos.jsx` |
| Domicilios | Lista paginada, detalle, asignación de responsable, cambio de estado, costo de envío | `Domicilios:Consultar/Crear/Actualizar/Cambiar estado` | `backend/src/routes/domicilios.js`, `frontend/src/features/admin/domicilios/Domicilios.jsx` |
| Abonos | Pedidos contra entrega con saldo, historial, registro de abono, monto mínimo | `Abonos:Consultar/Crear/Actualizar` | `backend/src/routes/abonos.js`, `frontend/src/features/admin/abonos/Abonos.jsx`, `HistorialAbonos.jsx` |
| Perfil | Datos propios, cambio de contraseña, tema, foto | Sin módulo de permisos | `backend/src/routes/auth.js`, `frontend/src/features/admin/perfil/Perfil.jsx` |

### 5.3 Funcionalidades transversales

- **Invitaciones de usuarios/clientes:** contraseña temporal, vencimiento configurable, reenvío con límite, cambio obligatorio al entrar (`backend/src/services/invitaciones.js`, `backend/src/routes/usuariosAdmin.js`, `backend/src/routes/clientes.js`).
- **Recuperación de contraseña:** código de 6 dígitos por correo, HMAC, intentos, vencimiento y límites por IP/correo (`backend/src/routes/auth.js`, `backend/src/services/recuperacion.js`).
- **Comprobantes de pago:** máximo 2 MB, tipos JPEG/PNG/WebP/PDF, validación por contenido, máximo 3 intentos, un pendiente y un aprobado por pedido (`backend/src/services/comprobantes.js`, `backend/sql/2026-10-23_comprobante_pago.sql`).
- **Notificaciones de correo:** registro en `notificacion_correo`, sin revertir la decisión si Brevo falla (`backend/src/routes/pedidos.js`).
- **DIVIPOLA y zonas de envío:** validación de departamento/municipio, cálculo de costo y métodos de envío (`backend/src/utils/envios.js`, `backend/src/utils/ubicaciones.js`).
- **PWA:** manifest, iconos y precaché; las fotos de producto se excluyen del precaché por tamaño (`frontend/vite.config.js`).

### 5.4 Funcionalidades planificadas o no implementadas

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Proveedores | No implementada | No hay tabla, ruta, permiso ni componente |
| Compras / órdenes de compra | No implementada | No hay tabla, ruta, permiso ni componente |
| Historial de movimientos de inventario | No implementado | Solo se actualiza `producto_variante.stock`; no hay tabla de movimientos |
| Costo de producto / costo promedio | No implementado | `producto` no tiene columna de costo en las consultas; no se encontró DDL |
| Auditoría de cambios | No implementada | No hay tabla de auditoría ni triggers |
| Edición de la configuración del negocio | Parcial | `GET /api/configuracion/negocio` existe; no hay `PUT` ni pantalla de edición |
| Idempotencia de ventas de mostrador | Propuesta, no aplicada | `backend/sql/2026-10-27_venta_idempotencia.sql` está marcado como **NO APLICADA** |
| Nombre de producto único en base | Propuesta, no aplicada | `backend/sql/2026-10-27_producto_nombre_unico.sql` está marcado como **NO APLICAR TODAVÍA** |
| Tabla `configuracion_negocio` | Propuesta, no aplicada | `backend/sql/2026-10-27_configuracion_negocio.sql` está marcado como **NO APLICADA** |

---

## 6. Modelo de base de datos

### 6.1 Limitación y método

**No se encontró el DDL base de las tablas principales.** El repositorio solo contiene migraciones incrementales en `backend/sql/` y la función `inicializarCategorias()` en `backend/src/models/categorias.js`. No hay `schema.sql`, `dump.sql`, `docker-entrypoint-initdb.d/`, ORM ni runner de migraciones.

Por tanto:

- Las columnas de esta sección se reconstruyeron leyendo `SELECT`, `INSERT`, `UPDATE`, `JOIN` y validaciones.
- Las claves primarias y foráneas se infieren por nombres y por las referencias explícitas de las migraciones.
- Los tipos se indican solo cuando aparecen en una migración o son evidentes por el uso; en los demás casos se escribe “tipo no confirmado”.
- **No se debe usar esta sección como DDL oficial.** Antes de crear Proveedores/Compras hay que confirmar el esquema real en Neon.

### 6.2 Tablas inferidas

#### `rol`

| Columna | Tipo | Notas |
|---|---|---|
| `id_rol` | entero, PK | Usado en `usuario.id_rol`, `rol_permiso.id_rol` |
| `nombre` | varchar | `'Administrador'`, `'Vendedor'`, `'Cliente'`, roles personalizados |
| `estado` | boolean | Roles inactivos no deberían iniciar sesión; el rol se lee en cada petición |

Evidencia: `backend/src/routes/rolesAdmin.js`, `backend/src/middlewares/auth.js`, `backend/src/routes/auth.js`.

#### `permiso`

| Columna | Tipo | Notas |
|---|---|---|
| `id_permiso` | entero, PK | Usado en `rol_permiso.id_permiso` |
| `nombre` | varchar | Formato `Módulo:Privilegio`, por ejemplo `Ventas:Consultar` |
| `estado` | boolean | Solo los activos se consideran en `requierePrivilegio` |

Evidencia: `backend/src/middlewares/auth.js`, `backend/src/routes/rolesAdmin.js`.

#### `rol_permiso`

| Columna | Tipo | Notas |
|---|---|---|
| `id_rol` | entero, FK → `rol.id_rol` | |
| `id_permiso` | entero, FK → `permiso.id_permiso` | |

No se encontró una PK compuesta explícita, pero el uso (`DELETE` + `INSERT`) sugiere que la combinación es única. Evidencia: `backend/src/routes/rolesAdmin.js` (`reemplazarPermisos`).

#### `usuario`

| Columna | Tipo | Notas |
|---|---|---|
| `id_usuario` | entero, PK | |
| `nombres` | varchar(100) | Se separa el nombre completo en `nombres` y `apellidos` |
| `apellidos` | varchar(100) | |
| `correo` | varchar(254) | Búsqueda con `LOWER(correo)`; hay manejo de `23505` |
| `contrasena` | varchar | Hash bcrypt |
| `telefono` | varchar(10) | Solo dígitos, máximo 10 |
| `direccion` | varchar | Usada por clientes |
| `id_rol` | entero, FK → `rol.id_rol` | |
| `estado` | boolean | Activo/inactivo |
| `tipo_documento` | varchar | `CC`, `CE`, `NIT`, `Pasaporte` (según `utils/documentos.js`) |
| `documento` | varchar | Búsqueda de duplicados |
| `fecha_nacimiento` | date | Validación de mayoría de edad |
| `created_at` | timestamptz | Mostrado como fecha de registro |
| `acceso_web` | boolean | `TRUE` = cuenta con contraseña conocida; `FALSE` = ficha sin acceso |
| `invitacion_enviada` | boolean | |
| `cambio_contrasena_obligatorio` | boolean | Bloquea rutas privadas |
| `contrasena_temporal_vencimiento` | timestamptz | |

Evidencia: `backend/src/routes/auth.js`, `backend/src/routes/clientes.js`, `backend/src/routes/usuariosAdmin.js`, `backend/src/middlewares/auth.js`.

> **No se encontró** una columna `foto` usada por el backend. El frontend llama a `PUT /api/auth/foto` y lee `user.foto`, pero esa ruta no existe en `backend/src/routes/auth.js` (ver sección 11).

#### `categoria`

| Columna | Tipo | Notas |
|---|---|---|
| `id_categoria` | entero, PK | |
| `codigo` | varchar(30) | ID de texto estable usado por el frontend |
| `nombre` | varchar | Único por `LOWER(nombre)` (índice creado por `inicializarCategorias`) |
| `descripcion` | varchar | |
| `generos` | text[] | `hombre`, `mujer` |
| `imagen` | varchar(300) | Nombre de archivo |
| `orden` | integer | |
| `estado` | boolean | |
| `created_at` | timestamptz | |
| `tipo_talla` | varchar | `numerica`, `letra`, `ninguna` o vacío; usado por Productos |

Evidencia: `backend/src/models/categorias.js`, `backend/src/routes/categorias.js`, `backend/src/routes/categoriasAdmin.js`, `backend/src/routes/productosAdmin.js`.

#### `producto`

| Columna | Tipo | Notas |
|---|---|---|
| `id_producto` | entero, PK | |
| `codigo` | varchar | Generado como `PROD-` + `id_producto` con 6 dígitos |
| `nombre` | varchar(150) | Validación de duplicado normalizado en código |
| `precio` | numeric | Se expone como `float8` |
| `id_categoria` | entero, FK → `categoria.id_categoria` | |
| `genero` | varchar | `hombre`, `mujer`, `unisex` o `NULL` |
| `estado` | boolean | Activo/inactivo |

Evidencia: `backend/src/routes/productosAdmin.js`, `backend/src/routes/productos.js`, `backend/src/routes/ventas.js`.

#### `producto_variante`

| Columna | Tipo | Notas |
|---|---|---|
| `id_variante` | entero, PK | Unidad real de stock y de línea de venta/pedido |
| `id_producto` | entero, FK → `producto.id_producto` | |
| `id_talla` | entero, FK → `talla.id_talla`, nullable | Categorías `ninguna` no llevan talla |
| `id_color` | entero, FK → `color.id_color` | |
| `stock` | integer | Se descuenta/repone en ventas y pedidos |
| `imagen` | varchar(300) | Nombre de archivo |

Evidencia: `backend/src/routes/productosAdmin.js`, `backend/src/routes/ventas.js`, `backend/src/routes/pedidos.js`, `backend/src/services/estadosPedido.js`.

#### `talla`

| Columna | Tipo | Notas |
|---|---|---|
| `id_talla` | entero, PK | |
| `nombre` | varchar | Puede repetirse por categoría; el admin agrupa por nombre |
| `estado` | boolean | |

Evidencia: `backend/src/routes/tallasAdmin.js`, `backend/src/routes/productosAdmin.js`.

#### `color`

| Columna | Tipo | Notas |
|---|---|---|
| `id_color` | entero, PK | |
| `nombre` | varchar | |
| `codigo_hex` | varchar | Usado en catálogo público |
| `estado` | boolean | |

Evidencia: `backend/src/routes/coloresAdmin.js`, `backend/src/routes/productos.js`.

#### `pedido`

| Columna | Tipo | Notas |
|---|---|---|
| `id_pedido` | entero, PK | |
| `id_usuario` | entero, FK → `usuario.id_usuario` | Cliente que compra |
| `fecha` | timestamp/date | Se compara con `$1::date` |
| `subtotal` | numeric(12,2) | |
| `descuento` | numeric(12,2) | |
| `iva` | numeric(12,2) | |
| `total` | numeric(12,2) | |
| `estado` | varchar | `Registrado`, `En preparación`, `Despachado`, `Entregado`, `Cancelado`; sin CHECK según comentario de `estadosPedido.js` |
| `costo_envio` | numeric(12,2), nullable | `NULL` = por confirmar |
| `costo_envio_pendiente` | boolean | `true` = tarifa no definida |
| `metodo_pago` | varchar(50), nullable | `Transferencia`, `Contra entrega`, valores históricos |
| `estado_pago` | varchar(30), nullable | `Pendiente de verificación`, `Pago confirmado`, `Pago rechazado`, `No aplica` |

Evidencia: `backend/src/routes/pedidos.js`, `backend/src/routes/domicilios.js`, `backend/src/services/estadosPedido.js`, `backend/sql/2026-10-22_pedido_estado_pago.sql`, `backend/sql/2026-10-22_pedido_costo_envio.sql`.

#### `detalle_pedido`

| Columna | Tipo | Notas |
|---|---|---|
| `id_detalle` | entero, PK | Inferido |
| `id_pedido` | entero, FK → `pedido.id_pedido` | |
| `id_variante` | entero, FK → `producto_variante.id_variante` | |
| `cantidad` | integer | |
| `precio_unitario` | numeric(12,2) | |

Evidencia: `backend/src/routes/pedidos.js`, `backend/src/routes/domicilios.js`, `backend/sql/backfill_ventas_pedidos.sql`.

#### `venta`

| Columna | Tipo | Notas |
|---|---|---|
| `id_venta` | entero, PK | Código mostrado: `V-` + 5 dígitos |
| `id_pedido` | entero, FK → `pedido.id_pedido`, nullable, único | Añadido por migración |
| `id_cliente` | entero, FK → `usuario.id_usuario`, nullable | |
| `nombre_cliente` | varchar(100) | Copia del nombre al momento de la venta |
| `id_vendedor` | entero, FK → `usuario.id_usuario`, nullable | |
| `fecha` | timestamp/date | |
| `estado` | varchar | `Completada`, `Anulada` |
| `total` | numeric(12,2) | |
| `origen` | varchar(20) | `Tienda virtual`, `Mostrador`; CHECK |
| `estado_pago` | varchar(20) | `Pendiente`, `Pagada`; CHECK |
| `fecha_pago` | timestamp, nullable | |
| `metodo_pago` | varchar(60) | Texto libre; CHECK eliminado por migración |
| `creado_en` | timestamptz | Usado para fecha de pago de ventas históricas |
| `clave_idempotencia` | varchar(80), nullable | Solo si se aplica la migración propuesta; **no aplicada** |

Evidencia: `backend/sql/2026-10-25_ventas_pagos_notificaciones.sql`, `backend/src/routes/ventas.js`, `backend/sql/backfill_ventas_pedidos.sql`.

#### `detalle_venta`

| Columna | Tipo | Notas |
|---|---|---|
| `id_detalle` | entero, PK | |
| `id_venta` | entero, FK → `venta.id_venta` | |
| `id_variante` | entero, FK → `producto_variante.id_variante` | |
| `cantidad` | integer | |
| `precio_unitario` | numeric(12,2) | |

Evidencia: `backend/src/routes/ventas.js`, `backend/sql/backfill_ventas_pedidos.sql`.

#### `pago`

| Columna | Tipo | Notas |
|---|---|---|
| `id_pago` | entero, PK | |
| `id_pedido` | entero, FK → `pedido.id_pedido` | |
| `metodo` | varchar | `Efectivo`, `Transferencia`, `Contra entrega - Saldo`, abonos, valores históricos |
| `monto` | numeric(12,2) | |
| `fecha` | date/timestamp | |
| `url` | varchar, nullable | Usado en respuestas de venta |
| `registrado_por` | entero, FK → `usuario.id_usuario`, nullable | |
| `observacion` | text, nullable | |
| `referencia` | varchar, nullable | |
| `registrado_en` | timestamptz | |
| `id_comprobante` | bigint, FK → `comprobante_pago.id_comprobante`, nullable | |
| `clave_idempotencia` | varchar(80), nullable | Usada por abonos |

Evidencia: `backend/src/services/abonos.js`, `backend/src/routes/pedidos.js`, `backend/src/routes/ventas.js`.

#### `domicilio`

| Columna | Tipo | Notas |
|---|---|---|
| `id_domicilio` | entero, PK | |
| `id_pedido` | entero, FK → `pedido.id_pedido` | |
| `direccion_entrega` | varchar | |
| `metodo_envio` | varchar | `Domicilio`, `Recoger en tienda`, etc. |
| `estado` | varchar | `Pendiente`, `En camino`, `Entregado`, `Cancelado` |
| `departamento` | varchar(100) | Añadida por migración |
| `municipio` | varchar(100) | Añadida por migración |
| `barrio` | varchar(100) | Añadida por migración |
| `nombre_destinatario` | varchar(100) | Añadida por migración |
| `telefono_destinatario` | varchar(15) | Añadida por migración |
| `responsable` | varchar | Persona que lleva el domicilio |
| `fecha_programada` | date | |
| `fecha_entrega` | date | |
| `observaciones` | text | |
| `actualizado_en` | timestamptz | |

Evidencia: `backend/src/routes/domicilios.js`, `backend/sql/2026-10-22_domicilio_ubicacion_divipola.sql`.

#### `favorito`

| Columna | Tipo | Notas |
|---|---|---|
| `id_usuario` | entero, FK → `usuario.id_usuario` | |
| `id_producto` | entero, FK → `producto.id_producto` | |
| `creado_en` | timestamptz | Orden de favoritos |

Evidencia: `backend/src/routes/favoritos.js`. **No se encontró DDL ni PK explícita.**

#### `comprobante_pago`

| Columna | Tipo | Notas |
|---|---|---|
| `id_comprobante` | BIGSERIAL, PK | |
| `id_pedido` | integer, FK → `pedido.id_pedido` | `ON DELETE CASCADE` |
| `subido_por` | integer, FK → `usuario.id_usuario` | `ON DELETE SET NULL` |
| `contenido` | BYTEA | Ahora nullable para permitir almacenamiento externo |
| `tipo_mime` | varchar(50) | JPEG, PNG, WebP, PDF |
| `tamano_bytes` | integer | ≤ 2 MB |
| `nombre_original` | varchar(255) | |
| `estado` | varchar(20) | `Pendiente`, `Aprobado`, `Rechazado` |
| `motivo_rechazo` | text | Obligatorio si rechazado |
| `revisado_por` | integer, FK → `usuario.id_usuario` | `ON DELETE SET NULL` |
| `revisado_en` | timestamptz | |
| `creado_en` | timestamptz | |
| `intento` | smallint | 1 a 3 |
| `ubicacion_almacenamiento` | varchar(20) | `neon` por defecto |
| `referencia_externa` | text, nullable | |

Evidencia: `backend/sql/2026-10-23_comprobante_pago.sql`, `backend/sql/2026-10-25_ventas_pagos_notificaciones.sql`, `backend/src/services/comprobantes.js`.

#### `notificacion_correo`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | BIGSERIAL, PK | |
| `id_pedido` | integer, FK → `pedido.id_pedido` | `ON DELETE CASCADE` |
| `id_comprobante` | bigint, FK → `comprobante_pago.id_comprobante` | `ON DELETE SET NULL` |
| `tipo` | varchar(20) | `pago_aprobado`, `pago_rechazado` |
| `destinatario` | varchar(254) | |
| `estado` | varchar(20) | `Enviado`, `Fallido` |
| `error` | text | |
| `creado_en` | timestamptz | |
| `enviado_en` | timestamptz | |
| Restricción | | `UNIQUE (id_comprobante, tipo)` |

Evidencia: `backend/sql/2026-10-25_ventas_pagos_notificaciones.sql`, `backend/src/routes/pedidos.js`.

#### `recuperacion_contrasena`

| Columna | Tipo | Notas |
|---|---|---|
| `id_recuperacion` | entero/BIGSERIAL, PK | Inferido |
| `id_usuario` | entero, FK → `usuario.id_usuario` | |
| `codigo_hash` | varchar | HMAC del código |
| `vencimiento` | timestamptz | |
| `usado` | boolean | |
| `intentos` | integer | |

Evidencia: `backend/src/routes/auth.js`, `backend/src/services/recuperacion.js`. **No se encontró DDL.**

#### `configuracion_abonos`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | smallint/integer, PK | Fila única con `id = 1` |
| `monto_minimo` | numeric | |
| `actualizado_en` | timestamptz | |
| `actualizado_por` | entero, FK → `usuario.id_usuario` | |

Evidencia: `backend/src/routes/abonos.js`, `backend/src/services/abonos.js`. **No se encontró DDL.**

#### `configuracion_negocio` (definida en migración no aplicada)

| Columna | Tipo | Notas |
|---|---|---|
| `id_configuracion` | smallint, PK, CHECK = 1 | Fila única |
| `nombre` | varchar(150), nullable | |
| `nit` | varchar(30), nullable | |
| `direccion` | varchar(255), nullable | |
| `telefono` | varchar(30), nullable | |
| `correo` | varchar(150), nullable | |
| `actualizado_en` | timestamptz | |

Evidencia: `backend/sql/2026-10-27_configuracion_negocio.sql` (marcada **NO APLICADA**), `backend/src/routes/configuracion.js`.

### 6.3 Vista inferida `pedido_abonos`

Usada por `GET /api/abonos` y por el dashboard. Columnas expuestas:

| Columna | Uso |
|---|---|
| `id_pedido` | Identificador |
| `id_usuario` | Cliente |
| `fecha` | Fecha del pedido |
| `estado_pedido` | Estado del pedido |
| `metodo_pago` | Método del pedido |
| `total` | Total del pedido |
| `total_abonado` | Suma de pagos |
| `saldo_pendiente` | `total - total_abonado` |
| `porcentaje_pagado` | Porcentaje |
| `estado_monto` | Clasificación del saldo |
| `cantidad_pagos` | Número de pagos |
| `es_contra_entrega` | Booleano derivado del método |

Evidencia: `backend/src/routes/abonos.js`, `backend/src/routes/dashboard.js`. **No se encontró el `CREATE VIEW` en el repositorio.** La vista debe existir en la base para que Abonos y Dashboard funcionen.

### 6.4 Relaciones principales

```text
rol 1 ─── N usuario
rol 1 ─── N rol_permiso N ─── 1 permiso

categoria 1 ─── N producto
producto 1 ─── N producto_variante
talla 1 ─── N producto_variante
color 1 ─── N producto_variante

usuario 1 ─── N pedido
pedido 1 ─── N detalle_pedido
pedido 1 ─── N pago
pedido 1 ─── N domicilio
pedido 1 ─── N comprobante_pago
pedido 1 ─── N notificacion_correo
pedido 1 ─── 1 venta (id_pedido único cuando no es NULL)
venta 1 ─── N detalle_venta
producto_variante 1 ─── N detalle_pedido
producto_variante 1 ─── N detalle_venta

usuario 1 ─── N favorito N ─── 1 producto
usuario 1 ─── N recuperacion_contrasena
```

### 6.5 Índices y restricciones verificadas en migraciones

- `venta.id_pedido` único (`ux_venta_id_pedido`).
- Índices en `venta.estado_pago`, `venta.origen`.
- Índices en `comprobante_pago.estado`, `revisado_por`, `id_pedido`.
- Un solo comprobante `Pendiente` y uno solo `Aprobado` por pedido.
- `comprobante_pago.intento` único por pedido (1–3).
- `notificacion_correo` único por `(id_comprobante, tipo)`.
- `categoria.codigo` y `categoria.nombre` únicos por `LOWER(...)` (creados al arrancar).
- **No se encontró** un índice único activo para `producto.nombre`; la migración que lo propone está marcada como no aplicar.

### 6.6 Datos y deuda de esquema

- La base ya tiene **nombres de producto duplicados** documentados en `backend/sql/2026-10-27_producto_nombre_unico.sql`: `buzo` (10), `camiseta` (50), `camiseta deportiva fit` (34), `gorra` (11), `gorra casual classic` (2), `tenis classic casual` (18), `tenis sport low` (2).
- `pedido.estado` no tiene CHECK; la validación vive en `estadosPedido.js`.
- `venta.metodo_pago` es texto libre y el dashboard lo agrupa por `LIKE`.
- No hay tabla de movimientos de inventario: el stock es una foto, no un historial.

---

## 7. Comportamiento del frontend

### 7.1 Arranque y sesión

1. `main.jsx` monta `ToastProvider` y `App`.
2. `App` calcula la vista inicial:
   - Si la URL trae `?vista=login`, abre login y limpia el parámetro.
   - Si hay usuario guardado con `cambioContrasena`, abre `cambiar-contrasena`.
   - Si hay usuario con al menos un permiso, abre `admin`.
   - Si no, abre `home`.
3. Si hay token, llama a `obtenerPerfil()` y actualiza `usuario` y `permisos` en `localStorage`.
4. `handleLoginSuccess` decide:
   - contraseña temporal → `cambiar-contrasena`;
   - usuario con permisos → `admin`;
   - venía del checkout → `pago`;
   - cliente normal → `home`.

### 7.2 Navegación

- No hay rutas URL. `currentView` es un string y cada vista se renderiza con condicionales en `App.jsx`.
- El panel usa `adminView`; el menú y la búsqueda de módulos cambian ese estado.
- Consecuencias:
  - recargar el panel vuelve al primer módulo permitido;
  - no se puede compartir un enlace a un módulo;
  - el botón Atrás no recorre módulos;
  - el estado se pierde al refrescar (salvo tema, sidebar y datos de `localStorage`).

### 7.3 Tienda y carrito

- El catálogo se carga con `useCatalogo`, que llama a `GET /api/productos` y agrupa variantes.
- `addToCart` valida stock, evita agotados y guarda una variante real (nunca el arreglo `variantes`).
- El carrito se persiste en `localStorage` con la clave `cartStoremansion`.
- `suscribirCatalogo` permite recortar cantidades cuando el stock cambia.
- `handleContinuarCompra` bloquea el paso si hay líneas agotadas y exige sesión.
- `PaymentView` crea el pedido y sube comprobante cuando aplica.

### 7.4 Patrón de los módulos administrativos

La mayoría sigue este esquema:

1. `useState` para lista, búsqueda, página, modal, formulario, confirmación y toast.
2. `useEffect` inicial que llama a los helpers de `shared/services/api.js`.
3. Filtro y paginación en cliente para tablas pequeñas; `Domicilios` y `Abonos` paginan en servidor.
4. Tabla con acciones (ver, editar, activar/desactivar, eliminar).
5. Modal de formulario con validación local y mensajes por campo.
6. `ConfirmDialog` para acciones destructivas.
7. `useToast` + `<Toast />` para feedback.
8. `Pagination` cuando hay páginas.
9. Guardas con `tienePermiso(user, 'Módulo', 'Privilegio')` para mostrar/ocultar acciones.

**Clases CSS típicas:** `<modulo>-page`, `<modulo>-header`, `<modulo>-title`, `<modulo>-actions`, `<modulo>-search`, `<modulo>-table-container`, `<modulo>-table`, `<modulo>-empty`, `<modulo>-modal-overlay`, `<modulo>-modal`, `<modulo>-modal-header`, `<modulo>-modal-body`, `<modulo>-modal-footer`.

### 7.5 Helpers de API

- `peticionAdmin(ruta, { metodo, cuerpo, mensajeError })`:
  - agrega `Authorization`;
  - agrega `Content-Type` solo si hay cuerpo;
  - convierte errores a `Error` con `status` y `campo`;
  - en 401 limpia `token` y `usuario` y redirige a `/`.
- `procesarRespuesta` es el punto común para respuestas JSON.
- Los endpoints de archivo (comprobantes) se manejan como `Blob` para no exponer la URL privada.
- **Inconsistencia:** varias funciones usan `fetch` directo y repiten la lógica de error; no todas pasan por `peticionAdmin`.

### 7.6 Persistencia en `localStorage`

| Clave | Contenido | Archivo |
|---|---|---|
| `token` | JWT | `App.jsx`, `api.js` |
| `usuario` | Datos y permisos del usuario | `App.jsx` |
| `cartStoremansion` | Carrito | `App.jsx` |
| `pedidosCliente` | Pedidos locales del cliente | `App.jsx` |
| `perfilCliente` | Perfil local | `App.jsx` |
| `direccionesCliente` | Direcciones locales | `App.jsx` |
| `preferenciasCliente` | Preferencias locales | `App.jsx` |
| `storemansion-theme` | Tema público | `App.jsx` |
| `sla-admin-theme` | Tema del panel | `AdminLayout.jsx` |
| `sla-admin-sidebar` | Sidebar colapsado | `AdminLayout.jsx` |

> El token y los permisos viven en `localStorage`, no en cookies `HttpOnly`. Es una decisión existente; cualquier XSS podría leerlos. No se propone cambiarla en esta auditoría, pero debe tenerse en cuenta para los nuevos módulos.

---

## 8. Comportamiento del backend

### 8.1 Matriz de rutas y permisos

#### Rutas públicas

| Método | Ruta | Control |
|---|---|---|
| GET | `/api/health` | Sin token, antes del rate limit general |
| POST | `/api/auth/register` | Rate limit, honeypot, Turnstile, validación |
| POST | `/api/auth/login` | Rate limit |
| POST | `/api/auth/recuperar/solicitar` | Turnstile + límites |
| POST | `/api/auth/recuperar/verificar` | Rate limit |
| POST | `/api/auth/recuperar/restablecer` | Rate limit |
| GET | `/api/productos` | Sin token |
| GET | `/api/categorias` | Sin token |

#### Rutas privadas por módulo

| Módulo | Rutas | Permiso |
|---|---|---|
| Dashboard | `GET /api/admin/dashboard` | `Dashboard:Consultar` |
| Roles | `GET /api/admin/roles`, `GET /api/admin/roles/permisos`, `GET /api/admin/roles/:id` | `Roles:Consultar` |
| Roles | `POST /api/admin/roles` | `Roles:Crear` |
| Roles | `PUT /api/admin/roles/:id` | `Roles:Actualizar` |
| Roles | `PATCH /api/admin/roles/:id/estado` | `Roles:Cambiar estado` |
| Roles | `DELETE /api/admin/roles/:id` | `Roles:Eliminar` |
| Usuarios | `GET /api/admin/usuarios`, `GET /api/admin/usuarios/roles` | `Usuarios:Consultar` |
| Usuarios | `POST /api/admin/usuarios` | `Usuarios:Crear` |
| Usuarios | `PUT /api/admin/usuarios/:id`, `POST /api/admin/usuarios/:id/reenviar-invitacion` | `Usuarios:Actualizar` |
| Usuarios | `PATCH /api/admin/usuarios/:id/estado` | `Usuarios:Cambiar estado` |
| Usuarios | `DELETE /api/admin/usuarios/:id` | `Usuarios:Eliminar` |
| Productos | `GET /api/admin/productos`, `GET /api/admin/productos/catalogos`, `GET /api/admin/productos/producto/:idProducto` | `Productos:Consultar` |
| Productos | `POST /api/admin/productos`, `POST /api/admin/productos/completo` | `Productos:Crear` |
| Productos | `PUT /api/admin/productos/:id`, `PUT /api/admin/productos/producto/:idProducto/completo` | `Productos:Actualizar` |
| Productos | `PATCH /api/admin/productos/:id/estado` | `Productos:Cambiar estado` |
| Productos | `DELETE /api/admin/productos/:id` | `Productos:Eliminar` |
| Categorías | `GET /api/admin/categorias` | `Categorías:Consultar` |
| Categorías | `POST /api/admin/categorias` | `Categorías:Crear` |
| Categorías | `PUT /api/admin/categorias/:id` | `Categorías:Actualizar` |
| Categorías | `PATCH /api/admin/categorias/:id/estado` | `Categorías:Cambiar estado` |
| Categorías | `DELETE /api/admin/categorias/:id` | `Categorías:Eliminar` |
| Tallas | `GET /api/admin/tallas` | `Tallas:Consultar` |
| Tallas | `POST /api/admin/tallas` | `Tallas:Crear` |
| Tallas | `PUT /api/admin/tallas/:id` | `Tallas:Actualizar` |
| Tallas | `PATCH /api/admin/tallas/:id/estado` | `Tallas:Actualizar` (no “Cambiar estado”) |
| Tallas | `DELETE /api/admin/tallas/:id` | `Tallas:Eliminar` |
| Colores | `GET /api/admin/colores` | `Colores:Consultar` |
| Colores | `POST /api/admin/colores` | `Colores:Crear` |
| Colores | `PUT /api/admin/colores/:id` | `Colores:Actualizar` |
| Colores | `PATCH /api/admin/colores/:id/estado` | `Colores:Actualizar` (no “Cambiar estado”) |
| Colores | `DELETE /api/admin/colores/:id` | `Colores:Eliminar` |
| Ventas | `GET /api/ventas`, `GET /api/ventas/resumen`, `GET /api/ventas/:id` | `Ventas:Consultar` |
| Ventas | `GET /api/ventas/variantes`, `GET /api/ventas/clientes`, `GET /api/ventas/productos`, `GET /api/ventas/productos/:id/tallas`, `GET /api/ventas/productos/:id/colores`, `GET /api/ventas/productos/:id/variante` | `Ventas:Crear` |
| Ventas | `POST /api/ventas` | `Ventas:Crear` |
| Ventas | `PATCH /api/ventas/:id/estado` | `Ventas:Cambiar estado` |
| Clientes | `GET /api/clientes` | `Clientes:Consultar` |
| Clientes | `POST /api/clientes` | `Clientes:Crear` |
| Clientes | `PUT /api/clientes/mio` | Cualquier usuario autenticado (identidad del token) |
| Clientes | `PUT /api/clientes/:id` | `Clientes:Actualizar` |
| Clientes | `PATCH /api/clientes/:id/estado` | `Clientes:Cambiar estado` |
| Clientes | `DELETE /api/clientes/:id` | `Clientes:Eliminar` |
| Pedidos | `GET /api/pedidos` | `Pedidos:Consultar` |
| Pedidos | `GET /api/pedidos/mis` | Solo rol `Cliente` |
| Pedidos | `GET /api/pedidos/:id` | `Cliente` dueño o personal con `Pedidos:Consultar`; además pasa por `soloRoles('Administrador','Vendedor','Cliente')` |
| Pedidos | `POST /api/pedidos` | Solo rol `Cliente` |
| Pedidos | `POST /api/pedidos/:id/pago/confirmar`, `POST /api/pedidos/:id/pago/rechazar` | `Pedidos:Cambiar estado` |
| Pedidos | `POST /api/pedidos/:id/comprobantes`, `POST /api/pedidos/:id/comprobantes/:idc/aprobar`, `POST /api/pedidos/:id/comprobantes/:idc/rechazar` | `Pedidos:Actualizar` |
| Pedidos | `GET /api/pedidos/:id/comprobantes`, `GET /api/pedidos/:id/comprobantes/:idc/archivo` | Cliente dueño o `Pedidos:Consultar` |
| Pedidos | `PATCH /api/pedidos/:id/estado` | `Pedidos:Cambiar estado` |
| Pedidos | `GET /api/pedidos/:id/abonos` | `Cliente` dueño o `Abonos:Consultar`/`Pedidos:Consultar` |
| Pedidos | `POST /api/pedidos/:id/abonos` | `Abonos:Crear` |
| Domicilios | `GET /api/domicilios`, `GET /api/domicilios/:id` | `Domicilios:Consultar` |
| Domicilios | `POST /api/domicilios` | `Domicilios:Crear` |
| Domicilios | `PATCH /api/domicilios/:id`, `PATCH /api/domicilios/:id/costo-envio` | `Domicilios:Actualizar` |
| Domicilios | `PATCH /api/domicilios/:id/estado` | `Domicilios:Cambiar estado` |
| Abonos | `GET /api/abonos` | `Abonos:Consultar` |
| Abonos | `GET /api/abonos/configuracion` | `Abonos:Consultar` o `Abonos:Actualizar` |
| Abonos | `PUT /api/abonos/configuracion` | `Abonos:Actualizar` |
| Configuración | `GET /api/configuracion/negocio` | `Ventas:Consultar` |
| Favoritos | `GET /api/favoritos`, `GET /api/favoritos/ids`, `POST /api/favoritos/:idProducto`, `DELETE /api/favoritos/:idProducto` | Solo rol `Cliente` (sin permiso de módulo) |

### 8.2 Reglas de negocio relevantes

- **Roles protegidos:** `Administrador` y `Cliente` no se pueden editar, desactivar ni eliminar; se valida en frontend y backend (`rolesAdmin.js`, `Roles.jsx`).
- **Permisos:** se reemplazan completos en una transacción; los nombres deben existir en `permiso`.
- **Productos:** el código se genera en el servidor; no se acepta del formulario. Se valida nombre duplicado normalizado (sin mayúsculas, tildes ni espacios extra) y coherencia género/categoría/talla.
- **Stock:** se guarda por variante. La venta de mostrador y el pedido lo descuentan; la anulación/cancelación lo repone.
- **Pedidos:** transiciones permitidas `Registrado → En preparación → Despachado → Entregado`; `Cancelado` se permite desde estados no entregados. No se puede modificar un pedido `Entregado` ni cancelar dos veces.
- **Pago:** para pasar a `En preparación`, si no es contra entrega el pago debe estar confirmado.
- **Contra entrega:** al entregar se registra el saldo real como pago `Contra entrega - Saldo` y se recalcula la venta.
- **Domicilios:** `Pendiente → En camino` exige responsable; `En camino → Entregado`; sin retrocesos. Se sincroniza con el pedido en la misma transacción.
- **Abonos:** solo pedidos contra entrega; monto mínimo configurable; idempotencia por `clave_idempotencia`; el saldo se calcula con pagos reales.
- **Comprobantes:** se crea la fila en `pago` solo al aprobar; un rechazo exige motivo; los correos se registran y no revierten la decisión.
- **Dashboard:** ingresos solo de ventas `Completada` y `Pagada`; pedidos y ventas por rango de fechas; abonos, domicilios, inventario y clientes no se filtran por el rango (son una foto actual).

### 8.3 Formato de errores y transacciones

- Formato dominante: `{ error: 'mensaje' }`.
- Errores de campo: `{ error, campo }`.
- Permisos: `403 { error, codigo: 'FORBIDDEN', permisoRequerido }`.
- Stock/estado: `409`.
- No encontrado: `404`.
- Validación: `400`.
- Las operaciones que tocan stock, pagos, ventas y pedidos usan `pool.connect()`, `BEGIN`/`COMMIT`/`ROLLBACK` y, en varios casos, `FOR UPDATE`.
- No hay un helper transaccional común; cada ruta repite el patrón.

### 8.4 Servicios externos

- **Brevo:** `enviarCorreo` se usa para invitaciones, bienvenida, recuperación y decisiones de pago. Si falta la API key fuera de producción, los correos se simulan en memoria y se consultan en `GET /api/pruebas/invitaciones-simuladas`.
- **Turnstile:** se valida en registro y recuperación; en producción el proceso no arranca con configuración inválida.
- **DIVIPOLA/zonas:** el backend valida códigos y calcula costo; el frontend tiene copias de los JSON para mostrar selects.

---

## 9. Diseño visual

### 9.1 Identidad global

La identidad se define en `frontend/src/shared/styles/variables.css` y se conmuta con `data-theme` en `<html>`.

**Modo claro (crema/beige):**

| Token | Valor | Uso |
|---|---|---|
| `--bg-main` | `#f5ead6` | Fondo base |
| `--bg-card` | `#ebdcc3` | Secciones/tarjetas |
| `--card-bg` | `#ffffff` | Superficie de tarjetas |
| `--ink` | `#1a1a1a` | Texto principal |
| `--ink-soft` | `#555555` | Texto secundario |
| `--gold` | `#d8b438` | Acento dorado |
| `--gold-dark` | `#b19128` | Acento oscuro |
| `--gold-light` | `#e7c248` | Acento claro |
| `--section-base` | `#0a0a0a` | Base de secciones del landing |

**Modo oscuro (negro/oro):**

| Token | Valor |
|---|---|
| `--bg-main` | `#0a0a0a` |
| `--bg-card` | `#141414` |
| `--card-bg` | `#141414` |
| `--ink` | `#f0f0f0` |
| `--ink-soft` | `#b0b0b0` |
| `--gold` | `#d4af37` |
| `--gold-dark` | `#e5c158` |
| `--gold-light` | `#e7c75c` |

- Tipografía: `Inter`, con `--font-display` y `--font-body`.
- Ancho máximo: `1280px`.
- Los degradados dorados del landing usan `--gold-glow-top` y `--gold-glow-bottom`.
- El tema público se guarda en `storemansion-theme`; el del panel en `sla-admin-theme`.

### 9.2 Panel administrativo

- `AdminLayout.css`: estructura del sidebar, navbar, contenido, acordeones y responsive.
- `AdminTheme.css`: variables y overrides del modo oscuro (`.admin-container.admin-dark`).
- `AdminDesign.css`: refinamientos visuales del panel.
- El panel usa una estética propia sobre fondo claro (`--admin-bg`) y modo oscuro con `#1c1c1c`/`#262626` y dorado `#d4af37`.
- Sidebar colapsable, overlay móvil, búsqueda de módulos, breadcrumb, menú de perfil y toggle de tema.
- Los módulos tienen CSS propio y repiten patrones de tabla, modal, botones y estados vacíos.
- Componentes compartidos: `Pagination`, `Toast`, `ConfirmDialog`.
- Iconografía: `lucide-react` (Dashboard, Shield, Users, Package, ShoppingCart, Truck, Wallet, etc.).

### 9.3 PWA y marca

- Manifest en `frontend/vite.config.js`: nombre “Store la mansion”, `theme_color: #000000`, iconos `ico.png`, screenshot `screen.png`.
- `registerType: 'autoUpdate'`.
- Las imágenes de producto se excluyen del precaché por tamaño; se sirven por red.
- `frontend/index.html` y `public/` contienen favicon e iconos.

### 9.4 Reglas para no romper la identidad

Cualquier módulo nuevo debe:

1. Reutilizar variables (`--gold`, `--bg-main`, `--card-bg`, `--ink`) y no introducir una paleta paralela.
2. Seguir la estructura `<modulo>-page/header/title/actions/search/table-container/table/empty/modal`.
3. Reutilizar `Pagination`, `ConfirmDialog`, `useToast` y los estilos de botones existentes.
4. Añadir sus clases de página a `AdminTheme.css` para que el modo oscuro las cubra.
5. No cambiar `variables.css` ni los tokens globales para un módulo puntual.
6. Mantener el español en textos, mensajes y nombres de campos visibles.

---

## 10. Dependencias entre módulos

### 10.1 Mapa de dependencias actual

```text
Roles ───────────────► Permisos (catálogo `permiso`)
Usuarios ────────────► Roles
Login/sesión ────────► Usuarios + Roles + Permisos

Categorías ──────────► Productos (id_categoria, género, tipo_talla)
Tallas ──────────────► Productos (id_talla)
Colores ─────────────► Productos (id_color)
Productos ───────────► Categorías + Tallas + Colores + producto_variante.stock

Clientes ────────────► Usuarios (rol Cliente)
Ventas ──────────────► Productos + Variantes + Clientes + Pedidos + Domicilios + Abonos
Pedidos ─────────────► Clientes/Usuarios + Productos + Variantes + Domicilios + Pagos + Comprobantes + Notificaciones + Abonos + Ventas
Domicilios ──────────► Pedidos + Ventas + DIVIPOLA + Zonas de envío
Abonos ──────────────► Pedidos + Pagos + Ventas + `configuracion_abonos` + vista `pedido_abonos`
Dashboard ───────────► Ventas + Pedidos + Abonos + Domicilios + Productos/Variantes + Usuarios
Perfil ──────────────► Usuarios + Auth
```

### 10.2 Dependencias críticas

| Dependencia | Por qué es crítica | Riesgo si se rompe |
|---|---|---|
| `producto_variante.stock` | Es la única fuente de stock para tienda, ventas y pedidos | Sobreventa o stock negativo |
| `pedido_abonos` | Abonos y Dashboard la consultan | 500 en Abonos y Dashboard |
| `configuracion_abonos` | Monto mínimo de abonos | 500 en configuración de abonos |
| `configuracion_negocio` | PDF de venta | 500 controlado; el PDF usa nombre por defecto |
| `rol_permiso` + `permiso` | Toda la autorización | Usuarios sin acceso o acceso indebido |
| `venta.id_pedido` único | Evita dos ventas por pedido | Duplicidad de ventas |
| `comprobante_pago` | Flujo de pago y aprobación | No se puede validar el pago |
| `notificacion_correo` | Idempotencia de correos | Correos duplicados |

### 10.3 Dependencias previstas para Proveedores y Compras

- **Proveedores** dependerá de `usuario` solo para saber quién creó/modificó, y de permisos.
- **Compras** dependerá de `proveedor`, `producto_variante`, `producto`, `usuario` y permisos.
- **Recepción de compra** afectará `producto_variante.stock`; por tanto, impacta indirectamente a Ventas, Pedidos, Dashboard y catálogo público.
- **No debe depender** de `venta` ni de `pedido` para funcionar; son flujos separados.
- Si se agrega historial de inventario, Ventas y Pedidos podrían registrar movimientos en el futuro, pero **no se debe modificar su comportamiento actual** en la primera entrega.

---

## 11. Problemas encontrados

### 11.1 Prioridad alta

| # | Problema | Evidencia | Impacto | Recomendación |
|---|---|---|---|---|
| A1 | **No existe el DDL base de la mayoría de tablas** | Solo hay migraciones incrementales en `backend/sql/`; no hay `schema.sql`, dump, ORM ni runner | Imposible reconstruir la base con fidelidad; riesgo alto al crear tablas nuevas | Obtener `pg_dump --schema-only` de Neon y versionarlo antes de la integración |
| A2 | **Migraciones marcadas como no aplicadas** | `2026-10-27_configuracion_negocio.sql` (NO APLICADA), `2026-10-27_venta_idempotencia.sql` (NO APLICADA), `2026-10-27_producto_nombre_unico.sql` (NO APLICAR) | `GET /api/configuracion/negocio` responde 500; no hay idempotencia de ventas; no hay unicidad de nombre en base | Planificar aplicación controlada; no aplicar la de nombre único hasta resolver duplicados |
| A3 | **El frontend llama a `PUT /api/auth/foto`, pero la ruta no existe** | `frontend/src/shared/services/api.js:218`, `frontend/src/features/admin/perfil/Perfil.jsx:67`; `backend/src/routes/auth.js` no tiene `/foto` | La actualización de foto de perfil falla con 404 | Implementar la ruta y la columna, o retirar la llamada y la UI de foto |
| A4 | **Roles personalizados no pueden abrir el detalle de pedido** | `backend/src/routes/pedidos.js:1224` usa `soloRoles('Administrador','Vendedor','Cliente')` antes de `autorizarDetalle` | Un rol con `Pedidos:Consultar` puede listar pero recibe 403 al abrir detalle | Reemplazar `soloRoles` por autorización basada en permiso, manteniendo la regla del Cliente dueño |
| A5 | **El rol Administrador no tiene bypass de permisos y no se puede editar desde la UI** | `backend/src/middlewares/auth.js`, `frontend/src/features/admin/roles/Roles.jsx` (`ROLES_PROTEGIDOS`) | Al crear permisos nuevos (Proveedores/Compras), el Administrador no los tendrá y no podrá asignárselos desde la UI | Sembrar los permisos nuevos y asignarlos a Administrador en la migración, o habilitar una excepción controlada |
| A6 | **Duplicados de nombre de producto ya existentes** | `backend/sql/2026-10-27_producto_nombre_unico.sql` documenta 10+50+34+11+2+18+2 productos duplicados | No se puede activar el índice único sin decidir qué hacer con los duplicados | Resolver duplicados con un plan de datos; no borrar sin autorización |

### 11.2 Prioridad media

| # | Problema | Evidencia | Impacto | Recomendación |
|---|---|---|---|---|
| M1 | Listas administrativas sin paginación en servidor | `GET /api/admin/productos`, `/api/ventas`, `/api/clientes`, `/api/pedidos`, `/api/admin/roles`, `/api/admin/usuarios` devuelven todo | Crecimiento de datos → respuestas lentas y mucho render | Añadir `pagina`/`porPagina` y metadatos, como ya hacen Domicilios y Abonos |
| M2 | Navegación por estado manual, sin rutas URL | `App.jsx`, `AdminLayout.jsx`; `react-router-dom` no se usa | No hay enlaces profundos, recarga vuelve al inicio, botón Atrás no funciona | Mantener el patrón actual por compatibilidad; si se migra, hacerlo en una tarea aparte |
| M3 | Dependencia `react-router-dom` declarada pero no usada | `frontend/package.json:18`; sin imports en `frontend/src` | Peso innecesario y confusión | Eliminar en una tarea de limpieza, no en la integración |
| M4 | `backend/src/utils/imagenes.js` usa `import.meta.glob` (API de Vite) en backend Node | `backend/src/utils/imagenes.js:1` | Si alguien lo importa, falla; hoy es código muerto | Eliminarlo o reemplazarlo por una utilidad Node si se necesita |
| M5 | Lista blanca contiene rutas de verificación inexistentes | `backend/src/middlewares/rutasPublicas.js` vs `backend/src/routes/auth.js` | Confusión y falsa sensación de cobertura | Eliminar las entradas muertas o implementar las rutas |
| M6 | `Roles.jsx` no incluye `Abonos` en la lista fallback `MODULOS` | `frontend/src/features/admin/roles/Roles.jsx:37-49` | Si falla el catálogo de permisos, no se pueden asignar permisos de Abonos | Añadir `Abonos` (y los nuevos módulos) a la lista fallback |
| M7 | No hay historial de movimientos de inventario | Solo `UPDATE producto_variante.stock` en ventas/pedidos | No se puede auditar por qué cambió el stock | Crear `movimiento_inventario` en la integración de Compras |
| M8 | Validación manual duplicada en rutas | Cada ruta valida campos y longitudes a mano | Inconsistencias y errores repetidos | Mantener el estilo actual, pero centralizar validadores reutilizables |
| M9 | CSS duplicado por módulo | `frontend/src/features/admin/*/*.css` | Cambios visuales requieren tocar muchos archivos | No refactorizar ahora; para módulos nuevos reutilizar clases y tokens |

### 11.3 Prioridad baja

| # | Problema | Evidencia | Impacto | Recomendación |
|---|---|---|---|---|
| B1 | `GET /api/configuracion/negocio` no tiene `PUT` ni pantalla de edición | `backend/src/routes/configuracion.js` | La configuración solo se puede cargar por SQL | Añadir edición cuando se autorice |
| B2 | El dashboard no filtra abonos, domicilios, inventario ni clientes por fecha | `backend/src/routes/dashboard.js` | Los indicadores pueden interpretarse como del periodo cuando no lo son | Documentarlo en la UI o añadir filtros |
| B3 | `pedido.estado` sin CHECK en base | Comentario en `backend/src/services/estadosPedido.js` | Integridad depende del código | Mantener validación; evaluar CHECK en una migración futura |
| B4 | `venta.metodo_pago` es texto libre | `backend/src/routes/dashboard.js` agrupa con `LIKE` | Nuevos textos pueden caer en “Otros” | Estandarizar catálogo de métodos si se requiere |
| B5 | No hay `engines` ni versión de Node fijada | `package.json` raíz/backend/frontend | Diferencias entre entornos | Añadir `.nvmrc`/`engines` en una tarea de infraestructura |
| B6 | No hay CI ni configuración de despliegue versionada | No se encontró `render.yaml`, `vercel.json`, workflows | Despliegue manual y no reproducible | Versionar configuración cuando se estabilice |
| B7 | No hay pruebas automatizadas de integración reales | `backend/tests/*.mjs` son scripts manuales | Regresiones silenciosas | Añadir un runner y pruebas de humo antes de Compras |

---

## 12. Recomendaciones técnicas

### 12.1 Antes de tocar Proveedores y Compras

1. **Obtener el esquema real** de Neon (`pg_dump --schema-only`) y guardarlo en `backend/sql/schema-base.sql` o en documentación. Sin esto, cualquier DDL nuevo puede chocar concolumnas, tipos o restricciones existentes.
2. **Confirmar el estado real de las migraciones** ejecutando consultas de solo lectura contra `information_schema` y `pg_constraint`. No asumir que “NO APLICADA” en el archivo significa que no está en la base.
3. **Resolver los duplicados de nombre de producto** antes de plantear cualquier índice único. La migración existente ya documenta los grupos; hace falta una decisión de negocio.
4. **No modificar** `producto`, `producto_variante`, `venta`, `pedido` ni `pago` en la primera entrega de Compras. Solo agregar tablas nuevas y, si se aprueba, una tabla de movimientos.
5. **Mantener el SQL parametrizado** y el patrón de transacciones existente (`pool.connect`, `BEGIN`, `COMMIT`, `ROLLBACK`).

### 12.2 Arquitectura recomendada para los nuevos módulos

- **Backend:** crear `proveedoresAdmin.js` y `comprasAdmin.js` en `backend/src/routes/`, montados en `/api/admin/proveedores` y `/api/admin/compras`.
- **Servicios:** extraer la lógica de recepción de compra a `backend/src/services/compras.js` si la ruta supera ~200 líneas. La recepción debe ser una transacción atómica.
- **Frontend:** crear `frontend/src/features/admin/proveedores/` y `frontend/src/features/admin/compras/` con el patrón `Componente.jsx` + `Componente.css`.
- **API:** agregar helpers en `frontend/src/shared/services/api.js` usando `peticionAdmin`.
- **Permisos:** sembrar `Proveedores:*` y `Compras:*` en `permiso`; asignarlos a Administrador en la misma migración si se quiere que el panel sea usable de inmediato.
- **Menú:** agregar un grupo “Compras y Proveedores” en `AdminLayout.jsx`, con iconos `Building2` y `ClipboardList` (o similares de `lucide-react`).
- **Roles:** añadir los módulos a `MODULOS` de `Roles.jsx` como fallback, aunque el catálogo real venga del backend.
- **Tema oscuro:** añadir `.proveedores-page` y `.compras-page` a las reglas de `AdminTheme.css`.

### 12.3 Calidad y pruebas

- Añadir pruebas de humo para:
  - matriz de permisos (cada ruta con y sin permiso);
  - stock: venta, cancelación, recepción de compra y concurrencia;
  - transiciones de estado de compra;
  - validación de proveedor y líneas de compra;
  - que un rol sin permiso reciba 403 y no 500.
- Probar en una base de staging, nunca directamente en producción.
- Verificar que las rutas nuevas queden protegidas por `guardSesion` (no agregarlas a `rutasPublicas.js`).

### 12.4 Deuda técnica que conviene abordar después

- Paginación en servidor para Productos, Ventas, Clientes, Pedidos, Roles y Usuarios.
- Centralizar el cliente HTTP y eliminar los `fetch` directos duplicados.
- Implementar o retirar la foto de perfil.
- Implementar un historial de inventario que también registre ventas y pedidos (fase posterior).
- Añadir auditoría básica (`creado_por`, `actualizado_por`, `creado_en`, `actualizado_en`) en tablas nuevas.
- Añadir un runner de migraciones y una tabla `schema_migrations`.

---

## 13. Plan de integración de Proveedores y Compras

### 13.1 Objetivo

Incorporar dos módulos nuevos al panel administrativo sin alterar el comportamiento actual de tienda, ventas, pedidos, abonos, domicilios ni dashboard:

- **Proveedores:** catálogo de terceros que suministran productos.
- **Compras:** órdenes de compra con líneas por variante, costo y recepción de mercancía que incrementa el stock.

### 13.2 Principios de no regresión

1. **Solo agregar.** No renombrar ni eliminar columnas, rutas, permisos ni componentes existentes.
2. **No tocar el stock al crear una compra.** El stock cambia únicamente al **recibir** la compra, dentro de una transacción.
3. **No tocar ventas ni pedidos.** Compras es un flujo independiente; solo comparte `producto_variante.stock`.
4. **No cambiar la identidad visual.** Reutilizar tokens, clases y componentes.
5. **No cambiar la navegación.** Usar el mismo patrón de `adminView` y `renderContenido`.
6. **No aplicar la migración automáticamente.** Entregar el SQL y ejecutarlo a mano con autorización.
7. **No asumir tipos.** Confirmar el esquema real antes de crear las claves foráneas.

### 13.3 Modelo de datos propuesto

> **Este SQL es una propuesta, no se ha ejecutado.** Los tipos `INTEGER`/`BIGINT` deben ajustarse al esquema real de `producto_variante`, `usuario` y `venta` (probablemente `INTEGER`).

```sql
-- =========================================================
-- PROPUESTA: Proveedores y Compras
-- NO EJECUTAR sin revisar el esquema real y aprobar la migración.
-- Convención: SQL idempotente, sin borrar datos.
-- =========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS proveedor (
  id_proveedor BIGSERIAL PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL,
  nit          VARCHAR(30),
  contacto     VARCHAR(100),
  telefono     VARCHAR(30),
  correo       VARCHAR(150),
  direccion    VARCHAR(255),
  ciudad       VARCHAR(100),
  estado       BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS proveedor_nombre_uidx
  ON proveedor (LOWER(btrim(nombre)));

CREATE INDEX IF NOT EXISTS proveedor_estado_idx
  ON proveedor (estado, nombre);

CREATE TABLE IF NOT EXISTS compra (
  id_compra      BIGSERIAL PRIMARY KEY,
  codigo         VARCHAR(20),
  id_proveedor   BIGINT NOT NULL REFERENCES proveedor(id_proveedor),
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  estado         VARCHAR(20) NOT NULL DEFAULT 'Borrador',
  subtotal       NUMERIC(12,2) NOT NULL DEFAULT 0,
  impuestos      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total          NUMERIC(12,2) NOT NULL DEFAULT 0,
  observaciones  TEXT,
  registrado_por INTEGER REFERENCES usuario(id_usuario) ON DELETE SET NULL,
  recibido_en    TIMESTAMPTZ,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT compra_estado_check
    CHECK (estado IN ('Borrador', 'Confirmada', 'Recibida', 'Anulada')),
  CONSTRAINT compra_totales_check
    CHECK (subtotal >= 0 AND impuestos >= 0 AND total >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS compra_codigo_uidx
  ON compra (codigo)
  WHERE codigo IS NOT NULL;

CREATE INDEX IF NOT EXISTS compra_proveedor_idx
  ON compra (id_proveedor, fecha DESC);

CREATE INDEX IF NOT EXISTS compra_estado_idx
  ON compra (estado, fecha DESC);

CREATE TABLE IF NOT EXISTS detalle_compra (
  id_detalle      BIGSERIAL PRIMARY KEY,
  id_compra       BIGINT NOT NULL REFERENCES compra(id_compra) ON DELETE CASCADE,
  id_variante     INTEGER NOT NULL REFERENCES producto_variante(id_variante),
  cantidad        INTEGER NOT NULL,
  costo_unitario  NUMERIC(12,2) NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL,
  CONSTRAINT detalle_compra_cantidad_check CHECK (cantidad > 0),
  CONSTRAINT detalle_compra_costo_check CHECK (costo_unitario >= 0),
  CONSTRAINT detalle_compra_subtotal_check CHECK (subtotal >= 0),
  CONSTRAINT detalle_compra_variante_uidx UNIQUE (id_compra, id_variante)
);

CREATE INDEX IF NOT EXISTS detalle_compra_variante_idx
  ON detalle_compra (id_variante);

-- Historial de inventario (recomendado; no obligatorio para la primera entrega)
CREATE TABLE IF NOT EXISTS movimiento_inventario (
  id_movimiento   BIGSERIAL PRIMARY KEY,
  id_variante     INTEGER NOT NULL REFERENCES producto_variante(id_variante),
  tipo            VARCHAR(20) NOT NULL,
  cantidad        INTEGER NOT NULL,
  motivo          VARCHAR(30) NOT NULL,
  id_compra       BIGINT REFERENCES compra(id_compra) ON DELETE SET NULL,
  id_venta        INTEGER REFERENCES venta(id_venta) ON DELETE SET NULL,
  id_pedido       INTEGER REFERENCES pedido(id_pedido) ON DELETE SET NULL,
  registrado_por  INTEGER REFERENCES usuario(id_usuario) ON DELETE SET NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT movimiento_inventario_tipo_check
    CHECK (tipo IN ('Entrada', 'Salida', 'Ajuste')),
  CONSTRAINT movimiento_inventario_cantidad_check
    CHECK (cantidad > 0)
);

CREATE INDEX IF NOT EXISTS movimiento_inventario_variante_idx
  ON movimiento_inventario (id_variante, creado_en DESC);

-- Permisos nuevos (sin asumir un UNIQUE en permiso.nombre)
INSERT INTO permiso (nombre, estado)
SELECT v.nombre, TRUE
FROM (VALUES
  ('Proveedores:Consultar'),
  ('Proveedores:Crear'),
  ('Proveedores:Actualizar'),
  ('Proveedores:Cambiar estado'),
  ('Proveedores:Eliminar'),
  ('Compras:Consultar'),
  ('Compras:Crear'),
  ('Compras:Actualizar'),
  ('Compras:Cambiar estado')
) AS v(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM permiso p WHERE p.nombre = v.nombre
);

-- Asignar los permisos nuevos al rol Administrador.
-- Necesario porque requierePrivilegio NO tiene bypass y la UI protege
-- al rol Administrador contra edición.
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM rol r
CROSS JOIN permiso p
WHERE r.nombre = 'Administrador'
  AND p.nombre IN (
    'Proveedores:Consultar', 'Proveedores:Crear',
    'Proveedores:Actualizar', 'Proveedores:Cambiar estado',
    'Proveedores:Eliminar',
    'Compras:Consultar', 'Compras:Crear',
    'Compras:Actualizar', 'Compras:Cambiar estado'
  )
  AND NOT EXISTS (
    SELECT 1 FROM rol_permiso rp
    WHERE rp.id_rol = r.id_rol AND rp.id_permiso = p.id_permiso
  );

COMMIT;
```

**Decisión sobre estados de compra:**

| Transición | Stock | Quién |
|---|---|---|
| `Borrador → Confirmada` | No cambia | `Compras:Cambiar estado` |
| `Confirmada → Recibida` | **Incrementa** `producto_variante.stock` y registra movimiento | `Compras:Cambiar estado` |
| `Borrador/Confirmada → Anulada` | No cambia | `Compras:Cambiar estado` |
| `Recibida → *` | No permitido (para reversar haría falta una devolución explícita) | — |

**Cálculo de totales:** siempre en el backend, nunca confiar en el total del frontend. `subtotal = Σ(cantidad × costo_unitario)`, `total = subtotal + impuestos`.

### 13.4 Backend propuesto

#### Archivo `backend/src/routes/proveedoresAdmin.js`

```text
router.use(verificarToken, bloquearCambioPendiente)

GET    /                    Proveedores:Consultar    lista con búsqueda/paginación
GET    /:id                 Proveedores:Consultar    detalle
POST   /                    Proveedores:Crear        crear
PUT    /:id                 Proveedores:Actualizar   editar
PATCH  /:id/estado          Proveedores:Cambiar estado
DELETE /:id                 Proveedores:Eliminar     solo si no tiene compras; si tiene, 409
```

Validaciones mínimas:

- `nombre` obligatorio, ≤ 150, único normalizado.
- `correo` opcional con formato válido.
- `nit` opcional; si se exige único, validar duplicado.
- `estado` booleano; el `PATCH` recibe `{ estado: true|false }`.

#### Archivo `backend/src/routes/comprasAdmin.js`

```text
router.use(verificarToken, bloquearCambioPendiente)

GET    /variantes           Compras:Consultar|Crear   buscar variantes activas (q)
GET    /                    Compras:Consultar         lista con filtros y paginación
GET    /:id                 Compras:Consultar         detalle con líneas
POST   /                    Compras:Crear             crear en Borrador
PUT    /:id                 Compras:Actualizar        editar solo en Borrador
PATCH  /:id/estado          Compras:Cambiar estado    transiciones
```

Reglas:

- Declarar `/variantes` antes de `/:id`.
- `POST` valida proveedor activo, al menos una línea, variante existente, cantidad entera > 0 y costo ≥ 0.
- `PUT` solo permite `Borrador`; si está `Confirmada`, `Recibida` o `Anulada`, responde 409.
- `PATCH /:id/estado`:
  - `Borrador → Confirmada`;
  - `Confirmada → Recibida` (transacción con `SELECT ... FOR UPDATE` sobre las variantes, `UPDATE stock = stock + cantidad`, `INSERT movimiento_inventario`, `UPDATE compra SET estado='Recibida', recibido_en=now()`);
  - `Borrador|Confirmada → Anulada`;
  - cualquier otra transición → 409.
- `GET /` devuelve `{ compras, total, pagina, porPagina, totalPaginas }`.
- Errores con el mismo formato `{ error }` / `{ error, campo }`.
- No permitir editar ni eliminar una compra `Recibida`.

#### Montaje en `backend/src/app.js`

```js
import proveedoresAdminRouter from './routes/proveedoresAdmin.js'
import comprasAdminRouter from './routes/comprasAdmin.js'

app.use('/api/admin/proveedores', proveedoresAdminRouter)
app.use('/api/admin/compras', comprasAdminRouter)
```

No agregar estas rutas a `rutasPublicas.js`.

#### Servicio opcional `backend/src/services/compras.js`

Extraer:

- `calcularTotales(lineas)`;
- `crearCompra(db, datos, idUsuario)`;
- `actualizarCompra(db, id, datos)`;
- `recibirCompra(db, id, idUsuario)`;
- `anularCompra(db, id)`;
- `listarCompras(filtros)`.

Esto mantiene la ruta delgada y permite probar la recepción de stock sin HTTP.

### 13.5 Frontend propuesto

#### Helpers en `frontend/src/shared/services/api.js`

```js
// Proveedores
export async function obtenerProveedoresAdmin({ q = '', pagina = 1, porPagina = 10 } = {}) { ... }
export async function obtenerProveedorAdmin(id) { ... }
export async function crearProveedorAdmin(datos) { ... }
export async function actualizarProveedorAdmin(id, datos) { ... }
export async function cambiarEstadoProveedorAdmin(id, estado) { ... }
export async function eliminarProveedorAdmin(id) { ... }

// Compras
export async function obtenerComprasAdmin({ q = '', estado = '', idProveedor = '', pagina = 1, porPagina = 10 } = {}) { ... }
export async function obtenerCompraAdmin(id) { ... }
export async function crearCompraAdmin(datos) { ... }
export async function actualizarCompraAdmin(id, datos) { ... }
export async function cambiarEstadoCompraAdmin(id, estado) { ... }
export async function buscarVariantesCompra(q) { ... }
```

Todos con `peticionAdmin` y `mensajeError` en español.

#### Componente `frontend/src/features/admin/proveedores/Proveedores.jsx`

- Cabecera: título, descripción, botón “Nuevo proveedor”, buscador.
- Tabla: código/ID, nombre, NIT, contacto, teléfono, correo, ciudad, estado, acciones.
- Modal de formulario: nombre, NIT, contacto, teléfono, correo, dirección, ciudad, estado.
- Confirmación para activar/desactivar y eliminar.
- Toast de éxito/error.
- `Pagination`.
- Guardas: `Proveedores:Crear`, `Proveedores:Actualizar`, `Proveedores:Cambiar estado`, `Proveedores:Eliminar`.
- Si no tiene `Proveedores:Consultar`, el módulo no aparece en el menú.

#### Componente `frontend/src/features/admin/compras/Compras.jsx`

- Cabecera: título, botón “Nueva compra”, filtros por estado, proveedor y búsqueda.
- Tabla: código, proveedor, fecha, cantidad de líneas, total, estado, acciones (ver, editar si Borrador, confirmar, recibir, anular).
- Modal de detalle: datos de cabecera + tabla de líneas + totales.
- Modal de formulario:
  - select de proveedor activo;
  - fecha;
  - observaciones;
  - editor de líneas: buscar variante por producto/talla/color, cantidad, costo unitario, subtotal calculado;
  - totales calculados en pantalla, pero **recalculados en backend**;
  - botón “Guardar borrador”.
- Confirmación explícita para “Confirmar” y “Recibir”, advirtiendo que recibir incrementa el stock.
- No permitir editar/eliminar una compra recibida.
- `Pagination`, `ConfirmDialog`, `useToast`.
- Guardas: `Compras:Consultar`, `Compras:Crear`, `Compras:Actualizar`, `Compras:Cambiar estado`.

#### Integración en `AdminLayout.jsx`

1. Importar `Proveedores` y `Compras`.
2. Agregar iconos `Building2` y `ClipboardList` a la importación de `lucide-react`.
3. Crear un grupo:

```js
const menuCompras = [
  { nombre: "Proveedores", vista: "proveedores", icono: Building2 },
  { nombre: "Compras", vista: "compras", icono: ClipboardList }
].filter((item) => tienePermiso(user, item.nombre, "Consultar"));
```

4. Incluirlo en `modulosDisponibles` para la búsqueda.
5. Agregar `case "proveedores"` y `case "compras"` en `renderContenido`.
6. Renderizar un tercer acordeón “Compras y Proveedores” con el mismo patrón de `menuProductos`/`menuVentas`.
7. Ajustar `vistaInicial` si se quiere que Compras sea la primera vista cuando no haya otras; no es obligatorio.

#### Integración en `Roles.jsx`

Agregar a `MODULOS`:

```js
"Proveedores",
"Compras",
```

No cambiar `PRIVILEGIOS`; “Cambiar estado” ya se maneja como columna extra del catálogo.

#### Integración visual

- Crear `Proveedores.css` y `Compras.css` siguiendo el patrón de `Productos.css`/`Roles.css`.
- Añadir `.proveedores-page` y `.compras-page` a las reglas de `AdminTheme.css` para el modo oscuro.
- Reutilizar `ConfirmDialog.css`, `Pagination.css`, `Toast.css` y las clases de botones existentes.
- No cambiar `variables.css`.

### 13.6 Orden de implementación recomendado

| Fase | Entregable | Criterio de aceptación |
|---|---|---|
| 0 | Esquema real confirmado | `pg_dump --schema-only` revisado; tipos de `id_variante`, `id_usuario`, `id_venta` confirmados |
| 1 | Migración `2026-11-09_proveedores_compras.sql` | Archivo creado, idempotente, **no ejecutado**; revisado por el responsable de BD |
| 2 | Backend Proveedores | CRUD funciona con permisos; 403 sin permiso; 409 en duplicados |
| 3 | Backend Compras | Crear/editar borrador; confirmar; recibir incrementa stock en transacción; anular no toca stock |
| 4 | API frontend + Proveedores UI | Tabla, formulario, estado, paginación, toasts |
| 5 | Compras UI | Tabla, detalle, formulario con líneas, confirmar/recibir/anular |
| 6 | Menú, permisos y tema | Módulos visibles solo con permiso; modo oscuro correcto |
| 7 | Pruebas | Matriz de permisos, stock, concurrencia y regresión de Ventas/Pedidos |

### 13.7 Pruebas mínimas de aceptación

**Proveedores**

- [ ] Crear proveedor con nombre único.
- [ ] Rechazar nombre duplicado normalizado (mayúsculas/espacios).
- [ ] Editar proveedor.
- [ ] Activar/desactivar.
- [ ] Eliminar solo si no tiene compras; si tiene, 409.
- [ ] Sin `Proveedores:Consultar` → 403 y módulo oculto.
- [ ] Con `Proveedores:Crear` pero sin `Consultar` → no puede listar (comportamiento esperado del backend).

**Compras**

- [ ] Crear compra en Borrador con una o más líneas.
- [ ] El backend recalcula subtotal/total e ignora totales manipulados.
- [ ] Editar solo en Borrador.
- [ ] Confirmar cambia estado sin tocar stock.
- [ ] Recibir incrementa stock exactamente una vez y registra movimiento.
- [ ] Recibir dos veces la misma compra → 409.
- [ ] Anular Borrador/Confirmada no toca stock.
- [ ] No se puede anular una Recibida.
- [ ] Sin `Compras:Consultar` → 403 y módulo oculto.
- [ ] La recepción concurrente de dos compras sobre la misma variante no pierde unidades (`FOR UPDATE`).

**Regresión**

- [ ] Ventas de mostrador siguen descontando stock.
- [ ] Cancelar pedido sigue reponiendo stock.
- [ ] Entregar contra entrega sigue registrando el saldo.
- [ ] Abonos siguen funcionando y el dashboard sigue cargando.
- [ ] Cotizaciones/productos y catálogo público no cambian.
- [ ] Las rutas nuevas no aparecen en `rutasPublicas.js`.
- [ ] El modo claro/oscuro del panel no se rompe.

### 13.8 Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El esquema real no coincide con lo inferido | Confirmar con `pg_dump` antes de escribir la migración |
| La recepción de compra duplica stock por doble clic | Bloquear botón en UI + transición de estado atómica + `UPDATE ... WHERE estado = 'Confirmada'` |
| Dos recepciones concurrentes | `SELECT ... FOR UPDATE` sobre la compra y las variantes |
| El Administrador no ve los módulos nuevos | Sembrar permisos y asignarlos a Administrador en la migración |
| Se rompe el dashboard por la nueva tabla | No modificar consultas existentes; agregar métricas en una fase posterior |
| Los roles personalizados no pueden usar los módulos | Asignar permisos desde el catálogo; no usar `soloRoles` en las rutas nuevas |
| Se pierde la identidad visual | Reutilizar tokens/clases y añadir overrides de tema oscuro |
| Se aplica la migración sin autorización | Entregar el archivo como propuesta y documentar el orden de ejecución |

### 13.9 Archivos que se crearían o modificarían

**Nuevos:**

```text
backend/sql/2026-11-09_proveedores_compras.sql
backend/src/routes/proveedoresAdmin.js
backend/src/routes/comprasAdmin.js
backend/src/services/compras.js            (opcional, recomendado)
frontend/src/features/admin/proveedores/Proveedores.jsx
frontend/src/features/admin/proveedores/Proveedores.css
frontend/src/features/admin/compras/Compras.jsx
frontend/src/features/admin/compras/Compras.css
```

**Modificados (cambios mínimos y aditivos):**

```text
backend/src/app.js                         # imports + app.use de las dos rutas
frontend/src/shared/services/api.js        # helpers nuevos al final
frontend/src/features/admin/AdminLayout.jsx # imports, menú, casos de render
frontend/src/features/admin/roles/Roles.jsx # dos strings en MODULOS
frontend/src/features/admin/AdminTheme.css  # dos selectores de página
```

**No se tocarían:**

```text
backend/src/routes/ventas.js
backend/src/routes/pedidos.js
backend/src/routes/abonos.js
backend/src/routes/domicilios.js
backend/src/services/estadosPedido.js
backend/src/services/abonos.js
frontend/src/App.jsx
frontend/src/shared/styles/variables.css
```

---

## Anexo A. Evidencia de rutas y permisos

- `backend/src/app.js`: montaje y orden de middlewares.
- `backend/src/middlewares/auth.js`: `verificarToken`, `requierePrivilegio`, `requierePrivilegioAlguno`, `obtenerPermisos`.
- `backend/src/middlewares/guardSesion.js`: denegación por defecto.
- `backend/src/middlewares/rutasPublicas.js`: lista blanca.
- `backend/src/routes/*.js`: cada ruta y su `requierePrivilegio`.
- `frontend/src/features/admin/AdminLayout.jsx`: menú, módulos y render.
- `frontend/src/features/admin/roles/Roles.jsx`: catálogo fallback y UI de permisos.
- `frontend/src/features/admin/utils/permisos.js`: `tienePermiso`.

## Anexo B. Evidencia de base de datos

- `backend/sql/2026-10-22_domicilio_ubicacion_divipola.sql`
- `backend/sql/2026-10-22_pedido_costo_envio.sql`
- `backend/sql/2026-10-22_pedido_estado_pago.sql`
- `backend/sql/2026-10-23_comprobante_pago.sql`
- `backend/sql/2026-10-25_ventas_pagos_notificaciones.sql`
- `backend/sql/2026-10-27_configuracion_negocio.sql` (NO APLICADA)
- `backend/sql/2026-10-27_venta_idempotencia.sql` (NO APLICADA)
- `backend/sql/2026-10-27_producto_nombre_unico.sql` (NO APLICAR)
- `backend/sql/backfill_ventas_pedidos.sql`
- `backend/src/models/categorias.js` (columnas de `categoria` y seeds)

## Anexo C. Evidencia de diseño

- `frontend/src/shared/styles/variables.css`
- `frontend/src/features/admin/AdminLayout.css`
- `frontend/src/features/admin/AdminTheme.css`
- `frontend/src/features/admin/AdminDesign.css`
- CSS por módulo en `frontend/src/features/admin/*/*.css`
- `frontend/vite.config.js` (PWA y manifest)

---

**Fin del documento.**
