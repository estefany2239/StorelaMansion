import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shirt
} from "lucide-react";

import "./Productos.css";

import Pagination from "../components/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import useValidacionFormulario from "../../../shared/hooks/useValidacionFormulario";
import { tienePermiso } from "../utils/permisos";

import {
  obtenerProductosAdmin,
  obtenerCatalogosAdmin,
  obtenerProductoAdmin,
  crearProductoCompletoAdmin,
  actualizarProductoCompletoAdmin,
  cambiarEstadoProductoAdmin,
  eliminarProductoAdmin
} from "../../../shared/services/api";

import { urlImagen } from "../../../shared/utils/imagenes";

const REGISTROS_POR_PAGINA = 6;

// Tipos de talla que reconoce el backend (productosAdmin.js):
// numérica si es un número (36, 38.5), letra si es XS, S, M, L, XL o XXL.
const TALLAS_LETRA = ["XS", "S", "M", "L", "XL", "XXL"];

const esTallaNumerica = (valor) => /^\d+(\.\d+)?$/.test(String(valor || "").trim());

const esTallaDeLetra = (valor) =>
  TALLAS_LETRA.includes(String(valor || "").trim().toUpperCase());

// Clave de comparación de nombres: sin espacios sobrantes, mayúsculas ni
// tildes, igual que la validación del backend (productosAdmin.js).
const normalizarNombreProducto = (valor) =>
  String(valor || "")
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

let secuenciaVariante = 0;

const crearVarianteVacia = () => {
  secuenciaVariante += 1;
  return {
    clave: `nueva-${Date.now()}-${secuenciaVariante}`,
    id_variante: null,
    talla: "",
    stock: 0
  };
};

const crearFormularioVacio = () => ({
  idProducto: null,
  nombre: "",
  categoria: "",
  genero: "",
  color: "",
  precio: 0,
  stock: 0,
  idVarianteGeneral: null,
  estado: "Activo",
  imagen: "",
  variantes: []
});

export default function Productos({ user }) {
  // =====================================================
  // PERMISOS (los botones sin permiso se ocultan)
  // =====================================================

  const puedeCrear = tienePermiso(user, "Productos", "Crear");
  const puedeActualizar = tienePermiso(user, "Productos", "Actualizar");
  const puedeEliminar = tienePermiso(user, "Productos", "Eliminar");
  const puedeCambiarEstado = tienePermiso(user, "Productos", "Cambiar estado");
  const puedeConsultar = tienePermiso(user, "Productos", "Consultar");

  // =====================================================
  // PRODUCTOS
  // =====================================================

  const [productos, setProductos] = useState([]);

  // =====================================================
  // CONSTANTES
  // =====================================================

  const STOCK_MINIMO = 3;

  // =====================================================
  // ESTADOS
  // =====================================================

  const [busqueda, setBusqueda] = useState("");

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [mostrarDetalle, setMostrarDetalle] =
    useState(false);

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [productoSeleccionado, setProductoSeleccionado] =
    useState(null);

  const [productoEliminar, setProductoEliminar] =
    useState(null);

  const [confirmarEdicion, setConfirmarEdicion] =
    useState(false);

  const { toast, mostrarToast } = useToast();

  // =====================================================
  // FORMULARIO
  // =====================================================

  const [formulario, setFormulario] = useState(
    crearFormularioVacio
  );

  const [nombreOriginal, setNombreOriginal] = useState("");

  const [variantesEliminar, setVariantesEliminar] = useState([]);

  const [erroresVariantes, setErroresVariantes] = useState({});

  const [errorTallasGeneral, setErrorTallasGeneral] = useState("");

  const [seccionTallasAbierta, setSeccionTallasAbierta] =
    useState(true);

  const [pendienteCategoria, setPendienteCategoria] =
    useState(null);

  const [cargandoProducto, setCargandoProducto] =
    useState(false);

  const [guardando, setGuardando] = useState(false);

  const [errorVistaPreviaImagen, setErrorVistaPreviaImagen] =
    useState(false);

  const REGLAS_PRODUCTO = {
    nombre: (valor) => {
      const nombre = String(valor || "").trim();
      if (!nombre) return "Este campo es obligatorio.";
      if (nombre.length > 150) {
        return "El nombre no puede superar los 150 caracteres.";
      }
      return "";
    },
    categoria: (valor) =>
      valor ? "" : "Selecciona una categoría.",
    color: (valor) =>
      valor ? "" : "Selecciona un color.",
    precio: (valor) => {
      const precio = Number(valor);
      if (!Number.isFinite(precio) || precio < 0) {
        return "El precio no puede ser negativo.";
      }
      return "";
    },
    stock: (valor, formularioActual) => {
      if (
        tipoTallaCategoria(formularioActual?.categoria) !==
        "ninguna"
      ) {
        return "";
      }

      const stock = Number(valor);
      if (!Number.isInteger(stock) || stock < 0) {
        return "El stock no puede ser negativo.";
      }
      return "";
    }
  };

  const {
    errores,
    manejarBlur,
    revisarCampo,
    validarTodo,
    limpiarValidacion
  } = useValidacionFormulario(REGLAS_PRODUCTO);

  // =====================================================
  // OPCIONES
  // =====================================================

  const [categorias, setCategorias] = useState([]);
  const [tallas, setTallas] = useState([]);
  const [colores, setColores] = useState([]);

  // Categorías con un único género permitido (según la base de datos): al
  // elegirlas, el campo género queda fijado a ese valor.
  const generoFijo = (nombreCategoria) => {
    const categoria = categorias.find((c) => c.nombre === nombreCategoria);
    return categoria && categoria.generos.length === 1
      ? categoria.generos[0]
      : "";
  };

  const opcionesGenero = ["hombre", "mujer", "unisex"];

  // Tipo de talla que admite la categoría elegida ('numerica', 'letra',
  // 'ninguna' o '' si todavía no se conoce). Viene de la base de datos
  // (categoria.tipo_talla) a través de GET /catalogos.
  const tipoTallaCategoria = (nombreCategoria) => {
    const categoria = categorias.find((c) => c.nombre === nombreCategoria);
    return (categoria && categoria.tipoTalla) || "";
  };

  // Tallas que el formulario debe ofrecer para la categoría elegida:
  // solo numéricas o solo letras según tipo_talla; sin tipo conocido se
  // muestra la lista completa (compatibilidad).
  const tallasVisibles = tallas.filter((talla) => {
    const tipo = tipoTallaCategoria(formulario.categoria);
    if (!tipo) return true;
    return talla.tipo === tipo;
  });

  const tipoTallaActual = tipoTallaCategoria(
    formulario.categoria
  );

  const totalUnidades =
    tipoTallaActual === "ninguna"
      ? Number(formulario.stock) || 0
      : formulario.variantes.reduce(
          (total, variante) =>
            total + (Number(variante.stock) || 0),
          0
        );

  const recargarProductos = async () => {
    const filas = await obtenerProductosAdmin();
    setProductos(filas);
    return filas;
  };

  // Carga inicial: productos y catálogos para los selects del formulario.
  // opciones.tallas es [{ nombre, tipo }]; el tipo lo deduce el servidor.
  // También se recarga al abrir el módulo después de una venta o anulación:
  // Ventas emite "inventario:actualizado" y el stock se vuelve a pedir.
  useEffect(() => {
    let activo = true;

    const cargarDatos = () => {
      Promise.all([obtenerProductosAdmin(), obtenerCatalogosAdmin()])
        .then(([filas, opciones]) => {
          if (!activo) return;
          setProductos(filas);
          setCategorias(opciones.categorias);
          setTallas(opciones.tallas || []);
          setColores(opciones.colores);
        })
        .catch((error) => {
          if (!activo) return;
          mostrarToast(error.message, "error");
        });
    };

    cargarDatos();
    window.addEventListener("inventario:actualizado", cargarDatos);

    return () => {
      activo = false;
      window.removeEventListener("inventario:actualizado", cargarDatos);
    };
  }, [mostrarToast]);

  // =====================================================
  // PRECIO
  // =====================================================

  const formatearPrecio = (valor) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(valor);
  };

  // =====================================================
  // FILTRAR PRODUCTOS
  // =====================================================

  const productosFiltrados = productos.filter((producto) => {
    const texto = busqueda.toLowerCase().trim();

    const coincideNombre = producto.nombre
      .toLowerCase()
      .includes(texto);

    return coincideNombre;
  });

  // =====================================================
  // PAGINACIÓN DE LA TABLA
  // =====================================================

  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(productosFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const paginaActualVisible = Math.min(
    paginaActual,
    totalPaginas
  );

  const inicio =
    (paginaActualVisible - 1) * REGISTROS_POR_PAGINA;
  const productosPaginados = productosFiltrados.slice(
    inicio,
    inicio + REGISTROS_POR_PAGINA
  );

  // =====================================================
  // ABRIR AGREGAR
  // =====================================================

  const abrirAgregar = () => {
    setFormulario(crearFormularioVacio());
    setNombreOriginal("");
    setVariantesEliminar([]);
    setErroresVariantes({});
    setErrorTallasGeneral("");
    setSeccionTallasAbierta(true);
    setPendienteCategoria(null);
    limpiarValidacion();
    setModoEdicion(false);
    setErrorVistaPreviaImagen(false);
    setMostrarModal(true);
  };

  // =====================================================
  // ABRIR EDITAR
  // =====================================================

  const tipoTallaDeProducto = (categoria, variantes = []) => {
    const tipo = tipoTallaCategoria(categoria);
    if (tipo) return tipo;

    const conTalla = variantes.find(
      (variante) => String(variante.talla || "").trim()
    );

    if (!conTalla) return "ninguna";

    return esTallaNumerica(conTalla.talla)
      ? "numerica"
      : "letra";
  };

  const cargarProductoEnFormulario = (datos) => {
    const variantes = (datos.variantes || []).map(
      (variante, indice) => ({
        clave: variante.id_variante
          ? `existente-${variante.id_variante}`
          : `existente-${indice}-${Date.now()}`,
        id_variante:
          variante.id_variante ?? variante.id ?? null,
        talla: variante.talla || "",
        stock: Number(variante.stock) || 0
      })
    );

    const tipo = tipoTallaDeProducto(
      datos.categoria,
      variantes
    );

    const primeraVariante = variantes[0];

    setFormulario({
      idProducto: datos.id_producto,
      nombre: datos.nombre || "",
      categoria: datos.categoria || "",
      genero:
        datos.genero || generoFijo(datos.categoria) || "",
      color: datos.color || "",
      precio: Number(datos.precio) || 0,
      stock:
        tipo === "ninguna"
          ? Number(primeraVariante?.stock) || 0
          : 0,
      idVarianteGeneral:
        tipo === "ninguna"
          ? primeraVariante?.id_variante ?? null
          : null,
      estado: datos.estado || "Activo",
      imagen: datos.imagen || "",
      variantes: tipo === "ninguna" ? [] : variantes
    });

    setNombreOriginal(datos.nombre || "");
    setVariantesEliminar([]);
    setErroresVariantes({});
    setErrorTallasGeneral("");
    setSeccionTallasAbierta(true);
    setErrorVistaPreviaImagen(false);
  };

  const abrirEditar = async (producto) => {
    if (!producto?.id_producto) {
      mostrarToast("No se pudo cargar el producto", "error");
      return;
    }

    setCargandoProducto(true);

    try {
      const datos = await obtenerProductoAdmin(
        producto.id_producto
      );

      cargarProductoEnFormulario(datos);
      limpiarValidacion();
      setPendienteCategoria(null);
      setModoEdicion(true);
      setMostrarModal(true);
    } catch (error) {
      mostrarToast(error.message, "error");
    } finally {
      setCargandoProducto(false);
    }
  };

  // =====================================================
  // CAMBIAR CAMPO
  // =====================================================

  const registrarVariantesEliminar = (variantes) => {
    const ids = variantes
      .map((variante) => Number(variante.id_variante))
      .filter(
        (id) => Number.isInteger(id) && id > 0
      );

    if (ids.length === 0) return;

    setVariantesEliminar((actuales) => [
      ...new Set([...actuales, ...ids])
    ]);
  };

  const aplicarCambioCategoria = (nuevaCategoria) => {
    const tipoAnterior = tipoTallaCategoria(
      formulario.categoria
    );
    const tipoNuevo = tipoTallaCategoria(nuevaCategoria);

    const siguiente = {
      ...formulario,
      categoria: nuevaCategoria,
      genero: generoFijo(nuevaCategoria)
    };

    if (!tipoNuevo) {
      registrarVariantesEliminar(formulario.variantes);
      siguiente.variantes = [];
      siguiente.stock = 0;
      siguiente.idVarianteGeneral = null;
    } else if (tipoNuevo === "ninguna") {
      if (tipoAnterior !== "ninguna") {
        const [primeraVariante, ...resto] =
          formulario.variantes;

        registrarVariantesEliminar(resto);

        siguiente.variantes = [];
        siguiente.stock =
          Number(primeraVariante?.stock) || 0;
        siguiente.idVarianteGeneral =
          primeraVariante?.id_variante ?? null;
      }
    } else if (tipoAnterior === "ninguna") {
      const idGeneral = formulario.idVarianteGeneral;

      siguiente.stock = 0;
      siguiente.idVarianteGeneral = null;
      siguiente.variantes = idGeneral
        ? [
            {
              clave: `existente-${idGeneral}`,
              id_variante: idGeneral,
              talla: "",
              stock: Number(formulario.stock) || 0
            }
          ]
        : [];
    } else if (tipoAnterior && tipoAnterior !== tipoNuevo) {
      registrarVariantesEliminar(formulario.variantes);
      siguiente.variantes = [];
    }

    setFormulario(siguiente);
    setErroresVariantes({});
    setErrorTallasGeneral("");
    setSeccionTallasAbierta(true);
    revisarCampo("categoria", nuevaCategoria, siguiente);
    revisarCampo("stock", siguiente.stock, siguiente);
  };

  const cambiarCampo = (campo, valor) => {
    if (campo === "categoria") {
      if (valor === formulario.categoria) return;

      const hayDatos =
        modoEdicion ||
        formulario.variantes.some(
          (variante) =>
            Boolean(variante.talla) ||
            Number(variante.stock) > 0
        ) ||
        Number(formulario.stock) > 0;

      if (formulario.categoria && hayDatos) {
        setPendienteCategoria(valor);
        return;
      }

      aplicarCambioCategoria(valor);
      return;
    }

    const siguiente = { ...formulario, [campo]: valor };

    setFormulario(siguiente);
    if (campo === "imagen") setErrorVistaPreviaImagen(false);
    revisarCampo(campo, valor, siguiente);
  };

  const agregarTalla = () => {
    const disponible = tallasVisibles.some(
      (talla) =>
        !formulario.variantes.some(
          (variante) => variante.talla === talla.nombre
        )
    );

    if (!disponible) {
      mostrarToast(
        "Ya agregaste todas las tallas disponibles",
        "error"
      );
      return;
    }

    setFormulario((actual) => ({
      ...actual,
      variantes: [
        ...actual.variantes,
        crearVarianteVacia()
      ]
    }));
    setSeccionTallasAbierta(true);
  };

  const cambiarVariante = (clave, campo, valor) => {
    const valorLimpio =
      campo === "stock"
        ? Math.max(
            0,
            Number(
              String(valor).replace(/[^0-9]/g, "")
            )
          )
        : valor;

    setFormulario((actual) => ({
      ...actual,
      variantes: actual.variantes.map((variante) =>
        variante.clave === clave
          ? { ...variante, [campo]: valorLimpio }
          : variante
      )
    }));

    setErroresVariantes((actuales) => {
      if (!actuales[clave]) return actuales;

      const siguientes = {
        ...actuales,
        [clave]: {
          ...actuales[clave],
          [campo]: ""
        }
      };

      if (
        !siguientes[clave].talla &&
        !siguientes[clave].stock
      ) {
        delete siguientes[clave];
      }

      return siguientes;
    });

    setErrorTallasGeneral("");
  };

  const eliminarVariante = (variante) => {
    if (variante.id_variante && !puedeEliminar) {
      mostrarToast(
        "No tienes permiso para eliminar tallas existentes",
        "error"
      );
      return;
    }

    if (variante.id_variante) {
      registrarVariantesEliminar([variante]);
    }

    setFormulario((actual) => ({
      ...actual,
      variantes: actual.variantes.filter(
        (item) => item.clave !== variante.clave
      )
    }));

    setErroresVariantes((actuales) => {
      const siguientes = { ...actuales };
      delete siguientes[variante.clave];
      return siguientes;
    });
    setErrorTallasGeneral("");
  };

  // =====================================================
  // VALIDAR VARIANTES
  // =====================================================

  const validarVariantes = () => {
    if (tipoTallaActual === "ninguna") {
      setErroresVariantes({});
      setErrorTallasGeneral("");
      return true;
    }

    if (formulario.variantes.length === 0) {
      setErroresVariantes({});
      setErrorTallasGeneral("Agrega al menos una talla.");
      return false;
    }

    const nuevosErrores = {};
    const tallasVistas = new Set();

    formulario.variantes.forEach((variante) => {
      const talla = String(variante.talla || "").trim();
      let errorTalla = "";

      if (!talla) {
        errorTalla = "Selecciona una talla.";
      } else if (tallasVistas.has(talla)) {
        errorTalla = "Esta talla ya está agregada.";
      } else if (
        tipoTallaActual === "numerica" &&
        !esTallaNumerica(talla)
      ) {
        errorTalla =
          "Esta categoría usa tallas numéricas (por ejemplo 36 o 38.5).";
      } else if (
        tipoTallaActual === "letra" &&
        !esTallaDeLetra(talla)
      ) {
        errorTalla =
          "Esta categoría usa tallas de letra (XS, S, M, L, XL o XXL).";
      }

      if (talla) tallasVistas.add(talla);

      const stock = Number(variante.stock);
      const errorStock =
        Number.isInteger(stock) && stock >= 0
          ? ""
          : "El stock no puede ser negativo.";

      if (errorTalla || errorStock) {
        nuevosErrores[variante.clave] = {
          talla: errorTalla,
          stock: errorStock
        };
      }
    });

    setErrorTallasGeneral("");
    setErroresVariantes(nuevosErrores);

    const primerError = formulario.variantes.find(
      (variante) => nuevosErrores[variante.clave]
    );

    if (primerError) {
      const error = nuevosErrores[primerError.clave];
      const campo = error.talla ? "talla" : "stock";

      window.setTimeout(() => {
        const elemento = document.getElementById(
          `campo-variante-${primerError.clave}-${campo}`
        );

        if (elemento) {
          elemento.scrollIntoView({
            block: "center",
            behavior: "smooth"
          });
          elemento.focus({ preventScroll: true });
        }
      }, 60);

      return false;
    }

    return true;
  };

  // =====================================================
  // GUARDAR PRODUCTO
  // =====================================================

  // true si otro producto de la lista ya usa el mismo nombre normalizado.
  // En edición se excluye el producto actual (mismo id_producto).
  const existeProductoConNombre = (nombre, idProductoExcluir = null) => {
    const clave = normalizarNombreProducto(nombre);
    if (!clave) return false;

    return productos.some(
      (producto) =>
        producto.id_producto !== idProductoExcluir &&
        normalizarNombreProducto(producto.nombre) === clave
    );
  };

  const construirPayload = () => {
    const datos = {
      nombre: formulario.nombre.trim(),
      categoria: formulario.categoria,
      genero: formulario.genero,
      color: formulario.color,
      precio: Number(formulario.precio),
      estado: formulario.estado,
      imagen: formulario.imagen.trim()
    };

    if (tipoTallaActual === "ninguna") {
      return {
        ...datos,
        variantes: [
          {
            ...(formulario.idVarianteGeneral
              ? {
                  id_variante:
                    formulario.idVarianteGeneral
                }
              : {}),
            stock: Number(formulario.stock)
          }
        ]
      };
    }

    return {
      ...datos,
      variantes: formulario.variantes.map((variante) => ({
        ...(variante.id_variante
          ? { id_variante: variante.id_variante }
          : {}),
        talla: variante.talla,
        stock: Number(variante.stock)
      }))
    };
  };

  const ejecutarGuardado = async () => {
    setGuardando(true);

    try {
      if (modoEdicion) {
        await actualizarProductoCompletoAdmin(
          formulario.idProducto,
          construirPayload()
        );

        const fallos = [];

        for (const idVariante of variantesEliminar) {
          try {
            await eliminarProductoAdmin(idVariante);
          } catch (error) {
            fallos.push(error);
          }
        }

        await recargarProductos();

        if (fallos.length > 0) {
          const error =
            fallos.find(
              (item) => item.status === 409
            ) || fallos[0];

          mostrarToast(
            error.message ||
              "No se pudieron eliminar algunas tallas",
            "error"
          );

          try {
            const datos = await obtenerProductoAdmin(
              formulario.idProducto
            );
            cargarProductoEnFormulario(datos);
          } catch {
            cerrarModal();
          }

          return;
        }

        mostrarToast("Producto actualizado con éxito");
      } else {
        await crearProductoCompletoAdmin(
          construirPayload()
        );
        await recargarProductos();
        setBusqueda("");
        setPaginaActual(1);
        mostrarToast("Producto creado con éxito");
      }

      cerrarModal();
    } catch (error) {
      mostrarToast(error.message, "error");
    } finally {
      setGuardando(false);
    }
  };

  const guardarProducto = async () => {
    if (!validarTodo(formulario)) {
      return;
    }

    if (!validarVariantes()) {
      return;
    }

    const cambioNombre =
      !modoEdicion ||
      normalizarNombreProducto(formulario.nombre) !==
        normalizarNombreProducto(nombreOriginal);

    if (
      cambioNombre &&
      existeProductoConNombre(
        formulario.nombre,
        modoEdicion ? formulario.idProducto : null
      )
    ) {
      mostrarToast("Ese producto ya existe", "error");
      return;
    }

    if (modoEdicion) {
      setConfirmarEdicion(true);
      return;
    }

    await ejecutarGuardado();
  };

  const confirmarEdicionProducto = async () => {
    setConfirmarEdicion(false);
    await ejecutarGuardado();
  };

  // =====================================================
  // CAMBIAR ESTADO
  // =====================================================

  const cambiarEstado = async (producto) => {
    const nuevoEstado =
      producto.estado === "Activo"
        ? "Inactivo"
        : "Activo";

    try {
      const fila = await cambiarEstadoProductoAdmin(
        producto.id,
        nuevoEstado
      );

      setProductos((actuales) =>
        actuales.map((item) =>
          item.id === fila.id ? fila : item
        )
      );

      // Si el detalle del producto está abierto,
      // también actualizamos el producto seleccionado.
      setProductoSeleccionado((actual) =>
        actual && actual.id === fila.id ? fila : actual
      );
    } catch (error) {
      mostrarToast(error.message, "error");
    }
  };

  // =====================================================
  // ELIMINAR PRODUCTO
  // =====================================================

  const eliminarProducto = (producto) => {
    setProductoEliminar(producto);
  };

  const confirmarEliminarProducto = async () => {
    try {
      await eliminarProductoAdmin(productoEliminar.id);

      setProductos((actuales) =>
        actuales.filter(
          (item) => item.id !== productoEliminar.id
        )
      );

      setProductoSeleccionado((actual) =>
        actual && actual.id === productoEliminar.id
          ? null
          : actual
      );

      setProductoEliminar(null);
      mostrarToast("Producto eliminado con éxito");
    } catch (error) {
      setProductoEliminar(null);
      mostrarToast(error.message, "error");
    }
  };

  // =====================================================
  // VER DETALLE
  // =====================================================

  const verDetalle = (producto) => {
    setProductoSeleccionado(producto);
    setMostrarDetalle(true);
  };

  // =====================================================
  // CERRAR MODAL
  // =====================================================

  const cerrarModal = () => {
    setMostrarModal(false);
    setModoEdicion(false);
    setVariantesEliminar([]);
    setErroresVariantes({});
    setErrorTallasGeneral("");
    setPendienteCategoria(null);
    setConfirmarEdicion(false);
  };

  // =====================================================
  // CERRAR DETALLE
  // =====================================================

  const cerrarDetalle = () => {
    setMostrarDetalle(false);
    setProductoSeleccionado(null);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="productos-page">

      {/* =================================================
          ENCABEZADO
      ================================================= */}

      <div className="productos-header">

        <div className="productos-title">
          <h2>Productos</h2>

          <p>
            Gestiona el inventario y la información
            de los productos de la tienda.
          </p>
        </div>

        <div className="productos-actions">

          {/* BUSCADOR */}

          {puedeConsultar && (
            <div className="productos-search">
              <Search size={18} />

              <input
                type="text"
                placeholder="Buscar productos..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPaginaActual(1);
                }}
              />
            </div>
          )}

          {/* AGREGAR */}

          {puedeCrear && (
            <button
              type="button"
              className="productos-add-button"
              onClick={abrirAgregar}
            >
              <Plus size={18} />
              Registrar producto
            </button>
          )}

        </div>
      </div>

      {/* =================================================
          ALERTA DE STOCK
      ================================================= */}

      {productos.some(
        (producto) =>
          producto.stock <= STOCK_MINIMO &&
          producto.estado === "Activo"
      ) && (
        <div className="productos-stock-alert">
          <AlertTriangle size={18} />

          <span>
            Hay productos con stock mínimo
            o por agotarse.
          </span>
        </div>
      )}

      {/* =================================================
          TABLA
      ================================================= */}

      <div className="productos-table-container">

        <table className="productos-table">

          <thead>
            <tr>
              <th>IMAGEN</th>
              <th>CÓDIGO</th>
              <th>NOMBRE</th>
              <th>PRECIO</th>
              <th>STOCK</th>
              <th>ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>

          <tbody>

            {productosPaginados.map((producto) => (
              <tr key={producto.id}>

                <td>
                  {urlImagen(producto.imagen) ? (
                    <img
                      className="producto-image"
                      src={urlImagen(producto.imagen)}
                      alt={producto.nombre}
                      loading="lazy"
                    />
                  ) : (
                    <div className="producto-image producto-image-empty"></div>
                  )}
                </td>

                <td>
                  <strong className="producto-id">
                    {producto.codigo || "—"}
                  </strong>
                </td>

                <td>
                  <span className="producto-nombre">
                    {producto.nombre}
                  </span>
                </td>

                <td>
                  <span className="producto-price">
                    {formatearPrecio(producto.precio)}
                  </span>
                </td>

                <td>
                  <span
                    className={
                      producto.stock <= STOCK_MINIMO
                        ? "producto-stock low"
                        : "producto-stock"
                    }
                  >
                    {producto.stock}
                  </span>
                </td>

                {/* =================================================
                    ESTADO — TOGGLE ACTIVO / INACTIVO
                ================================================= */}

                <td>
                  <div className="producto-estado-control">

                    {puedeCambiarEstado && (
                      <button
                        type="button"
                        className={
                          producto.estado === "Activo"
                            ? "estado-toggle activo"
                            : "estado-toggle inactivo"
                        }
                        onClick={() =>
                          cambiarEstado(producto)
                        }
                        title={
                          producto.estado === "Activo"
                            ? "Desactivar producto"
                            : "Activar producto"
                        }
                        aria-label={
                          producto.estado === "Activo"
                            ? "Desactivar producto"
                            : "Activar producto"
                        }
                      >
                        <span className="estado-toggle-circle"></span>
                      </button>
                    )}

                    <span
                      className={
                        producto.estado === "Activo"
                          ? "estado-label activo"
                          : "estado-label inactivo"
                      }
                    >
                      {producto.estado.toUpperCase()}
                    </span>

                  </div>
                </td>

                {/* ACCIONES */}

                <td>
                  <div className="producto-actions">

                    {puedeConsultar && (
                      <button
                        type="button"
                        title="Ver producto"
                        onClick={() =>
                          verDetalle(producto)
                        }
                      >
                        <Eye size={18} />
                      </button>
                    )}

                    {puedeActualizar && (
                      <button
                        type="button"
                        title="Actualizar producto"
                        disabled={cargandoProducto}
                        onClick={() =>
                          abrirEditar(producto)
                        }
                      >
                        <Pencil size={18} />
                      </button>
                    )}

                    {puedeEliminar && (
                      <button
                        type="button"
                        title="Eliminar producto"
                        onClick={() =>
                          eliminarProducto(producto)
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    )}

                  </div>
                </td>

              </tr>
            ))}

            {productosFiltrados.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="productos-empty"
                >
                  Producto no encontrado en el sistema.
                </td>
              </tr>
            )}

          </tbody>

        </table>

        <Pagination
          currentPage={paginaActualVisible}
          totalPages={totalPaginas}
          onPageChange={setPaginaActual}
        />

      </div>

      {/* =================================================
          MODAL AGREGAR / EDITAR
      ================================================= */}

      {mostrarModal && (
        <div className="producto-modal-overlay">

          <div className="producto-modal producto-modal-form">

            <div className="producto-modal-header">

              <h3>
                {modoEdicion
                  ? "Editar Producto"
                  : "Registrar Producto"}
              </h3>

              <button
                type="button"
                className="producto-modal-close"
                onClick={cerrarModal}
                disabled={guardando}
              >
                <X size={21} />
              </button>

            </div>

            <div className="producto-modal-body">

              <div className="producto-form-group producto-estado-group">

                <label>ESTADO</label>

                <div className="producto-estado-select-wrap">

                  <span
                    className={
                      formulario.estado === "Activo"
                        ? "producto-estado-dot activo"
                        : "producto-estado-dot inactivo"
                    }
                  />

                  <select
                    value={formulario.estado}
                    disabled={guardando}
                    onChange={(e) =>
                      cambiarCampo(
                        "estado",
                        e.target.value
                      )
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

              <div className="producto-form-group">

                <label>
                  NOMBRE DEL PRODUCTO
                </label>

                <input
                  type="text"
                  id="campo-nombre"
                  placeholder="Nombre del producto"
                  maxLength={150}
                  value={formulario.nombre}
                  disabled={guardando}
                  className={`input ${errores.nombre ? "input-error" : ""}`}
                  onChange={(e) =>
                    cambiarCampo(
                      "nombre",
                      e.target.value.replace(
                        /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s0-9]/g,
                        ""
                      )
                    )
                  }
                  onBlur={() =>
                    manejarBlur(
                      "nombre",
                      formulario.nombre,
                      formulario
                    )
                  }
                />

                {errores.nombre && (
                  <span className="error-text">
                    {errores.nombre}
                  </span>
                )}

              </div>

              <div className="producto-form-row">

                <div className="producto-form-group">

                  <label>CATEGORÍA</label>

                  <select
                    id="campo-categoria"
                    value={formulario.categoria}
                    disabled={guardando}
                    className={`input ${errores.categoria ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "categoria",
                        e.target.value
                      )
                    }
                    onBlur={() =>
                      manejarBlur(
                        "categoria",
                        formulario.categoria,
                        formulario
                      )
                    }
                  >
                    <option value="">
                      Seleccionar categoría
                    </option>

                    {categorias.map((categoria) => (
                      <option
                        key={categoria.id}
                        value={categoria.nombre}
                      >
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>

                  {errores.categoria && (
                    <span className="error-text">
                      {errores.categoria}
                    </span>
                  )}

                </div>

                <div className="producto-form-group">

                  <label>GÉNERO</label>

                  <select
                    value={formulario.genero}
                    disabled={
                      guardando ||
                      Boolean(
                        generoFijo(formulario.categoria)
                      )
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "genero",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Seleccionar género
                    </option>

                    {opcionesGenero
                      .filter(
                        (genero) =>
                          !generoFijo(
                            formulario.categoria
                          ) ||
                          genero ===
                            generoFijo(
                              formulario.categoria
                            )
                      )
                      .map((genero) => (
                        <option
                          key={genero}
                          value={genero}
                        >
                          {genero.charAt(0).toUpperCase() +
                            genero.slice(1)}
                        </option>
                      ))}
                  </select>

                </div>

              </div>

              <div className="producto-form-row">

                <div className="producto-form-group">

                  <label>COLOR</label>

                  <select
                    id="campo-color"
                    value={formulario.color}
                    disabled={guardando}
                    className={`input ${errores.color ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "color",
                        e.target.value
                      )
                    }
                    onBlur={() =>
                      manejarBlur(
                        "color",
                        formulario.color,
                        formulario
                      )
                    }
                  >
                    <option value="">
                      Seleccionar color
                    </option>

                    {colores.map((color) => (
                      <option
                        key={color}
                        value={color}
                      >
                        {color}
                      </option>
                    ))}
                  </select>

                  {errores.color && (
                    <span className="error-text">
                      {errores.color}
                    </span>
                  )}

                </div>

                <div className="producto-form-group">

                  <label>
                    PRECIO DE VENTA (COP)
                  </label>

                  <input
                    type="number"
                    id="campo-precio"
                    min="0"
                    value={formulario.precio}
                    disabled={guardando}
                    className={`input ${errores.precio ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "precio",
                        e.target.value
                          .replace(/[^0-9.]/g, "")
                          .replace(
                            /(\..*)\./g,
                            "$1"
                          )
                      )
                    }
                    onBlur={() =>
                      manejarBlur(
                        "precio",
                        formulario.precio,
                        formulario
                      )
                    }
                  />

                  {errores.precio && (
                    <span className="error-text">
                      {errores.precio}
                    </span>
                  )}

                </div>

              </div>

              <div className="producto-form-group producto-imagen-group">

                <label>IMAGEN</label>

                <div className="producto-imagen-dropzone">

                  <span className="producto-imagen-titulo">
                    Copia aquí el enlace de la imagen
                  </span>

                  <span className="producto-imagen-ayuda">
                    Pega la dirección de una imagen (.jpg, .png o .webp) o el
                    nombre exacto del archivo guardado en src/assets/img, por
                    ejemplo camiseta-blanca.jpg. Abajo verás la vista previa.
                  </span>

                  <input
                    type="text"
                    className="producto-imagen-input"
                    placeholder="https://..."
                    title="Enlace de la imagen o nombre del archivo en src/assets/img"
                    aria-label="Enlace o nombre del archivo de la imagen"
                    value={formulario.imagen}
                    disabled={guardando}
                    onChange={(e) =>
                      cambiarCampo(
                        "imagen",
                        e.target.value
                      )
                    }
                  />

                </div>

                {urlImagen(formulario.imagen) && (
                  <img
                    className="producto-imagen-preview"
                    src={urlImagen(
                      formulario.imagen
                    )}
                    alt="Vista previa de la imagen"
                    onLoad={() =>
                      setErrorVistaPreviaImagen(false)
                    }
                    onError={() =>
                      setErrorVistaPreviaImagen(true)
                    }
                  />
                )}

                {errorVistaPreviaImagen && (
                  <span className="producto-imagen-error">
                    No se pudo cargar la imagen. Revisa el enlace o el nombre.
                  </span>
                )}

              </div>

              {tipoTallaActual === "ninguna" ? (
                <div className="producto-stock-general">

                  <div className="producto-form-group producto-stock-group">

                    <label>STOCK</label>

                    <input
                      type="number"
                      id="campo-stock"
                      min="0"
                      inputMode="numeric"
                      placeholder="Stock"
                      value={formulario.stock}
                      disabled={guardando}
                      className={`input ${errores.stock ? "input-error" : ""}`}
                      onChange={(e) => {
                        const soloDigitos =
                          e.target.value.replace(
                            /[^0-9]/g,
                            ""
                          );

                        cambiarCampo(
                          "stock",
                          Math.max(
                            0,
                            Number(soloDigitos)
                          )
                        );
                      }}
                      onBlur={() =>
                        manejarBlur(
                          "stock",
                          formulario.stock,
                          formulario
                        )
                      }
                    />

                    {errores.stock && (
                      <span className="error-text">
                        {errores.stock}
                      </span>
                    )}

                  </div>

                  <span className="producto-stock-total">

                    Total:{" "}
                    <strong>
                      {totalUnidades}{" "}
                      {totalUnidades === 1
                        ? "unidad"
                        : "unidades"}
                    </strong>

                  </span>

                </div>
              ) : tipoTallaActual ? (
                <div className="producto-tallas-card">

                  <button
                    type="button"
                    className="producto-tallas-toggle"
                    onClick={() =>
                      setSeccionTallasAbierta(
                        (abierta) => !abierta
                      )
                    }
                  >

                    <span className="producto-tallas-icon">
                      <Shirt size={20} />
                    </span>

                    <span className="producto-tallas-heading">

                      <strong>
                        Tallas y stock
                      </strong>

                    </span>

                    <span className="producto-tallas-chevron">
                      {seccionTallasAbierta ? (
                        <ChevronUp size={19} />
                      ) : (
                        <ChevronDown size={19} />
                      )}
                    </span>

                  </button>

                  {seccionTallasAbierta && (
                    <div className="producto-tallas-content">

                      {formulario.variantes.map(
                        (variante) => {

                          const errorVariante =
                            erroresVariantes[
                              variante.clave
                            ] || {};

                          return (
                            <div
                              className="producto-talla-row"
                              key={variante.clave}
                            >

                              <div className="producto-talla-control producto-talla-select-control">

                                <select
                                  id={`campo-variante-${variante.clave}-talla`}
                                  aria-label="Talla"
                                  value={variante.talla}
                                  disabled={guardando}
                                  className={`input ${errorVariante.talla ? "input-error" : ""}`}
                                  onChange={(e) =>
                                    cambiarVariante(
                                      variante.clave,
                                      "talla",
                                      e.target.value
                                    )
                                  }
                                >

                                  <option value="">
                                    Talla
                                  </option>

                                  {tallasVisibles
                                    .filter(
                                      (talla) =>
                                        talla.nombre ===
                                          variante.talla ||
                                        !formulario.variantes.some(
                                          (otra) =>
                                            otra.clave !==
                                              variante.clave &&
                                            otra.talla ===
                                              talla.nombre
                                        )
                                    )
                                    .map((talla) => (
                                      <option
                                        key={talla.nombre}
                                        value={talla.nombre}
                                      >
                                        {talla.nombre}
                                      </option>
                                    ))}

                                </select>

                                {errorVariante.talla && (
                                  <span className="error-text">
                                    {errorVariante.talla}
                                  </span>
                                )}

                              </div>

                              <div className="producto-talla-control producto-talla-stock-control">

                                <input
                                  type="number"
                                  id={`campo-variante-${variante.clave}-stock`}
                                  aria-label="Stock de la talla"
                                  min="0"
                                  inputMode="numeric"
                                  placeholder="Stock"
                                  value={variante.stock}
                                  disabled={guardando}
                                  className={`input ${errorVariante.stock ? "input-error" : ""}`}
                                  onChange={(e) =>
                                    cambiarVariante(
                                      variante.clave,
                                      "stock",
                                      e.target.value
                                    )
                                  }
                                />

                                {errorVariante.stock && (
                                  <span className="error-text">
                                    {errorVariante.stock}
                                  </span>
                                )}

                              </div>

                              {(!variante.id_variante ||
                                puedeEliminar) && (
                                <button
                                  type="button"
                                  className="producto-talla-delete"
                                  title="Eliminar talla"
                                  aria-label="Eliminar talla"
                                  disabled={guardando}
                                  onClick={() =>
                                    eliminarVariante(
                                      variante
                                    )
                                  }
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}

                            </div>
                          );
                        }
                      )}

                      {formulario.variantes.length === 0 && (
                        <p className="producto-tallas-empty">
                          Agrega al menos una talla para
                          continuar.
                        </p>
                      )}

                      {errorTallasGeneral && (
                        <span className="error-text">
                          {errorTallasGeneral}
                        </span>
                      )}

                      <div className="producto-tallas-footer">

                        <button
                          type="button"
                          className="producto-add-talla"
                          disabled={
                            guardando ||
                            tallasVisibles.every(
                              (talla) =>
                                formulario.variantes.some(
                                  (variante) =>
                                    variante.talla ===
                                    talla.nombre
                                )
                            )
                          }
                          onClick={agregarTalla}
                        >

                          <Plus size={16} />

                          Agregar talla

                        </button>

                        <span className="producto-tallas-total">
                          Total:{" "}
                          <strong>
                            {totalUnidades}{" "}
                            {totalUnidades === 1
                              ? "unidad"
                              : "unidades"}
                          </strong>
                        </span>

                      </div>

                    </div>
                  )}

                </div>
              ) : (
                <div className="producto-tallas-hint">
                  Selecciona una categoría para configurar
                  las tallas y el stock.
                </div>
              )}

            </div>

            <div className="producto-modal-footer">

              <button
                type="button"
                className="producto-cancel-button"
                onClick={cerrarModal}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="producto-create-button"
                onClick={guardarProducto}
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : modoEdicion
                    ? "Guardar cambios"
                    : "Crear producto"}
              </button>

            </div>

          </div>

        </div>
      )}

      <ConfirmDialog
        abierto={pendienteCategoria !== null}
        titulo="Cambiar categoría"
        mensaje="Al cambiar la categoría se ajustarán las tallas y el stock que ya no apliquen. ¿Deseas continuar?"
        textoConfirmar="Cambiar categoría"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={() => {
          aplicarCambioCategoria(pendienteCategoria);
          setPendienteCategoria(null);
        }}
        onCancelar={() => setPendienteCategoria(null)}
      />

      {/* =================================================
          MODAL DETALLE
      ================================================= */}

      {mostrarDetalle &&
        productoSeleccionado && (
          <div className="producto-modal-overlay">

            <div className="producto-modal">

              <div className="producto-modal-header">

                <h3>
                  Detalle del Producto
                </h3>

                <button
                  type="button"
                  className="producto-modal-close"
                  onClick={cerrarDetalle}
                >
                  <X size={21} />
                </button>

              </div>

              <div className="producto-modal-body">

                <div className="producto-detail-top">

                  <img
                    src={
                      urlImagen(
                        productoSeleccionado.imagen
                      )
                    }
                    alt={
                      productoSeleccionado.nombre
                    }
                  />

                  <div>

                    <strong>
                      {productoSeleccionado.nombre}
                    </strong>

                    <span>
                      {productoSeleccionado.codigo || "—"}
                    </span>

                  </div>

                </div>

                <div className="producto-form-row">

                  <div className="producto-info-group">

                    <label>CATEGORÍA</label>

                    <div className="producto-info-value">
                      {productoSeleccionado.categoria}
                    </div>

                  </div>

                  <div className="producto-info-group">

                    <label>GÉNERO</label>

                    <div className="producto-info-value">
                      {productoSeleccionado.genero ||
                        generoFijo(productoSeleccionado.categoria) ||
                        "—"}
                    </div>

                  </div>

                </div>

                <div className="producto-form-row">

                  <div className="producto-info-group">

                    <label>TALLA</label>

                    <div className="producto-info-value">
                      {productoSeleccionado.talla}
                    </div>

                  </div>

                  <div className="producto-info-group">

                    <label>COLOR</label>

                    <div className="producto-info-value">
                      {productoSeleccionado.color}
                    </div>

                  </div>

                </div>

                <div className="producto-form-row">

                  <div className="producto-info-group">

                    <label>
                      PRECIO DE VENTA
                    </label>

                    <div className="producto-info-value">
                      {formatearPrecio(
                        productoSeleccionado.precio
                      )}
                    </div>

                  </div>

                  <div className="producto-info-group">

                    <label>
                      STOCK DISPONIBLE
                    </label>

                    <div className="producto-info-value">

                      {productoSeleccionado.stock}

                      {productoSeleccionado.stock <=
                        STOCK_MINIMO && (
                        <span className="producto-detail-warning">
                          Stock mínimo
                        </span>
                      )}

                    </div>

                  </div>

                </div>

                {/* ESTADO EN DETALLE */}

                <div className="producto-info-group">

                  <label>ESTADO</label>

                  <div className="producto-info-value">

                    <div className="producto-estado-control">

                      {puedeCambiarEstado && (
                        <button
                          type="button"
                          className={
                            productoSeleccionado.estado ===
                            "Activo"
                              ? "estado-toggle activo"
                              : "estado-toggle inactivo"
                          }
                          onClick={() => {
                            cambiarEstado(
                              productoSeleccionado
                            );
                          }}
                          title="Cambiar estado"
                        >
                          <span className="estado-toggle-circle"></span>
                        </button>
                      )}

                      <span
                        className={
                          productoSeleccionado.estado ===
                          "Activo"
                            ? "estado-label activo"
                            : "estado-label inactivo"
                        }
                      >
                        {productoSeleccionado.estado.toUpperCase()}
                      </span>

                    </div>

                  </div>

                </div>

              </div>

              <div className="producto-modal-footer">

                <button
                  type="button"
                  className="producto-cancel-button detail-cerrar-button"
                  onClick={cerrarDetalle}
                >
                  Cerrar
                </button>

              </div>

            </div>

          </div>
        )}

        {productoEliminar && (
          <ConfirmDialog
            abierto={productoEliminar !== null}
            titulo="Eliminar producto"
            mensaje={
              <>¿Deseas eliminar el producto "
                <strong>{productoEliminar.nombre}</strong>"?
                Esta acción no se puede deshacer.</>
            }
            textoConfirmar="Eliminar"
            textoCancelar="Cancelar"
            variante="peligro"
            onConfirmar={confirmarEliminarProducto}
            onCancelar={() =>
              setProductoEliminar(null)
            }
          />
        )}

        <Toast toast={toast} />

        <ConfirmDialog
          abierto={confirmarEdicion}
          titulo="Confirmar cambios"
          mensaje={
            <>¿Deseas guardar los cambios realizados en el producto "
              <strong>{formulario.nombre.trim()}</strong>"?</>
          }
          textoConfirmar="Guardar cambios"
          textoCancelar="Cancelar"
          variante="info"
          onConfirmar={confirmarEdicionProducto}
          onCancelar={() => setConfirmarEdicion(false)}
        />

    </div>
  );
}