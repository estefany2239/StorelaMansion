import { useState, useEffect, useRef } from "react";

import {
  LayoutDashboard,
  Shield,
  Users,
  Package,
  ShoppingCart,
  UserRound,
  Truck,
  LogOut,
  Menu,
  Search,
  Store,
  Moon,
  Sun,
  ChevronDown,
  Tags,
  Ruler,
  Palette,
  Wallet
} from "lucide-react";

import Dashboard from "./dashboard/Dashboard";
import Roles from "./roles/Roles";
import Usuarios from "./usuarios/Usuarios";
import Productos from "./productos/Productos";
import Categorias from "./categorias/Categorias";
import Tallas from "./tallas/Tallas";
import Colores from "./colores/Colores";
import Ventas from "./ventas/Ventas";
import Clientes from "./clientes/Clientes";
import Pedidos from "./pedidos/Pedidos";
import Domicilios from "./domicilios/Domicilios";
import Abonos from "./abonos/Abonos";
import Perfil from "./perfil/Perfil";

import { tienePermiso } from "./utils/permisos";

import "./AdminLayout.css";
import "./AdminTheme.css";
import "./AdminDesign.css";

export default function AdminLayout({ user, onLogout, onUserUpdated }) {

  /* =====================================================
     MENÚ PRINCIPAL (solo permisos "Módulo:Consultar")
     ===================================================== */

  const menu = [
    {
      nombre: "Dashboard",
      vista: "dashboard",
      icono: LayoutDashboard
    },
    {
      nombre: "Roles",
      vista: "roles",
      icono: Shield
    },
    {
      nombre: "Usuarios",
      vista: "usuarios",
      icono: Users
    }
  ].filter((item) =>
    tienePermiso(user, item.nombre, "Consultar")
  );

  /* =====================================================
     SUBMENÚ GESTIÓN DE PRODUCTOS
     ===================================================== */

  const menuProductos = [
    {
      nombre: "Productos",
      vista: "productos",
      icono: Package
    },
    {
      nombre: "Categorías",
      vista: "categorias",
      icono: Tags
    },
    {
      nombre: "Tallas",
      vista: "tallas",
      icono: Ruler
    },
    {
      nombre: "Colores",
      vista: "colores",
      icono: Palette
    }
  ].filter((item) =>
    tienePermiso(user, item.nombre, "Consultar")
  );

  /* =====================================================
     SUBMENÚ GESTIÓN DE VENTAS
     ===================================================== */

  const menuVentas = [
    {
      nombre: "Ventas",
      vista: "ventas",
      icono: ShoppingCart
    },
    {
      nombre: "Clientes",
      vista: "clientes",
      icono: UserRound
    },
    {
      nombre: "Pedidos",
      vista: "pedidos",
      icono: ShoppingCart
    },
    {
      nombre: "Domicilios",
      vista: "domicilios",
      icono: Truck
    },
    {
      nombre: "Abonos",
      vista: "abonos",
      icono: Wallet
    }
  ].filter((item) =>
    tienePermiso(user, item.nombre, "Consultar")
  );

  const modulosDisponibles = [
    ...menu.map((item) => ({ nombre: item.nombre, vista: item.vista })),
    ...menuProductos.map((item) => ({ nombre: item.nombre, vista: item.vista })),
    ...menuVentas.map((item) => ({ nombre: item.nombre, vista: item.vista })),
    { nombre: "Perfil", vista: "perfil" }
  ].filter(
    (item, index, lista) =>
      lista.findIndex((otro) => otro.vista === item.vista) === index
  );

  /* Vista inicial: el primer módulo permitido (o el perfil). */
  const vistaInicial =
    menu[0]?.vista ||
    menuProductos[0]?.vista ||
    menuVentas[0]?.vista ||
    "perfil";

  const [adminView, setAdminView] = useState(vistaInicial);

  const [darkMode, setDarkMode] = useState(() => {
    const guardado = localStorage.getItem("sla-admin-theme");
    return guardado === "dark";
  });

  const [sidebarColapsado, setSidebarColapsado] = useState(() => {
    const guardado = localStorage.getItem("sla-admin-sidebar");
    return guardado === "colapsado";
  });

  const [sidebarMobileAbierto, setSidebarMobileAbierto] = useState(false);
  const [busquedaModulos, setBusquedaModulos] = useState("");
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
  const perfilMenuRef = useRef(null);

  const [fotoPerfil, setFotoPerfil] = useState(
    user?.foto || user?.fotoPerfil || null
  );

  const resultadosBusqueda = busquedaModulos.trim()
    ? modulosDisponibles.filter((modulo) =>
        modulo.nombre.toLowerCase().includes(busquedaModulos.toLowerCase().trim())
      )
    : [];

  const [gestionProductosAbierto, setGestionProductosAbierto] =
    useState(false);

  const [gestionVentasAbierto, setGestionVentasAbierto] =
    useState(menuVentas.length > 0 && menu.length === 0);


  /* =====================================================
     CERRAR SESIÓN
     ===================================================== */

  const cerrarSesion = () => {

    if (onLogout) {
      onLogout();
    }

  };


  /* =====================================================
     CAMBIAR TEMA
     ===================================================== */

  const cambiarTema = () => {

    setDarkMode((actual) => {
      const nuevo = !actual;
      localStorage.setItem("sla-admin-theme", nuevo ? "dark" : "light");
      return nuevo;
    });

  };

  const actualizarFotoPerfil = (nuevaFoto) => {
    setFotoPerfil(nuevaFoto);
    if (onUserUpdated) {
      onUserUpdated({ foto: nuevaFoto });
    }
  };


  /* =====================================================
     ALTERNAR SIDEBAR COLAPSADO
     ===================================================== */

  const alternarSidebar = () => {

    if (window.innerWidth <= 650) {
      setSidebarMobileAbierto((actual) => !actual);
      return;
    }

    setSidebarColapsado((actual) => {
      const nuevo = !actual;
      localStorage.setItem("sla-admin-sidebar", nuevo ? "colapsado" : "expandido");
      return nuevo;
    });

  };

  useEffect(() => {
    const manejarClic = (evento) => {
      if (perfilMenuRef.current && !perfilMenuRef.current.contains(evento.target)) {
        setMenuPerfilAbierto(false);
      }
    };
    document.addEventListener("mousedown", manejarClic);
    return () => document.removeEventListener("mousedown", manejarClic);
  }, []);


  /* =====================================================
     CONTENIDO
     ===================================================== */

  const renderContenido = () => {

    switch (adminView) {

      case "dashboard":
        return <Dashboard user={user} />;

      case "roles":
        return <Roles user={user} />;

      case "usuarios":
        return <Usuarios user={user} />;

      case "productos":
        return <Productos user={user} />;

      case "categorias":
        return <Categorias user={user} />;

      case "tallas":
        return <Tallas user={user} />;

      case "colores":
        return <Colores user={user} />;

      case "ventas":
        return <Ventas vendedorId={user?.vendedorId} user={user} />;

      case "clientes":
        return <Clientes user={user} />;

      case "pedidos":
        return <Pedidos vendedorId={user?.vendedorId} user={user} />;

      case "domicilios":
        return <Domicilios user={user} />;

      case "abonos":
        return <Abonos user={user} />;

      case "perfil":
        return (
          <Perfil
            user={user}
            onLogout={cerrarSesion}
            onToggleTheme={cambiarTema}
            foto={fotoPerfil}
            onFotoActualizada={actualizarFotoPerfil}
          />
        );

      default:
        return <Dashboard user={user} />;
    }
  };


  return (

    <div
      className={
        darkMode
          ? "admin-container admin-dark"
          : "admin-container"
      }
    >

      {sidebarMobileAbierto && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarMobileAbierto(false)}
        />
      )}

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside
        className={
          sidebarColapsado
            ? "admin-sidebar admin-sidebar--collapsed" +
              (sidebarMobileAbierto ? " admin-sidebar--mobile-open" : "")
            : "admin-sidebar" +
              (sidebarMobileAbierto ? " admin-sidebar--mobile-open" : "")
        }
      >

        {/* =================================================
            CABECERA DEL SIDEBAR
            ================================================= */}
        <div className="admin-logo">

          <div className="admin-logo-icon">
            <Store size={18} />
          </div>

          <div className="admin-logo-text">
            <h2>Store La Mansión</h2>
            <span>PANEL ADMINISTRATIVO</span>
          </div>

        </div>

        {/* =================================================
            MENÚ
            ================================================= */}

        <nav className="admin-menu">

          {menu.length > 0 && (
            <span className="menu-title">
              MENÚ PRINCIPAL
            </span>
          )}


          {menu.map((item) => {

            const Icon = item.icono;

            const activo =
              adminView === item.vista;

            return (

              <button
                key={item.vista}
                type="button"
                className={
                  activo
                    ? "admin-link active"
                    : "admin-link"
                }
                title={
                  sidebarColapsado
                    ? item.nombre
                    : undefined
                }
                onClick={() =>
                  setAdminView(item.vista)
                }
              >

                <Icon size={17} />

                <span>
                  {item.nombre}
                </span>

              </button>

            );

          })}


          {/* =================================================
              ACORDEÓN GESTIÓN DE PRODUCTOS
              ================================================= */}

          {menuProductos.length > 0 && (

            <div className="admin-menu-accordion">

            <button
              type="button"
              className={
                gestionProductosAbierto
                  ? "admin-link admin-accordion-toggle open"
                  : "admin-link admin-accordion-toggle"
              }
              title={
                sidebarColapsado
                  ? "Gestión de Productos"
                  : undefined
              }
              onClick={() =>
                setGestionProductosAbierto(
                  (actual) => !actual
                )
              }
            >

              <Package size={17} />

              <span>
                Gestión de Productos
              </span>

              <ChevronDown
                 size={15}

                className="admin-accordion-arrow"
              />

            </button>

            {gestionProductosAbierto && (

              <div className="admin-submenu">

                {menuProductos.map((item) => {

                  const Icon = item.icono;

                  const activo =
                    adminView === item.vista;

                  return (

                    <button
                      key={item.vista}
                      type="button"
                      className={
                        activo
                          ? "admin-link admin-submenu-link active"
                          : "admin-link admin-submenu-link"
                      }
                      title={
                        sidebarColapsado
                          ? item.nombre
                          : undefined
                      }
                      onClick={() =>
                        setAdminView(item.vista)
                      }
                    >

                      <Icon size={14} />

                      <span>
                        {item.nombre}
                      </span>

                    </button>

                  );

                })}

              </div>

            )}

          </div>

          )}


          {/* =================================================
              ACORDEÓN GESTIÓN DE VENTAS
              ================================================= */}

          {menuVentas.length > 0 && (

          <div className="admin-menu-accordion">

            <button
              type="button"
              className={
                gestionVentasAbierto
                  ? "admin-link admin-accordion-toggle open"
                  : "admin-link admin-accordion-toggle"
              }
              title={
                sidebarColapsado
                  ? "Gestión de Ventas"
                  : undefined
              }
              onClick={() =>
                setGestionVentasAbierto(
                  (actual) => !actual
                )
              }
            >

              <ShoppingCart size={17} />

              <span>
                Gestión de Ventas
              </span>

              <ChevronDown
                 size={15}

                className="admin-accordion-arrow"
              />

            </button>

            {gestionVentasAbierto && (

              <div className="admin-submenu">

                {menuVentas.map((item) => {

                  const Icon = item.icono;

                  const activo =
                    adminView === item.vista;

                  return (

                    <button
                      key={item.vista}
                      type="button"
                      className={
                        activo
                          ? "admin-link admin-submenu-link active"
                          : "admin-link admin-submenu-link"
                      }
                      title={
                        sidebarColapsado
                          ? item.nombre
                          : undefined
                      }
                      onClick={() =>
                        setAdminView(item.vista)
                      }
                    >

                      <Icon size={14} />

                      <span>
                        {item.nombre}
                      </span>

                    </button>

                  );

                })}

              </div>

            )}

          </div>

          )}

        </nav>



      </aside>


      {/* =====================================================
          CONTENIDO PRINCIPAL
          ===================================================== */}

      <main className="admin-main">

        <header className="admin-navbar">

          <div className="admin-navbar-left">

            <button
              type="button"
              className="admin-navbar-hamburger"
              title="Menú"
              onClick={alternarSidebar}
            >
              <Menu size={18} />
            </button>

            <div className="admin-navbar-breadcrumbs">
              <span>Panel</span>
              <span className="admin-navbar-breadcrumb-separator">/</span>
              <span>{modulosDisponibles.find((modulo) => modulo.vista === adminView)?.nombre || "Panel"}</span>
            </div>

          </div>

          <div className="admin-navbar-search">

            <Search size={16} />

            <input
              type="text"
              placeholder="Buscar módulos…"
              value={busquedaModulos}
              onChange={(e) => setBusquedaModulos(e.target.value)}
            />

            {resultadosBusqueda.length > 0 && (
              <div className="admin-navbar-search-results">
                {resultadosBusqueda.map((modulo) => (
                  <button
                    key={modulo.vista}
                    type="button"
                    className="admin-navbar-search-result"
                    onClick={() => {
                      setAdminView(modulo.vista);
                      setBusquedaModulos("");
                    }}
                  >
                    {modulo.nombre}
                  </button>
                ))}
              </div>
            )}

          </div>

          <div className="admin-navbar-profile" ref={perfilMenuRef}>

            <button
              type="button"
              className="admin-navbar-avatar-button"
              onClick={() => setMenuPerfilAbierto((actual) => !actual)}
            >
              <span className="admin-navbar-avatar">
                {fotoPerfil ? (
                  <img
                    src={fotoPerfil}
                    alt="Perfil"
                    className="admin-navbar-avatar-img"
                  />
                ) : (
                  <UserRound size={18} />
                )}
              </span>
              <ChevronDown size={14} className="admin-navbar-profile-arrow" />
            </button>

            {menuPerfilAbierto && (
              <div className="admin-navbar-profile-menu">

                <button
                  type="button"
                  onClick={() => {
                    setAdminView("perfil");
                    setMenuPerfilAbierto(false);
                  }}
                >
                  <UserRound size={16} />
                  Mi perfil
                </button>

                <button
                  type="button"
                  onClick={() => {
                    cambiarTema();
                    setMenuPerfilAbierto(false);
                  }}
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                  {darkMode ? "Modo claro" : "Modo oscuro"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    cerrarSesion();
                    setMenuPerfilAbierto(false);
                  }}
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>

              </div>
            )}

          </div>

        </header>

        <section className="admin-content">

          {renderContenido()}

        </section>

      </main>

    </div>
    );

}

