import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X
} from "lucide-react";

import "./Colores.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import useValidacionFormulario from "../../../hooks/useValidacionFormulario";
import { tienePermiso } from "../utils/permisos";

import {
  obtenerColoresAdmin,
  crearColorAdmin,
  actualizarColorAdmin,
  cambiarEstadoColorAdmin,
  eliminarColorAdmin
} from "../../../services/api";

const REGISTROS_POR_PAGINA = 6;

// El ID lo da el servidor (numérico); en la tabla se muestra como COL-001.
const formatoColor = (id) => `COL-${String(id).padStart(3, "0")}`;

const FORMULARIO_VACIO = {
  id: "",
  nombre: "",
  codigo_hex: ""
};


export default function Colores({ user }) {

  /* =====================================================
     PERMISOS (los botones sin permiso se ocultan)
     ===================================================== */

  const puedeCrear = tienePermiso(user, "Colores", "Crear");
  const puedeActualizar = tienePermiso(user, "Colores", "Actualizar");
  const puedeEliminar = tienePermiso(user, "Colores", "Eliminar");
  // El backend protege PATCH /estado con Colores:Actualizar.
  const puedeCambiarEstado = tienePermiso(user, "Colores", "Actualizar");
  const puedeConsultar = tienePermiso(user, "Colores", "Consultar");

  /* =====================================================
     COLORES (desde la API)
     ===================================================== */

  const [colores, setColores] = useState([]);
  const [cargando, setCargando] = useState(true);

  /* =====================================================
     ESTADOS DE LA VISTA
     ===================================================== */

  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [colorEliminar, setColorEliminar] = useState(null);

  const [aviso, setAviso] = useState(null);

  const [confirmarEdicion, setConfirmarEdicion] = useState(false);

  const { toast, mostrarToast } = useToast();

  useEffect(() => {
    obtenerColoresAdmin()
      .then(setColores)
      .catch((error) => mostrarToast(error.message, "error"))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =====================================================
     FORMULARIO
     ===================================================== */

  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);

  // Reglas alineadas con leerCuerpo() del backend (coloresAdmin.js):
  // nombre obligatorio (máx. 30, sin distinguir mayúsculas) y código
  // hexadecimal obligatorio con formato #RRGGBB.
  const REGLAS_COLOR = {
    nombre: (valor) => {
      const nombre = String(valor || "").trim();
      if (!nombre) return "Este campo es obligatorio.";

      if (nombre.length > 30) {
        return "El nombre no puede superar los 30 caracteres.";
      }

      const normalizarNombre = (texto) =>
        String(texto).trim().toLowerCase().replace(/\s+/g, " ");

      const yaExiste = colores.some(
        (item) =>
          normalizarNombre(item.nombre) === normalizarNombre(nombre) &&
          (!modoEdicion || item.id !== formulario.id)
      );
      if (yaExiste) return "Ya existe un registro con este nombre.";

      return "";
    },
    codigo_hex: (valor) => {
      const codigo = String(valor || "").trim();
      if (!codigo) return "Este campo es obligatorio.";
      if (!/^#[0-9A-Fa-f]{6}$/.test(codigo)) {
        return "El código debe tener el formato #RRGGBB.";
      }
      return "";
    }
  };

  const {
    errores,
    manejarBlur,
    revisarCampo,
    validarTodo,
    limpiarValidacion
  } = useValidacionFormulario(REGLAS_COLOR);

  /* =====================================================
     FILTRAR COLORES POR NOMBRE
     ===================================================== */

  const coloresFiltrados = colores.filter((color) => {
    const texto = busqueda.toLowerCase().trim();
    return color.nombre.toLowerCase().includes(texto);
  });

  /* =====================================================
     PAGINACIÓN DE LA TABLA
     ===================================================== */

  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(coloresFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio =
    (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const coloresPaginados = coloresFiltrados.slice(
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
     ABRIR MODAL DE NUEVO COLOR
     ===================================================== */

  const abrirAgregar = () => {
    // El ID lo asigna el servidor; el formulario pide nombre y código hex.
    setFormulario({ ...FORMULARIO_VACIO });

    limpiarValidacion();
    setModoEdicion(false);
    setMostrarModal(true);
  };

  /* =====================================================
     ABRIR MODAL DE EDICIÓN
     ===================================================== */

  const abrirEditar = (color) => {
    setFormulario({
      id: color.id,
      nombre: color.nombre,
      codigo_hex: color.codigo_hex || ""
    });

    limpiarValidacion();
    setModoEdicion(true);
    setMostrarModal(true);
  };

  /* =====================================================
     CAMBIAR CAMPO DEL FORMULARIO
     ===================================================== */

  const cambiarCampo = (campo, valor) => {
    const siguiente = { ...formulario, [campo]: valor };
    setFormulario(siguiente);

    // Si el campo ya fue tocado, su error se recalcula al instante.
    revisarCampo(campo, valor, siguiente);
  };

  /* =====================================================
     GUARDAR COLOR
     ===================================================== */

  const guardarColor = async () => {
    // Valida todo el formulario (mismas reglas que el backend) y,
    // si hay errores, enfoca el primer campo inválido.
    if (!validarTodo(formulario)) return;

    if (modoEdicion) {
      setConfirmarEdicion(true);
      return;
    }

    const datos = {
      nombre: formulario.nombre.trim(),
      codigo_hex: formulario.codigo_hex.trim()
    };

    try {
      const fila = await crearColorAdmin(datos);
      setColores((actuales) => [...actuales, fila]);
      mostrarToast("Color creado con éxito");
      cerrarModal();
    } catch (error) {
      mostrarToast(error.message, "error");
    }
  };

  const confirmarEdicionColor = async () => {
    const datos = {
      nombre: formulario.nombre.trim(),
      codigo_hex: formulario.codigo_hex.trim()
    };

    try {
      const fila = await actualizarColorAdmin(formulario.id, datos);
      setColores((actuales) =>
        actuales.map((color) => (color.id === fila.id ? fila : color))
      );
      setConfirmarEdicion(false);
      cerrarModal();
      mostrarToast("Color actualizado con éxito");
    } catch (error) {
      setConfirmarEdicion(false);
      mostrarToast(error.message, "error");
    }
  };

  /* =====================================================
     CAMBIAR ESTADO DEL COLOR
     ===================================================== */

  const cambiarEstado = async (color) => {
    const nuevoEstado =
      color.estado === "Activo" ? "Inactivo" : "Activo";

    try {
      const fila = await cambiarEstadoColorAdmin(color.id, nuevoEstado);
      setColores((actuales) =>
        actuales.map((item) => (item.id === fila.id ? fila : item))
      );
    } catch (error) {
      mostrarToast(error.message, "error");
    }
  };

  /* =====================================================
     ELIMINAR COLOR
     ===================================================== */

  const eliminarColor = (color) => {
    if (color.enUso) {
      setAviso(
        "No se puede eliminar el color porque está asociado a productos existentes. Puedes desactivarlo."
      );
      return;
    }

    setColorEliminar(color);
  };

  const confirmarEliminarColor = async () => {
    try {
      await eliminarColorAdmin(colorEliminar.id);
      setColores((actuales) =>
        actuales.filter((item) => item.id !== colorEliminar.id)
      );
      setColorEliminar(null);
      mostrarToast("Color eliminado con éxito");
    } catch (error) {
      setColorEliminar(null);
      setAviso(error.message);
    }
  };

  /* =====================================================
     CERRAR MODAL
     ===================================================== */

  const cerrarModal = () => {
    setMostrarModal(false);
    setModoEdicion(false);
  };


  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="colores-page">

      {/* =================================================
          ENCABEZADO
          ================================================= */}

      <div className="colores-header">

        <div className="colores-title">

          <h2>
            Colores
          </h2>

          <p>
            Administra los colores de los productos.
          </p>

        </div>

        <div className="colores-actions">

          {puedeConsultar && (
            <div className="colores-search">

              <Search size={18} />

              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
              />

            </div>
          )}

          {puedeCrear && (
            <button
              type="button"
              className="colores-add-button"
              onClick={abrirAgregar}
            >

              <Plus size={19} />

              <span>
                Registrar color
              </span>

            </button>
          )}

        </div>

      </div>


      {/* =================================================
          TABLA DE COLORES
          ================================================= */}

      <div className="colores-table-container">

        <table className="colores-table">

          <thead>

            <tr>

              <th>
                ID COLOR
              </th>

              <th>
                NOMBRE
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

            {coloresFiltrados.length > 0 ? (
              coloresPaginados.map((color) => (

                <tr key={color.id}>

                  <td>
                    <span className="color-id">
                      {formatoColor(color.id)}
                    </span>
                  </td>

                  <td>
                    <span className="color-nombre">
                      {color.nombre}
                    </span>
                    <span className="color-hex">
                      <span
                        className="color-hex-muestra"
                        style={{ backgroundColor: color.codigo_hex }}
                      ></span>
                      {color.codigo_hex}
                    </span>
                  </td>

                  <td>

                    <label
                      className="switch-color-estado"
                      title={
                        puedeCambiarEstado
                          ? (color.estado === "Activo"
                            ? "Hacer Inactivo"
                            : "Hacer Activo")
                          : undefined
                      }
                    >

                      {puedeCambiarEstado && (
                        <input
                          type="checkbox"
                          checked={color.estado === "Activo"}
                          onChange={() =>
                            cambiarEstado(color)
                          }
                        />
                      )}

                      {puedeCambiarEstado && (
                        <span className="slider-color"></span>
                      )}

                      <span className={`estado-color-texto ${color.estado === "Activo" ? "activo" : "inactivo"}`}>
                        {color.estado.toUpperCase()}
                      </span>

                    </label>

                  </td>

                  <td>

                    <div className="color-actions">

                      {puedeActualizar && (
                        <button
                          type="button"
                          title="Actualizar color"
                          onClick={() =>
                            abrirEditar(color)
                          }
                        >

                          <Pencil size={15} />

                        </button>
                      )}

                      {puedeEliminar && (
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() =>
                            eliminarColor(color)
                          }
                        >

                          <Trash2 size={15} />

                        </button>
                      )}

                    </div>

                  </td>

                </tr>

              ))
            ) : (
              <tr>

                <td
                  colSpan="4"
                  className="colores-empty"
                >
                  {cargando ? "Cargando colores..." : "Color no encontrado en el sistema."}
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

        <div
          className="color-modal-overlay"
          onClick={cerrarModal}
        >

          <div
            className="color-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="color-modal-header">

              <h3>
                {modoEdicion
                  ? "Actualizar Color"
                  : "Registrar Color"}
              </h3>

              <button
                type="button"
                className="color-modal-close"
                onClick={cerrarModal}
              >

                <X size={19} />

              </button>

            </div>

            <div className="color-modal-body">

              <div className="color-form-group">

                <label>
                  NOMBRE DEL COLOR
                </label>

                <input
                  type="text"
                  id="campo-nombre"
                  placeholder="Ej: Café"
                  maxLength={30}
                  value={formulario.nombre}
                  className={`input ${errores.nombre ? "input-error" : ""}`}
                  onChange={(e) =>
                    cambiarCampo(
                      "nombre",
                      e.target.value.replace(
                        /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s/]/g,
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

              <div className="color-form-group">

                <label>
                  CÓDIGO HEXADECIMAL
                </label>

                <input
                  type="text"
                  id="campo-codigo_hex"
                  placeholder="Ej: #A0522D"
                  maxLength={7}
                  value={formulario.codigo_hex}
                  className={`input ${errores.codigo_hex ? "input-error" : ""}`}
                  onChange={(e) =>
                    cambiarCampo(
                      "codigo_hex",
                      e.target.value.toUpperCase()
                    )
                  }
                  onBlur={() =>
                    manejarBlur(
                      "codigo_hex",
                      formulario.codigo_hex,
                      formulario
                    )
                  }
                />

                {errores.codigo_hex && (
                  <span className="error-text">
                    {errores.codigo_hex}
                  </span>
                )}

              </div>

            </div>

            <div className="color-modal-footer">

              <button
                type="button"
                className="color-cancel-button"
                onClick={cerrarModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="color-create-button"
                onClick={guardarColor}
              >
                {modoEdicion ? "Guardar" : "Crear"}
              </button>

            </div>

          </div>

        </div>

      )}

      {colorEliminar && (
        <ConfirmDialog
          abierto={colorEliminar !== null}
          titulo="Eliminar color"
          mensaje={
            <>¿Deseas eliminar el color "
              <strong>{colorEliminar.nombre}</strong>"? Esta
              acción no se puede deshacer.</>
          }
          textoConfirmar="Eliminar"
          textoCancelar="Cancelar"
          variante="peligro"
          onConfirmar={confirmarEliminarColor}
          onCancelar={() =>
            setColorEliminar(null)
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
          <>¿Deseas guardar los cambios realizados en el color "
            <strong>{formulario.nombre.trim()}</strong>"?</>
        }
        textoConfirmar="Guardar cambios"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEdicionColor}
        onCancelar={() => setConfirmarEdicion(false)}
      />

      <Toast toast={toast} />

    </div>
  );
}