import { useEffect, useRef, useState } from "react";
import { User, LogOut, Settings, Package } from "lucide-react";
import "./ProfileMenu.css";

export default function ProfileMenu({
  user,
  currentView = "",
  onNavigate,
  onLogout,
  triggerClassName = "profile-trigger-btn",
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!showProfileMenu) return;

    const cerrarSiClicFuera = (evento) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(evento.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    const cerrarConEscape = (evento) => {
      if (evento.key === "Escape") setShowProfileMenu(false);
    };

    document.addEventListener("pointerdown", cerrarSiClicFuera);
    document.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.removeEventListener("pointerdown", cerrarSiClicFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [showProfileMenu]);

  const navegar = (vista) => {
    setShowProfileMenu(false);
    onNavigate?.(vista);
  };

  const cerrarSesion = () => {
    setShowProfileMenu(false);
    onLogout?.();
  };

  return (
    <div className="profile-menu-container" ref={containerRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-label="Mi cuenta"
        aria-haspopup="true"
        aria-expanded={showProfileMenu}
        title="Mi cuenta"
        onClick={() => setShowProfileMenu((prev) => !prev)}
      >
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
              <span>Cerrar sesión</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
