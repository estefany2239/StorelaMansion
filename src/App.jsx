import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

import SplashScreen from "./components/splash/SplashScreen";

import Navbar from "./components/layout/Navbar";
import ClientNavbar from "./components/layout/ClientNavbar";
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
import PaymentView from "./components/payment/PaymentView";
import CategoryProductsView from "./features/categories/CategoryProductsView";

// PANEL ADMINISTRATIVO
import AdminLayout from "./features/admin/AdminLayout";

// Helpers de precio para el gate de compra (misma lógica que el CartDrawer)
const obtenerPrecio = (precio) => {
  if (typeof precio === "number") return precio;
  if (!precio) return 0;
  const numero = Number(String(precio).replace(/[\$COP.,\s]/gi, "").trim());
  return Number.isNaN(numero) ? 0 : numero;
};

const formatoPrecio = (valor) => `$${valor.toLocaleString("es-CO")} COP`;


export default function App() {

  // ==========================================
  // VISTA ACTUAL
  // ==========================================

  const [currentView, setCurrentView] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Vista específica en la que debe abrir el dashboard cliente.
  // Solo el dropdown del perfil en pago la fija ("mis-pedidos"/"configuracion");
  // cualquier otra entrada al dashboard la resetea a "dashboard".
  const [dashInitView, setDashInitView] = useState("dashboard");


  // ==========================================
  // SPLASH SCREEN
  // ==========================================

  const [mostrarSplash, setMostrarSplash] = useState(true);

  const [splashSaliendo, setSplashSaliendo] = useState(false);

  useEffect(() => {

    const salir = setTimeout(() => {
      setSplashSaliendo(true);
    }, 2200);

    const retirar = setTimeout(() => {
      setMostrarSplash(false);
    }, 2800);

    return () => {
      clearTimeout(salir);
      clearTimeout(retirar);
    };

  }, []);


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
  // FLUJO DE COMPRA (gate de inicio de sesión)
  // ==========================================

  // Indica que se viene del "Continuar compra" sin sesión:
  // tras un login/registro exitoso se vuelve al pago.
  const [flujoCheckout, setFlujoCheckout] = useState(false);

  // Vista en la que estaba el usuario antes de abrir el gate
  // (para regresar sin perder el carrito).
  const [viewAnterior, setViewAnterior] = useState("home");


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
  // ACTUALIZAR CANTIDAD DE UN PRODUCTO
  // ==========================================

  const updateQuantity = (productId, quantity) => {

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: Math.max(1, Number(quantity) || 1)
            }
          : item
      )
    );

  };


  // ==========================================
  // AGREGAR AL CARRITO Y ABRIR EL DRAWER
  // ==========================================

  const handleAddToCart = (product) => {

    addToCart(product);

    setIsCartOpen(true);

  };


  // ==========================================
  // CONTINUAR COMPRA (siguiente paso pendiente)
  // ==========================================

  const handleContinuarCompra = () => {

    // Cerramos el drawer en todos los casos
    setIsCartOpen(false);

    // Si ya hay sesión iniciada, ir directo al pago
    if (user) {
      setCurrentView("pago");
      return;
    }

    // Sin sesión: abrimos el gate "Iniciar sesión para continuar"
    setViewAnterior(currentView === "checkout-login" ? viewAnterior : currentView);
    setFlujoCheckout(true);
    setCurrentView("checkout-login");

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


    // Si venía del flujo de compra (gate), avanzar al pago
    if (flujoCheckout) {
      setFlujoCheckout(false);
      setCurrentView("pago");
      return;
    }


    // Si es administrador o vendedor
    if (
      userData.rol === "Administrador" ||
      userData.rol === "Vendedor"
    ) {

      console.log("Entrando al panel administrativo");

      setCurrentView("admin");

    } else {

      // Si es cliente
      console.log("Entrando como cliente");

      setDashInitView("dashboard");
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
  // TOTALES DEL CARRITO (para el gate de compra)
  // ==========================================

  const subtotalCarrito = cart.reduce(
    (acumulado, item) =>
      acumulado +
      obtenerPrecio(item.price) * (Number(item.quantity) || 1),
    0
  );

  const totalItemsCarrito = cart.reduce(
    (acumulado, item) => acumulado + (Number(item.quantity) || 1),
    0
  );


  // ==========================================
  // RENDERIZADO
  // ==========================================

  return (

    <div className="app-container">


      {/* ======================================
          SPLASH SCREEN
      ====================================== */}

      {mostrarSplash && (

        <SplashScreen
          saliendo={splashSaliendo}
        />

      )}


      {/* ======================================
          NAVBAR
      ====================================== */}

      {!isAuthView &&
        currentView !== "dashboard" &&
        currentView !== "admin" && (

        currentView === "pago" && user ? (

          <ClientNavbar
            user={user}
            theme={theme}
            onToggleTheme={toggleTheme}
            cartCount={totalItemsCarrito}
            onCartClick={() => setIsCartOpen(true)}
            onNavigate={(vista) => {
              setDashInitView(vista);
              setCurrentView("dashboard");
            }}
            onLogout={() => {
              alert("Sesión cerrada");
              handleLogout();
            }}
            onBrandClick={() => {
              setDashInitView("dashboard");
              setCurrentView("dashboard");
            }}
            currentView="pago"
          />

        ) : (

          <Navbar
            isLoggedIn={!!user}
            userName={user?.nombre || ""}
            onLoginClick={() =>
              setCurrentView("login")
            }

            onAccountClick={() => {
              setDashInitView("dashboard");
              setCurrentView("dashboard");
            }}

            onNavigate={(view) =>
              setCurrentView(view)
            }

            theme={theme}

            onToggleTheme={toggleTheme}
          />

        )

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

             onSelectCategory={(cat) => {
               setSelectedCategory({
                 id: cat.id,
                 title: cat.name,
                 image: cat.image
               });
               setCurrentView("categoria-genero");
               window.scrollTo({
                 top: 0,
                 behavior: "smooth"
               });
             }}

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
           SELECCIÓN GÉNERO POR CATEGORÍA (PÚBLICO)
       ====================================== */}

       {currentView === "categoria-genero" && selectedCategory && (

         <CategoryProductsView
           category={selectedCategory}
           onBack={() => {
             setSelectedCategory(null);
             setCurrentView("home");
           }}
           addToCart={handleAddToCart}
           likedProducts={[]}
           toggleLike={() => {}}
         />

       )}


       {/* ======================================
           PAGO / CHECKOUT
       ====================================== */}

      {currentView === "pago" && (

        <PaymentView
          cart={cart}
          darkMode={theme === "dark"}
          onBack={() => {
            setCurrentView("home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

      )}


      {/* ======================================
           DASHBOARD CLIENTE
       ====================================== */}

      {currentView === "dashboard" && (

        <StoreDashboard

          user={user}

          cart={cart}

          addToCart={addToCart}

          initialView={dashInitView}

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
           GATE: INICIAR SESIÓN PARA CONTINUAR LA COMPRA
       ====================================== */}

      {currentView === "checkout-login" && (

        <section className="checkout-login-page">

          <button
            type="button"
            className="checkout-login-back"
            onClick={() => {
              setFlujoCheckout(false);
              setCurrentView(viewAnterior);
            }}
          >
            <ArrowLeft size={16} />
            Seguir comprando
          </button>

          <div className="checkout-login-wrap">

            {/* RESUMEN DEL CARRITO */}
            <div className="checkout-login-summary">

              <h2 className="checkout-login-title">
                Iniciar sesión para continuar
              </h2>

              <p className="checkout-login-subtitle">
                Tienes {totalItemsCarrito}{" "}
                {totalItemsCarrito === 1 ? "producto" : "productos"} en tu carrito
              </p>

              <div className="checkout-login-items">
                {cart.length === 0 ? (
                  <p className="checkout-login-empty">
                    Tu carrito está vacío.
                  </p>
                ) : (
                  cart.map((item) => (
                    <div
                      key={`${item.id}-${item.size || "sin-talla"}`}
                      className="checkout-login-item"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="checkout-login-item-img"
                      />
                      <div className="checkout-login-item-info">
                        <span className="checkout-login-item-name">
                          {item.name}
                        </span>
                        <span className="checkout-login-item-specs">
                          Color: {item.color || "—"} | Talla:{" "}
                          {item.size || "—"} · x{Number(item.quantity) || 1}
                        </span>
                      </div>
                      <span className="checkout-login-item-price">
                        {formatoPrecio(
                          obtenerPrecio(item.price) *
                            (Number(item.quantity) || 1)
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="checkout-login-totals">
                <div className="checkout-login-row">
                  <span>Subtotal</span>
                  <span>{formatoPrecio(subtotalCarrito)}</span>
                </div>
                <div className="checkout-login-row">
                  <span>Envío</span>
                  <span>{formatoPrecio(0)}</span>
                </div>
                <div className="checkout-login-total">
                  <span>Total</span>
                  <strong>{formatoPrecio(subtotalCarrito)}</strong>
                </div>
              </div>

              <button
                type="button"
                className="checkout-login-btn-primary"
                onClick={() => setCurrentView("login")}
              >
                Iniciar sesión para continuar
              </button>

            </div>

            {/* PANEL OSCURO CON LA MARCA */}
            <div className="checkout-login-panel">

              <h1 className="checkout-login-logo">
                LA MANSI<span>ÓN</span>
              </h1>

              <p className="checkout-login-headline">
                Último paso antes de tu pedido
              </p>

              <p className="checkout-login-copy">
                Por tu seguridad, necesitamos que inicies sesión
                para procesar tu compra. No perderás los productos
                que tienes en tu carrito.
              </p>

              <div className="checkout-login-actions">
                <button
                  type="button"
                  className="checkout-login-btn-primary"
                  onClick={() => setCurrentView("login")}
                >
                  Iniciar sesión
                </button>

                <button
                  type="button"
                  className="checkout-login-btn-secondary"
                  onClick={() => setCurrentView("register")}
                >
                  Crear cuenta
                </button>
              </div>

            </div>

          </div>

        </section>

      )}


      {/* ======================================
          LOGIN
      ====================================== */}

      {currentView === "login" && (

        <Login

          onBackToHome={() =>
            setCurrentView(flujoCheckout ? "checkout-login" : "home")
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
            setCurrentView(flujoCheckout ? "checkout-login" : "login")
          }

          onRegisterSuccess={() =>
            setCurrentView(flujoCheckout ? "checkout-login" : "login")
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

        updateQuantity={updateQuantity}

        onContinuarCompra={handleContinuarCompra}

        darkMode={theme === "dark"}

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