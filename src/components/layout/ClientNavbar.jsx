import { useState } from "react";
import {
  Sun,
  Moon,
  ShoppingBag,
  Heart,
  Search,
  User,
  LogOut,
  Settings,
  Package,
} from "lucide-react";

import "./ClientNavbar.css";

export default function ClientNavbar({
  user,
  theme,
  onToggleTheme,
  cartCount = 0,
  onCartClick,
  onNavigate,
  onLogout,
  onBrandClick,
  currentView = "",
  showSearch = false,
  searchQuery = "",
  onSearchChange,
  favoriteCount = 0,
  onFavoritesClick,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const cerrarSesion = () => {
    setShowProfileMenu(false);
    onLogout();
  };

  const navegar = (vista) => {
    setShowProfileMenu(false);
    onNavigate(vista);
  };

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <div className="brand-logo" onClick={onBrandClick} style={{ cursor: "pointer" }}>
          <h1>LA MANSIÓN</h1>
          <span>STORE</span>
        </div>
      </div>

      {showSearch && (
        <div className="nav-search-bar">
          <Search size={21} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar productos, marcas y más..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
        </div>
      )}

      <div className="nav-right-actions">
        <button className="icon-btn theme-button" onClick={onToggleTheme}>
          {theme === "dark" ? <Sun size={21} /> : <Moon size={21} />}
        </button>

        {onFavoritesClick && (
          <button className="icon-btn" title="Favoritos" onClick={onFavoritesClick}>
            <Heart size={21} />
            {favoriteCount > 0 && <span className="badge">{favoriteCount}</span>}
          </button>
        )}

        <button className="icon-btn cart-btn" title="Carrito" onClick={onCartClick}>
          <ShoppingBag size={21} />
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
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
                <li
                  className={currentView === "mis-pedidos" ? "profile-option-active" : ""}
                  onClick={() => navegar("mis-pedidos")}
                >
                  <Package size={16} />
                  <span>Mis pedidos</span>
                </li>
                <li
                  className={currentView === "configuracion" ? "profile-option-active" : ""}
                  onClick={() => navegar("configuracion")}
                >
                  <Settings size={16} />
                  <span>Configuración</span>
                </li>
                <li className="logout-option" onClick={cerrarSesion}>
                  <LogOut size={16} />
                  <span>Salir de la cuenta</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}