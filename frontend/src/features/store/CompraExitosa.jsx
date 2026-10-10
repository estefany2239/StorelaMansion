import { CheckCircle } from "lucide-react";

import "./CompraExitosa.css";

export default function CompraExitosa({ onVerMisPedidos }) {
  return (
    <section className="compra-exitosa-section">
      <div className="compra-exitosa-card">
        <div className="compra-exitosa-icon">
          <CheckCircle size={64} strokeWidth={1.6} />
        </div>

        <h2 className="compra-exitosa-title">¡Compra exitosa!</h2>

        <p className="compra-exitosa-copy">
          Muchas gracias por tu compra en{" "}
          <strong>La Mansión Store</strong>. Tu pedido está siendo procesado
          y llegará pronto a tu dirección.
        </p>

        <button
          type="button"
          className="compra-exitosa-btn"
          onClick={onVerMisPedidos}
        >
          Ver mis pedidos
        </button>
      </div>
    </section>
  );
}
