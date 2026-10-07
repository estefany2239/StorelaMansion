import { X, Trash2, Minus, Plus } from "lucide-react";
import "./CartDrawer.css";

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  removeFromCart,
  updateQuantity,
  onContinuarCompra,
  darkMode,
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
  // CALCULAR SUBTOTAL, ENVÍO Y TOTAL
  // =========================================================

  const subtotal = cart.reduce((acc, item) => {
    const precio = obtenerPrecio(item.price);
    const cantidad = Number(item.quantity) || 1;

    return acc + precio * cantidad;
  }, 0);

  // No existe lógica real de envío: se muestra $0.
  const envio = 0;
  const total = subtotal + envio;

  const totalItems = cart.reduce(
    (acc, item) => acc + (Number(item.quantity) || 1),
    0
  );

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
            Tu carrito ({totalItems})
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
                  key={`${item.id}-${item.size || ""}-${item.color || ""}`}
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

                    <p className="cart-item-specs">
                      Color: {item.color || "—"} | Talla: {item.size || "—"}
                    </p>

                    <p className="cart-item-price">
                      {formatoPrecio(precio)}
                    </p>

                    <div className="cart-item-controls">

                      <div className="cart-qty">
                        <button
                          type="button"
                          onClick={() => updateQuantity && updateQuantity(item.id, cantidad - 1)}
                          disabled={cantidad <= 1}
                          aria-label="Disminuir cantidad"
                        >
                          <Minus size={14} />
                        </button>
                        <span>{cantidad}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity && updateQuantity(item.id, cantidad + 1)}
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

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

              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>{formatoPrecio(subtotal)}</span>
              </div>

              <div className="cart-summary-row">
                <span>Envío</span>
                <span>{formatoPrecio(envio)}</span>
              </div>

              <div className="cart-total">
                <span>Total</span>
                <strong>{formatoPrecio(total)}</strong>
              </div>
            </div>

            <button
              className="continue-btn"
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