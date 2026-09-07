import { X, Trash2, ShoppingBag } from "lucide-react";
import "./CartDrawer.css";

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  removeFromCart,
  darkMode,
  onCheckout,
}) {
  if (!isOpen) return null;

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
  // CALCULAR TOTAL
  // =========================================================

  const total = cart.reduce((acc, item) => {
    const precio = obtenerPrecio(item.price);
    const cantidad = Number(item.quantity) || 1;

    return acc + precio * cantidad;
  }, 0);

  // =========================================================
  // FORMATO DE PESOS COLOMBIANOS
  // =========================================================

  const formatoPrecio = (valor) => {
    return `$${valor.toLocaleString("es-CO")} COP`;
  };

  return (
    <div
      className={`cart-overlay ${
        darkMode ? "dark" : "light"
      }`}
    >
      <div className="cart-drawer">

        {/* =====================================================
            ENCABEZADO
        ===================================================== */}

        <div className="cart-header">
          <h3>
            <ShoppingBag size={20} />
            Tu Carrito - La Mansión
          </h3>

          <button
            className="close-cart-btn"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* =====================================================
            PRODUCTOS
        ===================================================== */}

        <div className="cart-items-list">

          {cart.length === 0 ? (

            <p className="empty-cart-text">
              Tu carrito está vacío. Explora nuestras
              colecciones y añade estilo.
            </p>

          ) : (

            cart.map((item) => {

              const precio = obtenerPrecio(item.price);

              const cantidad =
                Number(item.quantity) || 1;

              return (
                <div
                  key={item.id}
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

                    <h4>
                      {item.name}
                    </h4>

                    <p className="cart-item-price">
                      {formatoPrecio(precio)}
                    </p>

                    <div className="cart-item-controls">

                      <span>
                        Cantidad: {cantidad}
                      </span>

                      <button
                        className="remove-item-btn"
                        onClick={() =>
                          removeFromCart(item.id)
                        }
                        title="Eliminar producto"
                      >
                        <Trash2 size={16} />
                      </button>

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
              <h4 className="cart-summary-title">Resumen del pedido</h4>

              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>{formatoPrecio(total)}</span>
              </div>

              <div className="cart-summary-row">
                <span>Envío</span>
                <span className="free-shipping">Gratis</span>
              </div>

              <div className="cart-total">
                <span>Total a pagar</span>
                <strong>{formatoPrecio(total)}</strong>
              </div>
            </div>

            <button
              className="checkout-btn"
              onClick={() => {
                onClose();

                if (onCheckout) {
                  onCheckout();
                }
              }}
            >
              Proceder al pago
            </button>

          </div>

        )}

      </div>
    </div>
  );
}