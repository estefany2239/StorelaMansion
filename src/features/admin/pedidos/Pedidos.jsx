import { useState } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  X,
  SlidersHorizontal
} from "lucide-react";

import "./Pedidos.css";

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
      ]
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
      ]
    }
  ]);


  // =====================================================
  // ESTADOS
  // =====================================================

  const [busqueda, setBusqueda] = useState("");

  const [mostrarFiltros, setMostrarFiltros] =
    useState(false);

  const [filtroCliente, setFiltroCliente] =
    useState("Todos");

  const [filtroEstado, setFiltroEstado] =
    useState("Todos");

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [mostrarDetalle, setMostrarDetalle] =
    useState(false);

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [pedidoSeleccionado, setPedidoSeleccionado] =
    useState(null);


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


      const coincideCliente =
        filtroCliente === "Todos" ||
        pedido.idCliente === filtroCliente;


      const coincideEstado =
        filtroEstado === "Todos" ||
        pedido.estado === filtroEstado;


      return (
        coincideBusqueda &&
        coincideCliente &&
        coincideEstado
      );

    }
  );


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

      nombre: "Nuevo producto",

      cantidad: 1,

      talla: "M",

      color: "Negro",

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
          total

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
  // LIMPIAR FILTROS
  // =====================================================

  const limpiarFiltros = () => {

    setFiltroCliente("Todos");

    setFiltroEstado("Todos");

    setBusqueda("");

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


          {/* FILTROS */}

          <button
            type="button"
            className={
              mostrarFiltros
                ? "pedidos-filter-button active"
                : "pedidos-filter-button"
            }
            onClick={() =>
              setMostrarFiltros(
                !mostrarFiltros
              )
            }
          >

            <SlidersHorizontal size={18} />

            Filtros

          </button>


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
          FILTROS
      ================================================= */}

      {mostrarFiltros && (

        <div className="pedidos-filters-panel">


          <div className="pedidos-filter-group">

            <label>
              CLIENTE
            </label>

            <select
              value={filtroCliente}
              onChange={(e) =>
                setFiltroCliente(
                  e.target.value
                )
              }
            >

              <option value="Todos">
                Todos
              </option>

              {clientesDisponibles.map(
                (cliente) => (

                  <option
                    key={cliente.id}
                    value={cliente.id}
                  >
                    {cliente.nombre}
                  </option>

                )
              )}

            </select>

          </div>


          <div className="pedidos-filter-group">

            <label>
              ESTADO
            </label>

            <select
              value={filtroEstado}
              onChange={(e) =>
                setFiltroEstado(
                  e.target.value
                )
              }
            >

              <option value="Todos">
                Todos
              </option>

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

            </select>

          </div>


          <button
            type="button"
            className="pedidos-clear-filter"
            onClick={limpiarFiltros}
          >

            Limpiar filtros

          </button>

        </div>

      )}


      {/* =================================================
          TABLA
      ================================================= */}

      <div className="pedidos-table-container">

        <table className="pedidos-table">

          <thead>

            <tr>

              <th>ID PEDIDO</th>

              <th>ID CLIENTE</th>

              <th>CLIENTE</th>

              <th>FECHA</th>

              <th>TOTAL</th>

              <th>ESTADO</th>

              <th>MÉTODO DE PAGO</th>

              <th>DIRECCIÓN</th>

              <th>ACCIONES</th>

            </tr>

          </thead>


          <tbody>

            {pedidosFiltrados.map(
              (pedido) => (

                <tr key={pedido.id}>


                  <td>

                    <strong className="pedido-id">

                      {pedido.id}

                    </strong>

                  </td>


                  <td>

                    <span className="pedido-id-cliente">

                      {pedido.idCliente}

                    </span>

                  </td>


                  <td>

                    <span className="pedido-cliente">

                      {pedido.cliente}

                    </span>

                  </td>


                  <td>

                    <span className="pedido-fecha">

                      {formatearFecha(
                        pedido.fecha
                      )}

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

                          : "pedido-estado registrado"
                      }
                    >

                      {pedido.estado}

                    </span>

                  </td>


                  <td>

                    <span className="pedido-pago">

                      {pedido.metodoPago}

                    </span>

                  </td>


                  <td>

                    <span className="pedido-direccion">

                      {pedido.direccion}

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


                    </div>

                  </td>

                </tr>

              )
            )}


            {pedidosFiltrados.length === 0 && (

              <tr>

                <td
                  colSpan="9"
                  className="pedidos-empty"
                >

                  No se encontraron pedidos.

                </td>

              </tr>

            )}

          </tbody>

        </table>

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

    </div>

  );

}