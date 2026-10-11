import "./FeaturedProductCard.css";

export default function FeaturedProductCard({ product, descripcion, onViewProduct }) {
  if (!product) return null;

  const { name, image } = product;

  // Toda la tarjeta abre el detalle: se usa un enlace con foco nativo y
  // activación por teclado (Enter), no solo un onClick sobre un div.
  const abrir = (event) => {
    event.preventDefault();
    onViewProduct?.(product);
  };

  return (
    <a
      className="fcard"
      href={`#producto-${product.id}`}
      onClick={abrir}
      aria-label={`Ver detalle de ${name}`}
    >
      <div className="fcard__image-wrap">
        <img src={image} alt={name} className="fcard__image" loading="lazy" />
      </div>

      <div className="fcard__body">
        <h3 className="fcard__name">{name}</h3>
        <p className="fcard__desc">{descripcion}</p>
      </div>
    </a>
  );
}
