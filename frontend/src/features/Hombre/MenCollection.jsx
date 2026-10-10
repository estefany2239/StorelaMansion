import { ArrowLeft } from "lucide-react";
import ProductCard from "../home/products/ProductCard";
import { menProducts } from "../../data/products"; // O la ruta donde guardes tus arreglos
import "./MenCollection.css";

export default function MenCollection({ onBack, onLogin }) {
  const safeProducts = Array.isArray(menProducts) ? menProducts : [];

  return (
    <section className="men-collection">
      <div className="men-collection__inner">
        <button className="men-collection__back" onClick={onBack}>
          <ArrowLeft size={18} /> Volver al inicio
        </button>

        <header className="men-collection__header">
          <span className="men-collection__eyebrow">COLECCIÓN EXCLUSIVA</span>
          <h1 className="men-collection__title">Moda Masculina</h1>
        </header>

        <div className="men-collection__grid">
          {safeProducts.length > 0 ? (
            safeProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onViewProduct={onLogin} 
              />
            ))
          ) : (
            <p className="men-collection__empty">
              No hay productos disponibles en esta colección por el momento.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}