import { ShoppingBag } from "lucide-react";
import HeaderActions from "./HeaderActions";
import "./Navbar.css";

export default function Navbar({
  user,
  onLoginClick,
  onNavigate,
  onNavigateSection,
  onBrandClick,
  onLogout,
  theme,
  onToggleTheme,
}) {
  const irA = (seccion) => (evento) => {
    evento.preventDefault();
    if (onNavigateSection) onNavigateSection(seccion);
  };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <a
          href="#inicio"
          className="navbar__logo"
          onClick={(evento) => {
            evento.preventDefault();
            if (onBrandClick) onBrandClick();
          }}
        >
          <ShoppingBag size={20} strokeWidth={1.75} color="var(--gold)" />
          <span className="navbar__logo-text">
            Store La Mansión
            <small>Fashion Premium</small>
          </span>
        </a>

        <nav className="navbar__links">
          <a href="#productos" onClick={irA("productos")}>Productos</a>
          <a href="#categorias" onClick={irA("categorias")}>Categorías</a>
        </nav>

        <HeaderActions
          user={user}
          onLoginClick={onLoginClick}
          onNavigate={onNavigate}
          onLogout={onLogout}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
      </div>
    </header>
  );
}