import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

import "./Dashboard.css";

export default function Dashboard() {
  const indicadores = [
    {
      titulo: "Ventas",
      valor: "$2.450.000",
      descripcion: "Ventas del mes",
      icono: DollarSign
    },
    {
      titulo: "Pedidos",
      valor: "32",
      descripcion: "Pedidos registrados",
      icono: ShoppingCart
    },
    {
      titulo: "Productos",
      valor: "156",
      descripcion: "Productos activos",
      icono: Package
    },
    {
      titulo: "Clientes",
      valor: "280",
      descripcion: "Clientes registrados",
      icono: Users
    }
  ];

  const ventas = [
    { mes: "Ene", valor: 1800000 },
    { mes: "Feb", valor: 2100000 },
    { mes: "Mar", valor: 1950000 },
    { mes: "Abr", valor: 2300000 },
    { mes: "May", valor: 2180000 },
    { mes: "Jun", valor: 2450000 }
  ];

  const productos = [
    { nombre: "Camisetas", cantidad: 48 },
    { nombre: "Tenis", cantidad: 35 },
    { nombre: "Gorras", cantidad: 28 },
    { nombre: "Relojes", cantidad: 22 },
    { nombre: "Sudaderas", cantidad: 18 }
  ];

  const metodosPago = [
    { nombre: "Efectivo", porcentaje: 40 },
    { nombre: "Transferencia", porcentaje: 35 },
    { nombre: "Nequi", porcentaje: 25 }
  ];

  const maxVenta = Math.max(...ventas.map((venta) => venta.valor));

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

        {/* VENTAS */}

        <div className="dashboard-panel dashboard-sales-panel">

          <div className="dashboard-panel-header">
            <div>
              <h3>Ventas</h3>

              <p>
                Comportamiento de las ventas durante los últimos meses.
              </p>
            </div>

            <TrendingUp
              size={21}
              className="dashboard-panel-icon"
            />
          </div>


          <div className="dashboard-chart">

            <div className="dashboard-chart-values">

              {ventas.map((venta) => {

                const altura =
                  (venta.valor / maxVenta) * 100;

                return (
                  <div
                    className="dashboard-bar-column"
                    key={venta.mes}
                  >

                    <div className="dashboard-bar-value">
                      ${(venta.valor / 1000000).toFixed(1)}M
                    </div>

                    <div className="dashboard-bar-area">

                      <div
                        className="dashboard-bar"
                        style={{
                          height: `${altura}%`
                        }}
                      />

                    </div>

                    <span>{venta.mes}</span>

                  </div>
                );
              })}

            </div>

          </div>

        </div>


        {/* PRODUCTOS MÁS VENDIDOS */}

        <div className="dashboard-panel">

          <div className="dashboard-panel-header">
            <div>
              <h3>Productos más vendidos</h3>

              <p>
                Productos con mayor cantidad de ventas.
              </p>
            </div>

            <Package
              size={21}
              className="dashboard-panel-icon"
            />
          </div>


          <div className="dashboard-products">

            {productos.map((producto, index) => (

              <div
                className="dashboard-product"
                key={producto.nombre}
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
                        width: `${(producto.cantidad / productos[0].cantidad) * 100}%`
                      }}
                    />

                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>


      {/* =========================================
          SEGUNDA FILA
          ========================================= */}

      <div className="dashboard-grid dashboard-grid-bottom">

        {/* MÉTODOS DE PAGO */}

        <div className="dashboard-panel">

          <div className="dashboard-panel-header">

            <div>
              <h3>Métodos de pago</h3>

              <p>
                Distribución de las ventas según el método utilizado.
              </p>
            </div>

            <CreditCard
              size={21}
              className="dashboard-panel-icon"
            />

          </div>


          <div className="dashboard-payments">

            {metodosPago.map((metodo) => (

              <div
                className="dashboard-payment"
                key={metodo.nombre}
              >

                <div className="dashboard-payment-info">

                  <span>
                    {metodo.nombre}
                  </span>

                  <strong>
                    {metodo.porcentaje}%
                  </strong>

                </div>

                <div className="dashboard-payment-bar">

                  <div
                    style={{
                      width: `${metodo.porcentaje}%`
                    }}
                  />

                </div>

              </div>

            ))}

          </div>

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
                <strong>138</strong>

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
                <strong>18</strong>

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
                <strong>4</strong>

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

    </div>
  );
}