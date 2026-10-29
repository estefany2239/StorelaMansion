// Genera el catálogo DIVIPOLA del proyecto a partir del dataset oficial del
// DANE en datos.gov.co (gdxc-w37w). Escribe la misma copia versionada en el
// frontend y en el backend; verificar-divipola.mjs comprueba que sigan iguales.
//
// Uso: node scripts/generar-divipola.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const URL_DANE =
  "https://www.datos.gov.co/resource/gdxc-w37w.csv?$limit=5000";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destinoFrontend = path.join(raiz, "frontend", "src", "data", "divipola.json");
const destinoBackend = path.join(raiz, "backend", "src", "data", "divipola.json");

// Parser CSV mínimo tolerante a comillas (los nombres como "BOGOTÁ, D.C."
// contienen comas dentro de comillas).
const parsearCsv = (texto) => {
  const filas = [];
  let fila = [];
  let campo = "";
  let dentroDeComillas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const caracter = texto[i];

    if (dentroDeComillas) {
      if (caracter === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          dentroDeComillas = false;
        }
      } else {
        campo += caracter;
      }
      continue;
    }

    if (caracter === '"') {
      dentroDeComillas = true;
    } else if (caracter === ",") {
      fila.push(campo);
      campo = "";
    } else if (caracter === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else if (caracter !== "\r") {
      campo += caracter;
    }
  }

  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas;
};

const respuesta = await fetch(URL_DANE);

if (!respuesta.ok) {
  console.error(`No se pudo descargar el dataset del DANE (HTTP ${respuesta.status}).`);
  process.exit(1);
}

const csv = await respuesta.text();
const filas = parsearCsv(csv);

if (filas.length < 2) {
  console.error("El CSV descargado está vacío o no tiene encabezado.");
  process.exit(1);
}

const encabezado = filas[0].map((columna) => columna.trim());
const indice = {
  codDpto: encabezado.indexOf("cod_dpto"),
  dpto: encabezado.indexOf("dpto"),
  codMpio: encabezado.indexOf("cod_mpio"),
  nomMpio: encabezado.indexOf("nom_mpio"),
};

if (Object.values(indice).some((posicion) => posicion < 0)) {
  console.error(`Columnas inesperadas en el CSV: ${encabezado.join(", ")}`);
  process.exit(1);
}

const porDepartamento = new Map();

for (const fila of filas.slice(1)) {
  const codigoDpto = (fila[indice.codDpto] || "").trim();
  const nombreDpto = (fila[indice.dpto] || "").trim();
  const codigoMpio = (fila[indice.codMpio] || "").trim();
  const nombreMpio = (fila[indice.nomMpio] || "").trim();

  if (!codigoDpto || !nombreDpto || !codigoMpio || !nombreMpio) {
    continue;
  }

  if (!porDepartamento.has(codigoDpto)) {
    porDepartamento.set(codigoDpto, {
      codigo: codigoDpto,
      nombre: nombreDpto,
      municipios: [],
    });
  }

  porDepartamento.get(codigoDpto).municipios.push({
    codigo: codigoMpio,
    nombre: nombreMpio,
  });
}

const departamentos = [...porDepartamento.values()]
  .sort((a, b) => a.codigo.localeCompare(b.codigo))
  .map((departamento) => ({
    ...departamento,
    municipios: departamento.municipios.sort((a, b) =>
      a.codigo.localeCompare(b.codigo)
    ),
  }));

const totalMunicipios = departamentos.reduce(
  (acumulado, departamento) => acumulado + departamento.municipios.length,
  0
);

const codigosDuplicados = new Set();
const codigosVistos = new Set();

for (const departamento of departamentos) {
  for (const municipio of departamento.municipios) {
    if (codigosVistos.has(municipio.codigo)) {
      codigosDuplicados.add(municipio.codigo);
    }
    codigosVistos.add(municipio.codigo);

    if (!municipio.codigo.startsWith(departamento.codigo)) {
      console.error(
        `Municipio ${municipio.codigo} (${municipio.nombre}) no pertenece al departamento ${departamento.codigo}.`
      );
      process.exit(1);
    }
  }
}

if (codigosDuplicados.size > 0) {
  console.error(`Códigos municipales duplicados: ${[...codigosDuplicados].join(", ")}`);
  process.exit(1);
}

const tieneBogota = departamentos.some(
  (departamento) =>
    departamento.codigo === "11" &&
    departamento.municipios.some((municipio) => municipio.codigo === "11001")
);

if (!tieneBogota) {
  console.error("Falta Bogotá, D. C. (11 / 11001) en el catálogo.");
  process.exit(1);
}

const catalogo = {
  fuente: "DANE — DIVIPOLA, dataset oficial «DIVIPOLA - Códigos municipios» (datos.gov.co, gdxc-w37w)",
  url: "https://www.datos.gov.co/d/gdxc-w37w",
  generado: new Date().toISOString().slice(0, 10),
  total_departamentos: departamentos.length,
  total_municipios: totalMunicipios,
  departamentos,
};

const json = `${JSON.stringify(catalogo, null, 2)}\n`;

writeFileSync(destinoFrontend, json, "utf8");
writeFileSync(destinoBackend, json, "utf8");

console.log(
  `Catálogo generado: ${departamentos.length} departamentos, ${totalMunicipios} municipios.`
);
console.log(`- ${path.relative(raiz, destinoFrontend)}`);
console.log(`- ${path.relative(raiz, destinoBackend)}`);
