// Comprueba que la zona de cobertura del Valle de Aburrá y sus tarifas
// estén sincronizadas entre frontend y backend, y que los códigos DANE
// existan en el catálogo DIVIPOLA.
//
// Uso: node scripts/verificar-zonas-envio.mjs
// Sale con código 1 si las copias difieren o la configuración es inválida.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rutaFrontend = path.join(raiz, "frontend", "src", "data", "zonas-envio.json");
const rutaBackend = path.join(raiz, "backend", "src", "data", "zonas-envio.json");
const rutaDivipola = path.join(raiz, "frontend", "src", "data", "divipola.json");

const leer = (ruta) => readFileSync(ruta, "utf8");
const hash = (texto) => createHash("sha256").update(texto, "utf8").digest("hex");

const textoFrontend = leer(rutaFrontend);
const textoBackend = leer(rutaBackend);

if (hash(textoFrontend) !== hash(textoBackend)) {
  console.error(
    "Las copias de zonas-envio.json difieren entre frontend y backend.\n" +
      "Copia el archivo canónico a ambas rutas antes de continuar."
  );
  process.exit(1);
}

let zonas;
let divipola;

try {
  zonas = JSON.parse(textoFrontend);
  divipola = JSON.parse(leer(rutaDivipola));
} catch {
  console.error("zonas-envio.json o divipola.json no es JSON válido.");
  process.exit(1);
}

if (!Array.isArray(zonas.valleAburra) || zonas.valleAburra.length === 0) {
  console.error("valleAburra debe ser una lista no vacía de códigos DANE.");
  process.exit(1);
}

const codigos = new Set();
for (const codigo of zonas.valleAburra) {
  if (typeof codigo !== "string" || !/^[0-9]{5}$/.test(codigo)) {
    console.error(`Código DANE inválido en valleAburra: ${codigo}`);
    process.exit(1);
  }
  if (codigos.has(codigo)) {
    console.error(`Código DANE duplicado en valleAburra: ${codigo}`);
    process.exit(1);
  }
  codigos.add(codigo);
}

const esperados = new Set([
  "05001",
  "05079",
  "05088",
  "05129",
  "05212",
  "05266",
  "05308",
  "05360",
  "05380",
  "05631",
]);

if (codigos.size !== esperados.size || [...esperados].some((codigo) => !codigos.has(codigo))) {
  console.error("valleAburra debe contener exactamente los 10 municipios del Valle de Aburrá.");
  process.exit(1);
}

const municipios = new Map();
for (const departamento of divipola.departamentos) {
  for (const municipio of departamento.municipios) {
    municipios.set(municipio.codigo, {
      nombre: municipio.nombre,
      departamento: departamento.nombre,
      codigoDepartamento: departamento.codigo,
    });
  }
}

for (const codigo of codigos) {
  const municipio = municipios.get(codigo);
  if (!municipio) {
    console.error(`El código ${codigo} no existe en el catálogo DIVIPOLA.`);
    process.exit(1);
  }
  if (municipio.codigoDepartamento !== "05" || municipio.departamento !== "ANTIOQUIA") {
    console.error(`El código ${codigo} no pertenece a ANTIOQUIA (05).`);
    process.exit(1);
  }
}

const modosValidos = new Set(["por_confirmar", "fijo", "gratis"]);

for (const clave of ["domicilio", "transportadora"]) {
  const tarifa = zonas.tarifas?.[clave];

  if (!tarifa || !modosValidos.has(tarifa.modo)) {
    console.error(`Falta una tarifa válida para "${clave}".`);
    process.exit(1);
  }
  if (tarifa.modo === "fijo" && (!Number.isFinite(tarifa.valor) || tarifa.valor < 0)) {
    console.error(`La tarifa fija de "${clave}" debe ser un número mayor o igual a 0.`);
    process.exit(1);
  }
}

console.log(
  `Zonas de envío verificadas y sincronizadas: ${codigos.size} municipios del Valle de Aburrá.`
);
console.log(
  `Tarifas: domicilio=${zonas.tarifas.domicilio.modo}, transportadora=${zonas.tarifas.transportadora.modo}.`
);
