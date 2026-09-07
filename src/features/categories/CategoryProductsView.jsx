import React, { useState, useEffect } from 'react';
import { ArrowLeft, SlidersHorizontal, ShoppingBag, Heart } from "lucide-react";
import { getFilteredProducts } from '../../data/productsData';
import "./CategoryProductsView.css";

export default function CategoryProductsView({ category, onBack, addToCart, likedProducts = [], toggleLike }) {
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  
  const [favoritesList, setFavoritesList] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Cargar favoritos iniciales desde el localStorage al montar
  useEffect(() => {
    const storedFavs = JSON.parse(localStorage.getItem('favorites')) || [];
    setFavoritesList(storedFavs);
  }, []);

  // Detector automático del tema oscuro
  useEffect(() => {
    const checkTheme = () => {
      const htmlTheme = document.documentElement.getAttribute('data-theme');
      const bodyHasDark = document.body.classList.contains('dark') || document.body.classList.contains('dark-mode');
      const htmlHasDark = document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('dark-mode');
      
      setIsDarkMode(htmlTheme === 'dark' || bodyHasDark || htmlHasDark);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // ==========================================
  // MANEJADORES ROBUSTOS (CON NORMALIZACIÓN DE ID)
  // ==========================================
  const handleAddToCart = (product) => {
    const existingCart = JSON.parse(localStorage.getItem('cart')) || [];
    const productIndex = existingCart.findIndex(item => String(item.id) === String(product.id));
    
    if (productIndex > -1) {
      existingCart[productIndex].quantity = (existingCart[productIndex].quantity || 1) + 1;
    } else {
      existingCart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(existingCart));
    window.dispatchEvent(new Event('cartUpdated')); 
    console.log("Agregado al carrito:", product.name);
  };

  const handleLikeToggle = (product) => {
    const existingFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const isFav = existingFavorites.some(item => String(item.id) === String(product.id));
    
    let updatedFavorites;
    if (isFav) {
      updatedFavorites = existingFavorites.filter(item => String(item.id) !== String(product.id));
    } else {
      updatedFavorites = [...existingFavorites, product];
    }

    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    setFavoritesList(updatedFavorites); 
    
    if (toggleLike) toggleLike(product);
    
    window.dispatchEvent(new Event('favoritesUpdated')); 
  };
  // ==========================================

  // DETECCIÓN INDEPENDIENTE PARA CADA CATEGORÍA
  const isTenis = category?.title?.toLowerCase().includes('tenis') || category?.id === 'tenis';
  const isGorras = category?.title?.toLowerCase().includes('gorra') || category?.id === 'gorras';
  const isRelojes = category?.title?.toLowerCase().includes('reloj') || category?.id === 'relojes';
  
  const isBusos = category?.title?.toLowerCase().includes('buso') || category?.id === 'busos';
  const isSudaderas = category?.title?.toLowerCase().includes('sudadera') || category?.id === 'sudaderas';
  const isPantalones = category?.title?.toLowerCase().includes('pantalon') || 
                       category?.title?.toLowerCase().includes('pantalón') || 
                       category?.id === 'pantalones';

  // CORREGIDO: Se limpian las marcas solo en gorras y se ajustan las tallas para que los tenis no se bloqueen
  const filteredProducts = getFilteredProducts(
    category, 
    selectedGender, 
    isGorras ? selectedBrands : [], 
    isRelojes ? [] : selectedSizes, 
    isTenis ? [] : selectedColors
  );

  const toggleSize = (size) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const toggleBrand = (brand) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };

  const toggleColor = (color) => {
    setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
  };

  return (
    <div className={`category-catalog-section ${isDarkMode ? 'dark-mode-active' : ''}`}>
      <div className="category-catalog-container">
        
        <button className="catalog__back-btn" onClick={() => {
          if (selectedGender) {
            setSelectedGender(null);
          } else {
            onBack();
          }
        }}>
          <ArrowLeft size={16} /> {selectedGender ? "Cambiar género" : "Volver a categorías"}
        </button>

        <div className="catalog__header">
          <h2>{category?.title}</h2>
          <span className="catalog__count">
            {selectedGender ? `${filteredProducts.length} productos disponibles` : "Selecciona una sección"}
          </span>
        </div>

        {!selectedGender ? (
          <div className="gender-selector-wrapper">
            <h3>¿Para quién buscas en {category?.title}?</h3>
            <div className="gender-cards-container">
              
              <div 
                className="gender-card" 
                style={{ 
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('${new URL("../../assets/img/foto.png", import.meta.url).href}')` 
                }}
                onClick={() => setSelectedGender('hombre')}
              >
                <div className="gender-card-content">
                  <span>Hombre</span>
                </div>
              </div>

              <div 
                className="gender-card" 
                style={{ 
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('${new URL("../../assets/img/foti.png", import.meta.url).href}')` 
                }}
                onClick={() => setSelectedGender('mujer')}
              >
                <div className="gender-card-content">
                  <span>Mujer</span>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="catalog__layout">
            
            {/* BARRA LATERAL CON CADA FILTRO SEPARADO */}
            <aside className="catalog__sidebar">
              <div className="sidebar__title">
                <SlidersHorizontal size={18} />
                <span>Filtros ({selectedGender.toUpperCase()})</span>
              </div>

              {/* 1. SI ES GORRAS */}
              {isGorras ? (
                <div className="filter__group">
                  <h4>Marcas de Gorras</h4>
                  <div className="filter__sizes-grid">
                    {['Boss', 'Calvin Klein', 'Guess', 'Lacoste', 'Pyscho Bunny'].map(brand => (
                      <button 
                        key={brand}
                        className={`filter__size-btn ${selectedBrands.includes(brand) ? 'active' : ''}`}
                        onClick={() => toggleBrand(brand)}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isRelojes ? (
                /* 2. SI ES RELOJES */
                <div className="filter__group">
                  <h4>Colección de Relojes</h4>
                  <p className="product__details" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                    Estilos para {selectedGender}
                  </p>
                  <div className="filter__sizes-grid">
                    {['Deportivo', 'Elegante', 'Casual'].map(estilo => (
                      <button 
                        key={estilo}
                        className={`filter__size-btn ${selectedSizes.includes(estilo) ? 'active' : ''}`}
                        onClick={() => toggleSize(estilo)}
                      >
                        {estilo}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isBusos ? (
                /* 3. SI ES BUSOS (INDEPENDIENTE) */
                <div className="filter__group">
                  <h4>Tallas de Busos</h4>
                  <div className="filter__sizes-grid">
                    {(selectedGender === 'hombre' 
                      ? ['S', 'M', 'L', 'XL', 'XXL'] 
                      : ['S']
                    ).map(size => (
                      <button 
                        key={size}
                        className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                        onClick={() => toggleSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isPantalones ? (
                /* 5. SI ES PANTALONES */
                <div className="filter__group">
                  <h4>Tallas de Pantalones</h4>
                  <div className="filter__sizes-grid">
                    {(selectedGender === 'hombre' 
                      ? ['30', '32', '34', '36', '38'] 
                      : ['S', 'M']
                    ).map(size => (
                      <button 
                        key={size}
                        className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                        onClick={() => toggleSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isTenis ? (
                /* 6. SI ES TENIS (TALLAS DE CALZADO) */
                <div className="filter__group">
                  <h4>Tallas de Tenis</h4>
                  <div className="filter__sizes-grid">
                    {selectedGender === 'hombre' 
                      ? ['39', '40', '41', '42', '43', '44'].map(size => (
                          <button 
                            key={size}
                            className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                            onClick={() => toggleSize(size)}
                          >
                            {size}
                          </button>
                        ))
                      : ['35', '35.5', '36', '36.5', '37', '38'].map(size => (
                          <button 
                            key={size}
                            className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                            onClick={() => toggleSize(size)}
                          >
                            {size}
                          </button>
                        ))
                    }
                  </div>
                </div>
              ) : (
                /* 7. TALLAS PARA OTRAS ROPAS GENERALES */
                <div className="filter__group">
                  <h4>Tallas</h4>
                  <div className="filter__sizes-grid">
                    {(selectedGender === 'hombre' ? ['S', 'M', 'L', 'XL', 'XXL'] : ['XS', 'S', 'M', 'L', 'Única']).map(size => (
                      <button 
                        key={size}
                        className={`filter__size-btn ${selectedSizes.includes(size) ? 'active' : ''}`}
                        onClick={() => toggleSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* GRILLA DE PRODUCTOS */}
            <main className="catalog__products-grid">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => {
                  const isLiked = favoritesList.some(item => String(item.id) === String(product.id));

                  return (
                    <div key={product.id} className="catalog__product-card">
                      <div 
                        className="product__img-wrap" 
                        style={{ backgroundImage: `url(${product.image})` }}
                      >
                        <span className="product__brand-tag">{product.brand}</span>
                        
                        {/* BOTÓN FAVORITOS */}
                        <button 
                          type="button"
                          className={`product__like-btn ${isLiked ? 'active' : ''}`}
                          onClick={() => handleLikeToggle(product)}
                          title={isLiked ? "Quitar de favoritos" : "Añadir a favoritos"}
                        >
                          <Heart size={16} fill={isLiked ? "#c9a227" : "none"} />
                        </button>
                      </div>

                      <div className="product__info">
                        <h4>{product.name}</h4>
                        <p className="product__details">
                          {isGorras ? `Marca: ${product.brand}` : `Talla: ${product.size} | Color: ${product.color}`}
                        </p>
                        <div className="product__footer">
                          <span className="product__price">{product.price}</span>
                          
                          {/* BOTÓN COMPRAR / CARRITO */}
                          <button 
                            type="button"
                            className="product__add-btn"
                            onClick={() => handleAddToCart(product)}
                          >
                            <ShoppingBag size={16} /> Comprar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <main className="catalog__no-products">
                  <p>No se encontraron productos para {selectedGender} con los filtros seleccionados.</p>
                </main>
              )}
            </main>

          </div>
        )}

      </div>
    </div>
  );
}