import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X
} from "lucide-react";

import "./Tallas.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import useValidacionFormulario from "../../../shared/hooks/useValidacionFormulario";
import { tienePermiso } from "../utils/permisos";

import {
  obtenerTallasAdmin,
  crearTallaAdmin,
  actualizarTallaAdmin,
  cambiarEstadoTallaAdmin,
  eliminarTallaAdmin
} from "../../../shared/services/api";

const REGISTROS_POR_PAGINA = 6;

// El ID lo da el servidor (numérico); en la tabla se muestra como TAL-001.
const formatoTalla = (id) => `TAL-${String(id).padStart(3, "0")}`;

const FORMULARIO_VACIO = {
  id: "",
  nombre: ""
};


export default function Tallas({ user }) {

  /* =====================================================
     PERMISOS (los botones sin permiso se ocultan)
     ===================================================== */

  const puedeCrear = tienePermiso(user, "Tallas", "Crear");
  const puedeActualizar = tienePermiso(user, "Tallas", "Actualizar");
  const puedeEliminar = tienePermiso(user, "Tallas", "Eliminar");
  // El backend protege PATCH /estado con Tallas:Actualizar.
  const puedeCambiarEstado = tienePermiso(user, "Tallas", "Actualizar");
  const puedeConsultar = tienePermiso(user, "Tallas", "Consultar");

  /* =====================================================
     TALLAS (desde la API)
     ===================================================== */

  const [tallas, setTallas] = useState([]);
  const [cargando, setCargando] = useState(true);

  /* =====================================================
     ESTADOS DE LA VISTA
     ===================================================== */

  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [tallaEliminar, setTallaEliminar] = useState(null);

  const [aviso, setAviso] = useState(null);

  const [confirmarEdicion, setConfirmarEdicion] = useState(false);

  const { toast, mostrarToast } = useToast();

  useEffect(() => {
    obtenerTallasAdmin()
      .then(setTallas)
      .catch((error) => mostrarToast(error.message, "error"))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =====================================================
     FORMULARIO
     ===================================================== */

  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);

  // Reglas alineadas con leerCuerpo() del backend (tallasAdmin.js):
  // nombre obligatorio, sin distinguir mayúsculas y máximo 10 caracteres.
  const REGLAS_TALLA = {
    nombre: (valor) => {
      const nombre = String(valor || "").trim();
      if (!nombre) return "Este campo es obligatorio.";

      if (nombre.length > 10) {
        return "El nombre no puede superar los 10 caracteres.";
      }

      const yaExiste = tallas.some(
        (item) =>
          item.nombre.trim().toLowerCase() === nombre.toLowerCase() &&
          (!modoEdicion || item.id !== formulario.id)
      );
      if (yaExiste) return "Ya existe un registro con este nombre.";

      return "";
    }
  };

  const {
    errores,
    manejarBlur,
    revisarCampo,
    validarTodo,
    limpiarValidacion
  } = useValidacionFormulario(REGLAS_TALLA);

  /* =====================================================
     FILTRAR TALLAS POR NOMBRE
     ===================================================== */

  const tallasFiltradas = tallas.filter((talla) => {
    const texto = busqueda.toLowerCase().trim();
    return talla.nombre.toLowerCase().includes(texto);
  });

  /* =====================================================
     PAGINACIÓN DE LA TABLA
     ===================================================== */

  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(tallasFiltradas.length / REGISTROS_POR_PAGINA)
  );

  const inicio =
    (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const tallasPaginadas = tallasFiltradas.slice(
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
     ABRIR MODAL DE NUEVA TALLA
     ===================================================== */

  const abrirAgregar = () => {
    // El ID lo asigna el servidor; el formulario solo pide el nombre.
    setFormulario({ ...FORMULARIO_VACIO });

    limpiarValidacion();
    setModoEdicion(false);
    setMostrarModal(true);
  };

  /* =====================================================
     ABRIR MODAL DE EDICIÓN
     ===================================================== */

  const abrirEditar = (talla) => {
    setFormulario({
      id: talla.id,
      nombre: talla.nombre
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
     GUARDAR TALLA
     ===================================================== */

  const guardarTalla = async () => {
    // Valida todo el formulario (mismas reglas que el backend) y,
    // si hay errores, enfoca el primer campo inválido.
    if (!validarTodo(formulario)) return;

    if (modoEdicion) {
      setConfirmarEdicion(true);
      return;
    }

    try {
      const fila = await crearTallaAdmin({ nombre: formulario.nombre.trim() });
      setTallas((actuales) => [...actuales, fila]);
      mostrarToast("Talla creada con éxito");
      cerrarModal();
    } catch (error) {
      mostrarToast(error.message, "error");
    }
  };

  const confirmarEdicionTalla = async () => {
    try {
      const fila = await actualizarTallaAdmin(formulario.id, {
        nombre: formulario.nombre.trim()
      });
      setTallas((actuales) =>
        actuales.map((talla) => (talla.id === fila.id ? fila : talla))
      );
      setConfirmarEdicion(false);
      cerrarModal();
      mostrarToast("Talla actualizada con éxito");
    } catch (error) {
      setConfirmarEdicion(false);
      mostrarToast(error.message, "error");
    }
  };

  /* =====================================================
     CAMBIAR ESTADO DE LA TALLA
     ===================================================== */

  const cambiarEstado = async (talla) => {
    const nuevoEstado =
      talla.estado === "Activo" ? "Inactivo" : "Activo";

    try {
      const fila = await cambiarEstadoTallaAdmin(talla.id, nuevoEstado);
      setTallas((actuales) =>
        actuales.map((item) => (item.id === fila.id ? fila : item))
      );
    } catch (error) {
      mostrarToast(error.message, "error");
    }
  };

  /* =====================================================
     ELIMINAR TALLA
     ===================================================== */

  const eliminarTalla = (talla) => {
    if (talla.enUso) {
      setAviso(
        "No se puede eliminar la talla porque está asociada a productos existentes. Puedes desactivarla."
      );
      return;
    }

    setTallaEliminar(talla);
  };

  const confirmarEliminarTalla = async () => {
    try {
      await eliminarTallaAdmin(tallaEliminar.id);
      setTallas((actuales) =>
        actuales.filter((item) => item.id !== tallaEliminar.id)
      );
      setTallaEliminar(null);
      mostrarToast("Talla eliminada con éxito");
    } catch (error) {
      setTallaEliminar(null);
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
    <div className="tallas-page">

      {/* =================================================
          ENCABEZADO
          ================================================= */}

      <div className="tallas-header">

        <div className="tallas-title">

          <h2>
            Tallas
          </h2>

          <p>
            Administra las tallas de los productos.
          </p>

        </div>

        <div className="tallas-actions">

          {puedeConsultar && (
            <div className="tallas-search">

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
              className="tallas-add-button"
              onClick={abrirAgregar}
            >

              <Plus size={19} />

              <span>
                Registrar talla
              </span>

            </button>
          )}

        </div>

      </div>


      {/* =================================================
          TABLA DE TALLAS
          ================================================= */}

      <div className="tallas-table-container">

        <table className="tallas-table">

          <thead>

            <tr>

              <th>
                ID TALLA
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

            {tallasFiltradas.length > 0 ? (
              tallasPaginadas.map((talla) => (

                <tr key={talla.id}>

                  <td>
                    <span className="talla-id">
                      {formatoTalla(talla.id)}
                    </span>
                  </td>

                  <td>
                    <span className="talla-nombre">
                      {talla.nombre}
                    </span>
                  </td>

                  <td>

                    <label
                      className="switch-talla-estado"
                      title={
                        puedeCambiarEstado
                          ? (talla.estado === "Activo"
                            ? "Hacer Inactiva"
                            : "Hacer Activa")
                          : undefined
                      }
                    >

                      {puedeCambiarEstado && (
                        <input
                          type="checkbox"
                          checked={talla.estado === "Activo"}
                          onChange={() =>
                            cambiarEstado(talla)
                          }
                        />
                      )}

                      {puedeCambiarEstado && (
                        <span className="slider-talla"></span>
                      )}

                      <span className={`estado-talla-texto ${talla.estado === "Activo" ? "activo" : "inactivo"}`}>
                        {talla.estado.toUpperCase()}
                      </span>

                    </label>

                  </td>

                  <td>

                    <div className="talla-actions">

                      {puedeActualizar && (
                        <button
                          type="button"
                          title="Actualizar talla"
                          onClick={() =>
                            abrirEditar(talla)
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
                            eliminarTalla(talla)
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
                  className="tallas-empty"
                >
                  {cargando ? "Cargando tallas..." : "Talla no encontrada en el sistema."}
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
          className="talla-modal-overlay"
          onClick={cerrarModal}
        >

          <div
            className="talla-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="talla-modal-header">

              <h3>
                {modoEdicion
                  ? "Actualizar Talla"
                  : "Registrar Talla"}
              </h3>

              <button
                type="button"
                className="talla-modal-close"
                onClick={cerrarModal}
              >

                <X size={19} />

              </button>

            </div>

            <div className="talla-modal-body">

              <div className="talla-form-group">

                <label>
                  NOMBRE DE LA TALLA
                </label>

                <input
                  type="text"
                  id="campo-nombre"
                  placeholder="Ej: M"
                  maxLength={10}
                  value={formulario.nombre}
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

            </div>

            <div className="talla-modal-footer">

              <button
                type="button"
                className="talla-cancel-button"
                onClick={cerrarModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="talla-create-button"
                onClick={guardarTalla}
              >
                {modoEdicion ? "Guardar" : "Crear"}
              </button>

            </div>

          </div>

        </div>

      )}

      {tallaEliminar && (
        <ConfirmDialog
          abierto={tallaEliminar !== null}
          titulo="Eliminar talla"
          mensaje={
            <>¿Deseas eliminar la talla "
              <strong>{tallaEliminar.nombre}</strong>"? Esta
              acción no se puede deshacer.</>
          }
          textoConfirmar="Eliminar"
          textoCancelar="Cancelar"
          variante="peligro"
          onConfirmar={confirmarEliminarTalla}
          onCancelar={() =>
            setTallaEliminar(null)
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
          <>¿Deseas guardar los cambios realizados en la talla "
            <strong>{formulario.nombre.trim()}</strong>"?</>
        }
        textoConfirmar="Guardar cambios"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEdicionTalla}
        onCancelar={() => setConfirmarEdicion(false)}
      />

      <Toast toast={toast} />

    </div>
  );
}