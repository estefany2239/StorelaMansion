import { ArrowRight } from "lucide-react";
import { categories } from "../../data/categories";
import "./Categories.css";

const womenBanner = new URL("../../assets/img/foti.png", import.meta.url).href;
const menBanner = new URL("../../assets/img/foto.png", import.meta.url).href;

export default function Categories({ onSelectCategory, onViewCollection }) {
  
  const handleViewCollection = (gender) => {
    // Le avisa a App.jsx qué colección se seleccionó ("mujer" u "hombre")
    if (onViewCollection) {
      onViewCollection(gender);
    }
  };

  return (
    <section className="categories-section">
      <div className="categories">
        <h2 className="categories__title">Nuestras Categorías</h2>

        <div className="categories__grid">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="categories__item"
              onClick={() => onSelectCategory?.(cat)}
              style={{ backgroundImage: `url(${cat.image})` }}
            >
              <span className="categories__item-overlay" />
              <span className="categories__item-name">{cat.name}</span>
            </button>
          ))}
        </div>

        <div className="categories__banners">
          {/* BANNER MODA FEMENINA */}
          <div className="categories__banner" style={{ backgroundImage: `url(${womenBanner})` }}>
            <span className="categories__banner-overlay" />
            <div className="categories__banner-content">
              <span className="categories__banner-eyebrow">Nueva colección</span>
              <h3>
                Moda Femenina
                <br />
                de Temporada
              </h3>
              {/* Al hacer clic envía "mujer" para cambiar la pantalla en App.jsx */}
              <button onClick={() => handleViewCollection("mujer")}>
                Ver colección <ArrowRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* BANNER ELEGANCIA MASCULINA */}
          <div className="categories__banner" style={{ backgroundImage: `url(${menBanner})` }}>
            <span className="categories__banner-overlay" />
            <div className="categories__banner-content">
              <span className="categories__banner-eyebrow">Colección premium</span>
              <h3>
                Elegancia
                <br />
                Masculina
              </h3>
              <button onClick={() => handleViewCollection("hombre")}>
                Ver colección <ArrowRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}