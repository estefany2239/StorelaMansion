import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X
} from "lucide-react";

import "./Categorias.css";

import Pagination from "../components/Pagination";

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

  const REGISTROS_POR_PAGINA = 6;
  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(categoriasFiltradas.length / REGISTROS_POR_PAGINA)
  );

  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
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
    } else {
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
    }

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
      alert(
        "No se puede eliminar la categoría porque está asociada a productos existentes."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas eliminar la categoría "${categoria.nombre}"?`
    );
    if (!confirmar) return;

    setCategorias((actuales) =>
      actuales.filter((item) => item.id !== categoria.id)
    );
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

                    <button
                      type="button"
                      className="categoria-estado-control"
                      onClick={() =>
                        cambiarEstado(categoria)
                      }
                      title={
                        categoria.estado === "Activo"
                          ? "Hacer Inactiva"
                          : "Hacer Activa"
                      }
                    >

                      <span className={
                        categoria.estado === "Activo"
                          ? "estado-toggle activo"
                          : "estado-toggle inactivo"
                      }>

                        <span className="estado-toggle-circle"></span>

                      </span>

                      <span className={
                        categoria.estado === "Activo"
                          ? "estado-label activo"
                          : "estado-label inactivo"
                      }>
                        {categoria.estado}
                      </span>

                    </button>

                  </td>

                  <td>

                    <div className="categoria-actions">

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
                  No se encontraron categorías.
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

    </div>
  );
}