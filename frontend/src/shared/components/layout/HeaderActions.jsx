import { Heart, Moon, ShoppingBag, Sun } from "lucide-react";
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
  cartCount = 0,
  onCartClick,
  loginClassName = "navbar__user-btn",
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
        type="button"
      >
        {theme === "dark" ? <Sun size={19} strokeWidth={1.75} /> : <Moon size={19} strokeWidth={1.75} />}
      </button>

      <button
        type="button"
        className="header-actions__cart navbar-carrito"
        onClick={() => onCartClick?.()}
        aria-label={
          cartCount > 0
            ? `Carrito: ${cartCount} producto(s)`
            : "Carrito: vac��o"
        }
        title="Carrito"
      >
        <ShoppingBag size={22} strokeWidth={1.75} />
        {cartCount > 0 && (
          <span className="header-actions__favoritos-count">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </button>



      {esClienteLogueado ? (
        <ProfileMenu
          user={user}
          onNavigate={onNavigate}
          onLogout={onLogout}
          triggerClassName="profile-trigger-btn"
        />
      ) : (
        <button onClick={onLoginClick} className={loginClassName} type="button">
          Iniciar sesión
        </button>
      )}
    </div>
  );
}
