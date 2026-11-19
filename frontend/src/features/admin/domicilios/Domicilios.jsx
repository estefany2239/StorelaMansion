import { useState, useEffect, useRef, useCallback } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  ChevronRight,
  Loader2,
  X
} from "lucide-react";

import "./Domicilios.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import useValidacionFormulario from "../../../shared/hooks/useValidacionFormulario";
import { tienePermiso } from "../utils/permisos";
import { tallaVisible } from "../../../shared/utils/catalogo";
import {
  obtenerDomicilios,
  obtenerDomicilio,
  actualizarDomicilio,
  cambiarEstadoDomicilio,
  crearDomicilio,
  definirCostoEnvioDomicilio,
  obtenerPedidos
} from "../../../shared/services/api";

const REGISTROS_POR_PAGINA = 6;

// Avance en orden estricto (sin retrocesos ni saltos): la flecha junto a la
// píldora aplica directamente el siguiente estado y el backend rechaza con
// 409 cualquier otra transición (Pendiente -> En camino -> Entregado).
const SIGUIENTE_ESTADO = {
  "Pendiente": "En camino",
  "En camino": "Entregado"
};

const ESTADO_CERRADO = (estado) =>
  estado === "Entregado" || estado === "Cancelado";

const claseEstado = (estado) => {

  switch (estado) {

    case "Entregado":
      return "entregado";

    case "En camino":
      return "camino";

    case "Cancelado":
      return "cancelado";

    default:
      return "pendiente";

  }

};

// El backend entrega el id numérico; con el prefijo se ve igual que el
// código DOM-00001 que llega en la fila del domicilio.
const formatoPedido = (id) => {
  const digitos = String(id ?? "").replace(/\D/g, "");

  if (!digitos) {
    return "";
  }

  return `PED-${digitos.padStart(5, "0")}`;
};

// Convierte la fila del backend a la forma que usa esta pantalla.
const mapearDomicilio = (domicilio) => ({
  id: domicilio.id,
  codigo:
    domicilio.codigo ||
    `DOM-${String(domicilio.id ?? "").padStart(5, "0")}`,
  idPedido: domicilio.id_pedido,
  pedido: formatoPedido(domicilio.id_pedido),
  estadoPedido: domicilio.estado_pedido || "",
  metodoEnvio: domicilio.metodo_envio || "",
  cliente: domicilio.cliente || "",
  destinatario: domicilio.destinatario || "",
  telefono: domicilio.telefono || "",
  direccion: domicilio.direccion || "",
  barrio: domicilio.barrio || "",
  municipio: domicilio.municipio || "",
  departamento: domicilio.departamento || "",
  responsable: domicilio.responsable || "",
  costoEnvio:
    domicilio.costo_envio === null ||
    domicilio.costo_envio === undefined
      ? null
      : Number(domicilio.costo_envio) || 0,
  costoEnvioPendiente: Boolean(domicilio.costo_envio_pendiente),
  totalPedido: Number(domicilio.total_pedido) || 0,
  fechaProgramada: domicilio.fecha_programada || "",
  fechaEntrega: domicilio.fecha_entrega || "",
  observaciones: domicilio.observaciones || "",
  estado: domicilio.estado || "Pendiente",
  fechaPedido: domicilio.fecha_pedido || "",
  productos: (domicilio.items || []).map((item) => ({
    nombre: item.nombre,
    cantidad: Number(item.cantidad) || 0,
    talla: tallaVisible(item.talla),
    color: item.color || "",
    precio: Number(item.precio_unitario) || 0
  }))
});

// Reglas compartidas por ambos modos del modal. El modo viaja dentro del
// formulario para que una sola definición estable sirva para
// "registrar" (pedido, método y dirección) y "editar"
// (responsable, fecha y observaciones).
const REGLAS_DOMICILIO = {
  idPedido: (valor, formulario) => {
    if (formulario.modo !== "registrar") return "";
    return String(valor || "").trim()
      ? ""
      : "Selecciona un pedido.";
  },
  metodoEnvio: (valor, formulario) => {
    if (formulario.modo !== "registrar") return "";
    return String(valor || "").trim()
      ? ""
      : "Selecciona el método de envío.";
  },
  direccion: (valor, formulario) => {
    if (formulario.modo !== "registrar") return "";
    if (formulario.metodoEnvio === "Recoger en tienda") return "";
    return String(valor || "").trim()
      ? ""
      : "Este campo es obligatorio.";
  },
  responsable: (valor, formulario) => {
    if (formulario.modo !== "editar") return "";
    const responsable = String(valor || "").trim();
    if (!responsable) return "Este campo es obligatorio.";
    if (responsable.length > 20) {
      return "El nombre del responsable no puede superar los 20 caracteres.";
    }
    return "";
  },
  fechaProgramada: (valor, formulario) => {
    if (formulario.modo !== "editar") return "";
    const fecha = String(valor || "").trim();
    if (!fecha) return "Este campo es obligatorio.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) {
      return "La fecha programada no es válida.";
    }
    return "";
  },
  observaciones: (valor, formulario) => {
    if (formulario.modo !== "editar") return "";
    return String(valor || "").length > 500
      ? "Las observaciones no pueden superar los 500 caracteres."
      : "";
  },
  costoEnvio: (valor, formulario) => {
    if (formulario.modo !== "editar") return "";
    const crudo = String(valor ?? "").trim();
    if (crudo === "") return "";
    const costo = Number(crudo);
    if (!Number.isFinite(costo) || costo < 0 || costo > 999999999) {
      return "El costo de envío debe ser un monto entre 0 y 999999999.";
    }
    return "";
  }
};

// Campos del backend (snake_case) equivalentes en el formulario para
// mostrar el error 400 bajo el input correcto.
const CAMPO_BACKEND = {
  id_pedido: "idPedido",
  metodo_envio: "metodoEnvio",
  direccion: "direccion",
  responsable: "responsable",
  fecha_programada: "fechaProgramada",
  observaciones: "observaciones",
  costo: "costoEnvio"
};

const METODOS_ENVIO = [
  "Domicilio",
  "Recoger en tienda",
  "Transportadora"
];


export default function Domicilios({ user }) {

  // =====================================================
  // PERMISOS (los botones sin permiso se ocultan)
  // =====================================================

  const puedeCrear = tienePermiso(user, "Domicilios", "Crear");
  const puedeActualizar = tienePermiso(user, "Domicilios", "Actualizar");
  const puedeCambiarEstado = tienePermiso(user, "Domicilios", "Cambiar estado");
  const puedeConsultar = tienePermiso(user, "Domicilios", "Consultar");

  // =====================================================
  // LISTA DE DOMICILIOS (GET /api/domicilios)
  // =====================================================

  const [domicilios, setDomicilios] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [errorLista, setErrorLista] = useState("");

  const [totalPaginas, setTotalPaginas] = useState(1);

  const [busqueda, setBusqueda] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);

  const { toast, mostrarToast } = useToast();

  const cargarDomicilios = useCallback(async (pagina, texto) => {

    setCargando(true);
    setErrorLista("");

    try {

      const respuesta = await obtenerDomicilios({
        q: texto,
        pagina,
        porPagina: REGISTROS_POR_PAGINA
      });

      setDomicilios((respuesta?.domicilios || []).map(mapearDomicilio));
      setTotalPaginas(respuesta?.totalPaginas || 1);

    } catch (error) {

      setErrorLista(
        error?.message || "No se pudieron cargar los domicilios"
      );

    } finally {

      setCargando(false);

    }

  }, []);

  // Única fuente de carga: al montar (retardo 0) y con cada cambio del
  // buscador con retardo de 300 ms para no pedir por cada tecla. Las
  // páginas se cambian desde los controles, sin pasar por aquí.
  const primerMontajeRef = useRef(true);

  useEffect(() => {

    const retardo = primerMontajeRef.current
      ? 0
      : 300;

    primerMontajeRef.current = false;

    const temporizador = setTimeout(() => {
      setPaginaActual(1);
      cargarDomicilios(1, busqueda.trim());
    }, retardo);

    return () => clearTimeout(temporizador);

  }, [busqueda, cargarDomicilios]);

  const cambiarPagina = (pagina) => {
    setPaginaActual(pagina);
    cargarDomicilios(pagina, busqueda.trim());
  };

  const refrescarLista = () => {
    setBusqueda("");
    setPaginaActual(1);
    cargarDomicilios(1, "");
  };

  const actualizarDomicilioEnLista = (respuesta) => {
    const mapeado = mapearDomicilio(
      respuesta?.domicilio ? respuesta.domicilio : respuesta
    );

    setDomicilios((prev) =>
      prev.map((item) =>
        item.id === mapeado.id ? mapeado : item
      )
    );

    // El detalle abierto debe reflejar los datos nuevos.
    setDomicilioSeleccionado((prev) =>
      prev && prev.id === mapeado.id ? mapeado : prev
    );
  };

  // =====================================================
  // ESTADOS DE LOS MODALES
  // =====================================================

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [mostrarDetalle, setMostrarDetalle] =
    useState(false);

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [domicilioSeleccionado, setDomicilioSeleccionado] =
    useState(null);

  const [detalleEnProceso, setDetalleEnProceso] = useState(false);

  const [detalleError, setDetalleError] = useState("");

  const [confirmarEdicion, setConfirmarEdicion] =
    useState(false);

  const [guardando, setGuardando] = useState(false);

  const [creando, setCreando] = useState(false);

  const [estadoEnProcesoId, setEstadoEnProcesoId] = useState(null);


  // =====================================================
  // FORMULARIO
  // =====================================================

  const formularioVacio = {
    modo: "registrar",
    id: null,
    idPedido: "",
    pedidoSeleccionado: null,
    metodoEnvio: "Domicilio",
    direccion: "",
    responsable: "",
    fechaProgramada: "",
    observaciones: "",
    costoEnvio: "",
    costoEnvioPendiente: false,
    totalPedido: 0
  };

  const [formulario, setFormulario] = useState(formularioVacio);

  const {
    errores,
    setErrores,
    manejarBlur,
    revisarCampo,
    validarTodo,
    limpiarValidacion,
  } = useValidacionFormulario(REGLAS_DOMICILIO);

  const cambiarCampo = (campo, valor) => {

    const siguiente = {
      ...formulario,
      [campo]: valor
    };

    setFormulario(siguiente);

    // Si el campo ya fue tocado, su error se recalcula al instante.
    revisarCampo(campo, valor, siguiente);
    revisarCampo("direccion", siguiente.direccion, siguiente);

  };


  // =====================================================
  // FORMATEAR PRECIO
  // =====================================================

  const formatearPrecio = (valor) => {

    return new Intl.NumberFormat(
      "es-CO",
      {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
      }
    ).format(valor);

  };


  // =====================================================
  // FORMATEAR FECHA
  // =====================================================

  const formatearFecha = (fecha) => {

    if (!fecha) return "";

    const partes = fecha.split("-");

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

  };

  const mensajeErrorApi = (error, respaldo) =>
    error?.message || respaldo;


  // =====================================================
  // VER DETALLE (GET /api/domicilios/:id)
  // =====================================================

  const verDetalle = async (domicilio) => {

    setDomicilioSeleccionado(domicilio);
    setDetalleError("");
    setDetalleEnProceso(true);
    setMostrarDetalle(true);

    try {

      const detalle = await obtenerDomicilio(domicilio.id);

      setDomicilioSeleccionado(mapearDomicilio(detalle));

    } catch (error) {

      setDetalleError(
        mensajeErrorApi(error, "No se pudo cargar el detalle del domicilio")
      );

    } finally {

      setDetalleEnProceso(false);

    }

  };


  const cerrarDetalle = () => {

    setMostrarDetalle(false);

    setDomicilioSeleccionado(null);

    setDetalleError("");

    setDetalleEnProceso(false);

  };


  // =====================================================
  // ABRIR EDITAR (responsable, fecha y observaciones)
  // =====================================================

  const abrirEditar = (domicilio) => {

    if (ESTADO_CERRADO(domicilio.estado)) {
      mostrarToast(
        `Un domicilio en estado "${domicilio.estado}" no se puede modificar.`,
        "error"
      );
      return;
    }

    setFormulario({
      modo: "editar",
      id: domicilio.id,
      codigo: domicilio.codigo,
      pedido: domicilio.pedido,
      cliente: domicilio.cliente,
      responsable: domicilio.responsable,
      fechaProgramada: domicilio.fechaProgramada || "",
      observaciones: domicilio.observaciones,
      costoEnvio: "",
      costoEnvioPendiente: domicilio.costoEnvioPendiente,
      costoEnvioActual: domicilio.costoEnvio,
      totalPedido: domicilio.totalPedido
    });

    limpiarValidacion();

    setModoEdicion(true);

    setMostrarModal(true);

  };


  // =====================================================
  // REGISTRAR DOMICILIO (POST /api/domicilios)
  // =====================================================

  const [pedidosDisponibles, setPedidosDisponibles] = useState([]);

  const [cargandoPedidos, setCargandoPedidos] = useState(false);

  const [errorPedidos, setErrorPedidos] = useState("");

  const abrirRegistrar = () => {

    setFormulario(formularioVacio);

    limpiarValidacion();

    setModoEdicion(false);

    setMostrarModal(true);

    setPedidosDisponibles([]);
    setErrorPedidos("");
    setCargandoPedidos(true);

    obtenerPedidos()
      .then((respuesta) => {
        // Solo pedidos que aún NO tienen domicilio: cuando existe una
        // fila en domicilio, `metodo_envio` del listado viene cargado.
        const disponibles = (respuesta || [])
          .filter((pedido) => !pedido.metodo_envio)
          .map((pedido) => ({
            id: pedido.id,
            pedido: formatoPedido(pedido.id),
            cliente: pedido.cliente || "",
            telefono: pedido.telefono || "",
            estado: pedido.estado || "",
            fecha: pedido.fecha || "",
            total: Number(pedido.total) || 0
          }));
        setPedidosDisponibles(disponibles);
        setErrorPedidos("");
      })
      .catch((error) => {
        setErrorPedidos(
          mensajeErrorApi(error, "No se pudieron cargar los pedidos")
        );
      })
      .finally(() => {
        setCargandoPedidos(false);
      });

  };

  const seleccionarPedido = (idPedido) => {

    const pedido =
      pedidosDisponibles.find(
        (item) => String(item.id) === String(idPedido)
      );

    const siguiente = {
      ...formulario,
      idPedido,
      pedidoSeleccionado: pedido || null
    };

    setFormulario(siguiente);

    ["idPedido"].forEach((campo) =>
      revisarCampo(campo, siguiente[campo], siguiente)
    );

  };


  // =====================================================
  // CAMBIAR CAMPOS DEL MODAL DE REGISTRO
  // =====================================================

  const cambiarCampoRegistrar = (campo, valor) => {

    const siguiente = {
      ...formulario,
      [campo]: valor
    };

    setFormulario(siguiente);

    revisarCampo(campo, valor, siguiente);
    revisarCampo("direccion", siguiente.direccion, siguiente);

  };


  // =====================================================
  // GUARDAR
  // =====================================================

  const guardarDomicilio = () => {

    // Valida todo el formulario y, si hay errores,
    // enfoca el primer campo inválido.
    if (!validarTodo(formulario)) {
      return;
    }

    if (modoEdicion) {
      setConfirmarEdicion(true);
      return;
    }

    registrarDomicilio();

  };

  const registrarDomicilio = async () => {

    setCreando(true);

    const cuerpo = {
      id_pedido: formulario.idPedido,
      metodo_envio: formulario.metodoEnvio
    };

    if (formulario.metodoEnvio !== "Recoger en tienda") {
      cuerpo.direccion = formulario.direccion.trim();
    }

    try {

      const creado = await crearDomicilio(cuerpo);

      setMostrarModal(false);

      refrescarLista();

      mostrarToast(
        `Domicilio registrado para el pedido ${formatoPedido(creado?.id_pedido || formulario.idPedido)}`
      );

    } catch (error) {

      // 400 con `campo`: se muestra bajo el input correspondiente.
      const campo = CAMPO_BACKEND[error?.campo];

      if (campo) {
        setErrores({ [campo]: error.message });
      }

      mostrarToast(
        mensajeErrorApi(error, "No se pudo registrar el domicilio"),
        "error"
      );

    } finally {

      setCreando(false);

    }

  };

  const confirmarEdicionDomicilio = () => {
    setConfirmarEdicion(false);
    ejecutarGuardarEdicion();
  };

  const ejecutarGuardarEdicion = async () => {

    setGuardando(true);

    // Requiere el campo de costo solo si el usuario escribió algo.
    if (formulario.costoEnvioPendiente && formulario.costoEnvio !== "") {
      if (!validarTodo(formulario)) {
        setGuardando(false);
        return;
      }
    }

    try {

      let respuesta = await actualizarDomicilio(
        formulario.id,
        {
          responsable: formulario.responsable.trim(),
          fecha_programada: formulario.fechaProgramada,
          observaciones: formulario.observaciones.trim()
        }
      );

      // El costo de envío pendiente se define en una llamada aparte
      // (PATCH /:id/costo-envio), que recalcula el total del pedido.
      const defineCosto =
        formulario.costoEnvioPendiente &&
        String(formulario.costoEnvio).trim() !== "";

      if (defineCosto) {
        respuesta = await definirCostoEnvioDomicilio(
          formulario.id,
          Number(formulario.costoEnvio)
        );
      }

      actualizarDomicilioEnLista(respuesta);

      setMostrarModal(false);

      mostrarToast(
        defineCosto
          ? `Domicilio actualizado y costo de envío definido. El total del pedido es ${formatearPrecio(respuesta?.pedido?.total ?? 0)}.`
          : "Domicilio actualizado con éxito"
      );

    } catch (error) {

      // 400 con `campo` y 409 ("ya definido", menor a lo abonado, etc.) caen
      // en el toast; 401 y 500 reservan su mensaje genérico.
      const campo = CAMPO_BACKEND[error?.campo];

      if (campo) {
        setErrores({ [campo]: error.message });
      }

      mostrarToast(
        mensajeErrorApi(error, "No se pudo actualizar el domicilio"),
        "error"
      );

    } finally {

      setGuardando(false);

    }

  };

  const cerrarModal = () => {

    setMostrarModal(false);

    setModoEdicion(false);

  };


  // =====================================================
  // CAMBIAR ESTADO (PATCH /:id/estado)
  // Un solo control: la flecha junto a la píldora aplica
  // directamente el siguiente estado.
  // =====================================================

  const avanzarEstado = async (domicilio) => {

    const destino = SIGUIENTE_ESTADO[domicilio.estado];

    if (!destino) return;

    // Pasar a "En camino" exige responsable (ya registrado o al enviarlo).
    if (destino === "En camino" && !domicilio.responsable) {
      mostrarToast(
        "El domicilio necesita un responsable para pasar a En camino. Edítalo y asígnalo.",
        "error"
      );
      return;
    }

    setEstadoEnProcesoId(domicilio.id);

    try {

      const actualizado = await cambiarEstadoDomicilio(
        domicilio.id,
        destino
      );

      actualizarDomicilioEnLista(actualizado);

      mostrarToast(
        destino === "Entregado"
          ? "Domicilio entregado. El pedido quedó Entregado."
          : "Domicilio en camino. El pedido quedó Despachado."
      );

    } catch (error) {

      // 403 (sin permiso), 409 (salto/retroceso o sin responsable) y
      // 400 llegan con el mensaje exacto del backend.
      mostrarToast(
        mensajeErrorApi(error, "No se pudo cambiar el estado del domicilio"),
        "error"
      );

    } finally {

      setEstadoEnProcesoId(null);

    }

  };


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="domicilios-page">


      {/* =================================================
          ENCABEZADO
      ================================================= */}

      <div className="domicilios-header">

        <div className="domicilios-title">

          <h2>
            Domicilios
          </h2>

          <p>
            Gestiona y controla las entregas a domicilio.
          </p>

        </div>


        <div className="domicilios-actions">


          {/* BUSCADOR */}

          {puedeConsultar && (
            <div className="domicilios-search">

              <Search size={18} />

              <input
                type="text"
                placeholder="Buscar por código, pedido, cliente o dirección..."
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(
                    e.target.value
                  )
                }
              />

            </div>
          )}


          {/* REGISTRAR */}

          {puedeCrear && (
            <button
              type="button"
              className="domicilios-add-button"
              onClick={abrirRegistrar}
            >

              <Plus size={18} />

              Registrar domicilio

            </button>
          )}

        </div>

      </div>


      {/* =================================================
          TABLA
      ================================================= */}

      <div className="domicilios-table-container">

        <table className="domicilios-table">

          <thead>

            <tr>

              <th>
                ID DOMICILIO
              </th>

              <th>
                PEDIDO
              </th>

              <th>
                CLIENTE
              </th>

              <th>
                DIRECCIÓN
              </th>

              <th>
                TELÉFONO
              </th>

              <th>
                RESPONSABLE
              </th>

              <th>
                COSTO DE ENVÍO
              </th>

              <th>
                FECHA
              </th>

              <th>
                ESTADO
              </th>

              <th>
                ACCIONES
              </th>

            </tr>

          </thead>


          <tbody>

            {domicilios.map(
              (domicilio) => {

                const siguienteEstado =
                  SIGUIENTE_ESTADO[domicilio.estado];

                const cerrado =
                  ESTADO_CERRADO(domicilio.estado);

                return (

                  <tr
                    key={domicilio.id}
                  >

                    <td>

                      <strong className="domicilio-id">
                        {domicilio.codigo}
                      </strong>

                    </td>


                    <td>

                      <span className="domicilio-id-relacion">
                        {domicilio.pedido}
                      </span>

                    </td>


                    <td>

                      <span className="domicilio-cliente" title={domicilio.cliente}>
                        {domicilio.cliente}
                      </span>

                    </td>


                    <td>

                      <div className="domicilio-entrega">
                        <span
                          className="domicilio-direccion"
                          title={domicilio.direccion}
                        >
                          {domicilio.direccion || "—"}
                        </span>

                        <span
                          className="domicilio-ciudad"
                          title={
                            [domicilio.barrio, domicilio.municipio]
                              .filter(Boolean)
                              .join(" — ")
                          }
                        >
                          {[
                            domicilio.barrio,
                            domicilio.municipio
                          ].filter(Boolean).join(" — ") || "—"}
                        </span>
                      </div>

                    </td>


                    <td>

                      <span className="domicilio-telefono">
                        {domicilio.telefono || "—"}
                      </span>

                    </td>


                    <td>

                      <span className="domicilio-responsable">
                        {domicilio.responsable || "Sin asignar"}
                      </span>

                    </td>


                    <td>

                      {domicilio.costoEnvioPendiente ? (

                        <span className="domicilio-costo-pendiente">
                          Por definir
                        </span>

                      ) : (

                        <span className="domicilio-costo">
                          {formatearPrecio(domicilio.costoEnvio)}
                        </span>

                      )}

                    </td>


                    <td>

                      <span className="domicilio-fecha">
                        {formatearFecha(domicilio.fechaProgramada) || "—"}
                      </span>

                    </td>


                    <td>

                      <div className="domicilio-estado-cell">

                        <span
                          className={`domicilio-estado ${claseEstado(domicilio.estado)}`}
                        >

                          {domicilio.estado}

                        </span>

                        {puedeCambiarEstado && siguienteEstado && (

                          <button
                            type="button"
                            className="domicilio-estado-toggle"
                            title={
                              siguienteEstado === "En camino" &&
                              !domicilio.responsable
                                ? "Asigna un responsable con el lápiz primero"
                                : `Cambiar a ${siguienteEstado}`
                            }
                            disabled={
                              estadoEnProcesoId === domicilio.id ||
                              (siguienteEstado === "En camino" &&
                                !domicilio.responsable)
                            }
                            onClick={() =>
                              avanzarEstado(domicilio)
                            }
                          >

                            {estadoEnProcesoId === domicilio.id ? (
                              <Loader2
                                size={14}
                                className="domicilio-spinner"
                              />
                            ) : (
                              <ChevronRight size={16} />
                            )}

                          </button>

                        )}

                      </div>

                    </td>


                    <td>

                      <div className="domicilio-actions">


                        {puedeConsultar && (
                          <button
                            type="button"
                            title="Ver detalle"
                            onClick={() =>
                              verDetalle(
                                domicilio
                              )
                            }
                          >

                            <Eye size={18} />

                          </button>
                        )}


                        {puedeActualizar && (
                          <button
                            type="button"
                            title={
                              cerrado
                                ? "No se puede modificar"
                                : "Editar entrega"
                            }
                            className={
                              cerrado
                                ? "disabled"
                                : ""
                            }
                            disabled={cerrado}
                            onClick={() =>
                              abrirEditar(
                                domicilio
                              )
                            }
                          >

                            <Pencil size={18} />

                          </button>
                        )}

                      </div>

                    </td>

                  </tr>

                );

              }
            )}


            {domicilios.length === 0 && (

              <tr>

                <td
                  colSpan="10"
                  className="domicilios-empty"
                >

                  {cargando
                    ? "Cargando domicilios..."
                    : errorLista
                      ? errorLista
                      : "Domicilio no encontrado en el sistema."}

                </td>

              </tr>

            )}

          </tbody>

        </table>

        <Pagination
          currentPage={paginaActual}
          totalPages={totalPaginas}
          onPageChange={cambiarPagina}
        />

      </div>


      {/* =================================================
          MODAL AGREGAR / EDITAR
      ================================================= */}

      {mostrarModal && (

        <div className="domicilio-modal-overlay">

          <div className="domicilio-modal">


            <div className="domicilio-modal-header">

              <h3>

                {modoEdicion
                  ? `Actualizar Domicilio ${formulario.codigo || ""}`
                  : "Registrar Domicilio"}

              </h3>


              <button
                type="button"
                className="domicilio-modal-close"
                onClick={cerrarModal}
              >

                <X size={21} />

              </button>

            </div>


            <div className="domicilio-modal-body">


              {modoEdicion ? (


                /* ================================================
                    MODO EDICIÓN: responsable, fecha y
                    observaciones (PATCH /api/domicilios/:id)
                ================================================ */

                <>

                  {/* RESPONSABLE */}

                  <div className="domicilio-form-group">

                    <label>
                      RESPONSABLE DE LA ENTREGA
                    </label>

                    <input
                      type="text"
                      id="campo-responsable"
                      placeholder="Nombre del responsable"
                      maxLength={20}
                      value={
                        formulario.responsable
                      }
                      className={`input ${errores.responsable ? "input-error" : ""}`}
                      onChange={(e) =>
                        cambiarCampo(
                          "responsable",
                          e.target.value.replace(
                            /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
                            ""
                          )
                        )
                      }
                      onBlur={() =>
                        manejarBlur(
                          "responsable",
                          formulario.responsable,
                          formulario
                        )
                      }
                    />

                    {errores.responsable && (
                      <span className="error-text">
                        {errores.responsable}
                      </span>
                    )}

                  </div>


                  {/* FECHA PROGRAMADA */}

                  <div className="domicilio-form-group">

                    <label>
                      FECHA PROGRAMADA
                    </label>

                    <input
                      type="date"
                      id="campo-fechaProgramada"
                      value={
                        formulario.fechaProgramada
                      }
                      className={`input ${errores.fechaProgramada ? "input-error" : ""}`}
                      onChange={(e) =>
                        cambiarCampo(
                          "fechaProgramada",
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        manejarBlur(
                          "fechaProgramada",
                          formulario.fechaProgramada,
                          formulario
                        )
                      }
                    />

                    {errores.fechaProgramada && (
                      <span className="error-text">
                        {errores.fechaProgramada}
                      </span>
                    )}

                  </div>


                  {/* COSTO DE ENVÍO PENDIENTE */}

                  {formulario.costoEnvioPendiente && (

                    <div className="domicilio-costo-bloque">

                      <div className="domicilio-form-group">

                        <label>
                          COSTO DE ENVÍO (PENDIENTE)
                        </label>

                        <input
                          type="number"
                          id="campo-costoEnvio"
                          min="0"
                          step="0.01"
                          placeholder="Ej: 15000"
                          value={
                            formulario.costoEnvio
                          }
                          className={`input ${errores.costoEnvio ? "input-error" : ""}`}
                          onChange={(e) =>
                            cambiarCampo(
                              "costoEnvio",
                              e.target.value.replace(
                                /[^0-9.]/g,
                                ""
                              ).replace(/(\..*)\./g, "$1")
                            )
                          }
                          onBlur={() =>
                            manejarBlur(
                              "costoEnvio",
                              formulario.costoEnvio,
                              formulario
                            )
                          }
                        />

                        {errores.costoEnvio && (
                          <span className="error-text">
                            {errores.costoEnvio}
                          </span>
                        )}

                      </div>

                      <div className="domicilio-aviso-costo">

                        Este pedido todavía no tiene definido el costo de
                        envío. Si lo defines aquí, el total del pedido
                        cambiará de {formatearPrecio(formulario.totalPedido)}{" "}
                        a{" "}
                        {formatearPrecio(
                          formulario.totalPedido +
                            (Number(formulario.costoEnvio) || 0)
                        )}
                        . Deja el campo vacío para no definirlo ahora.

                      </div>

                    </div>

                  )}


                  {/* OBSERVACIONES */}

                  <div className="domicilio-form-group">

                    <label>
                      OBSERVACIONES
                    </label>

                    <textarea
                      id="campo-observaciones"
                      rows={4}
                      maxLength={500}
                      placeholder="Notas para la entrega (opcional)"
                      value={
                        formulario.observaciones
                      }
                      className={`input ${errores.observaciones ? "input-error" : ""}`}
                      onChange={(e) =>
                        cambiarCampo(
                          "observaciones",
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        manejarBlur(
                          "observaciones",
                          formulario.observaciones,
                          formulario
                        )
                      }
                    />

                    {errores.observaciones && (
                      <span className="error-text">
                        {errores.observaciones}
                      </span>
                    )}

                  </div>

                </>


              ) : (


                /* ================================================
                    MODO REGISTRO: elegir un pedido que aún no
                    tenga domicilio (POST /api/domicilios)
                ================================================ */

                <>

                  {/* PEDIDO */}

                  <div className="domicilio-form-group">

                    <label>
                      PEDIDO SIN DOMICILIO
                    </label>

                    <select
                      id="campo-idPedido"
                      value={
                        formulario.idPedido
                      }
                      disabled={
                        cargandoPedidos
                      }
                      className={`input ${errores.idPedido ? "input-error" : ""}`}
                      onChange={(e) =>
                        seleccionarPedido(
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        manejarBlur(
                          "idPedido",
                          formulario.idPedido,
                          formulario
                        )
                      }
                    >

                      <option value="">
                        {cargandoPedidos
                          ? "Cargando pedidos..."
                          : "Seleccionar pedido"}
                      </option>

                      {pedidosDisponibles.map(
                        (pedido) => (

                          <option
                            key={pedido.id}
                            value={pedido.id}
                          >

                            {`${pedido.pedido} — ${pedido.cliente}`}

                          </option>

                        )
                      )}

                    </select>

                    {errores.idPedido && (
                      <span className="error-text">
                        {errores.idPedido}
                      </span>
                    )}

                    {errorPedidos && (
                      <span className="error-text">
                        {errorPedidos}
                      </span>
                    )}

                  </div>


                  {/* DATOS DE ENTREGA DEL PEDIDO */}

                  {formulario.pedidoSeleccionado && (

                    <div className="domicilio-form-row">

                      <div className="domicilio-info-group">

                        <label>
                          CLIENTE
                        </label>

                        <div className="domicilio-info-value">
                          {formulario.pedidoSeleccionado.cliente}
                        </div>

                      </div>


                      <div className="domicilio-info-group">

                        <label>
                          TELÉFONO
                        </label>

                        <div className="domicilio-info-value">
                          {formulario.pedidoSeleccionado.telefono || "—"}
                        </div>

                      </div>

                    </div>

                  )}


                  {/* MÉTODO + DIRECCIÓN */}

                  <div className="domicilio-form-row">

                    <div className="domicilio-form-group">

                      <label>
                        MÉTODO DE ENVÍO
                      </label>

                      <select
                        id="campo-metodoEnvio"
                        value={
                          formulario.metodoEnvio
                        }
                        className={`input ${errores.metodoEnvio ? "input-error" : ""}`}
                        onChange={(e) =>
                          cambiarCampoRegistrar(
                            "metodoEnvio",
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          manejarBlur(
                            "metodoEnvio",
                            formulario.metodoEnvio,
                            formulario
                          )
                        }
                      >

                        {METODOS_ENVIO.map(
                          (metodo) => (

                            <option
                              key={metodo}
                              value={metodo}
                            >

                              {metodo}

                            </option>

                          )
                        )}

                      </select>

                      {errores.metodoEnvio && (
                        <span className="error-text">
                          {errores.metodoEnvio}
                        </span>
                      )}

                    </div>


                    {formulario.metodoEnvio !==
                      "Recoger en tienda" && (

                      <div className="domicilio-form-group">

                        <label>
                          DIRECCIÓN DE ENTREGA
                        </label>

                        <input
                          type="text"
                          id="campo-direccion"
                          placeholder="Ej: Cll 72 #10-34"
                          value={
                            formulario.direccion
                          }
                          className={`input ${errores.direccion ? "input-error" : ""}`}
                          onChange={(e) =>
                            cambiarCampoRegistrar(
                              "direccion",
                              e.target.value
                            )
                          }
                          onBlur={() =>
                            manejarBlur(
                              "direccion",
                              formulario.direccion,
                              formulario
                            )
                          }
                        />

                        {errores.direccion && (
                          <span className="error-text">
                            {errores.direccion}
                          </span>
                        )}

                      </div>

                    )}

                  </div>


                  {errorPedidos && (
                    <div className="domicilio-aviso-costo">
                      {errorPedidos}
                    </div>
                  )}

                </>

              )}

            </div>


            {/* FOOTER */}

            <div className="domicilio-modal-footer">

              <button
                type="button"
                className="domicilio-cancel-button"
                onClick={cerrarModal}
                disabled={guardando || creando}
              >

                Cancelar

              </button>


              <button
                type="button"
                className="domicilio-create-button"
                onClick={guardarDomicilio}
                disabled={guardando || creando}
              >

                {(guardando || creando) ? (
                  <>
                    <Loader2
                      size={17}
                      className="domicilio-spinner"
                    />
                    Guardando...
                  </>
                ) : modoEdicion ? (
                  "Guardar cambios"
                ) : (
                  "Crear domicilio"
                )}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          MODAL DETALLE
      ================================================= */}

      {mostrarDetalle &&
        domicilioSeleccionado && (

        <div className="domicilio-modal-overlay">

          <div className="domicilio-modal">


            <div className="domicilio-modal-header">

              <h3>
                Detalle del Domicilio
              </h3>


              <button
                type="button"
                className="domicilio-modal-close"
                onClick={cerrarDetalle}
              >

                <X size={21} />

              </button>

            </div>


            <div className="domicilio-modal-body">

              {detalleEnProceso && (

                <div className="domicilio-detalle-cargando">
                  <Loader2
                    size={22}
                    className="domicilio-spinner"
                  />
                  <span>
                    Cargando detalle del domicilio...
                  </span>
                </div>

              )}


              {!detalleEnProceso && detalleError && (

                <div className="domicilio-aviso-costo">
                  {detalleError}
                </div>

              )}


              {!detalleEnProceso && !detalleError && (


                <>

                  <div className="domicilio-form-row">

                    <div className="domicilio-info-group">

                      <label>
                        ID DOMICILIO
                      </label>

                      <div className="domicilio-info-value">
                        {domicilioSeleccionado.codigo}
                      </div>

                    </div>


                    <div className="domicilio-info-group">

                      <label>
                        ESTADO
                      </label>

                      <div className="domicilio-info-value">

                        <span
                          className={`domicilio-estado ${claseEstado(domicilioSeleccionado.estado)}`}
                        >

                          {domicilioSeleccionado.estado}

                        </span>

                      </div>

                    </div>

                  </div>


                  <div className="domicilio-form-row">

                    <div className="domicilio-info-group">

                      <label>
                        PEDIDO
                      </label>

                      <div className="domicilio-info-value">
                        {`${domicilioSeleccionado.pedido}${domicilioSeleccionado.estadoPedido ? ` (${domicilioSeleccionado.estadoPedido})` : ""}`}
                      </div>

                    </div>


                    <div className="domicilio-info-group">

                      <label>
                        CLIENTE
                      </label>

                      <div className="domicilio-info-value">
                        {domicilioSeleccionado.cliente || "—"}
                      </div>

                    </div>

                  </div>


                  <div className="domicilio-form-row">

                    <div className="domicilio-info-group">

                      <label>
                        DIRECCIÓN COMPLETA
                      </label>

                      <div className="domicilio-info-value">
                        {[
                          domicilioSeleccionado.direccion,
                          domicilioSeleccionado.barrio,
                          domicilioSeleccionado.municipio,
                          domicilioSeleccionado.departamento
                        ]
                          .filter(Boolean)
                          .join(" — ") || "—"}
                      </div>

                    </div>


                    <div className="domicilio-info-group">

                      <label>
                        TELÉFONO
                      </label>

                      <div className="domicilio-info-value">
                        {domicilioSeleccionado.telefono || "—"}
                      </div>

                    </div>

                  </div>


                  <div className="domicilio-form-row">

                    <div className="domicilio-info-group">

                      <label>
                        COSTO DE ENVÍO
                      </label>

                      <div className="domicilio-info-value">
                        {domicilioSeleccionado.costoEnvioPendiente
                          ? "Por definir"
                          : formatearPrecio(
                              domicilioSeleccionado.costoEnvio
                            )}
                      </div>

                    </div>


                    <div className="domicilio-info-group">

                      <label>
                        TOTAL DEL PEDIDO
                      </label>

                      <div className="domicilio-info-value">
                        {formatearPrecio(
                          domicilioSeleccionado.totalPedido
                        )}
                      </div>

                    </div>

                  </div>


                  <div className="domicilio-form-row">

                    <div className="domicilio-info-group">

                      <label>
                        RESPONSABLE DE LA ENTREGA
                      </label>

                      <div className="domicilio-info-value">
                        {domicilioSeleccionado.responsable ||
                          "Sin asignar"}
                      </div>

                    </div>


                    <div className="domicilio-info-group">

                      <label>
                        FECHA PROGRAMADA
                      </label>

                      <div className="domicilio-info-value">
                        {formatearFecha(
                          domicilioSeleccionado.fechaProgramada
                        ) || "—"}
                      </div>

                    </div>

                  </div>


                  <div className="domicilio-form-row">

                    <div className="domicilio-info-group">

                      <label>
                        MÉTODO DE ENVÍO
                      </label>

                      <div className="domicilio-info-value">
                        {domicilioSeleccionado.metodoEnvio || "—"}
                      </div>

                    </div>


                    <div className="domicilio-info-group">

                      <label>
                        FECHA DE ENTREGA
                      </label>

                      <div className="domicilio-info-value">
                        {formatearFecha(
                          domicilioSeleccionado.fechaEntrega
                        ) || "—"}
                      </div>

                    </div>

                  </div>


                  <div className="domicilio-info-group">

                    <label>
                      PRODUCTOS DEL PEDIDO
                    </label>

                    <div className="domicilio-productos">

                      {domicilioSeleccionado.productos.map(
                        (producto, indice) => (

                          <div
                            key={`${producto.nombre}-${indice}`}
                            className="domicilio-producto-fila"
                          >

                            <div className="domicilio-producto-datos">

                              <span className="domicilio-producto-nombre">
                                {producto.cantidad} × {producto.nombre}
                              </span>

                              <span className="domicilio-producto-meta">
                                {producto.talla ? `Talla ${producto.talla}` : "Sin talla"}
                                {producto.color ? ` · ${producto.color}` : ""}
                              </span>

                            </div>

                            <span className="domicilio-producto-precio">
                              {formatearPrecio(
                                producto.precio * producto.cantidad
                              )}
                            </span>

                          </div>

                        )
                      )}


                      {domicilioSeleccionado.productos.length === 0 && (
                        <div className="domicilio-producto-fila">
                          <span className="domicilio-producto-meta">
                            El pedido no registra productos.
                          </span>
                        </div>
                      )}

                    </div>

                  </div>


                  <div className="domicilio-info-group">

                    <label>
                      OBSERVACIONES
                    </label>

                    <div className="domicilio-info-value multilinea">
                      {domicilioSeleccionado.observaciones ||
                        "Sin observaciones para esta entrega."}
                    </div>

                  </div>


                  {/* REGLA DE NEGOCIO */}

                  {domicilioSeleccionado.estado ===
                    "Entregado" && (

                    <div className="domicilio-delivered-info">

                      Entrega confirmada. Este domicilio
                      no puede ser modificado ni avanzar
                      nuevamente.

                    </div>

                  )}

                </>

              )}

            </div>


            <div className="domicilio-modal-footer">

              <button
                type="button"
                className="domicilio-cancel-button detail-cerrar-button"
                onClick={cerrarDetalle}
              >

                Cerrar

              </button>

            </div>

          </div>

        </div>

      )}

      <ConfirmDialog
        abierto={confirmarEdicion}
        titulo="Confirmar cambios"
        mensaje={
          <>¿Deseas guardar los cambios realizados en el domicilio "
            <strong>{formulario.codigo || ""}</strong>" del pedido{" "}
            <strong>{formulario.pedido || ""}</strong>?
            {formulario.costoEnvioPendiente &&
              formulario.costoEnvio !== "" && (
                <>
                  {" "}Al definir el costo de envío también cambiará el
                  total del pedido.
                </>
              )}
          </>
        }
        textoConfirmar="Guardar cambios"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEdicionDomicilio}
        onCancelar={() => setConfirmarEdicion(false)}
      />

      <Toast toast={toast} />

    </div>

  );

}
