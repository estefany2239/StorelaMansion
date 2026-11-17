import { useState, useEffect, useRef } from "react";

import {
  Plus,
  Search,
  Eye,
  ChevronDown,
  Pencil,
  X,
  Trash2,
  Receipt,
  FileText,
  FileImage,
  ZoomIn,
  ImageOff,
  Loader2
} from "lucide-react";

import "./Pedidos.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import HistorialAbonos from "../abonos/HistorialAbonos";
import DetallePedido from "./DetallePedido";

import { tienePermiso } from "../utils/permisos";
import { formatoCliente } from "../utils/ids";
import { tallaVisible } from "../../../shared/utils/catalogo";

import {
  obtenerPedidos,
  cambiarEstadoPedido as cambiarEstadoPedidoApi,
  confirmarPagoPedido,
  rechazarPagoPedido,
  obtenerComprobantesPedido,
  obtenerArchivoComprobantePedido,
  aprobarComprobantePedido,
  rechazarComprobantePedido,
  obtenerAbonosPedido,
  registrarAbonoPedido,
  obtenerConfiguracionAbonos
} from "../../../shared/services/api";


const SIGUIENTE_ESTADO = {
  "Registrado": "En preparación",
  "En preparación": "Despachado",
  "Despachado": "Entregado"
};

// El backend solo persiste el campo `estado` (PATCH /api/pedidos/:id/estado).
// Mientras esté en false, el modal de edición deja editable SOLO el estado y
// muestra el resto de campos en solo lectura, para no ofrecer cambios que el
// servidor ignora. Ponlo en true para reactivar la edición completa.
const EDICION_COMPLETA_PEDIDO = false;


// Convierte un pedido del backend a la forma que usa esta pantalla.
// `pagos` trae el historial real (todas las filas de la tabla pago); el
// fallback a monto_pagado solo cubre respuestas antiguas sin pagos.
const mapearPedidoBackend = (pedido) => {
  const pagos =
    Array.isArray(pedido.pagos) && pedido.pagos.length > 0
      ? pedido.pagos
      : Number(pedido.monto_pagado) > 0
        ? [
            {
              fecha: pedido.fecha,
              monto: Number(pedido.monto_pagado),
              metodo: pedido.metodo_pago,
              banco: null
            }
          ]
        : [];

  const abonos = [...pagos].reverse().map((pago) => ({
    fecha: pago.fecha || pedido.fecha,
    valor: Number(pago.monto) || 0,
    metodoPago: pago.metodo || "",
    banco: pago.banco || null
  }));

  const total = Number(pedido.total) || 0;
  const totalAbonado = Number(pedido.total_abonado);
  const totalPagado = Number.isFinite(totalAbonado)
    ? totalAbonado
    : abonos.reduce((suma, abono) => suma + abono.valor, 0);
  const saldoBackend = Number(pedido.saldo_pendiente);
  const saldo = Number.isFinite(saldoBackend)
    ? saldoBackend
    : Math.max(0, total - totalPagado);

  return {
    id: String(pedido.id),
    idCliente: formatoCliente(pedido.id_usuario),
    cliente: pedido.cliente,
    clienteCorreo: pedido.cliente_correo,
    tipoDocumento: pedido.tipo_documento || "",
    documento: pedido.documento || "",
    telefono: pedido.telefono || "",
    vendedor_id: undefined,
    fecha: pedido.fecha,
    total,
    estado: pedido.estado,
    estadoPago: pedido.estado_pago || "No aplica",
    estadoPagoEtiqueta: pedido.estado_pago_etiqueta || (saldo <= 0 ? "Pagado" : totalPagado > 0 ? "Pago parcial" : "Pendiente"),
    modalidad: pedido.modalidad || (pedido.es_contra_entrega ? "Contra entrega" : "Pago anticipado"),
    metodoPago: pedido.metodo_pago || "—",
    banco:
      pagos[0]?.banco ||
      (String(pedido.metodo_pago || "").includes("QR") ? "QR" : ""),
    metodoEnvio: pedido.metodo_envio || "Domicilio",
    costoEnvio:
      pedido.costo_envio === null || pedido.costo_envio === undefined
        ? null
        : Number(pedido.costo_envio) || 0,
    costoEnvioPendiente: Boolean(pedido.costo_envio_pendiente),
    direccion: pedido.direccion || "",
    departamento: pedido.departamento || "",
    municipio: pedido.municipio || "",
    barrio: pedido.barrio || "",
    nombreDestinatario: pedido.nombre_destinatario || "",
    telefonoDestinatario: pedido.telefono_destinatario || "",
    productos: (pedido.items || []).map((item) => ({
      nombre: item.nombre,
      cantidad: item.cantidad,
      talla: tallaVisible(item.talla),
      color: item.color || "-",
      precio: Number(item.precio_unitario) || 0
    })),
    abonos,
    totalPagado,
    saldo
  };
};


const claseEstadoPago = (estadoPago) => {
  const valor = String(estadoPago || "No aplica").toLowerCase();
  if (valor.includes("confirmado")) return "confirmado";
  if (valor.includes("rechazado")) return "rechazado";
  if (valor.includes("pendiente")) return "pendiente";
  return "no-aplica";
};

const claseEstadoPagoMonto = (estadoPago) => {
  const valor = String(estadoPago || "").toLowerCase();
  if (valor.includes("parcial")) return "parcial";
  if (valor.includes("pagado")) return "pagado";
  return "pendiente";
};

const claseEstadoComprobante = (estado) => {
  const valor = String(estado || "").toLowerCase();
  if (valor === "aprobado") return "aprobado";
  if (valor === "rechazado") return "rechazado";
  return "pendiente";
};

const montoPagoEsperado = (pedido) => {
  if (!pedido) return 0;

  return String(pedido.metodoPago || "").startsWith("Contra entrega")
    ? Math.round((Number(pedido.total) || 0) * 0.5)
    : Number(pedido.total) || 0;
};


const claseEstado = (estado) => {

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

const REGISTROS_POR_PAGINA = 6;


const esTipoImagen = (tipo) =>
  String(tipo || "")
    .toLowerCase()
    .startsWith("image/");


// Miniatura perezosa de un comprobante. Descarga el archivo con el token
// cuando entra en pantalla y libera el object URL al desmontarse (al cerrar
// el modal).
function ComprobanteMiniatura({ pedidoId, comprobante, onAbrir }) {

  const contenedorRef = useRef(null);
  const urlRef = useRef("");

  const [estado, setEstado] =
    useState("cargando");

  const [archivo, setArchivo] =
    useState(null);

  useEffect(() => {

    const nodo = contenedorRef.current;

    if (!nodo) return undefined;

    let activo = true;
    let observador = null;

    const cargar = async () => {

      if (!activo) return;

      setEstado("cargando");

      try {

        const blob =
          await obtenerArchivoComprobantePedido(
            pedidoId,
            comprobante.id
          );

        if (!activo) return;

        const url = URL.createObjectURL(blob);

        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
        }

        urlRef.current = url;

        setArchivo({
          url,
          tipo:
            comprobante.tipo_mime ||
            blob.type ||
            ""
        });

        setEstado("listo");

      } catch {

        if (activo) {
          setEstado("error");
        }

      }

    };

    if (typeof IntersectionObserver === "undefined") {

      cargar();

    } else {

      observador = new IntersectionObserver(
        (entradas) => {
          if (
            entradas.some(
              (entrada) => entrada.isIntersecting
            )
          ) {
            observador.disconnect();
            observador = null;
            cargar();
          }
        },
        { rootMargin: "120px" }
      );

      observador.observe(nodo);

    }

    return () => {

      activo = false;

      if (observador) {
        observador.disconnect();
      }

      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = "";
      }

    };

  }, [pedidoId, comprobante.id, comprobante.tipo_mime]);

  const esImagen =
    estado === "listo" &&
    esTipoImagen(archivo?.tipo);

  return (

    <div
      className="pedido-comprobante-miniatura"
      ref={contenedorRef}
    >

      {estado === "cargando" && (

        <div className="pedido-comprobante-miniatura-cargando">

          <Loader2
            size={22}
            className="pedido-comprobante-spinner"
          />

          <span>Cargando...</span>

        </div>

      )}

      {estado === "error" && (

        <div
          className="pedido-comprobante-miniatura-error"
          title="No se pudo cargar el archivo"
        >

          <ImageOff size={26} />

          <span>Error</span>

        </div>

      )}

      {esImagen && (

        <button
          type="button"
          className="pedido-comprobante-miniatura-boton"
          title="Ampliar comprobante"
          onClick={() =>
            onAbrir({
              url: archivo.url,
              tipo: archivo.tipo,
              intento: comprobante.intento
            })
          }
        >

          <img
            src={archivo.url}
            alt={`Comprobante del intento ${comprobante.intento}`}
            loading="lazy"
          />

          <span className="pedido-comprobante-miniatura-lupa">

            <ZoomIn size={22} />

          </span>

        </button>

      )}

      {estado === "listo" && !esImagen && (

        <div className="pedido-comprobante-miniatura-documento">

          <FileText size={30} />

          <a
            href={archivo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pedido-comprobante-miniatura-abrir"
          >
            Abrir
          </a>

        </div>

      )}

    </div>

  );

}


export default function Pedidos({ vendedorId, user }) {

  // =====================================================
  // PERMISOS (los botones sin permiso se ocultan)
  // =====================================================

  const puedeCrear = tienePermiso(user, "Pedidos", "Crear");
  const puedeActualizar = tienePermiso(user, "Pedidos", "Actualizar");
  const puedeCambiarEstado = tienePermiso(user, "Pedidos", "Cambiar estado");
  const puedeConsultar = tienePermiso(user, "Pedidos", "Consultar");


  // =====================================================
  // PEDIDOS
  // =====================================================

  const [pedidos, setPedidos] = useState([]);

  // Los pedidos se cargan desde el backend (GET /api/pedidos). El mapeo a la
  // forma que usa esta pantalla se hace en `mapearPedidoBackend`.
  const [cargandoPedidos, setCargandoPedidos] = useState(true);

  const [errorPedidos, setErrorPedidos] = useState("");


  // =====================================================
  // ESTADOS
  // =====================================================

  const [busqueda, setBusqueda] = useState("");

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [mostrarDetalle, setMostrarDetalle] =
    useState(false);

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [pedidoSeleccionado, setPedidoSeleccionado] =
    useState(null);

  const [confirmarEdicion, setConfirmarEdicion] =
    useState(false);

  const [pedidoACancelar, setPedidoACancelar] =
    useState(null);

  const [pedidoPagoAccion, setPedidoPagoAccion] =
    useState(null);

  const [pagoEnProceso, setPagoEnProceso] =
    useState(false);

  const { toast, mostrarToast } = useToast();

  // Con la edición completa desactivada, al editar solo el estado es editable.
  const soloEstadoEditable = modoEdicion && !EDICION_COMPLETA_PEDIDO;


  // =====================================================
  // COMPROBANTES DE PAGO
  // =====================================================

  const [mostrarComprobante, setMostrarComprobante] =
    useState(false);

  const [pedidoComprobante, setPedidoComprobante] =
    useState(null);

  const [comprobantes, setComprobantes] =
    useState([]);

  const [cargandoComprobantes, setCargandoComprobantes] =
    useState(false);

  const [errorComprobantes, setErrorComprobantes] =
    useState("");

  const [lightboxComprobante, setLightboxComprobante] =
    useState(null);

  // Existencias por pedido para habilitar/deshabilitar el icono de la tabla.
  // undefined = sin consultar, null = error, array = historial real.
  const [comprobantesPorPedido, setComprobantesPorPedido] =
    useState({});

  const [confirmarAprobarComprobante, setConfirmarAprobarComprobante] =
    useState(false);

  const [mostrarRechazoComprobante, setMostrarRechazoComprobante] =
    useState(false);

  const [motivoRechazo, setMotivoRechazo] =
    useState("");

  const [errorMotivoRechazo, setErrorMotivoRechazo] =
    useState("");

  const [comprobanteEnProceso, setComprobanteEnProceso] =
    useState(false);

  const comprobantesSolicitadosRef = useRef(
    new Set()
  );


  // =====================================================
  // CARGA DE PEDIDOS DESDE EL BACKEND
  // =====================================================

  const [conSaldo, setConSaldo] = useState(false);

  const refrescarPedidos = async () => {

    const respuesta = await obtenerPedidos(
      conSaldo ? { con_saldo: 1 } : {}
    );

    setPedidos((respuesta || []).map(mapearPedidoBackend));

    setErrorPedidos("");

  };


  useEffect(() => {
    let activo = true;

    obtenerPedidos(conSaldo ? { con_saldo: 1 } : {})
      .then((respuesta) => {
        if (!activo) return;
        setPedidos((respuesta || []).map(mapearPedidoBackend));
        setErrorPedidos("");
      })
      .catch((error) => {
        if (!activo) return;
        setErrorPedidos(error?.message || "No se pudieron cargar los pedidos");
      })
      .finally(() => {
        if (activo) setCargandoPedidos(false);
      });

    return () => {
      activo = false;
    };
  }, [conSaldo]);


  // =========================================================
  // DROPDOWN CAMBIAR ESTADO
  // =========================================================

  const [estadoAbiertoId, setEstadoAbiertoId] =
    useState(null);

  const [menuPos, setMenuPos] = useState({
    top: 0,
    left: 0
  });


  // =====================================================
  // ABONOS
  // =====================================================

  const [mostrarAbonos, setMostrarAbonos] =
    useState(false);

  const [pedidoAbonos, setPedidoAbonos] =
    useState(null);

  // Historial real de pagos del pedido en el detalle
  // (GET /api/pedidos/:id/abonos, el más reciente primero).
  const [pagosDetalle, setPagosDetalle] =
    useState([]);

  const [cargandoPagos, setCargandoPagos] =
    useState(false);

  const [errorPagos, setErrorPagos] =
    useState("");

  const [mostrarFormularioAbono, setMostrarFormularioAbono] =
    useState(false);

  const [formularioAbono, setFormularioAbono] =
    useState({
      monto: "",
      metodo: "Efectivo",
      referencia: "",
      observacion: ""
    });

  const [erroresAbono, setErroresAbono] =
    useState({});

  const [enviandoAbono, setEnviandoAbono] =
    useState(false);

  const [montoMinimoAbono, setMontoMinimoAbono] =
    useState(1);


  // =====================================================
  // FORMULARIO
  // =====================================================

  const [formulario, setFormulario] = useState({
    id: "",
    idCliente: "",
    cliente: "",
    fecha: "2026-09-07",
    estado: "Registrado",
    metodoPago: "Transferencia",
    direccion: "",
    productos: []
  });

  const [errores, setErrores] = useState({});


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


  // =====================================================
  // FORMATEAR FECHA Y HORA
  // =====================================================

  const formatearFechaHora = (fecha) => {

    if (!fecha) return "—";

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
      return String(fecha);
    }

    return valor.toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short"
    });

  };


  // =====================================================
  // ABONOS DE UN PEDIDO
  // =====================================================

  const obtenerAbonos = (pedido) =>
    pedido?.abonos || [];


  const totalAbonadoPedido =
    obtenerAbonos(pedidoAbonos).reduce(
      (suma, abono) =>
        suma + Number(abono.valor),
      0
    );


  const saldoPendientePedido =
    (pedidoAbonos
      ? Number(pedidoAbonos.total)
      : 0) - totalAbonadoPedido;


  // =====================================================
  // CLIENTES DISPONIBLES
  // =====================================================

  const clientesDisponibles = [
    ...new Map(
      pedidos.map((pedido) => [
        pedido.idCliente,
        {
          id: pedido.idCliente,
          nombre: pedido.cliente
        }
      ])
    ).values()
  ];


  // =====================================================
  // FILTRAR PEDIDOS
  // =====================================================

  const pedidosFiltrados = pedidos.filter(
    (pedido) => {

      if (
        vendedorId &&
        pedido.vendedor_id !== vendedorId
      ) {
        return false;
      }

      const texto =
        busqueda
          .toLowerCase()
          .trim();

      const coincideBusqueda =
        pedido.id
          .toLowerCase()
          .includes(texto) ||

        pedido.cliente
          .toLowerCase()
          .includes(texto) ||

        pedido.idCliente
          .toLowerCase()
          .includes(texto);


      return (
        coincideBusqueda
      );

    }
  );


  // =====================================================
  // PAGINACIÓN DE LA TABLA
  // =====================================================

  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(pedidosFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const paginaActualVisible = Math.min(
    paginaActual,
    totalPaginas
  );

  const inicio =
    (paginaActualVisible - 1) * REGISTROS_POR_PAGINA;
  const pedidosPaginados = pedidosFiltrados.slice(
    inicio,
    inicio + REGISTROS_POR_PAGINA
  );


  // =========================================================
  // PRECARGA DE COMPROBANTES DE LOS PEDIDOS VISIBLES
  // =========================================================

  // GET /api/pedidos no incluye si hay comprobante, así que se consulta el
  // historial de las filas de la página para habilitar el icono correctamente.
  useEffect(() => {

    const pendientes = pedidosPaginados
      .map((pedido) => pedido.id)
      .filter(
        (id) =>
          comprobantesPorPedido[id] === undefined &&
          !comprobantesSolicitadosRef.current.has(id)
      );

    if (pendientes.length === 0) return undefined;

    let activo = true;

    for (const id of pendientes) {
      comprobantesSolicitadosRef.current.add(id);
    }

    Promise.all(
      pendientes.map(async (id) => {
        try {
          const historial =
            await obtenerComprobantesPedido(id);

          return [
            id,
            Array.isArray(historial) ? historial : []
          ];
        } catch {
          return [id, null];
        }
      })
    ).then((resultados) => {

      if (!activo) return;

      setComprobantesPorPedido((actual) => {

        const siguiente = { ...actual };

        for (const [id, historial] of resultados) {
          if (siguiente[id] === undefined) {
            siguiente[id] = historial;
          }
        }

        return siguiente;

      });

    });

    return () => {
      activo = false;
    };

  }, [pedidosPaginados, comprobantesPorPedido]);


  // Cierra el lightbox del comprobante con Esc.
  useEffect(() => {

    if (!lightboxComprobante) return undefined;

    const cerrarConEsc = (evento) => {

      if (evento.key === "Escape") {
        setLightboxComprobante(null);
      }

    };

    document.addEventListener("keydown", cerrarConEsc);

    return () => {
      document.removeEventListener("keydown", cerrarConEsc);
    };

  }, [lightboxComprobante]);


  // =========================================================
  // CERRAR DROPDOWN AL CLIC FUERA O AL HACER SCROLL
  // =========================================================

  useEffect(() => {

    const manejarClicFuera = (evento) => {

      if (
        evento.target.closest &&
        evento.target.closest(".pedido-estado-dropdown")
      ) {
        return;
      }

      setEstadoAbiertoId(null);

    };

    const cerrarPorScroll = () => {
      setEstadoAbiertoId(null);
    };

    document.addEventListener("click", manejarClicFuera);

    window.addEventListener("scroll", cerrarPorScroll, true);

    window.addEventListener("resize", cerrarPorScroll);

    return () => {

      document.removeEventListener("click", manejarClicFuera);

      window.removeEventListener("scroll", cerrarPorScroll, true);

      window.removeEventListener("resize", cerrarPorScroll);

    };

  }, []);


  // =====================================================
  // ABRIR AGREGAR
  // =====================================================

  const abrirAgregar = () => {

    const numero =
      String(
        pedidos.length + 1
      ).padStart(3, "0");


    setFormulario({

      id: `PED-${numero}`,

      idCliente: "",

      cliente: "",

      fecha: "2026-09-07",

      estado: "Registrado",

      metodoPago: "Transferencia",

      direccion: "",

      productos: []

    });


    setErrores({});

    setModoEdicion(false);

    setMostrarModal(true);

  };


  // =====================================================
  // ABRIR EDITAR
  // =====================================================

  const abrirEditar = (pedido) => {

    if (pedido.estado === "Entregado") {

      mostrarToast(
        "Los pedidos en estado Entregado no pueden ser modificados.",
        "error"
      );

      return;

    }


    setFormulario({

      id: pedido.id,

      idCliente: pedido.idCliente,

      cliente: pedido.cliente,

      fecha: pedido.fecha,

      estado: pedido.estado,

      metodoPago: pedido.metodoPago,

      direccion: pedido.direccion,

      productos: pedido.productos

    });


    setErrores({});

    setModoEdicion(true);

    setMostrarModal(true);

  };


  // =====================================================
  // CAMBIAR CAMPO
  // =====================================================

  const cambiarCampo = (
    campo,
    valor
  ) => {

    setFormulario(
      (actual) => ({
        ...actual,
        [campo]: valor
      })
    );

    if (String(valor).trim()) {
      setErrores(
        (actuales) => {
          if (!actuales[campo]) {
            return actuales;
          }

          const nuevos = { ...actuales };
          delete nuevos[campo];
          return nuevos;
        }
      );
    }

  };


  // =====================================================
  // AGREGAR PRODUCTO
  // =====================================================

  const agregarProducto = () => {

    const nuevoProducto = {

      nombre: "",

      cantidad: 1,

      talla: "",

      color: "",

      precio: 0

    };


    setFormulario(
      (actual) => ({
        ...actual,

        productos: [
          ...actual.productos,
          nuevoProducto
        ]

      })
    );

  };


  // =====================================================
  // ACTUALIZAR PRODUCTO
  // =====================================================

  const actualizarProducto = (
    index,
    campo,
    valor
  ) => {

    setFormulario(
      (actual) => ({
        ...actual,

        productos:
          actual.productos.map(
            (producto, i) =>
              i === index
                ? {
                    ...producto,
                    [campo]: valor
                  }
                : producto
          )

      })
    );

  };


  // =====================================================
  // ELIMINAR PRODUCTO
  // =====================================================

  const eliminarProducto = (index) => {

    setFormulario(
      (actual) => ({
        ...actual,

        productos:
          actual.productos.filter(
            (_, i) => i !== index
          )

      })
    );

  };


  // =====================================================
  // GUARDAR PEDIDO
  // =====================================================

  const guardarPedido = () => {

    const nuevosErrores = {};

    // Con la edición completa desactivada solo se cambia el estado: no se
    // validan (ni se envían) el resto de campos, que están en solo lectura.
    if (!soloEstadoEditable) {

      if (!formulario.idCliente) {
        nuevosErrores.idCliente = "Selecciona un cliente.";
      }

      if (!formulario.cliente) {
        nuevosErrores.cliente = "Selecciona un cliente válido.";
      }

      if (!formulario.fecha) {
        nuevosErrores.fecha = "Selecciona una fecha.";
      }

      if (!formulario.direccion) {
        nuevosErrores.direccion = "Este campo es obligatorio.";
      }

      const productoNombreLargo = formulario.productos.find(
        (producto) => producto.nombre.trim().length > 20
      );

      if (productoNombreLargo) {
        nuevosErrores.productos =
          "El nombre de cada producto no puede superar los 20 caracteres.";
      }

    }

    setErrores(nuevosErrores);

    if (
      Object.keys(nuevosErrores).length > 0
    ) {

      return;

    }


    const total =
      formulario.productos.reduce(
        (suma, producto) =>
          suma +
          Number(producto.precio) *
          Number(producto.cantidad),
        0
      );


    if (modoEdicion) {

      setConfirmarEdicion(true);

      return;

    } else {

      const nuevoPedido = {

        id: formulario.id,

        vendedor_id: vendedorId,

        idCliente:
          formulario.idCliente,

        cliente:
          formulario.cliente,

        fecha:
          formulario.fecha,

        estado:
          formulario.estado,

        metodoPago:
          formulario.metodoPago,

        direccion:
          formulario.direccion,

        productos:
          formulario.productos,

        total:
          total,

        abonos: []

      };


      setPedidos(
        (actuales) => [
          nuevoPedido,
          ...actuales
        ]
      );
      setBusqueda("");
      setPaginaActual(1);

      mostrarToast("Pedido creado con éxito");

    }


    cerrarModal();

  };


  const confirmarEdicionPedido = async () => {

    // Solo el estado es persistible en el backend. Si el estado no cambió no
    // se llama a la API; si cambió se actualiza y se refresca la fila.
    if (!EDICION_COMPLETA_PEDIDO) {

      const pedidoActual = pedidos.find(
        (pedido) => pedido.id === formulario.id
      );

      setConfirmarEdicion(false);

      if (pedidoActual && formulario.estado !== pedidoActual.estado) {
        await aplicarEstadoBackend(pedidoActual, formulario.estado);
      }

      cerrarModal();

      return;

    }

    const total =
      formulario.productos.reduce(
        (suma, producto) =>
          suma +
          Number(producto.precio) *
          Number(producto.cantidad),
        0
      );

    setPedidos(
      (actuales) =>
        actuales.map(
          (pedido) =>
            pedido.id === formulario.id
              ? {
                  ...pedido,
                  idCliente:
                    formulario.idCliente,
                  cliente:
                    formulario.cliente,
                  fecha:
                    formulario.fecha,
                  estado:
                    formulario.estado,
                  metodoPago:
                    formulario.metodoPago,
                  direccion:
                    formulario.direccion,
                  productos:
                    formulario.productos,
                  total:
                    total ||
                    pedido.total
                }
              : pedido
        )
    );

    setConfirmarEdicion(false);

    cerrarModal();

  };


  // =====================================================
  // AVANZAR ESTADO
  // =====================================================

  // Persiste el nuevo estado en el backend y refresca la fila.
  const aplicarEstadoBackend = async (
    pedido,
    nuevoEstado,
    mensajeExito = "Estado actualizado con éxito"
  ) => {

    try {

      const actualizado = await cambiarEstadoPedidoApi(
        pedido.id,
        nuevoEstado
      );

      setPedidos((prev) =>
        prev.map((item) =>
          item.id === pedido.id
            ? mapearPedidoBackend(actualizado)
            : item
        )
      );

      mostrarToast(mensajeExito);

    } catch (error) {

      mostrarToast(
        error?.message || "No se pudo cambiar el estado",
        "error"
      );

    }

  };


  const actualizarPedidoEnPantalla = (actualizado) => {
    const mapeado = mapearPedidoBackend(actualizado);

    setPedidos((prev) =>
      prev.map((item) =>
        item.id === mapeado.id ? mapeado : item
      )
    );

    setPedidoSeleccionado((prev) =>
      prev && prev.id === mapeado.id ? mapeado : prev
    );

    setPedidoAbonos((prev) =>
      prev && prev.id === mapeado.id ? mapeado : prev
    );
  };


  const ejecutarAccionPago = async () => {
    if (!pedidoPagoAccion) return;

    const { pedido, accion } = pedidoPagoAccion;

    setPedidoPagoAccion(null);
    setPagoEnProceso(true);

    try {
      const actualizado =
        accion === "confirmar"
          ? await confirmarPagoPedido(pedido.id)
          : await rechazarPagoPedido(pedido.id);

      actualizarPedidoEnPantalla(actualizado);

      mostrarToast(
        accion === "confirmar"
          ? "Pago confirmado con éxito"
          : "Pago rechazado"
      );
    } catch (error) {
      mostrarToast(
        error?.message || "No se pudo actualizar el pago",
        "error"
      );
    } finally {
      setPagoEnProceso(false);
    }
  };


  // =========================================================
  // CANCELAR PEDIDO
  // =========================================================

  const cancelarPedido = (pedido) => {

    if (pedido.estado === "Entregado" || pedido.estado === "Cancelado") {
      mostrarToast(
        pedido.estado === "Cancelado"
          ? "Este pedido ya está cancelado."
          : "No se puede cancelar un pedido que ya fue entregado.",
        "error"
      );
      return;
    }
    setPedidoACancelar(pedido);
  };


  // Ejecuta la cancelación real cuando el usuario confirma en la tarjeta.
  const confirmarCancelarPedido = async () => {
    if (!pedidoACancelar) return;

    const pedido = pedidoACancelar;

    setPedidoACancelar(null);

    await aplicarEstadoBackend(
      pedido,
      "Cancelado",
      "Pedido cancelado correctamente."
    );
  };


  // =========================================================
  // ABRIR DROPDOWN CAMBIAR ESTADO
  // =========================================================

  const abrirCambiarEstado = (pedido, evento) => {

    evento.stopPropagation();

    if (estadoAbiertoId === pedido.id) {

      setEstadoAbiertoId(null);

      return;

    }

    const rect =
      evento.currentTarget.getBoundingClientRect();

    setMenuPos({
      top: rect.bottom + 6,
      left: Math.max(10, rect.right - 170)
    });

    setEstadoAbiertoId(pedido.id);

  };


  // =========================================================
  // CAMBIAR ESTADO DESDE EL DROPDOWN
  // =========================================================

  const cambiarEstadoPedido = (pedido, nuevoEstado) => {

    setEstadoAbiertoId(null);

    if (nuevoEstado === pedido.estado) {

      return;

    }

    if (nuevoEstado === "Cancelado") {

      cancelarPedido(pedido);

      return;

    }

    aplicarEstadoBackend(pedido, nuevoEstado);

  };


  // =========================================================
  // COMPROBANTES DE PAGO
  // =========================================================

  const pedidoTieneComprobante = (id) => {
    const historial = comprobantesPorPedido[id];

    return (
      Array.isArray(historial) &&
      historial.length > 0
    );
  };


  const comprobanteConsultado = (id) =>
    comprobantesPorPedido[id] !== undefined;


  const abrirComprobante = async (pedido) => {

    if (lightboxComprobante?.url) {
      URL.revokeObjectURL(lightboxComprobante.url);
    }

    setLightboxComprobante(null);
    setMostrarComprobante(true);
    setPedidoComprobante(pedido);
    setComprobantes([]);
    setErrorComprobantes("");
    setConfirmarAprobarComprobante(false);
    setMostrarRechazoComprobante(false);
    setMotivoRechazo("");
    setErrorMotivoRechazo("");
    setCargandoComprobantes(true);

    try {

      const historial =
        await obtenerComprobantesPedido(pedido.id);

      const lista = Array.isArray(historial)
        ? historial
        : [];

      setComprobantes(lista);

      setComprobantesPorPedido((actual) => ({
        ...actual,
        [pedido.id]: lista
      }));

    } catch (error) {

      setErrorComprobantes(
        error?.message ||
          "No se pudo cargar el historial de comprobantes"
      );

      setComprobantesPorPedido((actual) => ({
        ...actual,
        [pedido.id]: null
      }));

    } finally {

      setCargandoComprobantes(false);

    }

  };


  const cerrarComprobante = () => {

    if (lightboxComprobante?.url) {
      URL.revokeObjectURL(lightboxComprobante.url);
    }

    setMostrarComprobante(false);
    setPedidoComprobante(null);
    setComprobantes([]);
    setErrorComprobantes("");
    setConfirmarAprobarComprobante(false);
    setMostrarRechazoComprobante(false);
    setMotivoRechazo("");
    setErrorMotivoRechazo("");
    setLightboxComprobante(null);

  };


  const mensajeErrorComprobante = (error) => {

    if (error?.status === 403) {
      return "No tienes permisos para revisar comprobantes.";
    }

    if (error?.status === 409) {
      return (
        error?.message ||
        "El comprobante ya fue revisado por otro usuario."
      );
    }

    return (
      error?.message ||
      "No se pudo procesar el comprobante."
    );

  };


  const quitarComprobantesDelPedido = (pedidoId) => {

    comprobantesSolicitadosRef.current.delete(pedidoId);

    setComprobantesPorPedido((actual) => {

      const siguiente = { ...actual };

      delete siguiente[pedidoId];

      return siguiente;

    });

  };


  const ejecutarAprobarComprobante = async () => {

    if (!pedidoComprobante) return;

    const comprobante = comprobantes[0];

    if (!comprobante || comprobante.estado !== "Pendiente") {
      return;
    }

    const pedidoId = pedidoComprobante.id;

    setConfirmarAprobarComprobante(false);
    setComprobanteEnProceso(true);

    try {

      const respuesta =
        await aprobarComprobantePedido(
          pedidoId,
          comprobante.id
        );

      try {
        await refrescarPedidos();
      } catch {
        // La decisión ya quedó guardada; el fallo de recarga no la revierte.
      }

      quitarComprobantesDelPedido(pedidoId);

      cerrarComprobante();

      if (respuesta?.correo_enviado === false) {
        mostrarToast(
          "Comprobante aprobado. La acción se guardó, pero el correo al cliente no salió.",
          "error"
        );
      } else {
        mostrarToast("Comprobante aprobado con éxito");
      }

    } catch (error) {

      mostrarToast(
        mensajeErrorComprobante(error),
        "error"
      );

    } finally {

      setComprobanteEnProceso(false);

    }

  };


  const abrirRechazoComprobante = () => {

    setMostrarRechazoComprobante(true);
    setMotivoRechazo("");
    setErrorMotivoRechazo("");

  };


  const ejecutarRechazarComprobante = async () => {

    if (!pedidoComprobante) return;

    const comprobante = comprobantes[0];

    if (!comprobante || comprobante.estado !== "Pendiente") {
      return;
    }

    const motivo = motivoRechazo.trim();

    if (motivo.length < 5 || motivo.length > 300) {

      setErrorMotivoRechazo(
        "El motivo debe tener entre 5 y 300 caracteres."
      );

      return;

    }

    const pedidoId = pedidoComprobante.id;

    setComprobanteEnProceso(true);

    try {

      const respuesta =
        await rechazarComprobantePedido(
          pedidoId,
          comprobante.id,
          motivo
        );

      try {
        await refrescarPedidos();
      } catch {
        // La decisión ya quedó guardada; el fallo de recarga no la revierte.
      }

      quitarComprobantesDelPedido(pedidoId);

      cerrarComprobante();

      if (respuesta?.correo_enviado === false) {
        mostrarToast(
          "Comprobante rechazado. La acción se guardó, pero el correo al cliente no salió.",
          "error"
        );
      } else {
        mostrarToast("Comprobante rechazado");
      }

    } catch (error) {

      if (error?.campo === "motivo") {
        setErrorMotivoRechazo(
          error?.message ||
            "El motivo del rechazo no es válido."
        );
      } else {
        mostrarToast(
          mensajeErrorComprobante(error),
          "error"
        );
      }

    } finally {

      setComprobanteEnProceso(false);

    }

  };


  // =====================================================
  // VER DETALLE
  // =====================================================

  const verDetalle = (pedido) => {

    setPedidoSeleccionado(pedido);

    setPagosDetalle([]);
    setErrorPagos("");
    setCargandoPagos(true);

    setMostrarFormularioAbono(false);
    setFormularioAbono({
      monto: "",
      metodo: "Efectivo",
      referencia: "",
      observacion: ""
    });
    setErroresAbono({});
    setEnviandoAbono(false);

    obtenerConfiguracionAbonos()
      .then((respuesta) => {
        setMontoMinimoAbono(
          Number(
            respuesta?.monto_minimo ??
              respuesta?.montoMinimo ??
              1
          ) || 1
        );
      })
      .catch(() => {});

    setMostrarDetalle(true);

  };


  const generarClaveIdempotenciaAbono = () => {
    if (crypto?.randomUUID) {
      return crypto.randomUUID().slice(0, 80);
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  };

  const parsearMontoAbono = (valor) => {
    const numero = Number(String(valor).replace(",", "."));
    return Number.isFinite(numero) ? numero : 0;
  };

  const enviarAbonoDetalle = async () => {
    if (enviandoAbono || !pedidoSeleccionado) return;

    const monto = parsearMontoAbono(formularioAbono.monto);
    const nuevosErrores = {};

    if (!monto || monto <= 0) {
      nuevosErrores.monto = "Escribe el monto del abono.";
    } else if (montoMinimoAbono > 0 && monto < montoMinimoAbono) {
      nuevosErrores.monto = `El monto debe ser al menos ${formatearPrecio(montoMinimoAbono)}.`;
    } else if (monto > pedidoSeleccionado.saldo) {
      nuevosErrores.monto = `El abono no puede superar el saldo pendiente (${formatearPrecio(pedidoSeleccionado.saldo)}).`;
    }

    setErroresAbono(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviandoAbono(true);

    try {
      const respuesta = await registrarAbonoPedido(pedidoSeleccionado.id, {
        monto,
        metodo: formularioAbono.metodo,
        referencia: formularioAbono.referencia.trim(),
        observacion: formularioAbono.observacion.trim(),
        claveIdempotencia: generarClaveIdempotenciaAbono()
      });

      mostrarToast("Abono registrado con éxito");

      setMostrarFormularioAbono(false);
      setFormularioAbono({
        monto: "",
        metodo: "Efectivo",
        referencia: "",
        observacion: ""
      });
      setErroresAbono({});

      const totales = respuesta?.pedido || null;
      const totalAbonado = Number(totales?.total_abonado);
      const saldoPendiente = Number(totales?.saldo_pendiente);
      const estadoMontoCrudo = totales?.estado_monto;
      const estadoMonto = estadoMontoCrudo
        ? ({
            "Pendiente de pago": "Pendiente",
            "Abono parcial": "Pago parcial",
            Pagado: "Pagado"
          }[estadoMontoCrudo] || estadoMontoCrudo)
        : respuesta?.saldo_pendiente <= 0
          ? "Pagado"
          : "Pago parcial";

      setPedidoSeleccionado((actual) => {
        if (!actual) return actual;
        return {
          ...actual,
          totalPagado: Number.isFinite(totalAbonado)
            ? totalAbonado
            : actual.totalPagado,
          saldo: Number.isFinite(saldoPendiente)
            ? saldoPendiente
            : Math.max(0, actual.total - actual.totalPagado),
          estadoPagoEtiqueta: estadoMonto
        };
      });

      setPedidos((actuales) =>
        actuales.map((pedido) =>
          pedido.id === String(pedidoSeleccionado.id)
            ? {
                ...pedido,
                totalPagado: Number.isFinite(totalAbonado)
                  ? totalAbonado
                  : pedido.totalPagado,
                saldo: Number.isFinite(saldoPendiente)
                  ? saldoPendiente
                  : pedido.saldo,
                estadoPagoEtiqueta: estadoMonto
              }
            : pedido
        )
      );

      try {
        const historial = await obtenerAbonosPedido(pedidoSeleccionado.id);
        setPagosDetalle(
          Array.isArray(historial?.abonos) ? historial.abonos : []
        );
      } catch {
        // El abono ya quedó guardado; el fallo de recarga no lo revierte.
      }
    } catch (error) {
      mostrarToast(
        error?.message || "No se pudo registrar el abono",
        "error"
      );
    } finally {
      setEnviandoAbono(false);
    }
  };

  /* =====================================================
     CARGAR PAGOS DEL PEDIDO EN EL DETALLE
     ===================================================== */

  useEffect(() => {

    if (!mostrarDetalle || !pedidoSeleccionado?.id) {
      return undefined;
    }

    let activo = true;

    obtenerAbonosPedido(pedidoSeleccionado.id)
      .then((respuesta) => {
        if (!activo) return;
        setPagosDetalle(
          Array.isArray(respuesta?.abonos) ? respuesta.abonos : []
        );
        setCargandoPagos(false);
      })
      .catch((error) => {
        if (!activo) return;
        setPagosDetalle([]);
        setErrorPagos(
          error?.message || "No se pudo cargar el historial de pagos"
        );
        setCargandoPagos(false);
      });

    return () => {
      activo = false;
    };

  }, [mostrarDetalle, pedidoSeleccionado]);


  // =====================================================
  // CERRAR MODAL
  // =====================================================

  const cerrarModal = () => {

    setMostrarModal(false);

    setModoEdicion(false);

  };


  // =====================================================
  // CERRAR DETALLE
  // =====================================================

  const cerrarDetalle = () => {

    setMostrarDetalle(false);

    setPedidoSeleccionado(null);

  };


  // =====================================================
  // VER ABONOS
  // =====================================================

  const verAbonos = (pedido) => {

    setPedidoAbonos(pedido);

    setMostrarAbonos(true);

  };


  // =====================================================
  // CERRAR ABONOS
  // =====================================================

  const cerrarAbonos = () => {

    setMostrarAbonos(false);

    setPedidoAbonos(null);

  };


  // =====================================================
  // RENDER
  // =====================================================

  const ultimoComprobante = comprobantes[0] || null;

  const comprobantePendiente =
    ultimoComprobante?.estado === "Pendiente";


  return (

    <div className="pedidos-page">


      {/* =================================================
          ENCABEZADO
      ================================================= */}

      <div className="pedidos-header">

        <div className="pedidos-title">

          <h2>
            Pedidos
          </h2>

          <p>
            Gestiona y controla los pedidos realizados por los clientes.
          </p>

        </div>


        <div className="pedidos-actions">


          {/* BUSCADOR */}

          {puedeConsultar && (

          <div className="pedidos-search">

            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar pedidos..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
            />

          </div>

          )}


          {/* FILTRO CON SALDO */}

          {puedeConsultar && (

          <button
            type="button"
            className={
              "pedidos-filter-button" +
              (conSaldo ? " activo" : "")
            }
            onClick={() =>
              setConSaldo((valor) => !valor)
            }
          >
            Con saldo
          </button>

          )}

          {/* AGREGAR */}

          {puedeCrear && (

          <button
            type="button"
            className="pedidos-add-button"
            onClick={abrirAgregar}
          >

            <Plus size={18} />

            Registrar pedido

          </button>

          )}

        </div>

      </div>


      {/* =================================================
          TABLA
      ================================================= */}

      <div className="pedidos-table-container">

        <table className="pedidos-table">

          <thead>

            <tr>

              <th>ID PEDIDO</th>

              <th>CLIENTE</th>

              <th>MODALIDAD</th>

              <th>TOTAL</th>

              <th>ABONADO</th>

              <th>SALDO</th>

              <th>ESTADO</th>

              <th>ESTADO DEL PAGO</th>

              <th>ACCIONES</th>

            </tr>

          </thead>


          <tbody>

            {pedidosPaginados.map(
              (pedido) => (

                <tr key={pedido.id}>


                  <td>

                    <strong className="pedido-id">

                      {pedido.id}

                    </strong>

                  </td>


                  <td>

                    <span className="pedido-cliente">

                      {pedido.cliente}

                    </span>

                  </td>


                  <td>

                    <span className="pedido-modalidad">

                      {pedido.modalidad}

                    </span>

                  </td>


                  <td>

                    <div className="pedido-total-cell">

                      <strong className="pedido-total">

                        {formatearPrecio(
                          pedido.total
                        )}

                      </strong>

                      {pedido.estadoPago !== "No aplica" && (
                        <span
                          className={`pedido-pago-badge ${claseEstadoPago(
                            pedido.estadoPago
                          )}`}
                        >
                          {pedido.estadoPago}
                        </span>
                      )}

                    </div>

                  </td>


                  <td>

                    <strong className="pedido-abonado">

                      {formatearPrecio(
                        pedido.totalPagado
                      )}

                    </strong>

                  </td>


                  <td>

                    <strong className="pedido-saldo">

                      {formatearPrecio(
                        pedido.saldo
                      )}

                    </strong>

                  </td>


                  <td>

                    <div
                      className="pedido-estado-cell"
                    >

                      <span
                        className={
                          pedido.estado ===
                          "Entregado"

                            ? "pedido-estado entregado"

                            : pedido.estado ===
                              "Despachado"

                            ? "pedido-estado despachado"

                            : pedido.estado ===
                              "En preparación"

                            ? "pedido-estado preparacion"

                            : pedido.estado ===
                              "Cancelado"

                            ? "pedido-estado cancelado"

                            : "pedido-estado registrado"
                        }
                      >

                        {pedido.estado}

                      </span>


                      {puedeCambiarEstado &&
                        SIGUIENTE_ESTADO[pedido.estado] && (

                        <button
                          type="button"
                          className={
                            "pedido-estado-toggle" +
                            (estadoAbiertoId ===
                            pedido.id
                              ? " abierto"
                              : "")
                          }
                          title="Siguiente estado"
                          onClick={(evento) =>
                            abrirCambiarEstado(
                              pedido,
                              evento
                            )
                          }
                        >

                          <ChevronDown size={14} />

                        </button>

                        )}


                      {(puedeCambiarEstado &&
                        SIGUIENTE_ESTADO[pedido.estado]) &&
                        estadoAbiertoId ===
                        pedido.id && (

                        <div
                          className="pedido-estado-dropdown"
                          style={{
                            top: menuPos.top,
                            left: menuPos.left
                          }}
                        >

                          {[
                            pedido.estado,
                            SIGUIENTE_ESTADO[pedido.estado]
                          ].map(
                            (estado) => (
                              <button
                                key={estado}
                                type="button"
                                className={
                                  "pedido-estado-option " +
                                  claseEstado(estado) +
                                  (estado ===
                                  pedido.estado
                                    ? " activo"
                                    : "")
                                }
                                onClick={() =>
                                  cambiarEstadoPedido(
                                    pedido,
                                    estado
                                  )
                                }
                              >

                                {estado}

                              </button>
                            )
                          )}

                        </div>

                      )}

                    </div>

                  </td>


                  <td>

                    <span
                      className={`pedido-estado-pago ${claseEstadoPagoMonto(
                        pedido.estadoPagoEtiqueta
                      )}`}
                    >
                      {pedido.estadoPagoEtiqueta}
                    </span>

                  </td>


                  <td>

                    <div className="pedido-actions">


                      {/* VER */}

                      {puedeConsultar && (

                      <button
                        type="button"
                        title="Ver pedido"
                        onClick={() =>
                          verDetalle(
                            pedido
                          )
                        }
                      >

                        <Eye size={18} />

                      </button>

                      )}


                      {/* COMPROBANTE */}

                      {puedeConsultar && (

                      <button
                        type="button"
                        title={
                          !comprobanteConsultado(
                            pedido.id
                          )
                            ? "Comprobando comprobante..."
                            : pedidoTieneComprobante(
                                pedido.id
                              )
                              ? "Ver comprobante"
                              : "Sin comprobante"
                        }
                        className={
                          pedidoTieneComprobante(
                            pedido.id
                          )
                            ? ""
                            : "disabled"
                        }
                        onClick={() => {
                          if (
                            pedidoTieneComprobante(
                              pedido.id
                            )
                          ) {
                            abrirComprobante(
                              pedido
                            );
                          } else {
                            mostrarToast(
                              "Este pedido aún no tiene un comprobante adjunto",
                              "error"
                            );
                          }
                        }}
                      >

                        <FileImage size={18} />

                      </button>

                      )}


                      {/* ABONOS */}

                      {puedeConsultar && (

                      <button
                        type="button"
                        title="Ver abonos"
                        onClick={() =>
                          verAbonos(
                            pedido
                          )
                        }
                      >

                        <Receipt size={18} />

                      </button>

                      )}


                      {/* EDITAR */}

                        {puedeActualizar && (

                        <button
                          type="button"
                          title={
                            pedido.estado ===
                            "Entregado"
                              ? "Pedido entregado: no se puede modificar"
                              : "Actualizar pedido"
                          }
                          className={
                            pedido.estado ===
                            "Entregado"
                              ? "disabled"
                              : ""
                          }
                          onClick={() =>
                            abrirEditar(
                              pedido
                            )
                          }
                        >

                          <Pencil size={18} />

                        </button>

                        )}


                      {/* CANCELAR */}

                        {puedeCambiarEstado && (

                        <button
                          type="button"
                          className={
                            pedido.estado ===
                            "Entregado" ||
                            pedido.estado ===
                            "Cancelado"
                              ? "pedido-cancel-button disabled"
                              : "pedido-cancel-button"
                          }
                          title={
                            pedido.estado ===
                            "Entregado"
                              ? "Pedido entregado: no se puede cancelar"
                              : pedido.estado ===
                                "Cancelado"
                              ? "Este pedido ya está cancelado"
                              : "Cancelar pedido"
                          }
                          onClick={() =>
                            cancelarPedido(
                              pedido
                            )
                          }
                        >

                          <X size={18} />

                        </button>

                        )}


                    </div>

                  </td>

                </tr>

              )
            )}


            {pedidosFiltrados.length === 0 && (

              <tr>

                <td
                  colSpan="5"
                  className="pedidos-empty"
                >

                  {cargandoPedidos
                    ? "Cargando pedidos..."
                    : errorPedidos
                      ? errorPedidos
                      : "Pedido no encontrado en el sistema."}

                </td>

              </tr>

            )}

          </tbody>

        </table>

        <Pagination
          currentPage={paginaActualVisible}
          totalPages={totalPaginas}
          onPageChange={setPaginaActual}
        />

      </div>


      {/* =================================================
          MODAL AGREGAR / EDITAR
      ================================================= */}

       {mostrarModal && (

        <div className="pedido-modal-overlay pedido-modal-overlay--registro">

          <div className="pedido-modal pedido-modal--registro">


            <div className="pedido-modal-header">

              <h3>

                {modoEdicion
                  ? "Actualizar Pedido"
                  : "Registrar Pedido"}

              </h3>


              <button
                type="button"
                className="pedido-modal-close"
                onClick={cerrarModal}
              >

                <X size={21} />

              </button>

            </div>


            <div className="pedido-modal-body">


              {/* ESTADO */}

              <div className="pedido-form-row">

                <div className="pedido-form-group">

                  <label>
                    ESTADO
                  </label>

                  <select
                    value={
                      formulario.estado
                    }
                    disabled={modoEdicion && !puedeCambiarEstado}
                    onChange={(e) =>
                      cambiarCampo(
                        "estado",
                        e.target.value
                      )
                    }
                  >

                    <option value="Registrado">
                      Registrado
                    </option>

                    <option value="En preparación">
                      En preparación
                    </option>

                    <option value="Despachado">
                      Despachado
                    </option>

                    <option value="Entregado">
                      Entregado
                    </option>

                    <option value="Cancelado">
                      Cancelado
                    </option>

                  </select>

                </div>

              </div>


              {/* ID CLIENTE + CLIENTE */}

              <div className="pedido-form-row">

                <div className="pedido-form-group">

                  <label>
                    ID CLIENTE
                  </label>

                  <select
                    value={
                      formulario.idCliente
                    }
                    className={`input ${errores.idCliente ? "input-error" : ""}`}
                    disabled={soloEstadoEditable}
                    onChange={(e) => {

                      const cliente =
                        clientesDisponibles.find(
                          (item) =>
                            item.id ===
                            e.target.value
                        );

                      setFormulario(
                        (actual) => ({
                          ...actual,

                          idCliente:
                            e.target.value,

                          cliente:
                            cliente
                              ? cliente.nombre
                              : ""
                        })
                      );

                      setErrores(
                        (actuales) => {
                          const nuevos = { ...actuales };
                          delete nuevos.idCliente;
                          delete nuevos.cliente;
                          return nuevos;
                        }
                      );

                    }}
                  >

                    <option value="">
                      Seleccionar cliente
                    </option>

                    {clientesDisponibles.map(
                      (cliente) => (

                        <option
                          key={cliente.id}
                          value={cliente.id}
                        >

                          {cliente.id}

                        </option>

                      )
                    )}

                  </select>

                  {errores.idCliente && (
                    <span className="error-text">
                      {errores.idCliente}
                    </span>
                  )}

                </div>


                <div className="pedido-form-group">

                  <label>
                    CLIENTE
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.cliente
                    }
                    readOnly
                    placeholder="Cliente"
                    className={`input ${errores.cliente ? "input-error" : ""}`}
                  />

                  {errores.cliente && (
                    <span className="error-text">
                      {errores.cliente}
                    </span>
                  )}

                </div>

              </div>


              {/* FECHA + MÉTODO */}

              <div className="pedido-form-row">

                <div className="pedido-form-group">

                  <label>
                    FECHA
                  </label>

                  <input
                    type="date"
                    value={
                      formulario.fecha
                    }
                    className={`input ${errores.fecha ? "input-error" : ""}`}
                    disabled={soloEstadoEditable}
                    onChange={(e) =>
                      cambiarCampo(
                        "fecha",
                        e.target.value
                      )
                    }
                  />

                  {errores.fecha && (
                    <span className="error-text">
                      {errores.fecha}
                    </span>
                  )}

                </div>


                <div className="pedido-form-group">

                  <label>
                    MÉTODO DE PAGO
                  </label>

                  <select
                    value={
                      formulario.metodoPago
                    }
                    disabled={soloEstadoEditable}
                    onChange={(e) =>
                      cambiarCampo(
                        "metodoPago",
                        e.target.value
                      )
                    }
                  >

                    <option value="Transferencia">
                      Transferencia
                    </option>

                    {/* Crédito se retiró del checkout: esta opción solo
                        aparece para seguir mostrando (en lectura) los
                        pedidos históricos creados con ese método. */}
                    {formulario.metodoPago === "Crédito" && (
                      <option value="Crédito">
                        Crédito
                      </option>
                    )}

                    <option value="Contra entrega">
                      Contra entrega
                    </option>

                  </select>

                </div>

              </div>


              {/* DIRECCIÓN */}

              <div className="pedido-form-group">

                <label>
                  DIRECCIÓN DE ENTREGA
                </label>

                <input
                  type="text"
                  placeholder="Dirección completa"
                  value={
                    formulario.direccion
                  }
                  className={`input ${errores.direccion ? "input-error" : ""}`}
                  readOnly={soloEstadoEditable}
                  onChange={(e) =>
                    cambiarCampo(
                      "direccion",
                      e.target.value
                    )
                  }
                />

                {errores.direccion && (
                  <span className="error-text">
                    {errores.direccion}
                  </span>
                )}

              </div>


              {/* DETALLES */}

              <div className="pedido-details-header">

                 <label>
                   Detalles del Pedido
                 </label>


                {!soloEstadoEditable && (

                   <button
                     type="button"
                     className="pedido-add-product"
                     onClick={agregarProducto}
                   >

                     Agregar producto
                   </button>

                )}

              </div>


              {errores.productos && (
                <span className="error-text">
                  {errores.productos}
                </span>
              )}

              {formulario.productos.length ===
                0 ? (

                <div className="pedido-no-products">

                  Sin detalles. Agrega un producto.

                </div>

              ) : (

                <div className="pedido-products-list">

                  {formulario.productos.map(
                    (producto, index) => (

                      <div
                        className="pedido-product-edit"
                        key={index}
                      >

                        <div className="pedido-product-edit-head">

                          <span className="pedido-product-edit-number">
                            Producto #{index + 1}
                          </span>

                          {!soloEstadoEditable && (

                            <button
                              type="button"
                              className="pedido-product-delete"
                              title="Eliminar producto"
                              onClick={() =>
                                eliminarProducto(
                                  index
                                )
                              }
                            >

                              <Trash2 size={16} />

                            </button>

                          )}

                        </div>


                        <div className="pedido-product-edit-fields">

                          <div className="pedido-product-edit-field nombre">

                            <label>
                              NOMBRE
                            </label>

                            <input
                              type="text"
                              value={
                                producto.nombre
                              }
                              maxLength={20}
                              placeholder="Nombre del producto"
                              readOnly={soloEstadoEditable}
                              onChange={(e) =>
                                actualizarProducto(
                                  index,
                                  "nombre",
                                  e.target.value.replace(
                                    /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
                                    ""
                                  )
                                )
                              }
                            />

                          </div>


                          <div className="pedido-product-edit-field">

                            <label>
                              CANTIDAD
                            </label>

                            <input
                              type="number"
                              min="1"
                              value={
                                producto.cantidad
                              }
                              readOnly={soloEstadoEditable}
                              onChange={(e) =>
                                actualizarProducto(
                                  index,
                                  "cantidad",
                                  e.target.value.replace(
                                    /[^0-9]/g,
                                    ""
                                  )
                                )
                              }
                            />

                          </div>


                          <div className="pedido-product-edit-field">

                            <label>
                              TALLA
                            </label>

                            <input
                              type="text"
                              value={
                                producto.talla
                              }
                              placeholder="Talla"
                              readOnly={soloEstadoEditable}
                              onChange={(e) =>
                                actualizarProducto(
                                  index,
                                  "talla",
                                  e.target.value
                                )
                              }
                            />

                          </div>


                          <div className="pedido-product-edit-field">

                            <label>
                              COLOR
                            </label>

                            <input
                              type="text"
                              value={
                                producto.color
                              }
                              placeholder="Color"
                              readOnly={soloEstadoEditable}
                              onChange={(e) =>
                                actualizarProducto(
                                  index,
                                  "color",
                                  e.target.value.replace(
                                    /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
                                    ""
                                  )
                                )
                              }
                            />

                          </div>


                          <div className="pedido-product-edit-field">

                            <label>
                              PRECIO (COP)
                            </label>

                            <input
                              type="number"
                              min="0"
                              value={
                                producto.precio
                              }
                              readOnly={soloEstadoEditable}
                              onChange={(e) =>
                                actualizarProducto(
                                  index,
                                  "precio",
                                  e.target.value
                                    .replace(
                                      /[^0-9.]/g,
                                      ""
                                    )
                                    .replace(
                                      /(\..*)\./g,
                                      "$1"
                                    )
                                )
                              }
                            />

                          </div>


                          <div className="pedido-product-edit-subtotal">

                            <label>
                              SUBTOTAL
                            </label>

                            <strong>

                              {formatearPrecio(
                                Number(
                                  producto.precio
                                ) *
                                Number(
                                  producto.cantidad
                                )
                              )}

                            </strong>

                          </div>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}


              {/* TOTAL */}

              <div className="pedido-total-box">

                <span>
                  Total
                </span>

                <strong>

                  {formatearPrecio(
                    formulario.productos.reduce(
                      (suma, producto) =>
                        suma +
                        Number(
                          producto.precio
                        ) *
                        Number(
                          producto.cantidad
                        ),
                      0
                    )
                  )}

                </strong>

              </div>


            </div>


            {/* FOOTER */}

            <div className="pedido-modal-footer">

              <button
                type="button"
                className="pedido-cancel-button"
                onClick={cerrarModal}
              >

                Cancelar

              </button>


              <button
                type="button"
                className="pedido-create-button"
                onClick={guardarPedido}
              >

                {modoEdicion
                  ? "Guardar cambios"
                  : "Crear pedido"}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          MODAL DETALLE
      ================================================= */}

      {mostrarDetalle &&
        pedidoSeleccionado && (
          <DetallePedido
            pedidoSeleccionado={pedidoSeleccionado}
            pagosDetalle={pagosDetalle}
            tienePermiso={tienePermiso}
            user={user}
            puedeCambiarEstado={puedeCambiarEstado}
            cerrarDetalle={cerrarDetalle}
            setPedidoPagoAccion={setPedidoPagoAccion}
            cargandoPagos={cargandoPagos}
            errorPagos={errorPagos}
            mostrarFormularioAbono={mostrarFormularioAbono}
            setMostrarFormularioAbono={setMostrarFormularioAbono}
            montoMinimoAbono={montoMinimoAbono}
            formularioAbono={formularioAbono}
            setFormularioAbono={setFormularioAbono}
            erroresAbono={erroresAbono}
            enviandoAbono={enviandoAbono}
            enviarAbonoDetalle={enviarAbonoDetalle}
            formatearPrecio={formatearPrecio}
            formatearFecha={formatearFecha}
            claseEstadoPago={claseEstadoPago}
            montoPagoEsperado={montoPagoEsperado}
          />
        )}
      {/* =================================================
          MODAL COMPROBANTE DE PAGO
      ================================================= */}

      {mostrarComprobante &&
        pedidoComprobante && (

        <div className="pedido-modal-overlay">

          <div className="pedido-modal pedido-comprobante-modal">

            <div className="pedido-modal-header">

              <h3>
                Comprobante de pago
              </h3>


              <button
                type="button"
                className="pedido-modal-close"
                onClick={cerrarComprobante}
              >

                <X size={21} />

              </button>

            </div>


            <div className="pedido-modal-body">


              {/* INFO DEL PEDIDO */}

              <div className="pedido-form-row">

                <div className="pedido-info-group">

                  <label>
                    CLIENTE
                  </label>

                  <div className="pedido-info-value">
                    {pedidoComprobante.cliente}
                  </div>

                </div>


                <div className="pedido-info-group">

                  <label>
                    NÚMERO DE PEDIDO
                  </label>

                  <div className="pedido-info-value">
                    {pedidoComprobante.id}
                  </div>

                </div>

              </div>


              <div className="pedido-form-row">

                <div className="pedido-info-group">

                  <label>
                    VALOR A PAGAR
                  </label>

                  <div className="pedido-info-value">
                    {formatearPrecio(
                      montoPagoEsperado(
                        pedidoComprobante
                      )
                    )}
                  </div>

                </div>


                <div className="pedido-info-group">

                  <label>
                    MÉTODO DE PAGO
                  </label>

                  <div className="pedido-info-value">
                    {pedidoComprobante.metodoPago}
                  </div>

                </div>

              </div>


              <div className="pedido-form-row">

                <div className="pedido-info-group">

                  <label>
                    FECHA DE CARGA
                  </label>

                  <div className="pedido-info-value">
                    {ultimoComprobante
                      ? formatearFechaHora(
                          ultimoComprobante.fecha_carga
                        )
                      : "—"}
                  </div>

                </div>


                <div className="pedido-info-group">

                  <label>
                    ESTADO DEL COMPROBANTE
                  </label>

                  <div className="pedido-info-value">

                    {ultimoComprobante ? (

                      <span
                        className={`pedido-comprobante-badge ${claseEstadoComprobante(
                          ultimoComprobante.estado
                        )}`}
                      >
                        {ultimoComprobante.estado}
                      </span>

                    ) : (
                      "—"
                    )}

                  </div>

                </div>

              </div>


              {/* ACCIONES */}

              {puedeActualizar &&
                comprobantePendiente && (

                <div className="pedido-comprobante-actions">

                  <button
                    type="button"
                    className="pedido-payment-confirm"
                    disabled={comprobanteEnProceso}
                    onClick={() =>
                      setConfirmarAprobarComprobante(
                        true
                      )
                    }
                  >
                    Aprobar comprobante
                  </button>

                  <button
                    type="button"
                    className="pedido-payment-reject"
                    disabled={comprobanteEnProceso}
                    onClick={abrirRechazoComprobante}
                  >
                    Rechazar comprobante
                  </button>

                </div>

              )}


              {mostrarRechazoComprobante && (

                <div className="pedido-comprobante-rechazo">

                  <label htmlFor="motivo-rechazo-comprobante">
                    MOTIVO DEL RECHAZO
                  </label>

                  <textarea
                    id="motivo-rechazo-comprobante"
                    value={motivoRechazo}
                    maxLength={300}
                    placeholder="Explica al cliente por qué se rechaza el comprobante (5 a 300 caracteres)."
                    onChange={(evento) => {
                      setMotivoRechazo(
                        evento.target.value
                      );

                      if (errorMotivoRechazo) {
                        setErrorMotivoRechazo("");
                      }
                    }}
                  />

                  <div className="pedido-comprobante-rechazo-footer">

                    <span className="pedido-comprobante-contador">
                      {motivoRechazo.trim().length}/300
                    </span>

                    {errorMotivoRechazo && (
                      <span className="error-text">
                        {errorMotivoRechazo}
                      </span>
                    )}

                    <button
                      type="button"
                      className="pedido-cancel-button"
                      disabled={comprobanteEnProceso}
                      onClick={() => {
                        setMostrarRechazoComprobante(
                          false
                        );
                        setErrorMotivoRechazo("");
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      className="pedido-payment-reject"
                      disabled={comprobanteEnProceso}
                      onClick={
                        ejecutarRechazarComprobante
                      }
                    >
                      Confirmar rechazo
                    </button>

                  </div>

                </div>

              )}


              {/* HISTORIAL */}

              <div className="pedido-detail-products">

                <label>
                  HISTORIAL DE COMPROBANTES
                </label>


                {cargandoComprobantes ? (

                  <div className="pedido-no-products">
                    Cargando historial...
                  </div>

                ) : errorComprobantes ? (

                  <div className="pedido-comprobante-error">
                    {errorComprobantes}
                  </div>

                ) : comprobantes.length === 0 ? (

                  <div className="pedido-no-products">
                    Sin comprobantes registrados.
                  </div>

                ) : (

                  <div className="pedido-comprobantes-list">

                    {comprobantes.map(
                      (comprobante) => (

                        <div
                          className="pedido-comprobante-item"
                          key={comprobante.id}
                        >

                          <ComprobanteMiniatura
                            pedidoId={pedidoComprobante.id}
                            comprobante={comprobante}
                            onAbrir={setLightboxComprobante}
                          />

                          <div className="pedido-comprobante-item-info">

                            <div className="pedido-comprobante-item-head">

                              <span
                                className={`pedido-comprobante-badge ${claseEstadoComprobante(
                                  comprobante.estado
                                )}`}
                              >
                                {comprobante.estado}
                              </span>

                              <strong>
                                Intento {comprobante.intento}
                              </strong>

                            </div>

                            <span>
                              {formatearFechaHora(
                                comprobante.fecha_carga
                              )}
                            </span>

                            {comprobante.motivo_rechazo && (
                              <p className="pedido-comprobante-motivo">
                                Motivo:{" "}
                                {comprobante.motivo_rechazo}
                              </p>
                            )}

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            </div>


            <div className="pedido-modal-footer">

              <button
                type="button"
                className="pedido-cancel-button detail-cerrar-button"
                onClick={cerrarComprobante}
              >

                Cerrar

              </button>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          LIGHTBOX DEL COMPROBANTE
      ================================================= */}

      {lightboxComprobante && (

        <div
          className="pedido-lightbox-overlay"
          onClick={() => setLightboxComprobante(null)}
        >

          <div
            className="pedido-lightbox"
            onClick={(evento) => evento.stopPropagation()}
          >

            <button
              type="button"
              className="pedido-lightbox-close"
              title="Cerrar"
              onClick={() => setLightboxComprobante(null)}
            >

              <X size={22} />

            </button>

            <img
              src={lightboxComprobante.url}
              alt={`Comprobante del intento ${lightboxComprobante.intento}`}
            />

          </div>

        </div>

      )}


      <ConfirmDialog
        abierto={confirmarEdicion}
        titulo="Confirmar cambios"
        mensaje={
          <>¿Deseas guardar los cambios realizados en el pedido "
            <strong>{formulario.id}</strong>"?</>
        }
        textoConfirmar="Guardar cambios"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEdicionPedido}
        onCancelar={() => setConfirmarEdicion(false)}
      />

      <ConfirmDialog
        abierto={!!pedidoACancelar}
        titulo="Cancelar pedido"
        mensaje={
          <>¿Deseas cancelar el pedido "
            <strong>{pedidoACancelar?.id}</strong>"? Se
            devolverá el stock de sus productos.</>
        }
        textoConfirmar="Sí, cancelar"
        textoCancelar="Volver"
        variante="peligro"
        onConfirmar={confirmarCancelarPedido}
        onCancelar={() => setPedidoACancelar(null)}
      />

      <ConfirmDialog
        abierto={!!pedidoPagoAccion}
        titulo={
          pedidoPagoAccion?.accion === "confirmar"
            ? "Confirmar pago"
            : "Rechazar pago"
        }
        mensaje={
          pedidoPagoAccion?.accion === "confirmar" ? (
            <>¿Confirmas que recibiste el pago del pedido{" "}
              <strong>{pedidoPagoAccion?.pedido.id}</strong> por{" "}
              <strong>
                {formatearPrecio(
                  montoPagoEsperado(pedidoPagoAccion?.pedido)
                )}
              </strong>? Se registrará en el historial del pedido.</>
          ) : (
            <>¿Deseas rechazar el pago del pedido{" "}
              <strong>{pedidoPagoAccion?.pedido.id}</strong>? No se
              registrará ningún pago.</>
          )
        }
        textoConfirmar={
          pedidoPagoAccion?.accion === "confirmar"
            ? "Sí, confirmar pago"
            : "Sí, rechazar pago"
        }
        textoCancelar="Volver"
        variante={
          pedidoPagoAccion?.accion === "confirmar"
            ? "info"
            : "peligro"
        }
        onConfirmar={ejecutarAccionPago}
        onCancelar={() => setPedidoPagoAccion(null)}
      />

      <ConfirmDialog
        abierto={confirmarAprobarComprobante}
        titulo="Aprobar comprobante"
        mensaje={
          <>¿Confirmas que el comprobante del pedido{" "}
            <strong>{pedidoComprobante?.id}</strong> es válido
            por{" "}
            <strong>
              {formatearPrecio(
                montoPagoEsperado(pedidoComprobante)
              )}
            </strong>
            ? Se registrará el pago y se avisará al cliente.</>
        }
        textoConfirmar="Sí, aprobar"
        textoCancelar="Volver"
        variante="info"
        onConfirmar={ejecutarAprobarComprobante}
        onCancelar={() =>
          setConfirmarAprobarComprobante(false)
        }
      />

      <Toast toast={toast} />

    </div>

  );

}