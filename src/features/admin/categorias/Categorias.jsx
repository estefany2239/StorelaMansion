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

const REGISTROS_POR_PAGINA = 6;


export default function Categorias() {

  /* =====================================================
     CATEGORÍAS DE PRODUCTOS
     ===================================================== */

  const [categorias, setCategorias] = useState([
    { id: "CAT-001", nombre: "Camisetas", descripcion: "Camisetas básicas y estampadas para hombre y mujer.", estado: "Activo", enUso: true },
    { id: "CAT-002", nombre: "Gorras", descripcion: "Gorras y viseras de diferentes estilos.", estado: "Activo", enUso: true },
    { id: "CAT-003", nombre: "Relojes", descripcion: "Relojes de pulso ejecutivos y deportivos.", estado: "Activo", enUso: true },
    { id: "CAT-004", nombre: "Pantalones", descripcion: "Jeans y pantalones de vestir.", estado: "Activo", enUso: false },
    { id: "CAT-005", nombre: "Busos", descripcion: "Busos y sudaderas con capota.", estado: "Inactivo", enUso: false },
    { id: "CAT-006", nombre: "Tenis", descripcion: "Tenis urbanos y deportivos.", estado: "Activo", enUso: false },
    { id: "CAT-007", nombre: "Blazers", descripcion: "Blazers para hombre y mujer.", estado: "Activo", enUso: false }
  ]);

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

  const { toast, mostrarToast } = useToast();

  /* =====================================================
     FORMULARIO
     ===================================================== */

  const [formulario, setFormulario] = useState({
    id: "",
    nombre: "",
    descripcion: "",
    estado: "Activo"
  });

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

  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(categoriasFiltradas.length / REGISTROS_POR_PAGINA)
  );

  const inicio =
    (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const categoriasPaginadas = categoriasFiltradas.slice(
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
     ABRIR MODAL DE NUEVA CATEGORÍA
     ===================================================== */

  const abrirAgregar = () => {
    const siguienteNumero = categorias.reduce((max, item) => {
      const numero = Number(item.id.split("-")[1]) || 0;
      return Math.max(max, numero);
    }, 0) + 1;

    setFormulario({
      id: `CAT-${String(siguienteNumero).padStart(3, "0")}`,
      nombre: "",
      descripcion: "",
      estado: "Activo"
    });

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
      descripcion: categoria.descripcion,
      estado: categoria.estado
    });

    setModoEdicion(true);
    setMostrarModal(true);
  };

  /* =====================================================
     CAMBIAR CAMPO DEL FORMULARIO
     ===================================================== */

  const cambiarCampo = (campo, valor) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor
    }));
  };

  /* =====================================================
     GUARDAR CATEGORÍA
     ===================================================== */

  const guardarCategoria = () => {
    if (!formulario.nombre.trim()) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    if (modoEdicion) {
      setConfirmarEdicion(true);
      return;
    }

    setCategorias((actuales) => [
      ...actuales,
      {
        id: formulario.id,
        nombre: formulario.nombre.trim(),
        descripcion: formulario.descripcion.trim(),
        estado: formulario.estado,
        enUso: false
      }
    ]);

    mostrarToast("Categoría creada con éxito");
    cerrarModal();
  };

  const confirmarEdicionCategoria = () => {
    setCategorias((actuales) =>
      actuales.map((categoria) =>
        categoria.id === formulario.id
          ? {
              ...categoria,
              nombre: formulario.nombre.trim(),
              descripcion: formulario.descripcion.trim(),
              estado: formulario.estado
            }
          : categoria
      )
    );

    setConfirmarEdicion(false);
    cerrarModal();
  };

  /* =====================================================
     CAMBIAR ESTADO ACTIVO / INACTIVO
     ===================================================== */

  const cambiarEstado = (categoria) => {
    const nuevoEstado =
      categoria.estado === "Activo" ? "Inactivo" : "Activo";

    setCategorias((actuales) =>
      actuales.map((item) =>
        item.id === categoria.id
          ? { ...item, estado: nuevoEstado }
          : item
      )
    );
  };

  /* =====================================================
     ELIMINAR CATEGORÍA
     ===================================================== */

  const eliminarCategoria = (categoria) => {
    if (categoria.enUso) {
      setAviso(
        "No se puede eliminar la categoría porque está asociada a productos existentes."
      );
      return;
    }

    setCategoriaEliminar(categoria);
  };

  const confirmarEliminarCategoria = () => {
    setCategorias((actuales) =>
      actuales.filter((item) => item.id !== categoriaEliminar.id)
    );

    setCategoriaEliminar(null);
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


  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="categorias-page">

      {/* =================================================
          ENCABEZADO
          ================================================= */}

      <div className="categorias-header">

        <div className="categorias-title">

          <h2>
            Categorías
          </h2>

          <p>
            Administra las categorías de los productos.
          </p>

        </div>

        <div className="categorias-actions">

          <div className="categorias-search">

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

          <button
            type="button"
            className="categorias-add-button"
            onClick={abrirAgregar}
          >

            <Plus size={19} />

            <span>
              Agregar categoría
            </span>

          </button>

        </div>

      </div>


      {/* =================================================
          TABLA DE CATEGORÍAS
          ================================================= */}

      <div className="categorias-table-container">

        <table className="categorias-table">

          <thead>

            <tr>

              <th>
                ID CATEGORÍA
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

            {categoriasFiltradas.length > 0 ? (
              categoriasPaginadas.map((categoria) => (

                <tr key={categoria.id}>

                  <td>
                    <span className="categoria-id">
                      {categoria.id}
                    </span>
                  </td>

                  <td>
                    <span className="categoria-nombre">
                      {categoria.nombre}
                    </span>
                  </td>

                  <td>

                    <label
                      className="switch-categoria-estado"
                      title={
                        categoria.estado === "Activo"
                          ? "Hacer Inactiva"
                          : "Hacer Activa"
                      }
                    >

                      <input
                        type="checkbox"
                        checked={categoria.estado === "Activo"}
                        onChange={() =>
                          cambiarEstado(categoria)
                        }
                      />

                      <span className="slider-categoria"></span>

                      <span className={`estado-categoria-texto ${categoria.estado === "Activo" ? "activo" : "inactivo"}`}>
                        {categoria.estado.toUpperCase()}
                      </span>

                    </label>

                  </td>

                  <td>

                    <div className="categoria-actions">

                      <button
                        type="button"
                        title="Ver"
                        onClick={() =>
                          verDetalle(categoria)
                        }
                      >

                        <Eye size={15} />

                      </button>

                      <button
                        type="button"
                        title="Editar"
                        onClick={() =>
                          abrirEditar(categoria)
                        }
                      >

                        <Pencil size={15} />

                      </button>

                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() =>
                          eliminarCategoria(categoria)
                        }
                      >

                        <Trash2 size={15} />

                      </button>

                    </div>

                  </td>

                </tr>

              ))
            ) : (
              <tr>

                <td
                  colSpan="4"
                  className="categorias-empty"
                >
                  Categoría no encontrada en el sistema.
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
          className="categoria-modal-overlay"
          onClick={cerrarModal}
        >

          <div
            className="categoria-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="categoria-modal-header">

              <h3>
                {modoEdicion
                  ? "Editar Categoría"
                  : "Nueva Categoría"}
              </h3>

              <button
                type="button"
                className="categoria-modal-close"
                onClick={cerrarModal}
              >

                <X size={19} />

              </button>

            </div>

            <div className="categoria-modal-body">

              <div className="categoria-form-row">

                <div className="categoria-form-group">

                  <label>
                    IDENTIFICADOR
                  </label>

                  <input
                    type="text"
                    value={formulario.id}
                    disabled
                  />

                </div>

                <div className="categoria-form-group">

                  <label>
                    ESTADO
                  </label>

                  <select
                    value={formulario.estado}
                    onChange={(e) =>
                      cambiarCampo("estado", e.target.value)
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

              <div className="categoria-form-group">

                <label>
                  NOMBRE
                </label>

                <input
                  type="text"
                  placeholder="Ej: Camisetas"
                  value={formulario.nombre}
                  onChange={(e) =>
                    cambiarCampo("nombre", e.target.value)
                  }
                />

              </div>

              <div className="categoria-form-group">

                <label>
                  DESCRIPCIÓN
                </label>

                <input
                  type="text"
                  placeholder="Ej: Todo tipo de camisetas"
                  value={formulario.descripcion}
                  onChange={(e) =>
                    cambiarCampo("descripcion", e.target.value)
                  }
                />

              </div>

            </div>

            <div className="categoria-modal-footer">

              <button
                type="button"
                className="categoria-cancel-button"
                onClick={cerrarModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="categoria-create-button"
                onClick={guardarCategoria}
              >
                {modoEdicion ? "Guardar" : "Crear"}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
          MODAL VER DETALLE
          ================================================= */}

      {categoriaSeleccionada && (

        <div
          className="categoria-modal-overlay"
          onClick={cerrarDetalle}
        >

          <div
            className="categoria-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="categoria-modal-header">

              <h3>
                Detalle de la Categoría
              </h3>

              <button
                type="button"
                className="categoria-modal-close"
                onClick={cerrarDetalle}
              >

                <X size={19} />

              </button>

            </div>

            <div className="categoria-modal-body">

              <div className="categoria-detail-top">

                <div className="categoria-detail-avatar">

                  {categoriaSeleccionada.nombre.charAt(0)}

                </div>

                <div>

                  <strong>
                    {categoriaSeleccionada.nombre}
                  </strong>

                  <span>
                    {categoriaSeleccionada.id}
                  </span>

                </div>

              </div>

              <div className="categoria-form-row">

                <div className="categoria-info-group">

                  <label>
                    IDENTIFICADOR
                  </label>

                  <div className="categoria-info-value">
                    {categoriaSeleccionada.id}
                  </div>

                </div>

                <div className="categoria-info-group">

                  <label>
                    ESTADO
                  </label>

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

                  <label>
                    NOMBRE
                  </label>

                  <div className="categoria-info-value">
                    {categoriaSeleccionada.nombre}
                  </div>

                </div>

                <div className="categoria-info-group">

                  <label>
                    EN USO POR PRODUCTOS
                  </label>

                  <div className="categoria-info-value">
                    {categoriaSeleccionada.enUso ? "Sí" : "No"}
                  </div>

                </div>

              </div>

              <div className="categoria-info-group">

                <label>
                  DESCRIPCIÓN
                </label>

                <div className="categoria-info-value">
                  {categoriaSeleccionada.descripcion}
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
          onCancelar={() =>
            setCategoriaEliminar(null)
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