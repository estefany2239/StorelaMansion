// =========================================================
// CATÁLOGO PÚBLICO - FILTRADO Y VARIANTES
// =========================================================
// Funciones puras del catálogo público. Antes vivían en
// src/data/productsData.js junto con los datos de ejemplo
// (menProducts/allProducts), ya eliminados: el catálogo real
// siempre llega desde el backend (useCatalogo) y todos los
// llamadores lo pasan explícitamente.

const normalizarNombreColor = (color) =>
  String(color || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const getFilteredProducts = (category, gender, brands, sizes, colors, catalogo) => {
  const tipoKeywords = {
    gorras: 'gorra',
    perfumes: 'perfume',
    relojes: 'reloj',
  };

  const fuente = Array.isArray(catalogo) ? catalogo : [];

  return fuente.filter(product => {
    const prodCat = (product.categoryId || "").toLowerCase().trim();

    let catString = "";
    if (typeof category === 'object' && category !== null) {
      catString = (category.id || category.title || "").toLowerCase().trim();
    } else if (typeof category === 'string') {
      catString = category.toLowerCase().trim();
    }

    const sinFiltroCategoria = !catString || catString === 'todos';

    const matchCategory =
      sinFiltroCategoria ||
      prodCat === catString ||
      prodCat.includes(catString);

    // Categorías de tipo complemento (no usan tallas de ropa)
    const esCategoriaConTipo =
      !sinFiltroCategoria &&
      ['gorras', 'relojes', 'perfumes'].some(t => catString === t || catString.includes(t));

    const esProductoConTipo =
      ['gorras', 'relojes', 'perfumes'].some(t => prodCat === t || prodCat.includes(t));

    const matchGender =
      !gender ||
      product.gender === gender ||
      product.gender === 'unisex';

    if (!matchCategory || !matchGender) return false;

    // Filtro por marca (solo filtra si el usuario seleccionó alguna marca en el aside)
    if (brands && brands.length > 0) {
      if (!product.brand || !brands.includes(product.brand)) {
        return false;
      }
    }

    // En las categorías de tipo complemento los "sizes" son tipos (Gorras,
    // Perfumes, Relojes) y se filtran por nombre.
    if (esCategoriaConTipo && sizes && sizes.length > 0) {
      const nombre = (product.name || '').toLowerCase();
      const coincideTipo = sizes.some(tipo => {
        const kw = tipoKeywords[String(tipo).toLowerCase()] || String(tipo).toLowerCase();
        return nombre.includes(kw);
      });
      if (!coincideTipo) return false;
    } else if (!esProductoConTipo && sizes && sizes.length > 0 && product.size && !sizes.includes(product.size)) {
      return false;
    }

    if (
      colors && colors.length > 0 && product.color &&
      !colors.some(
        (c) => normalizarNombreColor(c) === normalizarNombreColor(product.color)
      )
    ) {
      return false;
    }

    return true;
  });
};

// 6. Variantes por color
//    Agrupa los productos del catálogo que comparten el mismo grupoId
//    (cada variante conserva su propio color). El grupoId lo define
//    manualmente la dueña del proyecto; por defecto es igual al id.
export const getVariantesPorColor = (producto, catalogoCompleto) => {
  if (!producto || typeof producto !== 'object' || !producto.grupoId || !Array.isArray(catalogoCompleto)) {
    return [];
  }

  return catalogoCompleto.filter((item) =>
    item && typeof item === 'object' && String(item.grupoId) === String(producto.grupoId)
  );
};

// 7. Tallas estándar del catálogo público (las que muestra el detalle)
export const TALLAS_ESTANDAR = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// 8. Tallas disponibles por grupo
//    Devuelve SOLO las tallas que existen como producto real dentro del
//    mismo grupoId: nunca se inventa disponibilidad. El catálogo actual
//    define la talla por producto y no por color, así que se comprueba
//    dinámicamente: si dentro del grupo cada color tuviera un juego de
//    tallas distinto, la talla dependería del color recibido y se recorta
//    a ese color; si todos los colores comparten el mismo juego (caso del
//    catálogo actual), el color no altera las tallas.
export const getTallasDisponibles = (producto, catalogoCompleto) => {
  if (!producto || typeof producto !== 'object') return [];

  const catalogo = Array.isArray(catalogoCompleto) ? catalogoCompleto : [];

  const delGrupo =
    producto.grupoId === undefined || producto.grupoId === null
      ? []
      : catalogo.filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            String(item.grupoId) === String(producto.grupoId)
        );

  // Sin compañeros de grupo: solo la talla real del propio producto.
  const base = delGrupo.length > 0 ? delGrupo : [producto];

  const tallasPorColor = new Map();
  base.forEach((item) => {
    if (!item || !item.size || !item.color) return;
    const clave = String(item.color);
    const actuales = tallasPorColor.get(clave) || new Set();
    actuales.add(String(item.size));
    tallasPorColor.set(clave, actuales);
  });

  const juegos = Array.from(tallasPorColor.values()).map((set) =>
    Array.from(set).sort().join('|')
  );
  const tallaDependeDelColor = new Set(juegos).size > 1;

  let fuente = base;
  if (tallaDependeDelColor && producto.color) {
    const mismoColor = base.filter(
      (item) => item && item.color && String(item.color) === String(producto.color)
    );
    if (mismoColor.length > 0) fuente = mismoColor;
  }

  const tallas = [];
  fuente.forEach((item) => {
    if (!item || !item.size) return;
    const talla = String(item.size);
    if (!tallas.includes(talla)) tallas.push(talla);
  });

  if (tallas.length === 0 && producto.size) return [String(producto.size)];
  return tallas;
};
