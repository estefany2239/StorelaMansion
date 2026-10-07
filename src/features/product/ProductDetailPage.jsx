import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingBag, Minus, Plus, Truck, ShieldCheck } from "lucide-react";
import { getVariantesPorColor, getTallasDisponibles, TALLAS_ESTANDAR } from '../../data/productsData';
import "./ProductDetailPage.css";

const normalizarTalla = (t) => String(t).trim().toUpperCase();

export default function ProductDetailPage({ product, onBack, addToCart, catalogoCompleto }) {
  const [cantidad, setCantidad] = useState(1);
  const [imagenPrincipal, setImagenPrincipal] = useState(product?.image);
  const [tallaSel, setTallaSel] = useState(product?.size || null);

  const variantes = getVariantesPorColor(product, catalogoCompleto || []);
  const tieneVariantes = variantes && variantes.length > 0;

  // Tallas reales del grupo (nunca inventadas) + listado completo del detalle
  const tallasDisponibles = getTallasDisponibles(product, catalogoCompleto || []);
  const disponiblesNorm = new Set(tallasDisponibles.map(normalizarTalla));
  const tallasVisibles = [
    ...TALLAS_ESTANDAR,
    ...tallasDisponibles.filter((t) => !TALLAS_ESTANDAR.includes(normalizarTalla(t)))
  ];

  useEffect(() => {
    setImagenPrincipal(product?.image);
    setCantidad(1);
    const disp = getTallasDisponibles(product, catalogoCompleto || []);
    const propia =
      product?.size &&
      disp.some((t) => normalizarTalla(t) === normalizarTalla(product.size));
    setTallaSel(propia ? product.size : disp[0] || null);
  }, [product]);

  if (!product) return null;

  const catKey = String(product.categoryId || "").toLowerCase();
  const isGorras =
    catKey === "gorras" ||
    String(product.name || "").toLowerCase().includes("gorra");

  const coloresActuales = tieneVariantes ? variantes.map(v => v.color).filter(Boolean) : (product.color ? [product.color] : []);

  const descripcion = product.description || product.descripcion || null;
  const mostrarRating = typeof product.rating !== "undefined" && product.rating !== null;

  const handleCambiarColor = (colorProducto) => {
    // colorProducto es uno de los productos variantes
    if (colorProducto && onBack) {
      // El onBack no aplica, mejor usar callback para cambiar producto
      // Pero la API es limitada; pasar un callback para seleccionar producto desde arriba
    }
  };

  return (
    <div className="pdp-section">
      <div className="pdp-container">
        <button className="pdp-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Volver
        </button>

        <div className="pdp-grid">
          <div className="pdp-gallery">
            <div className="pdp-thumbs">
              <div
                className={`pdp-thumb ${imagenPrincipal === product.image ? 'active' : ''}`}
                style={{ backgroundImage: `url(${product.image})` }}
                onClick={() => setImagenPrincipal(product.image)}
                title="Imagen principal"
              />
              {tieneVariantes && variantes.map((v, i) => {
                if (v.image === product.image && i === 0) return null;
                return (
                  <div
                    key={v.id + '-' + i}
                    className={`pdp-thumb ${imagenPrincipal === v.image ? 'active' : ''}`}
                    style={{ backgroundImage: `url(${v.image})` }}
                    onClick={() => setImagenPrincipal(v.image)}
                    title={v.color || v.name}
                  />
                );
              })}
            </div>
            <div className="pdp-main-image" style={{ backgroundImage: `url(${imagenPrincipal})` }} />
          </div>

          <div className="pdp-info">
            <h1 className="pdp-name">{product.name}</h1>
            <div className="pdp-price">{product.priceFormatted || product.price}</div>

            {mostrarRating && (
              <div className="pdp-rating">★ {Number(product.rating).toFixed(1)}</div>
            )}

            {descripcion && (
              <div className="pdp-description">
                <p>{descripcion}</p>
              </div>
            )}

            {!descripcion && (
              <div className="pdp-description">
                <p>Producto {catKey ? catKey : ''} de alta calidad. Diseño moderno y acabado cuidado.</p>
              </div>
            )}

            {coloresActuales.length > 0 && (
              <div className="pdp-group">
                <div className="pdp-label">Color</div>
                <div className="pdp-colors">
                  {coloresActuales.map((c) => {
                    const v = tieneVariantes ? variantes.find(x => x.color === c) : product;
                    return (
                      <button
                        key={c}
                        type="button"
                        className={`pdp-color-btn ${product.color === c ? 'active' : ''}`}
                        title={c}
                        onClick={() => {
                          if (tieneVariantes && v && v.id !== product.id) {
                            // navigate to this variant - signal via callback
                            window.dispatchEvent(new CustomEvent('pdp-navigate-variant', { detail: v }));
                          }
                        }}
                        disabled={!tieneVariantes || (tieneVariantes && !variantes.find(x => x.color === c))}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isGorras ? null : (
              <div className="pdp-group">
                <div className="pdp-label">Talla</div>
                <div className="pdp-sizes">
                  {tallasVisibles.map((s) => {
                    const disponible = disponiblesNorm.has(normalizarTalla(s));
                    const activa = disponible && tallaSel != null && normalizarTalla(tallaSel) === normalizarTalla(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`pdp-size-btn${activa ? ' active' : ''}${disponible ? '' : ' disabled'}`}
                        disabled={!disponible}
                        title={disponible ? `Talla ${s}` : `Talla ${s} no disponible`}
                        onClick={() => setTallaSel(s)}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pdp-group">
              <div className="pdp-label">Cantidad</div>
              <div className="pdp-qty">
                <button type="button" onClick={() => setCantidad(q => Math.max(1, q-1))}><Minus size={14} /></button>
                <span>{cantidad}</span>
                <button type="button" onClick={() => setCantidad(q => q+1)}><Plus size={14} /></button>
              </div>
            </div>

            <button className="pdp-addtocart" onClick={() => addToCart({ ...product, quantity: cantidad, ...(tallaSel ? { size: tallaSel } : {}) })}>
              <ShoppingBag size={16} /> Agregar al carrito
            </button>

            <div className="pdp-benefits">
              <div className="pdp-benefit"><Truck size={18} /><span>Envíos a todo el país</span></div>
              <div className="pdp-benefit"><ShieldCheck size={18} /><span>Pago seguro</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}