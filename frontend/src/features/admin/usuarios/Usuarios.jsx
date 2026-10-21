import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  MailPlus
} from "lucide-react";

import "./Usuarios.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import useValidacionFormulario from "../../../hooks/useValidacionFormulario";
import { tienePermiso } from "../utils/permisos";
import {
  obtenerUsuariosAdmin,
  obtenerRolesAdmin,
  crearUsuarioAdmin,
  actualizarUsuarioAdmin,
  cambiarEstadoUsuarioAdmin,
  reenviarInvitacionUsuarioAdmin,
  eliminarUsuarioAdmin
} from "../../../services/api";

const REGISTROS_POR_PAGINA = 6;

// Mismo formato de correo que valida el backend (usuariosAdmin.js)
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reglas del formulario de usuario, alineadas con leerCuerpo() del backend:
// nombre obligatorio (máx. 100), correo válido, teléfono (máx. 30),
// dirección (máx. 255) y rol obligatorio.
const REGLAS_USUARIO = {
  nombre: (valor) => {
    const nombre = String(valor || "").trim();
    if (!nombre) return "Este campo es obligatorio.";
    if (nombre.length > 100) return "El nombre no puede superar los 100 caracteres.";
    return "";
  },
  correo: (valor) => {
    const correo = String(valor || "").trim();
    if (!correo) return "Este campo es obligatorio.";
    if (!CORREO_VALIDO.test(correo)) return "El correo no es válido.";
    return "";
  },
  telefono: (valor) => {
    const telefono = String(valor || "").trim();
    if (!telefono) return "Este campo es obligatorio.";
    if (telefono.length > 30) return "El teléfono es demasiado largo.";
    return "";
  },
  rol: (valor) => (valor ? "" : "Selecciona un rol."),
  direccion: (valor) => {
    const direccion = String(valor || "").trim();
    if (!direccion) return "Este campo es obligatorio.";
    if (direccion.length > 255) return "La dirección es demasiado larga.";
    return "";
  }
};


export default function Usuarios({ user }) {

  // =====================================================
  // PERMISOS (los botones sin permiso se ocultan)
  // =====================================================

  const puedeCrear = tienePermiso(user, "Usuarios", "Crear");
  const puedeActualizar = tienePermiso(user, "Usuarios", "Actualizar");
  const puedeEliminar = tienePermiso(user, "Usuarios", "Eliminar");
  const puedeCambiarEstado = tienePermiso(user, "Usuarios", "Cambiar estado");
  const puedeConsultar = tienePermiso(user, "Usuarios", "Consultar");

  // =====================================================
  // USUARIOS
  // =====================================================

  const [usuarios, setUsuarios] = useState([]);

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

  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState(null);

  const [usuarioEliminar, setUsuarioEliminar] =
    useState(null);

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
    rol: "Cliente",
    estado: "Activo",
    fecha: "",
    direccion: ""
  });

  const {
    errores,
    manejarBlur,
    revisarCampo,
    validarTodo,
    limpiarValidacion
  } = useValidacionFormulario(REGLAS_USUARIO);

  // =====================================================
  // ROLES
  // =====================================================

  const [roles, setRoles] = useState([]);

  // =====================================================
  // FECHA ACTUAL
  // =====================================================

  const obtenerFechaActual = () => {

    const fecha = new Date();

    const año = fecha.getFullYear();

    const mes = String(
      fecha.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
      fecha.getDate()
    ).padStart(2, "0");

    return `${año}-${mes}-${dia}`;
  };

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

    return `${partes[0]}-${partes[1]}-${partes[2]}`;
  };

  // =====================================================
  // BUSCADOR
  // =====================================================

  const usuariosFiltrados =
    usuarios.filter((usuario) => {

      const texto =
        busqueda
          .toLowerCase()
          .trim();

      if (!texto) {
        return true;
      }

      return (
        usuario.nombre
          .toLowerCase()
          .includes(texto) ||

        usuario.correo
          .toLowerCase()
          .includes(texto) ||

        usuario.rol
          .toLowerCase()
          .includes(texto) ||

        usuario.estado
          .toLowerCase()
          .includes(texto)
      );

    });

  // =====================================================
  // PAGINACIÓN DE LA TABLA
  // =====================================================

  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio =
    (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const usuariosPaginados = usuariosFiltrados.slice(
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

    setFormulario({

      id: "",

      nombre: "",

      correo: "",

      telefono: "",

      rol: roles.length > 0 ? roles[0] : "Cliente",

      estado: "Activo",

      fecha:
        obtenerFechaActual(),

      direccion: ""

    });

    limpiarValidacion();

    setModoEdicion(false);

    setMostrarModal(true);

  };

  // =====================================================
  // ABRIR EDITAR
  // =====================================================

  const abrirEditar = (usuario) => {

    setFormulario({

      id: usuario.id,

      nombre: usuario.nombre,

      correo: usuario.correo,

      telefono: usuario.telefono,

      rol: usuario.rol,

      estado: usuario.estado,

      fecha: usuario.fecha,

      direccion: usuario.direccion

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

  };

  // =====================================================
  // OBTENER PERMISOS SEGÚN ROL
  // =====================================================

  const obtenerPermisos = (rol) => {

    if (rol === "Administrador") {

      return [
        "Gestionar usuarios",
        "Gestionar productos",
        "Gestionar ventas",
        "Gestionar pedidos",
        "Gestionar domicilios"
      ];

    }

    if (rol === "Vendedor") {

      return [
        "Gestionar productos",
        "Gestionar ventas",
        "Gestionar pedidos"
      ];

    }

    return [
      "Gestionar pedidos"
    ];

  };

  // =====================================================
  // GUARDAR USUARIO
  // =====================================================

  const guardarUsuario = async () => {

    // Valida todo el formulario (mismas reglas que el backend) y,
    // si hay errores, enfoca el primer campo inválido.
    if (!validarTodo(formulario)) {
      return;
    }

    const permisos =
      obtenerPermisos(
        formulario.rol
      );

    if (modoEdicion) {

      setConfirmarEdicion(true);

      return;

    } else {

      try {
        const datos = {
          nombre: formulario.nombre.trim(),
          correo: formulario.correo.trim(),
          telefono: formulario.telefono.trim(),
          direccion: formulario.direccion.trim(),
          rol: formulario.rol,
          estado: formulario.estado
        };
        const fila = await crearUsuarioAdmin(datos);

        // El backend devuelve además la contraseña temporal y el enlace;
        // no deben quedar guardados en la tabla. invitacionEnviada y
        // cambioContrasenaPendiente sí se conservan para mostrar el estado.
        const {
          contrasenaTemporal,
          modoCorreo,
          enlaceInvitacion,
          ...usuarioFila
        } = fila;

        setUsuarios((actuales) => [
          { ...usuarioFila, permisos },
          ...actuales
        ]);

        if (!fila.invitacionEnviada) {
          mostrarToast(
            `Usuario creado, pero la invitación NO se envió. Usa "Reenviar invitación" en la lista o comparte la contraseña temporal ${contrasenaTemporal} para entrar en ${enlaceInvitacion}`,
            "error"
          );
        } else if (modoCorreo === "simulado") {
          mostrarToast(
            `Usuario creado. Invitación simulada a ${datos.correo} (Brevo sin configurar). Contraseña temporal: ${contrasenaTemporal}`
          );
        } else {
          mostrarToast(`Usuario creado. Invitación enviada a ${datos.correo}`);
        }
        cerrarModal();
      } catch (error) {
        mostrarToast(error.message, "error");
      }

      return;

    }

  };


  const confirmarEdicionUsuario = async () => {

    const permisos =
      obtenerPermisos(
        formulario.rol
      );

    try {
      const datos = {
        nombre: formulario.nombre.trim(),
        correo: formulario.correo.trim(),
        telefono: formulario.telefono.trim(),
        direccion: formulario.direccion.trim(),
        rol: formulario.rol,
        estado: formulario.estado
      };
      const fila = await actualizarUsuarioAdmin(formulario.id, datos);
      setUsuarios(
        (actuales) =>
          actuales.map(
            (usuario) =>
              usuario.id === formulario.id
                ? { ...fila, permisos }
                : usuario
          )
      );
      setConfirmarEdicion(false);
      cerrarModal();
    } catch (error) {
      mostrarToast(error.message, "error");
      setConfirmarEdicion(false);
    }

  };

  // =====================================================
  // REENVIAR INVITACIÓN
  // =====================================================

  const reenviarInvitacion = async (usuario) => {

    try {
      const fila = await reenviarInvitacionUsuarioAdmin(usuario.id);

      const {
        contrasenaTemporal,
        modoCorreo,
        enlaceInvitacion,
        ...usuarioFila
      } = fila;

      setUsuarios(
        (actuales) =>
          actuales.map(
            (item) =>
              item.id === usuario.id
                ? { ...item, ...usuarioFila }
                : item
          )
      );

      if (!fila.invitacionEnviada) {
        mostrarToast(
          `La invitación sigue sin enviarse. Comparte la contraseña temporal ${contrasenaTemporal} para entrar en ${enlaceInvitacion}`,
          "error"
        );
      } else if (modoCorreo === "simulado") {
        mostrarToast(
          `Invitación simulada a ${usuario.correo} (Brevo sin configurar). Contraseña temporal: ${contrasenaTemporal}`
        );
      } else {
        mostrarToast(`Invitación reenviada a ${usuario.correo}`);
      }
    } catch (error) {
      mostrarToast(error.message, "error");
    }

  };

  // =====================================================
  // CAMBIAR ESTADO
  // =====================================================

  const cambiarEstado = async (usuario) => {

    const nuevoEstado =
      usuario.estado === "Activo"
        ? "Inactivo"
        : "Activo";

    try {
      const fila = await cambiarEstadoUsuarioAdmin(usuario.id, nuevoEstado);
      setUsuarios(
        (actuales) =>
          actuales.map(
            (item) =>
              item.id === usuario.id
                ? { ...fila, permisos: obtenerPermisos(fila.rol) }
                : item
          )
      );
    } catch (error) {
      mostrarToast(error.message, "error");
    }

  };

  // =====================================================
  // ELIMINAR USUARIO
  // =====================================================

  const eliminarUsuario = (usuario) => {

    if (usuario.estado !== "Inactivo") {

      mostrarToast(
        "Solo se pueden eliminar los usuarios que estén en estado Inactivo.",
        "error"
      );

      return;

    }

    setUsuarioEliminar(usuario);

  };

  const confirmarEliminarUsuario = async () => {

    try {
      await eliminarUsuarioAdmin(usuarioEliminar.id);
      setUsuarios(
        (prev) =>
          prev.filter(
            (item) => item.id !== usuarioEliminar.id
          )
      );
      setUsuarioEliminar(null);
    } catch (error) {
      mostrarToast(error.message, "error");
      setUsuarioEliminar(null);
    }

  };

  // =====================================================
  // VER DETALLE
  // =====================================================

  const verDetalle = (usuario) => {

    setUsuarioSeleccionado(
      usuario
    );

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

    setUsuarioSeleccionado(null);

  };

  // =====================================================
  // CARGA INICIAL
  // =====================================================

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [usuariosData, rolesData] = await Promise.all([
          obtenerUsuariosAdmin(),
          obtenerRolesAdmin()
        ]);
        setUsuarios(usuariosData.map((u) => ({ ...u, permisos: obtenerPermisos(u.rol) })));
        setRoles(rolesData.roles || []);
      } catch (error) {
        mostrarToast(error.message, "error");
      }
    };
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatearIdUsuario = (id) => {
    const numero = Number(id);
    if (!Number.isInteger(numero)) return id;
    return `USR-${String(numero).padStart(3, "0")}`;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="usuarios-page">

      {/* =================================================
          ENCABEZADO
      ================================================= */}

      <div className="usuarios-header">

        <div className="usuarios-title">

          <h2>
            Usuarios
          </h2>

          <p>
            Gestiona los usuarios y sus accesos al sistema.
          </p>

        </div>

        <div className="usuarios-actions">

          {/* BUSCADOR */}

          {puedeConsultar && (
            <div className="usuarios-search">

              <Search size={18} />

              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(
                    e.target.value
                  )
                }
              />

            </div>
          )}

          {/* AGREGAR */}

          {puedeCrear && (
            <button
              type="button"
              className="usuarios-add-button"
              onClick={abrirAgregar}
            >

              <Plus size={18} />

              Registrar usuario

            </button>
          )}

        </div>

      </div>

      {/* =================================================
          TABLA
      ================================================= */}

      <div className="usuarios-table-container">

        <table className="usuarios-table">

          <thead>

            <tr>

              <th>
                ID USUARIO
              </th>

              <th>
                NOMBRE
              </th>

              <th>
                ROL
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

            {usuariosPaginados.map(
              (usuario) => (

                <tr
                  key={usuario.id}
                >

                  <td>

                    <strong className="usuario-id">
                      {formatearIdUsuario(usuario.id)}
                    </strong>

                  </td>

                  <td>

                    <span className="usuario-nombre">
                      {usuario.nombre}
                    </span>

                  </td>

                  <td>

                    <span className="usuario-rol">
                      {usuario.rol}
                    </span>

                  </td>

                  {/* =====================================
                      SWITCH ACTIVO / INACTIVO
                  ===================================== */}

                  <td>

                    <label className="switch-usuario-estado">

                      {puedeCambiarEstado && (
                        <input
                          type="checkbox"
                          checked={
                            usuario.estado === "Activo"
                          }
                          onChange={() =>
                            cambiarEstado(usuario)
                          }
                        />
                      )}

                      {puedeCambiarEstado && (
                        <span className="slider-usuario"></span>
                      )}

                      <span
                        className={`estado-usuario-texto ${
                          usuario.estado === "Activo"
                            ? "activo"
                            : "inactivo"
                        }`}
                      >
                        {usuario.estado.toUpperCase()}
                      </span>

                    </label>

                  </td>

                  {/* =====================================
                      ESTADO DE LA INVITACIÓN
                  ===================================== */}

                  <td>

                    {usuario.cambioContrasenaPendiente ? (
                      usuario.invitacionEnviada ? (
                        <span className="invitacion-badge enviada">
                          Enviada
                        </span>
                      ) : (
                        <span className="invitacion-badge fallida">
                          No enviada
                        </span>
                      )
                    ) : (
                      <span className="invitacion-badge no-aplica">
                        —
                      </span>
                    )}

                  </td>

                  <td>

                    <div className="usuario-actions">

                      {/* VER */}

                      {puedeConsultar && (
                        <button
                          type="button"
                          title="Ver usuario"
                          onClick={() =>
                            verDetalle(
                              usuario
                            )
                          }
                        >

                          <Eye size={18} />

                        </button>
                      )}

                      {/* EDITAR */}

                      {puedeActualizar && (
                        <button
                          type="button"
                          title="Actualizar usuario"
                          onClick={() =>
                            abrirEditar(
                              usuario
                            )
                          }
                        >

                          <Pencil
                            size={18}
                          />

                        </button>
                      )}

                      {/* REENVIAR INVITACIÓN (solo si sigue pendiente) */}

                      {puedeActualizar && usuario.cambioContrasenaPendiente && (
                        <button
                          type="button"
                          title="Reenviar invitación"
                          onClick={() =>
                            reenviarInvitacion(
                              usuario
                            )
                          }
                        >

                          <MailPlus size={18} />

                        </button>
                      )}

                      {/* ELIMINAR */}

                      {puedeEliminar && (
                        <button
                          type="button"
                          title={
                            usuario.estado ===
                            "Inactivo"
                              ? "Eliminar usuario"
                              : "Solo se puede eliminar un usuario Inactivo"
                          }
                          className={
                            usuario.estado ===
                            "Inactivo"
                              ? ""
                              : "disabled"
                          }
                          onClick={() =>
                            eliminarUsuario(
                              usuario
                            )
                          }
                        >

                          <Trash2
                            size={18}
                          />

                        </button>
                      )}

                    </div>

                  </td>

                </tr>

              )
            )}

            {usuariosFiltrados.length ===
              0 && (

              <tr>

                <td
                  colSpan="6"
                  className="usuarios-empty"
                >

                  Usuario no encontrado en el sistema.

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

        <div className="usuario-modal-overlay">

          <div className="usuario-modal">

            <div className="usuario-modal-header">

              <h3>

                {modoEdicion
                  ? "Actualizar Usuario"
                  : "Registrar Usuario"}

              </h3>

              <button
                type="button"
                className="usuario-modal-close"
                onClick={cerrarModal}
              >

                <X size={21} />

              </button>

            </div>

            <div className="usuario-modal-body">

              {/* ESTADO */}

              <div className="usuario-form-row">

                <div className="usuario-form-group">

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

              <div className="usuario-form-row">

                <div className="usuario-form-group">

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

                <div className="usuario-form-group">

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

              </div>

              {/* TELÉFONO + ROL */}

              <div className="usuario-form-row">

                <div className="usuario-form-group">

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

                <div className="usuario-form-group">

                  <label>
                    ROL
                  </label>

                  <select
                    id="campo-rol"
                    value={
                      formulario.rol
                    }
                    className={`input ${errores.rol ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "rol",
                        e.target.value
                      )
                    }
                    onBlur={() =>
                      manejarBlur(
                        "rol",
                        formulario.rol,
                        formulario
                      )
                    }
                  >

                    {roles.map(
                      (rol) => (

                        <option
                          key={rol}
                          value={rol}
                        >

                          {rol}

                        </option>

                      )
                    )}

                  </select>

                  {errores.rol && (
                    <span className="error-text">
                      {errores.rol}
                    </span>
                  )}

                </div>

              </div>

              {/* CONTRASEÑA (solo nota al crear) + FECHA (solo lectura al editar) */}

              <div className="usuario-form-row">

                {!modoEdicion && (
                  <div className="usuario-form-group">

                    <label>
                      CONTRASEÑA
                    </label>

                    <span className="usuarios-password-hint">
                      Se enviará una contraseña temporal al correo registrado.
                    </span>

                  </div>
                )}

                {modoEdicion && (
                  <div className="usuario-form-group">

                    <label>
                      FECHA DE REGISTRO
                    </label>

                    <input
                      type="date"
                      value={
                        formulario.fecha
                      }
                      disabled
                    />

                  </div>
                )}

              </div>

              {/* DIRECCIÓN */}

              <div className="usuario-form-group">

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

            {/* FOOTER */}

            <div className="usuario-modal-footer">

              <button
                type="button"
                className="usuario-cancel-button"
                onClick={cerrarModal}
              >

                Cancelar

              </button>

              <button
                type="button"
                className="usuario-create-button"
                onClick={guardarUsuario}
              >

                {modoEdicion
                  ? "Guardar cambios"
                  : "Crear usuario"}

              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
          MODAL DETALLE
      ================================================= */}

      {mostrarDetalle &&
        usuarioSeleccionado && (

        <div className="usuario-detail-overlay">

          <div className="usuario-detail-modal">

            <div className="usuario-detail-modal-header">

              <h3>
                Detalle del Usuario
              </h3>

              <button
                type="button"
                className="usuario-detail-modal-close"
                onClick={cerrarDetalle}
              >

                <X size={21} />

              </button>

            </div>

            <div className="usuario-detail-modal-body">

              {/* ID + ESTADO */}

              <div className="usuario-detail-row">

                <div className="usuario-info-group">

                  <label>
                    ID USUARIO
                  </label>

                    <div className="usuario-info-value">
                      {formatearIdUsuario(usuarioSeleccionado.id)}
                    </div>

                </div>

                <div className="usuario-info-group">

                  <label>
                    ESTADO
                  </label>

                  <div className="usuario-info-value">

                    <span
                      className={
                        usuarioSeleccionado.estado ===
                        "Activo"
                          ? "usuario-estado activo"
                          : "usuario-estado inactivo"
                      }
                    >

                      {usuarioSeleccionado.estado}

                    </span>

                  </div>

                </div>

              </div>

              {/* NOMBRE + CORREO */}

              <div className="usuario-detail-row">

                <div className="usuario-info-group">

                  <label>
                    NOMBRE COMPLETO
                  </label>

                  <div className="usuario-info-value">
                    {usuarioSeleccionado.nombre}
                  </div>

                </div>

                <div className="usuario-info-group">

                  <label>
                    CORREO ELECTRÓNICO
                  </label>

                  <div className="usuario-info-value">
                    {usuarioSeleccionado.correo}
                  </div>

                </div>

              </div>

              {/* TELÉFONO + ROL */}

              <div className="usuario-detail-row">

                <div className="usuario-info-group">

                  <label>
                    TELÉFONO
                  </label>

                  <div className="usuario-info-value">
                    {usuarioSeleccionado.telefono}
                  </div>

                </div>

                <div className="usuario-info-group">

                  <label>
                    ROL
                  </label>

                  <div className="usuario-info-value">
                    {usuarioSeleccionado.rol}
                  </div>

                </div>

              </div>

              {/* FECHA + DIRECCIÓN */}

              <div className="usuario-detail-row">

                <div className="usuario-info-group">

                  <label>
                    FECHA DE REGISTRO
                  </label>

                  <div className="usuario-info-value">
                    {formatearFecha(
                      usuarioSeleccionado.fecha
                    )}
                  </div>

                </div>

                <div className="usuario-info-group">

                  <label>
                    DIRECCIÓN
                  </label>

                  <div className="usuario-info-value">
                    {usuarioSeleccionado.direccion}
                  </div>

                </div>

              </div>

              {/* PERMISOS DEL ROL */}

              <div className="usuario-permisos">

                <div className="usuario-permisos-title">

                  <ShieldCheck size={18} />

                  <span>
                    Permisos asociados al rol
                  </span>

                </div>

                <div className="usuario-permisos-list">

                  {usuarioSeleccionado.permisos.map(
                    (permiso) => (

                      <span
                        key={permiso}
                        className="usuario-permiso"
                      >

                        {permiso}

                      </span>

                    )
                  )}

                </div>

              </div>

            </div>

            <div className="usuario-detail-modal-footer">

              <button
                type="button"
                className="usuario-cancel-button detail-cerrar-button"
                onClick={cerrarDetalle}
              >

                Cerrar

              </button>

            </div>

          </div>

        </div>

      )}

      {usuarioEliminar && (
        <ConfirmDialog
          abierto={usuarioEliminar !== null}
          titulo="Eliminar usuario"
          mensaje={
            <>¿Deseas eliminar al usuario "
              <strong>{usuarioEliminar.nombre}</strong>"? Esta
              acción no se puede deshacer.</>
          }
          textoConfirmar="Eliminar"
          textoCancelar="Cancelar"
          variante="peligro"
          onConfirmar={confirmarEliminarUsuario}
          onCancelar={() =>
            setUsuarioEliminar(null)
          }
        />
      )}

      <ConfirmDialog
        abierto={confirmarEdicion}
        titulo="Confirmar cambios"
        mensaje={
          <>¿Deseas guardar los cambios realizados en el usuario "
            <strong>{formulario.nombre.trim()}</strong>"?</>
        }
        textoConfirmar="Guardar cambios"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEdicionUsuario}
        onCancelar={() => setConfirmarEdicion(false)}
      />

      <Toast toast={toast} />

    </div>
  );
}