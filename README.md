# Store La Mansión

Monorepositorio con el **frontend** (React + Vite) y el **backend** (Node.js + Express) de Store La Mansión.

## Estructura

```
storemansion-1/
├── frontend/          # React + Vite (interfaz de la tienda y panel admin)
├── backend/           # Node.js + Express (API)
│   ├── src/
│   │   ├── config/        # Variables de entorno y conexión a BD (futuro)
│   │   ├── controllers/   # Lógica de cada endpoint
│   │   ├── routes/        # Definición de rutas
│   │   ├── models/        # Modelos/entidades de la BD
│   │   ├── middlewares/   # Autenticación, validaciones, errores
│   │   ├── services/      # Lógica de negocio
│   │   ├── utils/         # Utilidades
│   │   └── app.js         # Crea la app de Express
│   ├── server.js          # Arranca el servidor
│   ├── .env.example       # Variables de entorno de ejemplo
│   └── package.json
├── .gitignore
├── package.json       # Solo scripts de ayuda
└── README.md
```

## Instalación

Desde la raíz del repositorio:

```powershell
npm run install:all
```

Esto instala las dependencias tanto de `frontend/` como de `backend/`.

Para el backend, copia además `.env.example` a `.env` (ya se incluye un `.env` local):

```powershell
Copy-Item backend\.env.example backend\.env
```

## Cómo correr el proyecto

Se necesitan **dos terminales**.

**Terminal 1 — Frontend** (puerto 5173):

```powershell
npm run dev:frontend
```

Abre http://localhost:5173

**Terminal 2 — Backend** (puerto 3000):

```powershell
npm run dev:backend
```

Verifica el health check en http://localhost:3000/api/health — debe responder:

```json
{ "status": "ok", "app": "Store La Mansión API" }
```

Ambos servidores pueden correr a la vez porque usan puertos distintos (5173 el frontend, 3000 el backend).

## Build del frontend

```powershell
npm run build:frontend
```
