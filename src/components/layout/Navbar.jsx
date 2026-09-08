import { ShoppingBag } from "lucide-react";
import HeaderActions from "./HeaderActions";
import "./Navbar.css";

export default function Navbar({ isLoggedIn, userName, onLoginClick, onAccountClick, theme, onToggleTheme }) {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <a href="/" className="navbar__logo">
          <ShoppingBag size={20} strokeWidth={1.75} color="var(--gold)" />
          <span className="navbar__logo-text">
            Store La Mansión
            <small>Fashion Premium</small>
          </span>
        </a>

        <nav className="navbar__links">
          <a href="/productos">Productos</a>
          <a href="/categorias">Categorías</a>
        </nav>

        <HeaderActions
          isLoggedIn={isLoggedIn}
          userName={userName}
          onLoginClick={onLoginClick}
          onAccountClick={onAccountClick}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
      </div>
    </header>
  );
}