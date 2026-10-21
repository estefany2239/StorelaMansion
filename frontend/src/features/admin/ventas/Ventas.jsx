import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  X,
  Trash2,
  FileText
} from "lucide-react";

import { jsPDF } from "jspdf";

import "./Ventas.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";

import { tienePermiso } from "../utils/permisos";

import {
  obtenerVentas,
  obtenerVenta,
  anularVenta as anularVentaApi,
  obtenerVariantesVenta,
  obtenerClientesVenta,
  crearVenta
} from "../../../services/api";

const REGISTROS_POR_PAGINA = 6;


// Fecha de hoy en formato YYYY-MM-DD (la usa el date del formulario).
const fechaHoy = () => {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
};


// Convierte una venta del backend a la forma que usa esta pantalla.
const mapearVentaBackend = (venta) => ({
  id: venta.codigo || String(venta.id),
  idVenta: venta.id,
  cliente: venta.cliente,
  fecha: venta.fecha,
  total: Number(venta.total) || 0,
  metodoPago: venta.metodo_pago || "—",
  estado: venta.estado,
  vendedor: venta.vendedor,
  productos: (venta.productos || []).map((producto) => ({
    nombre: producto.nombre,
    talla: producto.talla || "-",
    color: producto.color || "-",
    cantidad: producto.cantidad,
    precio: Number(producto.precio_unitario) || 0,
    subtotal: Number(producto.subtotal) || 0
  }))
});


export default function Ventas({ user }) {

  // =========================================================
  // PERMISOS (los botones sin permiso se ocultan)
  // =========================================================

  const puedeCrear = tienePermiso(user, "Ventas", "Crear");
  const puedeConsultar = tienePermiso(user, "Ventas", "Consultar");
  const puedeCambiarEstado = tienePermiso(user, "Ventas", "Cambiar estado");


  // =========================================================
  // DATOS DE VENTAS
  // =========================================================

  // La lista se carga desde el backend (GET /api/ventas). El mapeo a la
  // forma que usa esta pantalla se hace en `mapearVentaBackend`.
  const [ventas, setVentas] = useState([]);

  const [cargandoVentas, setCargandoVentas] = useState(true);

  const [errorVentas, setErrorVentas] = useState("");


  // =========================================================
  // ESTADOS
  // =========================================================

  const [busqueda, setBusqueda] = useState("");


  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [mostrarDetalle, setMostrarDetalle] =
    useState(false);


  const [ventaSeleccionada, setVentaSeleccionada] =
    useState(null);

  const [ventaACancelar, setVentaACancelar] =
    useState(null);

  const { toast, mostrarToast } = useToast();


  // =========================================================
  // CARGA DE VENTAS DESDE EL BACKEND
  // =========================================================

  // El 403 del backend llega como "No tienes permisos para acceder a este
  // recurso" y se muestra tal cual en la tabla.
  // Se reutiliza tras anular una venta para refrescar la lista.
  const recargarVentas = () => {
    setCargandoVentas(true);
    return obtenerVentas()
      .then((respuesta) => {
        setVentas((respuesta || []).map(mapearVentaBackend));
        setErrorVentas("");
      })
      .catch((error) => {
        setErrorVentas(error?.message || "No se pudieron cargar las ventas");
      })
      .finally(() => {
        setCargandoVentas(false);
      });
  };

  useEffect(() => {
    let activo = true;

    obtenerVentas()
      .then((respuesta) => {
        if (!activo) return;
        setVentas((respuesta || []).map(mapearVentaBackend));
        setErrorVentas("");
      })
      .catch((error) => {
        if (!activo) return;
        setErrorVentas(error?.message || "No se pudieron cargar las ventas");
      })
      .finally(() => {
        if (activo) setCargandoVentas(false);
      });

    return () => {
      activo = false;
    };
  }, []);


  // =========================================================
  // FORMULARIO
  // =========================================================

  const [formulario, setFormulario] = useState({
    idCliente: "",
    nombreCliente: "",
    fecha: fechaHoy(),
    metodoPago: "Transferencia",
    items: []
  });

  const [errores, setErrores] = useState({});

  const [creandoVenta, setCreandoVenta] = useState(false);


  // =========================================================
  // CATÁLOGOS DEL FORMULARIO
  // =========================================================

  const [variantes, setVariantes] = useState([]);

  const [clientes, setClientes] = useState([]);

  const [cargandoCatalogos, setCargandoCatalogos] =
    useState(false);

  const [errorCatalogos, setErrorCatalogos] =
    useState("");


  // Selector de producto ("Agregar producto").
  const [mostrarSelector, setMostrarSelector] =
    useState(false);

  const [varianteSel, setVarianteSel] =
    useState("");

  const [cantidadSel, setCantidadSel] =
    useState("1");


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


    return coincideBusqueda;

  });


  // =========================================================
  // PAGINACIÓN DE LA TABLA
  // =========================================================

  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(ventasFiltradas.length / REGISTROS_POR_PAGINA)
  );

  const inicio =
    (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const ventasPaginadas = ventasFiltradas.slice(
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


  // =========================================================
  // ABRIR MODAL AGREGAR
  // =========================================================

  const abrirModal = () => {

    setFormulario({
      idCliente: "",
      nombreCliente: "",
      fecha: fechaHoy(),
      metodoPago: "Transferencia",
      items: []
    });

    setErrores({});

    setMostrarSelector(false);

    setVarianteSel("");

    setCantidadSel("1");

    setMostrarModal(true);


    // Catálogos del formulario (variantes y clientes).
    setCargandoCatalogos(true);

    setErrorCatalogos("");

    Promise.all([
      obtenerVariantesVenta(),
      obtenerClientesVenta()
    ])
      .then(([listaVariantes, listaClientes]) => {
        setVariantes(
          Array.isArray(listaVariantes) ? listaVariantes : []
        );
        setClientes(
          Array.isArray(listaClientes) ? listaClientes : []
        );
      })
      .catch((error) => {
        setErrorCatalogos(
          error?.message ||
          "No se pudieron cargar las opciones del formulario"
        );
      })
      .finally(() => {
        setCargandoCatalogos(false);
      });

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

    if (String(valor).trim()) {
      setErrores(
        (actuales) => {
          if (!actuales[campo]) {
            return actuales;
          }

          const nuevos = { ...actuales };
          delete nuevos[campo];
          return nuevos;
        }
      );
    }

  };


  // =========================================================
  // AGREGAR PRODUCTO (variante del catálogo)
  // =========================================================

  // Si la variante ya está en la lista, suma las cantidades.
  const agregarItem = () => {

    const variante = variantes.find(
      (v) =>
        String(v.id_variante) === String(varianteSel)
    );

    if (!variante) {
      setErrores((actuales) => ({
        ...actuales,
        selector: "Selecciona un producto."
      }));
      return;
    }

    const cantidad = Number(cantidadSel);

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setErrores((actuales) => ({
        ...actuales,
        selector: "La cantidad debe ser un número entero mayor a cero."
      }));
      return;
    }

    const enLista = formulario.items.find(
      (item) => item.id_variante === variante.id_variante
    );

    const disponible =
      Number(variante.stock) -
      (enLista ? enLista.cantidad : 0);

    if (cantidad > disponible) {
      setErrores((actuales) => ({
        ...actuales,
        selector:
          `Solo hay ${disponible} unidades disponibles de ${variante.nombre}.`
      }));
      return;
    }

    setFormulario((actual) => ({
      ...actual,
      items: enLista
        ? actual.items.map((item) =>
            item.id_variante === variante.id_variante
              ? { ...item, cantidad: item.cantidad + cantidad }
              : item
          )
        : [
            ...actual.items,
            {
              id_variante: variante.id_variante,
              nombre: variante.nombre,
              talla: variante.talla || "-",
              color: variante.color || "-",
              precio: Number(variante.precio),
              stock: Number(variante.stock),
              cantidad
            }
          ]
    }));

    setVarianteSel("");

    setCantidadSel("1");

    setErrores((actuales) => {
      if (!actuales.selector) {
        return actuales;
      }

      const nuevos = { ...actuales };
      delete nuevos.selector;
      return nuevos;
    });

  };


  // =========================================================
  // ACTUALIZAR CANTIDAD DE UNA LÍNEA
  // =========================================================

  const actualizarCantidadItem = (index, valor) => {

    const texto = String(valor).replace(/[^0-9]/g, "");

    setFormulario((actual) => ({
      ...actual,
      items: actual.items.map((item, i) => {

        if (i !== index) {
          return item;
        }

        const cantidad = Math.min(
          Math.max(Number(texto || 1), 1),
          item.stock
        );

        return { ...item, cantidad };

      })
    }));

  };


  // =========================================================
  // ELIMINAR PRODUCTO
  // =========================================================

  const eliminarProducto = (index) => {

    setFormulario(
      (actual) => ({
        ...actual,

        items:
          actual.items.filter(
            (_, i) => i !== index
          )

      })
    );

  };


  // =========================================================
  // REGISTRAR VENTA (POST /api/ventas)
  // =========================================================

  const registrarVenta = async () => {

    const nuevosErrores = {};

    const nombreEscrito =
      formulario.nombreCliente.trim();

    const clienteSeleccionado = clientes.find(
      (cliente) =>
        String(cliente.id) === String(formulario.idCliente)
    );

    if (!clienteSeleccionado) {
      if (!nombreEscrito) {
        nuevosErrores.nombreCliente =
          "Escribe el nombre del cliente o selecciónalo de la lista.";
      } else if (nombreEscrito.length > 100) {
        nuevosErrores.nombreCliente =
          "El nombre del cliente no puede superar los 100 caracteres.";
      }
    }

    if (!formulario.fecha) {
      nuevosErrores.fecha = "Selecciona una fecha.";
    }

    if (formulario.items.length === 0) {
      nuevosErrores.items =
        "Agrega al menos un producto a la venta.";
    }

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }


    const datos = {

      nombre_cliente: clienteSeleccionado
        ? clienteSeleccionado.nombre
        : nombreEscrito,

      fecha: formulario.fecha,

      metodo_pago: formulario.metodoPago,

      items: formulario.items.map((item) => ({
        id_variante: item.id_variante,
        cantidad: item.cantidad
      }))

    };

    if (clienteSeleccionado) {
      datos.id_cliente = clienteSeleccionado.id;
    }


    setCreandoVenta(true);

    try {

      await crearVenta(datos);

      mostrarToast("Venta registrada con éxito");

      cerrarModal();

      await recargarVentas();

    } catch (error) {

      // 400 (validación) y 409 (stock): se muestra el mensaje del
      // backend y el formulario queda abierto.
      mostrarToast(
        error?.message || "No se pudo registrar la venta",
        "error"
      );

    } finally {
      setCreandoVenta(false);
    }

  };


  // =========================================================
  // ANULAR VENTA (PATCH /api/ventas/:id/estado)
  // =========================================================

  const anularVenta = (venta) => {
    if (venta.estado === "Anulada") {
      mostrarToast("Esta venta ya está anulada.", "error");
      return;
    }
    setVentaACancelar(venta);
  };


  // Ejecuta la anulación real cuando el usuario confirma en la tarjeta.
  const confirmarAnularVenta = async () => {
    if (!ventaACancelar) return;

    const venta = ventaACancelar;

    setVentaACancelar(null);

    try {
      await anularVentaApi(venta.idVenta);
      mostrarToast("Venta anulada correctamente");
      await recargarVentas();
    } catch (error) {
      mostrarToast(
        error?.message || "No se pudo anular la venta",
        "error"
      );
    }
  };


  // =========================================================
  // VER DETALLE (GET /api/ventas/:id)
  // =========================================================

  const [cargandoDetalle, setCargandoDetalle] =
    useState(false);

  const verDetalle = async (venta) => {
    setCargandoDetalle(true);
    try {
      const detalle = await obtenerVenta(venta.idVenta);
      setVentaSeleccionada(mapearVentaBackend(detalle));
      setMostrarDetalle(true);
    } catch (error) {
      mostrarToast(
        error?.message || "No se pudo cargar la venta",
        "error"
      );
    } finally {
      setCargandoDetalle(false);
    }
  };


  // =========================================================
  // CERRAR DETALLE
  // =========================================================

  const cerrarDetalle = () => {

    setMostrarDetalle(false);

    setVentaSeleccionada(null);

  };


  // =========================================================
  // GENERAR COMPROBANTE (PDF)
  // Usa los mismos datos del detalle (GET /api/ventas/:id),
  // incluidos talla y color de cada producto.
  // =========================================================

  const generarComprobante = async (venta) => {

    let ventaDetalle;
    try {
      ventaDetalle = mapearVentaBackend(
        await obtenerVenta(venta.idVenta)
      );
    } catch (error) {
      mostrarToast(
        error?.message || "No se pudo generar el comprobante",
        "error"
      );
      return;
    }

    const doc = new jsPDF({
      unit: "mm",
      format: "a4"
    });

    const anchoPagina =
      doc.internal.pageSize.getWidth();

    const altoPagina =
      doc.internal.pageSize.getHeight();

    const margen = 18;

    let y = 22;


    // ENCABEZADO

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(
      "STORE LA MANSIÓN",
      anchoPagina / 2,
      y,
      { align: "center" }
    );

    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(
      "Comprobante de Venta",
      anchoPagina / 2,
      y,
      { align: "center" }
    );

    y += 6;

    doc.setDrawColor(201, 162, 39);
    doc.setLineWidth(0.8);
    doc.line(
      margen,
      y,
      anchoPagina - margen,
      y
    );


    // DATOS DE LA VENTA

    y += 12;

    const dato = (etiqueta, valor) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(etiqueta, margen, y);

      doc.setFont("helvetica", "normal");
      doc.text(
        String(valor),
        margen + 45,
        y
      );

      y += 7;
    };

    dato("Venta N.°:", ventaDetalle.id);
    dato("Fecha:", formatearFecha(ventaDetalle.fecha));
    dato("Cliente:", ventaDetalle.cliente);
    dato("Método de pago:", ventaDetalle.metodoPago);
    dato("Estado:", ventaDetalle.estado);


    // TABLA DE PRODUCTOS

    y += 4;

    const colProducto = margen;
    const colCantidad = margen + 88;
    const colTalla = margen + 106;
    const colColor = margen + 128;
    const colPrecio = margen + 154;
    const colSubtotal = anchoPagina - margen;

    doc.setFillColor(247, 243, 227);
    doc.rect(
      margen,
      y - 5,
      anchoPagina - margen * 2,
      8,
      "F"
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    doc.text(
      "PRODUCTO",
      colProducto + 2,
      y
    );
    doc.text(
      "CANT.",
      colCantidad,
      y,
      { align: "right" }
    );
    doc.text(
      "TALLA",
      colTalla,
      y,
      { align: "right" }
    );
    doc.text(
      "COLOR",
      colColor,
      y,
      { align: "right" }
    );
    doc.text(
      "P. UNITARIO",
      colPrecio,
      y,
      { align: "right" }
    );
    doc.text(
      "SUBTOTAL",
      colSubtotal,
      y,
      { align: "right" }
    );

    y += 9;


    // FILAS DE PRODUCTOS

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    ventaDetalle.productos.forEach((producto) => {

      if (y > altoPagina - 35) {
        doc.addPage();
        y = 22;
      }

      const subtotal =
        Number(producto.subtotal) ||
        Number(producto.precio) *
        Number(producto.cantidad);

      doc.text(
        String(producto.nombre),
        colProducto + 2,
        y
      );
      doc.text(
        String(producto.cantidad),
        colCantidad,
        y,
        { align: "right" }
      );
      doc.text(
        producto.talla || "-",
        colTalla,
        y,
        { align: "right" }
      );
      doc.text(
        producto.color || "-",
        colColor,
        y,
        { align: "right" }
      );
      doc.text(
        formatearPrecio(producto.precio),
        colPrecio,
        y,
        { align: "right" }
      );
      doc.text(
        formatearPrecio(subtotal),
        colSubtotal,
        y,
        { align: "right" }
      );

      y += 7;
    });


    // TOTAL

    y += 4;

    doc.setDrawColor(201, 162, 39);
    doc.setLineWidth(0.5);
    doc.line(
      colPrecio - 42,
      y,
      anchoPagina - margen,
      y
    );

    y += 9;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);

    doc.text(
      "TOTAL:",
      anchoPagina - margen - 42,
      y,
      { align: "right" }
    );
    doc.text(
      formatearPrecio(ventaDetalle.total),
      anchoPagina - margen,
      y,
      { align: "right" }
    );


    // PIE DE PÁGINA

    y += 18;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(105, 105, 105);
    doc.text(
      "Gracias por su compra",
      anchoPagina / 2,
      y,
      { align: "center" }
    );

    doc.setTextColor(0, 0, 0);


    // DESCARGA

    doc.save(
      `comprobante-${ventaDetalle.id}.pdf`
    );

    mostrarToast("Comprobante generado con éxito");

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

          {puedeConsultar && (

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

          )}


          {/* AGREGAR */}

          {puedeCrear && (

          <button
            type="button"
            className="ventas-add-button"
            onClick={abrirModal}
          >

            <Plus size={18} />

            Registrar venta

          </button>

          )}

        </div>

      </div>


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
                TOTAL
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

            {ventasPaginadas.map(
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


                  {/* TOTAL */}

                  <td>

                    <strong className="venta-total">
                      {formatearPrecio(
                        venta.total
                      )}
                    </strong>

                  </td>


                  {/* ESTADO */}

                  <td>

                    <span
                      className={
                        venta.estado ===
                        "Anulada"
                          ? "venta-estado anulada"
                          : "venta-estado completada"
                      }
                    >

                      {venta.estado}

                    </span>

                  </td>


                  {/* ACCIONES */}

                  <td>

                    <div className="venta-actions">

                      {puedeConsultar && (

                      <button
                        type="button"
                        className="venta-detail-button"
                        onClick={() =>
                          verDetalle(
                            venta
                          )
                        }
                        title="Ver detalle"
                        disabled={cargandoDetalle}
                      >

                        <Eye size={18} />

                      </button>

                      )}

                      {puedeConsultar && (

                      <button
                        type="button"
                        className="venta-comprobante-button"
                        onClick={() =>
                          generarComprobante(
                            venta
                          )
                        }
                        title="Generar comprobante"
                      >

                        <FileText size={18} />

                      </button>

                      )}

                      {puedeCambiarEstado && (

                      <button
                        type="button"
                        className={
                          venta.estado ===
                          "Anulada"
                            ? "venta-anular-button disabled"
                            : "venta-anular-button"
                        }
                        title={
                          venta.estado ===
                          "Anulada"
                            ? "Esta venta ya está anulada"
                            : "Anular venta"
                        }
                        onClick={() =>
                          anularVenta(
                            venta
                          )
                        }
                        disabled={
                          venta.estado ===
                          "Anulada"
                        }
                      >

                        <X size={18} />

                      </button>

                      )}

                    </div>

                  </td>


                </tr>

              )
            )}


            {ventasFiltradas.length === 0 && (

              <tr>

                <td
                  colSpan="5"
                  className="ventas-empty"
                >

                  {cargandoVentas
                    ? "Cargando ventas..."
                    : errorVentas
                      ? errorVentas
                      : "No hay ventas registradas."}

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


      {/* =====================================================
          MODAL AGREGAR VENTA
      ===================================================== */}

      {mostrarModal && (

        <div className="venta-modal-overlay">

          <div className="venta-modal">


            {/* CABECERA */}

            <div className="venta-modal-header">

              <h3>
                Registrar Venta
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

                  <select
                    value={
                      formulario.idCliente
                    }
                    className={`input ${errores.nombreCliente ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "idCliente",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Venta de mostrador (escribir nombre)
                    </option>

                    {clientes.map((cliente) => (

                      <option
                        key={cliente.id}
                        value={cliente.id}
                      >
                        {cliente.nombre}
                      </option>

                    ))}

                  </select>

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
                    className={`input ${errores.fecha ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "fecha",
                        e.target.value
                      )
                    }
                  />

                  {errores.fecha && (
                    <span className="error-text">
                      {errores.fecha}
                    </span>
                  )}

                </div>

              </div>


              {/* NOMBRE DEL CLIENTE (solo venta de mostrador) */}

              {!formulario.idCliente && (

                <div className="venta-form-group">

                  <label>
                    NOMBRE DEL CLIENTE
                  </label>

                  <input
                    type="text"
                    placeholder="Nombre del comprador"
                    maxLength={100}
                    value={
                      formulario.nombreCliente
                    }
                    className={`input ${errores.nombreCliente ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "nombreCliente",
                        e.target.value
                      )
                    }
                  />

                  {errores.nombreCliente && (
                    <span className="error-text">
                      {errores.nombreCliente}
                    </span>
                  )}

                </div>

              )}


              {/* MÉTODO DE PAGO */}

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

                  <option value="Efectivo">
                    Efectivo
                  </option>

                  <option value="Transferencia">
                    Transferencia
                  </option>

                  <option value="Crédito">
                    Crédito
                  </option>

                </select>

              </div>


              {/* PRODUCTOS DE LA VENTA */}

              <div className="venta-details-header">

                <label>
                  PRODUCTOS DE LA VENTA
                </label>


                <button
                  type="button"
                  className="venta-add-product"
                  onClick={() =>
                    setMostrarSelector(
                      (actual) => !actual
                    )
                  }
                  disabled={cargandoCatalogos}
                >

                  <Plus size={16} />

                  Agregar producto

                </button>

              </div>


              {cargandoCatalogos && (

                <div className="venta-no-productos">

                  Cargando productos disponibles...

                </div>

              )}


              {errorCatalogos && (
                <span className="error-text">
                  {errorCatalogos}
                </span>
              )}


              {/* SELECTOR DE VARIANTE + CANTIDAD */}

              {mostrarSelector && !cargandoCatalogos && (

                <div className="venta-form-row">

                  <div className="venta-form-group">

                    <label>
                      PRODUCTO
                    </label>

                    <select
                      value={
                        varianteSel
                      }
                      onChange={(e) => {
                        setVarianteSel(
                          e.target.value
                        );
                        setErrores(
                          (actuales) => {
                            if (!actuales.selector) {
                              return actuales;
                            }

                            const nuevos = { ...actuales };
                            delete nuevos.selector;
                            return nuevos;
                          }
                        );
                      }}
                    >

                      <option value="">
                        Selecciona una variante
                      </option>

                      {variantes.map((variante) => (

                        <option
                          key={variante.id_variante}
                          value={variante.id_variante}
                        >
                          {`${variante.nombre} · ${variante.talla || "-"} · ${variante.color || "-"} · ${formatearPrecio(variante.precio)} · Stock: ${variante.stock}`}
                        </option>

                      ))}

                    </select>

                  </div>


                  <div className="venta-form-group">

                    <label>
                      CANTIDAD
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        cantidadSel
                      }
                      onChange={(e) =>
                        setCantidadSel(
                          e.target.value.replace(
                            /[^0-9]/g,
                            ""
                          )
                        )
                      }
                    />

                  </div>


                  <button
                    type="button"
                    className="venta-add-product"
                    onClick={agregarItem}
                  >

                    <Plus size={16} />

                    Agregar a la venta

                  </button>

                </div>

              )}


              {errores.selector && (
                <span className="error-text">
                  {errores.selector}
                </span>
              )}

              {errores.items && (
                <span className="error-text">
                  {errores.items}
                </span>
              )}

              {formulario.items.length ===
                0 ? (

                <div className="venta-no-productos">

                  Sin productos. Agrega uno.

                </div>

              ) : (

                <div className="venta-products-list">

                  {formulario.items.map(
                    (item, index) => (

                      <div
                        className="venta-product-item"
                        key={item.id_variante}
                      >

                        <div className="venta-product-item-head">

                          <span className="venta-product-item-number">
                            {`${item.nombre} · ${item.talla} · ${item.color}`}
                          </span>

                          <button
                            type="button"
                            className="venta-product-delete"
                            title="Eliminar producto"
                            onClick={() =>
                              eliminarProducto(
                                index
                              )
                            }
                          >

                            <Trash2 size={16} />

                          </button>

                        </div>


                        <div className="venta-product-item-fields">

                          <div className="venta-product-item-field nombre">

                            <label>
                              NOMBRE
                            </label>

                            <input
                              type="text"
                              readOnly
                              tabIndex={-1}
                              value={
                                item.nombre
                              }
                            />

                          </div>


                          <div className="venta-product-item-field">

                            <label>
                              CANTIDAD
                            </label>

                            <input
                              type="number"
                              min="1"
                              max={
                                item.stock
                              }
                              value={
                                item.cantidad
                              }
                              onChange={(e) =>
                                actualizarCantidadItem(
                                  index,
                                  e.target.value
                                )
                              }
                            />

                          </div>


                          <div className="venta-product-item-field">

                            <label>
                              TALLA
                            </label>

                            <input
                              type="text"
                              readOnly
                              tabIndex={-1}
                              value={
                                item.talla
                              }
                            />

                          </div>


                          <div className="venta-product-item-field">

                            <label>
                              COLOR
                            </label>

                            <input
                              type="text"
                              readOnly
                              tabIndex={-1}
                              value={
                                item.color
                              }
                            />

                          </div>


                          <div className="venta-product-item-field">

                            <label>
                              PRECIO (COP)
                            </label>

                            <input
                              type="text"
                              readOnly
                              tabIndex={-1}
                              value={
                                formatearPrecio(
                                  item.precio
                                )
                              }
                            />

                          </div>


                          <div className="venta-product-item-subtotal">

                            <label>
                              SUBTOTAL
                            </label>

                            <strong>

                              {formatearPrecio(
                                item.precio *
                                item.cantidad
                              )}

                            </strong>

                          </div>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}


              {/* TOTAL */}

              <div className="venta-total-box">

                <span>
                  MONTO TOTAL
                </span>

                <strong>

                  {formatearPrecio(
                    formulario.items.reduce(
                      (suma, item) =>
                        suma +
                        item.precio *
                        item.cantidad,
                      0
                    )
                  )}

                </strong>

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
                disabled={creandoVenta}
              >
                {creandoVenta
                  ? "Creando..."
                  : "Crear venta"}
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
                              {" · Talla: "}
                              {producto.talla}
                              {" · Color: "}
                              {producto.color}
                            </span>

                          </div>


                          <strong>
                            {formatearPrecio(
                              producto.subtotal ||
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
                "Anulada" && (

                <div className="venta-closed-info">

                  Esta venta se encuentra anulada.
                  Solo está disponible para consulta
                  y no puede ser modificada.

                </div>

              )}

            </div>


            {/* FOOTER */}

            <div className="venta-modal-footer">

              <button
                type="button"
                className="venta-cancel-button detail-cerrar-button"
                onClick={cerrarDetalle}
              >
                Cerrar
              </button>

            </div>

          </div>

        </div>

      )}

      <ConfirmDialog
        abierto={!!ventaACancelar}
        titulo="Anular venta"
        mensaje={
          <>¿Deseas anular la venta "
            <strong>{ventaACancelar?.id}</strong>"? Esta
            acción no se puede deshacer.</>
        }
        textoConfirmar="Sí, anular"
        textoCancelar="Volver"
        variante="peligro"
        onConfirmar={confirmarAnularVenta}
        onCancelar={() => setVentaACancelar(null)}
      />

      <Toast toast={toast} />

    </div>

  );

}