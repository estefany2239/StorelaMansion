import { useEffect, useState } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import webImg from "../../assets/img/web.png";
import imaImg from "../../assets/img/ima.png";
import imgImg from "../../assets/img/img.png";
import "./Hero.css";

const heroImages = [webImg, imaImg, imgImg];

export default function Hero() {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const intervalo = setInterval(() => {
      setIndice((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(intervalo);
  }, [indice]);

  return (
    <section className="hero">
      <div className="hero__slides" aria-hidden="true">
        {heroImages.map((imagen, i) => (
          <div
            key={i}
            className={`hero__slide ${i === indice ? "hero__slide--active" : ""}`}
            style={{ backgroundImage: `url(${imagen})` }}
          />
        ))}
      </div>

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

      <div className="hero__dots">
        {heroImages.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`hero__dot ${i === indice ? "hero__dot--active" : ""}`}
            onClick={() => setIndice(i)}
            aria-label={`Ir a la imagen ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
