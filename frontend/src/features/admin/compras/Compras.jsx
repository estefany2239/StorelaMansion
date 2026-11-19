import { useEffect, useState } from 'react'

import {

  AlertTriangle,

  Ban,

  Check,

  DollarSign,

  Eye,

  FileText,

  Hourglass,

  Lock,

  Package,

  Pencil,

  Plus,

  Search,

  Trash2,

  Wallet,

  X

} from 'lucide-react'

import Pagination from '../components/Pagination'

import { tienePermiso } from '../utils/permisos'

import {

  actualizarCompraAdmin,

  anularCompraAdmin,

  confirmarCompraAdmin,

  registrarRecepcionCompraAdmin,

  cerrarCompraAdmin,

  registrarPagoCompraAdmin,

  aplicarSaldoCompraAdmin,

  buscarVariantesCompraAdmin,

  crearCompraAdmin,

  listarComprasAdmin,

  listarProveedoresAdmin,

  obtenerCatalogosAdmin,

  crearProductoCompletoAdmin,

  obtenerCompraAdmin

} from '../../../shared/services/api'

import './Compras.css'

import ProductoRapidoModal from './ProductoRapidoModal'
import ConfirmarModal from '../../../shared/components/ConfirmarModal'





const REGISTROS_POR_PAGINA = 10







const ICONO_ESTADO = {

  Borrador: FileText,

  Confirmada: Hourglass,

  'Parcialmente recibida': Hourglass,

  Recibida: Check,

  Cerrada: Lock,

  'Cerrada con faltantes': AlertTriangle,

  Anulada: X,

}



// Solo se edita en Borrador y solo se anula sin mercancía recibida.





const formatearMoneda = (valor) =>

  new Intl.NumberFormat('es-CO', {

    style: 'currency',

    currency: 'COP',

    maximumFractionDigits: 0,

  }).format(Number(valor) || 0)



// La fecha llega como 'YYYY-MM-DD'. Se parte el texto para evitar el desfase de zona horaria.

const formatearFecha = (fecha) => {

  if (!fecha) return '—'

  const [anio, mes, dia] = String(fecha).split('-')

  return dia && mes && anio ? `${dia}/${mes}/${anio}` : fecha

}



// Las marcas de tiempo llegan como instante completo.

const formatearFechaHora = (valor) => {

  if (!valor) return '—'

  const fecha = new Date(valor)

  return Number.isNaN(fecha.getTime())

    ? '—'

    : fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

}



const formatearCodigo = (compra) =>

  compra.codigo || `C-${String(compra.id).padStart(6, '0')}`



const slug = (texto) =>

  String(texto || '')

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .toLowerCase()

    .replace(/\s+/g, '-')



const textoProducto = (linea) =>

  [linea.producto, linea.talla, linea.color].filter(Boolean).join(' · ')



// Fecha de hoy en hora local, en formato YYYY-MM-DD.

const hoyISO = () => {

  const ahora = new Date()

  const mes = String(ahora.getMonth() + 1).padStart(2, '0')

  const dia = String(ahora.getDate()).padStart(2, '0')

  return `${ahora.getFullYear()}-${mes}-${dia}`

}



const nuevaClave = () => Math.random().toString(36).slice(2, 10)



const textoVariante = (v) =>

  [v.producto, v.talla, v.color].filter(Boolean).join(' · ')



// Crear o editar un Borrador. Solo se edita mientras la compra esté en Borrador:

// el botón de edición de la lista ya lo controla, aquí no se repite la regla.





function CompraFormulario({ compraInicial, onCerrar, onGuardada, user }) {

  const puedeCrearProducto = tienePermiso(user, 'Productos', 'Crear')

  const editando = Boolean(compraInicial)



  const [proveedores, setProveedores] = useState([])

  const [idProveedor, setIdProveedor] = useState(

    compraInicial?.id_proveedor ? String(compraInicial.id_proveedor) : ''

  )

  const [fecha, setFecha] = useState(compraInicial?.fecha || hoyISO())

  const [modalProductoRapido, setModalProductoRapido] = useState(false)

  const [lineas, setLineas] = useState(() =>

    (compraInicial?.detalles ?? []).map((d) => ({

      key: nuevaClave(),

      id_variante: d.id_variante,

      producto: d.producto,

      codigo: d.codigo,

      talla: d.talla,

      color: d.color,

      cantidad: String(d.cantidad_solicitada),

      costo: String(d.costo_unitario),

    }))

  )



  const [panelAbierto, setPanelAbierto] = useState(false)

  const [buscarTexto, setBuscarTexto] = useState('')

  const [resultados, setResultados] = useState([])

  const [catalogos, setCatalogos] = useState({ categorias: [], tallas: [], colores: [] })

  const [productoNuevo, setProductoNuevo] = useState(null)

  const [guardandoProducto, setGuardandoProducto] = useState(false)

  const [errorProducto, setErrorProducto] = useState('')



  const [error, setError] = useState('')

  const [guardando, setGuardando] = useState(false)



  // Proveedores activos para el selector.

  useEffect(() => {

    let cancelado = false

    listarProveedoresAdmin({ estado: 'activo', limite: 100 })

      .then((respuesta) => {

        if (!cancelado) setProveedores(respuesta.data ?? [])

      })

      .catch(() => {

        if (!cancelado) setProveedores([])

      })

    return () => {

      cancelado = true

    }

  }, [])



  // Buscador de variantes (con retraso de 300 ms).

  useEffect(() => {

    if (!panelAbierto) return undefined

    let cancelado = false

    const temporizador = setTimeout(() => {

      buscarVariantesCompraAdmin(buscarTexto.trim())

        .then((datos) => {

          if (!cancelado) setResultados(datos)

        })

        .catch(() => {

          if (!cancelado) setResultados([])

        })

    }, 300)

    return () => {

      cancelado = true

      clearTimeout(temporizador)

    }

  }, [panelAbierto, buscarTexto])



  // Cerrar con Escape.

  useEffect(() => {

    const manejarTecla = (evento) => {

      if (evento.key === 'Escape') onCerrar()

    }

    document.addEventListener('keydown', manejarTecla)

    return () => document.removeEventListener('keydown', manejarTecla)

  }, [onCerrar])



  // Catálogos para crear un producto nuevo (solo si el usuario puede crear productos).

  useEffect(() => {

    if (!puedeCrearProducto) return undefined

    let cancelado = false

    obtenerCatalogosAdmin()

      .then((datos) => {

        if (!cancelado) {

          setCatalogos({

            categorias: datos.categorias ?? [],

            tallas: datos.tallas ?? [],

            colores: datos.colores ?? [],

          })

        }

      })

      .catch(() => {

        if (!cancelado) setCatalogos({ categorias: [], tallas: [], colores: [] })

      })

    return () => {

      cancelado = true

    }

  }, [puedeCrearProducto])



  const categoriaElegida = catalogos.categorias.find(

    (c) => c.nombre === productoNuevo?.categoria

  )

  const tipoTallaCategoria = categoriaElegida?.tipoTalla || ''

  const sinTalla = tipoTallaCategoria === 'ninguna'

  const tallasDisponibles =

    !tipoTallaCategoria || sinTalla

      ? catalogos.tallas

      : catalogos.tallas.filter((t) => t.tipo === tipoTallaCategoria)

  const generosDisponibles = categoriaElegida?.generos?.length

    ? categoriaElegida.generos

    : ['hombre', 'mujer', 'unisex']



  const cerrarProductoNuevo = () => {

    setProductoNuevo(null)

    setErrorProducto('')

  }



  const cambiarProductoNuevo = (campo, valor) =>

    setProductoNuevo((actual) => ({

      ...actual,

      [campo]: valor,

      ...(campo === 'categoria' ? { genero: '', talla: '' } : {}),

    }))



  const validarProductoNuevo = () => {

    if (!productoNuevo.nombre.trim()) return 'Escribe el nombre del producto'

    if (!productoNuevo.categoria) return 'Selecciona la categoría'

    if (!productoNuevo.genero) return 'Selecciona el género'

    if (!sinTalla && !productoNuevo.talla) return 'Selecciona la talla'

    if (!productoNuevo.color) return 'Selecciona el color'

    const precio = Number(productoNuevo.precio)

    if (productoNuevo.precio === '' || !Number.isFinite(precio) || precio < 0) {

      return 'El precio de venta no es válido'

    }

    return ''

  }



  // Crea el producto desde cero con stock 0 (el stock solo sube con la recepción)

  // y agrega su variante a la compra.

  const crearProductoYAgregar = async () => {

    const mensaje = validarProductoNuevo()

    if (mensaje) {

      setErrorProducto(mensaje)

      return

    }



    const variantes = sinTalla

      ? [{ color: productoNuevo.color, stock: 0 }]

      : [{ talla: productoNuevo.talla, color: productoNuevo.color, stock: 0 }]



    setGuardandoProducto(true)

    setErrorProducto('')

    try {

      const respuesta = await crearProductoCompletoAdmin({

        nombre: productoNuevo.nombre.trim(),

        categoria: productoNuevo.categoria,

        genero: productoNuevo.genero,

        precio: Number(productoNuevo.precio),

        estado: 'Activo',

        variantes,

      })

      const variante = (respuesta.variantes ?? [])[0]

      if (!variante?.id_variante) {

        throw new Error('El producto se creó, pero no se pudo obtener su variante')

      }

      setLineas((actuales) => [

        ...actuales,

        {

          key: nuevaClave(),

          id_variante: variante.id_variante,

          producto: productoNuevo.nombre.trim(),

          codigo: '',

          talla: sinTalla ? '' : productoNuevo.talla,

          color: productoNuevo.color,

          cantidad: '1',

          costo: '0',

        },

      ])

      setProductoNuevo(null)

      setPanelAbierto(false)

      setBuscarTexto('')

    } catch (err) {

      setErrorProducto(err.message || 'No se pudo crear el producto')

    } finally {

      setGuardandoProducto(false)

    }

  }



  const agregarVariante = (variante) => {

    setLineas((actuales) => [

      ...actuales,

      {

        key: nuevaClave(),

        id_variante: variante.id_variante,

        producto: variante.producto,

        codigo: variante.codigo,

        talla: variante.talla,

        color: variante.color,

        cantidad: '1',

        costo: '0',

      },

    ])

    setPanelAbierto(false)

    setBuscarTexto('')

    setError('')

  }



  const actualizarLinea = (key, campo, valor) =>

    setLineas((actuales) =>

      actuales.map((l) => (l.key === key ? { ...l, [campo]: valor } : l))

    )



  const quitarLinea = (key) =>

    setLineas((actuales) => actuales.filter((l) => l.key !== key))



  const subtotal = lineas.reduce(

    (suma, l) => suma + (Number(l.cantidad) || 0) * (Number(l.costo) || 0),

    0

  )



  const validar = () => {

    if (!idProveedor) return 'Selecciona un proveedor'

    if (!fecha) return 'Indica la fecha de la compra'

    if (lineas.length === 0) return 'Agrega al menos un producto'

    for (let i = 0; i < lineas.length; i += 1) {

      const linea = lineas[i]

      const cantidad = Number(linea.cantidad)

      if (!Number.isInteger(cantidad) || cantidad <= 0) {

        return `La cantidad de la línea ${i + 1} debe ser un entero mayor que cero`

      }

      const costo = Number(linea.costo)

      if (linea.costo === '' || !Number.isFinite(costo) || costo < 0) {

        return `El precio unitario de la línea ${i + 1} no es válido`

      }

    }

    return ''

  }



  const guardar = async () => {

    const mensaje = validar()

    if (mensaje) {

      setError(mensaje)

      return

    }



    const datos = {

      id_proveedor: Number(idProveedor),

      fecha,

      // El formulario no edita observaciones: se conservan las que ya tenía.

      observaciones: compraInicial?.observaciones ?? null,

      items: lineas.map((l) => ({

        id_variante: l.id_variante,

        cantidad_solicitada: Number(l.cantidad),

        costo_unitario: Number(l.costo),

      })),

    }



    setGuardando(true)

    setError('')

    try {

      const compra = editando

        ? await actualizarCompraAdmin(compraInicial.id, datos)

        : await crearCompraAdmin(datos)

      onGuardada(compra)

    } catch (err) {

      setError(err.message || 'No se pudo guardar la compra')

      setGuardando(false)

    }

  }



  // Si el proveedor de una compra ya no está activo, se muestra igual para no perder el dato.

  const opcionesProveedor = [...proveedores]

  if (editando && !opcionesProveedor.some((p) => String(p.id) === idProveedor)) {

    opcionesProveedor.unshift({

      id: compraInicial.id_proveedor,

      nombre: compraInicial.proveedor?.nombre || `Proveedor ${compraInicial.id_proveedor}`,

    })

  }



  const codigoMostrado = editando

    ? compraInicial.codigo || `C-${String(compraInicial.id).padStart(6, '0')}`

    : 'Se asigna al guardar'



  return (

    <>

    <div className="compras-modal-overlay" onClick={onCerrar}>

      <div

        className="compras-modal compras-modal--formulario"

        role="dialog"

        aria-modal="true"

        aria-label={editando ? 'Editar compra' : 'Registrar compra'}

        onClick={(e) => e.stopPropagation()}

      >

        <header className="compras-modal-header">

          <h3>{editando ? 'Editar compra' : 'Registrar Compra'}</h3>

          <button

            type="button"

            className="compras-modal-close"

            onClick={onCerrar}

            aria-label="Cerrar"

          >

            <X size={18} />

          </button>

        </header>



        <div className="compras-modal-body">

          <div className="compras-form-campos">

            <label className="compras-campo">

              <span>PROVEEDOR *</span>

              <select

                value={idProveedor}

                onChange={(e) => setIdProveedor(e.target.value)}

                disabled={guardando}

              >

                <option value="">Seleccionar proveedor</option>

                {opcionesProveedor.map((p) => (

                  <option key={p.id} value={String(p.id)}>

                    {p.nombre}

                  </option>

                ))}

              </select>

            </label>



            <label className="compras-campo">

              <span>FECHA *</span>

              <input

                type="date"

                value={fecha}

                onChange={(e) => setFecha(e.target.value)}

                disabled={guardando}

              />

            </label>



            <div className="compras-campo">

              <span>N.° DE COMPRA</span>

              <div className="compras-campo-lectura">{codigoMostrado}</div>

            </div>

          </div>



          <div className="compras-form-productos">

            <h4>Productos de la compra</h4>

            <button

              type="button"

              className="compras-btn-dorado"

              onClick={() => setPanelAbierto((abierto) => !abierto)}

              disabled={guardando}

            >

              <Plus size={16} />

              Agregar Producto

            </button>

          </div>



          {panelAbierto && (

            <div className="compras-buscador-panel">

              <label className="compras-buscador">

                <Search size={16} />

                <input

                  autoFocus

                  type="text"

                  placeholder="Buscar producto, talla o color."

                  value={buscarTexto}

                  onChange={(e) => setBuscarTexto(e.target.value)}

                />

              </label>

              <ul className="compras-resultados">

                {resultados.length === 0 && (

                  <li className="compras-vacio">Sin resultados.</li>

                )}

                {resultados.map((v) => {

                  const yaAgregada = lineas.some((l) => l.id_variante === v.id_variante)

                  return (

                    <li key={v.id_variante}>

                      <button

                        type="button"

                        disabled={yaAgregada}

                        onClick={() => agregarVariante(v)}

                      >

                        <span>

                          {textoVariante(v)}

                          <small className="compras-secundario">{v.codigo}</small>

                        </span>

                        <small className="compras-secundario">

                          {yaAgregada ? 'Ya agregada' : `Stock actual: ${v.stock}`}

                        </small>

                      </button>

                    </li>

                  )

                })}

              </ul>

              {puedeCrearProducto && !productoNuevo && (

                <button

                  type="button"

                  className="compras-link-accion"

                  onClick={(e) => { e.stopPropagation(); setModalProductoRapido(true) }}

                >

                  <Plus size={14} />

                  Crear producto nuevo

                </button>

              )}

              {productoNuevo && (

                <div className="compras-producto-nuevo">

                  <h5>Producto nuevo</h5>

                  <div className="compras-producto-nuevo-campos">

                    <label className="compras-campo">

                      <span>NOMBRE *</span>

                      <input

                        type="text"

                        value={productoNuevo.nombre}

                        onChange={(e) => cambiarProductoNuevo('nombre', e.target.value)}

                        disabled={guardandoProducto}

                      />

                    </label>

                    <label className="compras-campo">

                      <span>CATEGORÍA *</span>

                      <select

                        value={productoNuevo.categoria}

                        onChange={(e) => cambiarProductoNuevo('categoria', e.target.value)}

                        disabled={guardandoProducto}

                      >

                        <option value="">Seleccionar</option>

                        {catalogos.categorias.map((c) => (

                          <option key={c.id} value={c.nombre}>

                            {c.nombre}

                          </option>

                        ))}

                      </select>

                    </label>

                    <label className="compras-campo">

                      <span>GÉNERO *</span>

                      <select

                        value={productoNuevo.genero}

                        onChange={(e) => cambiarProductoNuevo('genero', e.target.value)}

                        disabled={!productoNuevo.categoria || guardandoProducto}

                      >

                        <option value="">Seleccionar</option>

                        {generosDisponibles.map((g) => (

                          <option key={g} value={g}>

                            {g}

                          </option>

                        ))}

                      </select>

                    </label>

                    {!sinTalla && (

                      <label className="compras-campo">

                        <span>TALLA *</span>

                        <select

                          value={productoNuevo.talla}

                          onChange={(e) => cambiarProductoNuevo('talla', e.target.value)}

                          disabled={!productoNuevo.categoria || guardandoProducto}

                        >

                          <option value="">Seleccionar</option>

                          {tallasDisponibles.map((t) => (

                            <option key={t.nombre} value={t.nombre}>

                              {t.nombre}

                            </option>

                          ))}

                        </select>

                      </label>

                    )}

                    <label className="compras-campo">

                      <span>COLOR *</span>

                      <select

                        value={productoNuevo.color}

                        onChange={(e) => cambiarProductoNuevo('color', e.target.value)}

                        disabled={guardandoProducto}

                      >

                        <option value="">Seleccionar</option>

                        {catalogos.colores.map((c) => (

                          <option key={c} value={c}>

                            {c}

                          </option>

                        ))}

                      </select>

                    </label>

                    <label className="compras-campo">

                      <span>PRECIO DE VENTA *</span>

                      <input

                        type="number"

                        min="0"

                        step="any"

                        value={productoNuevo.precio}

                        onChange={(e) => cambiarProductoNuevo('precio', e.target.value)}

                        disabled={guardandoProducto}

                      />

                    </label>

                  </div>

                  <p className="compras-texto-secundario">

                    Se crea con stock 0. El stock sube solo cuando se registra la recepción de esta compra.

                  </p>

                  {errorProducto && <div className="compras-error">{errorProducto}</div>}

                  <div className="compras-producto-nuevo-acciones">

                    <button

                      type="button"

                      className="compras-btn-secundario"

                      onClick={cerrarProductoNuevo}

                      disabled={guardandoProducto}

                    >

                      Cancelar

                    </button>

                    <button

                      type="button"

                      className="compras-btn-dorado"

                      onClick={crearProductoYAgregar}

                      disabled={guardandoProducto}

                    >

                      {guardandoProducto ? 'Creando.' : 'Crear y agregar'}

                    </button>

                  </div>

                </div>

              )}

            </div>

          )}



          <div className="compras-tabla-scroll">

            <table className="compras-lineas">

              <thead>

                <tr>

                  <th>PRODUCTO</th>

                  <th>TALLA</th>

                  <th>COLOR</th>

                  <th>CANTIDAD</th>

                  <th>COSTO UNIT.</th>

                  <th>SUBTOTAL</th>

                  <th aria-label="Acciones" />

                </tr>

              </thead>

              <tbody>

                {lineas.length === 0 && (

                  <tr>

                    <td colSpan={7} className="compras-vacio compras-celda-centro">

                      Aún no hay productos. Usa "Agregar Producto".

                    </td>

                  </tr>

                )}

                {(() => {

                  const grupos = []

                  const mapa = new Map()

                  lineas.forEach((l) => {

                    if (!mapa.has(l.producto)) {

                      mapa.set(l.producto, [])

                      grupos.push(l.producto)

                    }

                    mapa.get(l.producto).push(l)

                  })

                  return grupos.flatMap((producto) => {

                    const filas = mapa.get(producto)

                    return filas.map((l, indice) => {

                      const sub = (Number(l.cantidad) || 0) * (Number(l.costo) || 0)

                      return (

                        <tr key={l.key}>

                          {indice === 0 && (

                            <td rowSpan={filas.length}>

                              <span className="compras-producto-nombre">{l.producto}</span>

                              <small className="compras-secundario">{l.codigo}</small>

                            </td>

                          )}

                          <td>{l.talla || '—'}</td>

                          <td>{l.color || '—'}</td>

                          <td>

                            <div className="compras-cantidad-control">

                              <button

                                type="button"

                                onClick={() =>

                                  actualizarLinea(l.key, 'cantidad', String(Math.max(1, (Number(l.cantidad) || 1) - 1)))

                                }

                                disabled={guardando}

                              >

                                -

                              </button>

                              <input

                                className="compras-input-numero"

                                type="number"

                                min="1"

                                step="1"

                                value={l.cantidad}

                                onChange={(e) => actualizarLinea(l.key, 'cantidad', e.target.value)}

                                disabled={guardando}

                              />

                              <button

                                type="button"

                                onClick={() =>

                                  actualizarLinea(l.key, 'cantidad', String((Number(l.cantidad) || 0) + 1))

                                }

                                disabled={guardando}

                              >

                                +

                              </button>

                            </div>

                          </td>

                          <td>

                            <input

                              className="compras-input-numero compras-input-moneda"

                              type="number"

                              min="0"

                              step="any"

                              value={l.costo}

                              onChange={(e) => actualizarLinea(l.key, 'costo', e.target.value)}

                              disabled={guardando}

                            />

                          </td>

                          <td className="compras-numero">{formatearMoneda(sub)}</td>

                          <td>

                            <button

                              type="button"

                              className="compras-quitar"

                              onClick={() => quitarLinea(l.key)}

                              disabled={guardando}

                              aria-label="Quitar producto"

                              title="Quitar producto"

                            >

                              <Trash2 size={16} />

                            </button>

                          </td>

                        </tr>

                      )

                    })

                  })

                })()}

              </tbody>

            </table>

          </div>



          <div className="compras-totales">

            <div>

              <span>Subtotal</span>

              <strong>{formatearMoneda(subtotal)}</strong>

            </div>

            <div className="compras-totales-total">

              <span>Total</span>

              <strong>{formatearMoneda(subtotal)}</strong>

            </div>

          </div>



          {error && <div className="compras-error">{error}</div>}

        </div>



        <footer className="compras-form-footer">

          <button

            type="button"

            className="compras-btn-secundario"

            onClick={onCerrar}

            disabled={guardando}

          >

            Cancelar

          </button>

          <button

            type="button"

            className="compras-btn-dorado"

            onClick={guardar}

            disabled={guardando}

          >

            {guardando ? 'Guardando.' : editando ? 'Guardar cambios' : 'Registrar Compra'}

          </button>

        </footer>

      </div>

    </div>



    {modalProductoRapido && (

      <ProductoRapidoModal

        onCerrar={() => setModalProductoRapido(false)}

        onCreado={(res) => {

          const variantesRes = res?.variantes ?? []
          const nombreProducto = variantesRes[0]?.nombre || res?.nombre || ''

          setModalProductoRapido(false)
          setPanelAbierto(true)
          if (nombreProducto) setBuscarTexto(nombreProducto)
          buscarVariantesCompraAdmin(nombreProducto || '').then((datos) => setResultados(datos)).catch(() => setResultados([]))

          if (variantesRes.length > 0) {
            setLineas((actuales) => [
              ...actuales,
              ...variantesRes.map((v) => ({
                key: nuevaClave(),
                id_variante: v.id_variante ?? v.id,
                producto: v.nombre || nombreProducto,
                codigo: v.codigo || '',
                talla: v.talla || '',
                color: v.color || '',
                cantidad: '1',
                costo: ''
              }))
            ])
          }

        }}

      />

    )}
    </>

  )

}

export default function Compras({ user }) {

  const puedeConsultar = tienePermiso(user, 'Compras', 'Consultar')

  const puedeCrear = tienePermiso(user, 'Compras', 'Crear')

  const puedeActualizar = tienePermiso(user, 'Compras', 'Actualizar')

  const puedeAnular = tienePermiso(user, 'Compras', 'Anular')



  const [pagina, setPagina] = useState(1)

  const [textoBusqueda, setTextoBusqueda] = useState('')

  const [busqueda, setBusqueda] = useState('')

  const [recarga, setRecarga] = useState(0)



  // Resultado de la última consulta, con la clave de los filtros que la produjo.

  // Si la clave no coincide con los filtros actuales, la consulta está en curso.

  const [lista, setLista] = useState({

    clave: '',

    compras: [],

    paginas: 1,

    error: '',

  })



  const [detalle, setDetalle] = useState(null)

  const [formulario, setFormulario] = useState(null)

  const [accionError, setAccionError] = useState('')

  const [modalRecepcion, setModalRecepcion] = useState(null)

  const [modalPago, setModalPago] = useState(null)

  const [modalAplicarSaldo, setModalAplicarSaldo] = useState(null)

  const [confirmarAccion, setConfirmarAccion] = useState(null)

  const clave = [pagina, busqueda, recarga].join('|')

  const cargando = lista.clave !== clave



  // Búsqueda con retraso de 300 ms para no pedir al servidor en cada tecla.

  useEffect(() => {

    const temporizador = setTimeout(() => {

      setBusqueda(textoBusqueda.trim())

      setPagina(1)

    }, 300)

    return () => clearTimeout(temporizador)

  }, [textoBusqueda])



  // Las actualizaciones de estado ocurren solo dentro de las promesas,

  // nunca de forma síncrona en el cuerpo del efecto.

  useEffect(() => {

    if (!puedeConsultar) return undefined



    let cancelado = false

    listarComprasAdmin({

      pagina,

      limite: REGISTROS_POR_PAGINA,

      q: busqueda,

    })

      .then((respuesta) => {

        if (cancelado) return

        setLista({

          clave,

          compras: respuesta.data ?? [],

          paginas: respuesta.paginacion?.paginas ?? 1,

          error: '',

        })

      })

      .catch((err) => {

        if (cancelado) return

        setLista({

          clave,

          compras: [],

          paginas: 1,

          error: err.message || 'No se pudieron cargar las compras',

        })

      })



    return () => {

      cancelado = true

    }

  }, [puedeConsultar, clave, pagina, busqueda])



  // Cerrar el detalle con la tecla Escape.

  useEffect(() => {

    if (!detalle) return undefined

    const manejarTecla = (evento) => {

      if (evento.key === 'Escape') setDetalle(null)

    }

    document.addEventListener('keydown', manejarTecla)

    return () => document.removeEventListener('keydown', manejarTecla)

  }, [detalle])



  const abrirDetalle = (id) => {

    setDetalle({ cargando: true, datos: null, error: '' })

    obtenerCompraAdmin(id)

      .then((datos) => setDetalle({ cargando: false, datos, error: '' }))

      .catch((err) =>

        setDetalle({

          cargando: false,

          datos: null,

          error: err.message || 'No se pudo cargar la compra',

        })

      )

  }



  const abrirNueva = () => {

    setAccionError('')

    setFormulario({ compra: null })

  }



  const abrirEdicion = (id) => {

    setAccionError('')

    obtenerCompraAdmin(id)

      .then((datos) => setFormulario({ compra: datos }))

      .catch((err) => setAccionError(err.message || 'No se pudo abrir la compra'))

  }



  const anular = (compra) => {
    setConfirmarAccion({ tipo: 'anular', compra })
  }



const ejecutarAccionCompra = (accion, mensajeError) => {

  setAccionError('')

  return accion()

    .then(() => { setRecarga((n) => n + 1); return true })

    .catch((err) => { setAccionError(err.message || mensajeError); return false })

}



const confirmar = (compra) => {
  setConfirmarAccion({ tipo: 'confirmar', compra })
}



const cerrar = (compra) => {
  setConfirmarAccion({ tipo: 'cerrar', compra })
}



const aplicarSaldo = (compra) => {

  setAccionError('')

  obtenerCompraAdmin(compra.id)

    .then((datos) => setModalAplicarSaldo({
      compra: datos,
      monto: '',
      clave: crypto.randomUUID()
    }))

    .catch((err) => setAccionError(err.message || 'No se pudo cargar la compra'))

}







  if (!puedeConsultar) {

    return (

      <div className="compras-page">

        <p className="compras-vacio">No tienes permiso para ver las compras.</p>

      </div>

    )

  }



  const { compras, paginas, error } = lista

  const d = detalle?.datos



  return (

    <>

    <div className="compras-page">

      <header className="compras-header">

        <div className="compras-title">

          <h2>Compras</h2>

          <p>Registra y consulta las compras realizadas a los proveedores.</p>

        </div>



        <div className="compras-header-actions">

          <label className="compras-search">

            <Search size={16} />

            <input

              type="text"

              placeholder="Buscar compra..."

              value={textoBusqueda}

              onChange={(e) => setTextoBusqueda(e.target.value)}

            />

          </label>



          {puedeCrear && (

            <button type="button" className="compras-btn-dorado" onClick={abrirNueva}>

              <Plus size={16} />

              Registrar Compra

            </button>

          )}

        </div>

      </header>



      {(error || accionError) && (

        <div className="compras-error">{error || accionError}</div>

      )}



      <div className="compras-table-container">

        <table className="compras-table">

          <thead>

            <tr>

              <th>N.° COMPRA</th>

              <th>PROVEEDOR</th>

              <th>FECHA</th>

              <th>TOTAL</th>

              <th>ESTADO</th>

              <th className="col-acciones">ACCIONES</th>

            </tr>

          </thead>

          <tbody>

            {cargando && compras.length === 0 && (

              <tr>

                <td colSpan={6} className="compras-vacio compras-celda-centro">

                  Cargando compras.

                </td>

              </tr>

            )}



            {!cargando && !error && compras.length === 0 && (

              <tr>

                <td colSpan={6} className="compras-vacio compras-celda-centro">

                  No hay compras con estos filtros.

                </td>

              </tr>

            )}



            {compras.map((compra) => {

              const Icono = ICONO_ESTADO[compra.estado] || FileText



              return (

                <tr key={compra.id}>

                  <td>

                    <span className="compras-codigo">{formatearCodigo(compra)}</span>

                  </td>

                  <td>

                    <span className="compras-proveedor">{compra.proveedor}</span>

                  </td>

                  <td>{formatearFecha(compra.fecha)}</td>

                  <td className="compras-numero">{formatearMoneda(compra.costo_original)}</td>

                  <td>

                    <span className={`compras-badge compras-badge--${slug(compra.estado)}`}>

                      <Icono size={14} />

                      {compra.estado}

                    </span>

                  </td>

                  <td className="col-acciones">

                    <div className="compras-acciones">

                      <button type="button" className="compras-accion" onClick={() => abrirDetalle(compra.id)} title="Ver" aria-label="Ver">

                        <Eye size={16} />

                      </button>

                      {puedeActualizar && compra.estado === 'Borrador' && (

                        <button type="button" className="compras-accion" onClick={() => abrirEdicion(compra.id)} title="Editar" aria-label="Editar">

                          <Pencil size={16} />

                        </button>

                      )}

                      {compra.estado === 'Borrador' && (

                        <button type="button" className="compras-accion" onClick={() => confirmar(compra)} title="Confirmar" aria-label="Confirmar">

                          <Check size={16} />

                        </button>

                      )}

                      {(compra.estado === 'Confirmada' || compra.estado === 'Parcialmente recibida') && (

                        <button type="button" className="compras-accion" onClick={() => {

                          setAccionError('')

                          obtenerCompraAdmin(compra.id)

                            .then((datos) => setModalRecepcion({

                              compra: datos,

                              cantidades: Object.fromEntries((datos.detalles || []).map((d) => [
                                d.id_detalle,
                                Math.max(0, (Number(d.cantidad_solicitada) || 0) - (Number(d.cantidad_recibida) || 0))
                              ])),

                              clave: crypto.randomUUID()

                            }))

                            .catch((err) => setAccionError(err.message || 'No se pudo cargar la compra'))

                        }} title="Registrar recepción" aria-label="Registrar recepción">

                          <Package size={16} />

                        </button>

                      )}

                      {(compra.estado === 'Recibida' || compra.estado === 'Parcialmente recibida') && (

                        <>

                          <button type="button" className="compras-accion" onClick={() => { setAccionError(''); setModalPago({ compra, monto: '' }) }} title="Registrar pago" aria-label="Registrar pago">

                            <DollarSign size={16} />

                          </button>

                          <button type="button" className="compras-accion" onClick={() => aplicarSaldo(compra)} title="Aplicar saldo" aria-label="Aplicar saldo">

                            <Wallet size={16} />

                          </button>

                          {(compra.estado === 'Parcialmente recibida' || Number(compra.saldo_pendiente) <= 0) && (

                            <button type="button" className="compras-accion" onClick={() => cerrar(compra)} title="Cerrar" aria-label="Cerrar">

                              <Lock size={16} />

                            </button>

                          )}

                        </>

                      )}

                      {puedeAnular && (compra.estado === 'Borrador' || compra.estado === 'Confirmada' || compra.estado === 'Parcialmente recibida' || compra.estado === 'Recibida') && (

                        <button type="button" className="compras-accion compras-accion--peligro" onClick={() => anular(compra)} title="Anular" aria-label="Anular">

                          <Ban size={16} />

                        </button>

                      )}

                    </div>

                  </td>

                </tr>

              )

            })}

          </tbody>

        </table>

      </div>



      {paginas > 1 && (

        <Pagination

          currentPage={pagina}

          totalPages={paginas}

          onPageChange={setPagina}

        />

      )}



      {formulario && (

        <CompraFormulario

          compraInicial={formulario.compra}

          user={user}

          onCerrar={() => setFormulario(null)}

          onGuardada={() => {

            setFormulario(null)

            setRecarga((n) => n + 1)

          }}

        />

      )}



      {detalle && (

        <div className="compras-modal-overlay" onClick={() => setDetalle(null)}>

          <div

            className="compras-modal"

            role="dialog"

            aria-modal="true"

            aria-label="Detalle de compra"

            onClick={(e) => e.stopPropagation()}

          >

            <header className="compras-modal-header">

              <h3>{d ? formatearCodigo(d) : 'Compra'}</h3>

              <button

                type="button"

                className="compras-modal-close"

                onClick={() => setDetalle(null)}

                aria-label="Cerrar"

              >

                <X size={18} />

              </button>

            </header>



            <div className="compras-modal-body">

              {detalle.cargando && <p className="compras-vacio">Cargando compra.</p>}

              {detalle.error && <div className="compras-error">{detalle.error}</div>}



              {d && (

                <>

                  <div className="compras-detalle-encabezado">

                    <span className={`compras-badge compras-badge--${slug(d.estado)}`}>

                      {d.estado}

                    </span>

                    <span className="compras-secundario">Fecha {formatearFecha(d.fecha)}</span>

                  </div>



                  <h4 className="compras-seccion-titulo">Datos generales</h4>

                  <div className="compras-grid">

                    <div className="compras-dato">

                      <span>Proveedor</span>

                      <strong>{d.proveedor?.nombre || '—'}</strong>

                    </div>

                    <div className="compras-dato">

                      <span>Documento</span>

                      <strong>

                        {d.proveedor?.tipo_documento

                          ? `${d.proveedor.tipo_documento} ${d.proveedor.documento}`

                          : d.proveedor?.documento || '—'}

                      </strong>

                    </div>

                    <div className="compras-dato">

                      <span>Contacto</span>

                      <strong>

                        {d.proveedor?.contacto || '—'}

                        {d.proveedor?.telefono && (

                          <small className="compras-secundario">{d.proveedor.telefono}</small>

                        )}

                      </strong>

                    </div>

                    <div className="compras-dato">

                      <span>Registrada por</span>

                      <strong>

                        {d.registrado_por_nombre || '—'}

                        <small className="compras-secundario">{formatearFechaHora(d.creado_en)}</small>

                      </strong>

                    </div>

                    <div className="compras-dato">

                      <span>Cerrada</span>

                      <strong>{formatearFechaHora(d.cerrado_en)}</strong>

                    </div>

                    <div className="compras-dato">

                      <span>Observaciones</span>

                      <strong>{d.observaciones || '—'}</strong>

                    </div>

                  </div>



                  <h4 className="compras-seccion-titulo">Resumen de pago</h4>

                  <div className="compras-grid">

                    <div className="compras-dato">

                      <span>Costo original</span>

                      <strong>{formatearMoneda(d.resumen.costo_original)}</strong>

                    </div>

                    <div className="compras-dato">

                      <span>Costo final</span>

                      <strong>{formatearMoneda(d.resumen.costo_final)}</strong>

                    </div>

                    <div className="compras-dato">

                      <span>Valor pagado</span>

                      <strong>{formatearMoneda(d.resumen.valor_pagado)}</strong>

                    </div>

                    <div className="compras-dato">

                      <span>Saldo aplicado</span>

                      <strong>{formatearMoneda(d.resumen.saldo_aplicado)}</strong>

                    </div>

                    <div className="compras-dato">

                      <span>Cubierto</span>

                      <strong>{formatearMoneda(d.resumen.valor_cubierto)}</strong>

                    </div>

                    <div className="compras-dato">

                      <span>Saldo pendiente</span>

                      <strong>{formatearMoneda(d.resumen.saldo_pendiente)}</strong>

                    </div>

                    <div className="compras-dato">

                      <span>Estado de pago</span>

                      <strong>

                        <span className={`compras-badge compras-badge--pago-${slug(d.resumen.estado_pago)}`}>

                          {d.resumen.estado_pago}

                        </span>

                      </strong>

                    </div>

                    <div className="compras-dato">

                      <span>Saldo a favor de esta compra</span>

                      <strong>

                        {formatearMoneda(d.resumen.saldo_a_favor_relacionado)}

                        <small className="compras-secundario">Generado y aún no aplicado</small>

                      </strong>

                    </div>

                    <div className="compras-dato">

                      <span>Saldo disponible del proveedor</span>

                      <strong>{formatearMoneda(d.resumen.saldo_disponible_proveedor)}</strong>

                    </div>

                  </div>



                  <h4 className="compras-seccion-titulo">Líneas de la compra</h4>

                  <div className="compras-tabla-scroll">

                    <table className="compras-detalle-tabla">

                      <thead>

                        <tr>

                          <th>Producto</th>

                          <th>Código</th>

                          <th>Solicitada</th>

                          <th>Recibida</th>

                          <th>Cancelada</th>

                          <th>Pendiente</th>

                          <th>Costo unit.</th>

                          <th>Subtotal</th>

                        </tr>

                      </thead>

                      <tbody>

                        {d.detalles.map((linea) => (

                          <tr key={linea.id_detalle}>

                            <td>

                              {textoProducto(linea)}

                              {linea.motivo_cancelacion && (

                                <span className="compras-motivo">

                                  Motivo: {linea.motivo_cancelacion}

                                </span>

                              )}

                            </td>

                            <td>{linea.codigo}</td>

                            <td>{linea.cantidad_solicitada}</td>

                            <td>{linea.cantidad_recibida}</td>

                            <td>{linea.cantidad_cancelada}</td>

                            <td>{linea.cantidad_pendiente}</td>

                            <td>{formatearMoneda(linea.costo_unitario)}</td>

                            <td>{formatearMoneda(linea.subtotal_solicitado)}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>



                  <h4 className="compras-seccion-titulo">Recepciones</h4>

                  {d.recepciones.length === 0 && (

                    <p className="compras-vacio">Sin recepciones.</p>

                  )}

                  {d.recepciones.map((recepcion) => (

                    <div key={recepcion.id_recepcion} className="compras-recepcion">

                      <div className="compras-recepcion-cabecera">

                        Recepción #{recepcion.id_recepcion} · {formatearFecha(recepcion.fecha_recepcion)}

                        {' · '}

                        {recepcion.recibido_por_nombre || '—'}

                      </div>

                      {recepcion.observaciones && (

                        <p className="compras-texto-secundario">{recepcion.observaciones}</p>

                      )}

                      <div className="compras-tabla-scroll">

                        <table className="compras-detalle-tabla">

                          <thead>

                            <tr>

                              <th>Producto</th>

                              <th>Cantidad recibida</th>

                            </tr>

                          </thead>

                          <tbody>

                            {recepcion.detalles.map((linea) => (

                              <tr key={linea.id_detalle_recepcion}>

                                <td>{textoProducto(linea)}</td>

                                <td>{linea.cantidad_recibida}</td>

                              </tr>

                            ))}

                          </tbody>

                        </table>

                      </div>

                    </div>

                  ))}

                  <h4 className="compras-seccion-titulo">Pagos registrados</h4>

                  {(!d.pagos || d.pagos.length === 0) ? (
                    <p className="compras-vacio">Sin pagos registrados.</p>
                  ) : (
                    <div className="compras-tabla-scroll">
                      <table className="compras-detalle-tabla">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Monto</th>
                            <th>Registrado por</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.pagos.map((pago) => (
                            <tr key={pago.id_pago}>
                              <td>{formatearFechaHora(pago.fecha_pago)}</td>
                              <td>{formatearMoneda(pago.monto)}</td>
                              <td>{pago.registrado_por_nombre || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}



                  <h4 className="compras-seccion-titulo">Movimientos de saldo a favor</h4>

                  {d.movimientos_saldo.length === 0 ? (

                    <p className="compras-vacio">Sin movimientos de saldo.</p>

                  ) : (

                    <div className="compras-tabla-scroll">

                      <table className="compras-detalle-tabla">

                        <thead>

                          <tr>

                            <th>Tipo</th>

                            <th>Monto</th>

                            <th>Compra origen</th>

                            <th>Compra destino</th>

                            <th>Fecha</th>

                            <th>Registrado por</th>

                          </tr>

                        </thead>

                        <tbody>

                          {d.movimientos_saldo.map((mov) => (

                            <tr key={mov.id_movimiento}>

                              <td>{mov.tipo}</td>

                              <td>{formatearMoneda(mov.monto)}</td>

                              <td>{mov.compra_origen_codigo || '—'}</td>

                              <td>{mov.compra_destino_codigo || '—'}</td>

                              <td>{formatearFechaHora(mov.creado_en)}</td>

                              <td>{mov.registrado_por_nombre || '—'}</td>

                            </tr>

                          ))}

                        </tbody>

                      </table>

                    </div>

                  )}

                </>

              )}

            </div>

          </div>

        </div>

      )}

    </div>



    {modalRecepcion && (

      <div className="compras-modal-overlay" onClick={() => setModalRecepcion(null)}>

        <div className="compras-modal compras-modal--recepcion" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>

          <header className="compras-modal-header">

            <h3>Registrar recepción</h3>

            <button type="button" className="compras-modal-close" onClick={() => setModalRecepcion(null)} aria-label="Cerrar">

              <X size={18} />

            </button>

          </header>

          <div className="compras-modal-body">

            {accionError && <p className="compras-error">{accionError}</p>}

            {(modalRecepcion.compra.detalles || []).length === 0 && (

              <p className="compras-vacio">Sin líneas para recibir.</p>

            )}

            {(modalRecepcion.compra.detalles || []).map((d) => (

              <div key={d.id_detalle} className="compras-recepcion-fila">

                <span className="compras-recepcion-producto">{d.producto} · {d.talla || '—'} · {d.color || '—'}</span>

                <span>Pedida: {d.cantidad_solicitada}</span>

                <span>Pendiente: {d.cantidad_pendiente}</span>

                <input

                  className="compras-input-numero"

                  type="number"

                  min="0"

                  max={d.cantidad_pendiente}

                  value={modalRecepcion.cantidades[d.id_detalle] ?? ''}

                  onChange={(e) => setModalRecepcion((m) => ({ ...m, cantidades: { ...m.cantidades, [d.id_detalle]: e.target.value } }))}

                />

              </div>

            ))}

          </div>

          <footer className="compras-form-footer">

            <button type="button" className="compras-btn-secundario" onClick={() => setModalRecepcion(null)}>Cancelar</button>

            <button type="button" className="compras-btn-dorado" onClick={() => {

              const detalles = modalRecepcion.compra.detalles || []
              for (const d of detalles) {
                const pendiente = Math.max(0, (Number(d.cantidad_solicitada) || 0) - (Number(d.cantidad_recibida) || 0))
                const recibida = Number(modalRecepcion.cantidades[d.id_detalle] ?? 0)
                if (recibida > pendiente) {
                  setAccionError('Cada cantidad recibida debe ser menor o igual a la cantidad pendiente.')
                  return
                }
              }

              const items = detalles

                .map((d) => ({

                  id_detalle: d.id_detalle,

                  cantidad_recibida: Number(modalRecepcion.cantidades[d.id_detalle] ?? 0)

                }))

                .filter((it) => it.cantidad_recibida > 0)

              if (items.length === 0) {

                setAccionError('La recepción debe incluir al menos una línea')

                return

              }

              registrarRecepcionCompraAdmin(modalRecepcion.compra.id, { items, clave_idempotencia: modalRecepcion.clave })

                .then(() => { setModalRecepcion(null); setRecarga((n) => n + 1) })

                .catch((err) => setAccionError(err.message || 'No se pudo registrar la recepción'))

            }}>Confirmar recepción</button>

          </footer>

        </div>

      </div>

    )}



    {modalPago && (

      <div className="compras-modal-overlay" onClick={() => setModalPago(null)}>

        <div className="compras-modal compras-modal--pago" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>

          <header className="compras-modal-header">

            <h3>Registrar pago</h3>

            <button type="button" className="compras-modal-close" onClick={() => setModalPago(null)} aria-label="Cerrar">

              <X size={18} />

            </button>

          </header>

          <div className="compras-modal-body">

            {accionError && <p className="compras-error">{accionError}</p>}

            <div className="compras-campo">
              <label htmlFor="compras-monto-pago">Monto</label>
              <input
                id="compras-monto-pago"
                className="compras-input-numero compras-input-moneda"
                type="text"
                inputMode="numeric"
                value={modalPago.monto}
                onChange={(e) => setModalPago((m) => ({ ...m, monto: e.target.value }))}
                placeholder="0"
              />
            </div>

          </div>

          <footer className="compras-form-footer">

            <button type="button" className="compras-btn-secundario" onClick={() => setModalPago(null)}>Cancelar</button>

            <button type="button" className="compras-btn-dorado" onClick={() => {

              const montoLimpio = String(modalPago.monto ?? '').replace(/[.\s]/g, '')
              const monto = Number(montoLimpio)
              if (!montoLimpio || !Number.isFinite(monto) || monto <= 0) {
                setAccionError('Ingresa un monto válido')
                return
              }
              setAccionError('')
              registrarPagoCompraAdmin(modalPago.compra.id, { monto })

                .then(() => { setModalPago(null); setRecarga((n) => n + 1) })

                .catch((err) => setAccionError(err.message || 'No se pudo registrar el pago'))

            }}>Confirmar pago</button>

          </footer>

        </div>

      </div>

    )}

    {modalAplicarSaldo && (

      <div className="compras-modal-overlay" onClick={() => setModalAplicarSaldo(null)}>

        <div className="compras-modal compras-modal--pago" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>

          <header className="compras-modal-header">

            <h3>Aplicar saldo</h3>

            <button type="button" className="compras-modal-close" onClick={() => setModalAplicarSaldo(null)} aria-label="Cerrar">

              <X size={18} />

            </button>

          </header>

          <div className="compras-modal-body">

            {accionError && <p className="compras-error">{accionError}</p>}

            <div className="compras-campo">
              <label htmlFor="compras-monto-aplicar-saldo">Monto</label>
              <input
                id="compras-monto-aplicar-saldo"
                className="compras-input-numero compras-input-moneda"
                type="text"
                inputMode="numeric"
                value={modalAplicarSaldo.monto}
                onChange={(e) => setModalAplicarSaldo((m) => ({ ...m, monto: e.target.value }))}
                placeholder="0"
              />
            </div>

          </div>

          <footer className="compras-form-footer">

            <button type="button" className="compras-btn-secundario" onClick={() => setModalAplicarSaldo(null)}>Cancelar</button>

            <button type="button" className="compras-btn-dorado" onClick={() => {

              const montoLimpio = String(modalAplicarSaldo.monto ?? '').replace(/[.\s]/g, '')
              const monto = Number(montoLimpio)
              const saldoDisponible = Number(modalAplicarSaldo.compra?.resumen?.saldo_disponible_proveedor ?? 0)
              const saldoPendiente = Number(modalAplicarSaldo.compra?.resumen?.saldo_pendiente ?? 0)

              if (!montoLimpio || !Number.isFinite(monto) || monto <= 0) {
                setAccionError('Ingresa un monto mayor que 0.')
                return
              }
              if (monto > saldoDisponible) {
                setAccionError('El monto no puede superar el saldo disponible del proveedor.')
                return
              }
              if (monto > saldoPendiente) {
                setAccionError('El monto no puede superar el saldo pendiente de la compra.')
                return
              }

              setAccionError('')
              aplicarSaldoCompraAdmin(modalAplicarSaldo.compra.id, {
                monto,
                clave_idempotencia: modalAplicarSaldo.clave
              })

                .then(() => { setModalAplicarSaldo(null); setRecarga((n) => n + 1) })

                .catch((err) => setAccionError(err.message || 'No se pudo aplicar el saldo'))

            }}>Aplicar saldo</button>

          </footer>

        </div>

      </div>

    )}


    <ConfirmarModal
      abierto={Boolean(confirmarAccion)}
      titulo={
        confirmarAccion?.tipo === 'cerrar'
          ? 'Cerrar compra'
          : confirmarAccion?.tipo === 'confirmar'
            ? 'Confirmar compra'
            : 'Anular compra'
      }
      mensaje={
        confirmarAccion?.tipo === 'cerrar'
          ? '¿Cerrar esta compra? Ya no se podrá modificar.'
          : confirmarAccion?.tipo === 'confirmar'
            ? '¿Confirmar esta compra?'
            : confirmarAccion
              ? `¿Anular la compra ${formatearCodigo(confirmarAccion.compra)}? El historial se conserva.`
              : ''
      }
      textoConfirmar={
        confirmarAccion?.tipo === 'cerrar'
          ? 'Cerrar compra'
          : confirmarAccion?.tipo === 'confirmar'
            ? 'Confirmar'
            : 'Anular compra'
      }
      textoCancelar="Cancelar"
      peligro={confirmarAccion?.tipo === 'anular'}
      onCancelar={() => setConfirmarAccion(null)}
      onConfirmar={() => {
        const accion = confirmarAccion
        setConfirmarAccion(null)
        if (!accion) return

        if (accion.tipo === 'cerrar') {
          ejecutarAccionCompra(
            () => cerrarCompraAdmin(accion.compra.id),
            'No se pudo cerrar la compra'
          )
          return
        }

        if (accion.tipo === 'confirmar') {
          ejecutarAccionCompra(
            () => confirmarCompraAdmin(accion.compra.id),
            'No se pudo confirmar la compra'
          )
          return
        }

        if (accion.tipo === 'anular') {
          setAccionError('')
          anularCompraAdmin(accion.compra.id)
            .then(() => setRecarga((n) => n + 1))
            .catch((err) => setAccionError(err.message || 'No se pudo anular la compra'))
        }
      }}
    />



    </>

  )

}

