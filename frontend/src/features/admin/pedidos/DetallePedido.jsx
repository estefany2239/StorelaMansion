import { useState } from "react";
import { X, Clock, ChevronDown, ChevronUp } from "lucide-react";

import HistorialAbonos from "../abonos/HistorialAbonos";


export default function DetallePedido({
  pedidoSeleccionado,
  pagosDetalle,
  tienePermiso,
  user,
  puedeCambiarEstado,
  cerrarDetalle,
  setPedidoPagoAccion,
  cargandoPagos,
  errorPagos,
  mostrarFormularioAbono,
  setMostrarFormularioAbono,
  montoMinimoAbono,
  formularioAbono,
  setFormularioAbono,
  erroresAbono,
  enviandoAbono,
  enviarAbonoDetalle,
  formatearPrecio,
  formatearFecha,
  montoPagoEsperado,
}) {

  const [verMas, setVerMas] = useState(false);

  return (
    <div className="pedido-modal-overlay pedido-modal-overlay--detalle">
      <div className="pedido-modal pedido-modal--detalle">
        <div className="pedido-modal-header">
          <h3>Detalle del Pedido</h3>
          <button
            type="button"
            className="pedido-modal-close"
            onClick={cerrarDetalle}
          >
            <X size={21} />
          </button>
        </div>

        <div className="pedido-modal-body">
          {/* Resumen */}
          <div className="detalle-summary">
            <div className="detalle-summary-row detalle-summary-row--3">
              <div className="detalle-summary-card">
                <span className="detalle-summary-label">Cliente</span>
                <strong className="detalle-summary-value">
                  {pedidoSeleccionado.cliente}
                </strong>
                {pedidoSeleccionado.idCliente && (
                  <span className="detalle-summary-sub">
                    {pedidoSeleccionado.idCliente}
                  </span>
                )}
              </div>
              <div className="detalle-summary-card">
                <span className="detalle-summary-label">Fecha</span>
                <strong className="detalle-summary-value">
                  {formatearFecha(pedidoSeleccionado.fecha)}
                </strong>
              </div>
              <div className="detalle-summary-card">
                <span className="detalle-summary-label">Valor Total</span>
                <strong className="detalle-summary-value">
                  {formatearPrecio(pedidoSeleccionado.total)}
                </strong>
              </div>
            </div>

            <div className="detalle-summary-row detalle-summary-row--2">
              <div className="detalle-summary-card detalle-summary-card--saldo">
                <span className="detalle-summary-label">Saldo Pendiente</span>
                <strong className="detalle-summary-value detalle-summary-value--gold">
                  {formatearPrecio(pedidoSeleccionado.saldo)}
                </strong>
              </div>
              <div className="detalle-summary-card detalle-summary-card--modalidad">
                <span className="detalle-summary-label">Modalidad</span>
                <strong className="detalle-summary-value">
                  {pedidoSeleccionado.modalidad}
                </strong>
              </div>
            </div>
          </div>

          <div className="detalle-divider" />

          {/* Cuadrícula de datos */}
          <div className="detalle-data-grid">
            <div className="detalle-data-col">
              <div className="detalle-data-pill">
                <span className="detalle-data-label">ID Pedido</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.id}
                </span>
              </div>
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Método de Envío</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.metodoEnvio || "—"}
                </span>
              </div>
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Dirección de Entrega</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.direccion || "—"}
                </span>
              </div>
              {(pedidoSeleccionado.nombreDestinatario ||
                pedidoSeleccionado.telefonoDestinatario) && (
                <div className="detalle-data-pill">
                  <span className="detalle-data-label">Destinatario</span>
                  <span className="detalle-data-value">
                    {pedidoSeleccionado.nombreDestinatario || "—"}
                  </span>
                </div>
              )}
            </div>
            <div className="detalle-data-col">
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Estado</span>
                <span className="detalle-data-value">
                  <span className="detalle-estado-badge">
                    <Clock size={14} />
                    {pedidoSeleccionado.estado}
                  </span>
                </span>
              </div>
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Método de Pago</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.metodoPago || "—"}
                </span>
              </div>
              {pedidoSeleccionado.banco && (
                <div className="detalle-data-pill">
                  <span className="detalle-data-label">Banco</span>
                  <span className="detalle-data-value">
                    {pedidoSeleccionado.banco}
                  </span>
                </div>
              )}
              {(pedidoSeleccionado.nombreDestinatario ||
                pedidoSeleccionado.telefonoDestinatario) &&
                pedidoSeleccionado.telefonoDestinatario && (
                  <div className="detalle-data-pill">
                    <span className="detalle-data-label">
                      Teléfono Destinatario
                    </span>
                    <span className="detalle-data-value">
                      {pedidoSeleccionado.telefonoDestinatario}
                    </span>
                  </div>
                )}
            </div>
          </div>

          <button
            type="button"
            className="detalle-ver-mas"
            onClick={() => setVerMas((v) => !v)}
          >
            {verMas ? "Ocultar datos" : "Ver más datos"}
            {verMas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

           {verMas && (
            <div className="detalle-data-grid">
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Tipo documento</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.tipoDocumento || "—"}
                </span>
              </div>
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Documento</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.documento || "—"}
                </span>
              </div>
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Teléfono</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.telefono || "—"}
                </span>
              </div>
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Correo</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.clienteCorreo || "—"}
                </span>
              </div>
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Departamento</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.departamento || "—"}
                </span>
              </div>
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Ciudad o municipio</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.municipio || "—"}
                </span>
              </div>
              <div className="detalle-data-pill">
                <span className="detalle-data-label">Barrio</span>
                <span className="detalle-data-value">
                  {pedidoSeleccionado.barrio || "—"}
                </span>
              </div>
            </div>
          )}

          {/* Productos */}
          <div className="detalle-products" style={{ marginTop: 20 }}>
            {pedidoSeleccionado.productos.map((producto, index) => {
              return (
                <div className="detalle-product-card" key={index}>
                  <div className="detalle-product-main">
                    <strong className="detalle-product-name">
                      {producto.nombre}
                    </strong>
                    <span className="detalle-product-meta">
                      Cantidad: {producto.cantidad}
                      {producto.talla ? ` • Talla: ${producto.talla}` : ""}
                      {" • "}Color: {producto.color}
                    </span>
                    <span className="detalle-product-price">
                      Precio unitario: {formatearPrecio(producto.precio)}
                    </span>
                  </div>
                  <div className="detalle-product-subtotal">
                    <span className="detalle-product-subtotal-label">
                      Subtotal
                    </span>
                    <strong className="detalle-product-subtotal-value">
                      {formatearPrecio(
                        Number(producto.precio) * Number(producto.cantidad)
                      )}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Historial de abonos */}
          <div className="detalle-historial-wrap" style={{ marginTop: 16 }}>
            {cargandoPagos ? (
              <div className="pedido-no-products">Cargando pagos...</div>
            ) : errorPagos ? (
              <div className="pedido-comprobante-error">{errorPagos}</div>
            ) : (
              <div className="detalle-historial">
                <HistorialAbonos abonos={pagosDetalle} />
              </div>
            )}
          </div>

          {/* Verificación del pago */}
          {(pedidoSeleccionado.estadoPago === "Pendiente de verificación" ||
            pedidoSeleccionado.estadoPago === "Pago rechazado") && (
            <div className="detalle-payment-verification">
              <p className="detalle-payment-amount">
                Monto a registrar:{" "}
                <strong>
                  {formatearPrecio(montoPagoEsperado(pedidoSeleccionado))}
                </strong>
              </p>
              {puedeCambiarEstado && (
                <div className="detalle-payment-actions">
                  <button
                    type="button"
                    className="detalle-payment-confirm"
                    onClick={() =>
                      setPedidoPagoAccion({
                        pedido: pedidoSeleccionado,
                        accion: "confirmar",
                      })
                    }
                  >
                    Confirmar pago recibido
                  </button>
                  {pedidoSeleccionado.estadoPago ===
                    "Pendiente de verificación" && (
                    <button
                      type="button"
                      className="detalle-payment-reject"
                      onClick={() =>
                        setPedidoPagoAccion({
                          pedido: pedidoSeleccionado,
                          accion: "rechazar",
                        })
                      }
                    >
                      Rechazar pago
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {pedidoSeleccionado.estado === "Entregado" && (
            <div className="pedido-delivered-info">
              Este pedido se encuentra entregado. No puede ser modificado.
            </div>
          )}

          {/* Registrar abono (formulario) */}
          {tienePermiso(user, "Abonos", "Crear") &&
            pedidoSeleccionado.saldo > 0 &&
            pedidoSeleccionado.estado !== "Cancelado" &&
            mostrarFormularioAbono && (
              <div className="detalle-section">
                <div className="pedido-abono-form">
                  <div className="pedido-form-row">
                    <div className="pedido-form-group">
                      <label>MONTO</label>
                      <input
                        type="number"
                        min={montoMinimoAbono}
                        max={pedidoSeleccionado.saldo}
                        value={formularioAbono.monto}
                        onChange={(e) =>
                          setFormularioAbono((actual) => ({
                            ...actual,
                            monto: e.target.value,
                          }))
                        }
                        placeholder={`Mínimo ${formatearPrecio(
                          montoMinimoAbono
                        )} · Saldo ${formatearPrecio(
                          pedidoSeleccionado.saldo
                        )}`}
                      />
                      {erroresAbono.monto && (
                        <span className="pedido-comprobante-error">
                          {erroresAbono.monto}
                        </span>
                      )}
                    </div>
                    <div className="pedido-form-group">
                      <label>MEDIO</label>
                      <select
                        value={formularioAbono.metodo}
                        onChange={(e) =>
                          setFormularioAbono((actual) => ({
                            ...actual,
                            metodo: e.target.value,
                          }))
                        }
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Nequi">Nequi</option>
                        <option value="Bancolombia">Bancolombia</option>
                        <option value="QR">QR</option>
                      </select>
                    </div>
                  </div>
                  <div className="pedido-form-row">
                    <div className="pedido-form-group">
                      <label>REFERENCIA</label>
                      <input
                        type="text"
                        value={formularioAbono.referencia}
                        onChange={(e) =>
                          setFormularioAbono((actual) => ({
                            ...actual,
                            referencia: e.target.value,
                          }))
                        }
                        placeholder="Número de referencia"
                      />
                    </div>
                    <div className="pedido-form-group">
                      <label>OBSERVACIÓN</label>
                      <input
                        type="text"
                        value={formularioAbono.observacion}
                        onChange={(e) =>
                          setFormularioAbono((actual) => ({
                            ...actual,
                            observacion: e.target.value,
                          }))
                        }
                        placeholder="Observación (opcional)"
                      />
                    </div>
                  </div>
                  <div className="pedido-abono-form-actions">
                    <button
                      type="button"
                      className="pedido-cancel-button"
                      onClick={() => setMostrarFormularioAbono(false)}
                      disabled={enviandoAbono}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="pedido-create-button"
                      onClick={enviarAbonoDetalle}
                      disabled={enviandoAbono}
                    >
                      {enviandoAbono ? "Guardando..." : "Guardar abono"}
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div className="pedido-modal-footer">
          {tienePermiso(user, "Abonos", "Crear") &&
            pedidoSeleccionado.saldo > 0 &&
            pedidoSeleccionado.estado !== "Cancelado" && (
              <button
                type="button"
                className="detalle-registrar-abono-button"
                onClick={() => setMostrarFormularioAbono(true)}
                disabled={mostrarFormularioAbono}
              >
                Registrar Abono
              </button>
            )}
          <button
            type="button"
            className="detail-cerrar-button"
            onClick={cerrarDetalle}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
