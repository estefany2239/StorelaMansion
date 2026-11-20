#!/usr/bin/env node
/**
 * PASO 2 - Aviso de terceros (SENA, ficha 3256538)
 * STORE LA MANSION
 *
 * Lee licenses/inventory.json (generado en el Paso 1) y licenses/services.json
 * y genera THIRD_PARTY_NOTICES.md en la raiz del repositorio.
 *
 * No instala paquetes ni modifica archivos de la aplicacion.
 * Ejecutar desde la raiz:  node scripts/licensing/generate-notices.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INVENTORY = join(ROOT, 'licenses', 'inventory.json');
const SERVICES = join(ROOT, 'licenses', 'services.json');
const OUT = join(ROOT, 'THIRD_PARTY_NOTICES.md');

function fail(msg) {
  console.error('ERROR: ' + msg);
  process.exit(1);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/* Ordena por nombre de paquete (case-insensitive). */
function porNombre(a, b) {
  return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
}

function celdaLicencia(r) {
  return esc(r.licencia);
}

function celdaTexto(r) {
  if (r.texto_licencia_ruta && r.texto_licencia_ruta !== 'no encontrado') {
    return esc(r.texto_licencia_ruta);
  }
  return 'no encontrado';
}

function tabla(registros) {
  if (registros.length === 0) {
    return '_Ninguna._\n';
  }
  let out = '| Paquete | Versión | Licencia | Estado | Repositorio | Texto de la licencia |\n';
  out += '|---|---|---|---|---|---|\n';
  for (const r of registros) {
    out += '| ' + esc(r.nombre) + ' | ' + esc(r.version) + ' | ' + celdaLicencia(r) + ' | ' +
      esc(r.estado) + ' | ' + esc(r.repositorio) + ' | ' + celdaTexto(r) + ' |\n';
  }
  return out;
}

function main() {
  let inventory;
  let servicesDoc;
  try {
    inventory = JSON.parse(readFileSync(INVENTORY, 'utf8'));
  } catch (err) {
    fail('No se pudo leer ' + INVENTORY + '. Genera primero el inventario (Paso 1): node scripts/licensing/generate-inventory.mjs');
  }
  try {
    servicesDoc = JSON.parse(readFileSync(SERVICES, 'utf8'));
  } catch (err) {
    fail('No se pudo leer ' + SERVICES);
  }

  const fecha = new Date().toISOString();
  const totales = inventory.meta.totales;

  /* ---------- Encabezado ---------- */
  let md = '';
  md += '# THIRD PARTY NOTICES — Aviso de componentes, herramientas y servicios de terceros\n\n';
  md += '**Proyecto:** STORE LA MANSIÓN (tienda virtual + panel administrativo)\n\n';
  md += '**SENA — Tecnología en Análisis y Desarrollo de Software, ficha 3256538. Instructor: Alber Arango.**\n\n';
  md += '**Autoras y desarrolladoras:** Estefany Arango Morales y Hannah Molina Valencia. Beneficiaria: Leidy Juliet Quiroga Herrera.\n\n';
  md += '**Fecha de generación:** ' + fecha + '\n\n';
  md += '**Fuente de los datos:** licenses/inventory.json (Paso 1) y licenses/services.json. Las licencias son las declaradas por cada paquete; los textos originales se conservan byte a byte en licenses/frontend/ y licenses/backend/.\n\n';
  md += '### Resumen\n\n';
  md += '- Total de paquetes: ' + totales.total_registros + ' (frontend: ' + (totales.por_proyecto.frontend || 0) + ', backend: ' + (totales.por_proyecto.backend || 0) + ')\n';
  md += '- Por estado de verificación: verificada: ' + (totales.por_estado.verificada || 0) + ' · declarada-sin-texto: ' + (totales.por_estado['declarada-sin-texto'] || 0) + ' · pendiente: ' + (totales.por_estado.pendiente || 0) + '\n';
  md += '- Paquetes con obligación especial (copyleft/atribución): ' + totales.con_obligacion_especial + '\n\n';
  md += '> La licencia propietaria del proyecto (archivo LICENSE) no reemplaza ni modifica las licencias de terceros listadas aquí.\n\n';

  /* ---------- Secciones 1 y 2 ---------- */
  const grupos = [
    { titulo: '1. Frontend', secciones: [
      { sub: '1.1 Dependencias de producción (directas)', filtro: (r) => r.tipo === 'directa-produccion' },
      { sub: '1.2 Dependencias de desarrollo (directas)', filtro: (r) => r.tipo === 'directa-desarrollo' },
      { sub: '1.3 Indirectas de producción', filtro: (r) => r.tipo === 'indirecta-produccion' },
      { sub: '1.4 Indirectas de desarrollo', filtro: (r) => r.tipo === 'indirecta-desarrollo' },
    ]},
    { titulo: '2. Backend', secciones: [
      { sub: '2.1 Dependencias de producción (directas)', filtro: (r) => r.tipo === 'directa-produccion' },
      { sub: '2.2 Dependencias de desarrollo (directas)', filtro: (r) => r.tipo === 'directa-desarrollo' },
      { sub: '2.3 Indirectas de producción', filtro: (r) => r.tipo === 'indirecta-produccion' },
      { sub: '2.4 Indirectas de desarrollo', filtro: (r) => r.tipo === 'indirecta-desarrollo' },
    ]},
  ];
  const proyectos = [
    { nombre: '1. Frontend', registros: inventory.frontend },
    { nombre: '2. Backend', registros: inventory.backend },
  ];
  let filaTotal = 0;
  proyectos.forEach((p, pi) => {
    const g = grupos[pi];
    md += '## ' + g.titulo + '\n\n';
    for (const s of g.secciones) {
      const regs = p.registros.filter(s.filtro).sort(porNombre);
      filaTotal += regs.length;
      md += '### ' + s.sub + ' (' + regs.length + ')\n\n';
      md += tabla(regs);
      md += '\n';
    }
  });

  /* ---------- Seccion 3: servicios ---------- */
  md += '## 3. Herramientas y servicios externos\n\n';
  md += 'Componentes y servicios del entorno del proyecto (no son dependencias npm listadas en el inventario, salvo React, Express, Vite, jsPDF, Lucide React y React Router DOM, que también aparecen en las secciones 1 y 2).\n\n';
  md += '| Nombre | Tipo | Uso en el proyecto | Licencia / Términos | URL oficial | Estado de verificación |\n';
  md += '|---|---|---|---|---|---|\n';
  let servicios = 0;
  for (const s of servicesDoc.servicios) {
    servicios += 1;
    const lic = s.terminos_url ? ('Términos de servicio: ' + s.terminos_url) : (s.licencia || '');
    md += '| ' + esc(s.nombre) + ' | ' + esc(s.tipo) + ' | ' + esc(s.uso) + ' | ' + esc(lic) + ' | ' + esc(s.url_oficial) + ' | ' + esc(s.estado_verificacion) + ' |\n';
  }
  md += '\n';

  /* ---------- Seccion 4: obligaciones especiales ---------- */
  const especiales = [...inventory.frontend, ...inventory.backend].filter((r) => r.obligacion_especial).sort(porNombre);
  md += '## 4. Licencias con obligaciones especiales (copyleft / atribución)\n\n';
  md += 'Los siguientes paquetes declaran licencias de la familia MPL, CC-BY u otras con condiciones particulares. La obligación concreta de cada una la define el texto original de su licencia (ver columna de texto en las tablas anteriores); este aviso NO interpreta ni sustituye ese texto.\n\n';
  md += '| Paquete | Proyecto | Versión | Licencia | Obligación a revisar en el texto original |\n';
  md += '|---|---|---|---|---|\n';
  for (const r of especiales) {
    let obligacion;
    if (/MPL/i.test(r.licencia)) {
      obligacion = 'MPL: obligaciones de copyleft débil sobre los archivos originalmente cubiertos por la licencia; conservar el aviso de licencia.';
    } else if (/CC-BY/i.test(r.licencia)) {
      obligacion = 'CC-BY: atribución al reutilizar el contenido licenciado (p. ej. datos incluidos en el paquete).';
    } else {
      obligacion = 'Obligación particular de esta licencia: revisar el texto original.';
    }
    md += '| ' + esc(r.nombre) + ' | ' + esc(r.proyecto) + ' | ' + esc(r.version) + ' | ' + esc(r.licencia) + ' | ' + esc(obligacion) + ' |\n';
  }
  md += '\n';

  /* ---------- Seccion 5: pendientes ---------- */
  const pendientes = [...inventory.frontend, ...inventory.backend].filter((r) => r.estado === 'pendiente').sort(porNombre);
  md += '## 5. Paquetes PENDIENTES de verificación\n\n';
  md += 'Paquetes cuya licencia no pudo verificarse por texto en el paquete instalado o cuya declaración no es un SPDX claro. No se asume ninguna licencia para ellos.\n\n';
  md += '| Paquete | Proyecto | Versión | Licencia declarada | Motivo |\n';
  md += '|---|---|---|---|---|\n';
  for (const r of pendientes) {
    const motivo = r.avisos && r.avisos.length ? r.avisos.join('; ') : 'verificación incompleta';
    md += '| ' + esc(r.nombre) + ' | ' + esc(r.proyecto) + ' | ' + esc(r.version) + ' | ' + esc(r.licencia) + ' | ' + esc(motivo) + ' |\n';
  }
  md += '\n';

  /* ---------- Seccion 6: notas ---------- */
  md += '## 6. Notas\n\n';
  md += '- La licencia propietaria del proyecto (LICENSE) no reemplaza las licencias de terceros: cada componente se rige por su propia licencia.\n';
  md += '- Las licencias MIT/ISC/BSD/Apache de las dependencias aplican únicamente a esos componentes de terceros; NO aplican al código original del proyecto.\n';
  md += '- Paquetes con licencia múltiple muestran todas las alternativas declaradas (por ejemplo "(MPL-2.0 OR Apache-2.0)": puede acogerse a cualquiera de las alternativas según el texto original).\n';
  md += '- Cloudinary: no se detectó uso en el código, dependencias ni configuración del proyecto al ' + fecha.slice(0, 10) + '; no se documenta como servicio en uso. Si se incorpora, debe agregarse a licenses/services.json.\n';
  md += '- Los comentarios del código mencionan Render y Vercel como posibles entornos de despliegue/proxy, pero no se encontró configuración de despliegue confirmada: PENDIENTE DE VERIFICACIÓN.\n';
  md += '- Documento generado automáticamente por scripts/licensing/generate-notices.mjs; regenerar tras cada cambio de dependencias.\n';

  writeFileSync(OUT, md, 'utf8');
  console.log('=== THIRD PARTY NOTICES ===');
  console.log('Filas de dependencias: ' + filaTotal + ' (frontend+backend por tipo)');
  console.log('Servicios documentados: ' + servicios);
  console.log('Obligaciones especiales: ' + especiales.length);
  console.log('Pendientes: ' + pendientes.length);
  console.log('Salida: ' + OUT);
}

main();
