import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Lock, Minus, Plus, Trash2 } from "lucide-react";

import SplashScreen from "./components/splash/SplashScreen";

import Navbar from "./components/layout/Navbar";
import Hero from "./features/home/Hero";
import Categories from "./features/categories/Categories";
import FeaturedProducts from "./features/home/products/FeaturedProducts";
import Nosotros from "./features/home/Nosotros";
import Footer from "./components/layout/Footer";

import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import ForgotPassword from "./features/auth/ForgotPassword";
import CambiarContrasena from "./features/auth/CambiarContrasena";

import CartDrawer from "./components/cart/CartDrawer";
import PaymentView from "./components/payment/PaymentView";
import { useNotify } from "./components/notifications/useNotify.js";
import CategoryProductsView from "./features/categories/CategoryProductsView";
import ProductDetailPage from "./features/product/ProductDetailPage";
import { useCatalogo } from "./hooks/useCatalogo";
import { obtenerPerfil } from "./services/api";

// VISTAS DEL CLIENTE LOGUEADO
import MisPedidos from "./features/store/MisPedidos";
import Configuracion from "./features/store/Configuracion";
import CompraExitosa from "./features/store/CompraExitosa";
import {
  pedidosClienteIniciales,
  pedidosDeCliente
} from "./features/store/pedidosCliente";
import {
  cargarPerfilCliente,
  cargarDireccionesCliente,
  cargarPreferenciasCliente
} from "./features/store/configuracionCliente";

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

// Resuelve un "destacado" del home a un producto real del catálogo (base de
// datos). Criterio determinista: se toma el nombre del destacado y se busca
// (sin tildes, en singular y plural) un producto activo cuyo nombre o
// categoría lo contenga; si hay varios, se elige el de menor id_producto
// (grupoId) y, dentro de ese grupo, la variante de menor id_variante.
// Si no existe coincidencia, se devuelve null y el detalle queda sin compra.
const sinTildes = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const resolverDestacado = (def, catalogo) => {
  if (!def || !Array.isArray(catalogo) || catalogo.length === 0) return null;

  const clave = sinTildes(def.name);
  if (!clave) return null;

  const claves = [clave];
  if (clave.endsWith("s")) claves.push(clave.slice(0, -1));

  const coincidencias = catalogo.filter((p) => {
    const nombre = sinTildes(p.name);
    const categoria = sinTildes(p.categoryId);
    return claves.some((c) => c && (nombre.includes(c) || categoria.includes(c)));
  });

  if (coincidencias.length === 0) return null;

  return coincidencias
    .slice()
    .sort(
      (a, b) =>
        Number(a.grupoId) - Number(b.grupoId) || Number(a.id) - Number(b.id)
    )[0];
};

// Recupera la sesión guardada en localStorage (si existe y es válida).
// El login guarda el usuario bajo la clave "usuario" (con sus permisos
// "Módulo:Privilegio" incluidos).
const cargarUsuarioSesion = () => {
  try {
    const guardado = JSON.parse(localStorage.getItem("usuario"));
    if (guardado && guardado.email && guardado.rol) return guardado;
  } catch {
    // sesión corrupta: se ignora y se empieza sin usuario
  }
  return null;
};

// Se entra al panel administrativo solo si el usuario tiene
// al menos un permiso ("Módulo:Privilegio") en la sesión.
const tieneAccesoPanel = (usuario) =>
  Array.isArray(usuario?.permisos) && usuario.permisos.length > 0;


export default function App() {

  const notify = useNotify();

  // Catálogo real (base de datos) reutilizado por destacados y catálogo.
  const { catalogo } = useCatalogo();

  // ==========================================
  // VISTA ACTUAL
  // ==========================================

  // Vista inicial: el enlace profundo ?vista=login (usado en las
  // invitaciones por correo) abre el login; una sesión temporal pendiente
  // de cambio de contraseña solo puede llegar a "Establecer nueva
  // contraseña"; con sesión que tiene al menos un permiso se entra al panel.
  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("vista") === "login") {
      window.history.replaceState({}, "", window.location.pathname);
      return "login";
    }

    const guardado = cargarUsuarioSesion();
    if (guardado?.cambioContrasena) return "cambiar-contrasena";
    return guardado && tieneAccesoPanel(guardado) ? "admin" : "home";
  });
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Producto de "Destacados" abierto en su detalle (vista propia sobre el home)
  const [productoDestacado, setProductoDestacado] = useState(null);


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

  const [user, setUser] = useState(cargarUsuarioSesion);


  // Refresca los datos del usuario (incluidos los permisos
  // "Módulo:Privilegio") con GET /api/auth/perfil al cargar la app,
  // para que la sesión guardada no quede desactualizada al recargar.
  useEffect(() => {
    if (!user || user.cambioContrasena) return;
    if (!localStorage.getItem("token")) return;

    let cancelado = false;

    obtenerPerfil()
      .then((perfil) => {
        if (cancelado) return;

        const actualizado = { ...user, ...perfil };
        localStorage.setItem("usuario", JSON.stringify(actualizado));
        setUser(actualizado);

        // Sesión guardada sin permisos (sesión antigua): si el backend
        // confirma que el usuario tiene al menos uno, se entra al panel.
        setCurrentView((vista) =>
          vista === "home" && tieneAccesoPanel(actualizado)
            ? "admin"
            : vista
        );
      })
      .catch(() => {
        // Sin conexión o sesión inválida: se mantiene la sesión guardada.
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ==========================================
  // PEDIDOS DEL CLIENTE (estado + localStorage)
  // Es la MISMA lista que lee MisPedidos.jsx.
  // El pedido nuevo se agrega al inicio para que aparezca primero.
  // ==========================================

  const [pedidosCliente, setPedidosCliente] = useState(() => {
    try {
      const guardados = JSON.parse(localStorage.getItem("pedidosCliente"));
      return Array.isArray(guardados) && guardados.length > 0
        ? guardados
        : pedidosClienteIniciales;
    } catch {
      return pedidosClienteIniciales;
    }
  });

  useEffect(() => {
    localStorage.setItem("pedidosCliente", JSON.stringify(pedidosCliente));
  }, [pedidosCliente]);


  // ==========================================
  // CONFIGURACIÓN DEL CLIENTE
  // ==========================================

  const [perfilCliente, setPerfilCliente] = useState(() =>
    cargarPerfilCliente(user)
  );

  const [direccionesCliente, setDireccionesCliente] = useState(() =>
    cargarDireccionesCliente()
  );

  const [preferenciasCliente, setPreferenciasCliente] = useState(() =>
    cargarPreferenciasCliente()
  );

  useEffect(() => {
    localStorage.setItem("perfilCliente", JSON.stringify(perfilCliente));
  }, [perfilCliente]);

  useEffect(() => {
    localStorage.setItem("direccionesCliente", JSON.stringify(direccionesCliente));
  }, [direccionesCliente]);

  useEffect(() => {
    localStorage.setItem("preferenciasCliente", JSON.stringify(preferenciasCliente));
  }, [preferenciasCliente]);


  // Solo los pedidos hechos por el usuario logueado
  const pedidosDelCliente = pedidosDeCliente(
    pedidosCliente,
    user?.email
  );


  // ==========================================
  // CARRITO
  // ==========================================

  const [cart, setCart] = useState(() => {
    try {
      const guardados = JSON.parse(localStorage.getItem("cartStoremansion"));
      return Array.isArray(guardados) ? guardados : [];
    } catch {
      return [];
    }
  });

  // Persiste el carrito para no perderlo al recargar la página
  useEffect(() => {
    localStorage.setItem("cartStoremansion", JSON.stringify(cart));
  }, [cart]);


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

    // Los destacados sin equivalente real en la base no se pueden comprar.
    if (product?.sinVariante) {
      notify("Este producto aún no está disponible para compra", "error");
      return;
    }

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
  // VOLVER DESDE EL GATE (el carrito se conserva)
  // ==========================================

  const volverDesdeElGate = () => {
    setFlujoCheckout(false);
    setCurrentView(viewAnterior);
  };


  // ==========================================
  // VISTAS DE AUTENTICACIÓN
  // ==========================================

  const isAuthView =
    currentView === "login" ||
    currentView === "register" ||
    currentView === "forgot" ||
    currentView === "cambiar-contrasena";


  // ==========================================
  // LOGIN EXITOSO
  // ==========================================

  const handleLoginSuccess = (userData) => {

    // Guardamos el usuario que inició sesión
    setUser(userData);

    // Reflejamos los datos de la cuenta en el perfil del cliente
    setPerfilCliente((prev) => ({
      ...prev,
      nombre: userData.nombre || prev.nombre,
      email: userData.email || prev.email
    }));

    // Contraseña temporal de invitación: hasta que establezca una nueva
    // contraseña solo puede ver "Establecer nueva contraseña".
    if (userData.cambioContrasena) {
      setFlujoCheckout(false);
      setCurrentView("cambiar-contrasena");
      window.scrollTo({ top: 0 });
      return;
    }

    // Con al menos un permiso ("Módulo:Privilegio"): directo al panel
    if (tieneAccesoPanel(userData)) {
      setFlujoCheckout(false);
      setCurrentView("admin");
      return;
    }


    // Si venía del flujo de compra (gate), avanzar al pago
    if (flujoCheckout) {
      setFlujoCheckout(false);
      setCurrentView("pago");
      return;
    }


    // Cliente: al landing público
    setCurrentView("home");

  };


  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  const handleLogout = () => {

    localStorage.removeItem("usuario");
    localStorage.removeItem("token");

    setUser(null);
    setFlujoCheckout(false);
    setCurrentView("home");

  };


  // ==========================================
  // SEGUIR COMPRANDO (Mis pedidos / Configuración)
  // Vuelve al landing público y baja a "Nuestras Categorías"
  // ==========================================

  const handleSeguirComprando = () => {

    setCurrentView("home");

    // Espera a que el landing se renderice antes de bajar
    window.setTimeout(() => {

      const seccionCategorias =
        document.getElementById("categorias");

      if (seccionCategorias) {
        seccionCategorias.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }

    }, 60);

  };


  // ==========================================
  // NAVEGACIÓN INTERNA DEL NAVBAR PÚBLICO
  // Vuelve al landing y baja a la sección pedida
  // ==========================================

  const irASeccion = (seccionId) => {

    setProductoDestacado(null);
    setCurrentView("home");

    window.setTimeout(() => {

      const seccion = document.getElementById(seccionId);

      if (seccion) {
        seccion.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }

    }, 60);

  };


  // ==========================================
  // CONFIRMAR PAGO: crea el pedido, lo guarda
  // y vacía el carrito
  // ==========================================

  const handleConfirmarPedido = (nuevoPedido) => {

    setPedidosCliente((prev) => [nuevoPedido, ...prev]);

    setCart([]);

    setCurrentView("compra-exitosa");

    window.scrollTo({ top: 0, behavior: "smooth" });

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
        currentView !== "admin" && (

          <Navbar

            user={user}

            onLoginClick={() => {
              setFlujoCheckout(false);
              setCurrentView("login");
            }}

            onNavigate={(vista) =>
              setCurrentView(vista)
            }

            onNavigateSection={irASeccion}

            onBrandClick={() => {
              setProductoDestacado(null);
              setCurrentView("home");
            }}

            onLogout={() => {
              notify("Sesión cerrada", "success");
              handleLogout();
            }}

            theme={theme}

            onToggleTheme={toggleTheme}
          />

      )}


      {/* ======================================
          HOME
      ====================================== */}

      {currentView === "home" && !productoDestacado && (

        <main>

          <Hero />

           <Categories

             onSelectCategory={(cat) => {
               const genders =
                 Array.isArray(cat.genders) && cat.genders.length > 0
                   ? cat.genders
                   : ["hombre", "mujer"];
               setSelectedCategory({
                 id: cat.id,
                 title: cat.name,
                 image: cat.image,
                 genders
               });
               setCurrentView("categoria-genero");
               window.scrollTo({
                 top: 0,
                 behavior: "smooth"
               });
             }}

           />

          <FeaturedProducts
            onViewProduct={(product) => {
              const real = resolverDestacado(product, catalogo);
              setProductoDestacado(real || { ...product, sinVariante: true });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />

          <Nosotros />

        </main>

       )}


       {/* ======================================
           DETALLE DE PRODUCTO DESTACADO (PÚBLICO)
       ====================================== */}

       {currentView === "home" && productoDestacado && (

         <ProductDetailPage
           product={productoDestacado}
           catalogoCompleto={catalogo}
           onBack={() => {
             setProductoDestacado(null);
             window.scrollTo({ top: 0, behavior: "smooth" });
           }}
           addToCart={handleAddToCart}
         />

       )}


       {/* ======================================
           SELECCIÓN GÉNERO POR CATEGORÍA (PÚBLICO)
       ====================================== */}

       {currentView === "categoria-genero" && selectedCategory && (

         <CategoryProductsView
           category={selectedCategory}
           initialGender={
             selectedCategory.genders?.length === 1
               ? selectedCategory.genders[0]
               : null
           }
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

      {currentView === "pago" && user && (

        <PaymentView
          cart={cart}
          user={user}
          darkMode={theme === "dark"}
          onConfirmarPedido={handleConfirmarPedido}
          onBack={handleSeguirComprando}
        />

      )}


      {/* ======================================
          COMPRA EXITOSA
      ====================================== */}

      {currentView === "compra-exitosa" && user && (

        <CompraExitosa

          onVerMisPedidos={() => {
            setCurrentView("mis-pedidos");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}

        />

      )}


      {/* ======================================
          MIS PEDIDOS
      ====================================== */}

      {currentView === "mis-pedidos" && user && (

        <MisPedidos

          pedidos={pedidosDelCliente}

          onBack={handleSeguirComprando}

        />

      )}


      {/* ======================================
          CONFIGURACIÓN
      ====================================== */}

      {currentView === "configuracion" && user && (

        <Configuracion

          user={user}

          theme={theme}

          onToggleTheme={toggleTheme}

          onLogout={() => {
            notify("Sesión cerrada", "success");
            handleLogout();
          }}

          onBack={handleSeguirComprando}

          perfilCliente={perfilCliente}

          setPerfilCliente={setPerfilCliente}

          direccionesCliente={direccionesCliente}

          setDireccionesCliente={setDireccionesCliente}

          preferenciasCliente={preferenciasCliente}

          setPreferenciasCliente={setPreferenciasCliente}

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

          <div className="checkout-login-inner">

            <button
              type="button"
              className="checkout-login-back"
              onClick={volverDesdeElGate}
            >
              <ArrowLeft size={16} />
              Seguir comprando
            </button>

            <header className="checkout-login-header">
              <h1 className="checkout-login-title">Tu pedido</h1>
              <p className="checkout-login-subtitle">
                Revisa tus productos antes de continuar
              </p>
            </header>

            {cart.length === 0 ? (

              <div className="checkout-login-card checkout-login-empty">

                <p className="checkout-login-empty-text">
                  Tu carrito está vacío
                </p>

                <button
                  type="button"
                  className="checkout-login-btn-ghost"
                  onClick={volverDesdeElGate}
                >
                  Seguir comprando
                </button>

              </div>

            ) : (

              <div className="checkout-login-wrap">

                {/* PRODUCTOS DEL CARRITO */}
                <div className="checkout-login-card checkout-login-items">

                  {cart.map((item) => {

                    const cantidad = Number(item.quantity) || 1;

                    return (
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

                          {(item.color || item.size) && (
                            <span className="checkout-login-item-specs">
                              {item.color ? `Color: ${item.color}` : ""}
                              {item.color && item.size ? " | " : ""}
                              {item.size ? `Talla: ${item.size}` : ""}
                            </span>
                          )}
                        </div>

                        <div className="checkout-login-item-controls">

                          <div className="checkout-login-qty">
                            <button
                              type="button"
                              aria-label="Disminuir cantidad"
                              disabled={cantidad <= 1}
                              onClick={() =>
                                updateQuantity &&
                                updateQuantity(item.id, cantidad - 1)
                              }
                            >
                              <Minus size={15} />
                            </button>

                            <span>{cantidad}</span>

                            <button
                              type="button"
                              aria-label="Aumentar cantidad"
                              onClick={() =>
                                updateQuantity &&
                                updateQuantity(item.id, cantidad + 1)
                              }
                            >
                              <Plus size={15} />
                            </button>
                          </div>

                          <span className="checkout-login-item-price">
                            {formatoPrecio(obtenerPrecio(item.price))}
                          </span>

                          <button
                            type="button"
                            className="checkout-login-remove"
                            title="Eliminar producto"
                            aria-label={`Eliminar ${item.name}`}
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 size={17} />
                          </button>

                        </div>

                      </div>
                    );

                  })}

                </div>

                {/* RESUMEN DEL PEDIDO */}
                <aside className="checkout-login-card checkout-login-summary">

                  <h2 className="checkout-login-summary-title">
                    Resumen del pedido
                  </h2>

                  <div className="checkout-login-gold-line" />

                  <div className="checkout-login-summary-rows">

                    <div className="checkout-login-summary-row">
                      <span>Subtotal</span>
                      <span className="checkout-login-summary-amount">
                        {formatoPrecio(subtotalCarrito)}
                      </span>
                    </div>

                    <div className="checkout-login-summary-row">
                      <span>Envío</span>
                      <span className="checkout-login-summary-amount">
                        {formatoPrecio(0)}
                      </span>
                    </div>

                    <div className="checkout-login-summary-row checkout-login-summary-total">
                      <span>Total</span>
                      <span className="checkout-login-summary-amount">
                        {formatoPrecio(subtotalCarrito)}
                      </span>
                    </div>

                  </div>

                  <button
                    type="button"
                    className="checkout-login-btn-primary"
                    onClick={() => setCurrentView("login")}
                  >
                    Continuar con mi compra
                    <ArrowRight size={18} />
                  </button>

                  <p className="checkout-login-note">
                    <Lock size={15} className="checkout-login-note-icon" />
                    <span>
                      Necesitarás iniciar sesión para finalizar tu pedido.
                    </span>
                  </p>

                  <div className="checkout-login-divider" />

                  <p className="checkout-login-signup">
                    ¿No tienes cuenta?{" "}
                    <button
                      type="button"
                      onClick={() => setCurrentView("register")}
                    >
                      Crear cuenta
                    </button>
                  </p>

                </aside>

              </div>

            )}

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
          ESTABLECER NUEVA CONTRASEÑA (invitación)
          Solo se llega después de iniciar sesión con la
          contraseña temporal; no hay enlace directo.
      ====================================== */}

      {currentView === "cambiar-contrasena" && user && (

        <CambiarContrasena

          usuario={user}

          onContrasenaCambiada={(usuarioActualizado) => {

            const datos = {
              ...user,
              ...usuarioActualizado,
              cambioContrasena: false
            };

            localStorage.setItem("usuario", JSON.stringify(datos));

            handleLoginSuccess(datos);

          }}

          onCancelar={handleLogout}

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
        currentView !== "admin" && (

        <Footer />
      )}

    </div>

  );

}