import "./Abonos.css";

const formatearPrecio = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(valor) || 0);

const formatearFechaHora = (valor) => {
  if (!valor) return "—";

  const fecha = new Date(String(valor).replace(" ", "T"));

  if (Number.isNaN(fecha.getTime())) {
    return String(valor);
  }

  return fecha.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short"
  });
};

/* =========================================================
   TABLA DE MOVIMIENTOS DE ABONOS
   La usan la ventana "Ver abonos" del módulo Abonos y la
   sección "Pagos" del detalle del pedido. Recibe el
   historial tal como lo devuelve GET /api/pedidos/:id/abonos
   (el más reciente primero) y pinta cada movimiento con su
   fecha y hora, valor, método, referencia o comprobante,
   usuario y observación.
   ========================================================= */

export default function HistorialAbonos({ abonos, className = "" }) {

  const movimientos = Array.isArray(abonos) ? abonos : [];

  if (movimientos.length === 0) {
    return (
      <div className="abonos-historial-vacio">
        Sin movimientos registrados.
      </div>
    );
  }

  return (
    <div className={`abonos-historial ${className}`.trim()}>
      <table className="abonos-historial-table">
        <thead>
          <tr>
            <th>FECHA Y HORA</th>
            <th>VALOR</th>
            <th>MÉTODO</th>
            <th>REFERENCIA</th>
            <th>USUARIO</th>
            <th>OBSERVACIÓN</th>
          </tr>
        </thead>

        <tbody>
          {movimientos.map((abono) => (
            <tr key={abono.id ?? `${abono.fecha_hora ?? abono.fecha}-${abono.monto}`}>

              <td>
                <span className="abonos-historial-fecha">
                  {formatearFechaHora(abono.fecha_hora || abono.fecha)}
                </span>
              </td>

              <td>
                <strong className="abonos-historial-valor">
                  {formatearPrecio(abono.monto)}
                </strong>
              </td>

              <td>
                <span
                  className={
                    abono.metodo === "Efectivo"
                      ? "abonos-metodo efectivo"
                      : "abonos-metodo transferencia"
                  }
                >
                  {abono.metodo || "—"}
                </span>
              </td>

              <td>
                <div className="abonos-historial-referencia">
                  {abono.referencia ? (
                    <span>{abono.referencia}</span>
                  ) : abono.id_comprobante ? (
                    <span>
                      Comprobante{" "}
                      {String(abono.id_comprobante).slice(0, 8)}
                    </span>
                  ) : (
                    <span className="abonos-historial-sin-referencia">
                      —
                    </span>
                  )}
                </div>
              </td>

              <td>
                <span className="abonos-historial-usuario">
                  {abono.usuario || "—"}
                </span>
              </td>

              <td>
                <span
                  className="abonos-historial-observacion"
                  title={abono.observacion || undefined}
                >
                  {abono.observacion || "—"}
                </span>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
