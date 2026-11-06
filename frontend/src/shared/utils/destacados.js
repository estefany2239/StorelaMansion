// Helpers de "Destacados": resuelve un destacado estático del home a un
// producto real del catálogo (base de datos).
//
// Criterio determinista: se busca por categoría y por nombre (sin tildes,
// en singular y plural), priorizando una coincidencia de categoría. Si hay
// varios productos, se elige el de menor id_producto y luego su menor variante.
// Si no existe coincidencia, se devuelve null.

export const sinTildes = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const resolverDestacado = (def, catalogo) => {
  if (!def || !Array.isArray(catalogo) || catalogo.length === 0) return null;

  const clave = sinTildes(def.name);
  if (!clave) return null;

  const claves = [clave];
  if (clave.endsWith("s")) claves.push(clave.slice(0, -1));

  const coincidencias = catalogo
    .map((p) => {
      const nombre = sinTildes(p.name);
      const categoria = sinTildes(p.categoryId);
      const coincidenciaCategoria = claves.some(
        (c) => c && (categoria === c || categoria === `${c}s`)
      );
      const coincidenciaNombre = claves.some((c) => c && nombre.includes(c));
      if (!coincidenciaCategoria && !coincidenciaNombre) return null;
      return {
        producto: p,
        prioridad: coincidenciaCategoria ? 0 : 1
      };
    })
    .filter(Boolean);

  if (coincidencias.length === 0) return null;

  return coincidencias
    .slice()
    .sort(
      (a, b) =>
        a.prioridad - b.prioridad ||
        Number(a.producto.id_producto ?? a.producto.grupoId) -
          Number(b.producto.id_producto ?? b.producto.grupoId) ||
        Number(a.producto.id) - Number(b.producto.id)
    )[0].producto;
};
