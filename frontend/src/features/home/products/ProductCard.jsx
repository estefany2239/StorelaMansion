import { Star } from "lucide-react";
import "./ProductCard.css";

export default function ProductCard({ product, onViewProduct }) {
  if (!product) return null;
  const { name, category, price, rating = 5, image } = product;

  return (
    <article className="product-card">
      <div className="product-card__image-wrap">
        {category && <span className="product-card__badge">{category}</span>}
        <img src={image} alt={name} className="product-card__image" loading="lazy" />
      </div>

      <div className="product-card__body">
        <h3 className="product-card__name">{name}</h3>

        <div className="product-card__meta">
          <span className="product-card__price">
            $ {price?.toLocaleString("es-CO")}
          </span>
          <div className="product-card__rating">
            {Array.from({ length: rating }).map((_, i) => (
              <Star key={i} size={11} fill="var(--gold, #c9a227)" color="var(--gold, #c9a227)" />
            ))}
          </div>
        </div>

        <button className="product-card__btn" onClick={() => onViewProduct?.(product)}>
          Ver producto
        </button>
      </div>
    </article>
  );
}