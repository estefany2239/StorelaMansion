import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  ShoppingBag,
  Heart,
  Search,
  User,
  ArrowRight,
  Sparkles,
  LogOut,
  Settings,
  Package,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  CheckCircle,
  Truck,
  Smartphone,
  Building2,
  Wallet
} from "lucide-react";

import "./StoreDashboard.css";
import CategoryProductsView from "../categories/CategoryProductsView";
import MisPedidos from "./MisPedidos";
import Configuracion from "./Configuracion";
import { pedidosClienteIniciales } from "./pedidosCliente";
import {
  cargarPerfilCliente,
  cargarDireccionesCliente,
  cargarPreferenciasCliente
} from "./configuracionCliente";

// Importación de la imagen para el banner principal
import bannerImage from "../../assets/img/web.png";

const StoreDashboard = ({ theme, onToggleTheme, onLogout, user }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Estados globales de navegación y tienda
  const [currentView, setCurrentView] = useState("dashboard"); // "dashboard" | "products" | "favorites" | "cart" | "checkout" | "success" | "mis-pedidos" | "configuracion"
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Estados de Pago / Checkout
  const [paymentMethod, setPaymentMethod] = useState("nequi");
  const [shippingAddress, setShippingAddress] = useState("");
  const [phoneNequi, setPhoneNequi] = useState("");
  const [tipoPago, setTipoPago] = useState("completo"); // "completo" | "parcial"
  const [montoAbono, setMontoAbono] = useState("");

  const [cart, setCart] = useState(() => {
    return JSON.parse(localStorage.getItem('cart')) || [];
  });
  
  const [favorites, setFavorites] = useState(() => {
    return JSON.parse(localStorage.getItem('favorites')) || [];
  });

  // Pedidos del cliente: mock iniciales + pedidos nuevos guardados en localStorage
  const [pedidosCliente, setPedidosCliente] = useState(() => {
    const guardados = JSON.parse(localStorage.getItem('pedidosCliente'));
    return guardados && guardados.length > 0 ? guardados : pedidosClienteIniciales;
  });

  useEffect(() => {
    localStorage.setItem('pedidosCliente', JSON.stringify(pedidosCliente));
  }, [pedidosCliente]);

  // Configuración del cliente: perfil, direcciones y preferencias en localStorage
  const [perfilCliente, setPerfilCliente] = useState(() =>
    cargarPerfilCliente(user)
  );
  const [direccionesCliente, setDireccionesCliente] = useState(() =>
    cargarDireccionesCliente()
  );
  const [preferenciasCliente, setPreferenciasCliente] = useState(() =>
    cargarPreferenciasCliente()
  );

  useEffect(() => {
    localStorage.setItem('perfilCliente', JSON.stringify(perfilCliente));
  }, [perfilCliente]);

  useEffect(() => {
    localStorage.setItem('direccionesCliente', JSON.stringify(direccionesCliente));
  }, [direccionesCliente]);

  useEffect(() => {
    localStorage.setItem('preferenciasCliente', JSON.stringify(preferenciasCliente));
  }, [preferenciasCliente]);

  const handleAddToCart = (product) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => String(item.id) === String(product.id));
      let updatedCart;
      if (existingIndex > -1) {
        updatedCart = [...prevCart];
        updatedCart[existingIndex].quantity = (updatedCart[existingIndex].quantity || 1) + 1;
      } else {
        updatedCart = [...prevCart, { ...product, quantity: 1 }];
      }
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const handleUpdateQuantity = (productId, delta) => {
    setCart(prevCart => {
      const updatedCart = prevCart.map(item => {
        if (String(item.id) === String(productId)) {
          const newQty = (item.quantity || 1) + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);

      localStorage.setItem('cart', JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prevCart => {
      const updatedCart = prevCart.filter(item => String(item.id) !== String(productId));
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const handleToggleLike = (product) => {
    setFavorites(prevFavs => {
      const isFav = prevFavs.some(item => String(item.id) === String(product.id));
      let updatedFavs;
      if (isFav) {
        updatedFavs = prevFavs.filter(item => String(item.id) !== String(product.id));
      } else {
        updatedFavs = [...prevFavs, product];
      }
      localStorage.setItem('favorites', JSON.stringify(updatedFavs));
      return updatedFavs;
    });
  };

  const categories = [
    { id: "camisetas", title: "Camisetas", image: new URL("../../assets/img/cle.png", import.meta.url).href },
    { id: "tenis", title: "Tenis", image: new URL("../../assets/img/fott.png", import.meta.url).href },
    { id: "gorras", title: "Gorras", image: new URL("../../assets/img/jorda.png", import.meta.url).href },
    { id: "Busos", title: "Busos", image: new URL("../../assets/img/sos.png", import.meta.url).href },
    { id: "pantalones", title: "Pantalones", image: new URL("../../assets/img/lone.png", import.meta.url).href },
    { id: "accesorios", title: "Accesorios", image: new URL("../../assets/img/reloj.png", import.meta.url).href },
  ];

  const misPedidos = pedidosCliente.filter(
    (pedido) => pedido.clienteEmail === user?.email
  );

  const handleLogout = () => {
    alert("Sesión cerrada");
    setShowProfileMenu(false);
    onLogout();
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setCurrentView("products");
  };

  const handleBackToDashboard = () => {
    setSelectedCategory(null);
    setCurrentView("dashboard");
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const cleanPrice = Number(String(item.price).replace(/[^0-9]/g, '')) || 0;
      const qty = item.quantity || 1;
      return total + (cleanPrice * qty);
    }, 0);
  };

  const totalCartItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const formattedTotalPrice = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(calculateTotal());
  const formattedMontoAbono = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(montoAbono) || 0);

  const handleProcessCheckout = (e) => {
    e.preventDefault();
    const total = calculateTotal();
    const montoNum = Number(montoAbono);
    if (tipoPago === "parcial") {
      if (!montoAbono.trim() || isNaN(montoNum) || montoNum <= 0) {
        alert("Por favor ingresa un monto válido para el abono.");
        return;
      }
      if (montoNum > total) {
        alert("El monto del abono no puede ser mayor al total del pedido.");
        return;
      }
    }
    if (!shippingAddress.trim()) {
      alert("Por favor ingresa una dirección de envío.");
      return;
    }
    if (paymentMethod === 'nequi' && !phoneNequi.trim()) {
      alert("Por favor ingresa tu número celular de Nequi.");
      return;
    }
    const montoPagado = tipoPago === "completo" ? total : montoNum;
    const metodoPagoLabel = {
      nequi: "Nequi",
      bancolombia: "Bancolombia",
      card: "Tarjeta",
      cash: "Contra entrega"
    }[paymentMethod];
    const fechaHoy = new Date().toISOString().split("T")[0];
    const nuevoPedido = {
      id: `PED-${Date.now()}`,
      clienteEmail: user?.email,
      fecha: fechaHoy,
      estado: "En proceso",
      mensajeEstado: "Estamos preparando tu pedido.",
      estimadoEntrega: "Nos comunicaremos contigo pronto.",
      productos: cart.map((item) => ({
        nombre: item.name || item.title,
        imagen: item.image,
        cantidad: item.quantity || 1,
        talla: item.talla || item.size || "-",
        color: item.color || "-",
        precio: Number(String(item.price).replace(/[^0-9]/g, '')) || 0
      })),
      total,
      abonos: [
        { fecha: fechaHoy, valor: montoPagado, metodoPago: metodoPagoLabel }
      ]
    };
    setPedidosCliente((prev) => [nuevoPedido, ...prev]);
    setCurrentView("success");
    setCart([]);
    localStorage.removeItem('cart');
  };

  return (
    <div className="store-dashboard-container">
      
      {/* ================= NAVBAR ================= */}
      <header className="top-navbar">
        <div className="navbar-left">
          <div className="brand-logo" onClick={handleBackToDashboard} style={{ cursor: 'pointer' }}>
            <h1>LA MANSIÓN</h1>
            <span>STORE</span>
          </div>
        </div>

        <div className="nav-search-bar">
          <Search size={21} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar productos, marcas y más..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="nav-right-actions">
          <button className="icon-btn theme-button" onClick={onToggleTheme}>
            {theme === "dark" ? <Sun size={21} /> : <Moon size={21} />}
          </button>

          <button className="icon-btn" title="Favoritos" onClick={() => setCurrentView("favorites")}>
            <Heart size={21} />
            {favorites.length > 0 && <span className="badge">{favorites.length}</span>}
          </button>

          <button className="icon-btn cart-btn" title="Carrito" onClick={() => setCurrentView("cart")}>
            <ShoppingBag size={21} />
            {totalCartItems > 0 && <span className="badge">{totalCartItems}</span>}
          </button>

          <div className="profile-menu-container">
            <button className="icon-btn" onClick={() => setShowProfileMenu((prev) => !prev)}>
              <User size={21} />
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown-card">
                <div className="profile-header-info">
                  <p className="profile-welcome">Hola, {user?.nombre}</p>
                  <p className="profile-email">{user?.email}</p>
                </div>
                <div className="profile-divider"></div>
                <ul className="profile-options-list">
                  <li className={currentView === "mis-pedidos" ? "profile-option-active" : ""} onClick={() => { setCurrentView("mis-pedidos"); setShowProfileMenu(false); }}><Package size={16} /><span>Mis pedidos</span></li>
                  <li className={currentView === "configuracion" ? "profile-option-active" : ""} onClick={() => { setCurrentView("configuracion"); setShowProfileMenu(false); }}><Settings size={16} /><span>Configuración</span></li>
                  <li className="logout-option" onClick={handleLogout}><LogOut size={16} /><span>Salir de la cuenta</span></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= VISTAS CONDICIONALES ================= */}
      {currentView === "dashboard" ? (
        <main className="main-content">
          <section className="hero-section">
            <div 
              className="hero-banner-box"
              style={{ 
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${bannerImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '20px',
                overflow: 'hidden'
              }}
            >
              <div className="hero-content-inner">
                <div className="welcome-pill">
                  <Sparkles size={15} />
                  <span>BIENVENIDO</span>
                </div>
                <h2>Encuentra tu estilo<br /><span>perfecto</span></h2>
                <p>Las mejores marcas, la mejor calidad.<br />Todo en un solo lugar.</p>
                <button className="explore-products-btn" onClick={() => handleCategoryClick(categories[0])}>
                  <span>Explorar productos</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </section>

          <section className="categories-section">
            <div className="categories-header-row">
              <div>
                <span className="section-kicker">DESCUBRE</span>
                <h3>Categorías populares</h3>
              </div>
            </div>

            <div className="categories-grid">
              {categories.map((category) => (
                <article
                  className="category-card"
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                >
                  <div className="card-bg" style={{ backgroundImage: `url("${category.image}")` }}></div>
                  <div className="card-gradient-overlay"></div>
                  <div className="card-info">
                    <div className="category-icon"></div>
                    <h4>{category.title}</h4>
                    <span className="ver-productos-link">Ver productos <ArrowRight size={15} /></span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      ) : currentView === "products" ? (
        <CategoryProductsView
          category={selectedCategory}
          onBack={handleBackToDashboard}
          addToCart={handleAddToCart}
          likedProducts={favorites}
          toggleLike={handleToggleLike}
        />
      ) : currentView === "favorites" ? (
        <div className="category-catalog-section">
          <div className="category-catalog-container">
            <button className="catalog__back-btn" onClick={handleBackToDashboard}>
              <ArrowLeft size={16} /> Volver al inicio
            </button>
            <div className="catalog__header">
              <h2>Tus Productos Favoritos</h2>
              <span className="catalog__count">{favorites.length} productos guardados</span>
            </div>
            <main className="catalog__products-grid">
              {favorites.length > 0 ? (
                favorites.map(product => {
                  const isLiked = favorites.some(item => String(item.id) === String(product.id));
                  return (
                    <div key={product.id} className="catalog__product-card">
                      <div className="product__img-wrap" style={{ backgroundImage: `url(${product.image})` }}>
                        <span className="product__brand-tag">{product.brand}</span>
                        <button 
                          className={`product__like-btn ${isLiked ? 'active' : ''}`}
                          onClick={() => handleToggleLike(product)}
                          title="Quitar de favoritos"
                        >
                          <Heart size={16} fill={isLiked ? "#c9a227" : "none"} />
                        </button>
                      </div>
                      <div className="product__info">
                        <h4>{product.name}</h4>
                        <p className="product__details">Talla: {product.size} | Color: {product.color}</p>
                        <div className="product__footer">
                          <span className="product__price">{product.price}</span>
                          <button className="product__add-btn" onClick={() => handleAddToCart(product)}>
                            <ShoppingBag size={16} /> Comprar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="catalog__no-products" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px' }}>
                  <p>No tienes productos guardados en favoritos.</p>
                </div>
              )}
            </main>
          </div>
        </div>
      ) : currentView === "cart" ? (
        <div className="category-catalog-section">
          <div className="category-catalog-container">
            <button className="catalog__back-btn" onClick={handleBackToDashboard}>
              <ArrowLeft size={16} /> Volver al inicio
            </button>
            <div className="catalog__header">
              <h2>Tu Carrito de Compras</h2>
              <span className="catalog__count">{totalCartItems} productos en total</span>
            </div>

            {cart.length > 0 ? (
              <div className="cart-checkout-layout">
                <main className="catalog__products-grid" style={{ margin: 0, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                  {cart.map(product => (
                    <div key={product.id} className="catalog__product-card">
                      <div className="product__img-wrap" style={{ backgroundImage: `url(${product.image})` }}>
                        <span className="product__brand-tag">Cant: {product.quantity || 1}</span>
                      </div>
                      <div className="product__info">
                        <h4>{product.name}</h4>
                        <p className="product__details">Talla: {product.size} | Color: {product.color}</p>
                        
                        <div className="cart-item-qty-row">
                          <button className="qty-btn" onClick={() => handleUpdateQuantity(product.id, -1)}>
                            <Minus size={14} />
                          </button>
                          <span>{product.quantity || 1}</span>
                          <button className="qty-btn" onClick={() => handleUpdateQuantity(product.id, 1)}>
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="product__footer">
                          <span className="product__price">{product.price}</span>
                          <button className="product__add-btn remove-btn-cart" onClick={() => handleRemoveFromCart(product.id)}>
                            <Trash2 size={16} /> Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </main>

                <div className="order-summary-card">
                  <h3>Resumen del pedido</h3>
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>{formattedTotalPrice}</span>
                  </div>
                  <div className="summary-row">
                    <span>Envío</span>
                    <span>Gratis</span>
                  </div>
                  <div className="summary-total-row">
                    <span>Total a pagar</span>
                    <span className="summary-highlight-price">{formattedTotalPrice}</span>
                  </div>
                  <button className="checkout-main-btn" onClick={() => setCurrentView("checkout")}>
                    <CreditCard size={18} /> Proceder al pago
                  </button>
                </div>
              </div>
            ) : (
              <div className="catalog__no-products" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px' }}>
                <p>Tu carrito de compras está vacío.</p>
              </div>
            )}
          </div>
        </div>
      ) : currentView === "checkout" ? (
        <div className="category-catalog-section">
          <div className="category-catalog-container checkout-container-wrapper">
            <button className="catalog__back-btn" onClick={() => setCurrentView("cart")}>
              <ArrowLeft size={16} /> Volver al carrito
            </button>
            <div className="catalog__header">
              <h2>Finalizar Compra</h2>
              <span className="catalog__count">Método de pago y envío</span>
            </div>

            <form onSubmit={handleProcessCheckout} className="checkout-form-card">
              <div className="checkout-field-group">
                <label className="checkout-label">
                  <Truck size={18} /> Dirección de entrega
                </label>
                <input 
                  type="text" 
                  placeholder="Ej. Calle 45 # 20-10, Copacabana" 
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="checkout-text-input"
                  required
                />
              </div>

              <div className="checkout-field-group">
                <label className="checkout-label">
                  <CreditCard size={18} /> Selecciona el método de pago
                </label>
                
                <div className="payment-methods-grid">
                  <div 
                    className={`payment-option-card ${paymentMethod === 'nequi' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('nequi')}
                  >
                    <Smartphone size={22} color="#c9a227" />
                    <span>Nequi</span>
                  </div>

                  <div 
                    className={`payment-option-card ${paymentMethod === 'bancolombia' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('bancolombia')}
                  >
                    <Building2 size={22} color="#c9a227" />
                    <span>Bancolombia</span>
                  </div>

                  <div 
                    className={`payment-option-card ${paymentMethod === 'card' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CreditCard size={22} color="#c9a227" />
                    <span>Tarjeta</span>
                  </div>

                  <div 
                    className={`payment-option-card ${paymentMethod === 'cash' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <Truck size={22} color="#c9a227" />
                    <span>Contra entrega</span>
                  </div>
                </div>
              </div>

              {paymentMethod === 'nequi' && (
                <div className="payment-extra-box">
                  <p className="payment-instructions">Ingresa tu número celular registrado en Nequi para recibir la notificación de cobro:</p>
                  <input 
                    type="tel" 
                    placeholder="Ej. 300 123 4567" 
                    value={phoneNequi}
                    onChange={(e) => setPhoneNequi(e.target.value)}
                    className="checkout-text-input"
                  />
                </div>
              )}

              {paymentMethod === 'bancolombia' && (
                <div className="payment-extra-box">
                  <p className="payment-instructions">Realiza transferencia a la Cuenta de Ahorros Bancolombia <b># 123-456789-00</b> a nombre de La Mansión Store. Tu pedido será despachado al confirmar el comprobante.</p>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="payment-extra-box">
                  <input type="text" placeholder="Número de tarjeta (4532 •••• •••• ••••)" className="checkout-text-input" />
                  <div className="card-split-inputs">
                    <input type="text" placeholder="MM/AA" className="checkout-text-input" />
                    <input type="text" placeholder="CVV" className="checkout-text-input" />
                  </div>
                </div>
              )}

              <div className="checkout-field-group">
                <label className="checkout-label">
                  <Wallet size={18} /> ¿Cuánto vas a pagar?
                </label>

                <div className="payment-methods-grid">
                  <div
                    className={`payment-option-card ${tipoPago === 'completo' ? 'selected' : ''}`}
                    onClick={() => setTipoPago('completo')}
                  >
                    <CreditCard size={22} color="#c9a227" />
                    <span>Pagar el total</span>
                  </div>

                  <div
                    className={`payment-option-card ${tipoPago === 'parcial' ? 'selected' : ''}`}
                    onClick={() => setTipoPago('parcial')}
                  >
                    <Wallet size={22} color="#c9a227" />
                    <span>Abonar una parte</span>
                  </div>
                </div>
              </div>

              {tipoPago === 'parcial' && (
                <div className="payment-extra-box">
                  <p className="payment-instructions">
                    Total del pedido: {formattedTotalPrice}. ¿Cuánto deseas abonar hoy?
                  </p>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej. 150000"
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    className="checkout-text-input"
                  />
                </div>
              )}

              <button type="submit" className="checkout-submit-btn">
                {tipoPago === "completo"
                  ? `Confirmar y Pagar ${formattedTotalPrice}`
                  : `Confirmar y Abonar ${formattedMontoAbono}`}
              </button>
            </form>
          </div>
        </div>
      ) : currentView === "mis-pedidos" ? (
        <MisPedidos
          pedidos={misPedidos}
          onBack={handleBackToDashboard}
        />
      ) : currentView === "configuracion" ? (
        <Configuracion
          user={user}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onLogout={handleLogout}
          onBack={handleBackToDashboard}
          perfilCliente={perfilCliente}
          setPerfilCliente={setPerfilCliente}
          direccionesCliente={direccionesCliente}
          setDireccionesCliente={setDireccionesCliente}
          preferenciasCliente={preferenciasCliente}
          setPreferenciasCliente={setPreferenciasCliente}
        />
      ) : (
        <div className="category-catalog-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
          <div style={{ textAlign: 'center', maxWidth: '450px', padding: '40px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <CheckCircle size={64} color="#c9a227" style={{ marginBottom: '20px' }} />
            <h2 style={{ marginBottom: '10px', fontSize: '1.8rem' }}>¡Compra exitosa!</h2>
            <p style={{ opacity: 0.8, marginBottom: '25px', lineHeight: '1.5' }}>
              Muchas gracias por tu compra en **La Mansión Store**. Tu pedido está siendo procesado y llegará pronto a tu dirección.
            </p>
            <button onClick={() => setCurrentView("mis-pedidos")} className="checkout-submit-btn">
              Ver mis pedidos
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreDashboard;