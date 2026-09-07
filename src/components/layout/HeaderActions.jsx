import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import "./HeaderActions.css";

export default function HeaderActions({
  isLoggedIn = false,
  userName = "",
  onLoginClick,
  onAccountClick,
}) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("storemansion-theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("storemansion-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className="header-actions">
      <button
        className="header-actions__theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      >
        {theme === "dark" ? <Sun size={19} strokeWidth={1.75} /> : <Moon size={19} strokeWidth={1.75} />}
      </button>

      {isLoggedIn ? (
        <button className="header-actions__account" onClick={onAccountClick}>
          Hola, {userName.split(" ")[0]}
        </button>
      ) : (
        <button onClick={onLoginClick} className="navbar__user-btn">
          Iniciar sesión
        </button>
      )}
    </div>
  );
}