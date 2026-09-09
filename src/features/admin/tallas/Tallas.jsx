import { useState } from "react";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X
} from "lucide-react";

import "./Tallas.css";

export default function Tallas() {

  /* =====================================================
     TALLAS DE PRODUCTOS
     ===================================================== */

  const [tallas, setTallas] = useState([
    { id: "TAL-001", nombre: "XS", enUso: false },
    { id: "TAL-002", nombre: "S", enUso: true },
    { id: "TAL-003", nombre: "M", enUso: true },
    { id: "TAL-004", nombre: "L", enUso: true },
    { id: "TAL-005", nombre: "XL", enUso: false }
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
     FILTRAR TALLAS POR NOMBRE
     ===================================================== */

  const tallasFiltradas = tallas.filter((talla) => {
    const texto = busqueda.toLowerCase().trim();
    return talla.nombre.toLowerCase().includes(texto);
  });

  /* =====================================================
     ABRIR MODAL DE NUEVA TALLA
     ===================================================== */

  const abrirAgregar = () => {
    const siguienteNumero = tallas.reduce((max, item) => {
      const numero = Number(item.id.split("-")[1]) || 0;
      return Math.max(max, numero);
    }, 0) + 1;

    setFormulario({
      id: `TAL-${String(siguienteNumero).padStart(3, "0")}`,
      nombre: ""
    });

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
     GUARDAR TALLA
     ===================================================== */

  const guardarTalla = () => {
    if (!formulario.nombre.trim()) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    if (modoEdicion) {
      setTallas((actuales) =>
        actuales.map((talla) =>
          talla.id === formulario.id
            ? { ...talla, nombre: formulario.nombre.trim() }
            : talla
        )
      );
    } else {
      setTallas((actuales) => [
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
     ELIMINAR TALLA
     ===================================================== */

  const eliminarTalla = (talla) => {
    if (talla.enUso) {
      alert(
        "No se puede eliminar la talla porque está asociada a productos existentes."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas eliminar la talla "${talla.nombre}"?`
    );
    if (!confirmar) return;

    setTallas((actuales) =>
      actuales.filter((item) => item.id !== talla.id)
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

          <button
            type="button"
            className="tallas-add-button"
            onClick={abrirAgregar}
          >

            <Plus size={19} />

            <span>
              Agregar talla
            </span>

          </button>

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
                ACCIONES
              </th>

            </tr>

          </thead>

          <tbody>

            {tallasFiltradas.length > 0 ? (
              tallasFiltradas.map((talla) => (

                <tr key={talla.id}>

                  <td>
                    <span className="talla-id">
                      {talla.id}
                    </span>
                  </td>

                  <td>
                    <span className="talla-nombre">
                      {talla.nombre}
                    </span>
                  </td>

                  <td>

                    <div className="talla-actions">

                      <button
                        type="button"
                        title="Editar"
                        onClick={() =>
                          abrirEditar(talla)
                        }
                      >

                        <Pencil size={15} />

                      </button>

                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() =>
                          eliminarTalla(talla)
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
                  className="tallas-empty"
                >
                  No se encontraron tallas.
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
                  ? "Editar Talla"
                  : "Nueva Talla"}
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

              <div className="talla-form-row">

                <div className="talla-form-group">

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

              <div className="talla-form-group">

                <label>
                  NOMBRE DE LA TALLA
                </label>

                <input
                  type="text"
                  placeholder="Ej: M"
                  value={formulario.nombre}
                  onChange={(e) =>
                    cambiarCampo("nombre", e.target.value)
                  }
                />

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

    </div>
  );
}