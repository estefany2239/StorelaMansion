import React from 'react';
import { ArrowRight, ArrowLeft } from "lucide-react";
import "./CategoryGenderView.css";

const womenBanner = new URL("../../assets/img/foti.png", import.meta.url).href;
const menBanner = new URL("../../assets/img/foto.png", import.meta.url).href;

export default function CategoryGenderView({ category, onSelectGender, onBack }) {
  if (!category) return null;

  return (
    <div className="category-gender-section">
      <div className="category-gender-container">
        
        {/* Botón para regresar a las categorías normales del inicio */}
        <button className="category-gender__back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Volver
        </button>

        <h2 className="category-gender__title">
          {category.name} — Elige una sección
        </h2>

        {/* Las dos tarjetas grandes estilo banner (Damas y Hombres) */}
        <div className="category-gender__banners">
          
          {/* Tarjeta de Damas */}
          <div 
            className="category-gender__banner" 
            style={{ backgroundImage: `url(${womenBanner})` }}
            onClick={() => onSelectGender('mujer')}
          >
            <span className="category-gender__overlay" />
            <div className="category-gender__content">
              <span className="category-gender__eyebrow">{category.name}</span>
              <h3>Colección<br />Femenina</h3>
              <button>
                Ver productos <ArrowRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Tarjeta de Hombres */}
          <div 
            className="category-gender__banner" 
            style={{ backgroundImage: `url(${menBanner})` }}
            onClick={() => onSelectGender('hombre')}
          >
            <span className="category-gender__overlay" />
            <div className="category-gender__content">
              <span className="category-gender__eyebrow">{category.name}</span>
              <h3>Colección<br />Masculina</h3>
              <button>
                Ver productos <ArrowRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}