import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X, Shirt, ChevronDown, ChevronUp } from "lucide-react";
import {
  obtenerCatalogosAdmin,
  crearProductoCompletoAdmin,
  obtenerProductosAdmin
} from "../../../shared/services/api";
import "../productos/Productos.css";

const normalizar = (v) => String(v || "").trim().replace(/\s+/g, " ").toLowerCase();
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
    talla: "",
    color: ""
  };
};

export default function ProductoRapidoModal({ onCerrar, onCreado }) {
  const [catalogos, setCatalogos] = useState({ categorias: [], tallas: [], colores: [] });
  const [productosExistentes, setProductosExistentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errores, setErrores] = useState({});
  const [erroresVariantes, setErroresVariantes] = useState({});
  const [errorVariantesGeneral, setErrorVariantesGeneral] = useState("");
  const [seccionTallasAbierta, setSeccionTallasAbierta] = useState(true);
  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    genero: "",
    descripcion: "",
    stockMinimo: "0"
  });
  const [variantes, setVariantes] = useState([crearVarianteVacia()]);

  useEffect(() => {
    let activo = true;
    Promise.all([obtenerCatalogosAdmin(), obtenerProductosAdmin()])
      .then(([opciones, productos]) => {
        if (!activo) return;
        setCatalogos({
          categorias: opciones.categorias || [],
          tallas: opciones.tallas || [],
          colores: opciones.colores || []
        });
        setProductosExistentes(Array.isArray(productos) ? productos : []);
      })
      .catch((e) => {
        if (activo) setError(e.message || "No se pudieron cargar los datos");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const categoriaObj = useMemo(
    () => catalogos.categorias.find((c) => c.nombre === form.categoria),
    [catalogos.categorias, form.categoria]
  );

  const tipoTalla = categoriaObj?.tipoTalla || "";

  const generoFijo = useMemo(() => {
    const generos = categoriaObj?.generos || [];
    return generos.length === 1 ? generos[0] : "";
  }, [categoriaObj]);

  const opcionesGenero = ["hombre", "mujer", "unisex"];

  const tallasVisibles = useMemo(() => {
    if (!tipoTalla) return catalogos.tallas || [];
    return (catalogos.tallas || []).filter((t) => t.tipo === tipoTalla);
  }, [catalogos.tallas, tipoTalla]);

  const colores = useMemo(
    () => (catalogos.colores || []).map((c) => (typeof c === "string" ? { nombre: c, hex: null } : c)),
    [catalogos.colores]
  );

  const totalUnidades = 0; // stock inicial en Compras siempre es 0

  const cambiar = (campo, valor) => {
    if (campo === "categoria") {
      const nuevaCategoria = catalogos.categorias.find((c) => c.nombre === valor);
      const nuevoGeneroFijo = nuevaCategoria?.generos?.length === 1 ? nuevaCategoria.generos[0] : "";
      const nuevoTipoTalla = nuevaCategoria?.tipoTalla || "";
      setForm((f) => ({
        ...f,
        categoria: valor,
        genero: nuevoGeneroFijo
      }));
      setVariantes((prev) => {
        if (nuevoTipoTalla === "ninguna") {
          const primera = prev[0] || crearVarianteVacia();
          return [{ ...primera, talla: "" }];
        }
        return prev.map((v) => ({ ...v }));
      });
      setErrores((prev) => ({ ...prev, categoria: "", genero: "" }));
      setErroresVariantes({});
      setErrorVariantesGeneral("");
      return;
    }

    setForm((f) => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: "" }));
  };

  const cambiarVariante = (clave, campo, valor) => {
    setVariantes((prev) =>
      prev.map((v) => (v.clave === clave ? { ...v, [campo]: valor } : v))
    );
    setErrorVariantesGeneral("");
    setErroresVariantes((prev) => {
      if (!prev[clave]) return prev;
      return {
        ...prev,
        [clave]: {
          ...prev[clave],
          [campo]: ""
        }
      };
    });
  };

  const agregarVariante = () => {
    setVariantes((prev) => {
      if (tipoTalla === "ninguna") return prev;
      return [...prev, crearVarianteVacia()];
    });
    setErrorVariantesGeneral("");
  };

  const eliminarVariante = (clave) => {
    setVariantes((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((v) => v.clave !== clave);
    });
    setErroresVariantes((prev) => {
      if (!prev[clave]) return prev;
      const copia = { ...prev };
      delete copia[clave];
      return copia;
    });
  };

  const existeNombreDuplicado = (nombre) => {
    const clave = normalizarNombreProducto(nombre);
    if (!clave) return false;
    return productosExistentes.some((p) => normalizarNombreProducto(p.nombre) === clave);
  };

  const validar = () => {
    const nuevosErrores = {};
    const nombre = form.nombre.trim().replace(/\s+/g, " ");
    const stockMinimoTexto = String(form.stockMinimo ?? "").trim();
    const stockMinimo = Number(stockMinimoTexto);

    if (!nombre) nuevosErrores.nombre = "El nombre es obligatorio.";
    else if (existeNombreDuplicado(nombre)) nuevosErrores.nombre = "Ese producto ya existe.";

    if (!form.categoria) nuevosErrores.categoria = "Selecciona una categoría.";

    if (stockMinimoTexto === "" || !/^\d+$/.test(stockMinimoTexto) || !Number.isInteger(stockMinimo) || stockMinimo < 0) {
      nuevosErrores.stockMinimo = "El stock mínimo debe ser un entero mayor o igual a 0.";
    }

    if (variantes.length === 0) {
      setErrorVariantesGeneral("Agrega al menos una variante.");
    } else {
      setErrorVariantesGeneral("");
    }

    const nuevosErroresVariantes = {};
    const vistas = new Set();
    variantes.forEach((v) => {
      const talla = String(v.talla || "").trim();
      const color = String(v.color || "").trim();
      let errorTalla = "";
      let errorColor = "";

      if (tipoTalla !== "ninguna" && !talla) errorTalla = "Selecciona una talla.";
      if (!color) errorColor = "Selecciona un color.";

      const claveCombo = `${tipoTalla === "ninguna" ? "" : normalizar(talla)}|${normalizar(color)}`;
      if (talla || color) {
        if (vistas.has(claveCombo) && !errorTalla && !errorColor) {
          errorTalla = errorTalla || "Combinación repetida.";
          errorColor = errorColor || "Combinación repetida.";
        } else {
          vistas.add(claveCombo);
        }
      }

      if (errorTalla || errorColor) {
        nuevosErroresVariantes[v.clave] = { talla: errorTalla, color: errorColor };
      }
    });

    setErrores(nuevosErrores);
    setErroresVariantes(nuevosErroresVariantes);

    const tieneErroresVariantes = Object.values(nuevosErroresVariantes).some(
      (e) => e?.talla || e?.color
    );

    return Object.keys(nuevosErrores).length === 0 && !tieneErroresVariantes && variantes.length > 0;
  };

  const guardar = async () => {
    setError("");
    const ok = validar();
    if (!ok) return;

    const nombre = form.nombre.trim().replace(/\s+/g, " ");
    const stockMinimo = Number(form.stockMinimo);
    const coloresUnicos = [...new Set(variantes.map((v) => String(v.color || "").trim()).filter(Boolean))];
    const payload = {
      nombre,
      categoria: form.categoria,
      descripcion: form.descripcion.trim() || null,
      stock_minimo: stockMinimo,
      precio: 0,
      estado: "Activo",
      genero: generoFijo || form.genero || null,
      colores: coloresUnicos,
      variantes: variantes.map((v) => ({
        talla: tipoTalla === "ninguna" ? "" : String(v.talla || "").trim(),
        color: String(v.color || "").trim(),
        stock: 0
      }))
    };

    setGuardando(true);
    try {
      const res = await crearProductoCompletoAdmin(payload);
      onCreado(res);
    } catch (e) {
      setError(e.message || "No se pudo crear el producto");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="producto-modal-overlay" style={{ zIndex: 6000 }} onClick={onCerrar}>
      <div
        className="producto-modal producto-modal-form"
        role="dialog"
        aria-modal="true"
        aria-label="Agregar Producto Nuevo"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px" }}
      >
        <div className="producto-modal-header">
          <h3>Agregar Producto Nuevo</h3>
          <button
            type="button"
            className="producto-modal-close"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <X size={21} />
          </button>
        </div>

        <div className="producto-modal-body">
          {error && <p className="compras-error" style={{ marginTop: 0 }}>{error}</p>}
          {cargando ? (
            <p className="compras-vacio">Cargando catálogos…</p>
          ) : (
            <>
              <div className="producto-form-row">
                <div className="producto-form-group">
                  <label>NOMBRE DEL PRODUCTO *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    disabled={guardando}
                    className={`input ${errores.nombre ? "input-error" : ""}`}
                    onChange={(e) =>
                      cambiar(
                        "nombre",
                        e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ'\s0-9]/g, "")
                      )
                    }
                    placeholder="Nombre del producto"
                  />
                  {errores.nombre && <span className="error-text">{errores.nombre}</span>}
                </div>

                <div className="producto-form-group">
                  <label>CATEGORÍA *</label>
                  <select
                    value={form.categoria}
                    disabled={guardando}
                    className={`input ${errores.categoria ? "input-error" : ""}`}
                    onChange={(e) => cambiar("categoria", e.target.value)}
                  >
                    <option value="">Seleccionar categoría</option>
                    {catalogos.categorias.map((c) => (
                      <option key={c.id ?? c.nombre} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                  {errores.categoria && <span className="error-text">{errores.categoria}</span>}
                </div>
              </div>

              <div className="producto-form-row">
                <div className="producto-form-group">
                  <label>GÉNERO</label>
                  <select
                    value={generoFijo || form.genero}
                    disabled={guardando || Boolean(generoFijo)}
                    onChange={(e) => cambiar("genero", e.target.value)}
                  >
                    <option value="">Seleccionar género</option>
                    {opcionesGenero
                      .filter((g) => !generoFijo || g === generoFijo)
                      .map((g) => (
                        <option key={g} value={g}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="producto-form-group">
                  <label>STOCK MÍNIMO *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stockMinimo}
                    disabled={guardando}
                    className={`input ${errores.stockMinimo ? "input-error" : ""}`}
                    onChange={(e) => cambiar("stockMinimo", e.target.value)}
                  />
                  {errores.stockMinimo && <span className="error-text">{errores.stockMinimo}</span>}
                </div>
              </div>

              <div className="producto-form-group">
                <label>DESCRIPCIÓN</label>
                <textarea
                  value={form.descripcion}
                  disabled={guardando}
                  rows={3}
                  onChange={(e) => cambiar("descripcion", e.target.value)}
                  style={{ height: "auto", minHeight: "90px", padding: "10px 12px", resize: "vertical" }}
                />
              </div>

              <div className="producto-tallas-card">
                <button
                  type="button"
                  className="producto-tallas-toggle"
                  onClick={() => setSeccionTallasAbierta((v) => !v)}
                >
                  <span className="producto-tallas-icon"><Shirt size={16} /></span>
                  <span className="producto-tallas-heading">
                    <strong>Tallas y variantes</strong>
                    <span>Define las combinaciones de talla y color del producto</span>
                  </span>
                  <span className="producto-tallas-chevron">
                    {seccionTallasAbierta ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>

                {seccionTallasAbierta && (
                  <div className="producto-tallas-content">
                    {variantes.map((variante) => {
                      const err = erroresVariantes[variante.clave] || {};
                      const colorHex = colores.find((c) => c.nombre === variante.color)?.hex || null;

                      return (
                        <div key={variante.clave}>
                          <div className="producto-talla-row">
                            <div className="producto-talla-control producto-talla-select-control">
                              <select
                                value={tipoTalla === "ninguna" ? "" : (variante.talla || "")}
                                disabled={guardando || tipoTalla === "ninguna" || !form.categoria}
                                className={err.talla ? "input-error" : ""}
                                onChange={(e) => cambiarVariante(variante.clave, "talla", e.target.value)}
                              >
                                <option value="">
                                  {tipoTalla === "ninguna" ? "Sin talla" : "Talla *"}
                                </option>
                                {tipoTalla !== "ninguna" &&
                                  tallasVisibles.map((t) => (
                                    <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
                                  ))}
                              </select>
                              {err.talla && <span className="error-text">{err.talla}</span>}
                            </div>

                            <div className="producto-talla-control producto-talla-color-control">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  aria-hidden="true"
                                  style={{
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "999px",
                                    border: "1px solid #d1d5db",
                                    background: colorHex || "#f3f4f6",
                                    flex: "0 0 18px"
                                  }}
                                />
                                <select
                                  value={variante.color || ""}
                                  disabled={guardando}
                                  className={err.color ? "input-error" : ""}
                                  onChange={(e) => cambiarVariante(variante.clave, "color", e.target.value)}
                                  style={{ flex: 1 }}
                                >
                                  <option value="">Color *</option>
                                  {colores.map((c) => (
                                    <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                                  ))}
                                </select>
                              </div>
                              {err.color && <span className="error-text">{err.color}</span>}
                            </div>

                            <div className="producto-talla-control producto-talla-stock-control">
                              <div className="producto-stock-readonly" aria-label="Stock">0</div>
                            </div>

                            <button
                              type="button"
                              className="producto-talla-delete"
                              title="Eliminar fila"
                              aria-label="Eliminar fila"
                              disabled={guardando || variantes.length === 1}
                              onClick={() => eliminarVariante(variante.clave)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {errorVariantesGeneral && <span className="error-text">{errorVariantesGeneral}</span>}

                    <div className="producto-tallas-footer">
                      <button
                        type="button"
                        className="producto-add-talla"
                        disabled={guardando || tipoTalla === "ninguna"}
                        onClick={agregarVariante}
                      >
                        <Plus size={14} /> Agregar variante
                      </button>

                      <span className="producto-tallas-total">
                        Total: <strong>{totalUnidades} {totalUnidades === 1 ? "unidad" : "unidades"}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="producto-modal-footer">
          <button
            type="button"
            className="producto-cancel-button"
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="producto-create-button"
            onClick={guardar}
            disabled={guardando || cargando}
            style={{ background: "#D4AF37", color: "#111111" }}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
