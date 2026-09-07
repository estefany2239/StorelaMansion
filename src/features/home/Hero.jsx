import { ArrowRight, ShoppingBag } from "lucide-react";
import "./Hero.css";

// Asegúrate de usar la URL de tu imagen de fondo
const heroBg = new URL("../../assets/img/ima.png", import.meta.url).href;

export default function Hero() {
  return (
    <section className="hero" style={{ backgroundImage: `url(${heroBg})` }}>
      {/* Oscurece la imagen para que resalte la letra blanca */}
      <div className="hero__overlay" />

      <div className="hero__container">
        <div className="hero__content">
          <span className="hero__eyebrow">Colección 2024</span>
          <h1 className="hero__title">
            Elegancia <br />
            <span>Redefinida</span>
          </h1>
          <p className="hero__description">
            Descubre nuestra exclusiva colección de moda premium.
            Prendas diseñadas para quienes aprecian la distinción y el lujo en cada detalle.
          </p>
          
          <div className="hero__actions">
            <button className="btn-primary">
              <ShoppingBag size={18} />
              Comprar ahora
            </button>
            <button className="btn-outline">
              Ver colección <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}