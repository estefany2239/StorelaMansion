import ProductCard from "./ProductCard";
import {featuredProducts} from "../../../data/products";
import "./FeaturedProducts.css";

export default function FeaturedProducts({ onViewProduct }) {
  return (
    <section className="featured">
      <div className="featured__inner">
        <div className="featured__header">
          <span className="featured__eyebrow">Lo más destacado</span>
          <h2 className="featured__title">Productos Destacados</h2>
        </div>

        <div className="featured__grid">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onViewProduct={onViewProduct} />
          ))}
        </div>
      </div>
    </section>
  );
}