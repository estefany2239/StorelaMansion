import { useState } from "react";

import {
  Plus,
  Search,
  Eye,
  X,
  SlidersHorizontal
} from "lucide-react";

import "./Ventas.css";

export default function Ventas() {

  // =========================================================
  // DATOS DE VENTAS
  // =========================================================

  const [ventas, setVentas] = useState([
    {
      id: "V-00125",
      cliente: "María López",
      fecha: "2026-09-06",
      total: 250000,
      metodoPago: "Transferencia",
      estado: "Completada",

      productos: [
        {
          nombre: "Camiseta Clásica",
          cantidad: 2,
          precio: 85000
        },
        {
          nombre: "Gorra Premium",
          cantidad: 1,
          precio: 80000
        }
      ]
    },

    {
      id: "V-00124",
      cliente: "Juan Pérez",
      fecha: "2026-09-05",
      total: 180000,
      metodoPago: "Efectivo",
      estado: "Completada",

      productos: [
        {
          nombre: "Buso Clásico",
          cantidad: 1,
          precio: 180000
        }
      ]
    },

    {
      id: "V-00123",
      cliente: "Laura Gómez",
      fecha: "2026-09-05",
      total: 320000,
      metodoPago: "Nequi",
      estado: "Cerrada",

      productos: [
        {
          nombre: "Tenis Urban",
          cantidad: 1,
          precio: 280000
        },
        {
          nombre: "Camiseta Clásica",
          cantidad: 1,
          precio: 40000
        }
      ]
    },

    {
      id: "V-00122",
      cliente: "Carlos Rodríguez",
      fecha: "2026-09-04",
      total: 485000,
      metodoPago: "Transferencia",
      estado: "Cerrada",

      productos: [
        {
          nombre: "Reloj Ejecutivo",
          cantidad: 1,
          precio: 350000
        },
        {
          nombre: "Camiseta Clásica",
          cantidad: 1,
          precio: 135000
        }
      ]
    }
  ]);


  // =========================================================
  // ESTADOS
  // =========================================================

  const [busqueda, setBusqueda] = useState("");

  const [mostrarFiltros, setMostrarFiltros] =
    useState(false);

  const [filtroFecha, setFiltroFecha] =
    useState("");

  const [filtroEstado, setFiltroEstado] =
    useState("Todos");


  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [mostrarDetalle, setMostrarDetalle] =
    useState(false);


  const [ventaSeleccionada, setVentaSeleccionada] =
    useState(null);


  // =========================================================
  // FORMULARIO
  // =========================================================

  const [formulario, setFormulario] = useState({
    cliente: "",
    fecha: "2026-09-06",
    total: "",
    metodoPago: "Transferencia",
    estado: "Completada"
  });


  // =========================================================
  // FORMATEAR PRECIO
  // =========================================================

  const formatearPrecio = (valor) => {

    return new Intl.NumberFormat(
      "es-CO",
      {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
      }
    ).format(valor);

  };


  // =========================================================
  // FORMATEAR FECHA
  // =========================================================

  const formatearFecha = (fecha) => {

    if (!fecha) {
      return "";
    }

    const partes = fecha.split("-");

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

  };


  // =========================================================
  // FILTRAR VENTAS
  // =========================================================

  const ventasFiltradas = ventas.filter((venta) => {

    const texto =
      busqueda.toLowerCase().trim();


    const coincideBusqueda =
      venta.id
        .toLowerCase()
        .includes(texto) ||

      venta.cliente
        .toLowerCase()
        .includes(texto);


    const coincideFecha =
      filtroFecha === "" ||
      venta.fecha === filtroFecha;


    const coincideEstado =
      filtroEstado === "Todos" ||
      venta.estado === filtroEstado;


    return (
      coincideBusqueda &&
      coincideFecha &&
      coincideEstado
    );

  });


  // =========================================================
  // ABRIR MODAL AGREGAR
  // =========================================================

  const abrirModal = () => {

    setFormulario({
      cliente: "",
      fecha: "2026-09-06",
      total: "",
      metodoPago: "Transferencia",
      estado: "Completada"
    });

    setMostrarModal(true);

  };


  // =========================================================
  // CERRAR MODAL
  // =========================================================

  const cerrarModal = () => {

    setMostrarModal(false);

  };


  // =========================================================
  // CAMBIAR CAMPO
  // =========================================================

  const cambiarCampo = (campo, valor) => {

    setFormulario((actual) => ({
      ...actual,
      [campo]: valor
    }));

  };


  // =========================================================
  // REGISTRAR VENTA
  // =========================================================

  const registrarVenta = () => {

    if (
      !formulario.cliente.trim() ||
      !formulario.fecha ||
      !formulario.total
    ) {

      alert(
        "Completa los campos obligatorios."
      );

      return;
    }


    const nuevoId =
      `V-${String(
        ventas.length + 126
      ).padStart(5, "0")}`;


    const nuevaVenta = {

      id: nuevoId,

      cliente:
        formulario.cliente.trim(),

      fecha:
        formulario.fecha,

      total:
        Number(formulario.total),

      metodoPago:
        formulario.metodoPago,

      estado:
        formulario.estado,

      productos: []

    };


    setVentas((actuales) => [
      ...actuales,
      nuevaVenta
    ]);


    cerrarModal();

  };


  // =========================================================
  // AVANZAR ESTADO
  // =========================================================

  const avanzarEstado = (id) => {

    setVentas((actuales) =>

      actuales.map((venta) => {

        if (venta.id !== id) {

          return venta;

        }


        if (venta.estado === "Completada") {

          return {
            ...venta,
            estado: "Cerrada"
          };

        }


        return venta;

      })

    );

  };


  // =========================================================
  // VER DETALLE
  // =========================================================

  const verDetalle = (venta) => {

    setVentaSeleccionada(venta);

    setMostrarDetalle(true);

  };


  // =========================================================
  // CERRAR DETALLE
  // =========================================================

  const cerrarDetalle = () => {

    setMostrarDetalle(false);

    setVentaSeleccionada(null);

  };


  // =========================================================
  // LIMPIAR FILTROS
  // =========================================================

  const limpiarFiltros = () => {

    setBusqueda("");

    setFiltroFecha("");

    setFiltroEstado("Todos");

  };


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="ventas-page">


      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <div className="ventas-header">

        <div className="ventas-title">

          <h2>
            Ventas
          </h2>

          <p>
            Consulta y gestiona las ventas realizadas en la tienda.
          </p>

        </div>


        {/* ===================================================
            BUSCADOR + FILTROS + BOTÓN
        =================================================== */}

        <div className="ventas-actions">


          {/* BUSCADOR */}

          <div className="ventas-search">

            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar ventas..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
            />

          </div>


          {/* BOTÓN FILTROS */}

          <button
            type="button"
            className={
              mostrarFiltros
                ? "ventas-filter-button active"
                : "ventas-filter-button"
            }
            onClick={() =>
              setMostrarFiltros(
                !mostrarFiltros
              )
            }
            title="Filtros"
          >

            <SlidersHorizontal size={18} />

            Filtros

          </button>


          {/* AGREGAR */}

          <button
            type="button"
            className="ventas-add-button"
            onClick={abrirModal}
          >

            <Plus size={18} />

            Agregar venta

          </button>

        </div>

      </div>


      {/* =====================================================
          FILTROS
      ===================================================== */}

      {mostrarFiltros && (

        <div className="ventas-filters-panel">


          <div className="ventas-filter-group">

            <label>
              FECHA
            </label>

            <input
              type="date"
              value={filtroFecha}
              onChange={(e) =>
                setFiltroFecha(
                  e.target.value
                )
              }
            />

          </div>


          <div className="ventas-filter-group">

            <label>
              ESTADO
            </label>

            <select
              value={filtroEstado}
              onChange={(e) =>
                setFiltroEstado(
                  e.target.value
                )
              }
            >

              <option value="Todos">
                Todos
              </option>

              <option value="Completada">
                Completada
              </option>

              <option value="Cerrada">
                Cerrada
              </option>

              <option value="Anulada">
                Anulada
              </option>

            </select>

          </div>


          <button
            type="button"
            className="ventas-clear-filter"
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>


        </div>

      )}


      {/* =====================================================
          TABLA
      ===================================================== */}

      <div className="ventas-table-container">

        <table className="ventas-table">

          <thead>

            <tr>

              <th>
                ID VENTA
              </th>

              <th>
                CLIENTE
              </th>

              <th>
                FECHA
              </th>

              <th>
                TOTAL
              </th>

              <th>
                MÉTODO DE PAGO
              </th>

              <th>
                ESTADO
              </th>

              <th>
                DETALLE
              </th>

            </tr>

          </thead>


          <tbody>

            {ventasFiltradas.map(
              (venta) => (

                <tr
                  key={venta.id}
                >


                  {/* ID */}

                  <td>

                    <strong className="venta-id">
                      {venta.id}
                    </strong>

                  </td>


                  {/* CLIENTE */}

                  <td>

                    <span className="venta-cliente">
                      {venta.cliente}
                    </span>

                  </td>


                  {/* FECHA */}

                  <td>

                    <span className="venta-fecha">
                      {formatearFecha(
                        venta.fecha
                      )}
                    </span>

                  </td>


                  {/* TOTAL */}

                  <td>

                    <strong className="venta-total">
                      {formatearPrecio(
                        venta.total
                      )}
                    </strong>

                  </td>


                  {/* MÉTODO */}

                  <td>

                    <span className="venta-metodo">
                      {venta.metodoPago}
                    </span>

                  </td>


                  {/* ESTADO */}

                  <td>

                    <span
                      className={
                        venta.estado ===
                        "Cerrada"
                          ? "venta-estado cerrada"
                          : venta.estado ===
                            "Anulada"
                          ? "venta-estado anulada"
                          : "venta-estado completada"
                      }
                      onClick={() =>
                        avanzarEstado(
                          venta.id
                        )
                      }
                    >

                      {venta.estado}

                    </span>

                  </td>


                  {/* DETALLE */}

                  <td>

                    <button
                      type="button"
                      className="venta-detail-button"
                      onClick={() =>
                        verDetalle(
                          venta
                        )
                      }
                      title="Ver detalle"
                    >

                      <Eye size={18} />

                    </button>

                  </td>


                </tr>

              )
            )}


            {ventasFiltradas.length === 0 && (

              <tr>

                <td
                  colSpan="7"
                  className="ventas-empty"
                >

                  No se encontraron ventas.

                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>


      {/* =====================================================
          MODAL AGREGAR VENTA
      ===================================================== */}

      {mostrarModal && (

        <div className="venta-modal-overlay">

          <div className="venta-modal">


            {/* CABECERA */}

            <div className="venta-modal-header">

              <h3>
                Agregar Venta
              </h3>

              <button
                type="button"
                className="venta-modal-close"
                onClick={cerrarModal}
              >

                <X size={21} />

              </button>

            </div>


            {/* CUERPO */}

            <div className="venta-modal-body">


              {/* CLIENTE + FECHA */}

              <div className="venta-form-row">

                <div className="venta-form-group">

                  <label>
                    CLIENTE
                  </label>

                  <input
                    type="text"
                    placeholder="Nombre del cliente"
                    value={
                      formulario.cliente
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "cliente",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="venta-form-group">

                  <label>
                    FECHA DE TRANSACCIÓN
                  </label>

                  <input
                    type="date"
                    value={
                      formulario.fecha
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "fecha",
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>


              {/* TOTAL + MÉTODO */}

              <div className="venta-form-row">

                <div className="venta-form-group">

                  <label>
                    MONTO TOTAL (COP)
                  </label>

                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={
                      formulario.total
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "total",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="venta-form-group">

                  <label>
                    MÉTODO DE PAGO
                  </label>

                  <select
                    value={
                      formulario.metodoPago
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "metodoPago",
                        e.target.value
                      )
                    }
                  >

                    <option value="Transferencia">
                      Transferencia
                    </option>

                    <option value="Efectivo">
                      Efectivo
                    </option>

                    <option value="Nequi">
                      Nequi
                    </option>

                  </select>

                </div>

              </div>


              {/* ESTADO */}

              <div className="venta-form-group">

                <label>
                  ESTADO
                </label>

                <select
                  value={
                    formulario.estado
                  }
                  onChange={(e) =>
                    cambiarCampo(
                      "estado",
                      e.target.value
                    )
                  }
                >

                  <option value="Completada">
                    Completada
                  </option>

                  <option value="Cerrada">
                    Cerrada
                  </option>

                </select>

              </div>


              {/* INFORMACIÓN */}

              <div className="venta-form-info">

                <span>
                  El detalle de productos se asociará
                  a la venta durante el proceso de registro.
                </span>

              </div>

            </div>


            {/* FOOTER */}

            <div className="venta-modal-footer">

              <button
                type="button"
                className="venta-cancel-button"
                onClick={cerrarModal}
              >
                Cancelar
              </button>


              <button
                type="button"
                className="venta-create-button"
                onClick={registrarVenta}
              >
                Crear venta
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          MODAL DETALLE
      ===================================================== */}

      {mostrarDetalle &&
        ventaSeleccionada && (

        <div className="venta-modal-overlay">

          <div className="venta-modal">


            {/* CABECERA */}

            <div className="venta-modal-header">

              <h3>
                Detalle de Venta
              </h3>

              <button
                type="button"
                className="venta-modal-close"
                onClick={cerrarDetalle}
              >

                <X size={21} />

              </button>

            </div>


            {/* CUERPO */}

            <div className="venta-modal-body">


              <div className="venta-form-row">


                <div className="venta-info-group">

                  <label>
                    ID VENTA
                  </label>

                  <div className="venta-info-value">
                    {ventaSeleccionada.id}
                  </div>

                </div>


                <div className="venta-info-group">

                  <label>
                    CLIENTE
                  </label>

                  <div className="venta-info-value">
                    {ventaSeleccionada.cliente}
                  </div>

                </div>

              </div>


              <div className="venta-form-row">


                <div className="venta-info-group">

                  <label>
                    FECHA DE TRANSACCIÓN
                  </label>

                  <div className="venta-info-value">
                    {formatearFecha(
                      ventaSeleccionada.fecha
                    )}
                  </div>

                </div>


                <div className="venta-info-group">

                  <label>
                    MÉTODO DE PAGO
                  </label>

                  <div className="venta-info-value">
                    {ventaSeleccionada.metodoPago}
                  </div>

                </div>

              </div>


              {/* DETALLE DE PRODUCTOS */}

              <div className="venta-products">

                <label>
                  DETALLE DE PRODUCTOS
                </label>


                <div className="venta-products-list">

                  {ventaSeleccionada.productos.length >
                  0 ? (

                    ventaSeleccionada.productos.map(
                      (producto, index) => (

                        <div
                          className="venta-product"
                          key={index}
                        >

                          <div>

                            <strong>
                              {producto.nombre}
                            </strong>

                            <span>
                              Cantidad:{" "}
                              {producto.cantidad}
                            </span>

                          </div>


                          <strong>
                            {formatearPrecio(
                              producto.precio *
                              producto.cantidad
                            )}
                          </strong>

                        </div>

                      )

                    )

                  ) : (

                    <div className="venta-no-products">

                      No hay productos
                      registrados.

                    </div>

                  )}

                </div>

              </div>


              {/* TOTAL */}

              <div className="venta-total-box">

                <span>
                  MONTO TOTAL
                </span>

                <strong>
                  {formatearPrecio(
                    ventaSeleccionada.total
                  )}
                </strong>

              </div>


              {/* ESTADO */}

              <div className="venta-status">

                <label>
                  ESTADO
                </label>

                <span
                  className={
                    ventaSeleccionada.estado ===
                    "Cerrada"
                      ? "venta-estado cerrada"
                      : ventaSeleccionada.estado ===
                        "Anulada"
                      ? "venta-estado anulada"
                      : "venta-estado completada"
                  }
                >
                  {ventaSeleccionada.estado}
                </span>

              </div>


              {/* REGLA DE NEGOCIO */}

              {ventaSeleccionada.estado ===
                "Cerrada" && (

                <div className="venta-closed-info">

                  Esta venta se encuentra cerrada.
                  Solo está disponible para consulta
                  y no puede ser modificada ni anulada.

                </div>

              )}

            </div>


            {/* FOOTER */}

            <div className="venta-modal-footer">

              <button
                type="button"
                className="venta-cancel-button"
                onClick={cerrarDetalle}
              >
                Cerrar
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}