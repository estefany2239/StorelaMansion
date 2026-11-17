// =========================================================
// PANEL DE FILTROS UNIFICADO (Categoría · Tallas · Colores · Precio)
// =========================================================
// Un solo componente para TODAS las categorías y los DOS géneros.
// Todos los datos (conteos, tallas, colores, rango de precio) se
// calculan desde el catálogo real; las secciones sin datos se ocultan.
// Nada de listas hardcodeadas por categoría.
import { useMemo, useState } from 'react';
import { SlidersHorizontal, ChevronDown, RotateCcw } from 'lucide-react';
import {
  getFilteredProducts,
  getTallasDisponibles,
  getVariantesPorColor,
  tallaVisible,
  getColorStyle,
  normalizarColorNombre,
  normalizarTalla,
  esLimitePrecio,
  ORDEN_COLORES,
  TALLAS_ESTANDAR
} from '../../shared/utils/catalogo';
import './PanelFiltrosCategorias.css';

const formatearCOP = (valor) => '$' + Number(valor).toLocaleString('es-CO');
const soloDigitos = (texto) => String(texto || '').replace(/[^\d]/g, '');

// Orden de tallas: letras estándar (XS..XXL) primero, luego numéricas
// (calzado) y por último cualquier otra talla alfabéticamente.
const ordenarTallas = (claves) => {
  const esNumero = (t) => /^\d+([.,]\d+)?$/.test(t);
  const grupo = (t) =>
    TALLAS_ESTANDAR.includes(t) ? 0 : esNumero(t) ? 1 : 2;
  return [...claves].sort((a, b) => {
    const ga = grupo(a);
    const gb = grupo(b);
    if (ga !== gb) return ga - gb;
    if (ga === 0) return TALLAS_ESTANDAR.indexOf(a) - TALLAS_ESTANDAR.indexOf(b);
    if (ga === 1) return Number(a.replace(',', '.')) - Number(b.replace(',', '.'));
    return a.localeCompare(b);
  });
};

export default function PanelFiltrosCategorias({
  catalogo,
  productosBase,
  categorias,
  categoriaActual,
  genero,
  filtros,
  onCambiarFiltros,
  onCambiarCategoria,
  onLimpiar
}) {
  const { tallas: tallasSeleccionadas = [], colores: coloresSeleccionados = [] } =
    filtros || {};

  // Nombre real de la categoría activa (para "Tallas de {Categoría}");
  // "Todas" es la categoría virtual sin plantilla.
  const nombreCategoria =
    categoriaActual === 'todos'
      ? 'Todas'
      : (Array.isArray(categorias) ? categorias : []).find(
          (cat) => String(cat.id) === String(categoriaActual)
        )?.name || '';

  // El panel completo se pliega con el chevron del encabezado.
  // En escritorio arranca abierto; en móvil/tablet cerrado.
  const [expandido, setExpandido] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 900
  );

  // Secciones colapsables (todas abiertas por defecto)
  const [secciones, setSecciones] = useState({
    categoria: true,
    tallas: true,
    colores: true,
    precio: true
  });
  const alternarSeccion = (clave) =>
    setSecciones((prev) => ({ ...prev, [clave]: !prev[clave] }));

  // ---------------------------------------------
  // SECCIÓN CATEGORÍA: categorías reales del catálogo
  // que tienen productos del género actual, con conteo
  // de productos agrupados (la misma métrica del encabezado).
  // ---------------------------------------------
  const categoriasConConteo = useMemo(() => {
    const lista = (Array.isArray(categorias) ? categorias : [])
      .filter((cat) => !cat?.genders?.length || cat.genders.includes(genero))
      .map((cat) => ({
        id: cat.id,
        nombre: cat.name,
        conteo: getFilteredProducts(cat.id, genero, [], [], null, null, catalogo).length
      }))
      .filter((cat) => cat.conteo > 0);
    const total = getFilteredProducts('todos', genero, [], [], null, null, catalogo).length;
    return { todas: total, lista };
  }, [catalogo, categorias, genero]);

  // ---------------------------------------------
  // SECCIÓN TALLAS: tallas reales de los productos
  // de la categoría y género actuales, con conteo.
  // ---------------------------------------------
  const tallasConConteo = useMemo(() => {
    const conteo = new Map();
    for (const producto of productosBase) {
      const vistas = new Set();
      for (const talla of getTallasDisponibles(producto, catalogo)) {
        const visible = tallaVisible(talla);
        if (!visible) continue;
        const clave = normalizarTalla(visible);
        if (vistas.has(clave)) continue;
        vistas.add(clave);
        conteo.set(visible, (conteo.get(visible) || 0) + 1);
      }
    }
    return ordenarTallas([...conteo.keys()]).map((talla) => ({
      talla,
      conteo: conteo.get(talla)
    }));
  }, [productosBase, catalogo]);

  // ---------------------------------------------
  // SECCIÓN COLORES: colores únicos de las variantes
  // de los productos actuales, con conteo de productos.
  // ---------------------------------------------
  const coloresConConteo = useMemo(() => {
    const conteo = new Map();
    for (const producto of productosBase) {
      const delGrupo = new Set();
      for (const variante of getVariantesPorColor(producto, catalogo)) {
        const nombre = variante && variante.color ? String(variante.color).trim() : '';
        if (nombre) delGrupo.add(nombre);
      }
      delGrupo.forEach((nombre) => {
        conteo.set(nombre, (conteo.get(nombre) || 0) + 1);
      });
    }
    return [...conteo.entries()]
      .sort((a, b) => {
        const ia = ORDEN_COLORES.indexOf(normalizarColorNombre(a[0]));
        const ib = ORDEN_COLORES.indexOf(normalizarColorNombre(b[0]));
        if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
      .map(([nombre, conteo]) => ({ nombre, conteo }));
  }, [productosBase, catalogo]);

  // ---------------------------------------------
  // SECCIÓN PRECIO: rango real de los productos actuales
  // (precio numérico de las variantes del grupo).
  // ---------------------------------------------
  const rangoPrecio = useMemo(() => {
    let min = null;
    let max = null;
    const considerar = (valor) => {
      const numero = Number(valor);
      if (!Number.isFinite(numero)) return;
      if (min === null || numero < min) min = numero;
      if (max === null || numero > max) max = numero;
    };
    for (const producto of productosBase) {
      const variantes = getVariantesPorColor(producto, catalogo);
      if (variantes.length > 1) variantes.forEach((v) => considerar(v?.precio));
      else considerar(variantes[0]?.precio ?? producto?.precio);
    }
    if (min === null || max === null) return null;
    return { min, max };
  }, [productosBase, catalogo]);

  // OJO: Number(null) es 0, así que "sin filtro" (null) debe leerse con
  // esLimitePrecio; si no, el rango arrancaría en $0 a $0 y vaciaría todo.
  const precioMinSel = rangoPrecio
    ? esLimitePrecio(filtros?.precioMin) ? Number(filtros.precioMin) : rangoPrecio.min
    : null;
  const precioMaxSel = rangoPrecio
    ? esLimitePrecio(filtros?.precioMax) ? Number(filtros.precioMax) : rangoPrecio.max
    : null;
  const pasoPrecio = rangoPrecio && rangoPrecio.max > rangoPrecio.min
    ? Math.max(1000, Math.ceil((rangoPrecio.max - rangoPrecio.min) / 100 / 1000) * 1000)
    : 1000;

  // Disponibilidad cruzada: un color o talla se deshabilita cuando no hay
  // ningún producto que lo combine con los demás filtros activos.
  const coloresDisponibles = useMemo(() => {
    const set = new Set();
    for (const { nombre } of coloresConConteo) {
      const coincide = getFilteredProducts(
        categoriaActual,
        genero,
        tallasSeleccionadas,
        [nombre],
        filtros?.precioMin ?? null,
        filtros?.precioMax ?? null,
        catalogo
      ).length > 0;
      if (coincide) set.add(nombre);
    }
    return set;
  }, [coloresConConteo, categoriaActual, genero, tallasSeleccionadas, filtros?.precioMin, filtros?.precioMax, catalogo]);

  const tallasDisponibles = useMemo(() => {
    const set = new Set();
    for (const { talla } of tallasConConteo) {
      const coincide = getFilteredProducts(
        categoriaActual,
        genero,
        [talla],
        coloresSeleccionados,
        filtros?.precioMin ?? null,
        filtros?.precioMax ?? null,
        catalogo
      ).length > 0;
      if (coincide) set.add(talla);
    }
    return set;
  }, [tallasConConteo, categoriaActual, genero, coloresSeleccionados, filtros?.precioMin, filtros?.precioMax, catalogo]);

  // ---------------------------------------------
  // Acciones
  // ---------------------------------------------
  const alternarTalla = (talla) => {
    const nuevas = tallasSeleccionadas.includes(talla)
      ? tallasSeleccionadas.filter((t) => t !== talla)
      : [...tallasSeleccionadas, talla];
    onCambiarFiltros({ tallas: nuevas });
  };

  const alternarColor = (nombre) => {
    const nuevas = coloresSeleccionados.includes(nombre)
      ? coloresSeleccionados.filter((c) => c !== nombre)
      : [...coloresSeleccionados, nombre];
    onCambiarFiltros({ colores: nuevas });
  };

  const fijarPrecio = (min, max) => {
    if (!rangoPrecio) return;
    const nuevoMin = Math.min(Math.max(Number(min), rangoPrecio.min), max);
    const nuevoMax = Math.max(Math.min(Number(max), rangoPrecio.max), nuevoMin);
    onCambiarFiltros({ precioMin: nuevoMin, precioMax: nuevoMax });
  };

  // Campos numéricos de precio (solo dígitos; formato $ es-CO al salir).
  // `texto*` SOLO guarda el valor crudo mientras el campo está editado;
  // fuera de edición el valor mostrado se deriva del filtro (sin effect).
  const [editando, setEditando] = useState(null); // 'min' | 'max' | null
  const [textoMin, setTextoMin] = useState('');
  const [textoMax, setTextoMax] = useState('');

  const confirmarPrecioTexto = (cual) => {
    if (!rangoPrecio) return;
    setEditando(null);
    if (cual === 'min') {
      const crudo = soloDigitos(textoMin);
      const valor = crudo === '' ? rangoPrecio.min : Number(crudo);
      fijarPrecio(valor, precioMaxSel);
    } else {
      const crudo = soloDigitos(textoMax);
      const valor = crudo === '' ? rangoPrecio.max : Number(crudo);
      fijarPrecio(precioMinSel, valor);
    }
  };

  const hayFiltrosActivos =
    tallasSeleccionadas.length > 0 ||
    coloresSeleccionados.length > 0 ||
    (esLimitePrecio(filtros?.precioMin) && Number(filtros.precioMin) !== rangoPrecio?.min) ||
    (esLimitePrecio(filtros?.precioMax) && Number(filtros.precioMax) !== rangoPrecio?.max);

  const porcentajeDe = (valor) =>
    rangoPrecio && rangoPrecio.max > rangoPrecio.min
      ? ((valor - rangoPrecio.min) / (rangoPrecio.max - rangoPrecio.min)) * 100
      : 0;

  return (
    <div className="filtros">
      {/* Encabezado plegable: "Filtros (GÉNERO)" + chevron */}
      <button
        type="button"
        className="filtros__header"
        aria-expanded={expandido}
        onClick={() => setExpandido((abierto) => !abierto)}
      >
        <div className="filtros__header-title">
          <SlidersHorizontal size={18} />
          <span>Filtros ({String(genero || '').toUpperCase()})</span>
        </div>
        <ChevronDown size={18} className={expandido ? 'is-open' : ''} />
      </button>

      {expandido && (
        <>
          {/* SECCIÓN CATEGORÍA */}
      <section className="filtros__group">
        <button
          type="button"
          className="filtros__group-head"
          onClick={() => alternarSeccion('categoria')}
          aria-expanded={secciones.categoria}
        >
          <span>Categoría</span>
          <ChevronDown size={16} className={secciones.categoria ? 'is-open' : ''} />
        </button>
        {secciones.categoria && (
          <div className="filtros__cat-list">
            <button
              type="button"
              className={`filtros__cat-item${categoriaActual === 'todos' ? ' is-current' : ''}`}
              onClick={() => onCambiarCategoria('todos')}
              aria-pressed={categoriaActual === 'todos'}
            >
              <span className={`filtros__check${categoriaActual === 'todos' ? ' is-active' : ''}`} />
              <span className="filtros__cat-name">Todas</span>
              <span className="filtros__count">({categoriasConConteo.todas})</span>
            </button>
            {categoriasConConteo.lista.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`filtros__cat-item${categoriaActual === cat.id ? ' is-current' : ''}`}
                onClick={() => onCambiarCategoria(cat.id)}
                aria-pressed={categoriaActual === cat.id}
              >
                <span className={`filtros__check${categoriaActual === cat.id ? ' is-active' : ''}`} />
                <span className="filtros__cat-name">{cat.nombre}</span>
                <span className="filtros__count">({cat.conteo})</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* SECCIÓN TALLAS (oculta si la categoría no tiene tallas) */}
      {tallasConConteo.length > 0 && (
        <section className="filtros__group">
          <button
            type="button"
            className="filtros__group-head"
            onClick={() => alternarSeccion('tallas')}
            aria-expanded={secciones.tallas}
          >
            <span>{nombreCategoria ? `Tallas de ${nombreCategoria}` : 'Tallas'}</span>
            <ChevronDown size={16} className={secciones.tallas ? 'is-open' : ''} />
          </button>
          {secciones.tallas && (
            <div className="filtros__talla-grid">
              {tallasConConteo.map(({ talla, conteo }) => {
                const activa = tallasSeleccionadas.includes(talla);
                const disponible = tallasDisponibles.has(talla);
                return (
                  <button
                    key={talla}
                    type="button"
                    className={`filtros__talla-btn${activa ? ' active' : ''}`}
                    disabled={!disponible}
                    title={`Talla ${talla} · ${conteo} producto(s)`}
                    onClick={() => alternarTalla(talla)}
                  >
                    {talla}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SECCIÓN COLORES (oculta si la categoría no tiene colores) */}
      {coloresConConteo.length > 0 && (
        <section className="filtros__group">
          <button
            type="button"
            className="filtros__group-head"
            onClick={() => alternarSeccion('colores')}
            aria-expanded={secciones.colores}
          >
            <span>Colores</span>
            <ChevronDown size={16} className={secciones.colores ? 'is-open' : ''} />
          </button>
          {secciones.colores && (
            <div className="filtros__colores-list">
              {coloresConConteo.map(({ nombre, conteo }) => {
                const activo = coloresSeleccionados.includes(nombre);
                const disponible = coloresDisponibles.has(nombre);
                return (
                  <button
                    key={nombre}
                    type="button"
                    className={`filtros__color-item${activo ? ' is-active' : ''}${disponible ? '' : ' is-disabled'}`}
                    disabled={!disponible}
                    onClick={() => alternarColor(nombre)}
                    aria-pressed={activo}
                  >
                    <span className={`filtros__check${activo ? ' is-active' : ''}`} />
                    <span className="filtros__color-swatch" style={getColorStyle(nombre)} />
                    <span className="filtros__color-name">{nombre}</span>
                    <span className="filtros__count">({conteo})</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SECCIÓN PRECIO (oculta si no hay precios numéricos) */}
      {rangoPrecio && (
        <section className="filtros__group">
          <button
            type="button"
            className="filtros__group-head"
            onClick={() => alternarSeccion('precio')}
            aria-expanded={secciones.precio}
          >
            <span>Precio</span>
            <ChevronDown size={16} className={secciones.precio ? 'is-open' : ''} />
          </button>
          {secciones.precio && (
            <div className="filtros__precio">
              {rangoPrecio.max > rangoPrecio.min && (
                <div className="filtros__range">
                  <span
                    className="filtros__range-track"
                    style={{
                      left: `${porcentajeDe(precioMinSel)}%`,
                      width: `${Math.max(0, porcentajeDe(precioMaxSel) - porcentajeDe(precioMinSel))}%`
                    }}
                  />
                  <input
                    type="range"
                    min={rangoPrecio.min}
                    max={rangoPrecio.max}
                    step={pasoPrecio}
                    value={precioMinSel}
                    aria-label="Precio mínimo"
                    style={{ zIndex: precioMinSel > (rangoPrecio.min + rangoPrecio.max) / 2 ? 4 : 3 }}
                    onChange={(e) => fijarPrecio(Number(e.target.value), precioMaxSel)}
                  />
                  <input
                    type="range"
                    min={rangoPrecio.min}
                    max={rangoPrecio.max}
                    step={pasoPrecio}
                    value={precioMaxSel}
                    aria-label="Precio máximo"
                    onChange={(e) => fijarPrecio(precioMinSel, Number(e.target.value))}
                  />
                </div>
              )}
              <div className="filtros__precio-inputs">
                <label className="filtros__precio-field">
                  <span>Desde</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editando === 'min' ? textoMin : formatearCOP(precioMinSel)}
                    onFocus={(e) => {
                      setEditando('min');
                      setTextoMin(String(precioMinSel));
                      requestAnimationFrame(() => e.target.select());
                    }}
                    onChange={(e) => setTextoMin(soloDigitos(e.target.value))}
                    onBlur={() => confirmarPrecioTexto('min')}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  />
                </label>
                <label className="filtros__precio-field">
                  <span>Hasta</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editando === 'max' ? textoMax : formatearCOP(precioMaxSel)}
                    onFocus={(e) => {
                      setEditando('max');
                      setTextoMax(String(precioMaxSel));
                      requestAnimationFrame(() => e.target.select());
                    }}
                    onChange={(e) => setTextoMax(soloDigitos(e.target.value))}
                    onBlur={() => confirmarPrecioTexto('max')}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  />
                </label>
              </div>
            </div>
          )}
        </section>
      )}

      {/* LIMPIAR FILTROS */}
      <button
        type="button"
        className="filtros__limpiar"
        onClick={onLimpiar}
        disabled={!hayFiltrosActivos}
      >
        <RotateCcw size={14} /> Limpiar filtros
      </button>
        </>
      )}
    </div>
  );
}
