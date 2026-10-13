import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { categories } from "../../data/categories";
import "./Categories.css";

export default function Categories({ onSelectCategory }) {
  const trackRef = useRef(null);
  const [hayOverflow, setHayOverflow] = useState(false);
  const [alInicio, setAlInicio] = useState(true);
  const [alFinal, setAlFinal] = useState(true);

  const actualizar = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    setHayOverflow(maxScroll > 1);
    setAlInicio(el.scrollLeft <= 1);
    setAlFinal(el.scrollLeft >= maxScroll - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    actualizar();
    el.addEventListener("scroll", actualizar, { passive: true });
    window.addEventListener("resize", actualizar);

    const observer = new ResizeObserver(actualizar);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", actualizar);
      window.removeEventListener("resize", actualizar);
      observer.disconnect();
    };
  }, [actualizar]);

  // Desplaza una tarjeta (con su separación) en la dirección indicada
  const desplazar = (direccion) => {
    const el = trackRef.current;
    if (!el) return;

    const item = el.querySelector(".categories__item");
    const estilos = getComputedStyle(el);
    const separacion = parseFloat(estilos.columnGap || estilos.gap) || 16;
    const paso = (item ? item.offsetWidth : el.clientWidth) + separacion;

    el.scrollBy({ left: direccion * paso, behavior: "smooth" });
  };

  return (
    <section className="categories-section section-glow" id="categorias">
      <div className="categories">
        <h2 className="categories__title">Nuestras Categorías</h2>

        <div className="categories__carousel">
          {hayOverflow && (
            <button
              type="button"
              className="categories__arrow categories__arrow--prev"
              aria-label="Categorías anteriores"
              onClick={() => desplazar(-1)}
              disabled={alInicio}
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div
            className="categories__track"
            ref={trackRef}
            role="group"
            aria-label="Categorías"
            tabIndex={0}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                className="categories__item"
                onClick={() => onSelectCategory?.(cat)}
                style={{ backgroundImage: `url(${cat.image})` }}
              >
                <span className="categories__item-overlay" aria-hidden="true" />
                <span className="categories__item-body">
                  <span className="categories__item-name">{cat.name}</span>
                  <span className="categories__item-cta">
                    Ver colección <ArrowRight size={13} aria-hidden="true" />
                  </span>
                </span>
              </button>
            ))}
          </div>

          {hayOverflow && (
            <button
              type="button"
              className="categories__arrow categories__arrow--next"
              aria-label="Categorías siguientes"
              onClick={() => desplazar(1)}
              disabled={alFinal}
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
