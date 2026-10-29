import { useEffect, useMemo, useRef, useState } from "react";

import {
  Plus,
  Search,
  Eye,
  X,
  Trash2,
  FileText,
  ShoppingBag,
  Calendar,
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign
} from "lucide-react";

import "./Ventas.css";
import { construirComprobantePdf } from "./comprobanteVentaPdf";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";

import { tienePermiso } from "../utils/permisos";

import { urlImagen } from "../../../shared/utils/imagenes";

import {
  obtenerVentas,
  obtenerResumenVentas,
  obtenerVenta,
  anularVenta as anularVentaApi,
  buscarProductosVenta,
  obtenerTallasVenta,
  obtenerColoresVenta,
  obtenerVarianteVenta,
  obtenerClientesVenta,
  obtenerConfiguracionNegocio,
  crearVenta
} from "../../../shared/services/api";

const REGISTROS_POR_PAGINA = 6;

const METODOS_PAGO = ["Efectivo", "Transferencia"];

const PASOS_SELECTOR = [
  { numero: 1, titulo: "Producto" },
  { numero: 2, titulo: "Talla" },
  { numero: 3, titulo: "Color" },
  { numero: 4, titulo: "Cantidad" }
];

// Avisa a los demás módulos del panel (Productos) que el stock cambió.
const notificarInventarioActualizado = () => {
  window.dispatchEvent(new Event("inventario:actualizado"));
};

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
    codigo: producto.codigo || "—",
    talla: producto.talla || "-",
    color: producto.color || "-",
    cantidad: Number(producto.cantidad) || 0,
    precio: Number(producto.precio_unitario) || 0,
    subtotal: Number(producto.subtotal) || 0
  }));

  const subtotalProductos = productos.reduce(
    (total, producto) => total + producto.subtotal,
    0
  );
  const total = Number(venta.total) || 0;
  const abonado = Number(venta.monto_abonado) || 0;
  const abonos = Array.isArray(venta.abonos) ? venta.abonos : [];

  return {
    id: venta.codigo || String(venta.id),
    idVenta: venta.id,
    idPedido: venta.id_pedido ?? null,
    numeroPedido: venta.numero_pedido ?? venta.id_pedido ?? null,
    cliente: venta.cliente || "—",
    clienteNombre: venta.cliente_nombre || venta.cliente || "—",
    clienteCorreo: venta.cliente_correo || "",
    clienteTelefono: venta.cliente_telefono || "",
    clienteDireccion: venta.cliente_direccion || "",
    fecha: venta.fecha,
    fechaPago: venta.fecha_pago || null,
    subtotal:
      venta.subtotal !== null && venta.subtotal !== undefined
        ? Number(venta.subtotal) || 0
        : subtotalProductos,
    descuento: Number(venta.descuento) || 0,
    iva: Number(venta.iva) || 0,
    costoEnvio: Number(venta.costo_envio) || 0,
    total,
    abonado,
    saldoPendiente:
      venta.saldo_pendiente !== null && venta.saldo_pendiente !== undefined
        ? Number(venta.saldo_pendiente) || 0
        : Math.max(total - abonado, 0),
    abonos,
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
    metodoPago: "Efectivo",
    items: []
  });
  const [errores, setErrores] = useState({});
  const [creandoVenta, setCreandoVenta] = useState(false);
  const enviandoVentaRef = useRef(false);
  const anulandoVentaRef = useRef(false);

  const [clientes, setClientes] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState("");

  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [pasoSelector, setPasoSelector] = useState(1);
  const [textoProducto, setTextoProducto] = useState("");
  const [resultadosProductos, setResultadosProductos] = useState([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [productoSel, setProductoSel] = useState(null);
  const [tallas, setTallas] = useState([]);
  const [cargandoTallas, setCargandoTallas] = useState(false);
  const [tallaSel, setTallaSel] = useState(null);
  const [colores, setColores] = useState([]);
  const [cargandoColores, setCargandoColores] = useState(false);
  const [colorSel, setColorSel] = useState(null);
  const [varianteDetalle, setVarianteDetalle] = useState(null);
  const [cargandoVariante, setCargandoVariante] = useState(false);
  const [cantidadSel, setCantidadSel] = useState("1");
  const solicitudSelectorRef = useRef(0);

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

  const reiniciarSelector = () => {
    solicitudSelectorRef.current += 1;
    setPasoSelector(1);
    setTextoProducto("");
    setResultadosProductos([]);
    setBuscandoProductos(false);
    setProductoSel(null);
    setTallas([]);
    setCargandoTallas(false);
    setTallaSel(null);
    setColores([]);
    setCargandoColores(false);
    setColorSel(null);
    setVarianteDetalle(null);
    setCargandoVariante(false);
    setCantidadSel("1");
  };

  const cargarCatalogosVenta = async () => {
    try {
      const listaClientes = await obtenerClientesVenta();
      setClientes(Array.isArray(listaClientes) ? listaClientes : []);
      setErrorCatalogos("");
    } catch (error) {
      setErrorCatalogos(
        mensajeErrorVenta(
          error,
          "No se pudieron cargar las opciones del formulario"
        )
      );
    }
  };

  const abrirModal = () => {
    setFormulario({
      idCliente: "",
      nombreCliente: "",
      fecha: fechaHoy(),
      metodoPago: "Efectivo",
      items: []
    });
    setErrores({});
    setMostrarSelector(false);
    reiniciarSelector();
    setMostrarModal(true);
    setCargandoCatalogos(true);
    setErrorCatalogos("");

    cargarCatalogosVenta().finally(() => {
      setCargandoCatalogos(false);
    });
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    reiniciarSelector();
  };

  const alternarSelector = () => {
    const abrir = !mostrarSelector;

    reiniciarSelector();
    limpiarErrorSelector();
    setMostrarSelector(abrir);
  };

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

  const mostrarErrorSelector = (mensaje) => {
    setErrores((actuales) => ({ ...actuales, selector: mensaje }));
  };

  const cambiarTextoProducto = (valor) => {
    setTextoProducto(valor);

    if (valor.trim().length < 2) {
      setResultadosProductos([]);
      setBuscandoProductos(false);
      limpiarErrorSelector();
      return;
    }

    setBuscandoProductos(true);
  };

  useEffect(() => {
    const texto = textoProducto.trim();

    if (!mostrarModal || !mostrarSelector || pasoSelector !== 1) return;

    if (texto.length < 2) return;

    let activo = true;

    const temporizador = setTimeout(async () => {
      setBuscandoProductos(true);

      try {
        const respuesta = await buscarProductosVenta(texto);

        if (!activo) return;

        setResultadosProductos(
          Array.isArray(respuesta) ? respuesta.slice(0, 10) : []
        );
        limpiarErrorSelector();
      } catch (error) {
        if (!activo) return;

        setResultadosProductos([]);
        mostrarErrorSelector(
          mensajeErrorVenta(error, "No se pudieron buscar los productos")
        );
      } finally {
        if (activo) setBuscandoProductos(false);
      }
    }, 300);

    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [textoProducto, mostrarModal, mostrarSelector, pasoSelector]);

  const seleccionarProducto = async (producto) => {
    const solicitud = ++solicitudSelectorRef.current;

    setProductoSel(producto);
    setTallaSel(null);
    setTallas([]);
    setColorSel(null);
    setColores([]);
    setVarianteDetalle(null);
    setPasoSelector(2);
    setCargandoTallas(true);
    limpiarErrorSelector();

    try {
      const respuesta = await obtenerTallasVenta(
        producto.id_producto ?? producto.id
      );

      if (solicitud !== solicitudSelectorRef.current) return;

      setTallas(Array.isArray(respuesta) ? respuesta : []);
    } catch (error) {
      if (solicitud !== solicitudSelectorRef.current) return;

      setTallas([]);
      mostrarErrorSelector(
        mensajeErrorVenta(error, "No se pudieron cargar las tallas")
      );
    } finally {
      if (solicitud === solicitudSelectorRef.current) {
        setCargandoTallas(false);
      }
    }
  };

  const seleccionarTalla = async (talla) => {
    if (!talla.disponible || !productoSel) return;

    const solicitud = ++solicitudSelectorRef.current;

    setTallaSel(talla);
    setColorSel(null);
    setColores([]);
    setVarianteDetalle(null);
    setPasoSelector(3);
    setCargandoColores(true);
    limpiarErrorSelector();

    try {
      const respuesta = await obtenerColoresVenta(
        productoSel.id_producto ?? productoSel.id,
        talla.id_talla ?? talla.id
      );

      if (solicitud !== solicitudSelectorRef.current) return;

      setColores(Array.isArray(respuesta) ? respuesta : []);
    } catch (error) {
      if (solicitud !== solicitudSelectorRef.current) return;

      setColores([]);
      mostrarErrorSelector(
        mensajeErrorVenta(error, "No se pudieron cargar los colores")
      );
    } finally {
      if (solicitud === solicitudSelectorRef.current) {
        setCargandoColores(false);
      }
    }
  };

  const seleccionarColor = async (color) => {
    if (!productoSel || !tallaSel) return;

    const solicitud = ++solicitudSelectorRef.current;

    setColorSel(color);
    setVarianteDetalle(null);
    setPasoSelector(4);
    setCargandoVariante(true);
    setCantidadSel("1");
    limpiarErrorSelector();

    try {
      const respuesta = await obtenerVarianteVenta(
        productoSel.id_producto ?? productoSel.id,
        tallaSel.id_talla ?? tallaSel.id,
        color.id_color ?? color.id
      );

      if (solicitud !== solicitudSelectorRef.current) return;

      setVarianteDetalle(respuesta);
    } catch (error) {
      if (solicitud !== solicitudSelectorRef.current) return;

      setVarianteDetalle(null);
      mostrarErrorSelector(
        mensajeErrorVenta(error, "No se pudo cargar la variante")
      );
    } finally {
      if (solicitud === solicitudSelectorRef.current) {
        setCargandoVariante(false);
      }
    }
  };

  const irAPasoSelector = (paso) => {
    if (paso >= pasoSelector) return;

    solicitudSelectorRef.current += 1;

    if (paso === 1) {
      setTallaSel(null);
      setTallas([]);
      setColorSel(null);
      setColores([]);
      setVarianteDetalle(null);

      if (textoProducto.trim().length >= 2) {
        setBuscandoProductos(true);
      }
    } else if (paso === 2) {
      setColorSel(null);
      setColores([]);
      setVarianteDetalle(null);
    } else if (paso === 3) {
      setVarianteDetalle(null);
    }

    setPasoSelector(paso);
    setCantidadSel("1");
    limpiarErrorSelector();
  };

  const agregarItem = () => {
    if (!productoSel || !tallaSel || !colorSel || !varianteDetalle) {
      mostrarErrorSelector("Completa la selección del producto.");
      return;
    }

    const cantidad = Number(cantidadSel);
    const stock = Number(varianteDetalle.stock);

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      mostrarErrorSelector(
        "La cantidad debe ser un número entero mayor a cero."
      );
      return;
    }

    const enLista = formulario.items.find(
      (item) =>
        String(item.id_variante) ===
        String(varianteDetalle.id_variante)
    );

    const disponible = Math.max(
      stock - (enLista ? enLista.cantidad : 0),
      0
    );

    if (cantidad > disponible) {
      mostrarErrorSelector(
        `Solo hay ${disponible} unidades disponibles de ${productoSel.nombre}.`
      );
      return;
    }

    setFormulario((actual) => ({
      ...actual,
      items: enLista
        ? actual.items.map((item) =>
            String(item.id_variante) ===
            String(varianteDetalle.id_variante)
              ? {
                  ...item,
                  imagen: varianteDetalle.imagen || "",
                  precio: Number(varianteDetalle.precio),
                  stock,
                  cantidad: item.cantidad + cantidad
                }
              : item
          )
        : [
            ...actual.items,
            {
              id_variante: varianteDetalle.id_variante,
              nombre: productoSel.nombre,
              talla: tallaSel.nombre || "-",
              color: colorSel.nombre || "-",
              imagen: varianteDetalle.imagen || "",
              precio: Number(varianteDetalle.precio),
              stock,
              cantidad
            }
          ]
    }));

    reiniciarSelector();
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
    if (enviandoVentaRef.current) return;

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

    enviandoVentaRef.current = true;
    setCreandoVenta(true);

    try {
      await crearVenta(datos);
      mostrarToast("Venta registrada con éxito");
      cerrarModal();
      notificarInventarioActualizado();
      await Promise.all([recargarDatos(), cargarCatalogosVenta()]);
    } catch (error) {
      mostrarToast(
        mensajeErrorVenta(error, "No se pudo registrar la venta"),
        "error"
      );
    } finally {
      enviandoVentaRef.current = false;
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
    if (!ventaACancelar || anulandoVentaRef.current) return;

    const venta = ventaACancelar;
    anulandoVentaRef.current = true;
    setVentaACancelar(null);

    try {
      await anularVentaApi(venta.idVenta);
      mostrarToast("Venta anulada correctamente");
      notificarInventarioActualizado();
      await Promise.all([recargarDatos(), cargarCatalogosVenta()]);
    } catch (error) {
      mostrarToast(
        mensajeErrorVenta(error, "No se pudo anular la venta"),
        "error"
      );
    } finally {
      anulandoVentaRef.current = false;
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
    let configuracion;

    try {
      const [ventaCompleta, datosNegocio] = await Promise.all([
        obtenerVenta(venta.idVenta),
        obtenerConfiguracionNegocio().catch(() => null)
      ]);

      detalle = mapearVentaBackend(ventaCompleta);
      configuracion = datosNegocio;
    } catch (error) {
      mostrarToast(mensajeErrorComprobante(error), "error");
      setComprobanteEnProceso(null);
      return;
    }

    try {
      const doc = construirComprobantePdf(detalle, configuracion);

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

  const itemEnListaSelector = varianteDetalle
    ? formulario.items.find(
        (item) =>
          String(item.id_variante) ===
          String(varianteDetalle.id_variante)
      )
    : null;

  const disponibleSelector = varianteDetalle
    ? Math.max(
        Number(varianteDetalle.stock) -
          Number(itemEnListaSelector?.cantidad || 0),
        0
      )
    : 0;

  const clienteRegistrado = clientes.find(
    (cliente) => String(cliente.id) === String(formulario.idCliente)
  );

  const totalUnidadesVenta = formulario.items.reduce(
    (total, item) => total + item.cantidad,
    0
  );

  const totalVenta = formulario.items.reduce(
    (total, item) => total + item.precio * item.cantidad,
    0
  );

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
        <div className="venta-modal-overlay venta-registro-overlay">
          <div className="venta-modal venta-modal-registro">
            <div className="venta-modal-header venta-registro-header">
              <div className="venta-registro-title">
                <span className="venta-registro-title-icon">
                  <ShoppingBag size={19} />
                </span>

                <h3>Registrar venta</h3>
              </div>

              <button
                type="button"
                className="venta-modal-close"
                onClick={cerrarModal}
              >
                <X size={19} />
              </button>
            </div>

            <div className="venta-modal-body venta-registro-body">
              <div className="venta-registro-franja">
                <div className="venta-form-group venta-registro-field">
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

                <div className="venta-form-group venta-registro-field">
                  <label>FECHA</label>

                  <div className="venta-registro-date">
                    <Calendar size={16} />

                    <input
                      type="date"
                      value={formulario.fecha}
                      className={`input ${errores.fecha ? "input-error" : ""}`}
                      onChange={(e) =>
                        cambiarCampo("fecha", e.target.value)
                      }
                    />
                  </div>

                  {errores.fecha && (
                    <span className="error-text">{errores.fecha}</span>
                  )}
                </div>

                <div className="venta-form-group venta-registro-field">
                  <label>NOMBRE DEL CLIENTE</label>

                  <input
                    type="text"
                    placeholder="Nombre del comprador"
                    maxLength={100}
                    value={
                      clienteRegistrado
                        ? clienteRegistrado.nombre
                        : formulario.nombreCliente
                    }
                    disabled={Boolean(clienteRegistrado)}
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

                <div className="venta-form-group venta-registro-field">
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

                  <span className="venta-registro-nota">
                    La venta se registra como pagada y su estado de pago no
                    es editable.
                  </span>
                </div>
              </div>

              <div className="venta-registro-grid">
                <section className="venta-registro-card venta-registro-productos">
                  <div className="venta-registro-card-head">
                    <div className="venta-registro-card-title">
                      <ShoppingBag size={17} />
                      <h4>PRODUCTOS DE LA VENTA</h4>
                    </div>

                    <button
                      type="button"
                      className="venta-add-product venta-registro-toggle"
                      onClick={alternarSelector}
                      disabled={cargandoCatalogos}
                    >
                      {mostrarSelector ? (
                        <X size={15} />
                      ) : (
                        <Plus size={15} />
                      )}
                      {mostrarSelector
                        ? "Cerrar selector"
                        : "Agregar producto"}
                    </button>
                  </div>

              {cargandoCatalogos && (
                <div className="venta-no-productos">
                  Cargando clientes disponibles...
                </div>
              )}

              {errorCatalogos && (
                <span className="error-text">{errorCatalogos}</span>
              )}

              {mostrarSelector && !cargandoCatalogos && (
                <div className="venta-selector-panel">
                  <div className="venta-selector-steps">
                    {PASOS_SELECTOR.map((paso) => (
                      <button
                        type="button"
                        key={paso.numero}
                        className={`venta-selector-step${
                          pasoSelector === paso.numero ? " active" : ""
                        }${
                          pasoSelector > paso.numero ? " completed" : ""
                        }`}
                        onClick={() => irAPasoSelector(paso.numero)}
                        disabled={paso.numero >= pasoSelector}
                      >
                        <span className="venta-selector-step-numero">
                          {paso.numero}
                        </span>
                        <span>{paso.titulo}</span>
                      </button>
                    ))}
                  </div>

                  {pasoSelector === 1 && (
                    <div className="venta-selector-content">
                      <div className="venta-selector-cabecera">
                        <div>
                          <strong>Busca el producto</strong>
                          <span>
                            Escribe su nombre o código para ver las
                            opciones disponibles.
                          </span>
                        </div>
                      </div>

                      <div className="venta-producto-buscador">
                        <Search size={18} />

                        <input
                          type="text"
                          autoFocus
                          value={textoProducto}
                          placeholder="Nombre o código (mínimo 2 caracteres)"
                          onChange={(e) =>
                            cambiarTextoProducto(e.target.value)
                          }
                        />
                      </div>

                      {buscandoProductos && (
                        <div className="venta-selector-mensaje">
                          Buscando productos...
                        </div>
                      )}

                      {!buscandoProductos &&
                        textoProducto.trim().length < 2 && (
                          <div className="venta-selector-mensaje">
                            Escribe al menos 2 caracteres para buscar.
                          </div>
                        )}

                      {!buscandoProductos &&
                        textoProducto.trim().length >= 2 &&
                        resultadosProductos.length === 0 &&
                        !errores.selector && (
                          <div className="venta-selector-mensaje">
                            No se encontraron productos activos con stock.
                          </div>
                        )}

                      {!buscandoProductos &&
                        resultadosProductos.length > 0 && (
                          <div className="venta-producto-resultados">
                            {resultadosProductos.map((producto) => (
                              <button
                                type="button"
                                key={producto.id_producto ?? producto.id}
                                className="venta-producto-resultado"
                                onClick={() =>
                                  seleccionarProducto(producto)
                                }
                              >
                                <span className="venta-producto-resultado-info">
                                  <strong>{producto.nombre}</strong>
                                  <span>
                                    {producto.codigo
                                      ? `Código: ${producto.codigo}`
                                      : "Sin código"}
                                  </span>
                                </span>

                                <span className="venta-producto-resultado-stock">
                                  <strong>{producto.stock_total}</strong>
                                  <span>disponibles</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {pasoSelector === 2 && (
                    <div className="venta-selector-content">
                      <div className="venta-selector-cabecera">
                        <div>
                          <strong>{productoSel?.nombre}</strong>
                          <span>
                            Selecciona la talla que deseas vender.
                          </span>
                        </div>

                        <button
                          type="button"
                          className="venta-selector-cambiar"
                          onClick={() => irAPasoSelector(1)}
                        >
                          Cambiar
                        </button>
                      </div>

                      {cargandoTallas ? (
                        <div className="venta-selector-mensaje">
                          Cargando tallas...
                        </div>
                      ) : tallas.length === 0 ? (
                        <div className="venta-selector-mensaje">
                          Este producto no tiene tallas disponibles.
                        </div>
                      ) : (
                        <div className="venta-tallas-grid">
                          {tallas.map((talla) => (
                            <button
                              type="button"
                              key={talla.id_talla ?? talla.id}
                              className={`venta-talla-chip${
                                String(tallaSel?.id_talla ?? tallaSel?.id) ===
                                String(talla.id_talla ?? talla.id)
                                  ? " selected"
                                  : ""
                              }`}
                              onClick={() => seleccionarTalla(talla)}
                              disabled={!talla.disponible}
                            >
                              <strong>{talla.nombre}</strong>
                              <span>
                                {talla.disponible
                                  ? `${talla.stock} disponibles`
                                  : "Agotada"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {pasoSelector === 3 && (
                    <div className="venta-selector-content">
                      <div className="venta-selector-cabecera">
                        <div>
                          <strong>{productoSel?.nombre}</strong>
                          <span>
                            Talla {tallaSel?.nombre}. Elige el color.
                          </span>
                        </div>

                        <button
                          type="button"
                          className="venta-selector-cambiar"
                          onClick={() => irAPasoSelector(2)}
                        >
                          Cambiar
                        </button>
                      </div>

                      {cargandoColores ? (
                        <div className="venta-selector-mensaje">
                          Cargando colores...
                        </div>
                      ) : colores.length === 0 ? (
                        <div className="venta-selector-mensaje">
                          No hay colores con stock para esta talla.
                        </div>
                      ) : (
                        <div className="venta-colores-grid">
                          {colores.map((color) => (
                            <button
                              type="button"
                              key={color.id_color ?? color.id}
                              className={`venta-color-chip${
                                String(colorSel?.id_color ?? colorSel?.id) ===
                                String(color.id_color ?? color.id)
                                  ? " selected"
                                  : ""
                              }`}
                              onClick={() => seleccionarColor(color)}
                            >
                              <span
                                className="venta-color-dot"
                                style={{
                                  backgroundColor:
                                    color.codigo_hex || "#d9d9d9"
                                }}
                              />

                              <span className="venta-color-info">
                                <strong>{color.nombre}</strong>
                                <span>{color.stock} disponibles</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {pasoSelector === 4 && (
                    <div className="venta-selector-content">
                      {cargandoVariante ? (
                        <div className="venta-selector-mensaje">
                          Cargando disponibilidad...
                        </div>
                      ) : !varianteDetalle ? (
                        <div className="venta-selector-mensaje">
                          No se pudo cargar esta variante. Vuelve al paso
                          anterior e intenta de nuevo.
                        </div>
                      ) : (
                        <>
                          <div className="venta-selector-resumen">
                            <div>
                              <span>Producto</span>
                              <strong>{productoSel?.nombre}</strong>
                            </div>

                            <div>
                              <span>Talla</span>
                              <strong>{tallaSel?.nombre}</strong>
                            </div>

                            <div>
                              <span>Color</span>
                              <strong>{colorSel?.nombre}</strong>
                            </div>

                            <div>
                              <span>Precio</span>
                              <strong>
                                {formatearPrecio(varianteDetalle.precio)}
                              </strong>
                            </div>
                          </div>

                          <div className="venta-selector-cantidad">
                            <div className="venta-form-group">
                              <label>CANTIDAD</label>

                              <input
                                type="number"
                                min="1"
                                max={disponibleSelector}
                                value={cantidadSel}
                                onChange={(e) =>
                                  setCantidadSel(
                                    e.target.value.replace(/[^0-9]/g, "")
                                  )
                                }
                                disabled={disponibleSelector === 0}
                              />

                              <span className="venta-selector-disponible">
                                {disponibleSelector === 0
                                  ? "Ya agregaste todo el stock disponible."
                                  : `${disponibleSelector} unidades disponibles${
                                      itemEnListaSelector
                                        ? ` (${itemEnListaSelector.cantidad} ya están en la venta)`
                                        : ""
                                    }.`}
                              </span>
                            </div>

                            <div className="venta-selector-subtotal">
                              <span>SUBTOTAL</span>
                              <strong>
                                {formatearPrecio(
                                  Number(varianteDetalle.precio) *
                                    (Number(cantidadSel) || 0)
                                )}
                              </strong>
                            </div>

                            <button
                              type="button"
                              className="venta-add-product venta-selector-agregar"
                              onClick={agregarItem}
                              disabled={
                                disponibleSelector === 0 ||
                                !Number.isInteger(Number(cantidadSel)) ||
                                Number(cantidadSel) < 1 ||
                                Number(cantidadSel) > disponibleSelector
                              }
                            >
                              <Plus size={16} />
                              Agregar a la venta
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {pasoSelector > 1 && (
                    <div className="venta-selector-nav">
                      <button
                        type="button"
                        className="venta-selector-volver"
                        onClick={() => irAPasoSelector(pasoSelector - 1)}
                      >
                        Volver
                      </button>
                    </div>
                  )}
                </div>
              )}

              {errores.selector && (
                <span className="error-text">{errores.selector}</span>
              )}

              {errores.items && (
                <span className="error-text">{errores.items}</span>
              )}

              {formulario.items.length === 0 ? (
                <div className="venta-no-productos venta-registro-empty">
                  <ShoppingBag size={24} />
                  <span>Sin productos. Agrega uno.</span>
                </div>
              ) : (
                <div className="venta-products-list venta-registro-lista">
                  {formulario.items.map((item, index) => (
                    <article
                      className="venta-product-item venta-registro-linea"
                      key={item.id_variante}
                    >
                      <div className="venta-product-thumb">
                        {urlImagen(item.imagen) ? (
                          <img
                            src={urlImagen(item.imagen)}
                            alt={item.nombre}
                            loading="lazy"
                          />
                        ) : (
                          <ShoppingBag size={22} />
                        )}
                      </div>

                      <div className="venta-product-item-content">
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
                    </article>
                  ))}
                </div>
              )}

                </section>

                <aside className="venta-registro-card venta-registro-resumen">
                  <div className="venta-registro-card-title venta-registro-resumen-title">
                    <FileText size={17} />
                    <h4>Resumen de venta</h4>
                  </div>

                  <div className="venta-registro-resumen-rows">
                    <div>
                      <span>Productos en la venta</span>
                      <strong>{totalUnidadesVenta}</strong>
                    </div>

                    <div>
                      <span>Subtotal</span>
                      <strong>{formatearPrecio(totalVenta)}</strong>
                    </div>

                    <div className="venta-registro-resumen-divider" />

                    <div>
                      <span>Descuento</span>
                      <strong>-</strong>
                    </div>

                    <div>
                      <span>Impuestos</span>
                      <strong>-</strong>
                    </div>
                  </div>

                  <div className="venta-registro-total">
                    <span>MONTO TOTAL</span>
                    <strong>{formatearPrecio(totalVenta)}</strong>
                  </div>
                </aside>
              </div>
            </div>

            <div className="venta-modal-footer venta-registro-footer">
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
                disabled={creandoVenta || formulario.items.length === 0}
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
