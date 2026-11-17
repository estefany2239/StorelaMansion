// =========================================================
// NAVBAR DE LA PÁGINA DE CATEGORÍA
// Mismo markup y clases que el navbar de la landing
// (landing-nav, landing-marca, landing-nav-links...), así
// hereda tema, botones y el menú hamburguesa móvil.
// Diferencias: los enlaces navegan a secciones del landing
// (sin anchors) y "Categorías" es un menú desplegable con
// la lista de CATEGORIAS_TIENDA (cierra con clic afuera o
// Escape; accesible por teclado con aria-expanded).
// =========================================================

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Corona } from "../../public/Landing";
import HeaderActions from "../../shared/components/layout/HeaderActions";
import "./CategoriaPagina.css";

const CATEGORIAS_TIENDA = [
  "Tenis",
  "Camisetas",
  "Gorras",
  "Buzos",
  "Relojes",
  "Vestidos",
  "Pantalonetas",
  "Sudaderas",
  "Perfumes"
];

export default function NavbarCategoria({
  tema,
  user,
  onAlternarTema,
  onIrALogin,
  onNavigate,
  onLogout,
  onNavigateSection,
  onVerCategoria,
  cartCount = 0,
  onCartClick,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [categoriasAbierto, setCategoriasAbierto] = useState(false);
  const categoriasRef = useRef(null);

  useEffect(() => {
    if (!categoriasAbierto) return undefined;

    const alClicAfuera = (evento) => {
      if (!categoriasRef.current?.contains(evento.target)) {
        setCategoriasAbierto(false);
      }
    };
    const alEscape = (evento) => {
      if (evento.key === "Escape") setCategoriasAbierto(false);
    };

    document.addEventListener("mousedown", alClicAfuera);
    document.addEventListener("keydown", alEscape);

    return () => {
      document.removeEventListener("mousedown", alClicAfuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [categoriasAbierto]);

  const cerrarTodo = () => {
    setMenuAbierto(false);
    setCategoriasAbierto(false);
  };

  const irASeccion = (seccionId) => (evento) => {
    evento.preventDefault();
    cerrarTodo();
    onNavigateSection?.(seccionId);
  };

  const abrirCategoria = (nombre) => {
    cerrarTodo();
    onVerCategoria?.(nombre);
  };

  const esCliente = user?.rol === "Cliente";

  return (
    <header className="landing-nav categoria-pagina-nav" data-tema={tema}>
      <a
        href="#inicio"
        className="landing-marca"
        onClick={irASeccion("inicio")}
      >
        <Corona className="landing-marca-icono" />
        <span className="landing-marca-texto">
          <strong>Store La Mansión</strong>
          <small>FASHION PREMIUM</small>
        </span>
      </a>

      <div className="landing-nav-acciones">
        <HeaderActions
          user={esCliente ? user : null}
          onLoginClick={() => {
            cerrarTodo();
            onIrALogin?.();
          }}
          onNavigate={(vista) => {
            cerrarTodo();
            onNavigate?.(vista);
          }}
          onLogout={onLogout}
          theme={tema === "oscuro" ? "dark" : "light"}
          onToggleTheme={onAlternarTema}
          cartCount={cartCount}
          onCartClick={() => {
            cerrarTodo();
            onCartClick?.();
          }}
          loginClassName="landing-btn landing-btn-dorado landing-nav-sesion"
        />

        <button
          type="button"
          className="landing-icono-boton landing-menu-boton"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          aria-expanded={menuAbierto}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
        >
          {menuAbierto ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <ul className={`landing-nav-links ${menuAbierto ? "abierto" : ""}`}>
        <li>
          <a href="#inicio" onClick={irASeccion("inicio")}>
            Inicio
          </a>
        </li>
        <li>
          <a href="#productos" onClick={irASeccion("productos")}>
            Productos
          </a>
        </li>
        <li>
          <a href="#nosotros" onClick={irASeccion("nosotros")}>
            Sobre nosotros
          </a>
        </li>

        <li
          className="categoria-pagina-item-categorias"
          ref={categoriasRef}
        >
          <button
            type="button"
            className="categoria-pagina-boton-categorias"
            aria-haspopup="true"
            aria-expanded={categoriasAbierto}
            onClick={() => setCategoriasAbierto((abierto) => !abierto)}
          >
            Categorías
          </button>

          <ul
            className="categoria-pagina-menu-categorias"
            role="menu"
            aria-label="Categorías de la tienda"
          >
            {CATEGORIAS_TIENDA.map((nombre) => (
              <li key={nombre} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => abrirCategoria(nombre)}
                >
                  {nombre}
                </button>
              </li>
            ))}
          </ul>
        </li>

        {!esCliente && (
          <li className="landing-nav-sesion-movil">
            <button
              type="button"
              className="landing-btn landing-btn-dorado"
              onClick={() => {
                cerrarTodo();
                onIrALogin?.();
              }}
            >
              Iniciar sesión
            </button>
          </li>
        )}
      </ul>
    </header>
  );
}
