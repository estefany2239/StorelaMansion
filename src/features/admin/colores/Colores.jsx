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

export default function Colores() {

  /* =====================================================
     COLORES DE PRODUCTOS
     ===================================================== */

  const [colores, setColores] = useState([
    { id: "COL-001", nombre: "Negro", enUso: true },
    { id: "COL-002", nombre: "Blanco", enUso: true },
    { id: "COL-003", nombre: "Café", enUso: true },
    { id: "COL-004", nombre: "Beige", enUso: false },
    { id: "COL-005", nombre: "Gris", enUso: false },
    { id: "COL-006", nombre: "Azul", enUso: false },
    { id: "COL-007", nombre: "Rojo", enUso: false }
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
    nombre: ""
  });

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

  const REGISTROS_POR_PAGINA = 6;
  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(coloresFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
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
    const siguienteNumero = colores.reduce((max, item) => {
      const numero = Number(item.id.split("-")[1]) || 0;
      return Math.max(max, numero);
    }, 0) + 1;

    setFormulario({
      id: `COL-${String(siguienteNumero).padStart(3, "0")}`,
      nombre: ""
    });

    setModoEdicion(false);
    setMostrarModal(true);
  };

  /* =====================================================
     ABRIR MODAL DE EDICIÓN
     ===================================================== */

  const abrirEditar = (color) => {
    setFormulario({
      id: color.id,
      nombre: color.nombre
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
     GUARDAR COLOR
     ===================================================== */

  const guardarColor = () => {
    if (!formulario.nombre.trim()) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    if (modoEdicion) {
      setColores((actuales) =>
        actuales.map((color) =>
          color.id === formulario.id
            ? { ...color, nombre: formulario.nombre.trim() }
            : color
        )
      );
    } else {
      setColores((actuales) => [
        ...actuales,
        {
          id: formulario.id,
          nombre: formulario.nombre.trim(),
          enUso: false
        }
      ]);
    }

    cerrarModal();
  };

  /* =====================================================
     ELIMINAR COLOR
     ===================================================== */

  const eliminarColor = (color) => {
    if (color.enUso) {
      alert(
        "No se puede eliminar el color porque está asociado a productos activos."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas eliminar el color "${color.nombre}"?`
    );
    if (!confirmar) return;

    setColores((actuales) =>
      actuales.filter((item) => item.id !== color.id)
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

          <button
            type="button"
            className="colores-add-button"
            onClick={abrirAgregar}
          >

            <Plus size={19} />

            <span>
              Agregar color
            </span>

          </button>

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
                      {color.id}
                    </span>
                  </td>

                  <td>
                    <span className="color-nombre">
                      {color.nombre}
                    </span>
                  </td>

                  <td>

                    <div className="color-actions">

                      <button
                        type="button"
                        title="Editar"
                        onClick={() =>
                          abrirEditar(color)
                        }
                      >

                        <Pencil size={15} />

                      </button>

                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() =>
                          eliminarColor(color)
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
                  colSpan="3"
                  className="colores-empty"
                >
                  No se encontraron colores.
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
                  ? "Editar Color"
                  : "Nuevo Color"}
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

              <div className="color-form-row">

                <div className="color-form-group">

                  <label>
                    IDENTIFICADOR
                  </label>

                  <input
                    type="text"
                    value={formulario.id}
                    disabled
                  />

                </div>

              </div>

              <div className="color-form-group">

                <label>
                  NOMBRE DEL COLOR
                </label>

                <input
                  type="text"
                  placeholder="Ej: Café"
                  value={formulario.nombre}
                  onChange={(e) =>
                    cambiarCampo("nombre", e.target.value)
                  }
                />

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

    </div>
  );
}