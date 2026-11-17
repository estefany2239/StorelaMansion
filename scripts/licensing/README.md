# Inventario de licencias — STORE LA MANSIÓN (PASO 1 de 4)

Cómo regenerar: desde la raíz del repositorio ejecuta `node scripts/licensing/generate-inventory.mjs` (Node puro, sin dependencias externas).

El script lee `package.json`, `package-lock.json` y `node_modules` de `frontend/` y `backend/`, y escanea el código fuente para detectar imports/require de cada dependencia directa.

No instala, actualiza ni elimina paquetes, y no modifica archivos existentes de la aplicación: solo lee y genera salidas.

Carpetas que genera:

- `licenses/inventory.json` — inventario completo (meta, totales, arreglo `frontend[]` y `backend[]` con nombre, versión, tipo, licencia declarada, repositorio, titular, "usado en", ruta del texto, estado y marca de obligación especial).
- `licenses/frontend/<nombre>@<version>/` — textos originales de licencia copiados byte a byte desde `frontend/node_modules/` (en paquetes con scope, `/` se reemplaza por `__`, p. ej. `@babel__core@7.28.5`).
- `licenses/backend/<nombre>@<version>/` — ídem para dependencias del backend.

Estados posibles: `verificada` (licencia SPDX declarada y texto encontrado), `declarada-sin-texto` (declarada pero sin archivo de texto en el paquete) y `pendiente` (no verificable: ver en consola los listados de pendientes).

El resumen por consola muestra totales por proyecto/tipo/licencia, paquetes pendientes y paquetes con obligación especial (GPL, LGPL, MPL, EPL, CC-BY, SSPL u otro copyleft/atribución).

Cualquier dato no verificable se marca literalmente como "PENDIENTE DE VERIFICACIÓN"; nunca se asume una licencia que no esté declarada por el paquete.

Los textos copiados no deben resumirse ni editarse: se conservan como evidencia original para el proceso de licenciamiento.

## PASO 2 — Aviso de terceros

Cómo regenerar: desde la raíz ejecuta `node scripts/licensing/generate-notices.mjs`. Lee `licenses/inventory.json` y `licenses/services.json` (lista de herramientas y servicios externos realmente usados: React, Node.js, Express, Vite, jsPDF, Lucide React, React Router DOM, PostgreSQL, Neon, Brevo, Cloudflare Turnstile, Git, GitHub) y genera `THIRD_PARTY_NOTICES.md` en la raíz.

`licenses/services.json` es un archivo de datos editado a mano: si cambia el entorno (servicio nuevo o retirado), actualízalo y vuelve a generar el aviso.

IMPORTANTE: el aviso también se copia a `frontend/public/LICENSE` y `frontend/public/THIRD_PARTY_NOTICES.md` para que la web pueda enlazarlos como descarga; tras regenerarlos, hay que VOLVER A COPIARlos a `frontend/public/` (y `LICENSE` no se regenera: se edita a mano, bórralo de `frontend/public/` solo si cambias el original).

El archivo `LICENSE` (raíz) es la licencia propietaria del código original: borrador sujeto a revisión del instructor y a la formalización del convenio de transferencia de derechos patrimoniales (la transferencia está PENDIENTE; este documento no la perfecciona).
