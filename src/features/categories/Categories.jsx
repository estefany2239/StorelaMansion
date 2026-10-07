import { categories } from "../../data/categories";
import "./Categories.css";

export default function Categories({ onSelectCategory }) {
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
      </div>
    </section>
  );
}
