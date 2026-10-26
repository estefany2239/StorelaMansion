import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Search,
  Eye,
  X,
  Trash2,
  FileText,
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign
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
  obtenerResumenVentas,
  obtenerVenta,
  anularVenta as anularVentaApi,
  obtenerVariantesVenta,
  obtenerClientesVenta,
  crearVenta
} from "../../../shared/services/api";

const REGISTROS_POR_PAGINA = 6;

const METODOS_PAGO = ["Efectivo", "Transferencia", "Crédito"];

const fechaHoy = () => {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
};

const formatearPrecio = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(valor) || 0);

const formatearFecha = (fecha) => {
  if (!fecha) return "—";

  const partes = String(fecha).split("-");

  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const mapearVentaBackend = (venta) => {
  const productos = (venta.productos || []).map((producto) => ({
    nombre: producto.nombre || "—",
    talla: producto.talla || "-",
    color: producto.color || "-",
    cantidad: Number(producto.cantidad) || 0,
    precio: Number(producto.precio_unitario) || 0,
    subtotal: Number(producto.subtotal) || 0
  }));

  return {
    id: venta.codigo || String(venta.id),
    idVenta: venta.id,
    idPedido: venta.id_pedido ?? null,
    numeroPedido: venta.numero_pedido ?? venta.id_pedido ?? null,
    cliente: venta.cliente || "—",
    fecha: venta.fecha,
    fechaPago: venta.fecha_pago || null,
    total: Number(venta.total) || 0,
    metodoPago: venta.metodo_pago || "—",
    estado: venta.estado || "",
    estadoPago: venta.estado_pago || "Pendiente",
    origen: venta.origen || "Mostrador",
    vendedor: venta.vendedor,
    productos,
    cantidadProductos: productos.reduce(
      (total, producto) => total + producto.cantidad,
      0
    )
  };
};

const resumirProductos = (productos) => {
  if (!productos || productos.length === 0) return "Sin productos";

  const nombres = productos.map((producto) => producto.nombre);

  if (nombres.length <= 2) return nombres.join(", ");

  return `${nombres[0]}, ${nombres[1]} +${nombres.length - 2}`;
};

const esErrorDeSesion = (error) =>
  /sesi[oó]n/i.test(error?.message || "");

const mensajeErrorVenta = (error, mensajePorDefecto) => {
  if (error?.status === 403) return "No tienes permisos";
  if (error?.status === 404) return "La venta no existe o fue eliminada.";

  if (!error?.status) {
    if (esErrorDeSesion(error)) return error.message;

    return "Sin conexión. Revisa tu red e intenta de nuevo.";
  }

  return error?.message || mensajePorDefecto;
};

const mensajeErrorComprobante = (error) => {
  if (error?.status === 403) {
    return "No tienes permisos para descargar el comprobante (403).";
  }

  if (error?.status === 404) {
    return "La venta no existe o fue eliminada (404).";
  }

  if (!error?.status) {
    if (esErrorDeSesion(error)) return error.message;

    return "Sin conexión. No se pudo descargar el comprobante.";
  }

  return error?.message || "No se pudo descargar el comprobante.";
};

const construirComprobantePdf = (venta) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const margen = 15;

  const colProducto = margen + 2;
  const colTalla = margen + 72;
  const colColor = margen + 96;
  const colCantidad = margen + 116;
  const colPrecio = margen + 146;
  const colSubtotal = anchoPagina - margen;

  let y = 20;

  const dibujarCabeceraTabla = () => {
    doc.setFillColor(247, 243, 227);
    doc.rect(margen, y - 5, anchoPagina - margen * 2, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PRODUCTO", colProducto, y);
    doc.text("TALLA", colTalla, y, { align: "right" });
    doc.text("COLOR", colColor, y, { align: "right" });
    doc.text("CANT.", colCantidad, y, { align: "right" });
    doc.text("P. UNITARIO", colPrecio, y, { align: "right" });
    doc.text("SUBTOTAL", colSubtotal, y, { align: "right" });

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("STORE LA MANSIÓN", anchoPagina / 2, y, { align: "center" });

  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Comprobante de venta", anchoPagina / 2, y, { align: "center" });

  y += 6;

  doc.setDrawColor(201, 162, 39);
  doc.setLineWidth(0.8);
  doc.line(margen, y, anchoPagina - margen, y);

  y += 11;

  const dato = (etiqueta, valor) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(etiqueta, margen, y);

    doc.setFont("helvetica", "normal");
    doc.text(String(valor), margen + 46, y);

    y += 6;
  };

  dato("Venta N.°:", venta.id);
  dato("Pedido relacionado:", venta.idPedido ? `#${venta.idPedido}` : "—");
  dato("Fecha de registro:", formatearFecha(venta.fecha));
  dato("Cliente:", venta.cliente);
  dato("Método de pago:", venta.metodoPago);
  dato("Estado de pago:", venta.estadoPago);
  dato("Origen:", venta.origen);

  y += 4;
  dibujarCabeceraTabla();

  venta.productos.forEach((producto) => {
    const nombreLineas = doc.splitTextToSize(String(producto.nombre), 62);
    const altoFila = Math.max(7, nombreLineas.length * 5 + 2);

    if (y + altoFila > altoPagina - 30) {
      doc.addPage();
      y = 20;
      dibujarCabeceraTabla();
    }

    const subtotal =
      Number(producto.subtotal) ||
      Number(producto.precio) * Number(producto.cantidad);

    doc.text(nombreLineas, colProducto, y);
    doc.text(producto.talla || "-", colTalla, y, { align: "right" });
    doc.text(producto.color || "-", colColor, y, { align: "right" });
    doc.text(String(producto.cantidad), colCantidad, y, { align: "right" });
    doc.text(formatearPrecio(producto.precio), colPrecio, y, {
      align: "right"
    });
    doc.text(formatearPrecio(subtotal), colSubtotal, y, { align: "right" });

    y += altoFila;
  });

  if (y > altoPagina - 45) {
    doc.addPage();
    y = 20;
  }

  y += 3;

  doc.setDrawColor(201, 162, 39);
  doc.setLineWidth(0.5);
  doc.line(colPrecio - 38, y, anchoPagina - margen, y);

  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", anchoPagina - margen - 38, y, { align: "right" });
  doc.text(formatearPrecio(venta.total), anchoPagina - margen, y, {
    align: "right"
  });

  y += 16;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(105, 105, 105);
  doc.text("Gracias por su compra", anchoPagina / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);

  return doc;
};

export default function Ventas({ user }) {
  const puedeCrear = tienePermiso(user, "Ventas", "Crear");
  const puedeConsultar = tienePermiso(user, "Ventas", "Consultar");
  const puedeCambiarEstado = tienePermiso(user, "Ventas", "Cambiar estado");

  const [ventas, setVentas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [errorVentas, setErrorVentas] = useState("");
  const [errorResumen, setErrorResumen] = useState("");
  const [sinPermisos, setSinPermisos] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [ventaACancelar, setVentaACancelar] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [comprobanteEnProceso, setComprobanteEnProceso] = useState(null);

  const [formulario, setFormulario] = useState({
    idCliente: "",
    nombreCliente: "",
    fecha: fechaHoy(),
    metodoPago: "Transferencia",
    items: []
  });
  const [errores, setErrores] = useState({});
  const [creandoVenta, setCreandoVenta] = useState(false);

  const [variantes, setVariantes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState("");

  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [varianteSel, setVarianteSel] = useState("");
  const [cantidadSel, setCantidadSel] = useState("1");

  const { toast, mostrarToast } = useToast();

  const cargarVentas = async () => {
    setCargandoVentas(true);

    try {
      const respuesta = await obtenerVentas();
      setVentas((respuesta || []).map(mapearVentaBackend));
      setErrorVentas("");
      setSinPermisos(false);
    } catch (error) {
      setErrorVentas(
        mensajeErrorVenta(error, "No se pudieron cargar las ventas")
      );
      if (error?.status === 403) setSinPermisos(true);
    } finally {
      setCargandoVentas(false);
    }
  };

  const cargarResumen = async () => {
    setCargandoResumen(true);

    try {
      const respuesta = await obtenerResumenVentas();
      setResumen(respuesta || null);
      setErrorResumen("");
    } catch (error) {
      setErrorResumen(
        mensajeErrorVenta(error, "No se pudo cargar el resumen de ventas")
      );
      if (error?.status === 403) setSinPermisos(true);
    } finally {
      setCargandoResumen(false);
    }
  };

  useEffect(() => {
    let activo = true;

    const cargarInicial = async () => {
      const [resultadoVentas, resultadoResumen] = await Promise.allSettled([
        obtenerVentas(),
        obtenerResumenVentas()
      ]);

      if (!activo) return;

      if (resultadoVentas.status === "fulfilled") {
        setVentas(
          (resultadoVentas.value || []).map(mapearVentaBackend)
        );
        setErrorVentas("");
      } else {
        setErrorVentas(
          mensajeErrorVenta(
            resultadoVentas.reason,
            "No se pudieron cargar las ventas"
          )
        );
      }

      if (resultadoResumen.status === "fulfilled") {
        setResumen(resultadoResumen.value || null);
        setErrorResumen("");
      } else {
        setErrorResumen(
          mensajeErrorVenta(
            resultadoResumen.reason,
            "No se pudo cargar el resumen de ventas"
          )
        );
      }

      const error403 =
        resultadoVentas.status === "rejected" &&
        resultadoVentas.reason?.status === 403;

      const error403Resumen =
        resultadoResumen.status === "rejected" &&
        resultadoResumen.reason?.status === 403;

      setSinPermisos(error403 || error403Resumen);
      setCargandoVentas(false);
      setCargandoResumen(false);
    };

    cargarInicial();

    return () => {
      activo = false;
    };
  }, []);

  const recargarDatos = async () => {
    await Promise.all([cargarVentas(), cargarResumen()]);
  };

  const ventasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return ventas;

    return ventas.filter((venta) => {
      const contenido = [
        venta.id,
        venta.cliente,
        venta.metodoPago,
        venta.origen,
        venta.estadoPago,
        ...venta.productos.map((producto) => producto.nombre)
      ]
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [ventas, busqueda]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(ventasFiltradas.length / REGISTROS_POR_PAGINA)
  );

  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicio = (paginaSegura - 1) * REGISTROS_POR_PAGINA;
  const ventasPaginadas = ventasFiltradas.slice(
    inicio,
    inicio + REGISTROS_POR_PAGINA
  );

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
    setCargandoCatalogos(true);
    setErrorCatalogos("");

    Promise.all([obtenerVariantesVenta(), obtenerClientesVenta()])
      .then(([listaVariantes, listaClientes]) => {
        setVariantes(Array.isArray(listaVariantes) ? listaVariantes : []);
        setClientes(Array.isArray(listaClientes) ? listaClientes : []);
      })
      .catch((error) => {
        setErrorCatalogos(
          mensajeErrorVenta(
            error,
            "No se pudieron cargar las opciones del formulario"
          )
        );
      })
      .finally(() => {
        setCargandoCatalogos(false);
      });
  };

  const cerrarModal = () => setMostrarModal(false);

  const cambiarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));

    if (String(valor).trim()) {
      setErrores((actuales) => {
        if (!actuales[campo]) return actuales;

        const nuevos = { ...actuales };
        delete nuevos[campo];
        return nuevos;
      });
    }
  };

  const limpiarErrorSelector = () => {
    setErrores((actuales) => {
      if (!actuales.selector) return actuales;

      const nuevos = { ...actuales };
      delete nuevos.selector;
      return nuevos;
    });
  };

  const agregarItem = () => {
    const variante = variantes.find(
      (item) => String(item.id_variante) === String(varianteSel)
    );

    if (!variante) {
      setErrores((actuales) => ({
        ...actuales,
        selector: "Selecciona un producto."
      }));
      return;
    }

    const cantidad = Number(cantidadSel);
    const stock = Number(variante.stock);

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

    const disponible = stock - (enLista ? enLista.cantidad : 0);

    if (cantidad > disponible) {
      setErrores((actuales) => ({
        ...actuales,
        selector: `Solo hay ${disponible} unidades disponibles de ${variante.nombre}.`
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
              stock,
              cantidad
            }
          ]
    }));

    setVarianteSel("");
    setCantidadSel("1");
    limpiarErrorSelector();
  };

  const actualizarCantidadItem = (index, valor) => {
    const texto = String(valor).replace(/[^0-9]/g, "");

    setFormulario((actual) => ({
      ...actual,
      items: actual.items.map((item, i) => {
        if (i !== index) return item;

        const cantidad = Math.min(
          Math.max(Number(texto || 1), 1),
          item.stock
        );

        return { ...item, cantidad };
      })
    }));
  };

  const eliminarProducto = (index) => {
    setFormulario((actual) => ({
      ...actual,
      items: actual.items.filter((_, i) => i !== index)
    }));
  };

  const registrarVenta = async () => {
    const nuevosErrores = {};
    const nombreEscrito = formulario.nombreCliente.trim();

    const clienteSeleccionado = clientes.find(
      (cliente) => String(cliente.id) === String(formulario.idCliente)
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
      nuevosErrores.items = "Agrega al menos un producto a la venta.";
    }

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) return;

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

    if (clienteSeleccionado) datos.id_cliente = clienteSeleccionado.id;

    setCreandoVenta(true);

    try {
      await crearVenta(datos);
      mostrarToast("Venta registrada con éxito");
      cerrarModal();
      await recargarDatos();
    } catch (error) {
      mostrarToast(
        mensajeErrorVenta(error, "No se pudo registrar la venta"),
        "error"
      );
    } finally {
      setCreandoVenta(false);
    }
  };

  const anularVenta = (venta) => {
    if (venta.estado === "Anulada") {
      mostrarToast("Esta venta ya está anulada.", "error");
      return;
    }

    setVentaACancelar(venta);
  };

  const confirmarAnularVenta = async () => {
    if (!ventaACancelar) return;

    const venta = ventaACancelar;
    setVentaACancelar(null);

    try {
      await anularVentaApi(venta.idVenta);
      mostrarToast("Venta anulada correctamente");
      await recargarDatos();
    } catch (error) {
      mostrarToast(
        mensajeErrorVenta(error, "No se pudo anular la venta"),
        "error"
      );
    }
  };

  const verDetalle = async (venta) => {
    setCargandoDetalle(true);

    try {
      const detalle = await obtenerVenta(venta.idVenta);
      setVentaSeleccionada(mapearVentaBackend(detalle));
      setMostrarDetalle(true);
    } catch (error) {
      mostrarToast(
        mensajeErrorVenta(error, "No se pudo cargar la venta"),
        "error"
      );
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    setMostrarDetalle(false);
    setVentaSeleccionada(null);
  };

  const descargarComprobante = async (venta) => {
    setComprobanteEnProceso(venta.idVenta);

    let detalle;

    try {
      detalle = mapearVentaBackend(await obtenerVenta(venta.idVenta));
    } catch (error) {
      mostrarToast(mensajeErrorComprobante(error), "error");
      setComprobanteEnProceso(null);
      return;
    }

    try {
      const doc = construirComprobantePdf(detalle);

      doc.save(`comprobante-${detalle.id}.pdf`);
      mostrarToast("Comprobante descargado con éxito");
    } catch (error) {
      mostrarToast(
        error?.message || "No se pudo generar el PDF del comprobante",
        "error"
      );
    } finally {
      setComprobanteEnProceso(null);
    }
  };

  const indicadores = [
    {
      titulo: "Total de ventas",
      valor: resumen?.total_ventas ?? 0,
      icono: ShoppingCart
    },
    {
      titulo: "Pagadas",
      valor: resumen?.pagadas ?? 0,
      icono: CheckCircle2
    },
    {
      titulo: "Pendientes de pago",
      valor: resumen?.pendientes ?? 0,
      icono: Clock
    },
    {
      titulo: "Canceladas",
      valor: resumen?.canceladas ?? 0,
      icono: XCircle
    },
    {
      titulo: "Valor total pagado",
      valor: formatearPrecio(resumen?.valor_total_pagadas ?? 0),
      icono: DollarSign,
      destacado: true
    }
  ];

  return (
    <div className="ventas-page">
      <div className="ventas-header">
        <div className="ventas-title">
          <h2>Ventas</h2>
          <p>Consulta y gestiona las ventas realizadas en la tienda.</p>
        </div>

        <div className="ventas-actions">
          {puedeConsultar && (
            <div className="ventas-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar ventas..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPaginaActual(1);
                }}
              />
            </div>
          )}

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

      {sinPermisos ? (
        <div className="ventas-permiso">No tienes permisos</div>
      ) : (
        <>
          <div className="ventas-indicators">
            {indicadores.map((item) => {
              const Icon = item.icono;

              return (
                <div
                  className={
                    item.destacado
                      ? "ventas-indicator ventas-indicator-gold"
                      : "ventas-indicator"
                  }
                  key={item.titulo}
                >
                  <div className="ventas-indicator-icon">
                    <Icon size={21} />
                  </div>

                  <div className="ventas-indicator-info">
                    <span>{item.titulo}</span>
                    <strong>
                      {cargandoResumen
                        ? "—"
                        : errorResumen
                          ? "—"
                          : item.valor}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          {errorResumen && (
            <div className="ventas-resumen-error">{errorResumen}</div>
          )}

          <div className="ventas-table-container">
            <table className="ventas-table">
              <thead>
                <tr>
                  <th>N.° VENTA</th>
                  <th>FECHA</th>
                  <th>CLIENTE</th>
                  <th>PRODUCTOS</th>
                  <th>TOTAL</th>
                  <th>MÉTODO DE PAGO</th>
                  <th>ESTADO DE PAGO</th>
                  <th>ORIGEN</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {ventasPaginadas.map((venta) => (
                  <tr key={venta.id}>
                    <td>
                      <strong className="venta-id">{venta.id}</strong>
                      {venta.estado === "Anulada" && (
                        <span className="venta-anulada-tag">Anulada</span>
                      )}
                    </td>

                    <td>
                      <span className="venta-fecha">
                        {formatearFecha(venta.fecha)}
                      </span>
                    </td>

                    <td>
                      <span
                        className="venta-cliente"
                        title={venta.cliente}
                      >
                        {venta.cliente}
                      </span>
                    </td>

                    <td>
                      <div className="venta-productos-celda">
                        <span
                          className="venta-productos-resumen"
                          title={venta.productos
                            .map((producto) => producto.nombre)
                            .join(", ")}
                        >
                          {resumirProductos(venta.productos)}
                        </span>
                        <span className="venta-productos-cantidad">
                          {venta.cantidadProductos}{" "}
                          {venta.cantidadProductos === 1
                            ? "unidad"
                            : "unidades"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <strong className="venta-total">
                        {formatearPrecio(venta.total)}
                      </strong>
                    </td>

                    <td>
                      <span className="venta-metodo">{venta.metodoPago}</span>
                    </td>

                    <td>
                      <span
                        className={
                          venta.estadoPago === "Pagada"
                            ? "venta-pago-badge pagada"
                            : "venta-pago-badge pendiente"
                        }
                      >
                        {venta.estadoPago}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          venta.origen === "Tienda virtual"
                            ? "venta-origen virtual"
                            : "venta-origen mostrador"
                        }
                      >
                        {venta.origen}
                      </span>
                    </td>

                    <td>
                      <div className="venta-actions">
                        {puedeConsultar && (
                          <button
                            type="button"
                            className="venta-detail-button"
                            onClick={() => verDetalle(venta)}
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
                            onClick={() => descargarComprobante(venta)}
                            title="Descargar comprobante PDF"
                            disabled={
                              comprobanteEnProceso === venta.idVenta
                            }
                          >
                            <FileText size={18} />
                          </button>
                        )}

                        {puedeCambiarEstado &&
                          venta.origen === "Mostrador" &&
                          !venta.idPedido && (
                            <button
                              type="button"
                              className={
                                venta.estado === "Anulada"
                                  ? "venta-anular-button disabled"
                                  : "venta-anular-button"
                              }
                              title={
                                venta.estado === "Anulada"
                                  ? "Esta venta ya está anulada"
                                  : "Anular venta"
                              }
                              onClick={() => anularVenta(venta)}
                              disabled={venta.estado === "Anulada"}
                            >
                              <X size={18} />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}

                {ventasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan="9" className="ventas-empty">
                      {cargandoVentas
                        ? "Cargando ventas..."
                        : errorVentas
                          ? errorVentas
                          : busqueda.trim()
                            ? "No se encontraron ventas con ese criterio."
                            : "No hay ventas registradas."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <Pagination
              currentPage={paginaSegura}
              totalPages={totalPaginas}
              onPageChange={setPaginaActual}
            />
          </div>
        </>
      )}

      {mostrarModal && (
        <div className="venta-modal-overlay">
          <div className="venta-modal">
            <div className="venta-modal-header">
              <h3>Registrar venta</h3>

              <button
                type="button"
                className="venta-modal-close"
                onClick={cerrarModal}
              >
                <X size={21} />
              </button>
            </div>

            <div className="venta-modal-body">
              <div className="venta-form-row">
                <div className="venta-form-group">
                  <label>CLIENTE</label>

                  <select
                    value={formulario.idCliente}
                    className={`input ${errores.nombreCliente ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo("idCliente", e.target.value)
                    }
                  >
                    <option value="">
                      Venta de mostrador (escribir nombre)
                    </option>

                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="venta-form-group">
                  <label>FECHA</label>

                  <input
                    type="date"
                    value={formulario.fecha}
                    className={`input ${errores.fecha ? "input-error" : ""}`}
                    onChange={(e) => cambiarCampo("fecha", e.target.value)}
                  />

                  {errores.fecha && (
                    <span className="error-text">{errores.fecha}</span>
                  )}
                </div>
              </div>

              {!formulario.idCliente && (
                <div className="venta-form-group">
                  <label>NOMBRE DEL CLIENTE</label>

                  <input
                    type="text"
                    placeholder="Nombre del comprador"
                    maxLength={100}
                    value={formulario.nombreCliente}
                    className={`input ${errores.nombreCliente ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo("nombreCliente", e.target.value)
                    }
                  />

                  {errores.nombreCliente && (
                    <span className="error-text">
                      {errores.nombreCliente}
                    </span>
                  )}
                </div>
              )}

              <div className="venta-form-group">
                <label>MÉTODO DE PAGO</label>

                <select
                  value={formulario.metodoPago}
                  onChange={(e) =>
                    cambiarCampo("metodoPago", e.target.value)
                  }
                >
                  {METODOS_PAGO.map((metodo) => (
                    <option key={metodo} value={metodo}>
                      {metodo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="venta-form-hint">
                La venta se registra como pagada y su estado de pago no es
                editable.
              </div>

              <div className="venta-details-header">
                <label>PRODUCTOS DE LA VENTA</label>

                <button
                  type="button"
                  className="venta-add-product"
                  onClick={() => setMostrarSelector((actual) => !actual)}
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
                <span className="error-text">{errorCatalogos}</span>
              )}

              {mostrarSelector && !cargandoCatalogos && (
                <div className="venta-form-row venta-selector-row">
                  <div className="venta-form-group">
                    <label>PRODUCTO</label>

                    <select
                      value={varianteSel}
                      onChange={(e) => {
                        setVarianteSel(e.target.value);
                        limpiarErrorSelector();
                      }}
                    >
                      <option value="">Selecciona una variante</option>

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
                    <label>CANTIDAD</label>

                    <input
                      type="number"
                      min="1"
                      value={cantidadSel}
                      onChange={(e) =>
                        setCantidadSel(
                          e.target.value.replace(/[^0-9]/g, "")
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
                <span className="error-text">{errores.selector}</span>
              )}

              {errores.items && (
                <span className="error-text">{errores.items}</span>
              )}

              {formulario.items.length === 0 ? (
                <div className="venta-no-productos">
                  Sin productos. Agrega uno.
                </div>
              ) : (
                <div className="venta-products-list">
                  {formulario.items.map((item, index) => (
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
                          onClick={() => eliminarProducto(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="venta-product-item-fields">
                        <div className="venta-product-item-field nombre">
                          <label>NOMBRE</label>
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={item.nombre}
                          />
                        </div>

                        <div className="venta-product-item-field">
                          <label>CANTIDAD</label>
                          <input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.cantidad}
                            onChange={(e) =>
                              actualizarCantidadItem(index, e.target.value)
                            }
                          />
                        </div>

                        <div className="venta-product-item-field">
                          <label>TALLA</label>
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={item.talla}
                          />
                        </div>

                        <div className="venta-product-item-field">
                          <label>COLOR</label>
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={item.color}
                          />
                        </div>

                        <div className="venta-product-item-field">
                          <label>STOCK</label>
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={item.stock}
                          />
                        </div>

                        <div className="venta-product-item-field">
                          <label>PRECIO (COP)</label>
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={formatearPrecio(item.precio)}
                          />
                        </div>

                        <div className="venta-product-item-subtotal">
                          <label>SUBTOTAL</label>
                          <strong>
                            {formatearPrecio(item.precio * item.cantidad)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="venta-total-box">
                <span>MONTO TOTAL</span>

                <strong>
                  {formatearPrecio(
                    formulario.items.reduce(
                      (suma, item) =>
                        suma + item.precio * item.cantidad,
                      0
                    )
                  )}
                </strong>
              </div>
            </div>

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
                {creandoVenta ? "Creando..." : "Crear venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarDetalle && ventaSeleccionada && (
        <div className="venta-modal-overlay">
          <div className="venta-modal">
            <div className="venta-modal-header">
              <h3>Detalle de venta</h3>

              <button
                type="button"
                className="venta-modal-close"
                onClick={cerrarDetalle}
              >
                <X size={21} />
              </button>
            </div>

            <div className="venta-modal-body">
              <div className="venta-form-row">
                <div className="venta-info-group">
                  <label>NÚMERO DE VENTA</label>
                  <div className="venta-info-value">
                    {ventaSeleccionada.id}
                  </div>
                </div>

                <div className="venta-info-group">
                  <label>PEDIDO RELACIONADO</label>
                  <div className="venta-info-value">
                    {ventaSeleccionada.idPedido
                      ? `#${ventaSeleccionada.idPedido}`
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="venta-form-row">
                <div className="venta-info-group">
                  <label>CLIENTE</label>
                  <div className="venta-info-value">
                    {ventaSeleccionada.cliente}
                  </div>
                </div>

                <div className="venta-info-group">
                  <label>FECHA DE REGISTRO</label>
                  <div className="venta-info-value">
                    {formatearFecha(ventaSeleccionada.fecha)}
                  </div>
                </div>
              </div>

              <div className="venta-form-row">
                <div className="venta-info-group">
                  <label>MÉTODO DE PAGO</label>
                  <div className="venta-info-value">
                    {ventaSeleccionada.metodoPago}
                  </div>
                </div>

                <div className="venta-info-group">
                  <label>ESTADO DE PAGO</label>
                  <div className="venta-info-value venta-info-badge">
                    <span
                      className={
                        ventaSeleccionada.estadoPago === "Pagada"
                          ? "venta-pago-badge pagada"
                          : "venta-pago-badge pendiente"
                      }
                    >
                      {ventaSeleccionada.estadoPago}
                    </span>
                  </div>
                </div>
              </div>

              <div className="venta-form-row">
                <div className="venta-info-group">
                  <label>ORIGEN</label>
                  <div className="venta-info-value">
                    {ventaSeleccionada.origen}
                  </div>
                </div>

                <div className="venta-info-group">
                  <label>FECHA DE PAGO</label>
                  <div className="venta-info-value">
                    {ventaSeleccionada.fechaPago
                      ? formatearFecha(ventaSeleccionada.fechaPago)
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="venta-products">
                <label>DETALLE DE PRODUCTOS</label>

                <div className="venta-products-list">
                  {ventaSeleccionada.productos.length > 0 ? (
                    ventaSeleccionada.productos.map((producto, index) => (
                      <div className="venta-product" key={index}>
                        <div>
                          <strong>{producto.nombre}</strong>
                          <span>
                            Talla: {producto.talla} · Color: {producto.color}
                          </span>
                          <span>
                            Cantidad: {producto.cantidad} · Precio unitario:{" "}
                            {formatearPrecio(producto.precio)}
                          </span>
                        </div>

                        <strong className="venta-product-subtotal">
                          {formatearPrecio(
                            producto.subtotal ||
                              producto.precio * producto.cantidad
                          )}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <div className="venta-no-products">
                      No hay productos registrados.
                    </div>
                  )}
                </div>
              </div>

              <div className="venta-total-box">
                <span>TOTAL</span>
                <strong>
                  {formatearPrecio(ventaSeleccionada.total)}
                </strong>
              </div>

              {ventaSeleccionada.estado === "Anulada" && (
                <div className="venta-closed-info">
                  Esta venta se encuentra anulada. Solo está disponible para
                  consulta y no puede ser modificada.
                </div>
              )}
            </div>

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
          <>
            ¿Deseas anular la venta{" "}
            <strong>{ventaACancelar?.id}</strong>? Esta acción no se puede
            deshacer.
          </>
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
