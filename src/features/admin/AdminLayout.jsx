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
  Store,
  Moon
} from "lucide-react";

import Dashboard from "./dashboard/Dashboard";
import Roles from "./roles/Roles";
import Usuarios from "./usuarios/Usuarios";
import Productos from "./productos/Productos";
import Ventas from "./ventas/Ventas";
import Clientes from "./clientes/Clientes";
import Pedidos from "./pedidos/Pedidos";
import Domicilios from "./domicilios/Domicilios";
import Perfil from "./perfil/Perfil";

import "./AdminLayout.css";
import "./AdminTheme.css";

export default function AdminLayout({ user, onLogout }) {

  const [adminView, setAdminView] = useState("dashboard");

  const [darkMode, setDarkMode] = useState(true);


  /* =====================================================
     MENÚ PRINCIPAL
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
    },
    {
      nombre: "Productos",
      vista: "productos",
      icono: Package
    },
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
  ];


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

    setDarkMode((actual) => !actual);

  };


  /* =====================================================
     DATOS DEL USUARIO
     ===================================================== */

  const nombreUsuario =
    user?.nombre || "Carlos Rodríguez";

  const rolUsuario =
    user?.rol || "Administrador";


  /* =====================================================
     CONTENIDO
     ===================================================== */

  const renderContenido = () => {

    switch (adminView) {

      case "dashboard":
        return <Dashboard />;

      case "roles":
        return <Roles />;

      case "usuarios":
        return <Usuarios />;

      case "productos":
        return <Productos />;

      case "ventas":
        return <Ventas />;

      case "clientes":
        return <Clientes />;

      case "pedidos":
        return <Pedidos />;

      case "domicilios":
        return <Domicilios />;

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

      <aside className="admin-sidebar">


        {/* =================================================
            LOGO
            ================================================= */}

        <div className="admin-logo">

          <div className="admin-logo-icon">

            <Store size={25} />

          </div>

          <h2>
            Store La Mansión
          </h2>

          <span>
            Panel Administrativo
          </span>

        </div>


        {/* =================================================
            MENÚ
            ================================================= */}

        <nav className="admin-menu">

          <span className="menu-title">
            MENÚ PRINCIPAL
          </span>


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

        </nav>


        {/* =================================================
            PARTE INFERIOR
            ================================================= */}

        <div className="admin-sidebar-bottom">


          {/* PERFIL */}

          <button
            type="button"
            className="admin-profile-link"
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