import { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  ClipboardList,
  Users,
  Wallet,
  Truck,
  CreditCard,
  TrendingUp,
  Package,
  AlertTriangle
} from "lucide-react";

import { obtenerDashboard } from "../../../shared/services/api";
import { tienePermiso } from "../utils/permisos";

import "./Dashboard.css";

/* =====================================================
   AYUDAS DE FECHAS (YYYY-MM-DD, horario local)
   ===================================================== */

const aISO = (fecha) => {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
};

const hoyISO = () => aISO(new Date());

const haceDiasISO = (dias) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return aISO(fecha);
};

const primerDiaMesISO = () => {
  const fecha = new Date();
  return aISO(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
};

const ultimoDiaMesISO = () => {
  const fecha = new Date();
  return aISO(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0));
};

const diaVisible = (fecha) => {
  const partes = String(fecha || "").split("-");
  if (partes.length !== 3) return "—";
  return `${partes[2]}/${partes[1]}`;
};

const fechaDesdeISO = (iso) => {
  const partes = String(iso || "").split("-").map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return null;
  return new Date(partes[0], partes[1] - 1, partes[2]);
};

const formatoFechaLarga = (iso) => {
  const fecha = fechaDesdeISO(iso);
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(fecha);
};

const formatoFechaCorta = (iso) => {
  const fecha = fechaDesdeISO(iso);
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short"
  }).format(fecha);
};

const inicioDeSemanaISO = (iso) => {
  const fecha = fechaDesdeISO(iso);
  if (!fecha) return iso;
  const diaSemana = (fecha.getDay() + 6) % 7;
  fecha.setDate(fecha.getDate() - diaSemana);
  return aISO(fecha);
};

const mostrarEtiqueta = (indice, total) => {
  if (total <= 7) return true;
  if (total <= 15) return indice % 2 === 0 || indice === total - 1;
  return indice % 5 === 0 || indice === 0 || indice === total - 1;
};

const LIMITE_AGRUPACION_SEMANAL = 45;

/* =====================================================
   FORMATO DE CIFRAS (COP y porcentajes)
   ===================================================== */

const formatoCOP = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(valor) || 0);

const formatoCompacto = (valor) => {
  const total = Number(valor) || 0;

  if (total >= 1000000) {
    return `$${(total / 1000000).toLocaleString("es-CO", {
      maximumFractionDigits: 1
    })}M`;
  }

  if (total >= 1000) {
    return `$${Math.round(total / 1000)}k`;
  }

  return formatoCOP(total);
};

const formatoPorcentaje = (parte, total) => {
  if (!total) return "0%";
  return `${Math.round((parte / total) * 100)}%`;
};

/* =====================================================
   ATAJOS DEL FILTRO DE FECHAS
   ===================================================== */

const ATAJOS = [
  { id: "hoy", nombre: "Hoy" },
  { id: "7", nombre: "7 días" },
  { id: "mes", nombre: "Este mes" },
  { id: "custom", nombre: "Personalizado" }
];

const rangoDeAtajo = (id) => {
  switch (id) {
    case "hoy":
      return { desde: hoyISO(), hasta: hoyISO() };
    case "7":
      return { desde: haceDiasISO(6), hasta: hoyISO() };
    case "mes":
      return { desde: primerDiaMesISO(), hasta: ultimoDiaMesISO() };
    default:
      return null;
  }
};

const ESTADOS_DE_PEDIDO = [
  "Registrado",
  "En preparación",
  "Despachado",
  "Entregado",
  "Cancelado"
];

const GRUPOS_DE_PAGO = [
  { clave: "efectivo", nombre: "Efectivo" },
  { clave: "transferencia", nombre: "Transferencia" },
  { clave: "contraEntrega", nombre: "Contra entrega" },
  { clave: "otros", nombre: "Otros" }
];

export default function Dashboard({ user }) {

  /* =====================================================
     PERMISOS
     ===================================================== */

  const puedeConsultar = tienePermiso(user, "Dashboard", "Consultar");

  /* =====================================================
     FILTRO DE FECHAS
     ===================================================== */

  const [atajo, setAtajo] = useState("mes");
  const [desde, setDesde] = useState(primerDiaMesISO);
  const [hasta, setHasta] = useState(ultimoDiaMesISO);
  const [errorFechas, setErrorFechas] = useState("");

  const aplicarAtajo = (id) => {
    setAtajo(id);

    if (id === "custom") return;

    const rango = rangoDeAtajo(id);
    if (!rango) return;

    setDesde(rango.desde);
    setHasta(rango.hasta);
    setErrorFechas("");
    setCargando(true);
    setError(null);
  };

  const cambiarDesde = (valor) => {
    setAtajo("custom");
    setDesde(valor);

    if (valor > hasta) {
      setErrorFechas("La fecha desde no puede ser mayor que la fecha hasta.");
    } else {
      setErrorFechas("");
      setCargando(true);
      setError(null);
    }
  };

  const cambiarHasta = (valor) => {
    setAtajo("custom");
    setHasta(valor);

    if (desde > valor) {
      setErrorFechas("La fecha desde no puede ser mayor que la fecha hasta.");
    } else {
      setErrorFechas("");
      setCargando(true);
      setError(null);
    }
  };

  /* =====================================================
     DATOS DEL SERVIDOR
     ===================================================== */

  const [datos, setDatos] = useState(null);
  const [tooltipIndice, setTooltipIndice] = useState(null);
  // Arranca cargando solo si el usuario tiene permiso de consulta: sin él la
  // pantalla muestra el aviso de permisos desde el primer render.
  const [cargando, setCargando] = useState(() =>
    tienePermiso(user, "Dashboard", "Consultar")
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!puedeConsultar || errorFechas) return undefined;

    let activo = true;

    obtenerDashboard(desde, hasta)
      .then((respuesta) => {
        if (!activo) return;

        setDatos(respuesta);
        setError(null);
      })
      .catch((err) => {
        if (!activo) return;

        setError(err);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [puedeConsultar, errorFechas, desde, hasta]);

  /* =====================================================
     DERIVADOS DE PRESENTACIÓN
     ===================================================== */

  const ingresos = datos?.ingresos ?? { total: 0, cantidad: 0 };
  const ventasPorDia = datos?.ventasPorDia ?? [];
  const pedidos = datos?.pedidos ?? { estados: {}, total: 0 };
  const abonos = datos?.abonos ?? { saldoPendiente: 0, pedidosConSaldo: 0 };
  const domicilios = datos?.domicilios ?? { pendientes: 0, enCamino: 0 };
  const productosTop = datos?.productosTop ?? [];
  const inventario = datos?.inventario ?? {
    disponible: 0,
    bajo: 0,
    agotado: 0
  };
  const gruposPago = datos?.metodosPago ?? {};
  const clientesActivos = datos?.clientesActivos ?? 0;

  const diasGrafico = ventasPorDia.length;

  const ventasGrafico =
    diasGrafico > LIMITE_AGRUPACION_SEMANAL
      ? (() => {
          const semanas = new Map();

          ventasPorDia.forEach((venta) => {
            const inicio = inicioDeSemanaISO(venta.fecha);

            if (!semanas.has(inicio)) {
              semanas.set(inicio, {
                esSemana: true,
                fecha: inicio,
                fechaFin: venta.fecha,
                total: 0
              });
            }

            const semana = semanas.get(inicio);
            semana.total += venta.total || 0;
            semana.fechaFin = venta.fecha;
          });

          return Array.from(semanas.values());
        })()
      : ventasPorDia.map((venta) => ({ esSemana: false, ...venta }));

  const maxVentaDia = Math.max(
    0,
    ...ventasGrafico.map((venta) => venta.total || 0)
  );

  const maxVentaDiaIndice =
    maxVentaDia > 0
      ? ventasGrafico.findIndex((venta) => (venta.total || 0) === maxVentaDia)
      : -1;

  const maxProducto = Math.max(0, ...productosTop.map((p) => p.cantidad || 0));

  const ventasPagadasTotales = GRUPOS_DE_PAGO.reduce(
    (suma, grupo) => suma + (gruposPago[grupo.clave]?.cantidad || 0),
    0
  );

  const sinDatos =
    datos &&
    !errorFechas &&
    ingresos.cantidad === 0 &&
    pedidos.total === 0;

  const mensajeError = () => {
    if (error?.status === 403) return "No tienes permisos";
    if (!error?.status) {
      return "Sin conexión. Revisa tu red e intenta de nuevo.";
    }
    return error?.message || "No se pudo cargar el dashboard";
  };

  /* =====================================================
     TARJETAS
     ===================================================== */

  const indicadores = [
    {
      titulo: "Ingresos",
      valor: cargando ? "—" : formatoCOP(ingresos.total),
      descripcion: "Ventas pagadas del rango",
      icono: DollarSign
    },
    {
      titulo: "Ventas",
      valor: cargando ? "—" : String(ingresos.cantidad),
      descripcion: "Ventas pagadas",
      icono: ShoppingCart
    },
    {
      titulo: "Pedidos",
      valor: cargando ? "—" : String(pedidos.total),
      descripcion: "Pedidos del rango",
      icono: ClipboardList
    },
    {
      titulo: "Clientes",
      valor: cargando ? "—" : String(clientesActivos),
      descripcion: "Clientes activos",
      icono: Users
    },
    {
      titulo: "Saldo de abonos",
      valor: cargando ? "—" : formatoCOP(abonos.saldoPendiente),
      descripcion: `${abonos.pedidosConSaldo} pedidos con saldo pendiente`,
      icono: Wallet
    },
    {
      titulo: "Domicilios por entregar",
      valor: cargando
        ? "—"
        : String((domicilios.pendientes || 0) + (domicilios.enCamino || 0)),
      descripcion: `Pendientes: ${domicilios.pendientes} · En camino: ${domicilios.enCamino}`,
      icono: Truck
    }
  ];

  return (
    <div className="dashboard-page">

      {/* =========================================
          ENCABEZADO
          ========================================= */}

      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Dashboard</h2>

          <p>
            Visualiza y analiza la información general de Store La Mansión.
          </p>
        </div>
      </div>


      {/* =========================================
          FILTRO DE FECHAS
          ========================================= */}

      <div className="dashboard-filters">

        <div className="dashboard-filter-shortcuts">

          {ATAJOS.map((item) => (
            <button
              type="button"
              className={
                atajo === item.id
                  ? "dashboard-filter-button dashboard-filter-button-active"
                  : "dashboard-filter-button"
              }
              key={item.id}
              onClick={() => aplicarAtajo(item.id)}
            >
              {item.nombre}
            </button>
          ))}

        </div>


        <div className="dashboard-filter-dates">

          <label className="dashboard-filter-date">
            <span>Desde</span>
            <input
              type="date"
              value={desde}
              max={hasta}
              onChange={(e) => cambiarDesde(e.target.value)}
            />
          </label>

          <label className="dashboard-filter-date">
            <span>Hasta</span>
            <input
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => cambiarHasta(e.target.value)}
            />
          </label>

        </div>

      </div>

      {errorFechas && (
        <div className="dashboard-filter-error">{errorFechas}</div>
      )}


      {/* =========================================
          PERMISOS / ERRORES / CARGA
          ========================================= */}

      {!puedeConsultar ? (
        <div className="dashboard-permiso">No tienes permisos</div>
      ) : errorFechas ? null : error?.status === 403 ? (
        <div className="dashboard-permiso">No tienes permisos</div>
      ) : error ? (
        <div className="dashboard-error">{mensajeError()}</div>
      ) : cargando && !datos ? (
        <div className="dashboard-cargando">Cargando dashboard...</div>
      ) : (
        <>
          {sinDatos && (
            <div className="dashboard-empty">
              No hay datos en el rango seleccionado.
            </div>
          )}


          {/* =========================================
              INDICADORES
              ========================================= */}

          <div className="dashboard-indicators">

            {indicadores.map((item) => {
              const Icon = item.icono;

              return (
                <div
                  className="dashboard-indicator"
                  key={item.titulo}
                >
                  <div className="dashboard-indicator-icon">
                    <Icon size={21} />
                  </div>

                  <div className="dashboard-indicator-info">
                    <span>{item.titulo}</span>

                    <strong>{item.valor}</strong>

                    <small>{item.descripcion}</small>
                  </div>
                </div>
              );
            })}

          </div>


          {/* =========================================
              FILA PRINCIPAL DE GRÁFICOS
              ========================================= */}

          <div className="dashboard-grid">

            {/* VENTAS POR DÍA */}

            <div className="dashboard-panel dashboard-sales-panel">

              <div className="dashboard-panel-header">
                <div>
                  <h3>Ventas</h3>

                  <p>
                    Ventas pagadas por día
                    {` (${diaVisible(desde)} - ${diaVisible(hasta)})`}
                  </p>
                </div>

                <TrendingUp
                  size={21}
                  className="dashboard-panel-icon"
                />
              </div>


              <div className="dashboard-chart">

                {maxVentaDia === 0 ? (
                  <div className="dashboard-panel-empty">
                    No hay ventas en el rango seleccionado.
                  </div>
                ) : (
                  <div
                    className="dashboard-chart-values"
                    onMouseLeave={() => setTooltipIndice(null)}
                  >

                    {ventasGrafico.map((venta, indice) => {
                      const esCero = !venta.total || venta.total <= 0;

                      const altura = esCero
                        ? 0
                        : Math.max(
                            (venta.total / maxVentaDia) * 100,
                            4
                          );

                      const esMaximo = indice === maxVentaDiaIndice;

                      const tooltipVisible = tooltipIndice === indice;

                      const etiquetaVisible = mostrarEtiqueta(
                        indice,
                        ventasGrafico.length
                      );

                      const anclajeTooltip = Math.min(altura, 78);

                      const clasesTooltip = [
                        "dashboard-tooltip",
                        indice === 0
                          ? "dashboard-tooltip-start"
                          : indice === ventasGrafico.length - 1
                            ? "dashboard-tooltip-end"
                            : ""
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <div
                          className="dashboard-bar-column"
                          key={venta.fecha}
                          onMouseEnter={() => setTooltipIndice(indice)}
                          onClick={() =>
                            setTooltipIndice((previo) =>
                              previo === indice ? null : indice
                            )
                          }
                        >

                          <div className="dashboard-bar-value">
                            {esMaximo ? formatoCompacto(venta.total) : ""}
                          </div>

                          <div className="dashboard-bar-area">

                            {tooltipVisible && (
                              <div
                                className={clasesTooltip}
                                style={{
                                  bottom: `calc(${anclajeTooltip}% + 6px)`
                                }}
                              >
                                <span>
                                  {venta.esSemana
                                    ? `Semana del ${formatoFechaCorta(
                                        venta.fecha
                                      )} al ${formatoFechaCorta(venta.fechaFin)}`
                                    : formatoFechaLarga(venta.fecha)}
                                </span>

                                <strong>
                                  {formatoCOP(venta.total)}
                                </strong>
                              </div>
                            )}

                            <div
                              className={
                                esCero
                                  ? "dashboard-bar dashboard-bar-flat"
                                  : "dashboard-bar"
                              }
                              style={{
                                height: esCero ? "4px" : `${altura}%`
                              }}
                            />

                          </div>

                          <span
                            className={
                              !etiquetaVisible
                                ? "dashboard-axis-label dashboard-axis-hidden"
                                : indice === 0
                                  ? "dashboard-axis-label dashboard-axis-start"
                                  : indice === ventasGrafico.length - 1
                                    ? "dashboard-axis-label dashboard-axis-end"
                                    : "dashboard-axis-label"
                            }
                          >
                            {diaVisible(venta.fecha)}
                          </span>

                        </div>
                      );
                    })}

                  </div>
                )}

              </div>

            </div>


            {/* PRODUCTOS MÁS VENDIDOS */}

            <div className="dashboard-panel">

              <div className="dashboard-panel-header">
                <div>
                  <h3>Productos más vendidos</h3>

                  <p>
                    Productos con mayor cantidad de ventas pagadas.
                  </p>
                </div>

                <Package
                  size={21}
                  className="dashboard-panel-icon"
                />
              </div>


              {productosTop.length === 0 ? (
                <div className="dashboard-panel-empty">
                  No hay productos vendidos en el rango seleccionado.
                </div>
              ) : (
                <div className="dashboard-products">

                  {productosTop.map((producto, index) => (

                    <div
                      className="dashboard-product"
                      key={producto.codigo || producto.nombre}
                    >

                      <div className="dashboard-product-number">
                        {index + 1}
                      </div>

                      <div className="dashboard-product-info">

                        <div className="dashboard-product-top">

                          <span>
                            {producto.nombre}
                          </span>

                          <strong>
                            {producto.cantidad}
                          </strong>

                        </div>

                        <div className="dashboard-progress">

                          <div
                            style={{
                              width: `${maxProducto
                                ? (producto.cantidad / maxProducto) * 100
                                : 0}%`
                            }}
                          />

                        </div>

                      </div>

                    </div>

                  ))}

                </div>
              )}

            </div>

          </div>


          {/* =========================================
              SEGUNDA FILA
              ========================================= */}

          <div className="dashboard-grid dashboard-grid-triple dashboard-grid-bottom">

            {/* MÉTODOS DE PAGO */}

            <div className="dashboard-panel">

              <div className="dashboard-panel-header">

                <div>
                  <h3>Métodos de pago</h3>

                  <p>
                    Distribución de las ventas pagadas según el método.
                  </p>
                </div>

                <CreditCard
                  size={21}
                  className="dashboard-panel-icon"
                />

              </div>


              {ventasPagadasTotales === 0 ? (
                <div className="dashboard-panel-empty">
                  No hay ventas en el rango seleccionado.
                </div>
              ) : (
                <div className="dashboard-payments">

                  {GRUPOS_DE_PAGO.map((grupo) => {
                    const datos = gruposPago[grupo.clave] || {
                      cantidad: 0,
                      total: 0
                    };

                    const porcentaje = formatoPorcentaje(
                      datos.cantidad,
                      ventasPagadasTotales
                    );

                    return (

                      <div
                        className="dashboard-payment"
                        key={grupo.nombre}
                      >

                        <div className="dashboard-payment-info">

                          <span>
                            {grupo.nombre}
                          </span>

                          <strong>
                            {porcentaje}
                          </strong>

                        </div>

                        <div className="dashboard-payment-bar">

                          <div
                            style={{
                              width: datos.cantidad
                                ? porcentaje
                                : "0%"
                            }}
                          />

                        </div>

                      </div>

                    );
                  })}

                </div>
              )}

            </div>


            {/* PEDIDOS POR ESTADO */}

            <div className="dashboard-panel">

              <div className="dashboard-panel-header">

                <div>
                  <h3>Pedidos por estado</h3>

                  <p>
                    Cantidad de pedidos en cada estado del rango.
                  </p>
                </div>

                <ClipboardList
                  size={21}
                  className="dashboard-panel-icon"
                />

              </div>


              {pedidos.total === 0 ? (
                <div className="dashboard-panel-empty">
                  No hay pedidos en el rango seleccionado.
                </div>
              ) : (
                <div className="dashboard-estados">

                  {ESTADOS_DE_PEDIDO.map((estado) => {
                    const cantidad = pedidos.estados[estado] || 0;

                    return (

                      <div
                        className="dashboard-estado"
                        key={estado}
                      >

                        <div className="dashboard-estado-info">

                          <span>
                            {estado}
                          </span>

                          <strong>
                            {cantidad}
                            <small>
                              {` (${formatoPorcentaje(cantidad, pedidos.total)})`}
                            </small>
                          </strong>

                        </div>

                        <div className="dashboard-estado-bar">

                          <div
                            style={{
                              width: cantidad
                                ? formatoPorcentaje(cantidad, pedidos.total)
                                : "0%"
                            }}
                          />

                        </div>

                      </div>

                    );
                  })}

                </div>
              )}

            </div>


            {/* INVENTARIO */}

            <div className="dashboard-panel">

              <div className="dashboard-panel-header">

                <div>
                  <h3>Estado del inventario</h3>

                  <p>
                    Productos que requieren atención.
                  </p>
                </div>

                <AlertTriangle
                  size={21}
                  className="dashboard-panel-icon"
                />

              </div>


              <div className="dashboard-inventory">

                <div className="dashboard-inventory-item">

                  <div>
                    <strong>{inventario.disponible}</strong>

                    <span>
                      Productos con stock disponible
                    </span>
                  </div>

                  <b className="inventory-ok">
                    Disponible
                  </b>

                </div>


                <div className="dashboard-inventory-item">

                  <div>
                    <strong>{inventario.bajo}</strong>

                    <span>
                      Productos con stock bajo
                    </span>
                  </div>

                  <b className="inventory-warning">
                    Stock bajo
                  </b>

                </div>


                <div className="dashboard-inventory-item">

                  <div>
                    <strong>{inventario.agotado}</strong>

                    <span>
                      Productos agotados
                    </span>
                  </div>

                  <b className="inventory-danger">
                    Agotado
                  </b>

                </div>

              </div>

            </div>

          </div>

        </>
      )}

    </div>
  );
}
