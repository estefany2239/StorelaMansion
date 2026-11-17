// =========================================================
// VISTA DE PRODUCTOS POR CATEGORÍA Y GÉNERO
// =========================================================
// El panel de filtros (Categoría · Tallas · Colores · Precio) es un
// componente único reutilizable: PanelFiltrosCategorias. Todo se calcula
// con los datos reales del catálogo (Neon → API); no hay listas
// hardcodeadas por categoría. Las tarjetas de producto son el
// componente compartido TarjetaProductoCatalogo.
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft } from "lucide-react";
import { getFilteredProducts } from '../../shared/utils/catalogo';
import { useCatalogo } from '../../shared/hooks/useCatalogo';
import ProductDetailPage from '../product/ProductDetailPage';
import { Corona } from '../../public/Landing';
import NavbarCategoria from './NavbarCategoria';
import BannerCategoria from './BannerCategoria';
import CurvaCategoria from './CurvaCategoria';
import { obtenerConfigCategoria } from './categoriasConfig';
import PanelFiltrosCategorias from './PanelFiltrosCategorias';
import TarjetaProductoCatalogo from './TarjetaProductoCatalogo';
import Footer from "../../shared/components/footer/Footer";
import "./CategoryProductsView.css";

export default function CategoryProductsView({
  category,
  categorias = [],
  onBack,
  addToCart,
  onIrALogin,
  onNavigate,
  onLogout,
  onNavigateSection,
  onCambiarCategoria,
  onVerCategoria,
  tema = "claro",
  user,
  onAlternarTema,
  initialGender = null,
  cartCount = 0,
  onCartClick,
}) {
  // Productos que vienen de Neon a través de la API
  const { catalogo: allProducts, cargando } = useCatalogo();

  const genders =
    Array.isArray(category?.genders) && category.genders.length > 0
      ? category.genders
      : ['hombre', 'mujer'];
  const generoInicial =
    initialGender && genders.includes(initialGender)
      ? initialGender
      : (genders.length === 1 ? genders[0] : null);

  // El género elegido en la pantalla de categoría manda: llega como
  // initialGender y dirige filtros y catálogo. El respaldo genders[0]
  // solo aplica si no llega ningún género válido (caso defensivo).
  const selectedGender = generoInicial ?? genders[0];

  // Estado de filtros combinables (talla + color + precio). Al cambiar de
  // categoría o de género la vista se REMONTA (key en App), así que estos
  // estados se reinician solos.
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [precioMin, setPrecioMin] = useState(null);
  const [precioMax, setPrecioMax] = useState(null);

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Configuración de la categoría (título, descripción y foto del
  // banner compacto): la misma fuente que la plantilla de categoría.
  const config = useMemo(
    () => obtenerConfigCategoria(category?.title, category?.genders),
    [category?.title, category?.genders]
  );

  // Productos de la categoría y género actuales (sin filtros): base para
  // los conteos, tallas, colores y rango de precio del panel.
  const productosCategoriaGenero = getFilteredProducts(
    category,
    selectedGender,
    [],
    [],
    null,
    null,
    allProducts
  );

  // Productos con TODOS los filtros combinados aplicados. Este número es
  // el que muestra el encabezado "N productos encontrados".
  const filteredProducts = getFilteredProducts(
    category,
    selectedGender,
    selectedSizes,
    selectedColors,
    precioMin,
    precioMax,
    allProducts
  );

  // ¿Hay filtros activos? Si no hay ninguno y la grilla quedó vacía, la
  // categoría todavía no tiene productos (no fue culpa de los filtros).
  const filtrosActivos =
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    precioMin !== null ||
    precioMax !== null;

  const cambiarFiltros = (parcial) => {
    if ('tallas' in parcial) setSelectedSizes(parcial.tallas);
    if ('colores' in parcial) setSelectedColors(parcial.colores);
    if ('precioMin' in parcial) setPrecioMin(parcial.precioMin);
    if ('precioMax' in parcial) setPrecioMax(parcial.precioMax);
  };

  const limpiarFiltros = () => {
    setSelectedSizes([]);
    setSelectedColors([]);
    setPrecioMin(null);
    setPrecioMax(null);
  };

  // Cambiar de categoría desde el panel: mantiene el género actual (se lo
  // informa a App). La vista se remonta (key en App) y los filtros
  // arrancan limpios.
  const manejarCambiarCategoria = (id) => {
    onCambiarCategoria?.(id, selectedGender);
  };

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
      <div className="landing categoria-pagina" data-tema={tema}>
        <NavbarCategoria
          tema={tema}
          user={user}
          onAlternarTema={onAlternarTema}
          onIrALogin={onIrALogin}
          onNavigate={onNavigate}
          onLogout={onLogout}
          onNavigateSection={onNavigateSection}
          onVerCategoria={onVerCategoria}
          cartCount={cartCount}
          onCartClick={onCartClick}
        />
        <div style={{ paddingTop: 110 }}>
          <ProductDetailPage
            key={productoSeleccionado.id}
            product={productoSeleccionado}
            catalogoCompleto={allProducts}
            onBack={() => setProductoSeleccionado(null)}
            addToCart={addToCart}
            onIrALogin={onIrALogin}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`category-catalog-section ${isDarkMode ? 'dark-mode-active' : ''}`}>
      {/* Navbar flotante nuevo (el mismo de la pantalla de categoría) */}
      <NavbarCategoria
        tema={tema}
        user={user}
        onAlternarTema={onAlternarTema}
        onIrALogin={onIrALogin}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onNavigateSection={onNavigateSection}
        onVerCategoria={onVerCategoria}
        cartCount={cartCount}
        onCartClick={onCartClick}
      />

      {/* Banner compacto + curva: mismo banner de la plantilla, banda baja.
          "Volver" regresa a la plantilla de la categoría (onBack). */}
      <BannerCategoria
        compacto
        titulo={config.titulo}
        descripcion={config.descripcion}
        foto={config.foto}
        fotoAncha={config.fotoAncha}
        fotoPosicion={config.fotoPosicion}
        onVolver={onBack}
      />
      <CurvaCategoria compacto />

      <div className="catalog__page">

        {/* Contador de productos encontrados (con los filtros activos) */}
        <p className="catalog__contador">
          <strong>{filteredProducts.length}</strong>{' '}
          <strong>
            {filteredProducts.length === 1
              ? "producto disponible"
              : "productos disponibles"}
          </strong>
        </p>

        <div className="catalog__layout">

          {/* PANEL DE FILTROS (componente único para todas las categorías) */}
          <aside className="catalog__sidebar">
            <PanelFiltrosCategorias
              catalogo={allProducts}
              productosBase={productosCategoriaGenero}
              categorias={categorias}
              categoriaActual={category?.id || 'todos'}
              genero={selectedGender}
              filtros={{
                tallas: selectedSizes,
                colores: selectedColors,
                precioMin,
                precioMax
              }}
              onCambiarFiltros={cambiarFiltros}
              onCambiarCategoria={manejarCambiarCategoria}
              onLimpiar={limpiarFiltros}
            />
          </aside>

          {/* GRILLA DE PRODUCTOS (tarjeta compartida TarjetaProductoCatalogo) */}
          <main className="catalog__products-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <TarjetaProductoCatalogo
                  key={product.id}
                  product={product}
                  catalogo={allProducts}
                  onVerDetalle={() => setProductoSeleccionado(product)}
                  addToCart={addToCart}
                  onIrALogin={onIrALogin}
                />
              ))
            ) : (
              <main className="catalog__no-products">
                <Corona className="catalog__no-products-corona" />
                <p>
                  {cargando
                    ? 'Cargando productos...'
                    : filtrosActivos
                      ? `No se encontraron productos para ${selectedGender} con los filtros seleccionados.`
                      : 'Pronto tendremos productos en esta categoría.'}
                </p>
                {!cargando && !filtrosActivos && (
                  <button
                    type="button"
                    className="catalog__no-products-volver"
                    onClick={onBack}
                  >
                    <ArrowLeft size={16} /> Volver
                  </button>
                 )}
               </main>
             )}
           </main>

         </div>

       </div>

       <Footer tema={tema} onNavigateSection={onNavigateSection} onVerCategoria={onVerCategoria} />

     </div>
   );
 }
