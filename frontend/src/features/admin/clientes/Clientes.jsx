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
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";

import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  cambiarEstadoCliente as cambiarEstadoClienteApi,
  eliminarCliente as eliminarClienteApi
} from "../../../services/api";

const REGISTROS_POR_PAGINA = 6;


export default function Clientes() {

  // =====================================================
  // CLIENTES
  // =====================================================

  const [clientes, setClientes] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [errorCarga, setErrorCarga] = useState("");

  const mapearCliente = (cliente) => ({
    ...cliente,
    id: `CLI-${String(cliente.id).padStart(3, "0")}`
  });

  const idBackend = (id) => Number(String(id).replace(/\D/g, ""));

  useEffect(() => {
    obtenerClientes()
      .then((data) => {
        setClientes(data.map(mapearCliente));
      })
      .catch(() => {
        setErrorCarga("No se pudo conectar con el servidor");
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);



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

  const [clienteEliminar, setClienteEliminar] =
    useState(null);

  const [aviso, setAviso] = useState(null);

  const [confirmarEdicion, setConfirmarEdicion] =
    useState(false);

  const { toast, mostrarToast } = useToast();


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

  const [errores, setErrores] = useState({});

  const manejarErrorServidor = (error) => {

    const mensaje =
      error?.message || "No se pudo completar la operación";

    if (/correo/i.test(mensaje) && /existe|registrado/i.test(mensaje)) {

      setErrores((actuales) => ({ ...actuales, correo: mensaje }));

    } else {

      mostrarToast(mensaje, "error");

    }

  };


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

  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(clientesFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio =
    (paginaActual - 1) * REGISTROS_POR_PAGINA;
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

    setErrores({});

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

          const nuevos = {
            ...actuales
          };
          delete nuevos[campo];
          return nuevos;
        }
      );
    }

  };


  // =====================================================
  // CAMBIAR ESTADO DEL CLIENTE
  // =====================================================

  const cambiarEstadoCliente = async (cliente) => {

    try {

      const actualizado = mapearCliente(
        await cambiarEstadoClienteApi(idBackend(cliente.id))
      );

      setClientes(
        (actuales) =>
          actuales.map(
            (item) =>
              item.id === cliente.id ? actualizado : item
          )
      );

      // Si el detalle del cliente está abierto,
      // también actualizamos el cliente seleccionado.
      if (
        clienteSeleccionado &&
        clienteSeleccionado.id === cliente.id
      ) {

        setClienteSeleccionado(actualizado);

      }

    } catch (error) {

      manejarErrorServidor(error);

    }

  };


  // =====================================================
  // GUARDAR CLIENTE
  // =====================================================

  const guardarCliente = async () => {

    const nuevosErrores = {};

    if (
      !formulario.nombre.trim()
    ) {
      nuevosErrores.nombre = "Este campo es obligatorio.";
    } else {

      const nombreNormalizado =
        formulario.nombre
          .trim()
          .toLowerCase();

      const yaExiste = clientes.some(
        (item) =>
          item.nombre.trim().toLowerCase() ===
            nombreNormalizado &&
          (!modoEdicion ||
            item.id !== formulario.id)
      );

      if (yaExiste) {
        nuevosErrores.nombre =
          "Ya existe un registro con este nombre.";
      }

    }

    if (
      formulario.nombre.trim().length > 20
    ) {
      nuevosErrores.nombre = "El nombre no puede superar los 20 caracteres.";
    }

    if (
      !formulario.correo.trim()
    ) {
      nuevosErrores.correo = "Este campo es obligatorio.";
    }

    if (
      !formulario.telefono.trim()
    ) {
      nuevosErrores.telefono = "Este campo es obligatorio.";
    }

    if (
      formulario.telefono.length > 10
    ) {
      nuevosErrores.telefono = "El teléfono no puede superar los 10 dígitos.";
    }

    if (
      !formulario.direccion.trim()
    ) {
      nuevosErrores.direccion = "Este campo es obligatorio.";
    }

    setErrores(nuevosErrores);

    if (
      Object.keys(nuevosErrores).length > 0
    ) {

      return;

    }

if (modoEdicion) {

      setConfirmarEdicion(true);

      return;

    }

    try {

      const nuevoCliente = mapearCliente(
        await crearCliente({

          nombre: formulario.nombre,

          correo: formulario.correo,

          telefono: formulario.telefono,

          direccion: formulario.direccion

        })
      );

      setClientes(
        (actuales) => [
          nuevoCliente,
          ...actuales
        ]
      );

      mostrarToast("Cliente creado con éxito");

      cerrarModal();

    } catch (error) {

      manejarErrorServidor(error);

    }

  };


  const confirmarEdicionCliente = async () => {

    try {

      const actualizado = mapearCliente(
        await actualizarCliente(idBackend(formulario.id), {

          nombre: formulario.nombre,

          correo: formulario.correo,

          telefono: formulario.telefono,

          direccion: formulario.direccion

        })
      );

      setClientes(
        (actuales) =>
          actuales.map(
            (cliente) =>
              cliente.id === formulario.id
                ? actualizado
                : cliente
          )
      );

      setConfirmarEdicion(false);

      cerrarModal();

      mostrarToast("Cliente actualizado con éxito");

    } catch (error) {

      setConfirmarEdicion(false);

      manejarErrorServidor(error);

    }

  };


  // =====================================================
  // ELIMINAR CLIENTE
  // =====================================================

  const eliminarCliente = (cliente) => {

    if (
      cliente.estado === "Activo"
    ) {

      setAviso(
        "No se puede eliminar un cliente activo. Primero cambia su estado a Inactivo."
      );

      return;

    }

    setClienteEliminar(cliente);

  };

  const confirmarEliminarCliente = async () => {

    try {

      await eliminarClienteApi(idBackend(clienteEliminar.id));

      setClientes(
        (actuales) =>
          actuales.filter(
            (item) =>
              item.id !== clienteEliminar.id
          )
      );

      setClienteEliminar(null);

      mostrarToast("Cliente eliminado con éxito");

    } catch (error) {

      setClienteEliminar(null);

      manejarErrorServidor(error);

    }

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

            Registrar cliente

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
                        title="Actualizar cliente"
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


            {cargando && (

              <tr>

                <td
                  colSpan="5"
                  className="clientes-empty"
                >

                  Cargando...

                </td>

              </tr>

            )}


            {errorCarga && !cargando && (

              <tr>

                <td
                  colSpan="5"
                  className="clientes-empty"
                >

                  {errorCarga}

                </td>

              </tr>

            )}


            {!cargando &&
              !errorCarga &&
              clientesFiltrados.length === 0 && (

              <tr>

                <td
                  colSpan="5"
                  className="clientes-empty"
                >

                  Cliente no encontrado en el sistema.

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

        <div className="cliente-modal-overlay">

          <div className="cliente-modal">


            <div className="cliente-modal-header">

              <h3>
                {modoEdicion
                  ? "Actualizar Cliente"
                  : "Registrar Cliente"}
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
                    maxLength={20}
                    value={
                      formulario.nombre
                    }
                    className={`input ${errores.nombre ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "nombre",
                        e.target.value.replace(
                          /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
                          ""
                        )
                      )
                    }
                  />

                  {errores.nombre && (
                    <span className="error-text">
                      {errores.nombre}
                    </span>
                  )}

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
                    className={`input ${errores.correo ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "correo",
                        e.target.value
                      )
                    }
                  />

                  {errores.correo && (
                    <span className="error-text">
                      {errores.correo}
                    </span>
                  )}

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
                    maxLength={10}
                    value={
                      formulario.telefono
                    }
                    className={`input ${errores.telefono ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "telefono",
                        e.target.value.replace(
                          /[^0-9]/g,
                          ""
                        )
                      )
                    }
                  />

                  {errores.telefono && (
                    <span className="error-text">
                      {errores.telefono}
                    </span>
                  )}

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
                  className={`input ${errores.direccion ? "input-error" : ""}`}
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
                className="cliente-cancel-button detail-cerrar-button"
                onClick={cerrarDetalle}
              >

                Cerrar

              </button>

            </div>


          </div>

        </div>

      )}

      {clienteEliminar && (
        <ConfirmDialog
          abierto={clienteEliminar !== null}
          titulo="Eliminar cliente"
          mensaje={
            <>¿Deseas eliminar al cliente "
              <strong>{clienteEliminar.nombre}</strong>"? Esta
              acción no se puede deshacer.</>
          }
          textoConfirmar="Eliminar"
          textoCancelar="Cancelar"
          variante="peligro"
          onConfirmar={confirmarEliminarCliente}
          onCancelar={() =>
            setClienteEliminar(null)
          }
        />
      )}

      <ConfirmDialog
        abierto={aviso !== null}
        titulo="Aviso"
        mensaje={aviso}
        textoConfirmar="Entendido"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={() => setAviso(null)}
        onCancelar={() => setAviso(null)}
      />

      <ConfirmDialog
        abierto={confirmarEdicion}
        titulo="Confirmar cambios"
        mensaje={
          <>¿Deseas guardar los cambios realizados en el cliente "
            <strong>{formulario.nombre.trim()}</strong>"?</>
        }
        textoConfirmar="Guardar cambios"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEdicionCliente}
        onCancelar={() => setConfirmarEdicion(false)}
      />

      <Toast toast={toast} />

    </div>

  );

}