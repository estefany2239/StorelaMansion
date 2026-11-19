import { CheckCircle } from "lucide-react";
import NavbarCategoria from "../../categories/NavbarCategoria";
import Footer from "../../../shared/components/footer/Footer";

import "./CompraExitosa.css";

export default function CompraExitosa({
  onVerMisPedidos,
  user,
  tema = "claro",
  onAlternarTema,
  onIrALogin,
  onNavigate,
  onLogout,
  onNavigateSection,
  onVerCategoria,
  cartCount = 0,
  onCartClick,
}) {
  return (
    <div className="landing categoria-pagina" data-tema={tema}>
      <NavbarCategoria
        tema={tema}
        user={user}
        onAlternarTema={onAlternarTema}
        onIrALogin={onIrALogin}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onNavigateSection={onNavigateSection}
        onVerCategoria={onVerCategoria}
        cartCount={cartCount}
        onCartClick={onCartClick}
      />
      <section className="compra-exitosa-section" style={{ paddingTop: 110 }}>
        <div className="compra-exitosa-card">
          <div className="compra-exitosa-icon">
            <CheckCircle size={64} strokeWidth={1.6} />
          </div>

          <h2 className="compra-exitosa-title">¡Pedido registrado!</h2>

          <p className="compra-exitosa-copy">
            Muchas gracias por tu compra en{" "}
            <strong>La Mansión Store</strong>. Tu pedido fue registrado y el pago
            queda en estado <strong>Pendiente de verificación</strong>: la tienda
            lo revisará y te contactará cuando lo confirme.
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

      <Footer tema={tema} onNavigateSection={onNavigateSection} onVerCategoria={onVerCategoria} />
    </div>
  );
}
