import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X
} from "lucide-react";

import "./Categorias.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import useValidacionFormulario from "../../../shared/hooks/useValidacionFormulario";
import { tienePermiso } from "../utils/permisos";

import {
  obtenerCategoriasAdmin,
  crearCategoriaAdmin,
  actualizarCategoriaAdmin,
  cambiarEstadoCategoriaAdmin,
  eliminarCategoriaAdmin
} from "../../../shared/services/api";

import { urlImagen } from "../../../shared/utils/imagenes";

const REGISTROS_POR_PAGINA = 6;

const GENEROS = [
  { valor: "hombre", etiqueta: "Hombre" },
  { valor: "mujer", etiqueta: "Mujer" }
];

const FORMULARIO_VACIO = {
  id: "",
  nombre: "",
  descripcion: "",
  generos: [],
  imagen: "",
  estado: "Activo"
};

export default function Categorias({ user }) {

  /* =====================================================
     PERMISOS (los botones sin permiso se ocultan)
     ===================================================== */

  const puedeCrear = tienePermiso(user, "Categorías", "Crear");
  const puedeActualizar = tienePermiso(user, "Categorías", "Actualizar");
  const puedeEliminar = tienePermiso(user, "Categorías", "Eliminar");
  const puedeCambiarEstado = tienePermiso(user, "Categorías", "Cambiar estado");
  const puedeConsultar = tienePermiso(user, "Categorías", "Consultar");

  /* =====================================================
     CATEGORÍAS (desde la API)
     ===================================================== */

  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  const { toast, mostrarToast } = useToast();

  useEffect(() => {
    obtenerCategoriasAdmin()
      .then(setCategorias)
      .catch((error) => mostrarToast(error.message, "error"))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =====================================================
     ESTADOS DE LA VISTA
     ===================================================== */

  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [categoriaEliminar, setCategoriaEliminar] = useState(null);

  const [aviso, setAviso] = useState(null);

  const [confirmarEdicion, setConfirmarEdicion] = useState(false);

  /* =====================================================
     FORMULARIO
     ===================================================== */

  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);

  // Reglas alineadas con leerCuerpo() del backend (categoriasAdmin.js):
  // nombre obligatorio (máx. 20), descripción (máx. 200), al menos un
  // género y imagen (máx. 300).
  const REGLAS_CATEGORIA = {
    nombre: (valor) => {
      const nombre = String(valor || "").trim();
      if (!nombre) return "Este campo es obligatorio.";
      if (nombre.length > 20) {
        return "El nombre no puede superar los 20 caracteres.";
      }

      const yaExiste = categorias.some(
        (item) =>
          item.nombre.trim().toLowerCase() === nombre.toLowerCase() &&
          (!modoEdicion || item.id !== formulario.id)
      );
      if (yaExiste) return "Ya existe un registro con este nombre.";

      return "";
    },
    descripcion: (valor) =>
      String(valor || "").trim().length > 200
        ? "La descripción no puede superar los 200 caracteres."
        : "",
    generos: (valor) =>
      Array.isArray(valor) && valor.length > 0
        ? ""
        : "Selecciona al menos un género.",
    imagen: (valor) =>
      String(valor || "").trim().length > 300
        ? "La imagen no puede superar los 300 caracteres."
        : ""
  };

  const {
    errores,
    manejarBlur,
    revisarCampo,
    validarTodo,
    limpiarValidacion
  } = useValidacionFormulario(REGLAS_CATEGORIA);

  /* =====================================================
     FILTRAR CATEGORÍAS POR NOMBRE
     ===================================================== */

  const categoriasFiltradas = categorias.filter((categoria) => {
    const texto = busqueda.toLowerCase().trim();
    return categoria.nombre.toLowerCase().includes(texto);
  });

  /* =====================================================
     PAGINACIÓN DE LA TABLA
     ===================================================== */

  const [paginaSolicitada, setPaginaSolicitada] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(categoriasFiltradas.length / REGISTROS_POR_PAGINA)
  );

  const paginaActual = Math.min(paginaSolicitada, totalPaginas);
  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const categoriasPaginadas = categoriasFiltradas.slice(
    inicio,
    inicio + REGISTROS_POR_PAGINA
  );

  /* =====================================================
     ABRIR MODAL DE NUEVA CATEGORÍA
     ===================================================== */

  const abrirAgregar = () => {
    setFormulario({ ...FORMULARIO_VACIO });
    limpiarValidacion();
    setModoEdicion(false);
    setMostrarModal(true);
  };

  /* =====================================================
     ABRIR MODAL DE EDICIÓN
     ===================================================== */

  const abrirEditar = (categoria) => {
    setFormulario({
      id: categoria.id,
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || "",
      generos: Array.isArray(categoria.generos) ? [...categoria.generos] : [],
      imagen: categoria.imagen || "",
      estado: categoria.estado
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

  const alternarGenero = (genero) => {
    const generos = formulario.generos.includes(genero)
      ? formulario.generos.filter((g) => g !== genero)
      : [...formulario.generos, genero];

    const siguiente = { ...formulario, generos };
    setFormulario(siguiente);

    revisarCampo("generos", generos, siguiente);
  };

  /* =====================================================
     GUARDAR CATEGORÍA
     ===================================================== */

  const guardarCategoria = async () => {
    // Valida todo el formulario (mismas reglas que el backend) y,
    // si hay errores, enfoca el primer campo inválido.
    if (!validarTodo(formulario)) return;

    if (modoEdicion) {
      setConfirmarEdicion(true);
      return;
    }

    const datos = {
      nombre: formulario.nombre.trim(),
      descripcion: formulario.descripcion.trim(),
      generos: formulario.generos,
      imagen: formulario.imagen.trim(),
      estado: formulario.estado
    };

    try {
      const fila = await crearCategoriaAdmin(datos);
      setCategorias((actuales) => [fila, ...actuales]);
      setBusqueda("");
      setPaginaSolicitada(1);
      mostrarToast("Categoría creada con éxito");
      cerrarModal();
    } catch (error) {
      mostrarToast(error.message, "error");
    }
  };

  const confirmarEdicionCategoria = async () => {
    const datos = {
      nombre: formulario.nombre.trim(),
      descripcion: formulario.descripcion.trim(),
      generos: formulario.generos,
      imagen: formulario.imagen.trim(),
      estado: formulario.estado
    };

    try {
      const fila = await actualizarCategoriaAdmin(formulario.id, datos);
      setCategorias((actuales) =>
        actuales.map((categoria) => (categoria.id === fila.id ? fila : categoria))
      );
      setConfirmarEdicion(false);
      cerrarModal();
      mostrarToast("Categoría actualizada con éxito");
    } catch (error) {
      setConfirmarEdicion(false);
      mostrarToast(error.message, "error");
    }
  };

  /* =====================================================
     CAMBIAR ESTADO ACTIVO / INACTIVO
     ===================================================== */

  const cambiarEstado = async (categoria) => {
    const nuevoEstado = categoria.estado === "Activo" ? "Inactivo" : "Activo";

    try {
      const fila = await cambiarEstadoCategoriaAdmin(categoria.id, nuevoEstado);
      setCategorias((actuales) =>
        actuales.map((item) => (item.id === fila.id ? fila : item))
      );
      setCategoriaSeleccionada((actual) =>
        actual && actual.id === fila.id ? fila : actual
      );
    } catch (error) {
      mostrarToast(error.message, "error");
    }
  };

  /* =====================================================
     ELIMINAR CATEGORÍA
     ===================================================== */

  const eliminarCategoria = (categoria) => {
    if (categoria.productos > 0) {
      setAviso(
        "No se puede eliminar la categoría porque está asociada a productos existentes. Puedes desactivarla."
      );
      return;
    }

    setCategoriaEliminar(categoria);
  };

  const confirmarEliminarCategoria = async () => {
    try {
      await eliminarCategoriaAdmin(categoriaEliminar.id);
      setCategorias((actuales) =>
        actuales.filter((item) => item.id !== categoriaEliminar.id)
      );
      setCategoriaEliminar(null);
      mostrarToast("Categoría eliminada con éxito");
    } catch (error) {
      setCategoriaEliminar(null);
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
     VER DETALLE DE CATEGORÍA
     ===================================================== */

  const verDetalle = (categoria) => {
    setCategoriaSeleccionada(categoria);
  };

  const cerrarDetalle = () => {
    setCategoriaSeleccionada(null);
  };

  const textoGeneros = (categoria) => {
    const generos = Array.isArray(categoria?.generos) ? categoria.generos : [];
    if (generos.length === 0) return "—";
    return generos
      .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
      .join(" · ");
  };

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="categorias-page">

      {/* ENCABEZADO */}

      <div className="categorias-header">

        <div className="categorias-title">
          <h2>Categorías</h2>
          <p>Administra las categorías de los productos.</p>
        </div>

        <div className="categorias-actions">

          {puedeConsultar && (
            <div className="categorias-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={busqueda}
                onChange={(e) => {
                  setPaginaSolicitada(1);
                  setBusqueda(e.target.value);
                }}
              />
            </div>
          )}

          {puedeCrear && (
            <button
              type="button"
              className="categorias-add-button"
              onClick={abrirAgregar}
            >
              <Plus size={19} />
              <span>Registrar categoría</span>
            </button>
          )}

        </div>

      </div>

      {/* TABLA */}

      <div className="categorias-table-container">

        <table className="categorias-table">

          <thead>
            <tr>
              <th>ID CATEGORÍA</th>
              <th>NOMBRE</th>
              <th>ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>

          <tbody>

            {categoriasPaginadas.length > 0 ? (
              categoriasPaginadas.map((categoria) => (

                <tr key={categoria.id}>

                  <td>
                    <span className="categoria-id">{categoria.id}</span>
                  </td>

                  <td>
                    <span className="categoria-nombre">{categoria.nombre}</span>
                    <span className="categoria-descripcion">
                      {textoGeneros(categoria)}
                    </span>
                  </td>

                  <td>
                    <label
                      className="switch-categoria-estado"
                      title={puedeCambiarEstado ? (categoria.estado === "Activo" ? "Hacer Inactiva" : "Hacer Activa") : undefined}
                    >
                      {puedeCambiarEstado && (
                        <input
                          type="checkbox"
                          checked={categoria.estado === "Activo"}
                          onChange={() => cambiarEstado(categoria)}
                        />
                      )}
                      {puedeCambiarEstado && (
                        <span className="slider-categoria"></span>
                      )}
                      <span className={`estado-categoria-texto ${categoria.estado === "Activo" ? "activo" : "inactivo"}`}>
                        {categoria.estado.toUpperCase()}
                      </span>
                    </label>
                  </td>

                  <td>
                    <div className="categoria-actions">

                      {puedeConsultar && (
                        <button type="button" title="Ver" onClick={() => verDetalle(categoria)}>
                          <Eye size={15} />
                        </button>
                      )}

                      {puedeActualizar && (
                        <button type="button" title="Actualizar categoría" onClick={() => abrirEditar(categoria)}>
                          <Pencil size={15} />
                        </button>
                      )}

                      {puedeEliminar && (
                        <button type="button" title="Eliminar" onClick={() => eliminarCategoria(categoria)}>
                          <Trash2 size={15} />
                        </button>
                      )}

                    </div>
                  </td>

                </tr>

              ))
            ) : (
              <tr>
                <td colSpan="4" className="categorias-empty">
                  {cargando ? "Cargando categorías..." : "Categoría no encontrada en el sistema."}
                </td>
              </tr>
            )}

          </tbody>

        </table>

        <Pagination
          currentPage={paginaActual}
          totalPages={totalPaginas}
          onPageChange={setPaginaSolicitada}
        />

      </div>

      {/* MODAL AGREGAR / EDITAR */}

      {mostrarModal && (

        <div className="categoria-modal-overlay" onClick={cerrarModal}>

          <div className="categoria-modal" onClick={(e) => e.stopPropagation()}>

            <div className="categoria-modal-header">
              <h3>{modoEdicion ? "Actualizar Categoría" : "Registrar Categoría"}</h3>
              <button type="button" className="categoria-modal-close" onClick={cerrarModal}>
                <X size={19} />
              </button>
            </div>

            <div className="categoria-modal-body">

              <div className="categoria-form-row">

                <div className="categoria-form-group">
                  <label>IDENTIFICADOR</label>
                  <input
                    type="text"
                    value={formulario.id || "Se genera automáticamente"}
                    disabled
                  />
                </div>

                <div className="categoria-form-group">
                  <label>ESTADO</label>
                  <select
                    value={formulario.estado}
                    onChange={(e) => cambiarCampo("estado", e.target.value)}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>

              </div>

              <div className="categoria-form-group">
                <label>NOMBRE</label>
                <input
                  type="text"
                  id="campo-nombre"
                  placeholder="Ej: Camisetas"
                  maxLength={20}
                  value={formulario.nombre}
                  className={`input ${errores.nombre ? "input-error" : ""}`}
                  onChange={(e) =>
                    cambiarCampo(
                      "nombre",
                      e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "")
                    )
                  }
                  onBlur={() =>
                    manejarBlur("nombre", formulario.nombre, formulario)
                  }
                />
                {errores.nombre && <span className="error-text">{errores.nombre}</span>}
              </div>

              <div className="categoria-form-group">
                <label>DESCRIPCIÓN</label>
                <input
                  type="text"
                  id="campo-descripcion"
                  placeholder="Ej: Todo tipo de camisetas"
                  maxLength={200}
                  value={formulario.descripcion}
                  className={`input ${errores.descripcion ? "input-error" : ""}`}
                  onChange={(e) => cambiarCampo("descripcion", e.target.value)}
                  onBlur={() =>
                    manejarBlur(
                      "descripcion",
                      formulario.descripcion,
                      formulario
                    )
                  }
                />
                {errores.descripcion && (
                  <span className="error-text">{errores.descripcion}</span>
                )}
              </div>

              <div className="categoria-form-group">
                <label>GÉNEROS PERMITIDOS</label>
                <div className="categoria-generos-checks">
                  {GENEROS.map((genero) => (
                    <label key={genero.valor} className="categoria-genero-opcion">
                      <input
                        type="checkbox"
                        checked={formulario.generos.includes(genero.valor)}
                        onChange={() => alternarGenero(genero.valor)}
                      />
                      <span>{genero.etiqueta}</span>
                    </label>
                  ))}
                </div>
                {errores.generos && <span className="error-text">{errores.generos}</span>}
              </div>

              <div className="categoria-form-group">
                <label>IMAGEN</label>
                <input
                  type="text"
                  id="campo-imagen"
                  placeholder="camisa.png o https://..."
                  value={formulario.imagen}
                  className={`input ${errores.imagen ? "input-error" : ""}`}
                  onChange={(e) => cambiarCampo("imagen", e.target.value)}
                  onBlur={() =>
                    manejarBlur("imagen", formulario.imagen, formulario)
                  }
                />
                {errores.imagen && (
                  <span className="error-text">{errores.imagen}</span>
                )}
                {urlImagen(formulario.imagen) && (
                  <img
                    className="categoria-imagen-preview"
                    src={urlImagen(formulario.imagen)}
                    alt="Vista previa"
                  />
                )}
                <span className="categoria-ayuda">
                  Nombre de un archivo de assets/img (por ejemplo camisa.png)
                  o una URL completa. Si se deja vacía, la categoría no aparece
                  en el carrusel del inicio.
                </span>
              </div>

            </div>

            <div className="categoria-modal-footer">
              <button type="button" className="categoria-cancel-button" onClick={cerrarModal}>
                Cancelar
              </button>
              <button type="button" className="categoria-create-button" onClick={guardarCategoria}>
                {modoEdicion ? "Guardar" : "Crear"}
              </button>
            </div>

          </div>

        </div>

      )}

      {/* MODAL VER DETALLE */}

      {categoriaSeleccionada && (

        <div className="categoria-modal-overlay" onClick={cerrarDetalle}>

          <div className="categoria-modal" onClick={(e) => e.stopPropagation()}>

            <div className="categoria-modal-header">
              <h3>Detalle de la Categoría</h3>
              <button type="button" className="categoria-modal-close" onClick={cerrarDetalle}>
                <X size={19} />
              </button>
            </div>

            <div className="categoria-modal-body">

              <div className="categoria-detail-top">
                <div className="categoria-detail-avatar">
                  {categoriaSeleccionada.nombre.charAt(0)}
                </div>
                <div>
                  <strong>{categoriaSeleccionada.nombre}</strong>
                  <span>{categoriaSeleccionada.id}</span>
                </div>
              </div>

              <div className="categoria-form-row">

                <div className="categoria-info-group">
                  <label>IDENTIFICADOR</label>
                  <div className="categoria-info-value">{categoriaSeleccionada.id}</div>
                </div>

                <div className="categoria-info-group">
                  <label>ESTADO</label>
                  <div className="categoria-info-value">
                    <label className="switch-categoria-estado">
                      <input
                        type="checkbox"
                        checked={categoriaSeleccionada.estado === "Activo"}
                        disabled
                        readOnly
                      />
                      <span className="slider-categoria"></span>
                      <span className={`estado-categoria-texto ${categoriaSeleccionada.estado === "Activo" ? "activo" : "inactivo"}`}>
                        {categoriaSeleccionada.estado.toUpperCase()}
                      </span>
                    </label>
                  </div>
                </div>

              </div>

              <div className="categoria-form-row">

                <div className="categoria-info-group">
                  <label>NOMBRE</label>
                  <div className="categoria-info-value">{categoriaSeleccionada.nombre}</div>
                </div>

                <div className="categoria-info-group">
                  <label>EN USO POR PRODUCTOS</label>
                  <div className="categoria-info-value">
                    {categoriaSeleccionada.productos > 0
                      ? `Sí (${categoriaSeleccionada.productos})`
                      : "No"}
                  </div>
                </div>

              </div>

              <div className="categoria-form-row">

                <div className="categoria-info-group">
                  <label>GÉNEROS</label>
                  <div className="categoria-info-value">
                    {textoGeneros(categoriaSeleccionada)}
                  </div>
                </div>

                <div className="categoria-info-group">
                  <label>IMAGEN</label>
                  <div className="categoria-info-value">
                    {categoriaSeleccionada.imagen || "Sin imagen"}
                  </div>
                </div>

              </div>

              <div className="categoria-info-group">
                <label>DESCRIPCIÓN</label>
                <div className="categoria-info-value">
                  {categoriaSeleccionada.descripcion || "—"}
                </div>
              </div>

            </div>

            <div className="categoria-modal-footer">
              <button
                type="button"
                className="categoria-cancel-button detail-cerrar-button"
                onClick={cerrarDetalle}
              >
                Cerrar
              </button>
            </div>

          </div>

        </div>

      )}

      {categoriaEliminar && (
        <ConfirmDialog
          abierto={categoriaEliminar !== null}
          titulo="Eliminar categoría"
          mensaje={
            <>¿Deseas eliminar la categoría "
              <strong>{categoriaEliminar.nombre}</strong>"? Esta
              acción no se puede deshacer.</>
          }
          textoConfirmar="Eliminar"
          textoCancelar="Cancelar"
          variante="peligro"
          onConfirmar={confirmarEliminarCategoria}
          onCancelar={() => setCategoriaEliminar(null)}
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
          <>¿Deseas guardar los cambios realizados en "
            <strong>{formulario.nombre.trim()}</strong>"?</>
        }
        textoConfirmar="Guardar cambios"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEdicionCategoria}
        onCancelar={() => setConfirmarEdicion(false)}
      />

      <Toast toast={toast} />

    </div>
  );
}
