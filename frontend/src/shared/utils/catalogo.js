// =========================================================
// CATÁLOGO PÚBLICO - FILTRADO Y VARIANTES
// =========================================================
// Funciones puras del catálogo público. Antes vivían en
// src/data/productsData.js junto con los datos de ejemplo
// (menProducts/allProducts), ya eliminados: el catálogo real
// siempre llega desde el backend (useCatalogo) y todos los
// llamadores lo pasan explícitamente.
//
// El catálogo puede llegar de dos formas:
// - Agrupado por producto (useCatalogo): cada producto trae `variantes`.
// - Plano (una fila por variante): se agrupa por `grupoId` al consultar.
// Los helpers aceptan ambas para no romper llamadas antiguas.

const normalizarNombreColor = (color) =>
  String(color || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const PLACEHOLDERS_TALLA = new Set([
  "",
  "-",
  "—",
  "sin talla",
  "sin-talla",
  "null",
  "undefined",
  "n/a",
  "no aplica",
]);

const normalizarTalla = (talla) => String(talla ?? "").trim().toUpperCase();

// Devuelve la talla solo cuando es un valor real. Un producto sin talla
// (gorras, relojes, perfumes) no debe mostrar "Sin talla" ni un guion.
export const tallaVisible = (talla) => {
  const valor = String(talla ?? "").trim();
  if (!valor) return "";
  return PLACEHOLDERS_TALLA.has(valor.toLowerCase()) ? "" : valor;
};

// Variantes reales de un producto. Si ya viene agrupado usa su arreglo; si
// viene plano busca las filas del mismo grupo en el catálogo completo.
const variantesDe = (producto, catalogoCompleto) => {
  if (!producto || typeof producto !== "object") return [];

  if (Array.isArray(producto.variantes) && producto.variantes.length > 0) {
    return producto.variantes;
  }

  const catalogo = Array.isArray(catalogoCompleto) ? catalogoCompleto : [];

  if (producto.grupoId !== undefined && producto.grupoId !== null) {
    const delGrupo = catalogo.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        String(item.grupoId) === String(producto.grupoId)
    );

    if (delGrupo.length > 0) {
      return delGrupo.flatMap((item) =>
        Array.isArray(item.variantes) && item.variantes.length > 0
          ? item.variantes
          : [item]
      );
    }
  }

  return [producto];
};

export const getVariantesProducto = variantesDe;

const stockNumerico = (stock) =>
  stock === null || stock === undefined || stock === ""
    ? null
    : Number.isFinite(Number(stock))
      ? Number(stock)
      : null;

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

    const variantes = variantesDe(product, fuente);
    const tallasProducto = variantes
      .map((v) => tallaVisible(v?.size))
      .filter(Boolean);
    const coloresProducto = variantes
      .map((v) => v?.color)
      .filter(Boolean);

    // En las categorías de tipo complemento los "sizes" son tipos (Gorras,
    // Perfumes, Relojes) y se filtran por nombre.
    if (esCategoriaConTipo && sizes && sizes.length > 0) {
      const nombre = (product.name || '').toLowerCase();
      const coincideTipo = sizes.some(tipo => {
        const kw = tipoKeywords[String(tipo).toLowerCase()] || String(tipo).toLowerCase();
        return nombre.includes(kw);
      });
      if (!coincideTipo) return false;
    } else if (
      !esProductoConTipo &&
      sizes &&
      sizes.length > 0 &&
      tallasProducto.length > 0 &&
      !tallasProducto.some((talla) => sizes.includes(talla))
    ) {
      return false;
    }

    if (colors && colors.length > 0 && coloresProducto.length > 0) {
      const coincideColor = coloresProducto.some((color) =>
        colors.some(
          (c) => normalizarNombreColor(c) === normalizarNombreColor(color)
        )
      );
      if (!coincideColor) return false;
    }

    return true;
  });
};

// 6. Variantes por color
//    Agrupa los productos del catálogo que comparten el mismo grupoId
//    (cada variante conserva su propio color). El grupoId lo define
//    manualmente la dueña del proyecto; por defecto es igual al id.
export const getVariantesPorColor = (producto, catalogoCompleto) =>
  variantesDe(producto, catalogoCompleto);

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

  const base = variantesDe(producto, catalogoCompleto);

  const tallasPorColor = new Map();
  base.forEach((item) => {
    const talla = tallaVisible(item?.size);
    if (!talla || !item.color) return;
    const clave = String(item.color);
    const actuales = tallasPorColor.get(clave) || new Set();
    actuales.add(talla);
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
    const talla = tallaVisible(item?.size);
    if (!talla) return;
    if (!tallas.includes(talla)) tallas.push(talla);
  });

  const propia = tallaVisible(producto.size);
  if (tallas.length === 0 && propia) return [propia];
  return tallas;
};

// 9. Variante real de una talla dentro del producto
//    Prefiere la variante del mismo color de la tarjeta/detalle; si no
//    existe, usa la primera del grupo con esa talla.
export const getVariantePorTalla = (producto, talla, catalogoCompleto) => {
  const objetivo = tallaVisible(talla);
  if (!producto || !objetivo) return null;

  const variantes = variantesDe(producto, catalogoCompleto);
  const candidatas = variantes.filter(
    (item) => tallaVisible(item?.size) && normalizarTalla(item.size) === normalizarTalla(objetivo)
  );

  if (candidatas.length === 0) return null;

  return (
    candidatas.find((item) => String(item.color) === String(producto.color)) ||
    candidatas[0]
  );
};

// 10. Variante base para productos sin talla (o primer respaldo cuando una
//     talla no se pudo resolver). Evita devolver el objeto agrupado al
//     carrito, que guardaría un arreglo `variantes` en localStorage.
export const getVarianteBase = (producto, catalogoCompleto) => {
  if (!producto || typeof producto !== "object") return null;

  const variantes = variantesDe(producto, catalogoCompleto);
  if (variantes.length === 0) return producto;

  const esVarianteSuelta = !Array.isArray(producto.variantes);
  if (esVarianteSuelta) {
    const idProducto = producto.id_variante ?? producto.id;
    const existeEnGrupo = variantes.some(
      (item) =>
        item &&
        String(item.id_variante ?? item.id) === String(idProducto)
    );
    if (existeEnGrupo || variantes.length <= 1) return producto;
  }

  const mismoColor = producto.color
    ? variantes.filter(
        (item) => item && String(item.color) === String(producto.color)
      )
    : [];
  const candidatos = mismoColor.length > 0 ? mismoColor : variantes;

  return (
    candidatos.find((item) => !tallaVisible(item?.size)) ||
    candidatos[0] ||
    variantes[0]
  );
};

// 11. Busca una variante por id_variante en un catálogo agrupado o plano.
export const buscarVariantePorId = (catalogo, idVariante) => {
  if (idVariante === null || idVariante === undefined) return null;

  const objetivo = String(idVariante);
  const fuente = Array.isArray(catalogo) ? catalogo : [];

  for (const producto of fuente) {
    const variantes = variantesDe(producto, fuente);
    const encontrada = variantes.find((item) => {
      if (!item) return false;
      const id = item.id_variante ?? item.id;
      return id !== null && id !== undefined && String(id) === objetivo;
    });

    if (encontrada) return encontrada;
  }

  return null;
};

// 12. Stock de un producto agrupado: suma las variantes. Si alguna no
//     informa stock se deja en null para no bloquear la compra por error.
export const stockProducto = (producto) => {
  const variantes = variantesDe(producto, []);
  if (variantes.length === 0) return null;

  const stocks = variantes.map((v) => stockNumerico(v?.stock));
  if (stocks.some((stock) => stock === null)) return null;

  return stocks.reduce((total, stock) => total + stock, 0);
};
