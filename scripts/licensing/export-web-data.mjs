#!/usr/bin/env node
/**
 * PASO 3 - Exportación de datos para la página web "Licencias y derechos
 * de autor" (SENA, ficha 3256538). STORE LA MANSIÓN.
 *
 * Lee licenses/inventory.json y licenses/services.json y escribe los JSON
 * del frontend en frontend/src/features/licencias/data/:
 *   - dependencias.json (campos mínimos por paquete + meta)
 *   - servicios.json    (herramientas y servicios externos)
 *
 * No instala paquetes ni modifica archivos existentes de la aplicacion.
 * Ejecutar desde la raiz:  node scripts/licensing/export-web-data.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INVENTORY = join(ROOT, 'licenses', 'inventory.json');
const SERVICES = join(ROOT, 'licenses', 'services.json');
const OUT_DIR = join(ROOT, 'frontend', 'src', 'features', 'licencias', 'data');

function fail(msg) {
  console.error('ERROR: ' + msg);
  process.exit(1);
}

/* IDs SPDX conocidos: solo se enlaza el ID si es un token SPDX simple
   (sin espacios ni operadores). No se inventan IDs. */
const TOKEN_SIMPLE = /^[A-Za-z0-9.\-+]+$/;
const NO_SPDX = ['SEE LICENSE IN', 'UNLICENSED', 'UNKNOWN'];

function alternativasSpdx(licencia) {
  if (!licencia) return [];
  let texto = licencia.trim();
  if (NO_SPDX.some((marca) => texto.toUpperCase().includes(marca))) {
    texto = texto.replace(/SEE LICENSE IN[^\n]*/gi, '');
  }
  const partes = texto
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .split(/\s+(?:OR|AND)\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const salida = [];
  for (const parte of partes) {
    if (!TOKEN_SIMPLE.test(parte)) continue;
    if (NO_SPDX.some((marca) => parte.toUpperCase().includes(marca))) continue;
    salida.push({ id: parte, url: 'https://spdx.org/licenses/' + encodeURIComponent(parte) + '.html' });
  }
  return salida;
}

function paqueteWeb(r) {
  return {
    nombre: r.nombre,
    version: r.version,
    licencia: r.licencia,
    licenciaMultiple: r.licencia_multiple === true,
    tipo: r.tipo,
    estado: r.estado,
    repositorio: r.repositorio,
    usadoEn: Array.isArray(r.usado_en) ? r.usado_en.slice(0, 5) : [],
    textoLicencia: (r.texto_licencia_ruta && r.texto_licencia_ruta !== 'no encontrado') ? r.texto_licencia_ruta : null,
    spdx: alternativasSpdx(r.licencia),
  };
}

function main() {
  let inventory;
  let servicesDoc;
  try {
    inventory = JSON.parse(readFileSync(INVENTORY, 'utf8'));
  } catch {
    fail('No se pudo leer ' + INVENTORY + '. Ejecuta primero generate-inventory.mjs (Paso 1).');
  }
  try {
    servicesDoc = JSON.parse(readFileSync(SERVICES, 'utf8'));
  } catch {
    fail('No se pudo leer ' + SERVICES + '.');
  }

  const todos = [...inventory.frontend, ...inventory.backend];
  const dependencias = {
    meta: {
      generado: inventory.meta.fecha_generacion,
      proyecto: 'STORE LA MANSIÓN',
      total: todos.length,
      porEstado: inventory.meta.totales.por_estado,
    },
    frontend: inventory.frontend.map((r) => ({ ...paqueteWeb(r), proyecto: 'frontend' })),
    backend: inventory.backend.map((r) => ({ ...paqueteWeb(r), proyecto: 'backend' })),
  };

  const servicios = servicesDoc.servicios.map((s) => ({
    nombre: s.nombre,
    tipo: s.tipo,
    uso: s.uso,
    licencia: s.licencia,
    urlOficial: s.url_oficial || null,
    terminosUrl: s.terminos_url || null,
    estado: s.estado_verificacion,
  }));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'dependencias.json'), JSON.stringify(dependencias, null, 2), 'utf8');
  writeFileSync(join(OUT_DIR, 'servicios.json'), JSON.stringify({ generado: dependencias.meta.generado, servicios }, null, 2), 'utf8');

  const conSpdx = todos.filter((r) => paqueteWeb(r).spdx.length > 0).length;
  console.log('=== EXPORT WEB DATA ===');
  console.log('dependencias.json: ' + dependencias.frontend.length + ' frontend + ' + dependencias.backend.length + ' backend');
  console.log('servicios.json: ' + servicios.length + ' servicios');
  console.log('paquetes con enlace SPDX: ' + conSpdx + ' de ' + todos.length);
  console.log('Salida: ' + OUT_DIR);
}

main();
