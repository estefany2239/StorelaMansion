import { useState, useEffect } from "react";

import Navbar from "./components/layout/Navbar";
import Hero from "./features/home/Hero";
import Categories from "./features/categories/Categories";
import FeaturedProducts from "./features/home/products/FeaturedProducts";
import Footer from "./components/layout/Footer";

import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import ForgotPassword from "./features/auth/ForgotPassword";

import WomenCollection from "./features/Mujer/WomenCollection";
import MenCollection from "./features/Hombre/MenCollection";

import StoreDashboard from "./features/store/StoreDashboard";
import CartDrawer from "./components/cart/CartDrawer";

// PANEL ADMINISTRATIVO
import AdminLayout from "./features/admin/AdminLayout";


export default function App() {

  // ==========================================
  // VISTA ACTUAL
  // ==========================================

  const [currentView, setCurrentView] = useState("home");


  // ==========================================
  // USUARIO QUE INICIÓ SESIÓN
  // ==========================================

  const [user, setUser] = useState(null);


  // ==========================================
  // CARRITO
  // ==========================================

  const [cart, setCart] = useState([]);


  // ==========================================
  // ESTADO DEL CARRITO
  // ==========================================

  const [isCartOpen, setIsCartOpen] = useState(false);


  // ==========================================
  // TEMA GLOBAL (dark/light)
  // ==========================================

  const [theme, setTheme] = useState(
    () => localStorage.getItem("storemansion-theme") || "light"
  );


  // Sincroniza el tema con el atributo data-theme del <html>
  // y con localStorage para que Home y vista cliente compartan
  // el mismo estado.

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("storemansion-theme", theme);
  }, [theme]);


  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));


  // ==========================================
  // AGREGAR PRODUCTO AL CARRITO
  // ==========================================

  const addToCart = (product) => {

    setCart((prevCart) => {

      const existing = prevCart.find(
        (item) => item.id === product.id
      );

      if (existing) {

        return prevCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1
              }
            : item
        );

      }

      return [
        ...prevCart,
        {
          ...product,
          quantity: 1
        }
      ];

    });

  };


  // ==========================================
  // ELIMINAR PRODUCTO DEL CARRITO
  // ==========================================

  const removeFromCart = (productId) => {

    setCart((prevCart) =>
      prevCart.filter(
        (item) => item.id !== productId
      )
    );

  };


  // ==========================================
  // VISTAS DE AUTENTICACIÓN
  // ==========================================

  const isAuthView =
    currentView === "login" ||
    currentView === "register" ||
    currentView === "forgot";


  // ==========================================
  // LOGIN EXITOSO
  // ==========================================

  const handleLoginSuccess = (userData) => {

    console.log(
      "Usuario que inició sesión:",
      userData
    );

    // Guardamos el usuario
    setUser(userData);


    // Si es administrador
    if (userData.rol === "Administrador") {

      console.log("Entrando como administrador");

      setCurrentView("admin");

    } else {

      // Si es cliente
      console.log("Entrando como cliente");

      setCurrentView("dashboard");

    }

  };


  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  const handleLogout = () => {

    setUser(null);
    setCurrentView("home");

  };


  // ==========================================
  // RENDERIZADO
  // ==========================================

  return (

    <div className="app-container">


      {/* ======================================
          NAVBAR
      ====================================== */}

      {!isAuthView &&
        currentView !== "dashboard" &&
        currentView !== "admin" && (

        <Navbar
          onLoginClick={() =>
            setCurrentView("login")
          }

          onNavigate={(view) =>
            setCurrentView(view)
          }

          theme={theme}

          onToggleTheme={toggleTheme}
        />

      )}


      {/* ======================================
          MUJER
      ====================================== */}

      {currentView === "mujer" && (

        <WomenCollection

          onBack={() =>
            setCurrentView("home")
          }

          onLogin={() =>
            setCurrentView("login")
          }

        />

      )}


      {/* ======================================
          HOMBRE
      ====================================== */}

      {currentView === "hombre" && (

        <MenCollection

          onBack={() =>
            setCurrentView("home")
          }

          onLogin={() =>
            setCurrentView("login")
          }

        />

      )}


      {/* ======================================
          HOME
      ====================================== */}

      {currentView === "home" && (

        <main>

          <Hero />

          <Categories

            onViewCollection={(gender) => {

              if (gender === "mujer") {

                setCurrentView("mujer");

              } else if (gender === "hombre") {

                setCurrentView("hombre");

              }

              window.scrollTo({
                top: 0,
                behavior: "smooth"
              });

            }}

          />

          <FeaturedProducts />

        </main>

      )}


      {/* ======================================
          DASHBOARD CLIENTE
      ====================================== */}

      {currentView === "dashboard" && (

        <StoreDashboard

          user={user}

          cart={cart}

          addToCart={addToCart}

          onOpenCart={() =>
            setIsCartOpen(true)
          }

          onLogout={handleLogout}

          theme={theme}

          onToggleTheme={toggleTheme}

        />

      )}


      {/* ======================================
          PANEL ADMINISTRADOR
      ====================================== */}

      {currentView === "admin" && (

        <AdminLayout

          user={user}

          onLogout={handleLogout}

        />

      )}


      {/* ======================================
          LOGIN
      ====================================== */}

      {currentView === "login" && (

        <Login

          onBackToHome={() =>
            setCurrentView("home")
          }

          onNavigateRegister={() =>
            setCurrentView("register")
          }

          onNavigateForgot={() =>
            setCurrentView("forgot")
          }

          onLoginSuccess={handleLoginSuccess}

        />

      )}


      {/* ======================================
          REGISTRO
      ====================================== */}

      {currentView === "register" && (

        <Register

          onBackToLogin={() =>
            setCurrentView("login")
          }

          onRegisterSuccess={() =>
            setCurrentView("login")
          }

        />

      )}


      {/* ======================================
          RECUPERAR CONTRASEÑA
      ====================================== */}

      {currentView === "forgot" && (

        <ForgotPassword

          onBackToLogin={() =>
            setCurrentView("login")
          }

        />

      )}


      {/* ======================================
          CARRITO
      ====================================== */}

      <CartDrawer

        isOpen={isCartOpen}

        onClose={() =>
          setIsCartOpen(false)
        }

        cart={cart}

        removeFromCart={removeFromCart}

      />


      {/* ======================================
          FOOTER
      ====================================== */}

      {!isAuthView &&
        currentView !== "dashboard" &&
        currentView !== "admin" && (

        <Footer />

      )}

    </div>

  );

}