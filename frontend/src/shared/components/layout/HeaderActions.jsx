import { Heart, Sun, Moon } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import { useFavoritos } from "../../hooks/useFavoritos";
import "./HeaderActions.css";

export default function HeaderActions({
  user,
  onLoginClick,
  onNavigate,
  onLogout,
  theme,
  onToggleTheme,
}) {
  const { ids } = useFavoritos();
  const esClienteLogueado = user && user.rol === "Cliente";
  const conteoFavoritos = ids.length;

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

      {esClienteLogueado && (
        <button
          type="button"
          className="header-actions__favoritos"
          onClick={() => onNavigate?.("favoritos")}
          aria-label={
            conteoFavoritos > 0
              ? `Mis favoritos: ${conteoFavoritos} producto(s)`
              : "Mis favoritos: sin productos"
          }
          title="Mis favoritos"
        >
          <Heart size={19} strokeWidth={1.75} />
          {conteoFavoritos > 0 && (
            <span className="header-actions__favoritos-count">
              {conteoFavoritos > 99 ? "99+" : conteoFavoritos}
            </span>
          )}
        </button>
      )}

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
