import { useState, useEffect } from "react";

import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Shield,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { tienePrivilegio } from "../utils/permisos";

import "./Roles.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";

/* =====================================================
   NIVEL 3 DE SEGURIDAD
   Rol -> Permiso (módulo) -> Privilegio (acción CRUD)
   ===================================================== */

const MODULOS = [
  "Dashboard",
  "Roles",
  "Usuarios",
  "Productos",
  "Categorías",
  "Tallas",
  "Colores",
  "Ventas",
  "Clientes",
  "Pedidos",
  "Domicilios",
];

const PRIVILEGIOS = [
  "Crear",
  "Consultar",
  "Actualizar",
  "Eliminar",
];

/* Privilegio marcado por defecto al activar un módulo */

const PRIVILEGIO_POR_DEFECTO = "Consultar";

const REGISTROS_POR_PAGINA = 6;

/* =====================================================
   HELPERS DE ESTRUCTURA
   ===================================================== */

/* Mantiene los privilegios en el orden canónico
   (Crear, Consultar, Actualizar, Eliminar) */

const ordenarPrivilegios = (privilegios = []) =>
  PRIVILEGIOS.filter((privilegio) =>
    privilegios.includes(privilegio)
  );

const totalPrivilegios = (permisos = []) =>
  permisos.reduce(
    (total, permiso) =>
      total + (permiso.privilegios?.length || 0),
    0
  );

/* =====================================================
   ROLES MOCK (MIGRADOS A LA NUEVA ESTRUCTURA)
   ===================================================== */

const PERMISOS_ADMINISTRADOR = MODULOS.map(
  (modulo) => ({
    modulo,
    privilegios: [...PRIVILEGIOS],
  })
);

const PERMISOS_VENDEDOR = [
  {
    modulo: "Dashboard",
    privilegios: ["Consultar"],
  },
  {
    modulo: "Productos",
    privilegios: ["Consultar"],
  },
  {
    modulo: "Ventas",
    privilegios: ["Crear", "Consultar", "Actualizar"],
  },
  {
    modulo: "Clientes",
    privilegios: ["Consultar", "Actualizar"],
  },
  {
    modulo: "Pedidos",
    privilegios: ["Crear", "Consultar", "Actualizar"],
  },
  {
    modulo: "Domicilios",
    privilegios: ["Consultar", "Actualizar"],
  },
];

/* El Cliente no ingresa al panel administrativo,
   por eso no tiene módulos asignados */

const PERMISOS_CLIENTE = [];


export default function Roles({ rolesDisponibles = [], user }) {
  const rolUsuario = user?.rol;
  const [roles, setRoles] = useState([
    {
      id: "ROL-001",
      nombre: "Administrador",
      permisos: PERMISOS_ADMINISTRADOR,
      usuarios: 1,
      estado: "Activo",
    },
    {
      id: "ROL-002",
      nombre: "Vendedor",
      permisos: PERMISOS_VENDEDOR,
      usuarios: 2,
      estado: "Activo",
    },
    {
      id: "ROL-003",
      nombre: "Cliente",
      permisos: PERMISOS_CLIENTE,
      usuarios: 12,
      estado: "Activo",
    },
  ]);

  const [busqueda, setBusqueda] = useState("");

  const [modal, setModal] = useState(null);

  const [toast, setToast] = useState(null);

  const [rolEliminar, setRolEliminar] = useState(null);

  const [confirmarEdicion, setConfirmarEdicion] = useState(false);

  const [rolForm, setRolForm] = useState({
    id: "",
    nombre: "",
    permisos: [],
  });

  /* =====================================================
     FILTRADO
     ===================================================== */

  const rolesFiltrados = roles.filter((rol) => {
    const texto = busqueda.toLowerCase();

    const coincideBusqueda =
      rol.nombre
        .toLowerCase()
        .includes(texto) ||
      rol.id
        .toLowerCase()
        .includes(texto) ||
      rol.estado
        .toLowerCase()
        .includes(texto) ||
      rol.permisos.some(
        (permiso) =>
          permiso.modulo
            .toLowerCase()
            .includes(texto) ||
          (permiso.privilegios || []).some(
            (privilegio) =>
              privilegio
                .toLowerCase()
                .includes(texto)
          )
      );

    return coincideBusqueda;
  });

  /* =====================================================
     PAGINACIÓN DE LA TABLA
     ===================================================== */

  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(rolesFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio =
    (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const rolesPaginados = rolesFiltrados.slice(
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

  useEffect(() => {
    if (
      busqueda.trim() &&
      rolesFiltrados.length === 0
    ) {
      mostrarToast("Rol no encontrado en el sistema", "error");
    }
  }, [busqueda, rolesFiltrados.length]);

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
    if (rol.estado !== "Activo") {
      mostrarToast(
        "No se puede editar un rol inactivo",
        "error"
      );
      return;
    }

    setRolForm({
      id: rol.id,
      nombre: rol.nombre,
      permisos: Array.isArray(rol.permisos)
        ? rol.permisos.map((p) => ({
            modulo: p.modulo,
            privilegios: ordenarPrivilegios(
              p.privilegios || []
            ),
          }))
        : [],
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
      MANEJAR PERMISOS (NIVEL 3)
      Cada módulo puede tener privilegios CRUD
      ===================================================== */

  const obtenerPrivilegiosModulo = (modulo) =>
    rolForm.permisos.find(
      (permiso) => permiso.modulo === modulo
    )?.privilegios || [];

  const moduloTieneAcceso = (modulo) =>
    obtenerPrivilegiosModulo(modulo).length > 0;

  const manejarAccesoModulo = (modulo) => {
    setRolForm((prev) => {
      const permisosActuales = Array.isArray(prev.permisos)
        ? prev.permisos
        : [];

      const yaExiste = permisosActuales.some(
        (permiso) => permiso.modulo === modulo
      );

      if (yaExiste) {
        /* Desmarca: elimina el módulo del array de permisos */
        return {
          ...prev,
          permisos: permisosActuales.filter(
            (permiso) => permiso.modulo !== modulo
          ),
        };
      }

      /* Activa: agrega el módulo con "Consultar" por defecto */
      return {
        ...prev,
        permisos: [
          ...permisosActuales,
          {
            modulo,
            privilegios: [
              PRIVILEGIO_POR_DEFECTO,
            ],
          },
        ],
      };
    });
  };

  const manejarPrivilegio = (modulo, privilegio) => {
    setRolForm((prev) => {
      const permisosActuales = Array.isArray(prev.permisos)
        ? prev.permisos
        : [];

      const yaExisteModulo = permisosActuales.some(
        (permiso) => permiso.modulo === modulo
      );

      if (!yaExisteModulo) {
        /* Si no tiene acceso, lo activamos con este privilegio */
        return {
          ...prev,
          permisos: [
            ...permisosActuales,
            {
              modulo,
              privilegios: ordenarPrivilegios([
                PRIVILEGIO_POR_DEFECTO,
                privilegio,
              ]).filter(
                (p, i, arr) => arr.indexOf(p) === i
              ),
            },
          ],
        };
      }

      /* Actualiza privilegios del módulo existente */
      return {
        ...prev,
        permisos: permisosActuales.map((permiso) => {
          if (permiso.modulo !== modulo) {
            return permiso;
          }

          const privilegiosActuales =
            permiso.privilegios || [];

          const yaTiene = privilegiosActuales.includes(
            privilegio
          );

          const nuevosPrivilegios = yaTiene
            ? privilegiosActuales.filter(
                (p) => p !== privilegio
              )
            : [
                ...privilegiosActuales,
                privilegio,
              ];

          /* Ordena según orden canónico */
          return {
            ...permiso,
            privilegios: ordenarPrivilegios(
              nuevosPrivilegios
            ),
          };
        }),
      };
    });
  };


  /* =====================================================
     GUARDAR ROL
     ===================================================== */

  const mostrarToast = (mensaje, tipo = "exito") => {
    setToast({ mensaje, tipo });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const guardarRol = (e) => {
    e.preventDefault();

    if (!rolForm.nombre.trim()) {
      alert("Ingrese el nombre del rol.");
      return;
    }

    if (!Array.isArray(rolForm.permisos) || rolForm.permisos.length === 0) {
      alert("Debe seleccionar al menos un permiso.");
      return;
    }

    if (modal === "editar") {
      setConfirmarEdicion(true);
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

      mostrarToast("Rol creado con éxito");
    }

    cerrarModal();
  };

  const confirmarEdicionRol = () => {
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

    mostrarToast("Rol editado con éxito");

    setConfirmarEdicion(false);
    cerrarModal();
  };

  /* =====================================================
     CAMBIAR ESTADO
     ===================================================== */

  const cambiarEstado = (rol) => {
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
      mostrarToast(
        "No se puede eliminar el rol porque solo se permiten eliminar roles inactivos.",
        "error"
      );
      return;
    }

    setRolEliminar(rol);
  };

  const confirmarEliminar = () => {
    setRoles((actuales) =>
      actuales.filter((item) => item.id !== rolEliminar.id)
    );

    setRolEliminar(null);

    mostrarToast("Rol eliminado con éxito");
  };

  if (
    !tienePrivilegio(rolUsuario, rolesDisponibles, "Roles", "Consultar")
  ) {
    return (
      <div className="roles-page">
        <div className="roles-header">
          <div className="roles-title">
            <h2>Roles</h2>
            <p>No tienes permisos para acceder a este módulo.</p>
          </div>
        </div>
      </div>
    );
  }


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
              placeholder="Buscar por nombre, permiso o estado..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
            />

          </div>

          {/* AGREGAR */}

          {(tienePrivilegio(
            rolUsuario,
            rolesDisponibles,
            "Roles",
            "Crear"
          ) || rolUsuario === "Administrador") && (
            <button
              type="button"
              className="roles-add-button"
              onClick={abrirCrear}
            >
              <Plus size={19} />
              Registrar rol
            </button>
          )}

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

                    <label className="switch-usuario-estado">

                      <input
                        type="checkbox"
                        checked={rol.estado === "Activo"}
                        onChange={() =>
                          cambiarEstado(rol)
                        }
                      />

                      <span className="slider-usuario"></span>

                      <span
                        className={`estado-usuario-texto ${
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

                      {tienePrivilegio(
                        rolUsuario,
                        rolesDisponibles,
                        "Roles",
                        "Actualizar"
                      ) && (
                        <button
                          type="button"
                          className={
                            rol.estado !== "Activo"
                              ? "disabled"
                              : ""
                          }
                          title={
                            rol.estado !== "Activo"
                              ? "No se puede actualizar un rol inactivo"
                              : "Actualizar rol"
                          }
                          onClick={() =>
                            abrirEditar(rol)
                          }
                        >
                          <Pencil size={18} />
                        </button>
                      )}

                      {tienePrivilegio(
                        rolUsuario,
                        rolesDisponibles,
                        "Roles",
                        "Eliminar"
                      ) && (
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
                      )}

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
                  Rol no encontrado en el sistema.
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
                  ? "Registrar rol"
                  : "Actualizar rol"}
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
                       Selecciona los módulos y sus privilegios
                     </span>
 
                   </div>
 
                   <div className="rol-permisos-list-nivel3">
 
                     {MODULOS.map((modulo) => {
                       const tieneAcceso =
                         moduloTieneAcceso(modulo);
                       const privilegiosModulo =
                         obtenerPrivilegiosModulo(modulo);
 
                       return (
                         <div
                           className="rol-modulo-card"
                           key={modulo}
                         >
                           <label className="rol-modulo-header">
 
                             <input
                               type="checkbox"
                               checked={tieneAcceso}
                               onChange={() =>
                                 manejarAccesoModulo(modulo)
                               }
                             />
 
                             <div className="rol-modulo-info">
                               <span className="rol-modulo-nombre">
                                 {modulo}
                               </span>
                               {tieneAcceso && (
                                 <span className="rol-modulo-contador">
                                   {privilegiosModulo.length}{" "}
                                   privilegio
                                   {privilegiosModulo.length === 1
                                     ? ""
                                     : "s"}
                                 </span>
                               )}
                             </div>
 
                           </label>
 
                           {tieneAcceso && (
                             <div className="rol-privilegios-grid">
                               {PRIVILEGIOS.map((privilegio) => {
                                 const activo =
                                   privilegiosModulo.includes(
                                     privilegio
                                   );
 
                                 return (
                                   <label
                                     className={`rol-privilegio-item ${
                                       activo ? "activo" : ""
                                     }`}
                                     key={`${modulo}-${privilegio}`}
                                   >
 
                                     <input
                                       type="checkbox"
                                       checked={activo}
                                       onChange={() =>
                                         manejarPrivilegio(
                                           modulo,
                                           privilegio
                                         )
                                       }
                                     />
 
                                     <span>{privilegio}</span>
 
                                   </label>
                                 );
                               })}
                             </div>
                           )}
 
                         </div>
                       );
                     })}
 
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
                     {totalPrivilegios(modal.rol.permisos)}
                   </div>


                </div>

              </div>

               <div className="rol-detail-permisos">
 
                 <h4 className="rol-detail-permisos-title">
                   Permisos asignados
                 </h4>
 
                 <div className="rol-detail-permisos-tabla">
                   <div className="rol-detail-permisos-thead">
                     <div className="rol-detail-permisos-th modulo">
                       Módulo
                     </div>
                     <div className="rol-detail-permisos-th">
                       Crear
                     </div>
                     <div className="rol-detail-permisos-th">
                       Consultar
                     </div>
                     <div className="rol-detail-permisos-th">
                       Actualizar
                     </div>
                     <div className="rol-detail-permisos-th">
                       Eliminar
                     </div>
                   </div>
 
                   {(modal.rol.permisos || []).map(
                     (permiso) => {
                       const privilegios =
                         permiso.privilegios || [];
 
                       return (
                         <div
                           className="rol-detail-permisos-row"
                           key={permiso.modulo}
                         >
                           <div className="rol-detail-permisos-td modulo">
                             {permiso.modulo}
                           </div>
                           <div className="rol-detail-permisos-td">
                             {privilegios.includes("Crear") ? (
                               <CheckCircle
                                 size={18}
                                 className="priv-check activo"
                               />
                             ) : (
                               <XCircle
                                 size={18}
                                 className="priv-check inactivo"
                               />
                             )}
                           </div>
                           <div className="rol-detail-permisos-td">
                             {privilegios.includes("Consultar") ? (
                               <CheckCircle
                                 size={18}
                                 className="priv-check activo"
                               />
                             ) : (
                               <XCircle
                                 size={18}
                                 className="priv-check inactivo"
                               />
                             )}
                           </div>
                           <div className="rol-detail-permisos-td">
                             {privilegios.includes("Actualizar") ? (
                               <CheckCircle
                                 size={18}
                                 className="priv-check activo"
                               />
                             ) : (
                               <XCircle
                                 size={18}
                                 className="priv-check inactivo"
                               />
                             )}
                           </div>
                           <div className="rol-detail-permisos-td">
                             {privilegios.includes("Eliminar") ? (
                               <CheckCircle
                                 size={18}
                                 className="priv-check activo"
                               />
                             ) : (
                               <XCircle
                                 size={18}
                                 className="priv-check inactivo"
                               />
                             )}
                           </div>
                         </div>
                       );
                     }
                   )}
                 </div>
 
               </div>


            </div>

            <div className="rol-modal-footer">

              <button
                type="button"
                className="rol-cancel-button detail-cerrar-button"
                onClick={cerrarModal}
              >
                Cerrar
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
          CONFIRMACIÓN DE ELIMINACIÓN
          ================================================= */}

      {rolEliminar && (
        <ConfirmDialog
          abierto={rolEliminar !== null}
          titulo="Eliminar rol"
          mensaje={
            <>¿Deseas eliminar el rol "
              <strong>{rolEliminar.nombre}</strong>"? Esta
              acción no se puede deshacer.</>
          }
          textoConfirmar="Eliminar"
          textoCancelar="Cancelar"
          variante="peligro"
          onConfirmar={confirmarEliminar}
          onCancelar={() =>
            setRolEliminar(null)
          }
        />
      )}

      <ConfirmDialog
        abierto={confirmarEdicion}
        titulo="Confirmar cambios"
        mensaje={
          <>¿Deseas guardar los cambios realizados en el rol "
            <strong>{rolForm.nombre.trim()}</strong>"?</>
        }
        textoConfirmar="Guardar cambios"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEdicionRol}
        onCancelar={() => setConfirmarEdicion(false)}
      />

      {/* =================================================
          NOTIFICACIÓN
          ================================================= */}

      {toast && (
        <div
          className={`rol-toast ${
            toast.tipo === "error"
              ? "rol-toast-error"
              : ""
          }`}
        >
          {toast.tipo === "error" ? (
            <XCircle size={20} />
          ) : (
            <CheckCircle size={20} />
          )}
          <span>{toast.mensaje}</span>
        </div>
      )}

    </div>
  );
}