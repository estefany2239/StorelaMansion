import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  X,
  ShieldCheck
} from "lucide-react";

import "./Usuarios.css";

import Pagination from "../components/Pagination";

export default function Usuarios() {

  // =====================================================
  // USUARIOS
  // =====================================================

  const [usuarios, setUsuarios] = useState([
    {
      id: "USR-001",
      nombre: "Carlos Rodríguez",
      correo: "admin@storelamansion.com",
      rol: "Administrador",
      telefono: "+57 310 555 0001",
      estado: "Activo",
      fecha: "2024-01-15",
      direccion: "Calle 50 #45-20, Medellín",
      permisos: [
        "Gestionar usuarios",
        "Gestionar productos",
        "Gestionar ventas",
        "Gestionar pedidos",
        "Gestionar domicilios"
      ]
    },

    {
      id: "USR-002",
      nombre: "María García",
      correo: "cliente@storelamansion.com",
      rol: "Cliente",
      telefono: "+57 315 555 0002",
      estado: "Activo",
      fecha: "2024-02-20",
      direccion: "Cll 72 #10-34, Medellín",
      permisos: [
        "Gestionar pedidos"
      ]
    },

    {
      id: "USR-003",
      nombre: "Andrés López",
      correo: "andres@storelamansion.com",
      rol: "Vendedor",
      telefono: "+57 320 555 0003",
      estado: "Activo",
      fecha: "2024-03-10",
      direccion: "Cra 70 #15-30, Bogotá",
      permisos: [
        "Gestionar productos",
        "Gestionar ventas",
        "Gestionar pedidos"
      ]
    },

    {
      id: "USR-004",
      nombre: "Valentina Torres",
      correo: "valentina@email.com",
      rol: "Cliente",
      telefono: "+57 300 555 0004",
      estado: "Activo",
      fecha: "2024-04-05",
      direccion: "Av. 80 #33-15, Medellín",
      permisos: [
        "Gestionar pedidos"
      ]
    },

    {
      id: "USR-005",
      nombre: "Santiago Gómez",
      correo: "santiago@email.com",
      rol: "Cliente",
      telefono: "+57 311 555 0005",
      estado: "Inactivo",
      fecha: "2024-05-18",
      direccion: "Calle 10 #20-15, Medellín",
      permisos: [
        "Gestionar pedidos"
      ]
    },

    {
      id: "USR-006",
      nombre: "Marcela Ríos",
      correo: "marcela@email.com",
      rol: "Vendedor",
      telefono: "+57 318 555 0006",
      estado: "Activo",
      fecha: "2024-06-10",
      direccion: "Carrera 45 #22-40, Cali",
      permisos: [
        "Gestionar ventas",
        "Gestionar pedidos"
      ]
    },

    {
      id: "USR-007",
      nombre: "Diego Muñoz",
      correo: "diego@email.com",
      rol: "Cliente",
      telefono: "+57 320 555 0007",
      estado: "Inactivo",
      fecha: "2024-06-25",
      direccion: "Av. 68 #55-10, Bogotá",
      permisos: [
        "Gestionar pedidos"
      ]
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

  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState(null);

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
    direccion: "",
    contraseña: ""
  });

  // =====================================================
  // ROLES
  // =====================================================

  const roles = [
    "Administrador",
    "Vendedor",
    "Cliente"
  ];

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

  const REGISTROS_POR_PAGINA = 6;
  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
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

    const numero =
      String(
        usuarios.length + 1
      ).padStart(3, "0");

    setFormulario({

      id: `USR-${numero}`,

      nombre: "",

      correo: "",

      telefono: "",

      rol: "Cliente",

      estado: "Activo",

      fecha:
        obtenerFechaActual(),

      direccion: "",

      contraseña: ""

    });

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

      direccion: usuario.direccion,

      contraseña: ""

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

  const guardarUsuario = () => {

    if (
      !formulario.nombre.trim() ||
      !formulario.correo.trim() ||
      !formulario.telefono.trim() ||
      !formulario.rol ||
      !formulario.direccion.trim()
    ) {

      alert(
        "Completa todos los campos obligatorios."
      );

      return;

    }

    if (
      !modoEdicion &&
      !formulario.contraseña.trim()
    ) {

      alert(
        "Ingresa una contraseña para el usuario."
      );

      return;

    }

    const permisos =
      obtenerPermisos(
        formulario.rol
      );

    const usuarioActualizado = {

      id:
        formulario.id,

      nombre:
        formulario.nombre,

      correo:
        formulario.correo,

      telefono:
        formulario.telefono,

      rol:
        formulario.rol,

      estado:
        formulario.estado,

      fecha:
        formulario.fecha,

      direccion:
        formulario.direccion,

      permisos

    };

    if (modoEdicion) {

      setUsuarios(
        (actuales) =>
          actuales.map(
            (usuario) =>
              usuario.id === formulario.id
                ? {
                    ...usuarioActualizado
                  }
                : usuario
          )
      );

    } else {

      setUsuarios(
        (actuales) => [
          ...actuales,
          usuarioActualizado
        ]
      );

    }

    cerrarModal();

  };

  // =====================================================
  // CAMBIAR ESTADO
  // =====================================================

  const cambiarEstado = (usuario) => {

    const nuevoEstado =
      usuario.estado === "Activo"
        ? "Inactivo"
        : "Activo";

    setUsuarios(
      (actuales) =>
        actuales.map(
          (item) =>
            item.id === usuario.id
              ? {
                  ...item,
                  estado: nuevoEstado
                }
              : item
        )
    );

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

          {/* AGREGAR */}

          <button
            type="button"
            className="usuarios-add-button"
            onClick={abrirAgregar}
          >

            <Plus size={18} />

            Agregar usuario

          </button>

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
                      {usuario.id}
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

                      <input
                        type="checkbox"
                        checked={
                          usuario.estado === "Activo"
                        }
                        onChange={() =>
                          cambiarEstado(usuario)
                        }
                      />

                      <span className="slider-usuario"></span>

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

                  <td>

                    <div className="usuario-actions">

                      {/* VER */}

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

                      {/* EDITAR */}

                      <button
                        type="button"
                        title="Editar usuario"
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

                    </div>

                  </td>

                </tr>

              )
            )}

            {usuariosFiltrados.length ===
              0 && (

              <tr>

                <td
                  colSpan="5"
                  className="usuarios-empty"
                >

                  No se encontraron usuarios.

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

        <div className="usuario-modal-overlay">

          <div className="usuario-modal">

            <div className="usuario-modal-header">

              <h3>

                {modoEdicion
                  ? "Editar Usuario"
                  : "Agregar Usuario"}

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

              {/* ID + ESTADO */}

              <div className="usuario-form-row">

                <div className="usuario-form-group">

                  <label>
                    ID USUARIO
                  </label>

                  <input
                    type="text"
                    value={
                      formulario.id
                    }
                    disabled
                  />

                </div>

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

                <div className="usuario-form-group">

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

              {/* TELÉFONO + ROL */}

              <div className="usuario-form-row">

                <div className="usuario-form-group">

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

                <div className="usuario-form-group">

                  <label>
                    ROL
                  </label>

                  <select
                    value={
                      formulario.rol
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "rol",
                        e.target.value
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

                </div>

              </div>

              {/* CONTRASEÑA + FECHA */}

              <div className="usuario-form-row">

                <div className="usuario-form-group">

                  <label>
                    CONTRASEÑA
                  </label>

                  <input
                    type="password"
                    placeholder={
                      modoEdicion
                        ? "Dejar vacío para conservar"
                        : "Contraseña"
                    }
                    value={
                      formulario.contraseña
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "contraseña",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="usuario-form-group">

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

              <div className="usuario-form-group">

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

        <div className="usuario-modal-overlay">

          <div className="usuario-modal">

            <div className="usuario-modal-header">

              <h3>
                Detalle del Usuario
              </h3>

              <button
                type="button"
                className="usuario-modal-close"
                onClick={cerrarDetalle}
              >

                <X size={21} />

              </button>

            </div>

            <div className="usuario-modal-body">

              <div className="usuario-detail-header">

                <div className="usuario-detail-avatar">

                  {usuarioSeleccionado.nombre
                    .charAt(0)
                    .toUpperCase()}

                </div>

                <div>

                  <strong>
                    {usuarioSeleccionado.nombre}
                  </strong>

                  <span>
                    {usuarioSeleccionado.correo}
                  </span>

                </div>

              </div>

              <div className="usuario-detail-grid">

                <div className="usuario-info-group">

                  <label>
                    ID USUARIO
                  </label>

                  <div className="usuario-info-value">
                    {usuarioSeleccionado.id}
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
                    FECHA DE REGISTRO
                  </label>

                  <div className="usuario-info-value">
                    {formatearFecha(
                      usuarioSeleccionado.fecha
                    )}
                  </div>

                </div>

                <div className="usuario-info-group usuario-info-full">

                  <label>
                    DIRECCIÓN
                  </label>

                  <div className="usuario-info-value">
                    {usuarioSeleccionado.direccion}
                  </div>

                </div>

                <div className="usuario-info-group usuario-info-full">

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

            <div className="usuario-modal-footer">

              <button
                type="button"
                className="usuario-cancel-button"
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