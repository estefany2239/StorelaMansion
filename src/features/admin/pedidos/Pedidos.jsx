import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  X,
  Trash2,
  Receipt,
  Wallet
} from "lucide-react";

import "./Pedidos.css";

import Pagination from "../components/Pagination";

export default function Pedidos() {

  // =====================================================
  // PEDIDOS
  // =====================================================

  const [pedidos, setPedidos] = useState([
    {
      id: "PED-001",
      idCliente: "CLI-001",
      cliente: "María García",
      fecha: "2024-07-10",
      total: 805000,
      estado: "Entregado",
      metodoPago: "Tarjeta de crédito",
      direccion: "Cll 72 #10-34, Medellín",

      productos: [
        {
          nombre: "Vestido de Noche Premium",
          cantidad: 1,
          talla: "M",
          color: "Negro",
          precio: 485000
        },
        {
          nombre: "Camiseta Clásica",
          cantidad: 2,
          talla: "M",
          color: "Blanco",
          precio: 160000
        }
      ],

      abonos: [
        {
          fecha: "2024-07-05",
          valor: 300000,
          metodoPago: "Efectivo"
        },
        {
          fecha: "2024-07-10",
          valor: 505000,
          metodoPago: "Tarjeta de crédito"
        }
      ]
    },

    {
      id: "PED-002",
      idCliente: "CLI-002",
      cliente: "Valentina Torres",
      fecha: "2024-07-15",
      total: 1250000,
      estado: "En preparación",
      metodoPago: "Transferencia bancaria",
      direccion: "Cll 50 #45-20, Cali",

      productos: [
        {
          nombre: "Traje Sastre Masculino",
          cantidad: 1,
          talla: "L",
          color: "Negro",
          precio: 750000
        },
        {
          nombre: "Abrigo Wool Premium",
          cantidad: 1,
          talla: "M",
          color: "Beige",
          precio: 500000
        }
      ],

      abonos: [
        {
          fecha: "2024-07-14",
          valor: 500000,
          metodoPago: "Transferencia bancaria"
        }
      ]
    },

    {
      id: "PED-003",
      idCliente: "CLI-003",
      cliente: "Sofía Martínez",
      fecha: "2024-07-20",
      total: 395000,
      estado: "Registrado",
      metodoPago: "Efectivo",
      direccion: "Cra 70 #15-30, Bogotá",

      productos: [
        {
          nombre: "Vestido Cóctel Elegante",
          cantidad: 1,
          talla: "S",
          color: "Negro",
          precio: 395000
        }
      ],

      abonos: []
    },

    {
      id: "PED-004",
      idCliente: "CLI-004",
      cliente: "Camila Reyes",
      fecha: "2024-07-25",
      total: 890000,
      estado: "Despachado",
      metodoPago: "Tarjeta débito",
      direccion: "Av. 80 #33-15, Medellín",

      productos: [
        {
          nombre: "Traje Oscuro Clásico",
          cantidad: 1,
          talla: "L",
          color: "Azul oscuro",
          precio: 890000
        }
      ],

      abonos: [
        {
          fecha: "2024-07-22",
          valor: 400000,
          metodoPago: "Tarjeta débito"
        }
      ]
    },

    {
      id: "PED-005",
      idCliente: "CLI-005",
      cliente: "Santiago Gómez",
      fecha: "2024-08-01",
      total: 340000,
      estado: "Registrado",
      metodoPago: "Efectivo",
      direccion: "Calle 10 #20-15, Medellín",

      productos: [
        {
          nombre: "Vestido Cóctel Elegante",
          cantidad: 1,
          talla: "S",
          color: "Negro",
          precio: 340000
        }
      ],

      abonos: []
    },

    {
      id: "PED-006",
      idCliente: "CLI-006",
      cliente: "Marcela Ríos",
      fecha: "2024-08-05",
      total: 620000,
      estado: "Despachado",
      metodoPago: "Tarjeta de crédito",
      direccion: "Carrera 45 #22-40, Cali",

      productos: [
        {
          nombre: "Abrigo Wool Premium",
          cantidad: 1,
          talla: "M",
          color: "Beige",
          precio: 620000
        }
      ],

      abonos: [
        {
          fecha: "2024-08-03",
          valor: 620000,
          metodoPago: "Tarjeta de crédito"
        }
      ]
    },

    {
      id: "PED-007",
      idCliente: "CLI-007",
      cliente: "Diego Muñoz",
      fecha: "2024-08-10",
      total: 320000,
      estado: "En preparación",
      metodoPago: "Transferencia bancaria",
      direccion: "Av. 68 #55-10, Bogotá",

      productos: [
        {
          nombre: "Blazer Ejecutivo Femenino",
          cantidad: 1,
          talla: "S",
          color: "Café",
          precio: 320000
        }
      ],

      abonos: []
    }
  ]);


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

  const REGISTROS_POR_PAGINA = 6;
  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(pedidosFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
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

    if (
      !formulario.idCliente ||
      !formulario.cliente ||
      !formulario.fecha ||
      !formulario.direccion
    ) {

      alert(
        "Completa los campos obligatorios."
      );

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

    } else {

      const nuevoPedido = {

        id: formulario.id,

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
          ...actuales,
          nuevoPedido
        ]
      );

    }


    cerrarModal();

  };


  // =====================================================
  // ELIMINAR PEDIDO
  // =====================================================

  const eliminarPedido = (pedido) => {

    const confirmar = window.confirm(
      `¿Deseas eliminar el pedido "${pedido.id}"?`
    );

    if (!confirmar) return;

    setPedidos(
      (prev) =>
        prev.filter(
          (item) => item.id !== pedido.id
        )
    );

  };


  // =====================================================
  // AVANZAR ESTADO
  // =====================================================

  const avanzarEstado = (id) => {

    setPedidos((actuales) =>

      actuales.map((pedido) => {

        if (pedido.id !== id) {

          return pedido;

        }


        if (pedido.estado === "Registrado") {

          return {
            ...pedido,
            estado: "En preparación"
          };

        }


        if (pedido.estado === "En preparación") {

          return {
            ...pedido,
            estado: "Despachado"
          };

        }


        if (pedido.estado === "Despachado") {

          return {
            ...pedido,
            estado: "Entregado"
          };

        }


        return pedido;

      })

    );

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

            Agregar pedido

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
                            : "Editar pedido"
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

                  No se encontraron pedidos.

                </td>

              </tr>

            )}

          </tbody>

        </table>

        {totalPaginas > 1 && (
          <Pagination
            currentPage={paginaActual}
            totalPages={totalPaginas}
            onPageChange={setPaginaActual}
          />
        )}

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
                  ? "Editar Pedido"
                  : "Agregar Pedido"}

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
                  />

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
                    onChange={(e) =>
                      cambiarCampo(
                        "fecha",
                        e.target.value
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
                      formulario.metodoPago
                    }
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

                    <option value="Transferencia bancaria">
                      Transferencia bancaria
                    </option>

                    <option value="Nequi">
                      Nequi
                    </option>

                    <option value="Tarjeta débito">
                      Tarjeta débito
                    </option>

                    <option value="Tarjeta de crédito">
                      Tarjeta de crédito
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
                  onChange={(e) =>
                    cambiarCampo(
                      "direccion",
                      e.target.value
                    )
                  }
                />

              </div>


              {/* DETALLES */}

              <div className="pedido-details-header">

                <label>
                  DETALLES DEL PEDIDO
                </label>


                <button
                  type="button"
                  className="pedido-add-product"
                  onClick={agregarProducto}
                >

                  <Plus size={16} />

                  Agregar producto

                </button>

              </div>


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
                              placeholder="Nombre del producto"
                              onChange={(e) =>
                                actualizarProducto(
                                  index,
                                  "nombre",
                                  e.target.value
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
                              onChange={(e) =>
                                actualizarProducto(
                                  index,
                                  "cantidad",
                                  e.target.value
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
                              onChange={(e) =>
                                actualizarProducto(
                                  index,
                                  "color",
                                  e.target.value
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
                              onChange={(e) =>
                                actualizarProducto(
                                  index,
                                  "precio",
                                  e.target.value
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
                className="pedido-cancel-button"
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

                        <option value="Nequi">
                          Nequi
                        </option>

                        <option value="Transferencia bancaria">
                          Transferencia bancaria
                        </option>

                        <option value="Tarjeta débito">
                          Tarjeta débito
                        </option>

                        <option value="Tarjeta de crédito">
                          Tarjeta de crédito
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
                className="pedido-cancel-button"
                onClick={cerrarAbonos}
              >

                Cerrar

              </button>

            </div>


          </div>

        </div>

      )}

    </div>

  );

}