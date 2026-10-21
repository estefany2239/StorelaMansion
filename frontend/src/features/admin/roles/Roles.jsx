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

import { tienePermiso } from "../utils/permisos";

import {
  listarRolesAdmin,
  obtenerCatalogoPermisosAdmin,
  crearRolAdmin,
  actualizarRolAdmin,
  cambiarEstadoRolAdmin,
  eliminarRolAdmin,
} from "../../../services/api";

import "./Roles.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import useValidacionFormulario from "../../../hooks/useValidacionFormulario";

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

/* Privilegios de la columna de detalle. Se usa
   como respaldo si el catálogo aún no cargó;
   incluye "Cambiar estado" (existe en todo módulo
   con estado, no en Dashboard según el catálogo). */

const COLUMNAS_DETALLE = [...PRIVILEGIOS, "Cambiar estado"];

/* Roles que no se editan ni se cambian de estado
   desde la interfaz (Administrador es intocable
   también en el backend) */

const ROLES_PROTEGIDOS = ["Administrador", "Cliente"];

const esRolProtegido = (rol) =>
  ROLES_PROTEGIDOS.includes(rol?.nombre);

const formatearIdRol = (id) => {
  if (id === null || id === undefined || id === "") {
    return "—";
  }
  return `ROL-${String(id).padStart(3, "0")}`;
};

/* =====================================================
   HELPERS DE ESTRUCTURA
   ===================================================== */

/* Mantiene los privilegios en el orden canónico
   (Crear, Consultar, Actualizar, Eliminar) y
   conserva los extraños al catálogo (Cambiar estado) */

const ordenarPrivilegios = (privilegios = []) => {
  const ordenados = PRIVILEGIOS.filter((privilegio) =>
    privilegios.includes(privilegio)
  );
  const extras = privilegios.filter(
    (privilegio) => !PRIVILEGIOS.includes(privilegio)
  );
  return [...ordenados, ...extras];
};

/* Ordena módulos según el orden canónico y deja
   los desconocidos al final */

const ordenarModulos = (nombres = []) => [
  ...MODULOS.filter((modulo) => nombres.includes(modulo)),
  ...nombres.filter((modulo) => !MODULOS.includes(modulo)),
];

/* API -> UI: lista plana ["Ventas:Crear"]
   a estructura [{ modulo, privilegios }] */

const estructuraDesdeLista = (lista = []) => {
  const agrupados = new Map();

  (Array.isArray(lista) ? lista : []).forEach((nombre) => {
    const texto = String(nombre).trim();
    if (!texto) return;

    const [modulo, ...resto] = texto.split(":");
    const privilegio = resto.join(":");
    if (!modulo || !privilegio) return;

    if (!agrupados.has(modulo)) {
      agrupados.set(modulo, []);
    }

    const privilegios = agrupados.get(modulo);
    if (!privilegios.includes(privilegio)) {
      privilegios.push(privilegio);
    }
  });

  return ordenarModulos([...agrupados.keys()]).map(
    (modulo) => ({
      modulo,
      privilegios: ordenarPrivilegios(agrupados.get(modulo)),
    })
  );
};

/* UI -> API: estructura [{ modulo, privilegios }]
   a lista plana ["Ventas:Crear"] */

const listaDesdeEstructura = (estructura = []) =>
  (Array.isArray(estructura) ? estructura : []).flatMap(
    (permiso) =>
      (permiso.privilegios || []).map(
        (privilegio) => `${permiso.modulo}:${privilegio}`
      )
  );

const desdeApi = (rol) => ({
  ...rol,
  permisos: estructuraDesdeLista(rol.permisos),
});

const totalPrivilegios = (permisos = []) =>
  permisos.reduce(
    (total, permiso) =>
      total + (permiso.privilegios?.length || 0),
    0
  );


export default function Roles({ user }) {
  const [roles, setRoles] = useState([]);

  const [catalogo, setCatalogo] = useState(null);

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

  // Reglas alineadas con el backend (rolesAdmin.js): nombre obligatorio
  // y sin duplicados; y al menos un permiso (regla del formulario).
  const REGLAS_ROL = {
    nombre: (valor) => {
      const nombre = String(valor || "").trim();
      if (!nombre) return "Este campo es obligatorio.";

      const yaExiste = roles.some(
        (item) =>
          item.nombre.trim().toLowerCase() === nombre.toLowerCase() &&
          (modal !== "editar" || item.id !== rolForm.id)
      );
      if (yaExiste) return "Ya existe un registro con este nombre.";

      if (nombre.length > 20) {
        return "El nombre no puede superar los 20 caracteres.";
      }

      return "";
    },
    permisos: (valor) =>
      Array.isArray(valor) && valor.length > 0
        ? ""
        : "Debe seleccionar al menos un permiso.",
  };

  const {
    errores,
    manejarBlur,
    revisarCampo,
    validarTodo,
    limpiarValidacion,
    setErrores,
  } = useValidacionFormulario(REGLAS_ROL);

  /* =====================================================
     NOTIFICACIÓN
     ===================================================== */

  const mostrarToast = (mensaje, tipo = "exito") => {
    setToast({ mensaje, tipo });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  /* =====================================================
     CATÁLOGO DE MÓDULOS Y PRIVILEGIOS (API)
     ===================================================== */

  const modulosFormulario =
    catalogo?.modulos?.length > 0
      ? ordenarModulos(
          catalogo.modulos.map((item) => item.nombre)
        )
      : MODULOS;

  const privilegiosDisponibles = (modulo) => {
    const delCatalogo = catalogo?.modulos?.find(
      (item) => item.nombre === modulo
    )?.privilegios;

    if (!delCatalogo?.length) {
      return PRIVILEGIOS;
    }

    return ordenarPrivilegios(delCatalogo);
  };

  /* Un privilegio existe para el módulo según el
     catálogo de la BD; sin catálogo no se juzga
     (se muestra el check normal de asignado/no) */

  const privilegioExisteEnModulo = (modulo, privilegio) => {
    if (!catalogo?.modulos?.length) return true;

    return privilegiosDisponibles(modulo).includes(privilegio);
  };

  /* Columnas del detalle: unión de privilegios del
     catálogo (lo que diga la BD); respaldo fijo
     si no hay catálogo */

  const privilegiosCatalogo = (catalogo?.modulos || []).flatMap(
    (item) => item.privilegios || []
  );

  const columnasDetalle =
    privilegiosCatalogo.length > 0
      ? ordenarPrivilegios([...new Set(privilegiosCatalogo)])
      : COLUMNAS_DETALLE;

  /* =====================================================
     CARGA INICIAL (API)
     ===================================================== */

  useEffect(() => {
    if (!tienePermiso(user, "Roles", "Consultar")) return;

    const cargarDatos = async () => {
      try {
        const lista = await listarRolesAdmin();
        setRoles((Array.isArray(lista) ? lista : []).map(desdeApi));
      } catch (error) {
        mostrarToast(error.message, "error");
      }

      try {
        const permisos = await obtenerCatalogoPermisosAdmin();
        setCatalogo(permisos);
      } catch (error) {
        mostrarToast(error.message, "error");
      }
    };

    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =====================================================
     FILTRADO
     ===================================================== */

  const filtrarRoles = (lista, textoBusqueda) => {
    const texto = textoBusqueda.toLowerCase();

    return lista.filter((rol) => {
      const coincideBusqueda =
        rol.nombre
          .toLowerCase()
          .includes(texto) ||
        formatearIdRol(rol.id)
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
  };

  const rolesFiltrados = filtrarRoles(roles, busqueda);

  const manejarBusqueda = (valor) => {
    setBusqueda(valor);

    if (
      valor.trim() &&
      filtrarRoles(roles, valor).length === 0
    ) {
      mostrarToast("Rol no encontrado en el sistema", "error");
    }
  };

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

  /* =====================================================
     ABRIR CREAR
     ===================================================== */

  const abrirCrear = () => {
    setRolForm({
      id: "",
      nombre: "",
      permisos: [],
    });

    limpiarValidacion();
    setModal("crear");
  };

  /* =====================================================
     ABRIR EDITAR
     ===================================================== */

  const abrirEditar = (rol) => {
    if (esRolProtegido(rol)) {
      mostrarToast(
        "Este rol está protegido y no se puede editar.",
        "error"
      );
      return;
    }

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

    limpiarValidacion();
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

    const valorFiltrado =
      name === "nombre"
        ? value.replace(
            /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
            ""
          )
        : value;

    const siguiente = {
      ...rolForm,
      [name]: valorFiltrado,
    };

    setRolForm(siguiente);

    // Si el campo ya fue tocado, su error se recalcula al instante.
    revisarCampo(name, valorFiltrado, siguiente);
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

  /* Al tocar los permisos se limpia su error (igual que antes) */
  const limpiarErrorPermisos = () => {
    setErrores((prev) => {
      if (!prev.permisos) return prev;

      const nuevos = { ...prev };
      delete nuevos.permisos;
      return nuevos;
    });
  };

  const manejarAccesoModulo = (modulo) => {
    limpiarErrorPermisos();

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
    limpiarErrorPermisos();

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

  const guardarRol = async (e) => {
    e.preventDefault();

    // Valida todo el formulario (nombre y permisos) y, si hay
    // errores, enfoca el primer campo inválido.
    if (!validarTodo(rolForm)) return;

    if (modal === "editar") {
      setConfirmarEdicion(true);
      return;
    }

    if (modal === "crear") {
      try {
        const rolCreado = await crearRolAdmin({
          nombre: rolForm.nombre.trim(),
          permisos: listaDesdeEstructura(rolForm.permisos),
        });

        setRoles((prev) => [desdeApi(rolCreado), ...prev]);

        mostrarToast("Rol creado con éxito");

        cerrarModal();
      } catch (error) {
        /* El backend responde 409 si el nombre ya existe */
        mostrarToast(error.message, "error");
      }
    }
  };

  const confirmarEdicionRol = async () => {
    try {
      const rolActualizado = await actualizarRolAdmin(
        rolForm.id,
        {
          nombre: rolForm.nombre.trim(),
          permisos: listaDesdeEstructura(rolForm.permisos),
        }
      );

      setRoles((prev) =>
        prev.map((rol) =>
          rol.id === rolForm.id
            ? desdeApi(rolActualizado)
            : rol
        )
      );

      mostrarToast("Rol editado con éxito");

      setConfirmarEdicion(false);
      cerrarModal();
    } catch (error) {
      /* 403 (rol protegido) o 409 (nombre duplicado) */
      setConfirmarEdicion(false);
      mostrarToast(error.message, "error");
    }
  };

  /* =====================================================
     CAMBIAR ESTADO
     ===================================================== */

  const cambiarEstado = async (rol) => {
    if (esRolProtegido(rol)) {
      mostrarToast(
        "Este rol está protegido y no se puede cambiar su estado.",
        "error"
      );
      return;
    }

    const nuevoEstado =
      rol.estado === "Activo" ? "Inactivo" : "Activo";

    try {
      const rolActualizado = await cambiarEstadoRolAdmin(
        rol.id,
        nuevoEstado
      );

      setRoles((prev) =>
        prev.map((item) =>
          item.id === rol.id
            ? desdeApi(rolActualizado)
            : item
        )
      );
    } catch (error) {
      /* 409: no se desactiva un rol con usuarios */
      mostrarToast(error.message, "error");
    }
  };

  /* =====================================================
     ELIMINAR ROL
     ===================================================== */

  const eliminarRol = (rol) => {
    if (esRolProtegido(rol)) {
      mostrarToast(
        "Este rol está protegido y no se puede eliminar.",
        "error"
      );
      return;
    }

    if (rol.estado !== "Inactivo") {
      mostrarToast(
        "No se puede eliminar el rol porque solo se permiten eliminar roles inactivos.",
        "error"
      );
      return;
    }

    setRolEliminar(rol);
  };

  const confirmarEliminar = async () => {
    try {
      await eliminarRolAdmin(rolEliminar.id);

      setRoles((actuales) =>
        actuales.filter((item) => item.id !== rolEliminar.id)
      );

      setRolEliminar(null);

      mostrarToast("Rol eliminado con éxito");
    } catch (error) {
      /* 403 (rol protegido) o 409 (usuarios asignados) */
      setRolEliminar(null);
      mostrarToast(error.message, "error");
    }
  };

  if (
    !tienePermiso(user, "Roles", "Consultar")
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
                manejarBusqueda(e.target.value)
              }
            />

          </div>

          {/* AGREGAR */}

          {(tienePermiso(
            user,
            "Roles",
            "Crear"
          )) && (
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
                      {formatearIdRol(rol.id)}
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

                      {tienePermiso(
                        user,
                        "Roles",
                        "Cambiar estado"
                      ) && !esRolProtegido(rol) && (
                        <input
                          type="checkbox"
                          checked={rol.estado === "Activo"}
                          onChange={() =>
                            cambiarEstado(rol)
                          }
                        />
                      )}

                      {tienePermiso(
                        user,
                        "Roles",
                        "Cambiar estado"
                      ) && !esRolProtegido(rol) && (
                        <span className="slider-usuario"></span>
                      )}

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

                      {tienePermiso(
                        user,
                        "Roles",
                        "Actualizar"
                      ) && !esRolProtegido(rol) && (
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

                      {tienePermiso(
                        user,
                        "Roles",
                        "Eliminar"
                      ) && !esRolProtegido(rol) && (
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
                      NOMBRE DEL ROL
                    </label>

                    <input
                      type="text"
                      id="campo-nombre"
                      name="nombre"
                      placeholder="Ej. Vendedor"
                      maxLength={20}
                      value={rolForm.nombre}
                      onChange={manejarCambio}
                      onBlur={() =>
                        manejarBlur("nombre", rolForm.nombre, rolForm)
                      }
                      className={`input ${errores.nombre ? "input-error" : ""}`}
                    />

                    {errores.nombre && (
                      <span className="error-text">
                        {errores.nombre}
                      </span>
                    )}

                  </div>

                </div>
                 {/* PERMISOS */}
 
                 <div className="rol-permisos-section" id="campo-permisos" tabIndex={-1}>
 
                   <div className="rol-permisos-header">
 
                     <h4>
                       Permisos del rol
                     </h4>
 
                     <span>
                       Selecciona los módulos y sus privilegios
                     </span>
 
                   </div>
 
                   <div className="rol-permisos-list-nivel3">
 
                      {modulosFormulario.map((modulo) => {
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
                                {privilegiosDisponibles(modulo).map((privilegio) => {
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

                   {errores.permisos && (
                     <span className="error-text">
                       {errores.permisos}
                     </span>
                   )}

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
                    {formatearIdRol(modal.rol.id)}
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
                      {columnasDetalle.map((privilegio) => (
                        <div
                          className="rol-detail-permisos-th"
                          key={privilegio}
                        >
                          {privilegio}
                        </div>
                      ))}
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
                            {columnasDetalle.map((privilegio) => (
                              <div
                                className="rol-detail-permisos-td"
                                key={`${permiso.modulo}-${privilegio}`}
                              >
                                {privilegios.includes(privilegio) ? (
                                  <CheckCircle
                                    size={18}
                                    className="priv-check activo"
                                  />
                                ) : privilegioExisteEnModulo(
                                    permiso.modulo,
                                    privilegio
                                  ) ? (
                                  <XCircle
                                    size={18}
                                    className="priv-check inactivo"
                                  />
                                ) : (
                                  <span
                                    className="priv-check na"
                                    title="Este privilegio no existe para el módulo"
                                  >
                                    —
                                  </span>
                                )}
                              </div>
                            ))}
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