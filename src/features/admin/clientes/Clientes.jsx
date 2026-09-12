import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X
} from "lucide-react";

import "./Clientes.css";

import Pagination from "../components/Pagination";

export default function Clientes() {

  // =====================================================
  // CLIENTES
  // =====================================================

  const [clientes, setClientes] = useState([
    {
      id: "CLI-001",
      nombre: "María García",
      correo: "cliente@storelamansion.com",
      telefono: "+57 315 555 0002",
      direccion: "Medellín, Antioquia",
      estado: "Activo",
      fecha: "2024-02-20",
      pedidos: 5
    },

    {
      id: "CLI-002",
      nombre: "Valentina Torres",
      correo: "valentina@email.com",
      telefono: "+57 300 555 0004",
      direccion: "Medellín, Antioquia",
      estado: "Activo",
      fecha: "2024-04-05",
      pedidos: 8
    },

    {
      id: "CLI-003",
      nombre: "Sofía Martínez",
      correo: "sofia@email.com",
      telefono: "+57 318 555 0006",
      direccion: "Bello, Antioquia",
      estado: "Activo",
      fecha: "2024-05-12",
      pedidos: 4
    },

    {
      id: "CLI-004",
      nombre: "Camila Reyes",
      correo: "camila@email.com",
      telefono: "+57 304 555 0007",
      direccion: "Envigado, Antioquia",
      estado: "Activo",
      fecha: "2024-06-08",
      pedidos: 6
    },

    {
id: "CLI-005",
      nombre: "Santiago Gómez",
      correo: "santiago@email.com",
      telefono: "+57 311 555 0005",
      direccion: "Calle 10 #20-15, Medellín",
      estado: "Inactivo",
      fecha: "2024-05-18",
      pedidos: 0
    },

    {
      id: "CLI-006",
      nombre: "Marcela Ríos",
      correo: "marcela@email.com",
      telefono: "+57 318 555 0006",
      direccion: "Carrera 45 #22-40, Cali",
      estado: "Activo",
      fecha: "2024-06-10",
      pedidos: 3
    },

    {
      id: "CLI-007",
      nombre: "Diego Muñoz",
      correo: "diego@email.com",
      telefono: "+57 320 555 0007",
      direccion: "Av. 68 #55-10, Bogotá",
      estado: "Inactivo",
      fecha: "2024-06-25",
      pedidos: 0
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

  const [clienteSeleccionado, setClienteSeleccionado] =
    useState(null);


  // =====================================================
  // FORMULARIO
  // =====================================================

  const [formulario, setFormulario] = useState({
    id: "",
    nombre: "",
    correo: "",
    telefono: "",
    direccion: "",
    estado: "Activo",
    fecha: "2026-09-07"
  });


  // =====================================================
  // BUSCAR CLIENTES
  // =====================================================

  const clientesFiltrados = clientes.filter(
    (cliente) => {

      const texto =
        busqueda
          .toLowerCase()
          .trim();

      return (
        cliente.id
          .toLowerCase()
          .includes(texto) ||

        cliente.nombre
          .toLowerCase()
          .includes(texto) ||

        cliente.correo
          .toLowerCase()
          .includes(texto) ||

        cliente.telefono
          .toLowerCase()
          .includes(texto)
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
    Math.ceil(clientesFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const clientesPaginados = clientesFiltrados.slice(
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
  // FORMATEAR FECHA
  // =====================================================

  const formatearFecha = (fecha) => {

    if (!fecha) return "";

    const partes =
      fecha.split("-");

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

  };


  // =====================================================
  // ABRIR AGREGAR
  // =====================================================

  const abrirAgregar = () => {

    const numero =
      String(
        clientes.length + 1
      ).padStart(3, "0");

    setFormulario({

      id: `CLI-${numero}`,

      nombre: "",

      correo: "",

      telefono: "",

      direccion: "",

      estado: "Activo",

      fecha: "2026-09-07"

    });

    setModoEdicion(false);

    setMostrarModal(true);

  };


  // =====================================================
  // ABRIR EDITAR
  // =====================================================

  const abrirEditar = (cliente) => {

    setFormulario({

      id: cliente.id,

      nombre: cliente.nombre,

      correo: cliente.correo,

      telefono: cliente.telefono,

      direccion: cliente.direccion,

      estado: cliente.estado,

      fecha: cliente.fecha

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
  // CAMBIAR ESTADO DEL CLIENTE
  // =====================================================

  const cambiarEstadoCliente = (cliente) => {

    setClientes(
      (actuales) =>
        actuales.map(
          (item) =>
            item.id === cliente.id
              ? {
                  ...item,
                  estado:
                    item.estado === "Activo"
                      ? "Inactivo"
                      : "Activo"
                }
              : item
        )
    );

    // Si el detalle del cliente está abierto,
    // también actualizamos el cliente seleccionado.
    if (
      clienteSeleccionado &&
      clienteSeleccionado.id === cliente.id
    ) {

      setClienteSeleccionado(
        (actual) => ({
          ...actual,
          estado:
            actual.estado === "Activo"
              ? "Inactivo"
              : "Activo"
        })
      );

    }

  };


  // =====================================================
  // GUARDAR CLIENTE
  // =====================================================

  const guardarCliente = () => {

    if (
      !formulario.nombre.trim() ||
      !formulario.correo.trim() ||
      !formulario.telefono.trim() ||
      !formulario.direccion.trim()
    ) {

      alert(
        "Completa los campos obligatorios."
      );

      return;

    }


    if (modoEdicion) {

      setClientes(
        (actuales) =>
          actuales.map(
            (cliente) =>
              cliente.id === formulario.id
                ? {
                    ...cliente,
                    nombre:
                      formulario.nombre,
                    correo:
                      formulario.correo,
                    telefono:
                      formulario.telefono,
                    direccion:
                      formulario.direccion,
                    estado:
                      formulario.estado
                  }
                : cliente
          )
      );

    } else {

      const nuevoCliente = {

        id: formulario.id,

        nombre:
          formulario.nombre,

        correo:
          formulario.correo,

        telefono:
          formulario.telefono,

        direccion:
          formulario.direccion,

        estado:
          formulario.estado,

        fecha:
          formulario.fecha,

        pedidos: 0

      };


      setClientes(
        (actuales) => [
          ...actuales,
          nuevoCliente
        ]
      );

    }


    cerrarModal();

  };


  // =====================================================
  // ELIMINAR CLIENTE
  // =====================================================

  const eliminarCliente = (cliente) => {

    if (
      cliente.estado === "Activo"
    ) {

      alert(
        "No se puede eliminar un cliente activo. Primero cambia su estado a Inactivo."
      );

      return;

    }


    const confirmar =
      window.confirm(
        `¿Deseas eliminar al cliente ${cliente.nombre}?`
      );


    if (!confirmar) return;


    setClientes(
      (actuales) =>
        actuales.filter(
          (item) =>
            item.id !== cliente.id
        )
    );

  };


  // =====================================================
  // VER DETALLE
  // =====================================================

  const verDetalle = (cliente) => {

    setClienteSeleccionado(cliente);

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

    setClienteSeleccionado(null);

  };


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="clientes-page">


      {/* =================================================
          ENCABEZADO
      ================================================= */}

      <div className="clientes-header">

        <div className="clientes-title">

          <h2>
            Clientes
          </h2>

          <p>
            Gestiona la información y el seguimiento de los clientes.
          </p>

        </div>


        {/* =================================================
            BUSCADOR + BOTÓN
        ================================================= */}

        <div className="clientes-actions">

          <div className="clientes-search">

            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar clientes..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
            />

          </div>


          <button
            type="button"
            className="clientes-add-button"
            onClick={abrirAgregar}
          >

            <Plus size={18} />

            Agregar cliente

          </button>

        </div>

      </div>


      {/* =================================================
          TABLA
      ================================================= */}

      <div className="clientes-table-container">

        <table className="clientes-table">

          <thead>

            <tr>

              <th>
                ID CLIENTE
              </th>

              <th>
                NOMBRE
              </th>

              <th>
                CORREO
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

            {clientesPaginados.map(
              (cliente) => (

                <tr
                  key={cliente.id}
                >

                  <td>

                    <strong className="cliente-id">
                      {cliente.id}
                    </strong>

                  </td>


                  <td>

                    <span className="cliente-nombre">
                      {cliente.nombre}
                    </span>

                  </td>


                  <td>

                    <span className="cliente-correo">
                      {cliente.correo}
                    </span>

                  </td>


                  {/* =================================================
                      ESTADO - SWITCH ACTIVO / INACTIVO
                  ================================================= */}

                  <td>

                    <button
                      type="button"
                      className="cliente-estado-control"
                      onClick={() =>
                        cambiarEstadoCliente(cliente)
                      }
                      title={
                        cliente.estado === "Activo"
                          ? "Cambiar a Inactivo"
                          : "Cambiar a Activo"
                      }
                    >

                      <span
                        className={
                          cliente.estado === "Activo"
                            ? "cliente-estado-toggle activo"
                            : "cliente-estado-toggle inactivo"
                        }
                      >

                        <span className="cliente-estado-toggle-circle"></span>

                      </span>


                      <span
                        className={
                          cliente.estado === "Activo"
                            ? "cliente-estado-label activo"
                            : "cliente-estado-label inactivo"
                        }
                      >

                        {cliente.estado === "Activo"
                          ? "ACTIVO"
                          : "INACTIVO"}

                      </span>

                    </button>

                  </td>


                  <td>

                    <div className="cliente-actions">


                      <button
                        type="button"
                        title="Ver cliente"
                        onClick={() =>
                          verDetalle(
                            cliente
                          )
                        }
                      >

                        <Eye size={18} />

                      </button>


                      <button
                        type="button"
                        title="Editar cliente"
                        onClick={() =>
                          abrirEditar(
                            cliente
                          )
                        }
                      >

                        <Pencil size={18} />

                      </button>


                      <button
                        type="button"
                        title="Eliminar cliente"
                        onClick={() =>
                          eliminarCliente(
                            cliente
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


            {clientesFiltrados.length === 0 && (

              <tr>

                <td
                  colSpan="5"
                  className="clientes-empty"
                >

                  No se encontraron clientes.

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

        <div className="cliente-modal-overlay">

          <div className="cliente-modal">


            <div className="cliente-modal-header">

              <h3>
                {modoEdicion
                  ? "Editar Cliente"
                  : "Agregar Cliente"}
              </h3>


              <button
                type="button"
                className="cliente-modal-close"
                onClick={cerrarModal}
              >

                <X size={21} />

              </button>

            </div>


            <div className="cliente-modal-body">


              {/* ID + ESTADO */}

              <div className="cliente-form-row">

                <div className="cliente-form-group">

                  <label>
                    ID CLIENTE
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.id
                    }
                    disabled
                  />

                </div>


                <div className="cliente-form-group">

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

                    <option value="Activo">
                      Activo
                    </option>

                    <option value="Inactivo">
                      Inactivo
                    </option>

                  </select>

                </div>

              </div>


              {/* NOMBRE + CORREO */}

              <div className="cliente-form-row">

                <div className="cliente-form-group">

                  <label>
                    NOMBRE COMPLETO
                  </label>

                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={
                      formulario.nombre
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "nombre",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="cliente-form-group">

                  <label>
                    CORREO ELECTRÓNICO
                  </label>

                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={
                      formulario.correo
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "correo",
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>


              {/* TELÉFONO + FECHA */}

              <div className="cliente-form-row">

                <div className="cliente-form-group">

                  <label>
                    TELÉFONO
                  </label>

                  <input
                    type="text"
                    placeholder="+57 300 000 0000"
                    value={
                      formulario.telefono
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "telefono",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="cliente-form-group">

                  <label>
                    FECHA DE REGISTRO
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


              {/* DIRECCIÓN */}

              <div className="cliente-form-group">

                <label>
                  DIRECCIÓN
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


            </div>


            {/* FOOTER */}

            <div className="cliente-modal-footer">

              <button
                type="button"
                className="cliente-cancel-button"
                onClick={cerrarModal}
              >

                Cancelar

              </button>


              <button
                type="button"
                className="cliente-create-button"
                onClick={guardarCliente}
              >

                {modoEdicion
                  ? "Guardar cambios"
                  : "Crear cliente"}

              </button>

            </div>


          </div>

        </div>

      )}


      {/* =================================================
          MODAL DETALLE
      ================================================= */}

      {mostrarDetalle &&
        clienteSeleccionado && (

        <div className="cliente-modal-overlay">

          <div className="cliente-modal">


            <div className="cliente-modal-header">

              <h3>
                Detalle del Cliente
              </h3>


              <button
                type="button"
                className="cliente-modal-close"
                onClick={cerrarDetalle}
              >

                <X size={21} />

              </button>

            </div>


            <div className="cliente-modal-body">


              <div className="cliente-form-row">

                <div className="cliente-info-group">

                  <label>
                    ID CLIENTE
                  </label>

                  <div className="cliente-info-value">
                    {clienteSeleccionado.id}
                  </div>

                </div>


                <div className="cliente-info-group">

                  <label>
                    ESTADO
                  </label>

                  <div className="cliente-info-value">

                    <span
                      className={
                        clienteSeleccionado.estado ===
                        "Activo"
                          ? "cliente-estado activo"
                          : "cliente-estado inactivo"
                      }
                    >
                      {clienteSeleccionado.estado}
                    </span>

                  </div>

                </div>

              </div>


              <div className="cliente-form-row">

                <div className="cliente-info-group">

                  <label>
                    NOMBRE COMPLETO
                  </label>

                  <div className="cliente-info-value">
                    {clienteSeleccionado.nombre}
                  </div>

                </div>


                <div className="cliente-info-group">

                  <label>
                    CORREO ELECTRÓNICO
                  </label>

                  <div className="cliente-info-value">
                    {clienteSeleccionado.correo}
                  </div>

                </div>

              </div>


              <div className="cliente-form-row">

                <div className="cliente-info-group">

                  <label>
                    TELÉFONO
                  </label>

                  <div className="cliente-info-value">
                    {clienteSeleccionado.telefono}
                  </div>

                </div>


                <div className="cliente-info-group">

                  <label>
                    FECHA DE REGISTRO
                  </label>

                  <div className="cliente-info-value">
                    {formatearFecha(
                      clienteSeleccionado.fecha
                    )}
                  </div>

                </div>

              </div>


              <div className="cliente-info-group">

                <label>
                  DIRECCIÓN
                </label>

                <div className="cliente-info-value">
                  {clienteSeleccionado.direccion}
                </div>

              </div>


              {/* HISTORIAL */}

              <div className="cliente-history">

                <div className="cliente-history-header">

                  <label>
                    HISTORIAL DE PEDIDOS
                  </label>

                  <span>
                    {clienteSeleccionado.pedidos} pedidos
                  </span>

                </div>


                <div className="cliente-history-item">

                  <div>

                    <strong>
                      Historial de compras
                    </strong>

                    <span>
                      Consulta los pedidos realizados por este cliente.
                    </span>

                  </div>

                </div>

              </div>


            </div>


            <div className="cliente-modal-footer">

              <button
                type="button"
                className="cliente-cancel-button"
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