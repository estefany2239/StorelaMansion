import React, { useState } from "react";
import {
  ArrowLeft,
  X,
  Check,
  Eye,
  Receipt,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle
} from "lucide-react";

import { getTotalAbonado, getSaldoPendiente } from "./pedidosCliente";
import "./MisPedidos.css";

const formatearPrecio = (valor) =>
  "$" + Number(valor || 0).toLocaleString("es-CO");

const formatearFecha = (iso) => {
  const [anio, mes, dia] = iso.split("-").map(Number);
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  return `${dia} de ${meses[mes - 1]}, ${anio}`;
};

const ESTADOS = [
  { valor: "En proceso", icono: <Clock size={13} /> },
  { valor: "En camino", icono: <Truck size={13} /> },
  { valor: "Entregado", icono: <CheckCircle2 size={13} /> },
  { valor: "Cancelado", icono: <XCircle size={13} /> }
];

const TABS = [
  { id: "todos", etiqueta: "Todos" },
  { id: "En proceso", etiqueta: "En proceso" },
  { id: "En camino", etiqueta: "En camino" },
  { id: "Entregado", etiqueta: "Entregados" },
  { id: "Cancelado", etiqueta: "Cancelados" }
];

const IMAGENES_MAX = 3;

const PASOS_PROCESO = [
  "Pedido confirmado",
  "En preparación",
  "En camino",
  "Entregado"
];

const INDICE_ESTADO = {
  "En proceso": 1,
  "En camino": 2,
  "Entregado": 3
};

function StepperPedido({ pedido }) {
  if (pedido.estado === "Cancelado") {
    return (
      <div className="mp-stepper mp-stepper--cancelado">
        <div className="mp-step">
          <div className="mp-step-visual">
            <div className="mp-step-dot done">
              <Check size={14} strokeWidth={3} />
            </div>
            <span className="mp-step-line done" />
          </div>
          <div className="mp-step-copy">
            <span className="mp-step-label done">Pedido confirmado</span>
            <span className="mp-step-date">{formatearFecha(pedido.fecha)}</span>
          </div>
        </div>
        <div className="mp-step">
          <div className="mp-step-visual">
            <div className="mp-step-dot cancelado">
              <X size={14} strokeWidth={3} />
            </div>
          </div>
          <div className="mp-step-copy">
            <span className="mp-step-label cancelado">Cancelado</span>
            <span className="mp-step-date">El proceso fue interrumpido</span>
          </div>
        </div>
      </div>
    );
  }

  const indiceActual = INDICE_ESTADO[pedido.estado] ?? 0;

  return (
    <div className="mp-stepper">
      {PASOS_PROCESO.map((nombre, i) => {
        const completado = i <= indiceActual;
        const activo =
          i === indiceActual && pedido.estado !== "Entregado";
        const textoApoyo =
          i === 0
            ? formatearFecha(pedido.fecha)
            : activo &&
              (pedido.estado === "En proceso" || pedido.estado === "En camino")
              ? pedido.estimadoEntrega
              : "";

        return (
          <div className="mp-step" key={nombre}>
            <div className="mp-step-visual">
              <div
                className={`mp-step-dot ${activo ? "active" : completado ? "done" : "pending"}`}
              >
                {completado ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </div>
              {i < PASOS_PROCESO.length - 1 && (
                <span
                  className={`mp-step-line ${completado ? "done" : ""}`}
                />
              )}
            </div>
            <div className="mp-step-copy">
              <span
                className={`mp-step-label ${activo ? "active" : completado ? "done" : "pending"}`}
              >
                {nombre}
              </span>
              {textoApoyo && (
                <span className="mp-step-date">{textoApoyo}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MisPedidos({ pedidos = [], onBack }) {
  const [filtro, setFiltro] = useState("todos");
  const [modalPedido, setModalPedido] = useState(null);
  const [modalTipo, setModalTipo] = useState(null);

  const pedidosFiltrados =
    filtro === "todos"
      ? pedidos
      : pedidos.filter((pedido) => pedido.estado === filtro);

  const cerrarModal = () => {
    setModalPedido(null);
    setModalTipo(null);
  };

  const abrirDetalles = (pedido) => {
    setModalPedido(pedido);
    setModalTipo("detalles");
  };

  const abrirAbonos = (pedido) => {
    setModalPedido(pedido);
    setModalTipo("abonos");
  };

  const estadoVisual = (estado) =>
    ESTADOS.find((e) => e.valor === estado) || {
      icono: <Package size={13} />
    };

  return (
    <section className="mis-pedidos-section">
      <div className="mis-pedidos-wrap">

        <div className="mis-pedidos-topbar">
          <button className="mp-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> Volver al inicio
          </button>
        </div>

        <div className="mis-pedidos-header">
          <span className="mp-kicker">Tu historial</span>
          <h2 className="mp-title">Mis pedidos</h2>
          <p className="mp-subtitle">
            Aquí puedes ver el estado de tus pedidos y los detalles de cada uno.
          </p>
        </div>

        <div className="mp-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`mp-tab ${filtro === tab.id ? "active" : ""}`}
              onClick={() => setFiltro(tab.id)}
            >
              {tab.etiqueta}
            </button>
          ))}
        </div>

        {pedidosFiltrados.length > 0 ? (
          <div className="mp-grid">
            {pedidosFiltrados.map((pedido) => {
              const { icono } = estadoVisual(pedido.estado);
              const slug = pedido.estado.toLowerCase().replace(/\s+/g, "-");
              const productosVisibles = pedido.productos.slice(0, IMAGENES_MAX);
              const productosExtra =
                pedido.productos.length - productosVisibles.length;
              const totalAbonado = getTotalAbonado(pedido);
              const saldo = getSaldoPendiente(pedido);
              const muestraEstimado =
                pedido.estado === "En proceso" || pedido.estado === "En camino";

              return (
                <article className="mp-card" key={pedido.id}>
                  <div className="mp-card-head">
                    <h3 className="mp-card-id">Pedido #{pedido.id}</h3>
                    <span className="mp-card-fecha">
                      {formatearFecha(pedido.fecha)}
                    </span>
                  </div>

                  <div className="mp-thumbs">
                    {productosVisibles.map((producto, i) => (
                      <img
                        key={i}
                        className="mp-thumb"
                        src={producto.imagen}
                        alt={producto.nombre}
                      />
                    ))}
                    {productosExtra > 0 && (
                      <span className="mp-thumb-more">+{productosExtra}</span>
                    )}
                  </div>

                  <span className={`mp-estado ${slug}`}>
                    {icono} {pedido.estado}
                  </span>

                  <p className="mp-msg">{pedido.mensajeEstado}</p>
                  {muestraEstimado && (
                    <p className="mp-estimado">{pedido.estimadoEntrega}</p>
                  )}

                  <div className="mp-finance">
                    <div className="mp-finance-row mp-total">
                      <span>Total del pedido</span>
                      <span className="mp-amount-total">
                        {formatearPrecio(pedido.total)}
                      </span>
                    </div>
                    <div className="mp-finance-row">
                      <span>Abonado</span>
                      <span className="mp-amount">
                        {formatearPrecio(totalAbonado)}
                      </span>
                    </div>
                    <div className="mp-finance-row">
                      <span>Saldo pendiente</span>
                      <span className={saldo > 0 ? "mp-saldo-pendiente" : "mp-saldo-cero"}>
                        {formatearPrecio(saldo)}
                      </span>
                    </div>
                  </div>

                  <div className="mp-card-btns">
                    <button
                      className="mp-btn mp-btn-outline"
                      onClick={() => abrirAbonos(pedido)}
                    >
                      <Receipt size={15} /> Ver abonos
                    </button>
                    <button
                      className="mp-btn mp-btn-primary"
                      onClick={() => abrirDetalles(pedido)}
                    >
                      <Eye size={15} /> Ver detalles
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mp-empty">
            <Package size={44} />
            <h3>No tienes pedidos en esta categoría todavía.</h3>
            <p>Puedes revisar otra pestaña o explorar nuevos productos.</p>
          </div>
        )}

      </div>

      {modalPedido && modalTipo && (
        <div className="mp-modal-overlay" onClick={cerrarModal}>
          <div
            className="mp-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">Pedido #{modalPedido.id}</h3>
              <button className="mp-modal-close" onClick={cerrarModal}>
                <X size={18} />
              </button>
            </div>

            <p className="mp-modal-sub">
              {formatearFecha(modalPedido.fecha)}
              <span className={`mp-estado ${modalPedido.estado.toLowerCase().replace(/\s+/g, "-")}`}>
                {estadoVisual(modalPedido.estado).icono} {modalPedido.estado}
              </span>
            </p>

            {modalTipo === "detalles" ? (
              <>
                <StepperPedido pedido={modalPedido} />

                <div className="mp-details-list">
                  {modalPedido.productos.map((producto, i) => (
                    <div className="mp-detail-item" key={i}>
                      <img
                        className="mp-detail-img"
                        src={producto.imagen}
                        alt={producto.nombre}
                      />
                      <div className="mp-detail-info">
                        <p className="mp-detail-name">{producto.nombre}</p>
                        <p className="mp-detail-meta">
                          Talla: {producto.talla} · Color: {producto.color} · Cant: {producto.cantidad}
                        </p>
                      </div>
                      <div className="mp-detail-price">
                        <span className="mp-detail-unit">
                          {formatearPrecio(producto.precio)} c/u
                        </span>
                        <span className="mp-detail-subtotal">
                          {formatearPrecio(producto.precio * producto.cantidad)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mp-finance mp-finance-modal">
                  <div className="mp-finance-row mp-total">
                    <span>Total del pedido</span>
                    <span className="mp-amount-total">
                      {formatearPrecio(modalPedido.total)}
                    </span>
                  </div>
                  <div className="mp-finance-row">
                    <span>Abonado</span>
                    <span className="mp-amount">
                      {formatearPrecio(getTotalAbonado(modalPedido))}
                    </span>
                  </div>
                  <div className="mp-finance-row">
                    <span>Saldo pendiente</span>
                    <span className={getSaldoPendiente(modalPedido) > 0 ? "mp-saldo-pendiente" : "mp-saldo-cero"}>
                      {formatearPrecio(getSaldoPendiente(modalPedido))}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {modalPedido.abonos.length > 0 ? (
                  <div className="mp-abonos-list">
                    {modalPedido.abonos.map((abono, i) => (
                      <div className="mp-abono-item" key={i}>
                        <div className="mp-abono-info">
                          <span className="mp-abono-fecha">
                            {formatearFecha(abono.fecha)}
                          </span>
                          <span className="mp-abono-metodo">
                            {abono.metodoPago}
                          </span>
                        </div>
                        <span className="mp-abono-valor">
                          {formatearPrecio(abono.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mp-abonos-empty">
                    Aún no se han registrado abonos para este pedido.
                  </div>
                )}

                <div className="mp-finance mp-finance-modal">
                  <div className="mp-finance-row">
                    <span>Total abonado</span>
                    <span className="mp-amount">
                      {formatearPrecio(getTotalAbonado(modalPedido))}
                    </span>
                  </div>
                  <div className="mp-finance-row mp-total">
                    <span>Saldo pendiente</span>
                    <span className={getSaldoPendiente(modalPedido) > 0 ? "mp-saldo-pendiente" : "mp-saldo-cero"}>
                      {formatearPrecio(getSaldoPendiente(modalPedido))}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}