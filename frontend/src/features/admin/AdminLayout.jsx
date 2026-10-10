import { useState } from "react";

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
  Store,
  Moon,
  ChevronDown,
  Tags,
  Ruler,
  Palette
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
import Perfil from "./perfil/Perfil";

import { tienePrivilegio } from "./utils/permisos";
import ROLES_MOCK from "./data/rolesMock";

import "./AdminLayout.css";
import "./AdminTheme.css";

export default function AdminLayout({ user, onLogout }) {

  const esVendedor = user?.rol === "Vendedor";
  const rolUsuario = user?.rol || "Administrador";
  const rolesDisponibles = ROLES_MOCK;

  const [adminView, setAdminView] = useState(
    esVendedor ? "ventas" : "dashboard"
  );

  const [darkMode, setDarkMode] = useState(() => {
    const guardado = localStorage.getItem("sla-admin-theme");
    return guardado === "dark";
  });

  const [sidebarColapsado, setSidebarColapsado] = useState(() => {
    const guardado = localStorage.getItem("sla-admin-sidebar");
    return guardado === "colapsado";
  });

  const [gestionProductosAbierto, setGestionProductosAbierto] =
    useState(false);

  const [gestionVentasAbierto, setGestionVentasAbierto] =
    useState(esVendedor);


  /* =====================================================
     MENÚ PRINCIPAL
     ===================================================== */

  const menu = esVendedor
    ? []
    : [
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
        tienePrivilegio(
          rolUsuario,
          rolesDisponibles,
          item.nombre,
          "Consultar"
        )
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
    tienePrivilegio(
      rolUsuario,
      rolesDisponibles,
      item.nombre,
      "Consultar"
    )
  );

  /* =====================================================
     SUBMENÚ GESTIÓN DE VENTAS
     ===================================================== */

  const menuVentas = esVendedor
    ? [
        {
          nombre: "Ventas",
          vista: "ventas",
          icono: ShoppingCart
        },
        {
          nombre: "Pedidos",
          vista: "pedidos",
          icono: ShoppingCart
        }
      ]
    : [
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
        }
      ].filter((item) =>
    tienePrivilegio(
      rolUsuario,
      rolesDisponibles,
      item.nombre,
      "Consultar"
    )
  );


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


  /* =====================================================
     ALTERNAR SIDEBAR COLAPSADO
     ===================================================== */

  const alternarSidebar = () => {

    setSidebarColapsado((actual) => {
      const nuevo = !actual;
      localStorage.setItem("sla-admin-sidebar", nuevo ? "colapsado" : "expandido");
      return nuevo;
    });

  };


  /* =====================================================
     DATOS DEL USUARIO
     ===================================================== */

  const nombreUsuario =
    user?.nombre || "Carlos Rodríguez";

  /* =====================================================
     CONTENIDO
     ===================================================== */

  const renderContenido = () => {

    switch (adminView) {

      case "dashboard":
        return <Dashboard rolesDisponibles={rolesDisponibles} user={user} />;

      case "roles":
        return <Roles rolesDisponibles={rolesDisponibles} user={user} />;

      case "usuarios":
        return <Usuarios rolesDisponibles={rolesDisponibles} user={user} />;

      case "productos":
        return <Productos rolesDisponibles={rolesDisponibles} user={user} />;

      case "categorias":
        return <Categorias rolesDisponibles={rolesDisponibles} user={user} />;

      case "tallas":
        return <Tallas rolesDisponibles={rolesDisponibles} user={user} />;

      case "colores":
        return <Colores rolesDisponibles={rolesDisponibles} user={user} />;

      case "ventas":
        return <Ventas vendedorId={user?.vendedorId} rolesDisponibles={rolesDisponibles} user={user} />;

      case "clientes":
        return <Clientes rolesDisponibles={rolesDisponibles} user={user} />;

      case "pedidos":
        return <Pedidos vendedorId={user?.vendedorId} rolesDisponibles={rolesDisponibles} user={user} />;

      case "domicilios":
        return <Domicilios rolesDisponibles={rolesDisponibles} user={user} />;

      case "perfil":
        return (
          <Perfil
            user={user}
            onLogout={cerrarSesion}
            onToggleTheme={cambiarTema}
          />
        );

      default:
        return <Dashboard />;
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

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside
        className={
          sidebarColapsado
            ? "admin-sidebar admin-sidebar--collapsed"
            : "admin-sidebar"
        }
      >


        {/* =================================================
            LOGO
            ================================================= */}

        <div className="admin-logo">

          <button
            type="button"
            className="admin-sidebar-toggle"
            title={
              sidebarColapsado
                ? "Expandir menú"
                : "Colapsar menú"
            }
            onClick={alternarSidebar}
          >

            <Menu size={20} />

          </button>

          {!sidebarColapsado && (
            <div className="admin-logo-icon">

              <Store size={25} />

            </div>
          )}

          <h2>
            Store La Mansión
          </h2>

          <span>
            {esVendedor
              ? "Panel del Vendedor"
              : "Panel Administrativo"}
          </span>

        </div>


        {/* =================================================
            MENÚ
            ================================================= */}

        <nav className="admin-menu">

          {!esVendedor && (
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

                <Icon size={19} />

                <span>
                  {item.nombre}
                </span>

              </button>

            );

          })}


          {/* =================================================
              ACORDEÓN GESTIÓN DE PRODUCTOS
              ================================================= */}

          {!esVendedor && (

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

              <Package size={19} />

              <span>
                Gestión de Productos
              </span>

              <ChevronDown
                size={17}
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

                      <Icon size={16} />

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

              <ShoppingCart size={19} />

              <span>
                Gestión de Ventas
              </span>

              <ChevronDown
                size={17}
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

                      <Icon size={16} />

                      <span>
                        {item.nombre}
                      </span>

                    </button>

                  );

                })}

              </div>

            )}

          </div>

        </nav>


        {/* =================================================
            PARTE INFERIOR
            ================================================= */}

        <div className="admin-sidebar-bottom">


          {/* PERFIL */}

          <button
            type="button"
            className="admin-profile-link"
            title={
              sidebarColapsado
                ? "Perfil"
                : undefined
            }
            onClick={() =>
              setAdminView("perfil")
            }
          >

            <UserRound size={19} />

            <span>
              Perfil
            </span>

          </button>


          {/* SEPARADOR */}

          <div className="admin-profile-divider"></div>


          {/* USUARIO */}

          <div className="admin-user-info">

            <div className="admin-user-avatar">

              <UserRound size={19} />

            </div>


            <div className="admin-user-data">

              <strong>
                {nombreUsuario}
              </strong>

              <span>
                {rolUsuario}
              </span>

            </div>

          </div>


          {/* BOTONES */}

          <div className="admin-bottom-actions">


            {/* MODO OSCURO */}

            <button
              type="button"
              className="admin-bottom-button"
              title={
                darkMode
                  ? "Cambiar a modo claro"
                  : "Cambiar a modo oscuro"
              }
              onClick={cambiarTema}
            >

              <Moon size={19} />

            </button>


            {/* CERRAR SESIÓN */}

            <button
              type="button"
              className="admin-bottom-button logout-icon-button"
              title="Cerrar sesión"
              onClick={cerrarSesion}
            >

              <LogOut size={19} />

            </button>

          </div>

        </div>

      </aside>


      {/* =====================================================
          CONTENIDO PRINCIPAL
          ===================================================== */}

      <main className="admin-main">

        <section className="admin-content">

          {renderContenido()}

        </section>

      </main>

    </div>
    );

}

