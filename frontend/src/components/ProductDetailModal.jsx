import React, { useEffect } from 'react';
import { X, ShoppingBag } from "lucide-react";
import "./ProductDetailModal.css";

const CATEGORY_TITLES = {
  tenis: "Tenis",
  camisetas: "Camisetas",
  camisas: "Camisas",
  gorras: "Gorras",
  busos: "Busos",
  sudaderas: "Sudaderas",
  blusas: "Sudaderas",
  pantalones: "Pantalones",
  accesorios: "Accesorios",
  relojes: "Relojes"
};

export default function ProductDetailModal({ product, onClose, onAddToCart, categoryTitle }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!product) return null;

  const catKey = String(product.categoryId || product.category || "").toLowerCase();
  const isGorras =
    catKey === "gorras" ||
    String(product.name || "").toLowerCase().includes("gorra");

  const tituloCategoria =
    categoryTitle ||
    CATEGORY_TITLES[catKey] ||
    (product.categoryId
      ? product.categoryId.charAt(0).toUpperCase() + product.categoryId.slice(1)
      : "Producto");

  const specs = [];
  if (isGorras) {
    specs.push({ label: "Marca", value: product.brand || "—" });
  } else {
    if (product.brand) specs.push({ label: "Marca", value: product.brand });
    if (product.size) specs.push({ label: "Talla", value: product.size });
    if (product.color) specs.push({ label: "Color", value: product.color });
  }

  const precio = product.priceFormatted || product.price || "—";

  return (
    <div className="pdm-overlay" onClick={onClose}>
      <div
        className="pdm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="pdm-close" onClick={onClose} title="Cerrar">
          <X size={20} />
        </button>

        <div className="pdm-image" style={{ backgroundImage: `url(${product.image})` }} />

        <div className="pdm-body">
          <span className="pdm-category">{tituloCategoria}</span>
          <h3 className="pdm-name">{product.name}</h3>

          {specs.length > 0 && (
            <div className="pdm-specs">
              {specs.map((spec, i) => (
                <div className="pdm-spec" key={i}>
                  <span className="pdm-spec-label">{spec.label}</span>
                  <strong className="pdm-spec-value">{spec.value}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="pdm-actions">
            <span className="pdm-price">{precio}</span>
            <button className="pdm-add-btn" onClick={() => onAddToCart(product)}>
              <ShoppingBag size={18} /> Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}