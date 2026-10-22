import { useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Building2,
  Upload,
  CheckCircle,
  Receipt,
  Wallet,
  ShieldCheck,
  Truck,
  Store,
} from "lucide-react";

import { obtenerPrecio } from "../../features/store/pedidosCliente";
import { esAgotado, hayStock } from "../cart/cantidad";
import { crearPedido } from "../../services/api";
import { useNotify } from "../notifications/useNotify.js";
import { NOMBRE_COMPLETO_VALIDO } from "../../features/auth/validacionesRegistro";
import DIVIPOLA from "../../data/divipola.json";

import "./PaymentView.css";

// El abono libre (monto a elegir) todavía no es una opción del checkout: el
// único abono es el 50 % fijo de "Contra entrega", que calcula y persiste el
// backend. Se oculta la sección "Abonar una parte" sin borrar el código.
const ABONOS_HABILITADOS = false;

// Largo máximo de la columna domicilio.direccion_entrega (varchar(255)).
const LARGO_MAX_DIRECCION = 255;

// Mismas reglas que el backend (utils/ubicaciones.js).
const LARGO_MAX_NOMBRE = 100;
const LARGO_MAX_BARRIO = 100;
const LARGO_MAX_TELEFONO = 10;
const BARRIO_VALIDO = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s'\-.]+$/;

const ORDEN_CAMPOS = [
  "nombre",
  "telefono",
  "departamento",
  "municipio",
  "barrio",
  "direccion",
  "metodo",
  "transferencia",
  "comprobante",
  "abono",
];

const ID_CAMPO = {
  nombre: "campo-nombre",
  telefono: "campo-telefono",
  departamento: "campo-departamento",
  municipio: "campo-municipio",
  barrio: "campo-barrio",
  direccion: "campo-direccion",
  metodo: "campo-metodo",
  transferencia: "campo-transferencia",
  comprobante: "campo-comprobante",
  abono: "campo-abono",
};

export default function PaymentView({
  cart,
  onBack,
  onConfirmarPedido,
  onStockActualizado,
  darkMode,
}) {
  const notify = useNotify();
  const [enviando, setEnviando] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transferenciaTipo, setTransferenciaTipo] = useState("");
  const [proofFile, setProofFile] = useState(null);

  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [tipoPago, setTipoPago] = useState("completo");
  const [montoAbono, setMontoAbono] = useState("");
  const [metodoEnvio, setMetodoEnvio] = useState("domicilio");

  const [nombreEntrega, setNombreEntrega] = useState("");
  const [telefonoEntrega, setTelefonoEntrega] = useState("");
  // Se guardan los códigos DIVIPOLA seleccionados; los nombres oficiales
  // se leen del catálogo antes de enviar.
  const [departamentoCodigo, setDepartamentoCodigo] = useState("");
  const [municipioCodigo, setMunicipioCodigo] = useState("");
  const [barrioEntrega, setBarrioEntrega] = useState("");

  const [errores, setErrores] = useState({});

  const formatoPrecio = (valor) => {
    return `$${valor.toLocaleString("es-CO")} COP`;
  };

  /* =========================================================
     CONTROL DE STOCK DEL CARRITO
     ========================================================= */

  // Líneas sin unidades: bloquean el pago y se muestran en el resumen.
  const agotados = cart.filter((item) => esAgotado(item.stock));

  // Líneas cuya cantidad pide más de lo que hay (solo con stock informado).
  const excedenStock = cart.filter(
    (item) =>
      hayStock(item.stock) &&
      (Number(item.quantity) || 1) > Number(item.stock)
  );

  /* =========================================================
     TOTAL
  ========================================================= */

  const total = cart.reduce((acumulado, item) => {
    const precio = obtenerPrecio(item.price);
    const cantidad = Number(item.quantity) || 1;

    return acumulado + precio * cantidad;
  }, 0);

  /* =========================================================
     DERIVADOS
  ========================================================= */

  // Abono del 50 % de "Contra entrega" (mismo redondeo que el backend).
  const abonoContraEntrega = Math.round(total * 0.5);

  const esTransferencia = paymentMethod === "transferencia";
  const esContraEntrega = paymentMethod === "contra_entrega";
  const requiereBanco = esTransferencia || esContraEntrega;
  const esDomicilio = metodoEnvio === "domicilio";

  /* =========================================================
     CATÁLOGO DIVIPOLA (departamento -> municipio)
  ========================================================= */

  const municipiosDelDepartamento =
    DIVIPOLA.departamentos.find((d) => d.codigo === departamentoCodigo)
      ?.municipios ?? [];

  const nombreDepartamento =
    DIVIPOLA.departamentos.find((d) => d.codigo === departamentoCodigo)?.nombre ?? "";

  const nombreMunicipio =
    municipiosDelDepartamento.find((m) => m.codigo === municipioCodigo)?.nombre ?? "";

  // Cambiar el departamento invalida el municipio y el barrio elegidos.
  const cambiarDepartamento = (codigo) => {
    setDepartamentoCodigo(codigo);
    setMunicipioCodigo("");
    setBarrioEntrega("");
    limpiarError("departamento");
    limpiarError("municipio");
    limpiarError("barrio");
  };

  // Cambiar el municipio invalida el barrio elegido.
  const cambiarMunicipio = (codigo) => {
    setMunicipioCodigo(codigo);
    limpiarError("municipio");
    limpiarError("barrio");
  };

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

    // Nombre: obligatorio, solo letras (tildes/ñ) y máx. 100, igual que
    // el perfil y el backend.
    const nombre = nombreEntrega.trim();
    if (!nombre) {
      marcar("nombre", "Este campo es obligatorio.");
    } else if (!NOMBRE_COMPLETO_VALIDO.test(nombre)) {
      marcar("nombre", "El nombre solo puede contener letras, espacios, apóstrofes y guiones.");
    } else if (nombre.length > LARGO_MAX_NOMBRE) {
      marcar("nombre", `El nombre no puede superar los ${LARGO_MAX_NOMBRE} caracteres.`);
    }

    // Teléfono: misma regla que el registro (solo dígitos, máx. 10).
    const telefono = telefonoEntrega.trim();
    if (!telefono) {
      marcar("telefono", "Este campo es obligatorio.");
    } else if (!/^[0-9]+$/.test(telefono) || telefono.length > LARGO_MAX_TELEFONO) {
      marcar("telefono", "El teléfono solo puede contener dígitos (máx. 10).");
    }

    // La ubicación y la dirección solo aplican a envío a domicilio; con
    // "Recoger en tienda" no se piden.
    if (esDomicilio) {
      if (!departamentoCodigo) {
        marcar("departamento", "Selecciona un departamento.");
      }

      if (!municipioCodigo) {
        marcar("municipio", "Selecciona una ciudad o municipio.");
      }

      const barrio = barrioEntrega.trim();
      if (!barrio) {
        marcar("barrio", "Este campo es obligatorio.");
      } else if (barrio.length > LARGO_MAX_BARRIO) {
        marcar("barrio", `El barrio no puede superar los ${LARGO_MAX_BARRIO} caracteres.`);
      } else if (!BARRIO_VALIDO.test(barrio)) {
        marcar("barrio", "El barrio solo puede contener letras, números, espacios, apóstrofes, puntos y guiones.");
      }

      const direccion = direccionEntrega.trim();
      if (!direccion) {
        marcar("direccion", "Este campo es obligatorio.");
      } else if (direccion.length > LARGO_MAX_DIRECCION) {
        marcar("direccion", `La dirección no puede superar los ${LARGO_MAX_DIRECCION} caracteres.`);
      }
    }

    if (!paymentMethod) {
      marcar("metodo", "Selecciona una opción.");
    }

    if (requiereBanco && !transferenciaTipo) {
      marcar("transferencia", "Selecciona un medio.");
    }

    if (requiereBanco && !proofFile) {
      marcar("comprobante", "Adjunta el comprobante.");
    }

    const montoNum = Number(montoAbono);

    if (ABONOS_HABILITADOS && tipoPago === "parcial") {
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

  const handleConfirmPayment = async () => {
    const faltan = validarPago();
    const claves = Object.keys(faltan);

    if (claves.length > 0) {
      const primero = ORDEN_CAMPOS.find((clave) => faltan[clave]);

      setErrores(faltan);

      irACampo(ID_CAMPO[primero]);

      return;
    }

    setErrores({});

    // Stock real: una variante sin unidades bloquea el pago (se pide el
    // stock otra vez al backend para refrescar cantidades permitidas).
    if (agotados.length > 0) {
      notify(
        `"${agotados[0].name}" está agotado: elimínalo del carrito para continuar con tu compra.`,
        "error"
      );
      if (onStockActualizado) onStockActualizado();
      return;
    }

    if (excedenStock.length > 0) {
      notify(
        `La cantidad de "${excedenStock[0].name}" supera el stock disponible: solo quedan ${Number(
          excedenStock[0].stock
        )} unidad${Number(excedenStock[0].stock) === 1 ? "" : "es"}.`,
        "error"
      );
      if (onStockActualizado) onStockActualizado();
      return;
    }

    // Mapa a la nomenclatura del backend. "Crédito" se retiró del checkout:
    // solo quedan Transferencia y Contra entrega.
    const metodoPago =
      paymentMethod === "contra_entrega" ? "Contra entrega" : "Transferencia";

    const banco =
      requiereBanco && transferenciaTipo
        ? transferenciaTipo === "nequi"
          ? "Nequi"
          : "Bancolombia"
        : undefined;

    const items = cart.map((item) => ({
      id_variante: Number(item.id),
      cantidad: Number(item.quantity) || 1,
    }));

    if (items.some((item) => !Number.isInteger(item.id_variante) || item.id_variante <= 0)) {
      notify("Hay productos sin una variante válida. Vuelve a agregarlos.", "error");
      return;
    }

    // Con "Recoger en tienda" el backend no pide ubicación; con
    // "Domicilio" viajan los campos separados (el backend los valida
    // y los persiste en columnas propias de domicilio).
    setEnviando(true);

    try {
      const pedido = await crearPedido({
        items,
        metodo_pago: metodoPago,
        ...(banco ? { banco } : {}),
        metodo_envio: esDomicilio ? "Domicilio" : "Recoger en tienda",
        ...(esDomicilio
          ? {
              direccion: direccionEntrega.trim(),
              departamento: nombreDepartamento,
              municipio: nombreMunicipio,
              barrio: barrioEntrega.trim(),
            }
          : {}),
        nombre_entrega: nombreEntrega.trim(),
        telefono_entrega: telefonoEntrega.trim(),
      });

      if (onConfirmarPedido) {
        onConfirmarPedido(pedido);
      }
    } catch (error) {
      notify(error?.message || "No se pudo procesar el pago", "error");

      // El backend indica el campo inválido ("campo" en snake_case):
      // se muestra el mensaje bajo el input correcto y se lleva el foco.
      if (error?.campo) {
        const claveCampo = {
          nombre_entrega: "nombre",
          telefono_entrega: "telefono",
          departamento: "departamento",
          municipio: "municipio",
          barrio: "barrio",
          direccion: "direccion",
        }[error.campo];

        if (claveCampo) {
          setErrores({ [claveCampo]: { texto: error.message } });
          irACampo(ID_CAMPO[claveCampo]);
        }
      }

      // 409: el backend rechazó el pedido por stock. Se repite el stock
      // real y el carrito recorta las cantidades permitidas (con aviso).
      if (error?.status === 409 && onStockActualizado) {
        onStockActualizado();
      }
    } finally {
      setEnviando(false);
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

          Seguir comprando
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
                  inputMode="numeric"
                  maxLength={LARGO_MAX_TELEFONO}
                  value={telefonoEntrega}
                  onChange={(e) => {
                    // Solo dígitos, máx. 10: misma regla que el backend.
                    setTelefonoEntrega(e.target.value.replace(/\D/g, "").slice(0, LARGO_MAX_TELEFONO));
                    limpiarError("telefono");
                  }}
                />

                {errores.telefono && (
                  <span className="field-error">
                    {errores.telefono.texto}
                  </span>
                )}
              </div>

              {esDomicilio && (
              <div
                className={`form-group ${errores.departamento ? "has-error" : ""}`}
                id="campo-departamento"
              >
                <label>
                  Departamento
                </label>

                <select
                  value={departamentoCodigo}
                  onChange={(e) => cambiarDepartamento(e.target.value)}
                >
                  <option value="">
                    Selecciona un departamento
                  </option>

                  {DIVIPOLA.departamentos.map((dep) => (
                    <option key={dep.codigo} value={dep.codigo}>
                      {dep.nombre}
                    </option>
                  ))}
                </select>

                {errores.departamento && (
                  <span className="field-error">
                    {errores.departamento.texto}
                  </span>
                )}
              </div>
              )}

              {esDomicilio && (
              <div
                className={`form-group ${errores.municipio ? "has-error" : ""}`}
                id="campo-municipio"
              >
                <label>
                  Ciudad o municipio
                </label>

                <select
                  value={municipioCodigo}
                  disabled={!departamentoCodigo}
                  onChange={(e) => cambiarMunicipio(e.target.value)}
                >
                  <option value="">
                    {departamentoCodigo
                      ? "Selecciona una ciudad o municipio"
                      : "Primero elige un departamento"}
                  </option>

                  {municipiosDelDepartamento.map((mun) => (
                    <option key={mun.codigo} value={mun.codigo}>
                      {mun.nombre}
                    </option>
                  ))}
                </select>

                {errores.municipio && (
                  <span className="field-error">
                    {errores.municipio.texto}
                  </span>
                )}
              </div>
              )}

              {esDomicilio && (
              <div
                className={`form-group ${errores.barrio ? "has-error" : ""}`}
                id="campo-barrio"
              >
                <label>
                  Barrio
                </label>

                <input
                  type="text"
                  placeholder="Centro, La América..."
                  maxLength={LARGO_MAX_BARRIO}
                  disabled={!municipioCodigo}
                  value={barrioEntrega}
                  onChange={(e) => {
                    setBarrioEntrega(e.target.value);
                    limpiarError("barrio");
                  }}
                />

                {errores.barrio && (
                  <span className="field-error">
                    {errores.barrio.texto}
                  </span>
                )}
              </div>
              )}

              {esDomicilio && (
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
                  maxLength={LARGO_MAX_DIRECCION}
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
              )}

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
              className={`payment-methods payment-methods--par ${
                errores.metodo ? "has-error" : ""
              }`}
              id="campo-metodo"
            >

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


              {/* CONTRA ENTREGA */}

              <button
                type="button"
                className={`payment-method ${
                  paymentMethod === "contra_entrega"
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  setPaymentMethod("contra_entrega");
                  setTransferenciaTipo("");
                  limpiarError("metodo");
                  limpiarError("transferencia");
                  limpiarError("comprobante");
                }}
              >

                <div className="method-icon">
                  <Wallet size={23} />
                </div>

                <div className="method-info">

                  <strong>
                    Contra entrega
                  </strong>

                  <span>
                    Abono del 50 % hoy, saldo al recibir
                  </span>

                </div>

                {paymentMethod === "contra_entrega" && (
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
                TRANSFERENCIA / CONTRA ENTREGA
            ================================================= */}

            {requiereBanco && (

              <>

                <div className="payment-extra">

                  <div className="extra-title">

                    <Building2 size={19} />

                    <span>
                      {esContraEntrega
                        ? "Medio para el abono del 50 %"
                        : "Medio de transferencia"}
                    </span>

                  </div>

                  <p className="payment-instruction">
                    {esContraEntrega
                      ? `Para apartar tu pedido paga hoy el abono de ${formatoPrecio(abonoContraEntrega)} por el medio que prefieras.`
                      : "Selecciona el medio por el que realizarás la transferencia."}
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

                  {esContraEntrega && (
                    <div className="payment-notice">

                      <CheckCircle size={18} />

                      <span>
                        El saldo restante se paga al recibir
                        tu pedido.
                      </span>

                    </div>
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
                      {esContraEntrega
                        ? `Realiza el abono de ${formatoPrecio(abonoContraEntrega)} al número de Nequi registrado por Store La Mansión.`
                        : "Realiza el pago al número de Nequi registrado por Store La Mansión."}
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
                          {esContraEntrega
                            ? `Realiza la transferencia del abono (${formatoPrecio(abonoContraEntrega)}) utilizando los siguientes datos.`
                            : "Realiza la transferencia utilizando los siguientes datos."}
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

          </section>


          {/* =================================================
              MÉTODO DE ENVÍO
          ================================================= */}

          <section className="payment-card">

            <div className="section-heading">

              <div className="section-number">
                3
              </div>

              <div>
                <h2>Método de envío</h2>

                <p>
                  Elige cómo quieres recibir tu pedido.
                </p>
              </div>

            </div>

            <div className="payment-methods">

              <button
                type="button"
                className={`payment-method ${
                  metodoEnvio === "domicilio"
                    ? "selected"
                    : ""
                }`}
                onClick={() => setMetodoEnvio("domicilio")}
              >

                <div className="method-icon">
                  <Truck size={23} />
                </div>

                <div className="method-info">

                  <strong>
                    Domicilio
                  </strong>

                  <span>
                    Lo enviamos a tu dirección
                  </span>

                </div>

                {metodoEnvio === "domicilio" && (
                  <CheckCircle
                    className="method-check"
                    size={19}
                  />
                )}

              </button>


              <button
                type="button"
                className={`payment-method ${
                  metodoEnvio === "recoger"
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  setMetodoEnvio("recoger");
                  limpiarError("departamento");
                  limpiarError("municipio");
                  limpiarError("barrio");
                  limpiarError("direccion");
                }}
              >

                <div className="method-icon">
                  <Store size={23} />
                </div>

                <div className="method-info">

                  <strong>
                    Recoger en tienda
                  </strong>

                  <span>
                    Recógelo en nuestra tienda
                  </span>

                </div>

                {metodoEnvio === "recoger" && (
                  <CheckCircle
                    className="method-check"
                    size={19}
                  />
                )}

              </button>

            </div>

            <p className="payment-instruction">
              Costo de envío: $0. No se cobra envío.
            </p>

          </section>


          {/* =================================================
              ¿CUÁNTO VAS A PAGAR?
          ================================================= */}

          {ABONOS_HABILITADOS && (
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
          )}

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

                    {esAgotado(item.stock) && (
                      <p className="summary-product-agotado" role="status">
                        Agotado · no hay unidades disponibles
                      </p>
                    )}

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

          {agotados.length > 0 && (
            <p className="payment-stock-alert" role="alert">
              Hay productos agotados en tu pedido: elimínalos del carrito
              para continuar.
            </p>
          )}

          <button
            type="button"
            className="confirm-payment-btn"
            onClick={handleConfirmPayment}
            disabled={enviando || agotados.length > 0}
          >
            Confirmar y pagar
          </button>

        </aside>

      </div>

    </div>
  );
}