import { useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  Upload,
  CheckCircle,
  Receipt,
  Wallet,
  ShieldCheck,
} from "lucide-react";

import {
  obtenerPrecio,
  crearPedido
} from "../../features/store/pedidosCliente";

import "./PaymentView.css";

const ORDEN_CAMPOS = [
  "nombre",
  "telefono",
  "direccion",
  "ciudad",
  "metodo",
  "transferencia",
  "comprobante",
  "abono",
];

const ID_CAMPO = {
  nombre: "campo-nombre",
  telefono: "campo-telefono",
  direccion: "campo-direccion",
  ciudad: "campo-ciudad",
  metodo: "campo-metodo",
  transferencia: "campo-transferencia",
  comprobante: "campo-comprobante",
  abono: "campo-abono",
};

export default function PaymentView({
  cart,
  user,
  onBack,
  onConfirmarPedido,
  darkMode,
}) {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transferenciaTipo, setTransferenciaTipo] = useState("");
  const [proofFile, setProofFile] = useState(null);

  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [tipoPago, setTipoPago] = useState("completo");
  const [montoAbono, setMontoAbono] = useState("");

  const [nombreEntrega, setNombreEntrega] = useState("");
  const [telefonoEntrega, setTelefonoEntrega] = useState("");
  const [ciudadEntrega, setCiudadEntrega] = useState("");

  const [errores, setErrores] = useState({});

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
    limpiarError("comprobante");
  };

  /* =========================================================
     VALIDACIÓN
     Mismas reglas que antes: solo cambia cómo se muestra
  ========================================================= */

  const limpiarError = (clave) => {
    setErrores((previos) => {
      if (!previos[clave]) {
        return previos;
      }

      const siguiente = { ...previos };
      delete siguiente[clave];

      return siguiente;
    });
  };

  const irACampo = (id) => {
    window.setTimeout(() => {
      const campo = document.getElementById(id);

      if (campo) {
        campo.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 60);
  };

  const validarPago = () => {
    const faltan = {};

    const marcar = (clave, texto) => {
      faltan[clave] = { texto };
    };

    if (!nombreEntrega.trim()) {
      marcar("nombre", "Este campo es obligatorio.");
    }

    if (!telefonoEntrega.trim()) {
      marcar("telefono", "Este campo es obligatorio.");
    }

    if (!direccionEntrega.trim()) {
      marcar("direccion", "Este campo es obligatorio.");
    }

    if (!ciudadEntrega.trim()) {
      marcar("ciudad", "Este campo es obligatorio.");
    }

    if (!paymentMethod) {
      marcar("metodo", "Selecciona una opción.");
    }

    if (paymentMethod === "transferencia" && !transferenciaTipo) {
      marcar("transferencia", "Selecciona un medio.");
    }

    if (paymentMethod === "transferencia" && !proofFile) {
      marcar("comprobante", "Adjunta el comprobante.");
    }

    const montoNum = Number(montoAbono);

    if (tipoPago === "parcial") {
      if (!montoAbono.trim() || Number.isNaN(montoNum) || montoNum <= 0) {
        marcar("abono", "Monto no válido.");
      } else if (montoNum > total) {
        marcar("abono", "Supera el total.");
      }
    }

    return faltan;
  };

  /* =========================================================
     CONFIRMAR PAGO
  ========================================================= */

  const handleConfirmPayment = () => {
    const faltan = validarPago();
    const claves = Object.keys(faltan);

    if (claves.length > 0) {
      const primero = ORDEN_CAMPOS.find((clave) => faltan[clave]);

      setErrores(faltan);

      irACampo(ID_CAMPO[primero]);

      return;
    }

    setErrores({});

    const nuevoPedido = crearPedido({
      clienteEmail: user?.email,
      cart,
      direccion: direccionEntrega.trim(),
      paymentMethod,
      transferenciaTipo,
      tipoPago,
      montoAbono
    });

    if (onConfirmarPedido) {
      onConfirmarPedido(nuevoPedido);
    }
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
          <CreditCard size={25} />
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

              <div
                className={`form-group ${errores.nombre ? "has-error" : ""}`}
                id="campo-nombre"
              >
                <label>
                  Nombre completo
                </label>

                <input
                  type="text"
                  placeholder="Ingresa tu nombre"
                  value={nombreEntrega}
                  onChange={(e) => {
                    setNombreEntrega(e.target.value);
                    limpiarError("nombre");
                  }}
                />

                {errores.nombre && (
                  <span className="field-error">
                    {errores.nombre.texto}
                  </span>
                )}
              </div>

              <div
                className={`form-group ${errores.telefono ? "has-error" : ""}`}
                id="campo-telefono"
              >
                <label>
                  Teléfono
                </label>

                <input
                  type="tel"
                  placeholder="300 000 0000"
                  value={telefonoEntrega}
                  onChange={(e) => {
                    setTelefonoEntrega(e.target.value);
                    limpiarError("telefono");
                  }}
                />

                {errores.telefono && (
                  <span className="field-error">
                    {errores.telefono.texto}
                  </span>
                )}
              </div>

              <div
                className={`form-group ${errores.direccion ? "has-error" : ""}`}
                id="campo-direccion"
              >
                <label>
                  Dirección
                </label>

                <input
                  type="text"
                  placeholder="Calle, carrera, número..."
                  value={direccionEntrega}
                  onChange={(e) => {
                    setDireccionEntrega(e.target.value);
                    limpiarError("direccion");
                  }}
                />

                {errores.direccion && (
                  <span className="field-error">
                    {errores.direccion.texto}
                  </span>
                )}
              </div>

              <div
                className={`form-group ${errores.ciudad ? "has-error" : ""}`}
                id="campo-ciudad"
              >
                <label>
                  Ciudad
                </label>

                <input
                  type="text"
                  placeholder="Medellín"
                  value={ciudadEntrega}
                  onChange={(e) => {
                    setCiudadEntrega(e.target.value);
                    limpiarError("ciudad");
                  }}
                />

                {errores.ciudad && (
                  <span className="field-error">
                    {errores.ciudad.texto}
                  </span>
                )}
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

            <div
              className={`payment-methods ${errores.metodo ? "has-error" : ""}`}
              id="campo-metodo"
            >

              {/* EFECTIVO */}

              <button
                type="button"
                className={`payment-method ${
                  paymentMethod === "efectivo"
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  setPaymentMethod("efectivo");
                  limpiarError("metodo");
                }}
              >

                <div className="method-icon">
                  <Banknote size={23} />
                </div>

                <div className="method-info">

                  <strong>
                    Efectivo
                  </strong>

                  <span>
                    Pago en efectivo
                  </span>

                </div>

                {paymentMethod === "efectivo" && (
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
                onClick={() => {
                  setPaymentMethod("transferencia");
                  setTransferenciaTipo("");
                  limpiarError("metodo");
                  limpiarError("transferencia");
                  limpiarError("comprobante");
                }}
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


              {/* CRÉDITO */}

              <button
                type="button"
                className={`payment-method ${
                  paymentMethod === "credito"
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  setPaymentMethod("credito");
                  limpiarError("metodo");
                }}
              >

                <div className="method-icon">
                  <CreditCard size={23} />
                </div>

                <div className="method-info">

                  <strong>
                    Crédito
                  </strong>

                  <span>
                    Pago con tarjeta de crédito
                  </span>

                </div>

                {paymentMethod === "credito" && (
                  <CheckCircle
                    className="method-check"
                    size={19}
                  />
                )}

              </button>

            </div>

            {errores.metodo && (
              <span className="field-error">
                {errores.metodo.texto}
              </span>
            )}


            {/* =================================================
                EFECTIVO
            ================================================= */}

            {paymentMethod === "efectivo" && (

              <div className="payment-extra">

                <div className="extra-title">

                  <Banknote size={19} />

                  <span>
                    Pago en efectivo
                  </span>

                </div>

                <p className="payment-instruction">
                  Paga en efectivo al momento de recibir tu
                  pedido.
                </p>

              </div>

            )}


            {/* =================================================
                TRANSFERENCIA
            ================================================= */}

            {paymentMethod === "transferencia" && (

              <>

                <div className="payment-extra">

                  <div className="extra-title">

                    <Building2 size={19} />

                    <span>
                      Medio de transferencia
                    </span>

                  </div>

                  <p className="payment-instruction">
                    Selecciona el medio por el que realizarás
                    la transferencia.
                  </p>

                  <div
                    className={`payment-methods ${errores.transferencia ? "has-error" : ""}`}
                    id="campo-transferencia"
                  >

                    {/* NEQUI */}

                    <button
                      type="button"
                      className={`payment-method ${
                        transferenciaTipo === "nequi"
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => {
                        setTransferenciaTipo("nequi");
                        limpiarError("transferencia");
                      }}
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

                      {transferenciaTipo === "nequi" && (
                        <CheckCircle
                          className="method-check"
                          size={19}
                        />
                      )}

                    </button>


                    {/* BANCOLOMBIA */}

                    <button
                      type="button"
                      className={`payment-method ${
                        transferenciaTipo === "bancolombia"
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => {
                        setTransferenciaTipo("bancolombia");
                        limpiarError("transferencia");
                      }}
                    >

                      <div className="method-icon">
                        <Building2 size={23} />
                      </div>

                      <div className="method-info">

                        <strong>
                          Bancolombia
                        </strong>

                        <span>
                          Transferencia bancaria
                        </span>

                      </div>

                      {transferenciaTipo === "bancolombia" && (
                        <CheckCircle
                          className="method-check"
                          size={19}
                        />
                      )}

                    </button>

                  </div>

                  {errores.transferencia && (
                    <span className="field-error">
                      {errores.transferencia.texto}
                    </span>
                  )}

                </div>


                {/* NEQUI - INSTRUCCIONES */}

                {transferenciaTipo === "nequi" && (

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

                    <div
                      className={`proof-upload ${errores.comprobante ? "has-error" : ""}`}
                      id="campo-comprobante"
                    >

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

                    {errores.comprobante && (
                      <span className="field-error">
                        {errores.comprobante.texto}
                      </span>
                    )}

                  </div>

                )}


                {/* BANCOLOMBIA - DATOS DE LA CUENTA */}

                {transferenciaTipo === "bancolombia" && (

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

                    <div
                      className={`proof-upload ${errores.comprobante ? "has-error" : ""}`}
                      id="campo-comprobante"
                    >

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

                    {errores.comprobante && (
                      <span className="field-error">
                        {errores.comprobante.texto}
                      </span>
                    )}

                  </div>

                )}

              </>

            )}


            {/* =================================================
                CRÉDITO
            ================================================= */}

            {paymentMethod === "credito" && (

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

          </section>


          {/* =================================================
              ¿CUÁNTO VAS A PAGAR?
          ================================================= */}

          <section className="payment-card">

            <div className="section-heading">

              <div className="section-number">
                3
              </div>

              <div>
                <h2>¿Cuánto vas a pagar?</h2>

                <p>
                  Paga el total del pedido o abona solo una parte hoy.
                </p>
              </div>

            </div>

            <div className="payment-methods">

              <button
                type="button"
                className={`payment-method ${
                  tipoPago === "completo" ? "selected" : ""
                }`}
                onClick={() => {
                  setTipoPago("completo");
                  limpiarError("abono");
                }}
              >

                <div className="method-icon">
                  <CreditCard size={23} />
                </div>

                <div className="method-info">

                  <strong>
                    Pagar el total
                  </strong>

                  <span>
                    {formatoPrecio(total)}
                  </span>

                </div>

                {tipoPago === "completo" && (
                  <CheckCircle
                    className="method-check"
                    size={19}
                  />
                )}

              </button>


              <button
                type="button"
                className={`payment-method ${
                  tipoPago === "parcial" ? "selected" : ""
                }`}
                onClick={() => {
                  setTipoPago("parcial");
                  limpiarError("abono");
                }}
              >

                <div className="method-icon">
                  <Wallet size={23} />
                </div>

                <div className="method-info">

                  <strong>
                    Abonar una parte
                  </strong>

                  <span>
                    Define cuánto abonas hoy
                  </span>

                </div>

                {tipoPago === "parcial" && (
                  <CheckCircle
                    className="method-check"
                    size={19}
                  />
                )}

              </button>

            </div>


            {tipoPago === "parcial" && (

              <div className="payment-extra">

                <div className="extra-title">

                  <Wallet size={19} />

                  <span>
                    Abono inicial
                  </span>

                </div>

                <p className="payment-instruction">
                  Total del pedido: {formatoPrecio(total)}.
                  ¿Cuánto deseas abonar hoy?
                </p>

                <div
                  className={`form-group ${errores.abono ? "has-error" : ""}`}
                  id="campo-abono"
                >

                  <label>
                    Monto a abonar
                  </label>

                  <input
                    type="number"
                    min="1"
                    placeholder="Ej. 150000"
                    value={montoAbono}
                    onChange={(e) => {
                      setMontoAbono(e.target.value);
                      limpiarError("abono");
                    }}
                  />

                  {errores.abono && (
                    <span className="field-error">
                      {errores.abono.texto}
                    </span>
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

            <Receipt size={23} />

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