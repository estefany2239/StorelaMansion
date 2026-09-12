import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  SlidersHorizontal
} from "lucide-react";

import "./Domicilios.css";

import Pagination from "../components/Pagination";

export default function Domicilios() {

  // =====================================================
  // DOMICILIOS
  // =====================================================

  const [domicilios, setDomicilios] = useState([
    {
      id: "DOM-001",
      idPedido: "PED-001",
      idCliente: "CLI-001",
      cliente: "María García",
      direccion: "Cll 72 #10-34",
      ciudad: "Medellín",
      valor: 15000,
      responsable: "Carlos Rodríguez",
      estado: "Entregado",
      fecha: "2024-07-12"
    },

    {
      id: "DOM-002",
      idPedido: "PED-002",
      idCliente: "CLI-002",
      cliente: "Valentina Torres",
      direccion: "Cll 50 #45-20",
      ciudad: "Cali",
      valor: 18000,
      responsable: "Andrés López",
      estado: "En camino",
      fecha: "2024-07-16"
    },

    {
      id: "DOM-003",
      idPedido: "PED-003",
      idCliente: "CLI-003",
      cliente: "Sofía Martínez",
      direccion: "Cra 70 #15-30",
      ciudad: "Bogotá",
      valor: 20000,
      responsable: "Carlos Rodríguez",
      estado: "Pendiente",
      fecha: "2024-07-21"
    },

    {
      id: "DOM-004",
      idPedido: "PED-004",
      idCliente: "CLI-004",
      cliente: "Camila Reyes",
      direccion: "Av. 80 #33-15",
      ciudad: "Medellín",
      valor: 15000,
      responsable: "Andrés López",
      estado: "En camino",
      fecha: "2024-07-26"
    },

    {
      id: "DOM-005",
      idPedido: "PED-005",
      idCliente: "CLI-005",
      cliente: "Santiago Gómez",
      direccion: "Calle 10 #20-15",
      ciudad: "Medellín",
      valor: 16000,
      responsable: "Carlos Rodríguez",
      estado: "Pendiente",
      fecha: "2024-08-02"
    },

    {
      id: "DOM-006",
      idPedido: "PED-006",
      idCliente: "CLI-006",
      cliente: "Marcela Ríos",
      direccion: "Carrera 45 #22-40",
      ciudad: "Cali",
      valor: 18000,
      responsable: "Andrés López",
      estado: "En camino",
      fecha: "2024-08-06"
    },

    {
      id: "DOM-007",
      idPedido: "PED-007",
      idCliente: "CLI-007",
      cliente: "Diego Muñoz",
      direccion: "Av. 68 #55-10",
      ciudad: "Bogotá",
      valor: 20000,
      responsable: "Carlos Rodríguez",
      estado: "Entregado",
      fecha: "2024-08-11"
    },
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

  const [domicilioSeleccionado, setDomicilioSeleccionado] =
    useState(null);


  // =====================================================
  // FORMULARIO
  // =====================================================

  const [formulario, setFormulario] = useState({
    id: "",
    idPedido: "",
    idCliente: "",
    cliente: "",
    direccion: "",
    ciudad: "",
    valor: 15000,
    responsable: "",
    estado: "Pendiente",
    fecha: "2026-09-07"
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
      domicilios.map((domicilio) => [
        domicilio.idCliente,
        {
          id: domicilio.idCliente,
          nombre: domicilio.cliente
        }
      ])
    ).values()
  ];


  // =====================================================
  // PEDIDOS DISPONIBLES
  // =====================================================

  const pedidosDisponibles = [
    ...new Map(
      domicilios.map((domicilio) => [
        domicilio.idPedido,
        {
          id: domicilio.idPedido,
          idCliente: domicilio.idCliente,
          cliente: domicilio.cliente,
          direccion: domicilio.direccion,
          ciudad: domicilio.ciudad
        }
      ])
    ).values()
  ];


  // =====================================================
  // FILTRAR DOMICILIOS
  // =====================================================

  const domiciliosFiltrados = domicilios.filter(
    (domicilio) => {

      const texto =
        busqueda
          .toLowerCase()
          .trim();

      const coincideBusqueda =
        domicilio.id
          .toLowerCase()
          .includes(texto) ||

        domicilio.idPedido
          .toLowerCase()
          .includes(texto) ||

        domicilio.idCliente
          .toLowerCase()
          .includes(texto) ||

        domicilio.cliente
          .toLowerCase()
          .includes(texto);


      const coincideCliente =
        filtroCliente === "Todos" ||
        domicilio.idCliente === filtroCliente;


      const coincideEstado =
        filtroEstado === "Todos" ||
        domicilio.estado === filtroEstado;


      return (
        coincideBusqueda &&
        coincideCliente &&
        coincideEstado
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
    Math.ceil(domiciliosFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const domiciliosPaginados = domiciliosFiltrados.slice(
    inicio,
    inicio + REGISTROS_POR_PAGINA
  );

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroCliente, filtroEstado]);

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
        domicilios.length + 1
      ).padStart(3, "0");


    setFormulario({

      id: `DOM-${numero}`,

      idPedido: "",

      idCliente: "",

      cliente: "",

      direccion: "",

      ciudad: "",

      valor: 15000,

      responsable: "",

      estado: "Pendiente",

      fecha: "2026-09-07"

    });


    setModoEdicion(false);

    setMostrarModal(true);

  };


  // =====================================================
  // ABRIR EDITAR
  // =====================================================

  const abrirEditar = (domicilio) => {

    if (domicilio.estado === "Entregado") {

      alert(
        "No se puede modificar un domicilio que ya fue entregado."
      );

      return;

    }


    setFormulario({

      id: domicilio.id,

      idPedido: domicilio.idPedido,

      idCliente: domicilio.idCliente,

      cliente: domicilio.cliente,

      direccion: domicilio.direccion,

      ciudad: domicilio.ciudad,

      valor: domicilio.valor,

      responsable: domicilio.responsable,

      estado: domicilio.estado,

      fecha: domicilio.fecha

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
  // SELECCIONAR PEDIDO
  // =====================================================

  const seleccionarPedido = (idPedido) => {

    const pedido =
      pedidosDisponibles.find(
        (item) =>
          item.id === idPedido
      );


    if (!pedido) {

      setFormulario(
        (actual) => ({
          ...actual,
          idPedido: idPedido,
          idCliente: "",
          cliente: "",
          direccion: "",
          ciudad: ""
        })
      );

      return;

    }


    setFormulario(
      (actual) => ({

        ...actual,

        idPedido:
          pedido.id,

        idCliente:
          pedido.idCliente,

        cliente:
          pedido.cliente,

        direccion:
          pedido.direccion,

        ciudad:
          pedido.ciudad

      })
    );

  };


  // =====================================================
  // GUARDAR DOMICILIO
  // =====================================================

  const guardarDomicilio = () => {

    if (
      !formulario.idPedido ||
      !formulario.idCliente ||
      !formulario.cliente ||
      !formulario.direccion ||
      !formulario.ciudad ||
      !formulario.responsable
    ) {

      alert(
        "Completa los campos obligatorios."
      );

      return;

    }


    if (modoEdicion) {

      setDomicilios(
        (actuales) =>
          actuales.map(
            (domicilio) =>
              domicilio.id === formulario.id
                ? {
                    ...domicilio,

                    idPedido:
                      formulario.idPedido,

                    idCliente:
                      formulario.idCliente,

                    cliente:
                      formulario.cliente,

                    direccion:
                      formulario.direccion,

                    ciudad:
                      formulario.ciudad,

                    valor:
                      Number(
                        formulario.valor
                      ),

                    responsable:
                      formulario.responsable,

                    estado:
                      formulario.estado,

                    fecha:
                      formulario.fecha
                  }
                : domicilio
          )
      );

    } else {

      const nuevoDomicilio = {

        id:
          formulario.id,

        idPedido:
          formulario.idPedido,

        idCliente:
          formulario.idCliente,

        cliente:
          formulario.cliente,

        direccion:
          formulario.direccion,

        ciudad:
          formulario.ciudad,

        valor:
          Number(
            formulario.valor
          ),

        responsable:
          formulario.responsable,

        estado:
          formulario.estado,

        fecha:
          formulario.fecha

      };


      setDomicilios(
        (actuales) => [
          ...actuales,
          nuevoDomicilio
        ]
      );

    }


    cerrarModal();

  };


  // =====================================================
  // ELIMINAR DOMICILIO
  // =====================================================

  const eliminarDomicilio = (domicilio) => {

    if (
      domicilio.estado !== "Pendiente"
    ) {

      alert(
        "Solo se pueden eliminar domicilios pendientes."
      );

      return;

    }


    const confirmar =
      window.confirm(
        `¿Deseas eliminar el domicilio ${domicilio.id}?`
      );


    if (!confirmar) return;


    setDomicilios(
      (actuales) =>
        actuales.filter(
          (item) =>
            item.id !== domicilio.id
        )
    );

  };


  // =====================================================
  // AVANZAR ESTADO
  // =====================================================

  const avanzarEstado = (id) => {

    setDomicilios((actuales) =>

      actuales.map((domicilio) => {

        if (domicilio.id !== id) {

          return domicilio;

        }


        if (domicilio.estado === "Pendiente") {

          return {
            ...domicilio,
            estado: "En camino"
          };

        }


        if (domicilio.estado === "En camino") {

          return {
            ...domicilio,
            estado: "Entregado"
          };

        }


        return domicilio;

      })

    );

  };


  // =====================================================
  // VER DETALLE
  // =====================================================

  const verDetalle = (domicilio) => {

    setDomicilioSeleccionado(domicilio);

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

    setDomicilioSeleccionado(null);

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

          <div className="domicilios-search">

            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar domicilios..."
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
                ? "domicilios-filter-button active"
                : "domicilios-filter-button"
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
            className="domicilios-add-button"
            onClick={abrirAgregar}
          >

            <Plus size={18} />

            Agregar domicilio

          </button>

        </div>

      </div>


      {/* =================================================
          FILTROS
      ================================================= */}

      {mostrarFiltros && (

        <div className="domicilios-filters-panel">


          <div className="domicilios-filter-group">

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


          <div className="domicilios-filter-group">

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

              <option value="Pendiente">
                Pendiente
              </option>

              <option value="En camino">
                En camino
              </option>

              <option value="Entregado">
                Entregado
              </option>

              <option value="Cancelado">
                Cancelado
              </option>

            </select>

          </div>


          <button
            type="button"
            className="domicilios-clear-filter"
            onClick={limpiarFiltros}
          >

            Limpiar filtros

          </button>

        </div>

      )}


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
                CLIENTE
              </th>

              <th>
                CIUDAD
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

            {domiciliosPaginados.map(
              (domicilio) => (

                <tr
                  key={domicilio.id}
                >

                  <td>

                    <strong className="domicilio-id">
                      {domicilio.id}
                    </strong>

                  </td>


                  <td>

                    <span className="domicilio-cliente">
                      {domicilio.cliente}
                    </span>

                  </td>


                  <td>

                    <span className="domicilio-ciudad">
                      {domicilio.ciudad}
                    </span>

                  </td>


                  <td>

                    <span
                      className={
                        domicilio.estado ===
                        "Entregado"

                          ? "domicilio-estado entregado"

                          : domicilio.estado ===
                            "En camino"

                          ? "domicilio-estado camino"

                          : domicilio.estado ===
                            "Cancelado"

                          ? "domicilio-estado cancelado"

                          : "domicilio-estado pendiente"
                      }
                      onClick={() =>
                        avanzarEstado(
                          domicilio.id
                        )
                      }
                    >

                      {domicilio.estado}

                    </span>

                  </td>


                  <td>

                    <div className="domicilio-actions">


                      <button
                        type="button"
                        title="Ver domicilio"
                        onClick={() =>
                          verDetalle(
                            domicilio
                          )
                        }
                      >

                        <Eye size={18} />

                      </button>


                      <button
                        type="button"
                        title={
                          domicilio.estado ===
                          "Entregado"
                            ? "No se puede modificar"
                            : "Editar domicilio"
                        }
                        className={
                          domicilio.estado ===
                          "Entregado"
                            ? "disabled"
                            : ""
                        }
                        onClick={() =>
                          abrirEditar(
                            domicilio
                          )
                        }
                      >

                        <Pencil size={18} />

                      </button>


                      <button
                        type="button"
                        title="Eliminar domicilio"
                        onClick={() =>
                          eliminarDomicilio(
                            domicilio
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


            {domiciliosFiltrados.length === 0 && (

              <tr>

                <td
                  colSpan="5"
                  className="domicilios-empty"
                >

                  No se encontraron domicilios.

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

        <div className="domicilio-modal-overlay">

          <div className="domicilio-modal">


            <div className="domicilio-modal-header">

              <h3>

                {modoEdicion
                  ? "Editar Domicilio"
                  : "Agregar Domicilio"}

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


              {/* ID + ESTADO */}

              <div className="domicilio-form-row">

                <div className="domicilio-form-group">

                  <label>
                    ID DOMICILIO
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.id
                    }
                    disabled
                  />

                </div>


                <div className="domicilio-form-group">

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

                    <option value="Pendiente">
                      Pendiente
                    </option>

                    <option value="En camino">
                      En camino
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


              {/* ID PEDIDO + ID CLIENTE */}

              <div className="domicilio-form-row">

                <div className="domicilio-form-group">

                  <label>
                    ID PEDIDO
                  </label>

                  <select
                    value={
                      formulario.idPedido
                    }
                    onChange={(e) =>
                      seleccionarPedido(
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Seleccionar pedido
                    </option>

                    {pedidosDisponibles.map(
                      (pedido) => (

                        <option
                          key={pedido.id}
                          value={pedido.id}
                        >

                          {pedido.id}

                        </option>

                      )
                    )}

                  </select>

                </div>


                <div className="domicilio-form-group">

                  <label>
                    ID CLIENTE
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.idCliente
                    }
                    readOnly
                    placeholder="ID cliente"
                  />

                </div>

              </div>


              {/* CLIENTE */}

              <div className="domicilio-form-group">

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


              {/* DIRECCIÓN + CIUDAD */}

              <div className="domicilio-form-row">

                <div className="domicilio-form-group">

                  <label>
                    DIRECCIÓN
                  </label>

                  <input
                    type="text"
                    placeholder="Dirección de entrega"
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


                <div className="domicilio-form-group">

                  <label>
                    CIUDAD
                  </label>

                  <input
                    type="text"
                    placeholder="Ciudad"
                    value={
                      formulario.ciudad
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "ciudad",
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>


              {/* VALOR + RESPONSABLE */}

              <div className="domicilio-form-row">

                <div className="domicilio-form-group">

                  <label>
                    VALOR DEL DOMICILIO
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      formulario.valor
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "valor",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="domicilio-form-group">

                  <label>
                    RESPONSABLE DE LA ENTREGA
                  </label>

                  <input
                    type="text"
                    placeholder="Nombre del responsable"
                    value={
                      formulario.responsable
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "responsable",
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>


              {/* FECHA */}

              <div className="domicilio-form-row">

                <div className="domicilio-form-group">

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

              </div>


            </div>


            {/* FOOTER */}

            <div className="domicilio-modal-footer">

              <button
                type="button"
                className="domicilio-cancel-button"
                onClick={cerrarModal}
              >

                Cancelar

              </button>


              <button
                type="button"
                className="domicilio-create-button"
                onClick={guardarDomicilio}
              >

                {modoEdicion
                  ? "Guardar cambios"
                  : "Crear domicilio"}

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


              <div className="domicilio-form-row">

                <div className="domicilio-info-group">

                  <label>
                    ID DOMICILIO
                  </label>

                  <div className="domicilio-info-value">
                    {domicilioSeleccionado.id}
                  </div>

                </div>


                <div className="domicilio-info-group">

                  <label>
                    ESTADO
                  </label>

                  <div className="domicilio-info-value">

                    <span
                      className={
                        domicilioSeleccionado.estado ===
                        "Entregado"

                          ? "domicilio-estado entregado"

                          : domicilioSeleccionado.estado ===
                            "En camino"

                          ? "domicilio-estado camino"

                          : domicilioSeleccionado.estado ===
                            "Cancelado"

                          ? "domicilio-estado cancelado"

                          : "domicilio-estado pendiente"
                      }
                    >

                      {domicilioSeleccionado.estado}

                    </span>

                  </div>

                </div>

              </div>


              <div className="domicilio-form-row">

                <div className="domicilio-info-group">

                  <label>
                    ID PEDIDO
                  </label>

                  <div className="domicilio-info-value">
                    {domicilioSeleccionado.idPedido}
                  </div>

                </div>


                <div className="domicilio-info-group">

                  <label>
                    ID CLIENTE
                  </label>

                  <div className="domicilio-info-value">
                    {domicilioSeleccionado.idCliente}
                  </div>

                </div>

              </div>


              <div className="domicilio-info-group">

                <label>
                  CLIENTE
                </label>

                <div className="domicilio-info-value">
                  {domicilioSeleccionado.cliente}
                </div>

              </div>


              <div className="domicilio-form-row">

                <div className="domicilio-info-group">

                  <label>
                    DIRECCIÓN
                  </label>

                  <div className="domicilio-info-value">
                    {domicilioSeleccionado.direccion}
                  </div>

                </div>


                <div className="domicilio-info-group">

                  <label>
                    CIUDAD
                  </label>

                  <div className="domicilio-info-value">
                    {domicilioSeleccionado.ciudad}
                  </div>

                </div>

              </div>


              <div className="domicilio-form-row">

                <div className="domicilio-info-group">

                  <label>
                    VALOR DEL DOMICILIO
                  </label>

                  <div className="domicilio-info-value">
                    {formatearPrecio(
                      domicilioSeleccionado.valor
                    )}
                  </div>

                </div>


                <div className="domicilio-info-group">

                  <label>
                    RESPONSABLE DE LA ENTREGA
                  </label>

                  <div className="domicilio-info-value">
                    {domicilioSeleccionado.responsable}
                  </div>

                </div>

              </div>


              <div className="domicilio-info-group">

                <label>
                  FECHA
                </label>

                <div className="domicilio-info-value">
                  {formatearFecha(
                    domicilioSeleccionado.fecha
                  )}
                </div>

              </div>


              {/* REGLA DE NEGOCIO */}

              {domicilioSeleccionado.estado ===
                "Entregado" && (

                <div className="domicilio-delivered-info">

                  Entrega confirmada. Este domicilio
                  no puede ser modificado ni cerrado
                  nuevamente.

                </div>

              )}

            </div>


            <div className="domicilio-modal-footer">

              <button
                type="button"
                className="domicilio-cancel-button"
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