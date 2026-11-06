import { useEffect, useMemo, useState } from "react";

import {
  Search,
  Eye,
  X,
  Pencil,
  Check,
  Plus,
  Wallet,
  HandCoins,
  PackageCheck,
  Loader2
} from "lucide-react";

import "./Abonos.css";

import Pagination from "../components/Pagination";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import HistorialAbonos from "./HistorialAbonos";
import { tienePermiso } from "../utils/permisos";

import {
  obtenerAbonos,
  obtenerConfiguracionAbonos,
  actualizarConfiguracionAbonos,
  obtenerAbonosPedido,
  registrarAbonoPedido
} from "../../../shared/services/api";

const LIMITE_PAGINA = 20;

const formatearPrecio = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(valor) || 0);

const formatearFecha = (fecha) => {
  if (!fecha) return "—";

  const partes = String(fecha).split("-");

  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const formatearPercentual = (valor) => {
  const numero = Math.round(Number(valor) || 0);
  return `${Math.min(100, Math.max(0, numero))}%`;
};

const porcentajeAbonado = (valor) =>
  Math.min(100, Math.max(0, Math.round(Number(valor) || 0)));

// Formato de escritura del monto: solo cifras, presentadas con separadores.
const formatearEntradaMonto = (texto) => {
  const digitos = String(texto || "").replace(/\D/g, "").slice(0, 9);
  if (!digitos) return "";
  return new Intl.NumberFormat("es-CO").format(Number(digitos));
};

const parsearMonto = (texto) => {
  const digitos = String(texto || "").replace(/\D/g, "");
  return digitos ? Number(digitos) : 0;
};

// El backend entrega "YYYY-MM-DD HH24:MI:SS"; el navegador lo entiende mejor
// en formato ISO y es-CO lo muestra regional. Si no se puede, se ve tal cual.
const formatearFechaHoraDetalle = (valor) => {
  if (!valor) return "—";

  const fecha = new Date(String(valor).replace(" ", "T"));

  if (Number.isNaN(fecha.getTime())) {
    return String(valor);
  }

  return fecha.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short"
  });
};

// Estado del pago mostrado en la tabla, derivado de lo abonado y del saldo
// real de cada pedido: Pagado (verde), Abono parcial (ámbar) o
// Pendiente de pago (rojo suave).
const estadoPagoDeFila = (fila) => {
  const total = Number(fila?.total) || 0;
  const abonado = Number(fila?.total_abonado) || 0;
  const saldo = fila?.saldo_pendiente !== undefined && fila?.saldo_pendiente !== null
    ? Number(fila.saldo_pendiente)
    : Math.max(total - abonado, 0);

  if (saldo <= 0 && total > 0) {
    return { etiqueta: "Pagado", clase: "pagado" };
  }

  if (abonado > 0) {
    return { etiqueta: "Abono parcial", clase: "parcial" };
  }

  return { etiqueta: "Pendiente de pago", clase: "pendiente" };
};

const mensajeErrorAbono = (error) => {
  if (error?.status === 403) return "No tienes permisos para registrar abonos.";
  if (error?.status === 404) return "El pedido no existe o fue eliminado.";
  if (error?.status === 409) return error?.message || "Conflicto al registrar el abono.";
  if (error?.status === 400) return error?.message || "El abono no es válido.";
  if (!error?.status) return "Sin conexión. Revisa tu red e intenta de nuevo.";

  return error?.message || "No se pudo registrar el abono.";
};

const claseEstadoPedido = (estado) => {
  switch (estado) {
    case "Entregado":
      return "entregado";
    case "Despachado":
      return "despachado";
    case "En preparación":
      return "preparacion";
    case "Cancelado":
      return "cancelado";
    default:
      return "registrado";
  }
};

const PESTANAS = [
  { id: "saldo", nombre: "Con saldo" },
  { id: "todos", nombre: "Todos" }
];

export default function Abonos({ user }) {

  /* =====================================================
     PERMISOS
     ===================================================== */

  const puedeConsultar = tienePermiso(user, "Abonos", "Consultar");
  const puedeCrear = tienePermiso(user, "Abonos", "Crear");
  const puedeActualizar = tienePermiso(user, "Abonos", "Actualizar");

  /* =====================================================
     LISTA (pestañas, búsqueda y paginación)
     ===================================================== */

  const [pestana, setPestana] = useState("saldo");
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  const [filas, setFilas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [infoPaginacion, setInfoPaginacion] = useState(null);
  // Arranca cargando solo si el usuario tiene permiso de consulta: sin él la
  // pantalla muestra el aviso de permisos desde el primer render.
  const [cargando, setCargando] = useState(() =>
    tienePermiso(user, "Abonos", "Consultar")
  );
  const [error, setError] = useState("");

  /* =====================================================
     MONTO MÍNIMO (Abonos:Actualizar)
     ===================================================== */

  const [montoMinimo, setMontoMinimo] = useState(null);
  const [editandoMinimo, setEditandoMinimo] = useState(false);
  const [textoMinimo, setTextoMinimo] = useState("");
  const [errorMinimo, setErrorMinimo] = useState("");
  const [guardandoMinimo, setGuardandoMinimo] = useState(false);

  /* =====================================================
     VENTANA "VER ABONOS"
     ===================================================== */

  const [pedidoAbonos, setPedidoAbonos] = useState(null);
  const [detalle, setDetalle] = useState({ cargando: false, error: "", abonos: [], totales: null });

  /* =====================================================
     FORMULARIO DE ABONO
     ===================================================== */

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState({
    montoTexto: "",
    metodo: "Efectivo",
    referencia: "",
    observacion: ""
  });
  const [erroresFormulario, setErroresFormulario] = useState({});
  const [enviando, setEnviando] = useState(false);

  const { toast, mostrarToast } = useToast();

  /* =====================================================
     CARGAR LISTA + RESUMEN
     ===================================================== */

  /* La búsqueda es delegada: el backend filtra por cliente o número de
     pedido y ordena por id DESC (lo más reciente primero). */

  useEffect(() => {
    if (!puedeConsultar) return undefined;

    let activo = true;

    obtenerAbonos({ pestana, q: busqueda, pagina, limite: LIMITE_PAGINA })
      .then((respuesta) => {
        if (!activo) return;

        setFilas(Array.isArray(respuesta?.data) ? respuesta.data : []);
        setResumen(respuesta?.resumen || null);
        setInfoPaginacion(respuesta?.paginacion || null);
        setError("");
      })
      .catch((errorCarga) => {
        if (!activo) return;

        setError(
          errorCarga?.message || "No se pudieron cargar los abonos"
        );
        setFilas([]);
        setResumen(null);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [pestana, busqueda, pagina, puedeConsultar]);

  /* Espera corta antes de lanzar la búsqueda (menos peticiones). El estado
     de carga (y la página) se cambian en los manejadores de eventos; el
     efecto solo pide la lista y actualiza con la respuesta. */

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setCargando(true);
      setBusqueda(textoBusqueda.trim());
      setPagina(1);
    }, 350);

    return () => clearTimeout(temporizador);
  }, [textoBusqueda]);

  const cambiarPestana = (pestanaNueva) => {
    if (pestanaNueva === pestana) return;

    setPestana(pestanaNueva);
    setCargando(true);
    setPagina(1);
  };

  const cambiarPagina = (paginaNueva) => {
    setPagina(paginaNueva);
    setCargando(true);
  };

  /* =====================================================
     CONFIGURACIÓN (monto mínimo)
     ===================================================== */

  useEffect(() => {
    if (!puedeConsultar && !puedeActualizar) return;

    let activo = true;

    obtenerConfiguracionAbonos()
      .then((respuesta) => {
        if (!activo) return;
        setMontoMinimo(Number(respuesta?.monto_minimo) || 0);
      })
      .catch(() => {
        if (activo) setMontoMinimo(0);
      });

    return () => {
      activo = false;
    };
  }, [puedeConsultar, puedeActualizar]);

  const guardarMinimo = async () => {
    if (guardandoMinimo) return;

    const monto = parsearMonto(textoMinimo);

    if (!monto || monto <= 0) {
      setErrorMinimo("Escribe un monto mínimo válido.");
      return;
    }

    setGuardandoMinimo(true);

    try {
      const respuesta = await actualizarConfiguracionAbonos(monto);
      setMontoMinimo(Number(respuesta?.monto_minimo) || monto);
      setEditandoMinimo(false);
      setErrorMinimo("");
      mostrarToast("Monto mínimo actualizado con éxito");
    } catch (error) {
      if (error?.campo === "monto_minimo" || error?.status === 400) {
        setErrorMinimo(error?.message || "El monto mínimo no es válido.");
      } else {
        setErrorMinimo("");
        mostrarToast(error?.message || "No se pudo guardar la configuración de abonos", "error");
      }
    } finally {
      setGuardandoMinimo(false);
    }
  };

  /* =====================================================
     VENTANA "VER ABONOS"
     ===================================================== */

  const abrirAbonos = (fila) => {
    setPedidoAbonos(fila);
    setMostrarFormulario(false);
    setErroresFormulario({});
    // La carga del historial arranca al abrir la ventana (evento), y el
    // efecto se limita a pedir los datos y actualizar cuando llegan.
    setDetalle({ cargando: true, error: "", abonos: [], totales: null });
  };

  const cerrarAbonos = () => {
    setPedidoAbonos(null);
    setMostrarFormulario(false);
    setErroresFormulario({});
    setDetalle({ cargando: false, error: "", abonos: [], totales: null });
  };

  /* El detalle y su historial se piden al abrir la ventana: así se ve el
     historial real (el más reciente primero) en vez de la fila resumida. */

  useEffect(() => {
    if (!pedidoAbonos?.id_pedido) return undefined;

    let activo = true;

    obtenerAbonosPedido(pedidoAbonos.id_pedido)
      .then((respuesta) => {
        if (!activo) return;
        setDetalle({
          cargando: false,
          error: "",
          abonos: Array.isArray(respuesta?.abonos) ? respuesta.abonos : [],
          totales: respuesta?.totales || null
        });
      })
      .catch((errorDetalle) => {
        if (!activo) return;
        setDetalle({
          cargando: false,
          error: errorDetalle?.message || "No se pudo cargar el historial de abonos",
          abonos: [],
          totales: null
        });
      });

    return () => {
      activo = false;
    };
  }, [pedidoAbonos]);

  /* =====================================================
     DATOS DE LA VENTANA
     ===================================================== */

  const totalesDetalle = detalle.totales;
  const totalPedido =
    totalesDetalle?.total !== undefined && totalesDetalle?.total !== null
      ? Number(totalesDetalle.total) || 0
      : Number(pedidoAbonos?.total) || 0;

  const totalAbonadoDetalle =
    totalesDetalle?.total_abonado !== undefined &&
    totalesDetalle?.total_abonado !== null
      ? Number(totalesDetalle.total_abonado) || 0
      : Number(pedidoAbonos?.total_abonado) || 0;

  const saldoDetalle =
    totalesDetalle?.saldo_pendiente !== undefined &&
    totalesDetalle?.saldo_pendiente !== null
      ? Math.max(Number(totalesDetalle.saldo_pendiente) || 0, 0)
      : Math.max(totalPedido - totalAbonadoDetalle, 0);

  const porcentajeDetalle = totalesDetalle
    ? porcentajeAbonado(
        totalesDetalle.porcentaje_pagado ??
          (totalPedido > 0 ? (totalAbonadoDetalle / totalPedido) * 100 : 0)
      )
    : porcentajeAbonado(pedidoAbonos?.porcentaje_pagado);

  const estadoPagoDetalle = estadoPagoDeFila({
    total: totalPedido,
    total_abonado: totalAbonadoDetalle,
    saldo_pendiente: saldoDetalle
  });

  const puedeRegistrarAbono =
    puedeCrear && totalPedido > 0 && saldoDetalle > 0;

  /* =====================================================
     FORMULARIO DE ABONO
     ===================================================== */

  const abrirFormulario = () => {
    setFormulario({ montoTexto: "", metodo: "Efectivo", referencia: "", observacion: "" });
    setErroresFormulario({});
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setErroresFormulario({});
  };

  const cambiarCampoFormulario = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setErroresFormulario((actuales) => {
      if (!actuales[campo]) return actuales;
      const nuevos = { ...actuales };
      delete nuevos[campo];
      return nuevos;
    });
  };

  /* Clave de idempotencia única por intento: un reintento tras un fallo usa
     una clave distinta, y la misma clave nunca registra el pago dos veces. */

  const generarClaveIdempotencia = () => {
    if (crypto?.randomUUID) {
      return crypto.randomUUID().slice(0, 80);
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  };

  const enviarAbono = async () => {
    if (enviando) return;

    const idPedido = pedidoAbonos?.id_pedido;
    if (!idPedido) return;

    const monto = parsearMonto(formulario.montoTexto);
    const nuevosErrores = {};

    if (!monto || monto <= 0) {
      nuevosErrores.monto = "Escribe el monto del abono.";
    } else if (montoMinimo > 0 && monto < montoMinimo) {
      nuevosErrores.monto = `El monto debe ser al menos ${formatearPrecio(montoMinimo)}.`;
    } else if (monto > saldoDetalle) {
      nuevosErrores.monto = `El abono no puede superar el saldo pendiente (${formatearPrecio(saldoDetalle)}).`;
    }

    setErroresFormulario(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);

    try {
      await registrarAbonoPedido(idPedido, {
        monto,
        metodo: formulario.metodo,
        referencia: formulario.referencia.trim(),
        observacion: formulario.observacion.trim(),
        claveIdempotencia: generarClaveIdempotencia()
      });

      mostrarToast("Abono registrado con éxito");

      setMostrarFormulario(false);

      // Actualiza la ventana abierta (saldo, porcentaje, estado e historial)
      // y la lista general con sus tarjetas de resumen.
      const [respuestaLista, respuestaDetalle] = await Promise.allSettled([
        obtenerAbonos({
          pestana,
          q: busqueda,
          pagina,
          limite: LIMITE_PAGINA
        }),
        obtenerAbonosPedido(idPedido)
      ]);

      if (respuestaLista.status === "fulfilled") {
        const respuesta = respuestaLista.value;
        setFilas(Array.isArray(respuesta?.data) ? respuesta.data : []);
        setResumen(respuesta?.resumen || null);
        setInfoPaginacion(respuesta?.paginacion || null);
        setError("");
      }

      if (respuestaDetalle.status === "fulfilled") {
        const respuesta = respuestaDetalle.value;
        setDetalle({
          cargando: false,
          error: "",
          abonos: Array.isArray(respuesta?.abonos) ? respuesta.abonos : [],
          totales: respuesta?.totales || null
        });
      } else {
        setDetalle((actual) => ({
          ...actual,
          cargando: false,
          error:
            respuestaDetalle.reason?.message ||
            "No se pudo actualizar el historial de abonos"
        }));
      }
    } catch (error) {
      // 400 y 409 se muestran en el toast SIN cerrar la ventana: la clave
      // de idempotencia evita duplicar el pago si el usuario vuelve a enviar.
      mostrarToast(mensajeErrorAbono(error), "error");
    } finally {
      setEnviando(false);
    }
  };

  /* =====================================================
     TARJETAS DE RESUMEN
     ===================================================== */

  const tarjetas = useMemo(
    () => [
      {
        titulo: "Saldo pendiente",
        valor: formatearPrecio(resumen?.total_saldo_pendiente ?? 0),
        icono: Wallet,
        acento: "pendiente"
      },
      {
        titulo: "Total abonado",
        valor: formatearPrecio(resumen?.total_abonado ?? 0),
        icono: HandCoins,
        acento: "abonado"
      },
      {
        titulo: "Pedidos con saldo",
        valor: Number(resumen?.pedidos_con_saldo ?? 0),
        icono: PackageCheck,
        acento: "pedidos"
      }
    ],
    [resumen]
  );

  /* =====================================================
     RENDER
     ===================================================== */

  if (!puedeConsultar) {
    return (
      <div className="abonos-page">
        <div className="abonos-header">
          <div className="abonos-title">
            <h2>Abonos</h2>
            <p>Pedidos de contra entrega con pagos parciales.</p>
          </div>
        </div>
        <div className="abonos-permiso">No tienes permisos</div>
      </div>
    );
  }

  const totalPaginasBackend = Math.max(
    1,
    Number(infoPaginacion?.paginas) || 1
  );

  const paginaActualBackend = Math.min(
    pagina,
    totalPaginasBackend
  );

  return (
    <div className="abonos-page">

      {/* =================================================
          ENCABEZADO
          ================================================= */}

      <div className="abonos-header">
        <div className="abonos-title">
          <h2>Abonos</h2>
          <p>Pedidos de contra entrega con pagos parciales.</p>
        </div>

        <div className="abonos-actions">
          {puedeActualizar && (
            <div className={
              editandoMinimo
                ? "abonos-minimo abonos-minimo-editando"
                : "abonos-minimo"
            }>
              {editandoMinimo ? (
                <>
                  <label htmlFor="abonos-minimo-input">Monto mínimo</label>

                  <input
                    id="abonos-minimo-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="$0"
                    value={textoMinimo}
                    className={errorMinimo ? "input-error" : ""}
                    onChange={(e) => {
                      setTextoMinimo(
                        formatearEntradaMonto(e.target.value)
                      );
                      if (errorMinimo) setErrorMinimo("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") guardarMinimo();
                    }}
                  />

                  <button
                    type="button"
                    className="abonos-minimo-boton guardar"
                    title="Guardar monto mínimo"
                    onClick={guardarMinimo}
                    disabled={guardandoMinimo}
                  >
                    {guardandoMinimo ? <Loader2 size={15} className="abonos-spinner" /> : <Check size={15} />}
                    Guardar
                  </button>

                  <button
                    type="button"
                    className="abonos-minimo-boton cancelar"
                    title="Descartar cambios"
                    onClick={() => {
                      setEditandoMinimo(false);
                      setTextoMinimo("");
                      setErrorMinimo("");
                    }}
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className="abonos-minimo-etiqueta">
                    Monto mínimo del abono
                  </span>

                  <strong>{formatearPrecio(montoMinimo ?? 0)}</strong>

                  <button
                    type="button"
                    className="abonos-minimo-boton editar"
                    title="Ajustar monto mínimo"
                    onClick={() => {
                      setTextoMinimo(montoMinimo ? formatearEntradaMonto(String(montoMinimo)) : "");
                      setErrorMinimo("");
                      setEditandoMinimo(true);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {puedeActualizar && editandoMinimo && errorMinimo && (
        <span className="abonos-minimo-error error-text">{errorMinimo}</span>
      )}

      {/* =================================================
          TARJETAS DE RESUMEN
          ================================================= */}

      <div className="abonos-tarjetas">
        {tarjetas.map((tarjeta) => {
          const Icono = tarjeta.icono;

          return (
            <div
              key={tarjeta.titulo}
              className={`abonos-tarjeta abonos-tarjeta-${tarjeta.acento}`}
            >
              <div className="abonos-tarjeta-icono">
                <Icono size={21} />
              </div>

              <div className="abonos-tarjeta-info">
                <span>{tarjeta.titulo}</span>
                <strong>
                  {cargando && !resumen
                    ? "—"
                    : tarjeta.valor}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* =================================================
          PESTAÑAS + BUSCADOR
          ================================================= */}

      <div className="abonos-controles">
        <div className="abonos-pestanas" role="tablist" aria-label="Filtros de abonos">
          {PESTANAS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={pestana === item.id}
              className={
                pestana === item.id
                  ? "abonos-pestana activa"
                  : "abonos-pestana"
              }
              onClick={() => cambiarPestana(item.id)}
            >
              {item.nombre}
            </button>
          ))}
        </div>

        <div className="abonos-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por cliente o número de pedido..."
            value={textoBusqueda}
            onChange={(e) => setTextoBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* =================================================
          TABLA
          ================================================= */}

      <div className="abonos-table-container">
        <table className="abonos-table">
          <thead>
            <tr>
              <th>CLIENTE</th>
              <th>N.° PEDIDO</th>
              <th>FECHA</th>
              <th>TOTAL</th>
              <th>ABONADO</th>
              <th>SALDO PENDIENTE</th>
              <th>PROGRESO</th>
              <th>ESTADO</th>
              <th>ESTADO DE PAGO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>

          <tbody>
            {filas.map((fila) => {
              const estadoPago = estadoPagoDeFila(fila);

              return (
                <tr key={fila.id_pedido}>
                  <td>
                    <span className="abonos-cliente" title={fila.cliente}>
                      {fila.cliente || "—"}
                    </span>
                  </td>

                  <td>
                    <strong className="abonos-id-pedido">
                      {fila.id_pedido}
                    </strong>
                  </td>

                  <td>
                    <span className="abonos-fecha">
                      {formatearFecha(fila.fecha)}
                    </span>
                  </td>

                  <td>
                    <strong className="abonos-total">
                      {formatearPrecio(fila.total)}
                    </strong>
                  </td>

                  <td>
                    <span className="abonos-abonado">
                      {formatearPrecio(fila.total_abonado)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        Number(fila.saldo_pendiente) > 0
                          ? "abonos-saldo con-saldo"
                          : "abonos-saldo saldado"
                      }
                    >
                      {formatearPrecio(fila.saldo_pendiente)}
                    </span>
                  </td>

                  <td>
                    <div className="abonos-progreso">
                      <div className="abonos-progreso-barra">
                        <span
                          style={{
                            width: `${porcentajeAbonado(fila.porcentaje_pagado)}%`
                          }}
                        />
                      </div>
                      <span className="abonos-progreso-texto">
                        {formatearPercentual(fila.porcentaje_pagado)}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`abonos-estado ${claseEstadoPedido(fila.estado_pedido)}`}
                    >
                      {fila.estado_pedido || "—"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`abonos-pago-badge ${estadoPago.clase}`}
                    >
                      {estadoPago.etiqueta}
                    </span>
                  </td>

                  <td>
                    <div className="abonos-acciones">
                      <button
                        type="button"
                        title="Ver abonos"
                        onClick={() => abrirAbonos(fila)}
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filas.length === 0 && (
              <tr>
                <td colSpan="10" className="abonos-empty">
                  {cargando
                    ? "Cargando abonos..."
                    : error
                      ? error
                      : textoBusqueda.trim()
                        ? "No se encontraron pedidos con ese criterio."
                        : pestana === "saldo"
                          ? "No hay pedidos con saldo pendiente."
                          : "No hay pedidos de contra entrega registrados."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={paginaActualBackend}
          totalPages={totalPaginasBackend}
          onPageChange={cambiarPagina}
        />
      </div>

      {/* =================================================
          VENTANA "VER ABONOS"
          ================================================= */}

      {pedidoAbonos && (
        <div className="abonos-modal-overlay">
          <div className="abonos-modal abonos-modal-detalle">
            <div className="abonos-modal-header">
              <div className="abonos-modal-title">
                <span className="abonos-modal-title-icono">
                  <Wallet size={19} />
                </span>
                <div>
                  <h3>Abonos del pedido</h3>
                  <span>
                    N.° {pedidoAbonos.id_pedido} · {pedidoAbonos.cliente || "—"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="abonos-modal-close"
                onClick={cerrarAbonos}
              >
                <X size={19} />
              </button>
            </div>

            <div className="abonos-modal-body">

              {/* RESUMEN DEL PEDIDO */}

              <div className="abonos-detalle-resumen">
                <div className="abonos-detalle-resumen-item">
                  <span>Total del pedido</span>
                  <strong>{formatearPrecio(totalPedido)}</strong>
                </div>

                <div className="abonos-detalle-resumen-item abonado">
                  <span>Total abonado</span>
                  <strong>{formatearPrecio(totalAbonadoDetalle)}</strong>
                </div>

                <div className="abonos-detalle-resumen-item pendiente">
                  <span>Saldo pendiente</span>
                  <strong>{formatearPrecio(saldoDetalle)}</strong>
                </div>

                <div className="abonos-detalle-progreso">
                  <div className="abonos-detalle-progreso-cabecera">
                    <span>Porcentaje abonado</span>
                    <strong>{porcentajeDetalle}%</strong>
                  </div>

                  <div className="abonos-progreso-barra">
                    <span style={{ width: `${porcentajeDetalle}%` }} />
                  </div>

                  <span
                    className={`abonos-pago-badge ${estadoPagoDetalle.clase}`}
                  >
                    {estadoPagoDetalle.etiqueta}
                  </span>
                </div>
              </div>

              {/* MOVIMIENTOS */}

              <div className="abonos-detalle-movimientos-cabecera">
                <label>Movimientos del pedido</label>

                {puedeRegistrarAbono && (
                  <button
                    type="button"
                    className="abonos-registrar-boton"
                    onClick={abrirFormulario}
                  >
                    <Plus size={17} />
                    Registrar abono
                  </button>
                )}
              </div>

              {detalle.cargando ? (
                <div className="abonos-detalle-cargando">
                  <Loader2 size={20} className="abonos-spinner" />
                  Cargando historial...
                </div>
              ) : detalle.error ? (
                <div className="abonos-detalle-error">{detalle.error}</div>
              ) : (
                <HistorialAbonos abonos={detalle.abonos} />
              )}

              {detalle.abonos.length > 0 && (
                <span className="abonos-detalle-nota">
                  Último movimiento:{" "}
                  {formatearFechaHoraDetalle(detalle.abonos[0].fecha_hora)}
                </span>
              )}
            </div>

            <div className="abonos-modal-footer">
              <button
                type="button"
                className="abonos-boton-secundario cerrar"
                onClick={cerrarAbonos}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          FORMULARIO DE ABONO
          ================================================= */}

      {pedidoAbonos && mostrarFormulario && (
        <div className="abonos-modal-overlay abonos-modal-form-overlay">
          <div className="abonos-modal abonos-modal-formulario">
            <div className="abonos-modal-header">
              <div className="abonos-modal-title">
                <span className="abonos-modal-title-icono">
                  <HandCoins size={19} />
                </span>
                <div>
                  <h3>Registrar abono</h3>
                  <span>
                    Pedido N.° {pedidoAbonos.id_pedido}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="abonos-modal-close"
                onClick={cerrarFormulario}
                disabled={enviando}
              >
                <X size={19} />
              </button>
            </div>

            <div className="abonos-modal-body">

              <div className="abonos-form-ayuda">
                <div>
                  <span>Saldo pendiente</span>
                  <strong>{formatearPrecio(saldoDetalle)}</strong>
                </div>
                <div>
                  <span>Monto mínimo</span>
                  <strong>{formatearPrecio(montoMinimo ?? 0)}</strong>
                </div>
              </div>

              <div className="abonos-form-grupo">
                <label htmlFor="abono-monto">MONTO</label>

                <input
                  id="abono-monto"
                  type="text"
                  inputMode="numeric"
                  placeholder="$0"
                  className={erroresFormulario.monto ? "input-error" : ""}
                  value={formulario.montoTexto}
                  onChange={(e) =>
                    cambiarCampoFormulario(
                      "montoTexto",
                      formatearEntradaMonto(e.target.value)
                    )
                  }
                />

                {erroresFormulario.monto && (
                  <span className="error-text">{erroresFormulario.monto}</span>
                )}
              </div>

              <div className="abonos-form-grupo">
                <label htmlFor="abono-metodo">MÉTODO</label>

                <select
                  id="abono-metodo"
                  value={formulario.metodo}
                  onChange={(e) =>
                    cambiarCampoFormulario("metodo", e.target.value)
                  }
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>

              <div className="abonos-form-grupo">
                <label htmlFor="abono-referencia">
                  REFERENCIA <span className="abonos-form-opcional">(opcional)</span>
                </label>

                <input
                  id="abono-referencia"
                  type="text"
                  maxLength={100}
                  placeholder="N.° de transferencia o recibo"
                  value={formulario.referencia}
                  onChange={(e) =>
                    cambiarCampoFormulario("referencia", e.target.value)
                  }
                />
              </div>

              <div className="abonos-form-grupo">
                <label htmlFor="abono-observacion">
                  OBSERVACIÓN <span className="abonos-form-opcional">(opcional)</span>
                </label>

                <textarea
                  id="abono-observacion"
                  rows={3}
                  maxLength={500}
                  placeholder="Nota sobre el pago"
                  value={formulario.observacion}
                  onChange={(e) =>
                    cambiarCampoFormulario("observacion", e.target.value)
                  }
                />

                <span className="abonos-form-contador">
                  {formulario.observacion.length}/500
                </span>
              </div>
            </div>

            <div className="abonos-modal-footer">
              <button
                type="button"
                className="abonos-boton-secundario"
                onClick={cerrarFormulario}
                disabled={enviando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="abonos-boton-primario"
                onClick={enviarAbono}
                disabled={enviando}
              >
                {enviando ? (
                  <>
                    <Loader2 size={17} className="abonos-spinner" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    Guardar abono
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
