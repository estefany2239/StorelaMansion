import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, SlidersHorizontal, ShoppingBag, Eye, ChevronDown, X } from "lucide-react";
import { getFilteredProducts as filtrarProductos, getVariantesPorColor, getTallasDisponibles, getVariantePorTalla, tallaVisible, TALLAS_ESTANDAR } from '../../shared/utils/catalogo';
import { esAgotado } from '../../shared/components/cart/cantidad';
import { useCatalogo } from '../../shared/hooks/useCatalogo';
import ProductDetailPage from '../product/ProductDetailPage';
import BotonFavorito from '../../shared/components/favoritos/BotonFavorito';
import "./CategoryProductsView.css";

// Hex de apoyo para los swatches. El filtro del cliente se arma con los
// colores ÚNICOS reales del catálogo (campo `color` de cada producto), no
// con esta paleta fija: por eso un color combinado como "Blanco / Azul"
// aparece tal cual en cuanto algún producto lo tenga.
const PALETA_COLORES = [
  { nombre: 'Negro', hex: '#000000' },
  { nombre: 'Blanco', hex: '#ffffff', borde: true },
  { nombre: 'Café', hex: '#8a5a44' },
  { nombre: 'Beige', hex: '#dcc8a2' },
  { nombre: 'Gris', hex: '#808080' },
  { nombre: 'Azul', hex: '#2b5fa8' },
  { nombre: 'Rojo', hex: '#e74c3c' },
  { nombre: 'Dorado', hex: '#c9a227' },
  { nombre: 'Plateado', hex: '#c0c0c0' },
  { nombre: 'Transparente', hex: '#ffffff', borde: true },
  { nombre: 'Rosado', hex: '#e8a0b4' },
  { nombre: 'Rosa palo', hex: '#d9a9a3' },
  { nombre: 'Azul claro', hex: '#8ab4e8' },
  { nombre: 'Azul marino', hex: '#1f2a44' },
  { nombre: 'Azul rey', hex: '#1f3fbf' },
  { nombre: 'Gris oscuro', hex: '#4a4c50' },
  { nombre: 'Gris jaspeado', hex: '#b5b5b5' }
];

const ORDEN_COLORES = ['negro', 'blanco', 'gris', 'gris oscuro', 'gris jaspeado', 'azul', 'azul claro', 'azul marino', 'azul rey', 'rojo', 'dorado', 'plateado', 'transparente', 'cafe', 'beige', 'rosado', 'rosa palo'];

const MAX_MARCAS_VISIBLES = 5;

const normalizarTalla = (t) => String(t).trim().toUpperCase();
const tallasVisiblesPara = (tallas) => [
  ...TALLAS_ESTANDAR,
  ...tallas.filter((t) => !TALLAS_ESTANDAR.includes(normalizarTalla(t)))
];
const normalizarColorNombre = (nombre) =>
  String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const getColorHex = (nombre) => {
  const clave = normalizarColorNombre(nombre);
  const conocido = PALETA_COLORES.find((c) => normalizarColorNombre(c.nombre) === clave);
  if (conocido) return conocido.hex;
  return '#9aa0a6';
};

const getColorStyle = (nombre) => {
  const partes = String(nombre || '')
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length >= 2) {
    const hexes = partes.map((p) => getColorHex(p));
    return {
      background: `linear-gradient(135deg, ${hexes[0]} 0%, ${hexes[0]} 50%, ${hexes[1]} 50%, ${hexes[1]} 100%)`
    };
  }
  if (partes.length === 1 && /multicolor/i.test(partes[0])) {
    return {
      background: 'linear-gradient(90deg, #e74c3c 0%, #c9a227 25%, #2b5fa8 50%, #000000 75%, #ffffff 100%)'
    };
  }
  return { backgroundColor: getColorHex(nombre) };
};

export default function CategoryProductsView({ category, onBack, addToCart, onIrALogin, initialGender = null }) {
  // Productos que vienen de Neon a través de la API
  const { catalogo: allProducts, cargando } = useCatalogo();
  const getFilteredProducts = (cat, gen, marcas, tallas, colores) =>
    filtrarProductos(cat, gen, marcas, tallas, colores, allProducts);

  const genders =
    Array.isArray(category?.genders) && category.genders.length > 0
      ? category.genders
      : ['hombre', 'mujer'];
  const puedeCambiarGenero = genders.length > 1;
  const generoInicial =
    initialGender && genders.includes(initialGender)
      ? initialGender
      : (genders.length === 1 ? genders[0] : null);

  const [selectedGender, setSelectedGender] = useState(generoInicial);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true);
  const [verMasMarcas, setVerMasMarcas] = useState(false);
  const [overlayComprar, setOverlayComprar] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Al cambiar de categoría o de género no deben quedar tallas seleccionadas
  // que oculten productos.
  const prevFiltroKeyRef = useRef(null);
  useEffect(() => {
    const key = `${category?.id || ''}|${category?.title || ''}|${selectedGender || ''}`;
    const cambio = prevFiltroKeyRef.current !== null && prevFiltroKeyRef.current !== key;
    prevFiltroKeyRef.current = key;
    if (cambio) {
      const id = window.setTimeout(() => setSelectedSizes([]), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [category?.id, category?.title, selectedGender]);

  // Detector automático del tema oscuro
  useEffect(() => {
    const checkTheme = () => {
      const htmlTheme = document.documentElement.getAttribute('data-theme');
      const bodyHasDark = document.body.classList.contains('dark') || document.body.classList.contains('dark-mode');
      const htmlHasDark = document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('dark-mode');
      
      setIsDarkMode(htmlTheme === 'dark' || bodyHasDark || htmlHasDark);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Si cambia la categoría (o llega un género no permitido), redirige al
  // género válido sin dejar la pantalla en blanco.
  // Colores disponibles para el grupoId del producto (usando getVariantesPorColor)
  const getColoresDisponibles = (prod) => {
    const vars = getVariantesPorColor(prod, allProducts);
    const colores = [];
    const seen = new Set();
    const agregar = (c) => { if (c && !seen.has(c)) { seen.add(c); colores.push(c); } };
    agregar(prod.color);
    vars.forEach((v) => agregar(v.color));
    return { colores, total: colores.length };
  };

  // DETECCIÓN INDEPENDIENTE PARA CADA CATEGORÍA
const isTenis = category?.title?.toLowerCase().includes('tenis') || category?.id === 'tenis';
const isGorras = category?.title?.toLowerCase().includes('gorra') || category?.id === 'gorras';
const isRelojes = category?.title?.toLowerCase().includes('reloj') || category?.id === 'relojes';
const isPerfumes = category?.title?.toLowerCase().includes('perfume') || category?.id === 'perfumes';

  const isBusos = category?.title?.toLowerCase().includes('buso') || category?.id === 'busos';
  const isPantalones = category?.title?.toLowerCase().includes('pantalon') || 
                       category?.title?.toLowerCase().includes('pantalón');
  const isCamisas = category?.title?.toLowerCase().includes('camiseta') || 
                    category?.title?.toLowerCase().includes('camisa') || 
                    category?.id === 'camisetas' || 
                    category?.id === 'camisas';

  // Obtener marcas reales de productsData para la categoría+género seleccionados
  const productosCategoriaGenero = getFilteredProducts(
    category,
    selectedGender,
    [],
    [],
    []
  );

  const getMarcasReales = (productos) => {
    const marcas = [];
    for (const prod of productos) {
      if (prod && prod.brand) {
        marcas.push(prod.brand);
      }
    }
    const unicas = Array.from(new Set(marcas));
    return unicas;
  };

  const marcasReales = getMarcasReales(productosCategoriaGenero);

  // Para el filtro de marcas, usar las marcas reales (no inventar)
  const marcasFiltrables = marcasReales;

  const marcasVisibles = verMasMarcas ? marcasFiltrables : marcasFiltrables.slice(0, MAX_MARCAS_VISIBLES);

  // CORREGIDO: Se limpian las marcas solo en gorras y se ajustan las tallas para que los tenis no se bloqueen.
  // En las categorías de tipo complemento (gorras, relojes y perfumes) los "sizes"
  // no son tallas de ropa y se filtran por tipo en getFilteredProducts.
  // Las marcas se filtran con las marcas reales disponibles para esta categoría/género.
  const filteredProducts = getFilteredProducts(
    category, 
    selectedGender, 
    marcasFiltrables.length > 0 ? selectedBrands : [],
    selectedSizes, 
    selectedColors
  );

  // Colores ÚNICOS reales del catálogo para la categoría/género actuales
  // (el filtro del cliente se arma desde el campo `color` de los productos,
  //  por eso un color combinado como "Blanco / Azul" aparece tal cual).
  const coloresReales = (() => {
    const vistos = new Set();
    const lista = [];
    for (const p of productosCategoriaGenero) {
      const variantes = getVariantesPorColor(p, allProducts);
      for (const variante of variantes) {
        const nombre = variante && variante.color ? String(variante.color).trim() : "";
        const clave = nombre.toLowerCase();
        if (clave && !vistos.has(clave)) {
          vistos.add(clave);
          lista.push(nombre);
        }
      }
    }
    return lista.sort((a, b) => {
      const ia = ORDEN_COLORES.indexOf(normalizarColorNombre(a));
      const ib = ORDEN_COLORES.indexOf(normalizarColorNombre(b));
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  })();

  // Colores con producto real para la categoría/género/talla/marcas actuales
  const coloresDisponibles = coloresReales.filter((nombre) =>
    getFilteredProducts(
      category,
      selectedGender,
      marcasFiltrables.length > 0 ? selectedBrands : [],
      selectedSizes,
      [nombre]
    ).length > 0
  );

  // El panel de filtros solo se dibuja si tiene al menos un grupo visible.
  // Los perfumes no tienen ningún grupo (ni tallas, ni colores, ni marcas).
  const mostrarPanelFiltros = !isPerfumes && (
    coloresReales.length > 0 ||
    marcasFiltrables.length > 0 ||
    !(isRelojes || isGorras)
  );

  const toggleSize = (size) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const toggleBrand = (brand) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };

  const toggleColor = (color) => {
    setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
  };

  useEffect(() => {
    const handler = (e) => {
      const v = e.detail;
      if (v) {
        setProductoSeleccionado(v);
      }
    };
    window.addEventListener('pdp-navigate-variant', handler);
    return () => window.removeEventListener('pdp-navigate-variant', handler);
  }, []);

  if (productoSeleccionado) {
    return (
      <ProductDetailPage
        key={productoSeleccionado.id}
        product={productoSeleccionado}
        catalogoCompleto={allProducts}
        onBack={() => setProductoSeleccionado(null)}
        addToCart={addToCart}
        onIrALogin={onIrALogin}
      />
    );
  }

  return (
    <div className={`category-catalog-section ${isDarkMode ? 'dark-mode-active' : ''}`}>
      <div className="category-catalog-container">
        
        <button className="catalog__back-btn" onClick={() => {
          if (selectedGender && puedeCambiarGenero) {
            setSelectedGender(null);
          } else {
            onBack();
          }
        }}>
          <ArrowLeft size={16} /> {(selectedGender && puedeCambiarGenero) ? "Cambiar género" : "Volver a categorías"}
        </button>

        <div className="catalog__header">
          <h2>{category?.title}</h2>
          <span className="catalog__count">
            {selectedGender ? `${filteredProducts.length} productos disponibles` : "Selecciona una sección"}
          </span>
        </div>

        {!selectedGender ? (
          <div className="gender-selector-wrapper">
            <div className="gender-selector-header">
              <span className="gender-selector-kicker">Descubre</span>
              <h3>¿Para quién buscas en {category?.title}?</h3>
            </div>

            <div className="gender-cards-container">

              {genders.includes('hombre') && (
                <div
                  className="gender-card"
                  style={{ backgroundImage: `url('${new URL("../../assets/img/el.jpeg", import.meta.url).href}')` }}
                  onClick={() => { setSelectedGender('hombre'); setSelectedSizes([]); }}
                >
                  <div className="gender-card-content">
                    <span className="gender-card-title">MODA MASCULINA</span>
                    <span className="gender-card-divider" />
                    <span className="gender-card-caption">Premium &amp; urbano</span>
                  </div>
                </div>
              )}

              {genders.includes('mujer') && (
                <div
                  className="gender-card"
                  style={{ backgroundImage: `url('${new URL("../../assets/img/ell.jpeg", import.meta.url).href}')` }}
                  onClick={() => { setSelectedGender('mujer'); setSelectedSizes([]); }}
                >
                  <div className="gender-card-content">
                    <span className="gender-card-title">MODA FEMENINA</span>
                    <span className="gender-card-divider" />
                    <span className="gender-card-caption">Elegante &amp; chic</span>
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="catalog__layout" style={mostrarPanelFiltros ? undefined : { gridTemplateColumns: '1fr' }}>
            
            {/* BARRA LATERAL CON CADA FILTRO SEPARADO */}
            {mostrarPanelFiltros && (
            <aside className="catalog__sidebar">
              <div
                className="sidebar__title"
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setFiltrosAbiertos((prev) => !prev)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SlidersHorizontal size={18} />
                  <span>Filtros ({selectedGender.toUpperCase()})</span>
                </div>
                <ChevronDown size={18} style={{ transform: filtrosAbiertos ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }} />
              </div>

              {/* FILTROS COLAPSABLES */}
              {filtrosAbiertos && (
                <>
                  {/* 1. SI ES GORRAS */}
                  {isGorras ? (
                    marcasFiltrables.length > 0 ? (
                    <div className="filter__group">
                      <h4>Marcas de Gorras</h4>
                      <div className="filter__sizes-grid">
                        {marcasVisibles.map(brand => (
                          <button 
                            key={brand}
                            className={`filter__size-btn ${selectedBrands.includes(brand) ? 'active' : ''}`}
                            onClick={() => toggleBrand(brand)}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                      {marcasFiltrables.length > MAX_MARCAS_VISIBLES && (
                        <button
                          type="button"
                          className="filter__show-more"
                          onClick={() => setVerMasMarcas((prev) => !prev)}
                          style={{ marginTop: '8px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                        >
                          {verMasMarcas ? 'Ver menos' : 'Ver más'}
                        </button>
                      )}
                    </div>
                    ) : null
                  ) : isRelojes ? null : isBusos ? (
                /* 3. SI ES BUSOS (INDEPENDIENTE) */
                <div className="filter__group">
                  <h4>Tallas de Buzos</h4>
                  <div className="filter__sizes-grid">
                    {(selectedGender === 'hombre' 
                      ? ['S', 'M', 'L', 'XL', 'XXL'] 
                      : ['S']
                    ).map(size => (
                      <button 
                        key={size}
                        className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                        onClick={() => toggleSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isPantalones ? (
                /* 5. SI ES PANTALONES */
                <div className="filter__group">
                  <h4>Tallas de Pantalones</h4>
                  <div className="filter__sizes-grid">
                    {(selectedGender === 'hombre' 
                      ? ['30', '32', '34', '36', '38'] 
                      : ['S', 'M']
                    ).map(size => (
                      <button 
                        key={size}
                        className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                        onClick={() => toggleSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isTenis ? (
                /* 6. SI ES TENIS (TALLAS DE CALZADO): solo las tallas que
                   realmente existen en los productos de esta categoría y
                   género (no se ofrecen tallas inventadas) */
                (() => {
                  const tallasTenis = Array.from(
                    new Set(
                      productosCategoriaGenero.flatMap((prod) =>
                        getTallasDisponibles(prod, allProducts)
                          .map((talla) => tallaVisible(talla))
                          .filter(Boolean)
                      )
                    )
                  ).sort((a, b) => Number(a) - Number(b));

                  return (
                    <div className="filter__group">
                      <h4>Tallas de Tenis</h4>
                      <div className="filter__sizes-grid">
                        {tallasTenis.map((size) => (
                          <button
                            key={size}
                            className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                            onClick={() => toggleSize(size)}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : isCamisas && selectedGender === 'hombre' ? (
                /* 7. SI ES CAMISAS DE HOMBRE (TALLAS M, L, XL) */
                <div className="filter__group">
                  <h4>Tallas de Camisas</h4>
                  <div className="filter__sizes-grid">
                    {['M', 'L', 'XL'].map(size => (
                      <button 
                        key={size}
                        className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                        onClick={() => toggleSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isCamisas ? (
                /* 7B. SI ES CAMISAS DE MUJER (TALLAS XS, S, M, L) */
                <div className="filter__group">
                  <h4>Tallas de Camisas</h4>
                  <div className="filter__sizes-grid">
                    {['XS', 'S', 'M', 'L'].map(size => (
                      <button 
                        key={size}
                        className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                        onClick={() => toggleSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                  ) : (
                    /* 8. TALLAS PARA OTRAS ROPAS GENERALES */
                    <div className="filter__group">
                      <h4>Tallas</h4>
                      <div className="filter__sizes-grid">
                        {(selectedGender === 'hombre' ? ['S', 'M', 'L', 'XL', 'XXL'] : ['XS', 'S', 'M', 'L', 'Única']).map(size => (
                          <button 
                            key={size}
                            className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                            onClick={() => toggleSize(size)}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* COLORES - Checklist con los colores reales del catálogo */}
                  {coloresReales.length > 0 && (
                    <div className="filter__group">
                      <h4>Colores</h4>
                      <div className="filter__colors-list">
                        {coloresReales.map((nombre) => {
                          const isSelected = selectedColors.includes(nombre);
                          const disponible = coloresDisponibles.includes(nombre);
                          return (
                            <label
                              key={nombre}
                              className={`filter__checkbox-label${disponible ? '' : ' is-disabled'}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!disponible}
                                onChange={() => toggleColor(nombre)}
                              />
                              <span
                                className="filter__color-swatch"
                                style={getColorStyle(nombre)}
                              />
                              <span className="filter__color-name">{nombre}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* MARCAS PARA OTRAS CATEGORÍAS (si existen marcas reales) */}
                  {!isGorras && marcasFiltrables.length > 0 && (
                    <div className="filter__group">
                      <h4>Marcas</h4>
                      <div className="filter__sizes-grid">
                        {marcasVisibles.map((brand) => (
                          <button
                            key={brand}
                            className={`filter__size-btn ${selectedBrands.includes(brand) ? 'active' : ''}`}
                            onClick={() => toggleBrand(brand)}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                      {marcasFiltrables.length > MAX_MARCAS_VISIBLES && (
                        <button
                          type="button"
                          className="filter__show-more"
                          onClick={() => setVerMasMarcas((prev) => !prev)}
                          style={{ marginTop: '8px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                        >
                          {verMasMarcas ? 'Ver menos' : 'Ver más'}
                        </button>
                      )}
                    </div>
                  )}
                </>
               )}
             </aside>
            )}


            {/* GRILLA DE PRODUCTOS */}
            <main className="catalog__products-grid">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => {
                  // Tallas reales del grupoId: si hay más de una se muestra el selector
                  const tallas = getTallasDisponibles(product, allProducts);
                  const tallaUnica = tallas.length <= 1;
                  const overlayAbierto = overlayComprar === String(product.id);
                  const tallasNorm = new Set(tallas.map(normalizarTalla));
                  const tallaPropia = product.size && tallasNorm.has(normalizarTalla(product.size));
                  // Variante de esta tarjeta sin unidades: no se compra.
                  const agotado = esAgotado(product.stock);

                  const agregarTallaAlCarrito = (size) => {
                    setOverlayComprar(null);
                    // Se agrega la fila real de esa talla/color (id_variante
                    // y stock verdaderos), no solo la etiqueta de la talla.
                    const variante =
                      getVariantePorTalla(product, size, allProducts) || product;
                    addToCart({ ...variante, size: variante.size || size });
                  };

                  const manejarComprar = () => {
                    if (agotado) return;
                    if (tallaUnica) {
                      if (tallas.length > 0) agregarTallaAlCarrito(tallas[0]);
                      else addToCart({ ...product });
                    } else {
                      setOverlayComprar((prev) => (prev === String(product.id) ? null : String(product.id)));
                    }
                  };

                  return (
                    <div key={product.id} className="catalog__product-card">
                      <div 
                        className={`product__img-wrap ${isCamisas ? 'product__img-wrap--camisas' : ''}`}
                        style={{ backgroundImage: `url(${product.image})` }}
                      >
                        {product.brand ? (
                          <span className="product__brand-tag">{product.brand}</span>
                        ) : null}
                        
                        <BotonFavorito
                          idProducto={product.id_producto ?? product.grupoId}
                          nombre={product.name}
                          onIniciarSesion={onIrALogin}
                        />

                        {/* SELECCIÓN DE TALLA (solo si el grupo tiene más de una talla real) */}
                        {tallaUnica ? null : (
                          <div className={`product__size-overlay${overlayAbierto ? ' is-open' : ''}`}>
                            <button
                              type="button"
                              className="product__size-overlay-close"
                              onClick={(e) => { e.stopPropagation(); setOverlayComprar(null); }}
                              aria-label="Cerrar selector de talla"
                            >
                              <X size={13} />
                            </button>
                            <span className="product__size-overlay-title">Elige una talla</span>
                            <div className="product__size-overlay-sizes">
                              {tallasVisiblesPara(tallas).map((s) => {
                                const disponible = tallasNorm.has(normalizarTalla(s));
                                const varianteTalla = disponible
                                  ? getVariantePorTalla(product, s, allProducts)
                                  : null;
                                // Talla real cuya variante no tiene unidades.
                                const sinStock = disponible && esAgotado(varianteTalla?.stock);
                                const activa = disponible && tallaPropia && normalizarTalla(product.size) === normalizarTalla(s);
                                const puedeAgregar = disponible && !sinStock;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    className={`product__size-btn${activa ? ' active' : ''}${puedeAgregar ? '' : ' disabled'}`}
                                    disabled={!puedeAgregar}
                                    title={
                                      !disponible
                                        ? `Talla ${s} no disponible`
                                        : sinStock
                                          ? `Talla ${s} agotada`
                                          : `Agregar en talla ${s}`
                                    }
                                    onClick={(e) => { e.stopPropagation(); if (puedeAgregar) agregarTallaAlCarrito(s); }}
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="product__info">
                        <h4>{product.name}</h4>
                        {/* Sin talla (gorras, perfumes, relojes, etc.) no se
                            muestra la línea "Talla:" */}
                        {isGorras ? (
                          product.brand ? (
                            <p className="product__details">
                              Marca: {product.brand}
                            </p>
                          ) : null
                        ) : tallas.length > 1 ? (
                          <p className="product__details">
                            Tallas: {tallas.join(" · ")}
                          </p>
                        ) : tallas.length === 1 ? (
                          <p className="product__details">
                            Talla: {tallas[0]}
                          </p>
                        ) : null}
                        {/* PUNTOS DE COLOR DE LOS DISPONIBLES EN EL GRUPO */}
                        {(() => {
                          const cc = getColoresDisponibles(product);
                          if (cc.colores.length === 0) return null;
                          return (
                            <div className="product__color-dots">
                              {cc.colores.slice(0, 4).map(c => (
                                <span key={c} className="product__color-dot" style={getColorStyle(c)} title={c} />
                              ))}
                              {cc.total > 4 && <span className="product__color-dots-more">+{cc.total - 4}</span>}
                            </div>
                          );
                        })()}
                        <span className="product__details-divider" />
                        <span className="product__card-price">{product.price}</span>
                        <div className="product__footer">
                          <div className="product__btn-pair">
                            {/* BOTÓN VER DETALLE */}
                            <button 
                              type="button"
                              className="product__view-btn"
                              onClick={() => setProductoSeleccionado(product)}
                              title="Ver detalle"
                            >
                              <Eye size={15} /> Ver
                            </button>

                            {/* BOTÓN COMPRAR / CARRITO */}
                            <button 
                              type="button"
                              className={`product__add-btn${agotado ? " is-agotado" : ""}`}
                              onClick={manejarComprar}
                              disabled={agotado}
                              title={
                                agotado
                                  ? "Producto agotado: no hay unidades disponibles"
                                  : tallaUnica
                                    ? (tallas.length > 0 ? `Agregar en talla ${tallas[0]}` : "Agregar al carrito")
                                    : "Elegir talla"
                              }
                            >
                              <ShoppingBag size={16} /> {agotado ? "Agotado" : tallaUnica ? "Comprar" : "Elige talla"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <main className="catalog__no-products">
                  <p>
                    {cargando
                      ? 'Cargando productos...'
                      : `No se encontraron productos para ${selectedGender} con los filtros seleccionados.`}
                  </p>
                </main>
              )}
            </main>

          </div>
        )}

      </div>

    </div>
  );
}