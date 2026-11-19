// =========================================================
// TARJETA DE PRODUCTO DEL CATÁLOGO PÚBLICO
// =========================================================
// Componente único de tarjeta para todos los listados de la
// tienda (CategoryProductsView y TodosProductosView): foto con
// corazón de favorito, selector de talla, puntos de color,
// precio y botones Ver / Comprar. El detalle se abre con
// onVerDetalle y la compra pasa por addToCart (misma lógica
// que antes vivía inline en CategoryProductsView).
import { useState } from "react";
import { Eye, ShoppingBag, X } from "lucide-react";
import {
  getColorStyle,
  getTallasDisponibles,
  getVariantePorTalla,
  getVariantesPorColor,
  TALLAS_ESTANDAR
} from "../../shared/utils/catalogo";
import { esAgotado } from "../../shared/components/cart/cantidad";
import BotonFavorito from "../../shared/components/favoritos/BotonFavorito";

const normalizarTalla = (t) => String(t).trim().toUpperCase();

const tallasVisiblesPara = (tallas) => [
  ...TALLAS_ESTANDAR,
  ...tallas.filter((t) => !TALLAS_ESTANDAR.includes(normalizarTalla(t)))
];

export default function TarjetaProductoCatalogo({
  product,
  catalogo,
  onVerDetalle,
  addToCart,
  onIrALogin
}) {
  // Selector de talla abierto/cerrado (solo grupos con más de una talla)
  const [overlayAbierto, setOverlayAbierto] = useState(false);

  // Tallas reales del grupoId: si hay más de una se muestra el selector
  const tallas = getTallasDisponibles(product, catalogo);
  const tallaUnica = tallas.length <= 1;
  const tallasNorm = new Set(tallas.map(normalizarTalla));
  const tallaPropia = product.size && tallasNorm.has(normalizarTalla(product.size));
  // Variante de esta tarjeta sin unidades: no se compra.
  const agotado = esAgotado(product.stock);

  const agregarTallaAlCarrito = (size) => {
    setOverlayAbierto(false);
    // Se agrega la fila real de esa talla/color (id_variante
    // y stock verdaderos), no solo la etiqueta de la talla.
    const variante =
      getVariantePorTalla(product, size, catalogo) || product;
    addToCart({ ...variante, size: variante.size || size });
  };

  const manejarComprar = () => {
    if (agotado) return;
    if (tallaUnica) {
      if (tallas.length > 0) agregarTallaAlCarrito(tallas[0]);
      else addToCart({ ...product });
    } else {
      setOverlayAbierto((prev) => !prev);
    }
  };

  const [imgError, setImgError] = useState(false);
  const tieneImagen = product.image && !imgError;

  return (
    <div className="catalog__product-card">
      <div className="product__img-wrap">
        <div className="product__img-placeholder" aria-hidden="true">
          <ShoppingBag size={30} />
        </div>
        {tieneImagen && (
          <img
            className="product__img"
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
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
              onClick={(e) => { e.stopPropagation(); setOverlayAbierto(false); }}
              aria-label="Cerrar selector de talla"
            >
              <X size={13} />
            </button>
            <span className="product__size-overlay-title">Elige una talla</span>
            <div className="product__size-overlay-sizes">
              {tallasVisiblesPara(tallas).map((s) => {
                const disponible = tallasNorm.has(normalizarTalla(s));
                const varianteTalla = disponible
                  ? getVariantePorTalla(product, s, catalogo)
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
        {/* Sin talla (perfumes, relojes, accesorios, etc.) no
            se muestra la línea "Talla:" */}
        {tallas.length > 1 ? (
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
          const colores = [];
          const vistos = new Set();
          const agregar = (c) => { if (c && !vistos.has(c)) { vistos.add(c); colores.push(c); } };
          agregar(product.color);
          getVariantesPorColor(product, catalogo).forEach((v) => agregar(v.color));
          if (colores.length === 0) return null;
          return (
            <div className="product__color-dots">
              {colores.slice(0, 4).map(c => (
                <span key={c} className="product__color-dot" style={getColorStyle(c)} title={c} />
              ))}
              {colores.length > 4 && <span className="product__color-dots-more">+{colores.length - 4}</span>}
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
              onClick={() => onVerDetalle?.()}
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
}
