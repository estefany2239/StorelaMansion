import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  AlertTriangle
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
  crearProductoAdmin,
  actualizarProductoAdmin,
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

  const [formulario, setFormulario] = useState({
    id: "",
    nombre: "",
    categoria: "",
    genero: "",
    talla: "",
    color: "",
    precio: 0,
    stock: 0,
    estado: "Activo",
    imagen: ""
  });

  // Reglas alineadas con leerCuerpo()/resolverIds() del backend
  // (productosAdmin.js): nombre obligatorio (máx. 150), categoría y color
  // obligatorios, precio no negativo y stock entero no negativo. La talla es
  // obligatoria salvo en categorías de tipo "ninguna" (gorras, perfumes y
  // relojes) y su tipo debe corresponder a la categoría.
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
    talla: (valor, formularioActual) => {
      const tipo = tipoTallaCategoria(formularioActual?.categoria);
      if (tipo === "ninguna") return "";
      if (!valor) return "Selecciona una talla.";
      if (tipo === "numerica" && !esTallaNumerica(valor)) {
        return "Esta categoría usa tallas numéricas (por ejemplo 36 o 38.5).";
      }
      if (tipo === "letra" && !esTallaDeLetra(valor)) {
        return "Esta categoría usa tallas de letra (XS, S, M, L, XL o XXL).";
      }
      return "";
    },
    color: (valor) =>
      valor ? "" : "Selecciona un color.",
    precio: (valor) => {
      const precio = Number(valor);
      if (!Number.isFinite(precio) || precio < 0) {
        return "El precio no puede ser negativo.";
      }
      return "";
    },
    stock: (valor) => {
      const stock = Number(valor);
      if (!Number.isInteger(stock) || stock < 0) {
        return "El stock no puede ser negativo.";
      }
      return "";
    }
  };

  const {
    errores,
    tocados,
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
  }, []);

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

  const inicio =
    (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const productosPaginados = productosFiltrados.slice(
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

  // =====================================================
  // ABRIR AGREGAR
  // =====================================================

  const abrirAgregar = () => {
    setFormulario({
      id: "",
      nombre: "",
      categoria: "",
      genero: "",
      talla: "",
      color: "",
      precio: 0,
      stock: 0,
      estado: "Activo",
      imagen: ""
    });

    limpiarValidacion();
    setModoEdicion(false);
    setMostrarModal(true);
  };

  // =====================================================
  // ABRIR EDITAR
  // =====================================================

  const abrirEditar = (producto) => {
    setFormulario({
      id: producto.id,
      nombre: producto.nombre,
      categoria: producto.categoria,
      genero:
        producto.genero || generoFijo(producto.categoria) || "",
      talla: producto.talla || "",
      color: producto.color,
      precio: producto.precio,
      stock: producto.stock,
      estado: producto.estado,
      imagen: producto.imagen
    });

    limpiarValidacion();
    setModoEdicion(true);
    setMostrarModal(true);
  };

  // =====================================================
  // CAMBIAR CAMPO
  // =====================================================

  const cambiarCampo = (campo, valor) => {
    const siguiente = { ...formulario, [campo]: valor };

    if (campo === "categoria") {
      siguiente.genero = generoFijo(valor);

      // La talla se filtra por tipo: si la nueva categoría no admite la
      // talla elegida (o no lleva talla), se limpia el campo.
      const tipo = tipoTallaCategoria(valor);
      const tallaActual = String(siguiente.talla || "").trim();

      if (tipo === "ninguna") {
        siguiente.talla = "";
      } else if (
        tallaActual &&
        tipo === "numerica" &&
        !esTallaNumerica(tallaActual)
      ) {
        siguiente.talla = "";
      } else if (
        tallaActual &&
        tipo === "letra" &&
        !esTallaDeLetra(tallaActual)
      ) {
        siguiente.talla = "";
      }
    }

    setFormulario(siguiente);

    // Si el campo ya fue tocado, su error se recalcula al instante.
    revisarCampo(campo, valor, siguiente);

    // Cambiar la categoría puede vaciar la talla: su error se recalcula igual.
    if (campo === "categoria") {
      revisarCampo("talla", siguiente.talla, siguiente);
    }
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

  const guardarProducto = async () => {
    // Valida todo el formulario (mismas reglas que el backend: nombre,
    // categoría, talla, color, precio y stock) y, si hay errores,
    // enfoca el primer campo inválido.
    if (!validarTodo(formulario)) {
      return;
    }

    const idProductoActual = modoEdicion
      ? productos.find((producto) => producto.id === formulario.id)
          ?.id_producto ?? null
      : null;

    if (existeProductoConNombre(formulario.nombre, idProductoActual)) {
      mostrarToast("Ese producto ya existe", "error");
      return;
    }

    if (modoEdicion) {
      setConfirmarEdicion(true);
      return;
    }

    try {
      const fila = await crearProductoAdmin({
        nombre: formulario.nombre,
        categoria: formulario.categoria,
        genero: formulario.genero,
        talla: formulario.talla,
        color: formulario.color,
        precio: Number(formulario.precio),
        stock: Number(formulario.stock),
        estado: formulario.estado,
        imagen: formulario.imagen
      });

      setProductos((actuales) => [fila, ...actuales]);

      mostrarToast("Producto creado con éxito");
      cerrarModal();
    } catch (error) {
      mostrarToast(
        error.status === 409 ? "Ese producto ya existe" : error.message,
        "error"
      );
    }
  };

  const confirmarEdicionProducto = async () => {
    try {
      const fila = await actualizarProductoAdmin(formulario.id, {
        nombre: formulario.nombre,
        categoria: formulario.categoria,
        genero: formulario.genero,
        talla: formulario.talla,
        color: formulario.color,
        precio: Number(formulario.precio),
        stock: Number(formulario.stock),
        estado: formulario.estado,
        imagen: formulario.imagen
      });

      setProductos((actuales) =>
        actuales.map((producto) =>
          producto.id === fila.id ? fila : producto
        )
      );

      setConfirmarEdicion(false);
      cerrarModal();
      mostrarToast("Producto actualizado con éxito");
    } catch (error) {
      setConfirmarEdicion(false);
      mostrarToast(
        error.status === 409 ? "Ese producto ya existe" : error.message,
        "error"
      );
    }
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
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
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
          currentPage={paginaActual}
          totalPages={totalPaginas}
          onPageChange={setPaginaActual}
        />

      </div>

      {/* =================================================
          MODAL AGREGAR / EDITAR
      ================================================= */}

      {mostrarModal && (
        <div className="producto-modal-overlay">

          <div className="producto-modal">

            <div className="producto-modal-header">

              <h3>
                {modoEdicion
                  ? "Actualizar Producto"
                  : "Registrar Producto"}
              </h3>

              <button
                type="button"
                className="producto-modal-close"
                onClick={cerrarModal}
              >
                <X size={21} />
              </button>

            </div>

            <div className="producto-modal-body">

              {/* ESTADO */}

              <div className="producto-form-row">

                <div className="producto-form-group">

                  <label>ESTADO</label>

                  <select
                    value={formulario.estado}
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

              {/* NOMBRE */}

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
                  className={`input ${errores.nombre ? "input-error" : ""}`}
                  onChange={(e) =>
                    cambiarCampo(
                      "nombre",
                      e.target.value.replace(
                        /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
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

              {/* CATEGORÍA + MARCA */}

              <div className="producto-form-row">

                <div className="producto-form-group">

                  <label>CATEGORÍA</label>

                  <select
                    id="campo-categoria"
                    value={formulario.categoria}
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
                    className={`input ${errores.genero ? "input-error" : ""}`}
                      disabled={Boolean(
                        generoFijo(formulario.categoria)
                      )}
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
                          !generoFijo(formulario.categoria) ||
                          genero === generoFijo(formulario.categoria)
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

              {/* TALLA + COLOR (la talla se oculta en categorías de tipo
                  "ninguna": gorras, perfumes y relojes) */}

              <div className="producto-form-row">

                {tipoTallaCategoria(formulario.categoria) !== "ninguna" && (
                <div className="producto-form-group">

                  <label>TALLA</label>

                  <select
                    id="campo-talla"
                    value={formulario.talla}
                    className={`input ${errores.talla ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiarCampo(
                        "talla",
                        e.target.value
                      )
                    }
                    onBlur={() =>
                      manejarBlur(
                        "talla",
                        formulario.talla,
                        formulario
                      )
                    }
                  >
                    <option value="">
                      Seleccionar talla
                    </option>

                    {tallasVisibles.map((talla) => (
                      <option
                        key={talla.nombre}
                        value={talla.nombre}
                      >
                        {talla.nombre}
                      </option>
                    ))}
                  </select>

                  {errores.talla && (
                    <span className="error-text">
                      {errores.talla}
                    </span>
                  )}

                </div>
                )}

                <div className="producto-form-group">

                  <label>COLOR</label>

                  <select
                    id="campo-color"
                    value={formulario.color}
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

              </div>

              {/* PRECIO + STOCK */}

              <div className="producto-form-row">

                <div className="producto-form-group">

                  <label>
                    PRECIO DE VENTA (COP)
                  </label>

                  <input
                    type="number"
                    id="campo-precio"
                    min="0"
                    value={formulario.precio}
                    className={`input ${errores.precio ? "input-error" : ""}`}
onChange={(e) =>
                    cambiarCampo(
                      "precio",
                      e.target.value
                        .replace(
                          /[^0-9.]/g,
                          ""
                        )
                        .replace(/(\..*)\./g, "$1")
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

                <div className="producto-form-group">

                  <label>
                    STOCK DISPONIBLE
                  </label>

                  <input
                    type="number"
                    id="campo-stock"
                    min="0"
                    value={formulario.stock}
                    className={`input ${errores.stock ? "input-error" : ""}`}
                    onChange={(e) => {
                      const soloDigitos =
                        e.target.value.replace(
                          /[^0-9]/g,
                          ""
                        );

                      const valor = Math.max(
                        0,
                        Number(soloDigitos)
                      );

                      cambiarCampo(
                        "stock",
                        valor
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

              </div>

              {/* IMAGEN */}

              <div className="producto-form-group">

                <label>
                  IMAGEN
                </label>

                <input
                  type="text"
                  placeholder="roj.png o https://..."
                  value={formulario.imagen}
                  onChange={(e) =>
                    cambiarCampo(
                      "imagen",
                      e.target.value
                    )
                  }
                />

                {urlImagen(formulario.imagen) && (
                  <img
                    className="producto-image"
                    src={urlImagen(formulario.imagen)}
                    alt="Vista previa"
                  />
                )}

                <span className="producto-secondary">
                  Escribe el nombre de un archivo de assets/img
                  (por ejemplo roj.png) o una URL completa.
                </span>

              </div>

              {/* ALERTA STOCK (solo tras tocar el campo o intentar enviar;
                  con el formulario recién abierto no aparece) */}

              {tocados.stock &&
                Number(formulario.stock) <=
                STOCK_MINIMO && (
                <div className="producto-form-alert">

                  <AlertTriangle size={16} />

                  Stock mínimo: este producto
                  generará una alerta de inventario.

                </div>
              )}

            </div>

            {/* FOOTER */}

            <div className="producto-modal-footer">

              <button
                type="button"
                className="producto-cancel-button"
                onClick={cerrarModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="producto-create-button"
                onClick={guardarProducto}
              >
                {modoEdicion
                  ? "Guardar cambios"
                  : "Crear producto"}
              </button>

            </div>

          </div>

        </div>
      )}

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