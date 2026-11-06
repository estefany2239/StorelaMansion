import { useState } from 'react';
import { ArrowLeft, ShoppingBag, Truck, ShieldCheck } from "lucide-react";
import { getVariantesPorColor, getTallasDisponibles, getVariantePorTalla, getVarianteBase, TALLAS_ESTANDAR } from '../../shared/utils/catalogo';
import { esAgotado } from '../../shared/components/cart/cantidad';
import CantidadControl from '../../shared/components/cart/CantidadControl';
import BotonFavorito from '../../shared/components/favoritos/BotonFavorito';
import "./ProductDetailPage.css";

const normalizarTalla = (t) => String(t).trim().toUpperCase();

const NOMBRES_CATEGORIA = { busos: "Buzos" };
const nombreCategoria = (catKey) =>
  NOMBRES_CATEGORIA[catKey] || (catKey ? catKey.charAt(0).toUpperCase() + catKey.slice(1) : "");

export default function ProductDetailPage({ product, onBack, addToCart, catalogoCompleto, onIrALogin }) {
  const [cantidad, setCantidad] = useState(1);
  const [imagenPrincipal, setImagenPrincipal] = useState(product?.image);
  const [tallaSel, setTallaSel] = useState(() => {
    const disponibles = getTallasDisponibles(product, catalogoCompleto || []);
    const tallaPropia =
      product?.size &&
      disponibles.some(
        (talla) => normalizarTalla(talla) === normalizarTalla(product.size)
      );
    return tallaPropia ? product.size : disponibles[0] || null;
  });

  const variantes = getVariantesPorColor(product, catalogoCompleto || []);
  const tieneVariantes = variantes && variantes.length > 0;

  // Tallas reales del grupo (nunca inventadas) + listado completo del detalle
  const tallasDisponibles = getTallasDisponibles(product, catalogoCompleto || []);
  const disponiblesNorm = new Set(tallasDisponibles.map(normalizarTalla));
    const esRopa = tallasDisponibles.some((t) => TALLAS_ESTANDAR.includes(normalizarTalla(t)));
  const tallasVisibles = esRopa
    ? [
        ...TALLAS_ESTANDAR,
        ...tallasDisponibles.filter((t) => !TALLAS_ESTANDAR.includes(normalizarTalla(t)))
      ]
    : tallasDisponibles;

  // Variante real de la talla seleccionada: de aquí salen id, stock,
  // imagen y etiqueta que viajan al carrito.
  const varianteSel =
    (tallaSel != null && getVariantePorTalla(product, tallaSel, catalogoCompleto)) ||
    getVarianteBase(product, catalogoCompleto) ||
    product;

  // Variante sin unidades: no se puede comprar.
  const agotado = esAgotado(varianteSel?.stock);

  // Cambia la talla y, si corresponde, la variante real asociada
  // (id_variante, stock e imagen). Al cambiar de variante la cantidad
  // vuelve a 1: cada stock se controla por separado.
  const seleccionarTalla = (talla) => {
    const variante =
      (talla != null && getVariantePorTalla(product, talla, catalogoCompleto)) ||
      getVarianteBase(product, catalogoCompleto) ||
      product;

    setTallaSel(talla);

    if (variante && variante.id !== varianteSel?.id) {
      setCantidad(1);
      if (variante.image) setImagenPrincipal(variante.image);
    }
  };

  if (!product) return null;

  const catKey = String(product.categoryId || "").toLowerCase();
  const isGorras =
    catKey === "gorras" ||
    String(product.name || "").toLowerCase().includes("gorra");

  const coloresActuales = tieneVariantes ? variantes.map(v => v.color).filter(Boolean) : (product.color ? [product.color] : []);

  const descripcion = product.description || product.descripcion || null;
  const mostrarRating = typeof product.rating !== "undefined" && product.rating !== null;

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
            <div className="pdp-title-row">
              <h1 className="pdp-name">{product.name}</h1>
              <BotonFavorito
                idProducto={product.id_producto ?? product.grupoId}
                nombre={product.name}
                variante="contorno"
                onIniciarSesion={onIrALogin}
              />
            </div>
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
                <p>Producto {nombreCategoria(catKey)} de alta calidad. Diseño moderno y acabado cuidado.</p>
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

            {/* Sin tallas reales (gorras, perfumes, relojes, etc.) no se
                muestra la fila de tallas */}
            {isGorras || tallasDisponibles.length === 0 ? null : (
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
                        onClick={() => seleccionarTalla(s)}
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
              <CantidadControl
                className="pdp-qty"
                cantidad={cantidad}
                stock={varianteSel.stock}
                onChange={setCantidad}
              />
            </div>

            <button
              className={`pdp-addtocart${agotado ? " is-agotado" : ""}`}
              disabled={agotado}
              title={agotado ? "Producto agotado: no hay unidades disponibles" : "Agregar al carrito"}
              onClick={() =>
                addToCart({
                  ...varianteSel,
                  quantity: cantidad,
                  ...(varianteSel.size ? { size: varianteSel.size } : {}),
                })
              }
            >
              <ShoppingBag size={16} /> {agotado ? "Agotado" : "Agregar al carrito"}
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