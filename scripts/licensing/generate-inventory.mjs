#!/usr/bin/env node
/**
 * PASO 1 - Auditoria de dependencias (SENA, ficha 3256538)
 * STORE LA MANSION
 *
 * Genera licenses/inventory.json y copia los textos originales de licencia
 * desde node_modules hacia licenses/frontend|backend/<nombre>@<version>/.
 *
 * No instala, actualiza ni elimina paquetes. Solo LEE package.json,
 * package-lock.json, node_modules y el codigo fuente del proyecto.
 * Ejecutar desde la raiz del repositorio:
 *   node scripts/licensing/generate-inventory.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECTS = [
  { id: 'frontend', dir: join(ROOT, 'frontend') },
  { id: 'backend', dir: join(ROOT, 'backend') },
];
const OUT_DIR = join(ROOT, 'licenses');
const SCAN_EXT = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.vue', '.html', '.css']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'licenses']);
const MAX_USOS = 5;
const MAX_PADRES = 10;
const LICENSE_FILE_RE = /^(LICENSE|LICENCE|COPYING|NOTICE|UNLICENSE)/i;
const SPECIAL_RE = /(GPL|MPL|EPL|CC-BY|SSPL|EUPL|CDDL|OSL|RPL|Sleepycat|Commons[- ]Clause|copyleft)/i;
const NO_SPDX_RE = /^SEE LICENSE IN/i;
const UNSPECIFIED_VALUES = new Set(['UNLICENSED', 'UNLICENSED*', '(UNLICENSED)', 'UNKNOWN', '']);

function fail(msg) {
  console.error('ERROR: ' + msg);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function exists(p) {
  try { return existsSync(p); } catch { return false; }
}

function normPath(p) {
  return p.split(sep).join('/');
}

function relFromRoot(p) {
  return normPath(relative(ROOT, p));
}

/* ---------- Normalizacion de licencias ---------- */
function licenseFromValue(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const s = value.trim();
    if (s === '') return null;
    return s;
  }
  if (Array.isArray(value)) {
    const alts = value.map((v) => {
      if (typeof v === 'string') return v.trim();
      if (v && typeof v === 'object') return String(v.type || v.name || '').trim();
      return '';
    }).filter((s) => s !== '');
    return alts.length ? alts.join(' OR ') : null;
  }
  if (typeof value === 'object') {
    const s = String(value.type || value.name || '').trim();
    return s === '' ? null : s;
  }
  return String(value).trim();
}

function normalizeLicense(pkgJson, lockEntry) {
  const candidates = [];
  if (pkgJson) {
    if (pkgJson.license !== undefined) candidates.push({ v: licenseFromValue(pkgJson.license), src: 'license' });
    if (pkgJson.licenses !== undefined) candidates.push({ v: licenseFromValue(pkgJson.licenses), src: 'licenses' });
  }
  if (lockEntry) {
    if (lockEntry.license !== undefined) candidates.push({ v: licenseFromValue(lockEntry.license), src: 'lock:license' });
    if (lockEntry.licenses !== undefined) candidates.push({ v: licenseFromValue(lockEntry.licenses), src: 'lock:licenses' });
  }
  for (const c of candidates) {
    if (c.v) return { licencia: c.v, fuente: c.src };
  }
  return { licencia: null, fuente: null };
}

function licenseCondition(licencia) {
  if (!licencia) return null;
  if (NO_SPDX_RE.test(licencia)) return 'declaracion no SPDX: remite a un archivo externo';
  if (UNSPECIFIED_VALUES.has(licencia.toUpperCase())) return 'declara ausencia de licencia (UNLICENSED): sin permiso de uso otorgado';
  const alternatives = licencia.split(/\s+OR\s+/i);
  if (alternatives.length > 1) {
    return 'expresion SPDX con ' + alternatives.length + ' alternativas: puede acogerse a cualquiera de ellas (' + licencia + ')';
  }
  return null;
}

/* ---------- Repositorio / autor ---------- */
function normalizeRepoUrl(url) {
  if (!url) return null;
  let u = String(url).trim();
  if (!u) return null;
  if (u.startsWith('git+')) u = u.slice(4);
  if (u.startsWith('git://')) u = 'https://' + u.slice(6);
  if (u.startsWith('ssh://git@')) u = 'https://' + u.slice(10);
  if (u.startsWith('git@')) u = 'https://' + u.slice(4).replace(':', '/');
  const short = u.match(/^(github|gitlab|bitbucket):([^/]+\/[^/#]+)$/i);
  if (short) u = 'https://' + short[1].toLowerCase() + '.com/' + short[2];
  if (u.endsWith('.git')) u = u.slice(0, -4);
  return u;
}

function repoAndHomepage(pkgJson, lockEntry) {
  let repositorio = null;
  let fuenteRepo = null;
  const repoRaw = pkgJson ? pkgJson.repository : undefined;
  if (repoRaw !== undefined) {
    const url = typeof repoRaw === 'string' ? repoRaw : (repoRaw && repoRaw.url);
    repositorio = normalizeRepoUrl(url);
    if (repositorio) fuenteRepo = 'repository';
  }
  if (!repositorio && lockEntry && lockEntry.repository !== undefined) {
    const url = typeof lockEntry.repository === 'string' ? lockEntry.repository : (lockEntry.repository && lockEntry.repository.url);
    repositorio = normalizeRepoUrl(url);
    if (repositorio) fuenteRepo = 'lock:repository';
  }
  let homepage = null;
  if (pkgJson && typeof pkgJson.homepage === 'string' && pkgJson.homepage.trim() !== '') {
    homepage = pkgJson.homepage.trim();
  } else if (lockEntry && typeof lockEntry.homepage === 'string' && lockEntry.homepage.trim() !== '') {
    homepage = lockEntry.homepage.trim();
  }
  return { repositorio, fuenteRepo, homepage };
}

function authorFromJson(pkgJson) {
  if (!pkgJson || pkgJson.author === undefined) return null;
  const a = pkgJson.author;
  if (typeof a === 'string' && a.trim() !== '') return a.trim();
  if (a && typeof a === 'object' && typeof a.name === 'string' && a.name.trim() !== '') {
    let out = a.name.trim();
    if (typeof a.email === 'string' && a.email.trim() !== '') out += ' <' + a.email.trim() + '>';
    if (typeof a.url === 'string' && a.url.trim() !== '') out += ' (' + a.url.trim() + ')';
    return out;
  }
  return null;
}

function copyrightFromText(text) {
  if (!text) return null;
  const m = text.match(/Copyright(?:\s*\(c\)|\s*©)?\s+\S[^\n\r]{0,110}/i);
  return m ? m[0].trim() : null;
}

/* ---------- Busqueda de usos (solo directas) ---------- */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildUsageRe(name) {
  const q = "['\"]";
  return new RegExp(
    '(?:(?:from|import|require)\\s*\\(\\s*|from\\s+|import\\s+|@import\\s+|require\\s+)(' + q + ')(' +
    escapeRe(name) + "(?:/[^'\\\"\\n]*)?)\\1",
  );
}

function listSourceFiles(dir, base) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...listSourceFiles(join(dir, e.name), base));
    } else if (e.isFile()) {
      const ext = e.name.slice(e.name.lastIndexOf('.')).toLowerCase();
      if (SCAN_EXT.has(ext)) out.push(join(dir, e.name));
    }
  }
  return out;
}

function findUsages(projectDir, name) {
  const re = buildUsageRe(name);
  const files = listSourceFiles(projectDir, projectDir);
  const usos = [];
  for (const f of files) {
    if (usos.length >= MAX_USOS) break;
    let text;
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    if (re.test(text)) usos.push(relFromRoot(f));
  }
  return usos;
}

/* ---------- Padres de dependencias indirectas ---------- */
function buildParentIndex(packages) {
  const idx = new Map();
  for (const [key, entry] of Object.entries(packages)) {
    if (key === '' || !entry || typeof entry !== 'object') continue;
    const name = pkgNameFromKey(key);
    if (!entry.dependencies) continue;
    for (const dep of Object.keys(entry.dependencies)) {
      if (!idx.has(dep)) idx.set(dep, new Set());
      idx.get(dep).add(name);
    }
  }
  return idx;
}

function pkgNameFromKey(key) {
  const parts = key.split('node_modules/');
  return parts[parts.length - 1];
}

function parentsFor(pkgName, key, parentIndex) {
  const parts = key.split('node_modules/');
  const padres = [];
  if (parts.length > 1) {
    for (let i = parts.length - 2; i >= 0; i--) {
      const seg = parts[i];
      if (seg === '') continue;
      const owner = seg === '' ? '.' : seg;
      if (owner !== '.') padres.push(owner);
    }
  }
  const viaIndex = parentIndex.get(pkgName);
  if (viaIndex) {
    for (const p of viaIndex) {
      if (!padres.includes(p)) padres.push(p);
    }
  }
  const trimmed = padres.slice(0, MAX_PADRES);
  if (padres.length > MAX_PADRES) trimmed.push('... (' + (padres.length - MAX_PADRES) + ' mas)');
  return trimmed;
}

/* ---------- Copia de textos de licencia ---------- */
function collectLicenseFiles(pkgDir) {
  let entries;
  try { entries = readdirSync(pkgDir, { withFileTypes: true }); } catch { return []; }
  const found = [];
  for (const e of entries) {
    if (e.isFile() && LICENSE_FILE_RE.test(e.name)) found.push(e.name);
  }
  return found.sort();
}

function copyLicenseTexts(pkgDir, name, version, projectId) {
  const files = collectLicenseFiles(pkgDir);
  if (files.length === 0) return { copiados: [], rutaTexto: 'no encontrado' };
  const destDir = join(OUT_DIR, projectId, safeDirName(name) + '@' + version);
  mkdirSync(destDir, { recursive: true });
  const copied = [];
  for (const f of files) {
    const src = join(pkgDir, f);
    const dest = join(destDir, f);
    try {
      copyFileSync(src, dest);
      copied.push(f);
    } catch (err) {
      console.warn('AVISO: no se pudo copiar ' + relFromRoot(src) + ': ' + err.message);
    }
  }
  if (copied.length === 0) return { copiados: [], rutaTexto: 'no encontrado' };
  return {
    copiados: copied,
    rutaTexto: copied.map((f) => 'licenses/' + projectId + '/' + safeDirName(name) + '@' + version + '/' + f).join('; '),
  };
}

function safeDirName(name) {
  return name.replace(/\//g, '__');
}

/* ---------- Procesamiento por proyecto ---------- */
function inventoryEntry(record) {
  return record;
}

function auditProject(project, parentIndexFront, parentIndexBack) {
  const { id, dir } = project;
  const rootPkg = readJson(join(dir, 'package.json'));
  const lockPath = join(dir, 'package-lock.json');
  if (!exists(lockPath)) fail('No existe ' + lockPath);
  const lock = readJson(lockPath);
  const packages = lock.packages || {};
  if (!packages['']) fail('El lock de ' + id + ' no tiene entrada raiz');

  const parentIndex = buildParentIndex(packages);
  const directProd = new Set(Object.keys(rootPkg.dependencies || {}));
  const directDev = new Set(Object.keys(rootPkg.devDependencies || {}));

  const records = [];
  const seenNameVersion = new Set();
  const sortedKeys = Object.keys(packages).sort((a, b) => {
    const na = (a.match(/node_modules/g) || []).length;
    const nb = (b.match(/node_modules/g) || []).length;
    if (na !== nb) return na - nb;
    return a.localeCompare(b);
  });

  for (const key of sortedKeys) {
    if (key === '') continue;
    const entry = packages[key];
    if (!entry || typeof entry !== 'object') continue;
    const name = pkgNameFromKey(key);
    if (!name) continue;
    const version = entry.version || null;
    if (!version) continue;
    seenNameVersion.add(name + '@' + version);

    const isTopLevel = key === 'node_modules/' + name;
    const isDirect = isTopLevel && (directProd.has(name) || directDev.has(name));
    let tipo;
    if (isDirect) {
      tipo = directProd.has(name) ? 'directa-produccion' : 'directa-desarrollo';
    } else {
      tipo = (entry.dev === true) ? 'indirecta-desarrollo' : 'indirecta-produccion';
    }

    const installedDir = join(dir, key);
    const installedOk = exists(installedDir) && statSync(installedDir).isDirectory();
    let pkgJson = null;
    let aviso = [];
    if (installedOk) {
      try { pkgJson = readJson(join(installedDir, 'package.json')); } catch { aviso.push('package.json del paquete ilegible; datos tomados del lock'); }
    } else {
      aviso.push('carpeta del paquete no encontrada en node_modules: PENDIENTE DE VERIFICACION');
    }

    const { licencia, fuente } = normalizeLicense(pkgJson, entry);
    const condicion = licenseCondition(licencia);
    let usableLicense = licencia;
    let licenciaNota = null;
    if (licencia && (NO_SPDX_RE.test(licencia) || UNSPECIFIED_VALUES.has(licencia.toUpperCase()) || /SEE LICENSE IN/i.test(licencia))) {
      licenciaNota = licencia;
      usableLicense = null;
    }

    const { repositorio, fuenteRepo, homepage } = repoAndHomepage(pkgJson, entry);
    let autor = authorFromJson(pkgJson);
    let licenciaObjeto = usableLicense;
    if (licenciaNota && !licenciaObjeto) licenciaObjeto = licenciaNota;

    let rutaTexto = 'no encontrado';
    let copiados = [];
    if (installedOk) {
      const res = copyLicenseTexts(installedDir, name, version, id);
      copiados = res.copiados;
      rutaTexto = res.rutaTexto;
    }

    let titular = autor;
    let titularFuente = autor ? 'author de package.json del paquete' : null;
    if (!titular && copiados.length > 0) {
      for (const f of copiados) {
        let text;
        try { text = readFileSync(join(installedDir, f), 'utf8'); } catch { continue; }
        const c = copyrightFromText(text);
        if (c) {
          titular = c;
          titularFuente = 'copyright en ' + relFromRoot(join(installedDir, f));
          break;
        }
      }
    }

    let usadoEn;
    if (isDirect) {
      usadoEn = findUsages(dir, name);
      if (usadoEn.length === 0) aviso.push('no se detectaron imports/require de ' + name + ' en el codigo fuente escaneado');
    } else {
      const padres = parentsFor(name, key, parentIndex);
      usadoEn = padres.length ? ['dependencia de: ' + padres.join(', ')] : ['dependencia de: (sin padres resueltos) PENDIENTE DE VERIFICACION'];
    }

    let estado;
    if (!usableLicense || !installedOk) {
      estado = 'pendiente';
    } else if (copiados.length > 0) {
      estado = 'verificada';
    } else {
      estado = 'declarada-sin-texto';
    }

    const licenciaParaRevision = usableLicense || licenciaNota || '';
    const obligacionEspecial = SPECIAL_RE.test(licenciaParaRevision);

    const record = inventoryEntry({
      nombre: name,
      version,
      proyecto: id,
      tipo,
      licencia: licencia || 'PENDIENTE DE VERIFICACION',
      licencia_fuente: fuente || 'PENDIENTE DE VERIFICACION',
      licencia_multiple: licencia ? (licencia.includes(' OR ') || /licenses/i.test(fuente || '')) : false,
      condicion_licencia: condicion || 'unica licencia declarada',
      licencia_nota: licenciaNota,
      repositorio: repositorio || 'PENDIENTE DE VERIFICACION',
      repositorio_fuente: fuenteRepo || (homepage ? 'homepage (repositorio no declarado)' : 'PENDIENTE DE VERIFICACION'),
      homepage: homepage || null,
      titular: titular || 'PENDIENTE DE VERIFICACION',
      titular_fuente: titularFuente || 'PENDIENTE DE VERIFICACION',
      usado_en: usadoEn,
      texto_licencia_ruta: rutaTexto,
      texto_licencia_archivos: copiados,
      estado,
      obligacion_especial: obligacionEspecial,
      lock_key: key,
      ruta_instalada: installedOk ? relFromRoot(installedDir) : null,
      avisos: aviso,
    });
    records.push(record);
  }

  const totalLock = Object.keys(packages).filter((k) => k !== '').length;
  return { id, records, totalLock, rootName: rootPkg.name };
}

/* ---------- Resumen ---------- */
function countBy(records, fn) {
  const m = new Map();
  for (const r of records) {
    const k = fn(r);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function fmtMap(m) {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => '  ' + k + ': ' + v).join('\n');
}

function main() {
  const generado = new Date().toISOString();
  const results = PROJECTS.map((p) => auditProject(p));
  const all = results.flatMap((r) => r.records);

  const totales = {
    total_registros: all.length,
    por_proyecto: Object.fromEntries(results.map((r) => [r.id, r.records.length])),
    por_tipo: Object.fromEntries(countBy(all, (r) => r.tipo)),
    por_estado: Object.fromEntries(countBy(all, (r) => r.estado)),
    con_obligacion_especial: all.filter((r) => r.obligacion_especial).length,
  };

  const meta = {
    proyecto: 'STORE LA MANSION (SENA - Tecnologia en Analisis y Desarrollo de Software, ficha 3256538)',
    paso: 'PASO 1 de 4: auditoria de dependencias',
    fecha_generacion: generado,
    herramienta: 'scripts/licensing/generate-inventory.mjs (Node, sin dependencias externas)',
    fuente_datos: 'package.json + package-lock.json (lockfileVersion 3) + node_modules de cada proyecto',
    nota_licencias: 'Las licencias son las DECLARADAS por cada paquete; el texto original se copio byte a byte desde node_modules. Cualquier dato no verificable figura como PENDIENTE DE VERIFICACION.',
    totales,
  };

  const inventory = { meta, frontend: results[0].records, backend: results[1].records };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n', 'utf8');

  console.log('=== INVENTARIO DE DEPENDENCIAS - STORE LA MANSION ===');
  console.log('Generado: ' + generado);
  console.log('');
  console.log('Totales por proyecto:');
  for (const r of results) {
    console.log('  ' + r.id + ': ' + r.records.length + ' registros (paquetes en lock sin raiz: ' + r.totalLock + ')');
  }
  console.log('  TOTAL: ' + all.length);
  console.log('');
  console.log('Por tipo:');
  console.log(fmtMap(countBy(all, (r) => r.tipo)));
  console.log('');
  console.log('Por licencia (declarada):');
  console.log(fmtMap(countBy(all, (r) => r.licencia)));
  console.log('');
  console.log('Por estado de verificacion:');
  console.log(fmtMap(countBy(all, (r) => r.estado)));
  console.log('');

  const pendientes = all.filter((r) => r.estado === 'pendiente');
  console.log('PENDIENTES (' + pendientes.length + '):');
  for (const r of pendientes) console.log('  - [' + r.proyecto + '] ' + r.nombre + '@' + r.version + ' licencia=' + r.licencia);
  console.log('');

  const especiales = all.filter((r) => r.obligacion_especial);
  console.log('OBLIGACION ESPECIAL (' + especiales.length + '):');
  for (const r of especiales) console.log('  - [' + r.proyecto + '] ' + r.nombre + '@' + r.version + ' licencia=' + r.licencia);
  console.log('');

  const sinTexto = all.filter((r) => r.estado === 'declarada-sin-texto');
  console.log('DECLARADAS SIN TEXTO (' + sinTexto.length + '):');
  for (const r of sinTexto) console.log('  - [' + r.proyecto + '] ' + r.nombre + '@' + r.version + ' licencia=' + r.licencia);
  console.log('');

  const mismatch = results.filter((r) => r.records.length !== r.totalLock);
  if (mismatch.length > 0) {
    fail('Los registros no coinciden con los paquetes del lock: ' + mismatch.map((r) => r.id).join(', '));
  }
  const licVacia = all.filter((r) => (r.licencia === '' || r.licencia === null) && r.estado !== 'pendiente');
  if (licVacia.length > 0) {
    fail('Registros con licencia vacia sin estado pendiente: ' + licVacia.map((r) => r.nombre).join(', '));
  }
  console.log('Verificacion: registros = paquetes del lock (menos raiz) en ambos proyectos. OK');
  console.log('Verificacion: ningun registro con licencia vacia sin estado pendiente. OK');
  console.log('Salida: ' + relFromRoot(join(OUT_DIR, 'inventory.json')));
}

main();
