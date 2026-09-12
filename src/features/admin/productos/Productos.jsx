import { useState, useEffect } from "react";

import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  SlidersHorizontal,
  AlertTriangle
} from "lucide-react";

import "./Productos.css";

import Pagination from "../components/Pagination";

export default function Productos() {
  // =====================================================
  // PRODUCTOS
  // =====================================================

  const [productos, setProductos] = useState([
    {
      id: "PROD-001",
      nombre: "Vestido de Noche Premium",
      categoria: "Vestidos",
      talla: "M",
      color: "Negro",
      precio: 485000,
      stock: 12,
      estado: "Activo",
      imagen:
        "https://images.unsplash.com/photo-1566174053879-31528523f8ae"
    },

    {
      id: "PROD-002",
      nombre: "Blazer Ejecutivo Femenino",
      categoria: "Blazers",
      talla: "S",
      color: "Café",
      precio: 320000,
      stock: 8,
      estado: "Activo",
      imagen:
        "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3"
    },

    {
      id: "PROD-003",
      nombre: "Traje Sastre Masculino",
      categoria: "Trajes",
      talla: "L",
      color: "Negro",
      precio: 750000,
      stock: 5,
      estado: "Activo",
      imagen:
        "https://images.unsplash.com/photo-1598808503746-f34c53b9323e"
    },

    {
      id: "PROD-004",
      nombre: "Abrigo Wool Premium",
      categoria: "Abrigos",
      talla: "M",
      color: "Beige",
      precio: 620000,
      stock: 7,
      estado: "Activo",
      imagen:
        "https://images.unsplash.com/photo-1543076447-215ad9ba6923"
    },

    {
      id: "PROD-005",
      nombre: "Vestido Cóctel Elegante",
      categoria: "Vestidos",
      talla: "S",
      color: "Negro",
      precio: 395000,
      stock: 15,
      estado: "Activo",
      imagen:
        "https://images.unsplash.com/photo-1539008835657-9e8e9680c956"
    },

    {
      id: "PROD-006",
      nombre: "Traje Oscuro Clásico",
      categoria: "Trajes",
      talla: "L",
      color: "Azul oscuro",
      precio: 890000,
      stock: 3,
      estado: "Activo",
      imagen:
        "https://images.unsplash.com/photo-1594938298603-c8148c4dae35"
    },

    {
      id: "PROD-007",
      nombre: "Camiseta Básica",
      categoria: "Camisetas",
      talla: "M",
      color: "Blanco",
      precio: 95000,
      stock: 20,
      estado: "Activo",
      imagen:
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab"
    },

    {
      id: "PROD-008",
      nombre: "Tenis Urbanos",
      categoria: "Tenis",
      talla: "40",
      color: "Blanco",
      precio: 280000,
      stock: 2,
      estado: "Activo",
      imagen:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff"
    }
  ]);

  // =====================================================
  // CONSTANTES
  // =====================================================

  const STOCK_MINIMO = 3;

  // =====================================================
  // ESTADOS
  // =====================================================

  const [busqueda, setBusqueda] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [filtroCategoria, setFiltroCategoria] =
    useState("Todos");

  const [filtroTalla, setFiltroTalla] =
    useState("Todos");

  const [filtroColor, setFiltroColor] =
    useState("Todos");

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [mostrarDetalle, setMostrarDetalle] =
    useState(false);

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [productoSeleccionado, setProductoSeleccionado] =
    useState(null);

  // =====================================================
  // FORMULARIO
  // =====================================================

  const [formulario, setFormulario] = useState({
    id: "",
    nombre: "",
    categoria: "",
    talla: "",
    color: "",
    precio: 0,
    stock: 0,
    estado: "Activo",
    imagen: ""
  });

  // =====================================================
  // OPCIONES
  // =====================================================

  const categorias = [
    "Camisetas",
    "Gorras",
    "Relojes",
    "Tenis",
    "Sudaderas",
    "Perfumes",
    "Pantalones",
    "Blazers",
    "Vestidos",
    "Trajes",
    "Abrigos",
    "Busos"
  ];

  const tallas = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43"
  ];

  const colores = [
    "Negro",
    "Blanco",
    "Café",
    "Beige",
    "Azul oscuro",
    "Rojo",
    "Gris",
    "Verde"
  ];

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

    const coincideCategoria =
      filtroCategoria === "Todos" ||
      producto.categoria === filtroCategoria;

    const coincideTalla =
      filtroTalla === "Todos" ||
      producto.talla === filtroTalla;

    const coincideColor =
      filtroColor === "Todos" ||
      producto.color === filtroColor;

    return (
      coincideNombre &&
      coincideCategoria &&
      coincideTalla &&
      coincideColor
    );
  });

  // =====================================================
  // PAGINACIÓN DE LA TABLA
  // =====================================================

  const REGISTROS_POR_PAGINA = 6;
  const [paginaActual, setPaginaActual] = useState(1);

  const totalPaginas = Math.max(
    1,
    Math.ceil(productosFiltrados.length / REGISTROS_POR_PAGINA)
  );

  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const productosPaginados = productosFiltrados.slice(
    inicio,
    inicio + REGISTROS_POR_PAGINA
  );

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroCategoria, filtroTalla, filtroColor]);

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  // =====================================================
  // ABRIR AGREGAR
  // =====================================================

  const abrirAgregar = () => {
    const numero = String(
      productos.length + 1
    ).padStart(3, "0");

    setFormulario({
      id: `PROD-${numero}`,
      nombre: "",
      categoria: "",
      talla: "",
      color: "",
      precio: 0,
      stock: 0,
      estado: "Activo",
      imagen: ""
    });

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
      talla: producto.talla,
      color: producto.color,
      precio: producto.precio,
      stock: producto.stock,
      estado: producto.estado,
      imagen: producto.imagen
    });

    setModoEdicion(true);
    setMostrarModal(true);
  };

  // =====================================================
  // CAMBIAR CAMPO
  // =====================================================

  const cambiarCampo = (campo, valor) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor
    }));
  };

  // =====================================================
  // GUARDAR PRODUCTO
  // =====================================================

  const guardarProducto = () => {
    if (
      !formulario.nombre.trim() ||
      !formulario.categoria ||
      !formulario.talla ||
      !formulario.color
    ) {
      alert(
        "Completa todos los campos obligatorios."
      );

      return;
    }

    // STOCK NO NEGATIVO
    if (Number(formulario.stock) < 0) {
      alert(
        "El stock no puede ser negativo."
      );

      return;
    }

    // PRECIO NO NEGATIVO
    if (Number(formulario.precio) < 0) {
      alert(
        "El precio no puede ser negativo."
      );

      return;
    }

    const productoActualizado = {
      id: formulario.id,
      nombre: formulario.nombre,
      categoria: formulario.categoria,
      talla: formulario.talla,
      color: formulario.color,
      precio: Number(formulario.precio),
      stock: Number(formulario.stock),
      estado: formulario.estado,
      imagen: formulario.imagen
    };

    if (modoEdicion) {
      setProductos((actuales) =>
        actuales.map((producto) =>
          producto.id === formulario.id
            ? productoActualizado
            : producto
        )
      );
    } else {
      setProductos((actuales) => [
        ...actuales,
        productoActualizado
      ]);
    }

    cerrarModal();
  };

  // =====================================================
  // CAMBIAR ESTADO
  // =====================================================

  const cambiarEstado = (producto) => {
    const nuevoEstado =
      producto.estado === "Activo"
        ? "Inactivo"
        : "Activo";

    setProductos((actuales) =>
      actuales.map((item) =>
        item.id === producto.id
          ? {
              ...item,
              estado: nuevoEstado
            }
          : item
      )
    );
  };

  // =====================================================
  // ELIMINAR PRODUCTO
  // =====================================================

  const eliminarProducto = (producto) => {
    const confirmar = window.confirm(
      `¿Deseas eliminar el producto "${producto.nombre}"?`
    );

    if (!confirmar) return;

    setProductos((actuales) =>
      actuales.filter(
        (item) => item.id !== producto.id
      )
    );
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
  // LIMPIAR FILTROS
  // =====================================================

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroCategoria("Todos");
    setFiltroTalla("Todos");
    setFiltroColor("Todos");
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

          {/* FILTROS */}

          <button
            type="button"
            className={
              mostrarFiltros
                ? "productos-filter-button active"
                : "productos-filter-button"
            }
            onClick={() =>
              setMostrarFiltros(
                !mostrarFiltros
              )
            }
          >
            <SlidersHorizontal size={18} />
            Filtros
          </button>

          {/* AGREGAR */}

          <button
            type="button"
            className="productos-add-button"
            onClick={abrirAgregar}
          >
            <Plus size={18} />
            Agregar producto
          </button>

        </div>
      </div>

      {/* =================================================
          FILTROS
      ================================================= */}

      {mostrarFiltros && (
        <div className="productos-filters-panel">

          <div className="productos-filter-group">
            <label>CATEGORÍA</label>

            <select
              value={filtroCategoria}
              onChange={(e) =>
                setFiltroCategoria(
                  e.target.value
                )
              }
            >
              <option value="Todos">
                Todas
              </option>

              {categorias.map((categoria) => (
                <option
                  key={categoria}
                  value={categoria}
                >
                  {categoria}
                </option>
              ))}
            </select>
          </div>

          <div className="productos-filter-group">
            <label>TALLA</label>

            <select
              value={filtroTalla}
              onChange={(e) =>
                setFiltroTalla(
                  e.target.value
                )
              }
            >
              <option value="Todos">
                Todas
              </option>

              {tallas.map((talla) => (
                <option
                  key={talla}
                  value={talla}
                >
                  {talla}
                </option>
              ))}
            </select>
          </div>

          <div className="productos-filter-group">
            <label>COLOR</label>

            <select
              value={filtroColor}
              onChange={(e) =>
                setFiltroColor(
                  e.target.value
                )
              }
            >
              <option value="Todos">
                Todos
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
          </div>

          <button
            type="button"
            className="productos-clear-filter"
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>

        </div>
      )}

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
              <th>ID PRODUCTO</th>
              <th>NOMBRE</th>
              <th>STOCK</th>
              <th>ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>

          <tbody>

            {productosPaginados.map((producto) => (
              <tr key={producto.id}>

                <td>
                  <strong className="producto-id">
                    {producto.id}
                  </strong>
                </td>

                <td>
                  <span className="producto-nombre">
                    {producto.nombre}
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

                    <button
                      type="button"
                      title="Ver producto"
                      onClick={() =>
                        verDetalle(producto)
                      }
                    >
                      <Eye size={18} />
                    </button>

                    <button
                      type="button"
                      title="Editar producto"
                      onClick={() =>
                        abrirEditar(producto)
                      }
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      type="button"
                      title="Eliminar producto"
                      onClick={() =>
                        eliminarProducto(producto)
                      }
                    >
                      <Trash2 size={18} />
                    </button>

                  </div>
                </td>

              </tr>
            ))}

            {productosFiltrados.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="productos-empty"
                >
                  No se encontraron productos.
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
        <div className="producto-modal-overlay">

          <div className="producto-modal">

            <div className="producto-modal-header">

              <h3>
                {modoEdicion
                  ? "Editar Producto"
                  : "Agregar Producto"}
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

              {/* ID + ESTADO */}

              <div className="producto-form-row">

                <div className="producto-form-group">

                  <label>ID PRODUCTO</label>

                  <input
                    type="text"
                    value={formulario.id}
                    disabled
                  />

                </div>

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
                  placeholder="Nombre del producto"
                  value={formulario.nombre}
                  onChange={(e) =>
                    cambiarCampo(
                      "nombre",
                      e.target.value
                    )
                  }
                />

              </div>

              {/* CATEGORÍA + MARCA */}

              <div className="producto-form-row">

                <div className="producto-form-group">

                  <label>CATEGORÍA</label>

                  <select
                    value={formulario.categoria}
                    onChange={(e) =>
                      cambiarCampo(
                        "categoria",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Seleccionar categoría
                    </option>

                    {categorias.map((categoria) => (
                      <option
                        key={categoria}
                        value={categoria}
                      >
                        {categoria}
                      </option>
                    ))}
                  </select>

                </div>

              </div>

              {/* TALLA + COLOR */}

              <div className="producto-form-row">

                <div className="producto-form-group">

                  <label>TALLA</label>

                  <select
                    value={formulario.talla}
                    onChange={(e) =>
                      cambiarCampo(
                        "talla",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Seleccionar talla
                    </option>

                    {tallas.map((talla) => (
                      <option
                        key={talla}
                        value={talla}
                      >
                        {talla}
                      </option>
                    ))}
                  </select>

                </div>

                <div className="producto-form-group">

                  <label>COLOR</label>

                  <select
                    value={formulario.color}
                    onChange={(e) =>
                      cambiarCampo(
                        "color",
                        e.target.value
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
                    min="0"
                    value={formulario.precio}
                    onChange={(e) =>
                      cambiarCampo(
                        "precio",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="producto-form-group">

                  <label>
                    STOCK DISPONIBLE
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={formulario.stock}
                    onChange={(e) => {
                      const valor = Math.max(
                        0,
                        Number(e.target.value)
                      );

                      cambiarCampo(
                        "stock",
                        valor
                      );
                    }}
                  />

                </div>

              </div>

              {/* IMAGEN */}

              <div className="producto-form-group">

                <label>
                  URL DE IMAGEN
                </label>

                <input
                  type="url"
                  placeholder="https://..."
                  value={formulario.imagen}
                  onChange={(e) =>
                    cambiarCampo(
                      "imagen",
                      e.target.value
                    )
                  }
                />

              </div>

              {/* ALERTA STOCK */}

              {Number(formulario.stock) <=
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
                      productoSeleccionado.imagen
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
                      {productoSeleccionado.id}
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

                          setProductoSeleccionado(
                            (actual) => ({
                              ...actual,
                              estado:
                                actual.estado ===
                                "Activo"
                                  ? "Inactivo"
                                  : "Activo"
                            })
                          );
                        }}
                        title="Cambiar estado"
                      >
                        <span className="estado-toggle-circle"></span>
                      </button>

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
                  className="producto-cancel-button"
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