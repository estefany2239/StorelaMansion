// =========================================================
// PÁGINA "TODOS LOS PRODUCTOS" (pública)
// =========================================================
// Misma plantilla que las categorías (NavbarCategoria +
// BannerCategoria + CurvaCategoria) pero SIN filtros: muestra
// TODO el catálogo (hombre, mujer y unisex; todas las
// categorías) con el contador arriba a la derecha. Los datos
// salen del mismo hook que ya usa el listado de categorías
// (useCatalogo); no se aplica ningún filtro. Las tarjetas son
// el mismo componente compartido TarjetaProductoCatalogo.
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useCatalogo } from "../../shared/hooks/useCatalogo";
import ProductDetailPage from "../product/ProductDetailPage";
import { Corona } from "../../public/Landing";
import NavbarCategoria from "./NavbarCategoria";
import BannerCategoria from "./BannerCategoria";
import CurvaCategoria from "./CurvaCategoria";
import { CONFIG_TODOS } from "./categoriasConfig";
import TarjetaProductoCatalogo from "./TarjetaProductoCatalogo";
import Footer from "../../shared/components/footer/Footer";
import "./CategoryProductsView.css";
import "./TodosProductosView.css";

export default function TodosProductosView({
  tema = "claro",
  user,
  onAlternarTema,
  onIrALogin,
  onNavigate,
  onLogout,
  onNavigateSection,
  onVolver,
  onVerCategoria,
  addToCart,
  cartCount = 0,
  onCartClick,
}) {
  // Catálogo real (el mismo del listado de categorías): una
  // tarjeta por producto, de todos los públicos y categorías.
  const { catalogo, cargando } = useCatalogo();

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // Config de la página (título, descripción y foto del banner):
  // vive en categoriasConfig.js junto a las categorías.
  const config = CONFIG_TODOS;

  // Igual que en CategoryProductsView: si el detalle navega entre
  // variantes del mismo producto, se actualiza la tarjeta abierta.
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

  // Sin límite ni filtros: todo el catálogo disponible.
  const productos = useMemo(() => catalogo, [catalogo]);

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
            catalogoCompleto={catalogo}
            onBack={() => setProductoSeleccionado(null)}
            addToCart={addToCart}
            onIrALogin={onIrALogin}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`landing categoria-pagina todos-productos${
        tema === "oscuro" ? " todos-productos--oscuro" : ""
      }`}
      data-tema={tema}
    >
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

      <BannerCategoria
        titulo={config.titulo}
        descripcion={config.descripcion}
        foto={config.foto}
        fotoAncha={config.fotoAncha}
        fotoPosicion={config.fotoPosicion}
        etiquetaVolver="Volver"
        onVolver={onVolver}
      />

      <CurvaCategoria />

      <div className="todos-productos-contenido">
        {/* Contador arriba a la derecha (como en el listado de categorías) */}
        <p className="catalog__contador">
          <strong>{productos.length}</strong>{' '}
          <strong>
            {productos.length === 1
              ? "producto disponible"
              : "productos disponibles"}
          </strong>
        </p>

        {/* Rejilla de productos SIN panel de filtros */}
        <div className="catalog__products-grid">
          {productos.length > 0 ? (
            productos.map((product) => (
              <TarjetaProductoCatalogo
                key={product.id}
                product={product}
                catalogo={catalogo}
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
                  : 'Pronto tendremos productos disponibles.'}
              </p>
              {!cargando && (
                <button
                  type="button"
                  className="catalog__no-products-volver"
                  onClick={onVolver}
                >
                  <ArrowLeft size={16} /> Volver
                </button>
              )}
            </main>
          )}
        </div>
      </div>

      <Footer tema={tema} onNavigateSection={onNavigateSection} onVerCategoria={onVerCategoria} />
    </div>
  );
}
