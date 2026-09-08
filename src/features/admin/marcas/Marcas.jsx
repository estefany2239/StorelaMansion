import { useState } from "react";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X
} from "lucide-react";

import "./Marcas.css";

export default function Marcas() {

  /* =====================================================
     MARCAS DE PRODUCTOS
     ===================================================== */

  const [marcas, setMarcas] = useState([
    { id: "MAR-001", nombre: "Store La Mansión", enUso: true },
    { id: "MAR-002", nombre: "Mansión Premium", enUso: true },
    { id: "MAR-003", nombre: "Oro Ejecutivo", enUso: true },
    { id: "MAR-004", nombre: "Estilo Clásico", enUso: false }
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
     FILTRAR MARCAS POR NOMBRE
     ===================================================== */

  const marcasFiltradas = marcas.filter((marca) => {
    const texto = busqueda.toLowerCase().trim();
    return marca.nombre.toLowerCase().includes(texto);
  });

  /* =====================================================
     ABRIR MODAL DE NUEVA MARCA
     ===================================================== */

  const abrirAgregar = () => {
    const siguienteNumero = marcas.reduce((max, item) => {
      const numero = Number(item.id.split("-")[1]) || 0;
      return Math.max(max, numero);
    }, 0) + 1;

    setFormulario({
      id: `MAR-${String(siguienteNumero).padStart(3, "0")}`,
      nombre: ""
    });

    setModoEdicion(false);
    setMostrarModal(true);
  };

  /* =====================================================
     ABRIR MODAL DE EDICIÓN
     ===================================================== */

  const abrirEditar = (marca) => {
    setFormulario({
      id: marca.id,
      nombre: marca.nombre
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
     GUARDAR MARCA
     ===================================================== */

  const guardarMarca = () => {
    if (!formulario.nombre.trim()) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    if (modoEdicion) {
      setMarcas((actuales) =>
        actuales.map((marca) =>
          marca.id === formulario.id
            ? { ...marca, nombre: formulario.nombre.trim() }
            : marca
        )
      );
    } else {
      setMarcas((actuales) => [
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
     ELIMINAR MARCA
     ===================================================== */

  const eliminarMarca = (marca) => {
    if (marca.enUso) {
      alert(
        "No se puede eliminar la marca porque está asociada a productos existentes."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas eliminar la marca "${marca.nombre}"?`
    );
    if (!confirmar) return;

    setMarcas((actuales) =>
      actuales.filter((item) => item.id !== marca.id)
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
    <div className="marcas-page">

      {/* =================================================
          ENCABEZADO
          ================================================= */}

      <div className="marcas-header">

        <div className="marcas-title">

          <h2>
            Marcas
          </h2>

          <p>
            Administra las marcas de los productos.
          </p>

        </div>

        <div className="marcas-actions">

          <div className="marcas-search">

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
            className="marcas-add-button"
            onClick={abrirAgregar}
          >

            <Plus size={19} />

            <span>
              Agregar
            </span>

          </button>

        </div>

      </div>


      {/* =================================================
          TABLA DE MARCAS
          ================================================= */}

      <div className="marcas-table-container">

        <table className="marcas-table">

          <thead>

            <tr>

              <th>
                ID MARCA
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

            {marcasFiltradas.length > 0 ? (
              marcasFiltradas.map((marca) => (

                <tr key={marca.id}>

                  <td>
                    <span className="marca-id">
                      {marca.id}
                    </span>
                  </td>

                  <td>
                    <span className="marca-nombre">
                      {marca.nombre}
                    </span>
                  </td>

                  <td>

                    <div className="marca-actions">

                      <button
                        type="button"
                        title="Editar"
                        onClick={() =>
                          abrirEditar(marca)
                        }
                      >

                        <Pencil size={15} />

                      </button>

                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() =>
                          eliminarMarca(marca)
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
                  className="marcas-empty"
                >
                  No se encontraron marcas.
                </td>

              </tr>
            )}

          </tbody>

        </table>

      </div>


      {/* =================================================
          MODAL AGREGAR / EDITAR
          ================================================= */}

      {mostrarModal && (

        <div
          className="marca-modal-overlay"
          onClick={cerrarModal}
        >

          <div
            className="marca-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="marca-modal-header">

              <h3>
                {modoEdicion
                  ? "Editar Marca"
                  : "Nueva Marca"}
              </h3>

              <button
                type="button"
                className="marca-modal-close"
                onClick={cerrarModal}
              >

                <X size={19} />

              </button>

            </div>

            <div className="marca-modal-body">

              <div className="marca-form-row">

                <div className="marca-form-group">

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

              <div className="marca-form-group">

                <label>
                  NOMBRE
                </label>

                <input
                  type="text"
                  placeholder="Ej: Estilo Clásico"
                  value={formulario.nombre}
                  onChange={(e) =>
                    cambiarCampo("nombre", e.target.value)
                  }
                />

              </div>

            </div>

            <div className="marca-modal-footer">

              <button
                type="button"
                className="marca-cancel-button"
                onClick={cerrarModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="marca-create-button"
                onClick={guardarMarca}
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