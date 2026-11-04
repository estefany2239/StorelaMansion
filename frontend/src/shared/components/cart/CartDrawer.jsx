import { X, Trash2 } from "lucide-react";
import CantidadControl from "./CantidadControl";
import { esAgotado, excedeStock, mensajeStock } from "./cantidad";
import { tallaVisible } from "../../utils/catalogo";
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

                    <h4>
                      {item.name}
                    </h4>

                    {(item.color || talla) && (
                      <p className="cart-item-specs">
                        {item.color ? `Color: ${item.color}` : ""}
                        {item.color && talla ? " | " : ""}
                        {talla ? `Talla: ${talla}` : ""}
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
                <span>Se calcula en el checkout</span>
              </div>

              <div className="cart-total">
                <span>Total productos</span>
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