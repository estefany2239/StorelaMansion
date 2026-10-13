import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  ChevronDown,
  Pencil,
  X,
  Trash2,
  Receipt,
  Wallet
} from "lucide-react";

import "./Pedidos.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";

import {
  obtenerPedidos,
  cambiarEstadoPedido as cambiarEstadoPedidoApi
} from "../../../services/api";


const ESTADOS_PEDIDO = [
  "Registrado",
  "En preparación",
  "Despachado",
  "Entregado"
];

// El backend solo persiste el campo `estado` (PATCH /api/pedidos/:id/estado).
// Mientras esté en false, el modal de edición deja editable SOLO el estado y
// muestra el resto de campos en solo lectura, para no ofrecer cambios que el
// servidor ignora. Ponlo en true para reactivar la edición completa.
const EDICION_COMPLETA_PEDIDO = false;


// Convierte un pedido del backend a la forma que usa esta pantalla.
const mapearPedidoBackend = (pedido) => ({
  id: String(pedido.id),
  idCliente: `CLI-${pedido.id_usuario}`,
  cliente: pedido.cliente,
  clienteCorreo: pedido.cliente_correo,
  vendedor_id: undefined,
  fecha: pedido.fecha,
  total: Number(pedido.total) || 0,
  estado: pedido.estado,
  metodoPago: pedido.metodo_pago || "—",
  direccion: pedido.direccion || "",
  productos: (pedido.items || []).map((item) => ({
    nombre: item.nombre,
    cantidad: item.cantidad,
    talla: item.talla || "-",
    color: item.color || "-",
    precio: Number(item.precio_unitario) || 0
  })),
  abonos:
    Number(pedido.monto_pagado) > 0
      ? [
          {
            fecha: pedido.fecha,
            valor: Number(pedido.monto_pagado),
            metodoPago: pedido.metodo_pago
          }
        ]
      : []
});


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


export default function Pedidos({ vendedorId }) {

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

  const [pedidoEliminar, setPedidoEliminar] =
    useState(null);

  const [confirmarEdicion, setConfirmarEdicion] =
    useState(false);

  const { toast, mostrarToast } = useToast();

  // Con la edición completa desactivada, al editar solo el estado es editable.
  const soloEstadoEditable = modoEdicion && !EDICION_COMPLETA_PEDIDO;


  // =====================================================
  // CARGA DE PEDIDOS DESDE EL BACKEND
  // =====================================================

  useEffect(() => {
    let activo = true;

    obtenerPedidos()
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
  }, []);


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

  const [mostrarFormAbono, setMostrarFormAbono] =
    useState(false);

  const [formularioAbono, setFormularioAbono] =
    useState({
      fecha: "",
      valor: "",
      metodoPago: "Efectivo"
    });


  // =====================================================
  // FORMULARIO
  // =====================================================

  const [formulario, setFormulario] = useState({
    id: "",
    idCliente: "",
    cliente: "",
    fecha: "2026-09-07",
    estado: "Registrado",
    metodoPago: "Efectivo",
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

  const inicio =
    (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const pedidosPaginados = pedidosFiltrados.slice(
    inicio,
    inicio + REGISTROS_POR_PAGINA
  );

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);


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

      metodoPago: "Efectivo",

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

      alert(
        "Los pedidos en estado Entregado no pueden ser modificados."
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
  // ELIMINAR PEDIDO
  // =====================================================

  const eliminarPedido = (pedido) => {

    setPedidoEliminar(pedido);

  };

  const confirmarEliminarPedido = () => {

    setPedidos(
      (prev) =>
        prev.filter(
          (item) => item.id !== pedidoEliminar.id
        )
    );

    setPedidoEliminar(null);

  };


  // =====================================================
  // AVANZAR ESTADO
  // =====================================================

  // Persiste el nuevo estado en el backend y refresca la fila.
  const aplicarEstadoBackend = async (pedido, nuevoEstado) => {

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

      mostrarToast("Estado actualizado con éxito");

    } catch (error) {

      mostrarToast(
        error?.message || "No se pudo cambiar el estado",
        "error"
      );

    }

  };


  const avanzarEstado = async (id) => {

    const pedido = pedidos.find((item) => item.id === id);

    if (!pedido) return;

    const siguiente = {
      "Registrado": "En preparación",
      "En preparación": "Despachado",
      "Despachado": "Entregado"
    }[pedido.estado];

    if (!siguiente) return;

    await aplicarEstadoBackend(pedido, siguiente);

  };


  // =========================================================
  // CANCELAR PEDIDO
  // =========================================================

  const cancelarPedido = (pedido) => {
    if (pedido.estado === "Entregado" || pedido.estado === "Cancelado") {
      alert(
        pedido.estado === "Cancelado"
          ? "Este pedido ya está cancelado."
          : "No se puede cancelar un pedido que ya fue entregado."
      );
      return;
    }
    const confirmar = window.confirm(
      `¿Deseas cancelar el pedido "${pedido.id}"?`
    );
    if (!confirmar) return;
    aplicarEstadoBackend(pedido, "Cancelado");
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


  // =====================================================
  // VER DETALLE
  // =====================================================

  const verDetalle = (pedido) => {

    setPedidoSeleccionado(pedido);

    setMostrarDetalle(true);

  };


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

    setMostrarFormAbono(false);

    setMostrarAbonos(true);

  };


  // =====================================================
  // CERRAR ABONOS
  // =====================================================

  const cerrarAbonos = () => {

    setMostrarAbonos(false);

    setPedidoAbonos(null);

    setMostrarFormAbono(false);

  };


  // =====================================================
  // ABRIR FORMULARIO ABONO
  // =====================================================

  const abrirFormAbono = () => {

    setFormularioAbono({
      fecha: "2026-09-07",
      valor: "",
      metodoPago: "Efectivo"
    });

    setMostrarFormAbono(true);

  };


  // =====================================================
  // REGISTRAR ABONO
  // =====================================================

  const registrarAbono = () => {

    if (!pedidoAbonos) {
      return;
    }


    if (pedidoAbonos.estado === "Entregado") {

      alert(
        "Los pedidos en estado Entregado no pueden recibir abonos."
      );

      return;

    }


    const valor =
      Number(formularioAbono.valor);

    const abonado =
      obtenerAbonos(pedidoAbonos).reduce(
        (suma, abono) =>
          suma + Number(abono.valor),
        0
      );


    if (
      !formularioAbono.fecha ||
      !formularioAbono.valor ||
      isNaN(valor) ||
      valor <= 0
    ) {

      alert(
        "Ingresa un monto válido para el abono."
      );

      return;

    }


    if (
      valor >
      Number(pedidoAbonos.total) - abonado
    ) {

      alert(
        "El monto no puede superar el saldo pendiente del pedido."
      );

      return;

    }


    const nuevoAbono = {

      fecha:
        formularioAbono.fecha,

      valor,

      metodoPago:
        formularioAbono.metodoPago

    };


    setPedidos(
      (actuales) =>
        actuales.map(
          (pedido) =>
            pedido.id ===
            pedidoAbonos.id
              ? {
                  ...pedido,
                  abonos: [
                    ...obtenerAbonos(pedido),
                    nuevoAbono
                  ]
                }
              : pedido
        )
    );


    setPedidoAbonos(
      (actual) => ({
        ...actual,
        abonos: [
          ...obtenerAbonos(actual),
          nuevoAbono
        ]
      })
    );


    setMostrarFormAbono(false);

  };


  // =====================================================
  // RENDER
  // =====================================================

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

          <div className="pedidos-search">

            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar pedidos..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
            />

          </div>


          {/* AGREGAR */}

          <button
            type="button"
            className="pedidos-add-button"
            onClick={abrirAgregar}
          >

            <Plus size={18} />

            Registrar pedido

          </button>

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

              <th>TOTAL</th>

              <th>ESTADO</th>

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

                    <strong className="pedido-total">

                      {formatearPrecio(
                        pedido.total
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
                        onClick={() =>
                          avanzarEstado(
                            pedido.id
                          )
                        }
                      >

                        {pedido.estado}

                      </span>


                      {pedido.estado !== "Entregado" &&
                        pedido.estado !== "Cancelado" && (

                        <button
                          type="button"
                          className={
                            "pedido-estado-toggle" +
                            (estadoAbiertoId ===
                            pedido.id
                              ? " abierto"
                              : "")
                          }
                          title="Cambiar estado"
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


                      {(pedido.estado !== "Entregado" &&
                        pedido.estado !== "Cancelado") &&
                        estadoAbiertoId ===
                        pedido.id && (

                        <div
                          className="pedido-estado-dropdown"
                          style={{
                            top: menuPos.top,
                            left: menuPos.left
                          }}
                        >

                          {ESTADOS_PEDIDO.map(
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

                    <div className="pedido-actions">


                      {/* VER */}

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


                      {/* ABONOS */}

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


                      {/* EDITAR */}

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


                      {/* CANCELAR */}

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


                      {/* ELIMINAR */}

                        <button
                          type="button"
                          className="pedido-delete-button"
                          title="Eliminar pedido"
                          onClick={() =>
                            eliminarPedido(
                              pedido
                            )
                          }
                        >

                          <Trash2 size={18} />

                        </button>


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
          currentPage={paginaActual}
          totalPages={totalPaginas}
          onPageChange={setPaginaActual}
        />

      </div>


      {/* =================================================
          MODAL AGREGAR / EDITAR
      ================================================= */}

      {mostrarModal && (

        <div className="pedido-modal-overlay">

          <div className="pedido-modal">


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


              {/* ID + ESTADO */}

              <div className="pedido-form-row">

                <div className="pedido-form-group">

                  <label>
                    ID PEDIDO
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.id
                    }
                    disabled
                  />

                </div>


                <div className="pedido-form-group">

                  <label>
                    ESTADO
                  </label>

                  <select
                    value={
                      formulario.estado
                    }
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

                    <option value="Efectivo">
                      Efectivo
                    </option>

                    <option value="Transferencia">
                      Transferencia
                    </option>

                    <option value="Crédito">
                      Crédito
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
                  DETALLES DEL PEDIDO
                </label>


                {!soloEstadoEditable && (

                  <button
                    type="button"
                    className="pedido-add-product"
                    onClick={agregarProducto}
                  >

                    <Plus size={16} />

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

        <div className="pedido-modal-overlay">

          <div className="pedido-modal">


            <div className="pedido-modal-header">

              <h3>
                Detalle del Pedido
              </h3>


              <button
                type="button"
                className="pedido-modal-close"
                onClick={cerrarDetalle}
              >

                <X size={21} />

              </button>

            </div>


            <div className="pedido-modal-body">


              <div className="pedido-form-row">

                <div className="pedido-info-group">

                  <label>
                    ID PEDIDO
                  </label>

                  <div className="pedido-info-value">
                    {pedidoSeleccionado.id}
                  </div>

                </div>


                <div className="pedido-info-group">

                  <label>
                    ESTADO
                  </label>

                  <div className="pedido-info-value">

                    <span
                      className={
                        pedidoSeleccionado.estado ===
                        "Entregado"
                          ? "pedido-estado entregado"
                          : pedidoSeleccionado.estado ===
                            "Despachado"
                          ? "pedido-estado despachado"
                          : pedidoSeleccionado.estado ===
                            "En preparación"
                          ? "pedido-estado preparacion"
                          : pedidoSeleccionado.estado ===
                            "Cancelado"
                          ? "pedido-estado cancelado"
                          : "pedido-estado registrado"
                      }
                    >

                      {pedidoSeleccionado.estado}

                    </span>

                  </div>

                </div>

              </div>


              <div className="pedido-form-row">

                <div className="pedido-info-group">

                  <label>
                    ID CLIENTE
                  </label>

                  <div className="pedido-info-value">
                    {pedidoSeleccionado.idCliente}
                  </div>

                </div>


                <div className="pedido-info-group">

                  <label>
                    CLIENTE
                  </label>

                  <div className="pedido-info-value">
                    {pedidoSeleccionado.cliente}
                  </div>

                </div>

              </div>


              <div className="pedido-form-row">

                <div className="pedido-info-group">

                  <label>
                    FECHA
                  </label>

                  <div className="pedido-info-value">
                    {formatearFecha(
                      pedidoSeleccionado.fecha
                    )}
                  </div>

                </div>


                <div className="pedido-info-group">

                  <label>
                    MÉTODO DE PAGO
                  </label>

                  <div className="pedido-info-value">
                    {pedidoSeleccionado.metodoPago}
                  </div>

                </div>

              </div>


              <div className="pedido-info-group">

                <label>
                  DIRECCIÓN DE ENTREGA
                </label>

                <div className="pedido-info-value">
                  {pedidoSeleccionado.direccion}
                </div>

              </div>


              {/* PRODUCTOS */}

              <div className="pedido-detail-products">

                <label>
                  PRODUCTOS DEL PEDIDO
                </label>


                <div className="pedido-products-list">

                  {pedidoSeleccionado.productos.map(
                    (producto, index) => (

                      <div
                        className="pedido-product-item"
                        key={index}
                      >

                        <div>

                          <strong>
                            {producto.nombre}
                          </strong>

                          <span>

                            Cantidad:{" "}
                            {producto.cantidad}

                            {" · "}

                            Talla:{" "}
                            {producto.talla}

                            {" · "}

                            Color:{" "}
                            {producto.color}

                          </span>

                        </div>


                        <strong>

                          {formatearPrecio(
                            producto.precio *
                            producto.cantidad
                          )}

                        </strong>

                      </div>

                    )
                  )}

                </div>

              </div>


              {/* TOTAL */}

              <div className="pedido-total-box">

                <span>
                  TOTAL DEL PEDIDO
                </span>

                <strong>

                  {formatearPrecio(
                    pedidoSeleccionado.total
                  )}

                </strong>

              </div>


              {/* REGLA DE NEGOCIO */}

              {pedidoSeleccionado.estado ===
                "Entregado" && (

                <div className="pedido-delivered-info">

                  Este pedido se encuentra
                  entregado. No puede ser modificado.

                </div>

              )}

            </div>


            <div className="pedido-modal-footer">

              <button
                type="button"
                className="pedido-cancel-button detail-cerrar-button"
                onClick={cerrarDetalle}
              >

                Cerrar

              </button>

            </div>


          </div>

        </div>

      )}


      {/* =================================================
          MODAL ABONOS
      ================================================= */}

      {mostrarAbonos &&
        pedidoAbonos && (

        <div className="pedido-modal-overlay">

          <div className="pedido-modal">

            <div className="pedido-modal-header">

              <h3>
                Abonos del Pedido
              </h3>


              <button
                type="button"
                className="pedido-modal-close"
                onClick={cerrarAbonos}
              >

                <X size={21} />

              </button>

            </div>


            <div className="pedido-modal-body">


              {/* INFO DEL PEDIDO */}

              <div className="pedido-form-row">

                <div className="pedido-info-group">

                  <label>
                    ID PEDIDO
                  </label>

                  <div className="pedido-info-value">
                    {pedidoAbonos.id}
                  </div>

                </div>


                <div className="pedido-info-group">

                  <label>
                    CLIENTE
                  </label>

                  <div className="pedido-info-value">
                    {pedidoAbonos.cliente}
                  </div>

                </div>

              </div>


              {/* RESUMEN FINANCIERO */}

              <div className="pedido-abonos-resumen">

                <div className="pedido-abonos-resumen-item">

                  <span>
                    Total del pedido
                  </span>

                  <strong>
                    {formatearPrecio(
                      pedidoAbonos.total
                    )}
                  </strong>

                </div>


                <div className="pedido-abonos-resumen-item">

                  <span>
                    Total abonado
                  </span>

                  <strong className="pedido-abono-monto abonado">

                    {formatearPrecio(
                      totalAbonadoPedido
                    )}

                  </strong>

                </div>


                <div className="pedido-abonos-resumen-item">

                  <span>
                    Saldo pendiente
                  </span>

                  <strong
                    className={
                      saldoPendientePedido > 0
                        ? "pedido-abono-monto pendiente"
                        : "pedido-abono-monto saldado"
                    }
                  >

                    {formatearPrecio(
                      saldoPendientePedido
                    )}

                  </strong>

                </div>

              </div>


              {/* ENCABEZADO LISTA */}

              <div className="pedido-details-header">

                <label>
                  ABONOS DEL PEDIDO
                </label>


                {pedidoAbonos.estado !==
                  "Entregado" && (

                  <button
                    type="button"
                    className="pedido-add-product"
                    onClick={abrirFormAbono}
                  >

                    <Plus size={16} />

                    Registrar abono

                  </button>

                )}

              </div>


              {/* LISTA DE ABONOS */}

              {obtenerAbonos(
                pedidoAbonos
              ).length === 0 ? (

                <div className="pedido-no-products">

                  Aún no se han registrado
                  abonos para este pedido.

                </div>

              ) : (

                <div className="pedido-abonos-list">

                  {obtenerAbonos(
                    pedidoAbonos
                  ).map((abono, index) => (

                    <div
                      className="pedido-abono-item"
                      key={index}
                    >

                      <div className="pedido-abono-info">

                        <strong>
                          {formatearFecha(
                            abono.fecha
                          )}
                        </strong>

                        <span>
                          {abono.metodoPago}
                        </span>

                      </div>


                      <strong className="pedido-abono-valor">

                        {formatearPrecio(
                          abono.valor
                        )}

                      </strong>

                    </div>

                  ))}

                </div>

              )}


              {/* FORMULARIO REGISTRAR ABONO */}

              {mostrarFormAbono && (

                <div className="pedido-abono-form">

                  <div className="pedido-form-row">

                    <div className="pedido-form-group">

                      <label>
                        FECHA
                      </label>

                      <input
                        type="date"
                        value={
                          formularioAbono.fecha
                        }
                        onChange={(e) =>
                          setFormularioAbono(
                            (actual) => ({
                              ...actual,
                              fecha:
                                e.target.value
                            })
                          )
                        }
                      />

                    </div>


                    <div className="pedido-form-group">

                      <label>
                        MÉTODO DE PAGO
                      </label>

                      <select
                        value={
                          formularioAbono.metodoPago
                        }
                        onChange={(e) =>
                          setFormularioAbono(
                            (actual) => ({
                              ...actual,
                              metodoPago:
                                e.target.value
                            })
                          )
                        }
                      >

                        <option value="Efectivo">
                          Efectivo
                        </option>

                        <option value="Transferencia">
                          Transferencia
                        </option>

                        <option value="Crédito">
                          Crédito
                        </option>

                      </select>

                    </div>

                  </div>


                  <div className="pedido-form-group">

                    <label>
                      MONTO DEL ABONO (COP)
                    </label>

                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={
                        formularioAbono.valor
                      }
                      onChange={(e) =>
                        setFormularioAbono(
                          (actual) => ({
                            ...actual,
                            valor:
                              e.target.value
                                .replace(
                                  /[^0-9.]/g,
                                  ""
                                )
                                .replace(
                                  /(\..*)\./g,
                                  "$1"
                                )
                          })
                        )
                      }
                    />

                  </div>


                  <div className="pedido-abono-form-actions">

                    <button
                      type="button"
                      className="pedido-cancel-button"
                      onClick={() =>
                        setMostrarFormAbono(
                          false
                        )
                      }
                    >

                      Cancelar

                    </button>


                    <button
                      type="button"
                      className="pedido-create-button"
                      onClick={registrarAbono}
                    >

                      <Wallet size={16} />

                      Registrar abono

                    </button>

                  </div>

                </div>

              )}


              {/* REGLA DE NEGOCIO */}

              {pedidoAbonos.estado ===
                "Entregado" && (

                <div className="pedido-delivered-info">

                  Este pedido se encuentra
                  entregado y no admite nuevos
                  abonos.

                </div>

              )}

            </div>


            <div className="pedido-modal-footer">

              <button
                type="button"
                className="pedido-cancel-button detail-cerrar-button"
                onClick={cerrarAbonos}
              >

                Cerrar

              </button>

            </div>


          </div>

        </div>

      )}

      {pedidoEliminar && (
        <ConfirmDialog
          abierto={pedidoEliminar !== null}
          titulo="Eliminar pedido"
          mensaje={
            <>¿Deseas eliminar el pedido "
              <strong>{pedidoEliminar.id}</strong>"? Esta
              acción no se puede deshacer.</>
          }
          textoConfirmar="Eliminar"
          textoCancelar="Cancelar"
          variante="peligro"
          onConfirmar={confirmarEliminarPedido}
          onCancelar={() =>
            setPedidoEliminar(null)
          }
        />
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

      <Toast toast={toast} />

    </div>

  );

}