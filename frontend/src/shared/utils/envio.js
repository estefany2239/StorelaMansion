import ZONAS from "../data/zonas-envio.json";

const CODIGOS_VALLE_ABURRA = new Set(
  (ZONAS.valleAburra || []).map((codigo) => String(codigo))
);

export const esValleAburra = (codigoMunicipio) =>
  CODIGOS_VALLE_ABURRA.has(String(codigoMunicipio || "").trim());

// Igual que el backend: la tarifa pendiente NO se muestra como $0.
export const calcularCostoEnvio = (metodoEnvio) => {
  if (metodoEnvio === "Recoger en tienda") {
    return { costo: 0, pendiente: false };
  }

  const clave = metodoEnvio === "Transportadora" ? "transportadora" : "domicilio";
  const tarifa = ZONAS.tarifas?.[clave] || {};

  if (tarifa.modo === "gratis") {
    return { costo: 0, pendiente: false };
  }

  const valor = Number(tarifa.valor);

  if (tarifa.modo === "fijo" && Number.isFinite(valor) && valor >= 0) {
    return { costo: valor, pendiente: false };
  }

  return { costo: 0, pendiente: true };
};
