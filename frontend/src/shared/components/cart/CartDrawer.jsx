import { useEffect, useState } from "react";
import { X, Trash2, ShoppingBag } from "lucide-react";
import CantidadControl from "./CantidadControl";
import { esAgotado, excedeStock, mensajeStock } from "./cantidad";
import { tallaVisible } from "../../utils/catalogo";
import "./CartDrawer.css";

const leerTemaOscuroSeguro = () => {
  try {
    if (typeof document === "undefined") return false;
    const html = document.documentElement;
    const body = document.body;
    const htmlTheme = html?.getAttribute("data-theme");
    const htmlTema = html?.getAttribute("data-tema");
    const bodyTheme = body?.getAttribute("data-theme");
    const bodyTema = body?.getAttribute("data-tema");
    return (
      htmlTheme === "dark" ||
      bodyTheme === "dark" ||
      htmlTema === "oscuro" ||
      bodyTema === "oscuro" ||
      html?.classList?.contains("dark") ||
      body?.classList?.contains("dark") ||
      html?.classList?.contains("dark-mode-active") ||
      body?.classList?.contains("dark-mode-active")
    );
  } catch {
    return false;
  }
};

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  removeFromCart,
  updateQuantity,
  clearCart,
  onContinuarCompra,
  darkMode,
}) {
  const [temaOscuroDoc, setTemaOscuroDoc] = useState(leerTemaOscuroSeguro);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const actualizar = () => setTemaOscuroDoc(leerTemaOscuroSeguro());
    actualizar();

    const observer = new MutationObserver(actualizar);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-tema", "class"],
    });
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-theme", "data-tema", "class"],
      });
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isOpen || !cart || cart.length === 0) {
      setConfirmClear(false);
    }
  }, [isOpen, cart]);

  useEffect(() => {
    if (!isOpen || !confirmClear) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setConfirmClear(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, confirmClear]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const esOscuro = Boolean(darkMode || temaOscuroDoc);

  // =========================================================
  // CONVERTIR PRECIO A NÚMERO
  // =========================================================

  const obtenerPrecio = (precio) => {
    if (typeof precio === "number") {
      return precio;
    }

    if (!precio) {
      return 0;
    }

    const precioLimpio = String(precio)
      .replace(/\$/g, "")
      .replace(/COP/gi, "")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .replace(/\s/g, "")
      .trim();

    const numero = Number(precioLimpio);

    return Number.isNaN(numero) ? 0 : numero;
  };

  // =========================================================
  // CALCULAR SUBTOTAL, ENVÍO Y TOTAL
  // =========================================================

  const subtotal = cart.reduce((acc, item) => {
    const precio = obtenerPrecio(item.price);
    const cantidad = Number(item.quantity) || 1;

    return acc + precio * cantidad;
  }, 0);

  // El costo de envío se define en el checkout, cuando ya se eligió la
  // ubicación. Aquí no se muestra $0 como si fuera una tarifa real.
  const total = subtotal;

  const totalItems = cart.reduce(
    (acc, item) => acc + (Number(item.quantity) || 1),
    0
  );

  // Alguna línea sin unidades: no se puede avanzar al pago con ella.
  const hayAgotado = cart.some((item) => esAgotado(item.stock));

  // Alguna línea pide más unidades de las disponibles. Estar justo en el
  // stock no bloquea (la alerta es solo para el exceso).
  const hayExcesoStock = cart.some((item) =>
    excedeStock(item.quantity, item.stock)
  );
  const hayBloqueoStock = hayAgotado || hayExcesoStock;

  // =========================================================
  // FORMATO DE PESOS COLOMBIANOS
  // =========================================================

  const formatoPrecio = (valor) => {
    return `$${valor.toLocaleString("es-CO")} COP`;
  };

  return (
    <div
      className={`cart-overlay carrito ${esOscuro ? "dark" : "light"}`}
      data-tema={esOscuro ? "oscuro" : "claro"}
      data-theme={esOscuro ? "dark" : "light"}
    >
      <div className="cart-drawer">

        {/* =====================================================
            ENCABEZADO
        ===================================================== */}

        <div className="cart-header">
          <div className="cart-header-title">
            <h3>Mi carrito</h3>
            <span className="cart-header-bar" aria-hidden="true" />
            <span className="cart-header-count">
              {totalItems} {totalItems === 1 ? "producto" : "productos"}
            </span>
          </div>

          <button
            className="close-cart-btn"
            onClick={onClose}
            aria-label="Cerrar carrito"
            title="Cerrar carrito"
          >
            <X size={18} />
          </button>
        </div>

        {cart.length > 0 && (
          <div className="cart-clear-row">
            <button
              type="button"
              className="cart-clear-btn"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 size={14} />
              <span>Vaciar carrito</span>
            </button>
          </div>
        )}

        {confirmClear && cart.length > 0 && (
          <div className="cart-clear-confirm" role="alertdialog" aria-label="Confirmar vaciar carrito">
            <span className="cart-clear-confirm-text">¿Vaciar todo el carrito?</span>
            <div className="cart-clear-confirm-actions">
              <button
                type="button"
                className="cart-clear-cancel"
                onClick={() => setConfirmClear(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="cart-clear-yes"
                onClick={() => {
                  if (clearCart) clearCart();
                  setConfirmClear(false);
                }}
              >
                Sí, vaciar
              </button>
            </div>
          </div>
        )}

        {/* =====================================================
            PRODUCTOS
        ===================================================== */}

        <div className="cart-items-list">

          {cart.length === 0 ? (

            <div className="cart-empty-state">
              <div className="cart-empty-icon" aria-hidden="true">
                <ShoppingBag size={34} />
              </div>
              <p className="empty-cart-text">
                Tu carrito está vacío
              </p>
              <button
                type="button"
                className="cart-empty-btn"
                onClick={onClose}
              >
                Seguir comprando
              </button>
            </div>

          ) : (

            cart.map((item) => {

              const precio = obtenerPrecio(item.price);

              const cantidad =
                Number(item.quantity) || 1;

              const talla = tallaVisible(item.size);

              return (
                <div
                  key={`${item.id}-${talla}-${item.color || ""}`}
                  className="cart-item"
                >

                  {/* IMAGEN */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-item-img"
                  />

                  {/* INFORMACIÓN */}
                  <div className="cart-item-details">

                    <div className="cart-item-top">
                      <h4 className="cart-item-name">
                        {item.name}
                      </h4>

                      <button
                        type="button"
                        className="remove-item-btn"
                        onClick={() =>
                          removeFromCart(item.id)
                        }
                        title="Eliminar producto"
                        aria-label="Eliminar producto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {(item.color || talla) && (
                      <p className="cart-item-specs">
                        {item.color ? (
                          <span className="cart-item-spec">
                            <span
                              className="cart-item-color-dot"
                              style={{ background: item.color }}
                              aria-hidden="true"
                            />
                            {item.color}
                          </span>
                        ) : null}
                        {item.color && talla ? (
                          <span className="cart-item-spec-sep" aria-hidden="true">·</span>
                        ) : null}
                        {talla ? (
                          <span className="cart-item-spec">Talla {talla}</span>
                        ) : null}
                      </p>
                    )}

                    {esAgotado(item.stock) && (
                      <p className="cart-item-agotado" role="status">
                        Agotado · no hay unidades disponibles
                      </p>
                    )}

                    {excedeStock(cantidad, item.stock) && (
                      <p className="cart-item-agotado" role="alert">
                        {mensajeStock(Number(item.stock))}
                      </p>
                    )}

                    <p className="cart-item-price">
                      {formatoPrecio(precio)}
                      {cantidad > 1 && (
                        <span className="cart-item-line-total">
                          {" · Subtotal "}
                          {formatoPrecio(precio * cantidad)}
                        </span>
                      )}
                    </p>

                    <div className="cart-item-controls">
                      <CantidadControl
                        className="cart-qty"
                        cantidad={cantidad}
                        stock={item.stock}
                        onChange={(valor) =>
                          updateQuantity &&
                          updateQuantity(item.id, valor)
                        }
                      />
                    </div>

                  </div>

                </div>
              );
            })

          )}

        </div>

        {/* =====================================================
            RESUMEN DEL PEDIDO Y PAGO
        ===================================================== */}

        {cart.length > 0 && (

          <div className="cart-footer">

            <div className="cart-summary-box">

              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>{formatoPrecio(subtotal)}</span>
              </div>

              <div className="cart-summary-row">
                <span>Envío</span>
                <span>Se calcula en el checkout</span>
              </div>

              <div className="cart-total">
                <span>Total</span>
                <strong>{formatoPrecio(total)}</strong>
              </div>
            </div>

            {hayAgotado && (
              <p className="cart-stock-alert" role="alert">
                Hay productos agotados en tu carrito: elimínalos para
                continuar con tu compra.
              </p>
            )}

            {hayExcesoStock && (
              <p className="cart-stock-alert" role="alert">
                Hay productos con cantidad mayor al stock disponible:
                ajusta la cantidad para continuar.
              </p>
            )}

            <button
              className="continue-btn"
              disabled={hayBloqueoStock}
              onClick={() => {
                if (onContinuarCompra) {
                  onContinuarCompra();
                }
              }}
            >
              Continuar compra
            </button>

            <button
              className="keep-shopping-btn"
              onClick={onClose}
            >
              Seguir comprando
            </button>

          </div>

        )}

      </div>
    </div>
  );
}