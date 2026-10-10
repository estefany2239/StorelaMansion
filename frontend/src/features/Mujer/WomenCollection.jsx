import { ArrowLeft } from "lucide-react";
import ProductCard from "../home/products/ProductCard";
import { womenProducts } from "../../data/products";
import "./WomenCollection.css";

export default function WomenCollection({ onBack, onLogin }) {
  // Nos aseguramos de que sea un arreglo antes de mapear
  const safeProducts = Array.isArray(womenProducts) ? womenProducts : [];

  return (
    <section className="women-collection">
      <div className="women-collection__inner">
        <button className="women-collection__back" onClick={onBack}>
          <ArrowLeft size={18} /> Volver al inicio
        </button>

        <header className="women-collection__header">
          <span className="women-collection__eyebrow">COLECCIÓN EXCLUSIVA</span>
          <h1 className="women-collection__title">Moda Femenina</h1>
        </header>

        <div className="women-collection__grid">
          {safeProducts.length > 0 ? (
            safeProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onViewProduct={onLogin} // 👈 Al hacer clic en "Ver producto", ejecuta la función de iniciar sesión
              />
            ))
          ) : (
            <p className="women-collection__empty">
              No hay productos disponibles en esta colección por el momento.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}