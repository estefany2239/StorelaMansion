import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  MailPlus,
  Pencil,
  Trash2,
  X
} from "lucide-react";

import "./Clientes.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import useValidacionFormulario from "../../../shared/hooks/useValidacionFormulario";
import { tienePermiso } from "../utils/permisos";
import { formatoCliente } from "../utils/ids";

import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  cambiarEstadoCliente as cambiarEstadoClienteApi,
  eliminarCliente as eliminarClienteApi,
  reenviarInvitacionUsuarioAdmin
} from "../../../shared/services/api";

const REGISTROS_POR_PAGINA = 6;


export default function Clientes({ user }) {

  // =====================================================
  // PERMISOS (los botones sin permiso se ocultan)
  // =====================================================

  const puedeCrear = tienePermiso(user, "Clientes", "Crear");
  const puedeActualizar = tienePermiso(user, "Clientes", "Actualizar");
  const puedeEliminar = tienePermiso(user, "Clientes", "Eliminar");
  const puedeCambiarEstado = tienePermiso(user, "Clientes", "Cambiar estado");
  const puedeConsultar = tienePermiso(user, "Clientes", "Consultar");

  // El correo de invitación se envía con la ruta de Usuarios del backend,
  // por eso el botón se muestra solo con ese permiso.
  const puedeInvitar = tienePermiso(user, "Usuarios", "Actualizar");

  // =====================================================
  // CLIENTES
  // =====================================================

  const [clientes, setClientes] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [errorCarga, setErrorCarga] = useState("");

  const mapearCliente = (cliente) => ({
    ...cliente,
    id: formatoCliente(cliente.id)
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

  // Cliente elegido para enviar/reenviar la invitación por correo
  const [clienteInvitar, setClienteInvitar] =
    useState(null);

  // id (CLI-001) del cliente cuyo correo se está enviando en este momento
  const [enviandoInvitacion, setEnviandoInvitacion] =
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
    tipoDocumento: "",
    documento: "",
    fechaNacimiento: "",
    estado: "Activo",
    fecha: "2026-09-07",
    // Solo al crear: envía el correo de invitación con contraseña temporal.
    invitar: true
  });

  // Reglas alineadas con validarCliente() del backend (clientes.js):
  // nombre (letras/espacios, máx. 20), correo válido, teléfono (dígitos,
  // máx. 10) y dirección obligatoria. Tipo/número de documento van juntos
  // (ambos vacíos o ambos con valor) y la fecha de nacimiento es opcional.
  const REGLAS_CLIENTE = {
    tipoDocumento: (valor, form) => {
      const tipo = String(valor || "").trim();
      const documento = String(form.documento || "").trim();

      if (!tipo && documento) {
        return "Si indicas el número de documento, también debes elegir el tipo.";
      }

      return "";
    },
    documento: (valor, form) => {
      const tipo = String(form.tipoDocumento || "").trim();
      const documento = String(valor || "").trim();

      if (tipo && !documento) {
        return "Si eliges el tipo de documento, también debes indicar el número.";
      }

      if (!tipo && documento) {
        return "Si indicas el número de documento, también debes elegir el tipo.";
      }

      if (!documento) {
        return "";
      }

      if (tipo === "CC") {
        return /^\d{6,10}$/.test(documento)
          ? ""
          : "El documento CC debe tener entre 6 y 10 dígitos.";
      }

      if (tipo === "NIT") {
        return /^[0-9-]{5,15}$/.test(documento) && /\d/.test(documento)
          ? ""
          : "El documento NIT debe tener entre 5 y 15 caracteres (dígitos y guion).";
      }

      return /^[A-Za-z0-9]{5,15}$/.test(documento)
        ? ""
        : `El documento ${tipo} debe tener entre 5 y 15 letras o números.`;
    },
    fechaNacimiento: (valor) => {
      const fecha = String(valor || "").trim();

      if (!fecha) {
        return "";
      }

      const fechaDate = new Date(`${fecha}T00:00:00`);

      if (Number.isNaN(fechaDate.getTime())) {
        return "La fecha de nacimiento no es válida.";
      }

      if (fechaDate.getTime() > Date.now()) {
        return "La fecha de nacimiento no puede ser futura.";
      }

      if (fechaDate.getFullYear() < 1900) {
        return "La fecha de nacimiento no puede ser anterior a 1900.";
      }

      return "";
    },
    nombre: (valor) => {
      const nombre = String(valor || "").trim();

      if (!nombre) {
        return "Este campo es obligatorio.";
      }

      const yaExiste = clientes.some(
        (item) =>
          item.nombre.trim().toLowerCase() ===
            nombre.toLowerCase() &&
          (!modoEdicion || item.id !== formulario.id)
      );

      if (yaExiste) {
        return "Ya existe un registro con este nombre.";
      }

      if (nombre.length > 20) {
        return "El nombre no puede superar los 20 caracteres.";
      }

      return "";
    },
    correo: (valor) => {
      const correo = String(valor || "").trim();

      if (!correo) {
        return "Este campo es obligatorio.";
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return "El correo no es válido.";
      }

      return "";
    },
    telefono: (valor) => {
      const telefono = String(valor || "").trim();

      if (!telefono) {
        return "Este campo es obligatorio.";
      }

      if (!/^[0-9]+$/.test(telefono) || telefono.length > 10) {
        return "El teléfono no puede superar los 10 dígitos.";
      }

      return "";
    },
    direccion: (valor) =>
      String(valor || "").trim()
        ? ""
        : "Este campo es obligatorio."
  };

  const {
    errores,
    manejarBlur,
    revisarCampo,
    validarTodo,
    limpiarValidacion,
    setErrores
  } = useValidacionFormulario(REGLAS_CLIENTE);

  const manejarErrorServidor = (error) => {

    const mensaje =
      error?.message || "No se pudo completar la operación";

    // Correo repetido: se muestra bajo el campo. Cubre los mensajes del
    // backend ("ya existe", "ya está registrado", "ya tiene una cuenta" y
    // el que orienta a revisar la invitación).
    if (/correo/i.test(mensaje) && /existe|registrado|cuenta|invitación/i.test(mensaje)) {

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
          .includes(texto) ||

        String(cliente.documento || "")
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

    setFormulario({

      id: formatoCliente(clientes.length + 1),

      nombre: "",

      correo: "",

      telefono: "",

      direccion: "",

      tipoDocumento: "",

      documento: "",

      fechaNacimiento: "",

      estado: "Activo",

      fecha: "2026-09-07",

      invitar: true

    });

    limpiarValidacion();

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

      tipoDocumento: cliente.tipo_documento || "",

      documento: cliente.documento || "",

      fechaNacimiento: cliente.fecha_nacimiento || "",

      estado: cliente.estado,

      fecha: cliente.fecha

    });

    limpiarValidacion();

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

    const siguiente = {
      ...formulario,
      [campo]: valor
    };

    setFormulario(siguiente);

    // Si el campo ya fue tocado, su error se recalcula al instante
    // (desaparece en cuanto el valor es válido).
    revisarCampo(campo, valor, siguiente);

    // Tipo y número de documento son un par: al cambiar uno se revisa
    // también el otro para que su error no quede desactualizado.
    if (campo === "documento") {
      revisarCampo("tipoDocumento", siguiente.tipoDocumento, siguiente);
    } else if (campo === "tipoDocumento") {
      revisarCampo("documento", siguiente.documento, siguiente);
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

    // Valida todo el formulario (mismas reglas que el backend) y,
    // si hay errores, enfoca el primer campo inválido.
    if (!validarTodo(formulario)) {
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

          direccion: formulario.direccion,

          tipo_documento: formulario.tipoDocumento,

          documento: formulario.documento,

          fecha_nacimiento: formulario.fechaNacimiento,

          // El backend genera la contraseña temporal y solo la envía por
          // correo: aquí nunca se recibe ni se guarda.
          invitar: formulario.invitar === true

        })
      );

      setClientes(
        (actuales) => [
          nuevoCliente,
          ...actuales
        ]
      );

      // Si se pidió invitar y el envío falló, el cliente quedó en ficha y
      // se puede reenviar desde la tabla: se deja un aviso que permanece
      // hasta que el administrador lo cierre.
      if (formulario.invitar && nuevoCliente.invitacionEnviada === false) {
        setAviso(
          "Cliente creado, pero no se pudo enviar el correo de invitación. " +
            "El cliente todavía no tiene contraseña: usa el botón de invitación " +
            "de la tabla para reenviarla."
        );
      } else if (formulario.invitar) {
        mostrarToast("Cliente creado e invitación enviada");
      } else {
        mostrarToast("Cliente creado con éxito");
      }

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

          direccion: formulario.direccion,

          tipo_documento: formulario.tipoDocumento,

          documento: formulario.documento,

          fecha_nacimiento: formulario.fechaNacimiento

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
  // ENVIAR / REENVIAR INVITACIÓN POR CORREO
  // =====================================================

  // La invitación solo se ofrece a quien todavía no conoce su contraseña:
  // las fichas sin acceso (accesoWeb = FALSE) y las cuentas con clave
  // temporal pendiente. A una cuenta real con su propia contraseña nunca se
  // le genera otra (el backend la rechaza con 409).
  const puedeInvitarCliente = (cliente) =>
    !cliente.accesoWeb || cliente.cambioContrasenaPendiente;

  // Insignia de la columna INVITACIÓN.
  const estadoInvitacion = (cliente) => {
    if (cliente.invitacionEnviada) {
      return { clase: "enviada", texto: "Enviada" };
    }
    if (puedeInvitarCliente(cliente)) {
      return { clase: "pendiente", texto: "No enviada" };
    }
    return { clase: "cuenta", texto: "" };
  };

  const enviarInvitacionCliente = async () => {
    const objetivo = clienteInvitar;
    if (!objetivo || enviandoInvitacion) return;

    // El diálogo se cierra ya y el botón de la fila queda cargando.
    setClienteInvitar(null);
    setEnviandoInvitacion(objetivo.id);

    try {
      const respuesta = mapearCliente(
        await reenviarInvitacionUsuarioAdmin(idBackend(objetivo.id))
      );

      // La contraseña temporal solo viaja en el correo: nunca se guarda
      // en el estado ni se muestra en pantalla.
      delete respuesta.contrasenaTemporal;

      setClientes((actuales) =>
        actuales.map((item) =>
          item.id === objetivo.id
            ? {
                ...item,
                invitacionEnviada: respuesta.invitacionEnviada,
                cambioContrasenaPendiente:
                  respuesta.cambioContrasenaPendiente,
                accesoWeb: respuesta.accesoWeb
              }
            : item
        )
      );

      if (respuesta.invitacionEnviada) {
        mostrarToast("Invitación enviada con éxito");
      } else {
        // El correo no salió: aviso persistente, no un toast que desaparece.
        setAviso(
          "No se pudo enviar el correo de invitación. El cliente sigue sin " +
            "contraseña: vuelve a intentarlo desde la tabla."
        );
      }
    } catch (error) {
      // Límite de reenvíos, permiso o cuenta real: van al toast.
      mostrarToast(
        error?.message || "No se pudo enviar la invitación",
        "error"
      );
    } finally {
      setEnviandoInvitacion(null);
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

          {puedeConsultar && (
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
          )}


          {puedeCrear && (
            <button
              type="button"
              className="clientes-add-button"
              onClick={abrirAgregar}
            >

              <Plus size={18} />

              Registrar cliente

            </button>
          )}

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
                DOCUMENTO
              </th>

              <th>
                CORREO
              </th>

              <th>
                ESTADO
              </th>

              <th>
                INVITACIÓN
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

                    <span className="cliente-documento">
                      {cliente.documento
                        ? `${cliente.tipo_documento ? cliente.tipo_documento + " " : ""}${cliente.documento}`
                        : "—"}
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

                    {puedeCambiarEstado ? (

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

                    ) : (

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

                    )}

                  </td>


                  {/* =================================================
                      INVITACIÓN POR CORREO
                  ================================================= */}

                  <td>

                    <span
                      className={`cliente-invitacion-badge ${estadoInvitacion(cliente).clase}`}
                    >

                      {estadoInvitacion(cliente).texto}

                    </span>

                  </td>


                  <td>

                    <div className="cliente-actions">


                      {puedeConsultar && (
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
                      )}


                      {puedeActualizar && (
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
                      )}


                      {puedeInvitar && puedeInvitarCliente(cliente) && (
                        <button
                          type="button"
                          className={
                            enviandoInvitacion === cliente.id
                              ? "cliente-invitar enviando"
                              : "cliente-invitar"
                          }
                          title={
                            cliente.accesoWeb
                              ? "Reenviar invitación por correo"
                              : "Enviar invitación por correo"
                          }
                          disabled={enviandoInvitacion === cliente.id}
                          onClick={() =>
                            setClienteInvitar(cliente)
                          }
                        >

                          <MailPlus size={18} />

                        </button>
                      )}


                      {puedeEliminar && (
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
                      )}


                    </div>

                  </td>

                </tr>

              )
            )}


            {cargando && (

              <tr>

                <td
                  colSpan="7"
                  className="clientes-empty"
                >

                  Cargando...

                </td>

              </tr>

            )}


            {errorCarga && !cargando && (

              <tr>

                <td
                  colSpan="7"
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
                  colSpan="7"
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


              {/* =================================================
                  TARJETA 1 — DATOS PERSONALES
              ================================================= */}

              <div className="cliente-form-card">

                <h4 className="cliente-form-card-title">
                  Datos personales
                </h4>


                {/* TIPO + NÚMERO DE DOCUMENTO */}

                <div className="cliente-form-row">

                  <div className="cliente-form-group">

                    <label>
                      TIPO DE DOCUMENTO
                    </label>

                    <select
                      id="campo-tipoDocumento"
                      value={
                        formulario.tipoDocumento
                      }
                      className={`input ${errores.tipoDocumento ? "input-error" : ""}`}
                      onChange={(e) =>
                        cambiarCampo(
                          "tipoDocumento",
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        manejarBlur(
                          "tipoDocumento",
                          formulario.tipoDocumento,
                          formulario
                        )
                      }
                    >

                      <option value="">
                        Sin documento
                      </option>

                      <option value="CC">
                        CC — Cédula de ciudadanía
                      </option>

                      <option value="CE">
                        CE — Cédula de extranjería
                      </option>

                      <option value="NIT">
                        NIT
                      </option>

                      <option value="Pasaporte">
                        Pasaporte
                      </option>

                    </select>

                    {errores.tipoDocumento && (
                      <span className="error-text">
                        {errores.tipoDocumento}
                      </span>
                    )}

                  </div>


                  <div className="cliente-form-group">

                    <label>
                      NÚMERO DE DOCUMENTO
                    </label>

                    <input
                      type="text"
                      id="campo-documento"
                      placeholder="Opcional"
                      maxLength={15}
                      value={
                        formulario.documento
                      }
                      className={`input ${errores.documento ? "input-error" : ""}`}
                      onChange={(e) =>
                        cambiarCampo(
                          "documento",
                          e.target.value.replace(
                            /[^0-9A-Za-z-]/g,
                            ""
                          )
                        )
                      }
                      onBlur={() =>
                        manejarBlur(
                          "documento",
                          formulario.documento,
                          formulario
                        )
                      }
                    />

                    {errores.documento && (
                      <span className="error-text">
                        {errores.documento}
                      </span>
                    )}

                  </div>

                </div>


                {/* NOMBRE + FECHA DE NACIMIENTO */}

                <div className="cliente-form-row">

                  <div className="cliente-form-group">

                    <label>
                      NOMBRE COMPLETO
                    </label>

                    <input
                      type="text"
                      id="campo-nombre"
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
                      onBlur={() =>
                        manejarBlur(
                          "nombre",
                          formulario.nombre,
                          formulario
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
                      FECHA DE NACIMIENTO
                    </label>

                    <input
                      type="date"
                      id="campo-fechaNacimiento"
                      value={
                        formulario.fechaNacimiento
                      }
                      className={`input ${errores.fechaNacimiento ? "input-error" : ""}`}
                      onChange={(e) =>
                        cambiarCampo(
                          "fechaNacimiento",
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        manejarBlur(
                          "fechaNacimiento",
                          formulario.fechaNacimiento,
                          formulario
                        )
                      }
                    />

                    {errores.fechaNacimiento && (
                      <span className="error-text">
                        {errores.fechaNacimiento}
                      </span>
                    )}

                  </div>

                </div>


              </div>


              {/* =================================================
                  TARJETA 2 — DATOS DE CONTACTO
              ================================================= */}

              <div className="cliente-form-card">

                <h4 className="cliente-form-card-title">
                  Datos de contacto
                </h4>


                {/* CORREO + TELÉFONO */}

                <div className="cliente-form-row">

                  <div className="cliente-form-group">

                    <label>
                      CORREO ELECTRÓNICO
                    </label>

                    <input
                      type="email"
                      id="campo-correo"
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
                      onBlur={() =>
                        manejarBlur(
                          "correo",
                          formulario.correo,
                          formulario
                        )
                      }
                    />

                    {errores.correo && (
                      <span className="error-text">
                        {errores.correo}
                      </span>
                    )}

                  </div>


                  <div className="cliente-form-group">

                    <label>
                      TELÉFONO
                    </label>

                    <input
                      type="text"
                      id="campo-telefono"
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
                      onBlur={() =>
                        manejarBlur(
                          "telefono",
                          formulario.telefono,
                          formulario
                        )
                      }
                    />

                    {errores.telefono && (
                      <span className="error-text">
                        {errores.telefono}
                      </span>
                    )}

                  </div>

                </div>


                {/* DIRECCIÓN */}

                <div className="cliente-form-row">

                  <div className="cliente-form-group cliente-form-group-full">

                    <label>
                      DIRECCIÓN
                    </label>

                    <input
                      type="text"
                      id="campo-direccion"
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

                </div>


                {/* INVITACIÓN POR CORREO (solo al crear) */}

                {!modoEdicion && (
                  <div className="cliente-form-row">

                    <div className="cliente-invitar-box">

                      <label
                        className="cliente-invitar-check"
                        htmlFor="campo-invitar"
                      >

                        <input
                          type="checkbox"
                          id="campo-invitar"
                          checked={formulario.invitar === true}
                          onChange={(e) =>
                            cambiarCampo(
                              "invitar",
                              e.target.checked
                            )
                          }
                        />

                        <span>
                          Enviar invitación por correo
                        </span>

                      </label>

                      <p className="cliente-invitar-ayuda">
                        El cliente recibirá en su correo una contraseña
                        temporal para entrar a la tienda y deberá crear la
                        suya propia al iniciar sesión.
                      </p>

                    </div>

                  </div>
                )}


                {/* ESTADO (solo al editar) */}

                {modoEdicion && (
                  <div className="cliente-form-row">

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

      {clienteInvitar && (
        <ConfirmDialog
          abierto={clienteInvitar !== null}
          titulo={
            clienteInvitar.accesoWeb
              ? "Reenviar invitación"
              : "Enviar invitación"
          }
          mensaje={
            <>¿Enviar al cliente "
              <strong>{clienteInvitar.nombre}</strong>" un correo con una
              contraseña temporal para entrar a la tienda?
              {clienteInvitar.cambioContrasenaPendiente && (
                " La contraseña temporal anterior dejará de ser válida."
              )}</>
          }
          textoConfirmar="Enviar"
          textoCancelar="Cancelar"
          variante="info"
          onConfirmar={enviarInvitacionCliente}
          onCancelar={() => setClienteInvitar(null)}
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