import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Smartphone,
  Building2,
  Upload,
  CheckCircle,
  ShoppingBag,
  Wallet,
  ShieldCheck,
  Truck,
  Package,
  Store,
  User,
  Phone,
  Map,
  MapPin,
  Home,
  Lock,
} from "lucide-react";

import { obtenerPrecio } from "../../features/store/pedidosCliente";
import { esAgotado, hayStock } from "../cart/cantidad";
import { crearPedido } from "../../shared/services/api";
import { useNotify } from "../notifications/useNotify.js";
import { NOMBRE_COMPLETO_VALIDO } from "../../shared/utils/validacionesRegistro";
import { calcularCostoEnvio, esValleAburra } from "../../shared/utils/envio";
import DIVIPOLA from "../../shared/data/divipola.json";
import QR_PAGO from "../../assets/img/QR.jpeg";

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
  const [proofFile, setProofFile] = useState(null);
  const [qrDisponible, setQrDisponible] = useState(true);

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

  const subtotalProductos = cart.reduce((acumulado, item) => {
    const precio = obtenerPrecio(item.price);
    const cantidad = Number(item.quantity) || 1;

    return acumulado + precio * cantidad;
  }, 0);

  /* =========================================================
     DERIVADOS
  ========================================================= */

  const ubicacionSeleccionada = Boolean(departamentoCodigo && municipioCodigo);

  // La zona se decide exclusivamente por el código DANE del municipio.
  const metodoEnvioFinal = !ubicacionSeleccionada
    ? null
    : esValleAburra(municipioCodigo)
      ? metodoEnvio === "recoger"
        ? "Recoger en tienda"
        : "Domicilio"
      : "Transportadora";

  const envio = ubicacionSeleccionada
    ? calcularCostoEnvio(metodoEnvioFinal)
    : { costo: 0, pendiente: false };
  const costoEnvio = envio.costo;
  const envioPendiente = envio.pendiente;
  const total = subtotalProductos + (envioPendiente ? 0 : costoEnvio);

  // Abono del 50 % de "Contra entrega" (mismo redondeo que el backend).
  const abonoContraEntrega = Math.round(total * 0.5);

  const esTransferencia = paymentMethod === "transferencia";
  const esContraEntrega = paymentMethod === "contra_entrega";
  const requiereBanco = esTransferencia || esContraEntrega;
  const esDomicilio = metodoEnvioFinal === "Domicilio";
  const esRecoger = metodoEnvioFinal === "Recoger en tienda";
  const esTransportadora = metodoEnvioFinal === "Transportadora";
  const pideDireccion = esDomicilio || esTransportadora;

  const textoCostoEnvio = !ubicacionSeleccionada
    ? "Selecciona tu ubicación para ver las opciones de envío."
    : esRecoger
      ? "Sin costo de envío."
      : envioPendiente
        ? "Costo de envío por confirmar."
        : `Costo de envío: ${formatoPrecio(costoEnvio)}.`;

  /* =========================================================
     ESTADO VÁLIDO DE LOS CAMPOS (solo presentación)
     Misma regla que validarPago; decide si se muestra el
     check verde. Nunca se muestra con el campo vacío.
  ========================================================= */

  const nombreTrim = nombreEntrega.trim();
  const telefonoTrim = telefonoEntrega.trim();
  const barrioTrim = barrioEntrega.trim();
  const direccionTrim = direccionEntrega.trim();

  const nombreValido =
    !errores.nombre &&
    Boolean(nombreTrim) &&
    nombreTrim.length <= LARGO_MAX_NOMBRE &&
    NOMBRE_COMPLETO_VALIDO.test(nombreTrim);

  const telefonoValido =
    !errores.telefono &&
    Boolean(telefonoTrim) &&
    /^[0-9]+$/.test(telefonoTrim) &&
    telefonoTrim.length <= LARGO_MAX_TELEFONO;

  const barrioValido =
    !errores.barrio &&
    Boolean(barrioTrim) &&
    barrioTrim.length <= LARGO_MAX_BARRIO &&
    BARRIO_VALIDO.test(barrioTrim);

  const direccionValida =
    !errores.direccion &&
    Boolean(direccionTrim) &&
    direccionTrim.length <= LARGO_MAX_DIRECCION;

  /* =========================================================
     CATÁLOGO DIVIPOLA (departamento -> municipio)
  ========================================================= */

  const municipiosDelDepartamento =
    DIVIPOLA.departamentos.find((d) => d.codigo === departamentoCodigo)
      ?.municipios ?? [];

  // Cambiar el departamento invalida el municipio y el barrio elegidos.
  const cambiarDepartamento = (codigo) => {
    setDepartamentoCodigo(codigo);
    setMunicipioCodigo("");
    setBarrioEntrega("");
    limpiarError("departamento");
    limpiarError("municipio");
    limpiarError("barrio");
  };

  // Cambiar el municipio invalida el barrio elegido y recalcula el método de
  // envío según la zona DANE del municipio.
  const cambiarMunicipio = (codigo) => {
    setMunicipioCodigo(codigo);
    limpiarError("municipio");
    limpiarError("barrio");
    limpiarError("metodo_envio");

    if (!codigo) return;

    if (!esValleAburra(codigo) && metodoEnvio !== "transportadora") {
      setMetodoEnvio("transportadora");
      notify(
        "El municipio está fuera del Valle de Aburrá: el pedido se enviará por transportadora.",
        "info"
      );
    } else if (esValleAburra(codigo) && metodoEnvio === "transportadora") {
      setMetodoEnvio("domicilio");
      notify(
        "El municipio está dentro del Valle de Aburrá: elige Domicilio o Recoger en tienda.",
        "info"
      );
    }
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

  // Presentación: marca el aviso de campo obligatorio al salir de un campo
  // vacío. No reemplaza la validación real: validarPago sigue siendo quien
  // decide si el pedido puede crearse.
  const marcarVacio = (clave, valor, texto = "Este campo es obligatorio.") => {
    if (!String(valor ?? "").trim()) {
      setErrores((previos) => ({ ...previos, [clave]: { texto } }));
    }
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

    // La ubicación (departamento + municipio) es siempre necesaria para
    // decidir la zona de envío, incluso con Recoger en tienda. La dirección
    // solo se exige para Domicilio y Transportadora; el barrio solo para
    // Domicilio local.
    if (!departamentoCodigo) {
      marcar("departamento", "Selecciona un departamento.");
    }

    if (!municipioCodigo) {
      marcar("municipio", "Selecciona una ciudad o municipio.");
    }

    if (esDomicilio) {
      const barrio = barrioEntrega.trim();
      if (!barrio) {
        marcar("barrio", "Este campo es obligatorio.");
      } else if (barrio.length > LARGO_MAX_BARRIO) {
        marcar("barrio", `El barrio no puede superar los ${LARGO_MAX_BARRIO} caracteres.`);
      } else if (!BARRIO_VALIDO.test(barrio)) {
        marcar("barrio", "El barrio solo puede contener letras, números, espacios, apóstrofes, puntos y guiones.");
      }
    }

    if (pideDireccion) {
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

    const banco = requiereBanco ? "QR" : undefined;

    const items = cart.map((item) => ({
      id_variante: Number(item.id),
      cantidad: Number(item.quantity) || 1,
    }));

    if (items.some((item) => !Number.isInteger(item.id_variante) || item.id_variante <= 0)) {
      notify("Hay productos sin una variante válida. Vuelve a agregarlos.", "error");
      return;
    }

    // El backend decide la zona por los códigos DANE, no por los nombres.
    // Con "Recoger en tienda" no se envía dirección ni barrio; con Domicilio
    // y Transportadora sí. El costo de envío nunca viaja desde el frontend.
    setEnviando(true);

    try {
      const pedido = await crearPedido({
        items,
        metodo_pago: metodoPago,
        ...(banco ? { banco } : {}),
        metodo_envio: metodoEnvioFinal,
        departamento_codigo: departamentoCodigo,
        municipio_codigo: municipioCodigo,
        ...(pideDireccion
          ? {
              direccion: direccionEntrega.trim(),
              ...(esDomicilio ? { barrio: barrioEntrega.trim() } : {}),
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
          departamento_codigo: "departamento",
          municipio_codigo: "municipio",
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
                <label htmlFor="input-nombre">
                  Nombre completo
                  <span className="required-star" aria-hidden="true"> *</span>
                </label>

                <div className="input-wrap">

                  <User
                    className="field-icon"
                    size={17}
                    aria-hidden="true"
                  />

                  <input
                    id="input-nombre"
                    type="text"
                    placeholder="Ingresa tu nombre"
                    value={nombreEntrega}
                    aria-invalid={Boolean(errores.nombre)}
                    aria-describedby={errores.nombre ? "error-nombre" : undefined}
                    onChange={(e) => {
                      setNombreEntrega(e.target.value);
                      limpiarError("nombre");
                    }}
                    onBlur={() => marcarVacio("nombre", nombreEntrega)}
                  />

                </div>

                {errores.nombre ? (
                  <span className="field-error" id="error-nombre">
                    {errores.nombre.texto}
                  </span>
                ) : nombreValido ? (
                  <span className="field-valid">
                    <CheckCircle size={13} aria-hidden="true" />
                    Nombre válido
                  </span>
                ) : null}
              </div>

              <div
                className={`form-group ${errores.telefono ? "has-error" : ""}`}
                id="campo-telefono"
              >
                <label htmlFor="input-telefono">
                  Teléfono
                  <span className="required-star" aria-hidden="true"> *</span>
                </label>

                <div className="input-wrap">

                  <Phone
                    className="field-icon"
                    size={17}
                    aria-hidden="true"
                  />

                  <input
                    id="input-telefono"
                    type="tel"
                    placeholder="300 000 0000"
                    inputMode="numeric"
                    maxLength={LARGO_MAX_TELEFONO}
                    value={telefonoEntrega}
                    aria-invalid={Boolean(errores.telefono)}
                    aria-describedby={errores.telefono ? "error-telefono" : undefined}
                    onChange={(e) => {
                      // Solo dígitos, máx. 10: misma regla que el backend.
                      setTelefonoEntrega(e.target.value.replace(/\D/g, "").slice(0, LARGO_MAX_TELEFONO));
                      limpiarError("telefono");
                    }}
                    onBlur={() => marcarVacio("telefono", telefonoEntrega)}
                  />

                </div>

                {errores.telefono ? (
                  <span className="field-error" id="error-telefono">
                    {errores.telefono.texto}
                  </span>
                ) : telefonoValido ? (
                  <span className="field-valid">
                    <CheckCircle size={13} aria-hidden="true" />
                    Número de teléfono válido
                  </span>
                ) : null}
              </div>

              <div
                className={`form-group ${errores.departamento ? "has-error" : ""}`}
                id="campo-departamento"
              >
                <label htmlFor="input-departamento">
                  Departamento
                  <span className="required-star" aria-hidden="true"> *</span>
                </label>

                <div className="input-wrap">

                  <Map
                    className="field-icon"
                    size={17}
                    aria-hidden="true"
                  />

                  <select
                    id="input-departamento"
                    value={departamentoCodigo}
                    aria-invalid={Boolean(errores.departamento)}
                    aria-describedby={errores.departamento ? "error-departamento" : undefined}
                    onChange={(e) => cambiarDepartamento(e.target.value)}
                    onBlur={() =>
                      marcarVacio(
                        "departamento",
                        departamentoCodigo,
                        "Selecciona un departamento."
                      )
                    }
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

                </div>

                {errores.departamento && (
                  <span className="field-error" id="error-departamento">
                    {errores.departamento.texto}
                  </span>
                )}
              </div>

              <div
                className={`form-group ${errores.municipio ? "has-error" : ""}`}
                id="campo-municipio"
              >
                <label htmlFor="input-municipio">
                  Ciudad o municipio
                  <span className="required-star" aria-hidden="true"> *</span>
                </label>

                <div className="input-wrap">

                  <Building2
                    className="field-icon"
                    size={17}
                    aria-hidden="true"
                  />

                  <select
                    id="input-municipio"
                    value={municipioCodigo}
                    disabled={!departamentoCodigo}
                    aria-invalid={Boolean(errores.municipio)}
                    aria-describedby={errores.municipio ? "error-municipio" : undefined}
                    onChange={(e) => cambiarMunicipio(e.target.value)}
                    onBlur={() =>
                      marcarVacio(
                        "municipio",
                        municipioCodigo,
                        "Selecciona una ciudad o municipio."
                      )
                    }
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

                </div>

                {errores.municipio && (
                  <span className="field-error" id="error-municipio">
                    {errores.municipio.texto}
                  </span>
                )}
              </div>

              {esDomicilio && (
              <div
                className={`form-group ${errores.barrio ? "has-error" : ""}`}
                id="campo-barrio"
              >
                <label htmlFor="input-barrio">
                  Barrio
                  <span className="required-star" aria-hidden="true"> *</span>
                </label>

                <div className="input-wrap">

                  <Home
                    className="field-icon"
                    size={17}
                    aria-hidden="true"
                  />

                  <input
                    id="input-barrio"
                    type="text"
                    placeholder="Centro, La América..."
                    maxLength={LARGO_MAX_BARRIO}
                    disabled={!municipioCodigo}
                    value={barrioEntrega}
                    aria-invalid={Boolean(errores.barrio)}
                    aria-describedby={errores.barrio ? "error-barrio" : undefined}
                    onChange={(e) => {
                      setBarrioEntrega(e.target.value);
                      limpiarError("barrio");
                    }}
                    onBlur={() => marcarVacio("barrio", barrioEntrega)}
                  />

                </div>

                {errores.barrio ? (
                  <span className="field-error" id="error-barrio">
                    {errores.barrio.texto}
                  </span>
                ) : barrioValido ? (
                  <span className="field-valid">
                    <CheckCircle size={13} aria-hidden="true" />
                    Barrio válido
                  </span>
                ) : null}
              </div>
              )}

              {pideDireccion && (
              <div
                className={`form-group ${errores.direccion ? "has-error" : ""}`}
                id="campo-direccion"
              >
                <label htmlFor="input-direccion">
                  Dirección
                  <span className="required-star" aria-hidden="true"> *</span>
                </label>

                <div className="input-wrap">

                  <MapPin
                    className="field-icon"
                    size={17}
                    aria-hidden="true"
                  />

                  <input
                    id="input-direccion"
                    type="text"
                    placeholder="Calle, carrera, número..."
                    maxLength={LARGO_MAX_DIRECCION}
                    value={direccionEntrega}
                    aria-invalid={Boolean(errores.direccion)}
                    aria-describedby={errores.direccion ? "error-direccion" : undefined}
                    onChange={(e) => {
                      setDireccionEntrega(e.target.value);
                      limpiarError("direccion");
                    }}
                    onBlur={() => marcarVacio("direccion", direccionEntrega)}
                  />

                </div>

                {errores.direccion ? (
                  <span className="field-error" id="error-direccion">
                    {errores.direccion.texto}
                  </span>
                ) : direccionValida ? (
                  <span className="field-valid">
                    <CheckCircle size={13} aria-hidden="true" />
                    Dirección válida
                  </span>
                ) : null}
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
                aria-pressed={paymentMethod === "transferencia"}
                onClick={() => {
                  setPaymentMethod("transferencia");
                  limpiarError("metodo");
                  limpiarError("comprobante");
                }}
              >

                <span className="method-radio" aria-hidden="true" />

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
                aria-pressed={paymentMethod === "contra_entrega"}
                onClick={() => {
                  setPaymentMethod("contra_entrega");
                  limpiarError("metodo");
                  limpiarError("comprobante");
                }}
              >

                <span className="method-radio" aria-hidden="true" />

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
              <div className="payment-extra qr-payment">
                <div className="extra-title">
                  <Smartphone size={19} />
                  <span>
                    {esContraEntrega
                      ? "Pago del abono del 50 %"
                      : "Pago por transferencia"}
                  </span>
                </div>

                <h3 className="qr-payment-title">
                  Paga escaneando el código QR
                </h3>

                <p className="payment-instruction">
                  {esContraEntrega
                    ? `Escanea el código y paga el abono de ${formatoPrecio(abonoContraEntrega)} para apartar tu pedido.`
                    : "Escanea el código y realiza la transferencia por el valor total de tu pedido."}
                </p>

                <div className="qr-payment-figure">
                  <div className="qr-payment-frame">
                    {qrDisponible ? (
                      <img
                        src={QR_PAGO}
                        alt="Código QR oficial de pago de Store La Mansión"
                        className="qr-payment-image"
                        onError={() => setQrDisponible(false)}
                      />
                    ) : (
                      <p className="qr-payment-unavailable" role="status">
                        QR de pago no disponible por el momento.
                      </p>
                    )}
                  </div>
                </div>

                <div className="qr-payment-amount">
                  <span>
                    {esContraEntrega ? "Abono a pagar hoy" : "Valor a pagar"}
                  </span>
                  <strong>
                    {formatoPrecio(esContraEntrega ? abonoContraEntrega : total)}
                  </strong>
                  {envioPendiente && (
                    <small>
                      El costo de envío se cobra aparte cuando la tienda lo confirme.
                    </small>
                  )}
                </div>

                {esContraEntrega && (
                  <>
                    <div className="qr-payment-balance">
                      <span>Saldo al recibir</span>
                      <strong>{formatoPrecio(total - abonoContraEntrega)}</strong>
                    </div>

                    <div className="payment-notice">
                      <CheckCircle size={18} />
                      <span>
                        El saldo restante se paga al recibir tu pedido.
                      </span>
                    </div>
                  </>
                )}

                <div className="payment-notice">
                  <ShieldCheck size={18} />
                  <span>
                    Tu pago será verificado por la tienda antes de procesar el pedido.
                  </span>
                </div>

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
                      {proofFile ? proofFile.name : "Subir comprobante"}
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
                      <span>Comprobante seleccionado</span>
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

            {!ubicacionSeleccionada && (
              <p className="envio-aviso" role="status">
                Selecciona tu ubicación para ver las opciones de envío.
              </p>
            )}

            {esTransportadora && (
              <div className="payment-methods payment-methods--una">

                <div
                  className="payment-method selected payment-method--fija"
                  aria-label="Envío por transportadora"
                >

                  <span className="method-radio" aria-hidden="true" />

                  <div className="method-icon">
                    <Package size={23} />
                  </div>

                  <div className="method-info">

                    <strong>
                      Transportadora
                    </strong>

                    <span>
                      Envío nacional a tu dirección
                    </span>

                  </div>

                  <CheckCircle
                    className="method-check"
                    size={19}
                  />

                </div>

              </div>
            )}

            {esTransportadora && (
              <p className="payment-instruction">
                El pedido se enviará por transportadora porque el municipio
                está fuera del Valle de Aburrá.
              </p>
            )}

            {ubicacionSeleccionada && !esTransportadora && (
              <div className="payment-methods payment-methods--par">

                <button
                  type="button"
                  className={`payment-method ${
                    metodoEnvio === "domicilio"
                      ? "selected"
                      : ""
                  }`}
                  aria-pressed={metodoEnvio === "domicilio"}
                  onClick={() => setMetodoEnvio("domicilio")}
                >

                  <span className="method-radio" aria-hidden="true" />

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
                  aria-pressed={metodoEnvio === "recoger"}
                  onClick={() => {
                    setMetodoEnvio("recoger");
                    limpiarError("departamento");
                    limpiarError("municipio");
                    limpiarError("barrio");
                    limpiarError("direccion");
                  }}
                >

                  <span className="method-radio" aria-hidden="true" />

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
            )}

            {ubicacionSeleccionada && (
              <p className="payment-instruction">
                {textoCostoEnvio}
              </p>
            )}

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
                  {envioPendiente ? "Total productos" : "Total del pedido"}:{" "}
                  {formatoPrecio(total)}.
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


          {/* SUBTOTAL / ENVÍO / TOTAL */}

          <div className="summary-line">

            <span>
              Subtotal ({cart.length} producto
              {cart.length !== 1 ? "s" : ""})
            </span>

            <strong>
              {formatoPrecio(subtotalProductos)}
            </strong>

          </div>

          <div className="summary-line">

            <span>
              Envío
            </span>

            <strong>
              {!ubicacionSeleccionada
                ? "Se calcula al elegir ubicación"
                : esRecoger
                  ? "Sin costo"
                  : envioPendiente
                    ? "Por confirmar"
                    : formatoPrecio(costoEnvio)}
            </strong>

          </div>

          <div className="summary-total">

            <span>
              {!ubicacionSeleccionada || envioPendiente
                ? "Total productos"
                : "Total"}
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
            disabled={
              enviando ||
              agotados.length > 0 ||
              Object.keys(errores).length > 0
            }
          >
            <Lock size={17} aria-hidden="true" />

            Confirmar y pagar

            <ArrowRight size={17} aria-hidden="true" />
          </button>

        </aside>

      </div>

      {/* =====================================================
          VOLVER (pie)
      ===================================================== */}

      <button
        type="button"
        className="payment-back payment-back--bottom"
        onClick={onBack}
      >
        <ArrowLeft size={18} />

        Volver a la tienda
      </button>

    </div>
  );
}