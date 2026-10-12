import FeaturedProductCard from "./FeaturedProductCard";
import {featuredProducts} from "../../../data/products";
import "./FeaturedProducts.css";

// TODO: descripciones de respaldo provisionales. Cuando el catálogo incluya
// un campo `description` real por producto, esta tabla deja de ser necesaria.
// Se mantiene en UN solo lugar y por categoría; el tono es breve y sin
// inventar materiales, marcas ni medidas.
const DESCRIPCIONES_POR_CATEGORIA = {
  gorras: "Diseño urbano y acabado cuidado para completar tu look.",
  tenis: "Comodidad y estilo para acompañarte en cada paso.",
  top: "Corte cómodo y estilo versátil para el día a día.",
  pantaloneta: "Corte cómodo y estilo versátil para el día a día."
};

const DESCRIPCION_GENERAL = "Pieza versátil y elegante para el día a día.";

const obtenerDescripcion = (product) => {
  // 1) Descripción real del producto si existe en los datos.
  const propia = product?.description || product?.descripcion;
  if (propia) return propia;

  // 2) Frase de respaldo por categoría.
  const clave = String(product?.category || product?.name || "")
    .toLowerCase()
    .trim();

  return DESCRIPCIONES_POR_CATEGORIA[clave] || DESCRIPCION_GENERAL;
};

export default function FeaturedProducts({ onViewProduct }) {
  return (
    <section className="featured" id="productos">
      <div className="featured__inner">
        <div className="featured__header">
          <span className="featured__eyebrow">Lo más destacado</span>
          <h2 className="featured__title">Productos Destacados</h2>
        </div>

        <div className="featured__grid">
          {featuredProducts.map((product) => (
            <FeaturedProductCard
              key={product.id}
              product={product}
              descripcion={obtenerDescripcion(product)}
              onViewProduct={onViewProduct}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
