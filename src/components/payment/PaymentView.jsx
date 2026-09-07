import { useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Building2,
  Upload,
  CheckCircle,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";

import "./PaymentView.css";

export default function PaymentView({
  cart,
  onBack,
  darkMode,
}) {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [proofFile, setProofFile] = useState(null);

  /* =========================================================
     PRECIO
  ========================================================= */

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

  const formatoPrecio = (valor) => {
    return `$${valor.toLocaleString("es-CO")} COP`;
  };

  /* =========================================================
     TOTAL
  ========================================================= */

  const total = cart.reduce((acumulado, item) => {
    const precio = obtenerPrecio(item.price);
    const cantidad = Number(item.quantity) || 1;

    return acumulado + precio * cantidad;
  }, 0);

  /* =========================================================
     COMPROBANTE
  ========================================================= */

  const handleProofChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setProofFile(file);
  };

  /* =========================================================
     CONFIRMAR PAGO
  ========================================================= */

  const handleConfirmPayment = () => {
    if (!paymentMethod) {
      alert("Selecciona un método de pago.");
      return;
    }

    if (
      (paymentMethod === "nequi" ||
        paymentMethod === "transferencia") &&
      !proofFile
    ) {
      alert("Por favor adjunta el comprobante de pago.");
      return;
    }

    alert(
      "¡Compra realizada correctamente en Store La Mansión!"
    );
  };

  /* =========================================================
     TEMA
  ========================================================= */

  const themeClass = darkMode
    ? "payment-dark"
    : "payment-light";

  return (
    <div className={`payment-page ${themeClass}`}>

      {/* =====================================================
          VOLVER
      ===================================================== */}

      <div className="payment-top">

        <button
          type="button"
          className="payment-back"
          onClick={onBack}
        >
          <ArrowLeft size={18} />

          Volver al carrito
        </button>

      </div>

      {/* =====================================================
          TÍTULO
      ===================================================== */}

      <div className="payment-title">

        <div className="payment-title-icon">
          <ShoppingBag size={25} />
        </div>

        <div>
          <h1>Finalizar compra</h1>

          <p>
            Completa tus datos para realizar tu pedido.
          </p>
        </div>

      </div>

      {/* =====================================================
          CONTENIDO
      ===================================================== */}

      <div className="payment-content">

        {/* ===================================================
            COLUMNA IZQUIERDA
        =================================================== */}

        <div className="payment-main">

          {/* =================================================
              DATOS DE ENTREGA
          ================================================= */}

          <section className="payment-card">

            <div className="section-heading">

              <div className="section-number">
                1
              </div>

              <div>
                <h2>Datos de entrega</h2>

                <p>
                  Ingresa la información donde deseas recibir
                  tu pedido.
                </p>
              </div>

            </div>

            <div className="form-grid">

              <div className="form-group">
                <label>
                  Nombre completo
                </label>

                <input
                  type="text"
                  placeholder="Ingresa tu nombre"
                />
              </div>

              <div className="form-group">
                <label>
                  Teléfono
                </label>

                <input
                  type="tel"
                  placeholder="300 000 0000"
                />
              </div>

              <div className="form-group">
                <label>
                  Dirección
                </label>

                <input
                  type="text"
                  placeholder="Calle, carrera, número..."
                />
              </div>

              <div className="form-group">
                <label>
                  Ciudad
                </label>

                <input
                  type="text"
                  placeholder="Medellín"
                />
              </div>

            </div>

          </section>

          {/* =================================================
              MÉTODO DE PAGO
          ================================================= */}

          <section className="payment-card">

            <div className="section-heading">

              <div className="section-number">
                2
              </div>

              <div>
                <h2>Método de pago</h2>

                <p>
                  Selecciona cómo deseas realizar tu pago.
                </p>
              </div>

            </div>

            {/* =================================================
                MÉTODOS
            ================================================= */}

            <div className="payment-methods">

              {/* TARJETA */}

              <button
                type="button"
                className={`payment-method ${
                  paymentMethod === "tarjeta"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setPaymentMethod("tarjeta")
                }
              >

                <div className="method-icon">
                  <CreditCard size={23} />
                </div>

                <div className="method-info">

                  <strong>
                    Tarjeta
                  </strong>

                  <span>
                    Crédito o débito
                  </span>

                </div>

                {paymentMethod === "tarjeta" && (
                  <CheckCircle
                    className="method-check"
                    size={19}
                  />
                )}

              </button>


              {/* NEQUI */}

              <button
                type="button"
                className={`payment-method ${
                  paymentMethod === "nequi"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setPaymentMethod("nequi")
                }
              >

                <div className="method-icon">
                  <Smartphone size={23} />
                </div>

                <div className="method-info">

                  <strong>
                    Nequi
                  </strong>

                  <span>
                    Pago desde Nequi
                  </span>

                </div>

                {paymentMethod === "nequi" && (
                  <CheckCircle
                    className="method-check"
                    size={19}
                  />
                )}

              </button>


              {/* TRANSFERENCIA */}

              <button
                type="button"
                className={`payment-method ${
                  paymentMethod === "transferencia"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setPaymentMethod("transferencia")
                }
              >

                <div className="method-icon">
                  <Building2 size={23} />
                </div>

                <div className="method-info">

                  <strong>
                    Transferencia
                  </strong>

                  <span>
                    Transferencia bancaria
                  </span>

                </div>

                {paymentMethod === "transferencia" && (
                  <CheckCircle
                    className="method-check"
                    size={19}
                  />
                )}

              </button>

            </div>


            {/* =================================================
                TARJETA
            ================================================= */}

            {paymentMethod === "tarjeta" && (

              <div className="payment-extra">

                <div className="extra-title">

                  <CreditCard size={19} />

                  <span>
                    Datos de la tarjeta
                  </span>

                </div>

                <div className="form-group">

                  <label>
                    Número de tarjeta
                  </label>

                  <input
                    type="text"
                    placeholder="0000 0000 0000 0000"
                  />

                </div>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Fecha de vencimiento
                    </label>

                    <input
                      type="text"
                      placeholder="MM/AA"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      CVV
                    </label>

                    <input
                      type="password"
                      placeholder="123"
                    />

                  </div>

                </div>

                <div className="form-group">

                  <label>
                    Nombre del titular
                  </label>

                  <input
                    type="text"
                    placeholder="Nombre del titular"
                  />

                </div>

                <div className="payment-notice">

                  <ShieldCheck size={18} />

                  <span>
                    Tus datos de pago se manejan de forma
                    segura.
                  </span>

                </div>

              </div>

            )}


            {/* =================================================
                NEQUI
            ================================================= */}

            {paymentMethod === "nequi" && (

              <div className="payment-extra">

                <div className="extra-title">

                  <Smartphone size={19} />

                  <span>
                    Pago por Nequi
                  </span>

                </div>

                <p className="payment-instruction">
                  Realiza el pago al número de Nequi
                  registrado por Store La Mansión.
                </p>


                {/* NÚMERO NEQUI */}

                <div className="payment-account">

                  <div>

                    <span>
                      Número Nequi
                    </span>

                    <strong>
                      300 000 0000
                    </strong>

                  </div>

                  <Smartphone size={22} />

                </div>


                {/* AVISO */}

                <div className="payment-notice">

                  <CheckCircle size={18} />

                  <span>
                    Después de realizar el pago, adjunta
                    una captura o imagen del comprobante.
                  </span>

                </div>


                {/* COMPROBANTE */}

                <div className="proof-upload">

                  <label className="proof-label">
                    Comprobante de pago
                  </label>

                  <label className="upload-proof-btn">

                    <Upload size={18} />

                    <span>
                      {proofFile
                        ? proofFile.name
                        : "Subir comprobante"}
                    </span>

                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleProofChange}
                    />

                  </label>


                  {proofFile && (
                    <div className="proof-success">

                      <CheckCircle size={17} />

                      <span>
                        Comprobante seleccionado
                      </span>

                    </div>
                  )}

                </div>

              </div>

            )}


            {/* =================================================
                TRANSFERENCIA
            ================================================= */}

            {paymentMethod === "transferencia" && (

              <div className="payment-extra">

                <div className="extra-title">

                  <Building2 size={19} />

                  <span>
                    Transferencia bancaria
                  </span>

                </div>


                <div className="transfer-layout">

                  <div className="transfer-data">

                    <p className="payment-instruction">
                      Realiza la transferencia utilizando
                      los siguientes datos.
                    </p>


                    <div className="bank-data">

                      <span>
                        Banco
                      </span>

                      <strong>
                        Bancolombia
                      </strong>

                    </div>


                    <div className="bank-data">

                      <span>
                        Tipo de cuenta
                      </span>

                      <strong>
                        Cuenta de ahorros
                      </strong>

                    </div>


                    <div className="bank-data">

                      <span>
                        Número
                      </span>

                      <strong>
                        000 000 0000
                      </strong>

                    </div>


                    <div className="bank-data">

                      <span>
                        Titular
                      </span>

                      <strong>
                        Store La Mansión
                      </strong>

                    </div>

                  </div>

                </div>


                {/* COMPROBANTE */}

                <div className="proof-upload">

                  <label className="proof-label">
                    Comprobante de pago
                  </label>

                  <label className="upload-proof-btn">

                    <Upload size={18} />

                    <span>
                      {proofFile
                        ? proofFile.name
                        : "Subir comprobante"}
                    </span>

                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleProofChange}
                    />

                  </label>


                  {proofFile && (
                    <div className="proof-success">

                      <CheckCircle size={17} />

                      <span>
                        Comprobante seleccionado
                      </span>

                    </div>
                  )}

                </div>

              </div>

            )}

          </section>

        </div>


        {/* ===================================================
            RESUMEN DEL PEDIDO
        =================================================== */}

        <aside className="payment-summary">

          <div className="summary-header">

            <div>

              <h2>
                Resumen del pedido
              </h2>

              <span>
                {cart.length} producto
                {cart.length !== 1 ? "s" : ""}
              </span>

            </div>

            <ShoppingBag size={23} />

          </div>


          {/* PRODUCTOS */}

          <div className="summary-products">

            {cart.map((item) => {

              const precio =
                obtenerPrecio(item.price);

              const cantidad =
                Number(item.quantity) || 1;

              const subtotal =
                precio * cantidad;

              return (

                <div
                  className="summary-product"
                  key={item.id}
                >

                  <div className="summary-product-image">

                    <img
                      src={item.image}
                      alt={item.name}
                    />

                    <span>
                      {cantidad}
                    </span>

                  </div>


                  <div className="summary-product-info">

                    <h4>
                      {item.name}
                    </h4>

                    <p>
                      Cantidad: {cantidad}
                    </p>

                  </div>


                  <strong>
                    {formatoPrecio(subtotal)}
                  </strong>

                </div>

              );
            })}

          </div>


          {/* TOTAL */}

          <div className="summary-total">

            <span>
              Total
            </span>

            <strong>
              {formatoPrecio(total)}
            </strong>

          </div>


          {/* SEGURIDAD */}

          <div className="secure-payment">

            <ShieldCheck size={17} />

            <span>
              Compra segura y protegida
            </span>

          </div>


          {/* CONFIRMAR */}

          <button
            type="button"
            className="confirm-payment-btn"
            onClick={handleConfirmPayment}
          >
            Confirmar y pagar
          </button>

        </aside>

      </div>

    </div>
  );
}