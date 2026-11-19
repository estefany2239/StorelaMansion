// Comprueba que las dos copias del catálogo DIVIPOLA (frontend y backend)
// sean idénticas y que el archivo cumpla las invariantes mínimas.
//
// Uso: node scripts/verificar-divipola.mjs
// Sale con código 1 si las copias difieren o el catálogo es inválido.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rutaFrontend = path.join(raiz, "frontend", "src", "data", "divipola.json");
const rutaBackend = path.join(raiz, "backend", "src", "data", "divipola.json");

const leer = (ruta) => readFileSync(ruta, "utf8");
const hash = (texto) => createHash("sha256").update(texto, "utf8").digest("hex");

const textoFrontend = leer(rutaFrontend);
const textoBackend = leer(rutaBackend);

if (hash(textoFrontend) !== hash(textoBackend)) {
  console.error(
    "Las copias del catálogo DIVIPOLA difieren entre frontend y backend.\n" +
      "Ejecuta `node scripts/generar-divipola.mjs` para regenerar ambas."
  );
  process.exit(1);
}

let catalogo;

try {
  catalogo = JSON.parse(textoFrontend);
} catch {
  console.error("divipola.json no es JSON válido.");
  process.exit(1);
}

const departamentos = catalogo.departamentos;

if (!Array.isArray(departamentos) || departamentos.length === 0) {
  console.error("El catálogo no tiene departamentos.");
  process.exit(1);
}

const codigosDepartamento = new Set();
const codigosMunicipio = new Set();
let totalMunicipios = 0;

for (const departamento of departamentos) {
  if (codigosDepartamento.has(departamento.codigo)) {
    console.error(`Departamento duplicado: ${departamento.codigo}`);
    process.exit(1);
  }
  codigosDepartamento.add(departamento.codigo);

  for (const municipio of departamento.municipios) {
    if (codigosMunicipio.has(municipio.codigo)) {
      console.error(`Municipio duplicado: ${municipio.codigo}`);
      process.exit(1);
    }
    codigosMunicipio.add(municipio.codigo);

    if (!municipio.codigo.startsWith(departamento.codigo)) {
      console.error(
        `El municipio ${municipio.codigo} no pertenece al departamento ${departamento.codigo}.`
      );
      process.exit(1);
    }
    totalMunicipios += 1;
  }
}

if (!codigosDepartamento.has("11") || !codigosMunicipio.has("11001")) {
  console.error("Falta Bogotá, D. C. (departamento 11 / municipio 11001).");
  process.exit(1);
}

if (catalogo.total_departamentos !== departamentos.length) {
  console.error(
    `total_departamentos (${catalogo.total_departamentos}) no coincide con los departamentos reales (${departamentos.length}).`
  );
  process.exit(1);
}

if (catalogo.total_municipios !== totalMunicipios) {
  console.error(
    `total_municipios (${catalogo.total_municipios}) no coincide con los municipios reales (${totalMunicipios}).`
  );
  process.exit(1);
}

console.log(
  `Catálogo DIVIPOLA verificado y sincronizado: ${departamentos.length} departamentos, ${totalMunicipios} municipios (incluye Bogotá, D. C.).`
);
