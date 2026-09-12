import { useState, useEffect } from "react";

import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Shield,
} from "lucide-react";

import "./Roles.css";

import Pagination from "../components/Pagination";

const PERMISOS = [
  "Gestionar usuarios",
  "Gestionar productos",
  "Gestionar ventas",
  "Gestionar pedidos",
  "Gestionar domicilios",
];

export default function Roles() {
  const [roles, setRoles] = useState([
    {
      id: "ROL-001",
      nombre: "Administrador",
      permisos: [
        "Gestionar usuarios",
        "Gestionar productos",
        "Gestionar ventas",
        "Gestionar pedidos",
        "Gestionar domicilios",
      ],
      usuarios: 1,
      estado: "Activo",
    },
    {
      id: "ROL-002",
      nombre: "Vendedor",
      permisos: [
        "Gestionar productos",
        "Gestionar ventas",
        "Gestionar pedidos",
      ],
      usuarios: 2,
      estado: "Activo",
    },
    {
      id: "ROL-003",
      nombre: "Cliente",
      permisos: ["Gestionar pedidos"],
      usuarios: 12,
      estado: "Activo",
    },
  ]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const [modal, setModal] = useState(null);

  const [rolForm, setRolForm] = useState({
    id: "",
    nombre: "",
    permisos: [],
  });

  /* =====================================================
     FILTRADO
     ===================================================== */

  const rolesFiltrados = roles.filter((rol) => {
    const coincideBusqueda =
      rol.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase()) ||
      rol.id
        .toLowerCase()
        .includes(busqueda.toLowerCase());

    const coincideEstado =
      filtroEstado === "Todos" ||
      rol.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  /* =====================================================
     PAGINACIÓN DE LA TABLA
     ===================================================== */

  const REGISTROS_POR_PAGINA = 6;
  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(rolesFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const rolesPaginados = rolesFiltrados.slice(
    inicio,
    inicio + REGISTROS_POR_PAGINA
  );

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroEstado]);

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  /* =====================================================
     ABRIR CREAR
     ===================================================== */

  const abrirCrear = () => {
    setRolForm({
      id: `ROL-${String(roles.length + 1).padStart(3, "0")}`,
      nombre: "",
      permisos: [],
    });

    setModal("crear");
  };

  /* =====================================================
     ABRIR EDITAR
     ===================================================== */

  const abrirEditar = (rol) => {
    if (rol.usuarios > 0) {
      alert(
        "No se puede modificar este rol porque está asignado a usuarios activos."
      );
      return;
    }

    setRolForm({
      id: rol.id,
      nombre: rol.nombre,
      permisos: [...rol.permisos],
    });

    setModal("editar");
  };

  /* =====================================================
     VER DETALLE
     ===================================================== */

  const abrirDetalle = (rol) => {
    setModal({
      tipo: "detalle",
      rol,
    });
  };

  /* =====================================================
     CERRAR MODAL
     ===================================================== */

  const cerrarModal = () => {
    setModal(null);
  };

  /* =====================================================
     MANEJAR CAMPOS
     ===================================================== */

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setRolForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =====================================================
     MANEJAR PERMISOS
     ===================================================== */

  const manejarPermiso = (permiso) => {
    setRolForm((prev) => {
      const yaExiste = prev.permisos.includes(permiso);

      return {
        ...prev,
        permisos: yaExiste
          ? prev.permisos.filter((item) => item !== permiso)
          : [...prev.permisos, permiso],
      };
    });
  };

  /* =====================================================
     GUARDAR ROL
     ===================================================== */

  const guardarRol = (e) => {
    e.preventDefault();

    if (!rolForm.nombre.trim()) {
      alert("Ingrese el nombre del rol.");
      return;
    }

    if (rolForm.permisos.length === 0) {
      alert("Debe seleccionar al menos un permiso.");
      return;
    }

    if (modal === "crear") {
      const nuevoRol = {
        id: rolForm.id,
        nombre: rolForm.nombre.trim(),
        permisos: rolForm.permisos,
        usuarios: 0,
        estado: "Activo",
      };

      setRoles((prev) => [...prev, nuevoRol]);
    }

    if (modal === "editar") {
      setRoles((prev) =>
        prev.map((rol) =>
          rol.id === rolForm.id
            ? {
                ...rol,
                nombre: rolForm.nombre.trim(),
                permisos: rolForm.permisos,
              }
            : rol
        )
      );
    }

    cerrarModal();
  };

  /* =====================================================
     CAMBIAR ESTADO
     ===================================================== */

  const cambiarEstado = (rol) => {
    if (rol.usuarios > 0) {
      alert(
        "No se puede cambiar el estado de este rol porque está asignado a usuarios activos."
      );
      return;
    }

    setRoles((prev) =>
      prev.map((item) =>
        item.id === rol.id
          ? {
              ...item,
              estado:
                item.estado === "Activo"
                  ? "Inactivo"
                  : "Activo",
            }
          : item
      )
    );
  };

  /* =====================================================
     ELIMINAR ROL
     ===================================================== */

  const eliminarRol = (rol) => {
    if (rol.estado !== "Inactivo") {
      alert(
        "No se puede eliminar el rol porque solo se permiten eliminar roles inactivos."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas eliminar el rol "${rol.nombre}"?`
    );
    if (!confirmar) return;

    setRoles((actuales) =>
      actuales.filter((item) => item.id !== rol.id)
    );
  };

  return (
    <div className="roles-page">

      {/* =================================================
          ENCABEZADO
          ================================================= */}

      <div className="roles-header">

        <div className="roles-title">
          <h2>Roles</h2>

          <p>
            Gestiona los roles y los permisos de acceso al sistema.
          </p>
        </div>

        <div className="roles-actions">

          {/* BUSCADOR */}

          <div className="roles-search">

            <Search size={20} />

            <input
              type="text"
              placeholder="Buscar roles..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
            />

          </div>

          {/* FILTRO */}

          <select
            className="roles-filter"
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(e.target.value)
            }
          >
            <option value="Todos">
              Todos
            </option>

            <option value="Activo">
              Activos
            </option>

            <option value="Inactivo">
              Inactivos
            </option>
          </select>

          {/* AGREGAR */}

          <button
            type="button"
            className="roles-add-button"
            onClick={abrirCrear}
          >
            <Plus size={19} />
            Agregar rol
          </button>

        </div>
      </div>

      {/* =================================================
          TABLA
          ================================================= */}

      <div className="roles-table-container">

        <table className="roles-table">

          <thead>
            <tr>
              <th>ID ROL</th>
              <th>NOMBRE</th>
              <th>USUARIOS</th>
              <th>ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>

          <tbody>

            {rolesFiltrados.length > 0 ? (

              rolesPaginados.map((rol) => (

                <tr key={rol.id}>

                  <td>
                    <span className="rol-id">
                      {rol.id}
                    </span>
                  </td>

                  <td>
                    <span className="rol-nombre">
                      {rol.nombre}
                    </span>
                  </td>

                  <td>
                    <span className="rol-usuarios">
                      {rol.usuarios}
                    </span>
                  </td>

                  {/* =====================================
                      SWITCH ACTIVO / INACTIVO
                      ===================================== */}

                  <td>

                    <label className="switch-estado">

                      <input
                        type="checkbox"
                        checked={rol.estado === "Activo"}
                        onChange={() =>
                          cambiarEstado(rol)
                        }
                      />

                      <span className="slider"></span>

                      <span
                        className={`estado-texto ${
                          rol.estado === "Activo"
                            ? "activo"
                            : "inactivo"
                        }`}
                      >
                        {rol.estado.toUpperCase()}
                      </span>

                    </label>

                  </td>

                  {/* =====================================
                      ACCIONES
                      ===================================== */}

                  <td>

                    <div className="rol-actions">

                      <button
                        type="button"
                        title="Ver rol"
                        onClick={() =>
                          abrirDetalle(rol)
                        }
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        type="button"
                        title="Editar rol"
                        onClick={() =>
                          abrirEditar(rol)
                        }
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        type="button"
                        className={
                          rol.estado !== "Inactivo"
                            ? "disabled"
                            : ""
                        }
                        title={
                          rol.estado !== "Inactivo"
                            ? "Solo se pueden eliminar roles inactivos"
                            : "Eliminar rol"
                        }
                        onClick={() =>
                          eliminarRol(rol)
                        }
                      >
                        <Trash2 size={18} />
                      </button>

                    </div>

                  </td>

                </tr>

              ))

            ) : (

              <tr>

                <td
                  colSpan="5"
                  className="roles-empty"
                >
                  No se encontraron roles.
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
          MODAL CREAR / EDITAR
          ================================================= */}

      {(modal === "crear" ||
        modal === "editar") && (

        <div
          className="rol-modal-overlay"
          onClick={cerrarModal}
        >

          <div
            className="rol-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="rol-modal-header">

              <h3>
                {modal === "crear"
                  ? "Agregar rol"
                  : "Editar rol"}
              </h3>

              <button
                type="button"
                className="rol-modal-close"
                onClick={cerrarModal}
              >
                <X size={20} />
              </button>

            </div>

            <form onSubmit={guardarRol}>

              <div className="rol-modal-body">

                <div className="rol-form-row">

                  <div className="rol-form-group">

                    <label>
                      ID ROL
                    </label>

                    <input
                      type="text"
                      name="id"
                      value={rolForm.id}
                      disabled
                    />

                  </div>

                  <div className="rol-form-group">

                    <label>
                      NOMBRE DEL ROL
                    </label>

                    <input
                      type="text"
                      name="nombre"
                      placeholder="Ej. Vendedor"
                      value={rolForm.nombre}
                      onChange={manejarCambio}
                    />

                  </div>

                </div>
                {/* PERMISOS */}

                <div className="rol-permisos-section">

                  <div className="rol-permisos-header">

                    <h4>
                      Permisos del rol
                    </h4>

                    <span>
                      Selecciona los permisos
                    </span>

                  </div>

                  <div className="rol-permisos-list">

                    {PERMISOS.map((permiso) => (

                      <label
                        className="rol-permiso-item"
                        key={permiso}
                      >

                        <input
                          type="checkbox"
                          checked={rolForm.permisos.includes(
                            permiso
                          )}
                          onChange={() =>
                            manejarPermiso(permiso)
                          }
                        />

                        <span>
                          {permiso}
                        </span>

                      </label>

                    ))}

                  </div>

                </div>

              </div>

              <div className="rol-modal-footer">

                <button
                  type="button"
                  className="rol-cancel-button"
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rol-create-button"
                >
                  {modal === "crear"
                    ? "Crear rol"
                    : "Guardar cambios"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =================================================
          MODAL DETALLE
          ================================================= */}

      {modal?.tipo === "detalle" && (

        <div
          className="rol-modal-overlay"
          onClick={cerrarModal}
        >

          <div
            className="rol-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="rol-modal-header">

              <h3>
                Detalle del rol
              </h3>

              <button
                type="button"
                className="rol-modal-close"
                onClick={cerrarModal}
              >
                <X size={20} />
              </button>

            </div>

            <div className="rol-modal-body">

              <div className="rol-detail-header">

                <div className="rol-detail-icon">
                  <Shield size={27} />
                </div>

                <div>

                  <h3>
                    {modal.rol.nombre}
                  </h3>

                  <p>
                    {modal.rol.id}
                  </p>

                </div>

              </div>

              <div className="rol-detail-grid">

                <div className="rol-info-group">

                  <label>
                    Nombre
                  </label>

                  <div className="rol-info-value">
                    {modal.rol.nombre}
                  </div>

                </div>

                <div className="rol-info-group">

                  <label>
                    Estado
                  </label>

                  <div className="rol-info-value">

                    <span
                      className={`estado-detalle ${
                        modal.rol.estado === "Activo"
                          ? "activo"
                          : "inactivo"
                      }`}
                    >
                      {modal.rol.estado}
                    </span>

                  </div>

                </div>

                <div className="rol-info-group">

                  <label>
                    Usuarios asignados
                  </label>

                  <div className="rol-info-value">
                    {modal.rol.usuarios}
                  </div>

                </div>

                <div className="rol-info-group">

                  <label>
                    Total permisos
                  </label>

                  <div className="rol-info-value">
                    {modal.rol.permisos.length}
                  </div>

                </div>

              </div>

              <div className="rol-detail-permisos">

                <h4 className="rol-detail-permisos-title">
                  Permisos asignados
                </h4>

                <div className="rol-detail-permisos-list">

                  {modal.rol.permisos.map(
                    (permiso) => (

                      <span
                        className="rol-detail-permiso"
                        key={permiso}
                      >
                        {permiso}
                      </span>

                    )
                  )}

                </div>

              </div>

            </div>

            <div className="rol-modal-footer">

              <button
                type="button"
                className="rol-cancel-button"
                onClick={cerrarModal}
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