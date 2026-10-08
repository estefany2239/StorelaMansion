import {
  Sun,
  Moon,
  Heart,
  Search,
} from "lucide-react";

import ProfileMenu from "./ProfileMenu";
import "./ClientNavbar.css";

export default function ClientNavbar({
  user,
  theme,
  onToggleTheme,
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

        <ProfileMenu
          user={user}
          currentView={currentView}
          onNavigate={onNavigate}
          onLogout={onLogout}
          triggerClassName="icon-btn profile-trigger-btn"
        />
      </div>
    </header>
  );
}
