import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import HeaderActions from "./HeaderActions";
import "./Navbar.css";

export default function Navbar({ isLoggedIn, userName, onLoginClick, onAccountClick }) {
  const [isDark, setIsDark] = useState(false);

  // Al hacer clic conmuta la clase dark-mode en el body
  const toggleTheme = () => {
    setIsDark((prev) => !prev);
    document.body.classList.toggle("dark-mode");
  };

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
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      </div>
    </header>
  );
}