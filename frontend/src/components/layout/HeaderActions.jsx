import { Sun, Moon } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import "./HeaderActions.css";

export default function HeaderActions({
  user,
  onLoginClick,
  onNavigate,
  onLogout,
  theme,
  onToggleTheme,
}) {
  const esClienteLogueado = user && user.rol === "Cliente";

  return (
    <div className="header-actions">
      <button
        className="header-actions__theme-toggle"
        onClick={onToggleTheme}
        aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      >
        {theme === "dark" ? <Sun size={19} strokeWidth={1.75} /> : <Moon size={19} strokeWidth={1.75} />}
      </button>

      {esClienteLogueado ? (
        <ProfileMenu
          user={user}
          onNavigate={onNavigate}
          onLogout={onLogout}
          triggerClassName="profile-trigger-btn"
        />
      ) : (
        <button onClick={onLoginClick} className="navbar__user-btn">
          Iniciar sesión
        </button>
      )}
    </div>
  );
}
