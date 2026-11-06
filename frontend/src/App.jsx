import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Lock, Trash2 } from "lucide-react";

import SplashScreen from "./shared/components/splash/SplashScreen";

import Navbar from "./shared/components/layout/Navbar";
import Hero from "./features/home/Hero";
import Categories from "./features/categories/Categories";
import FeaturedProducts from "./features/home/products/FeaturedProducts";
import Nosotros from "./features/home/Nosotros";
import Footer from "./shared/components/layout/Footer";

import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import CambiarContrasena from "./features/auth/pages/CambiarContrasena";

import CartDrawer from "./shared/components/cart/CartDrawer";
import CantidadControl from "./shared/components/cart/CantidadControl";
import {
  cantidadParaCarrito,
  esAgotado,
  hayStock,
} from "./shared/components/cart/cantidad";
import PaymentView from "./features/checkout/pages/PaymentView";
import { useNotify } from "./shared/components/notifications/useNotify.js";
import CategoryProductsView from "./features/categories/CategoryProductsView";
import ProductDetailPage from "./features/product/ProductDetailPage";
import { useCatalogo, refrescarCatalogo, suscribirCatalogo } from "./shared/hooks/useCatalogo";
import { buscarVariantePorId, getVarianteBase, tallaVisible } from "./shared/utils/catalogo";
import { resolverDestacado } from "./shared/utils/destacados";
import { obtenerPerfil } from "./shared/services/api";
import FavoritosProvider from "./shared/hooks/FavoritosProvider";

// VISTAS DEL CLIENTE LOGUEADO
import MisPedidos from "./features/store/pages/MisPedidos";
import MisFavoritos from "./features/store/pages/MisFavoritos";
import Configuracion from "./features/store/pages/Configuracion";
import CompraExitosa from "./features/store/pages/CompraExitosa";
import {
  pedidosClienteIniciales,
  pedidosDeCliente
} from "./features/store/data/pedidosCliente";
import {
  cargarPerfilCliente,
  cargarDireccionesCliente,
  cargarPreferenciasCliente
} from "./features/store/data/configuracionCliente";

// PANEL ADMINISTRATIVO
import AdminLayout from "./features/admin/AdminLayout";

// Helpers de precio para el gate de compra (misma lógica que el CartDrawer)
const obtenerPrecio = (precio) => {
  if (typeof precio === "number") return precio;
  if (!precio) return 0;
  const numero = Number(String(precio).replace(/[$COP.,\s]/gi, "").trim());
  return Number.isNaN(numero) ? 0 : numero;
};

const formatoPrecio = (valor) => `$${valor.toLocaleString("es-CO")} COP`;

// Resuelve un "destacado" del home a un producto real del catálogo (base de
// datos): la lógica vive en shared/utils/destacados.js y también la usa
// la tarjeta de destacados para saber su id_producto (favoritos).

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

  // Sincroniza el stock real de cada variante en las líneas del carrito:
  // los ítems guardados en localStorage pueden no traerlo y el catálogo ya
  // incluye producto_variante.stock. useCatalogo avisa con cada ida al
  // backend (al cargar la tienda, al agregar un producto, al ir al pago y
  // tras un 409 del servidor); con ese aviso se recorta la cantidad al
  // máximo disponible y se explica el cambio con toast (nunca alert()).
  useEffect(() => {
    const alCambiarStock = (productos) => {
      if (!Array.isArray(productos) || productos.length === 0) return;
      if (cart.length === 0) return;

      const cambios = [];
      const eliminados = [];
      const siguientes = new Map();

      cart.forEach((item) => {
        const idVariante = item.id_variante ?? item.id;
        const variante = buscarVariantePorId(productos, idVariante);

        // La variante ya no existe en el catálogo (producto o talla
        // eliminada): se quita del carrito para no dejar líneas rotas.
        if (!variante) {
          eliminados.push(item);
          return;
        }

        const clave = String(variante.id_variante ?? variante.id);
        const previa = siguientes.get(clave);
        const cantidadAcumulada =
          (Number(previa?.quantity) || 0) + (Number(item.quantity) || 1);
        const stock = hayStock(variante.stock)
          ? Number(variante.stock)
          : hayStock(item.stock)
            ? Number(item.stock)
            : null;
        const quantity = cantidadParaCarrito(cantidadAcumulada, stock);
        const talla = tallaVisible(variante.size ?? item.size);

        const actualizado = {
          ...(previa || item),
          id: variante.id ?? idVariante,
          id_variante: variante.id_variante ?? variante.id ?? idVariante,
          name: variante.name || item.name,
          color: variante.color || item.color || "",
          image: variante.image || item.image,
          price: variante.price || item.price,
          stock,
          quantity,
        };

        if (talla) actualizado.size = talla;
        else delete actualizado.size;

        siguientes.set(clave, actualizado);
      });

      const siguiente = Array.from(siguientes.values());
      const huboCambios =
        eliminados.length > 0 ||
        siguiente.length !== cart.length ||
        siguiente.some((linea, indice) => {
          const original = cart[indice];
          if (!original) return true;

          return (
            String(linea.id_variante) !==
              String(original.id_variante ?? original.id) ||
            linea.id !== original.id ||
            linea.quantity !== original.quantity ||
            linea.stock !== original.stock ||
            (linea.size || "") !== (original.size || "") ||
            (linea.color || "") !== (original.color || "") ||
            linea.name !== original.name ||
            linea.image !== original.image ||
            linea.price !== original.price
          );
        });

      if (!huboCambios) return;

      setCart(siguiente);

      if (eliminados.length > 0) {
        const nombres = Array.from(
          new Set(eliminados.map((item) => item.name).filter(Boolean))
        );

        notify(
          nombres.length > 0
            ? `Quitamos del carrito productos que ya no están disponibles: ${nombres.join(", ")}.`
            : "Quitamos del carrito productos que ya no están disponibles.",
          "info"
        );
      }

      cart.forEach((item) => {
        const id = String(item.id_variante ?? item.id);
        const nueva = siguiente.find(
          (linea) => String(linea.id_variante) === id
        );

        if (!nueva) return;

        const anterior = Number(item.quantity) || 1;
        const stockAnterior = hayStock(item.stock) ? Number(item.stock) : null;
        const stockNuevo = hayStock(nueva.stock) ? Number(nueva.stock) : null;

        if (stockAnterior === stockNuevo && anterior === nueva.quantity) return;

        cambios.push({
          item,
          stock: stockNuevo,
          quantity: nueva.quantity,
          // Solo interesa avisar cuando el cliente pierde unidades o la
          // variante se queda sin stock (el resto es un dato silencioso).
          afecta:
            stockNuevo !== null &&
            (stockNuevo <= 0 || nueva.quantity < anterior),
        });
      });

      cambios
        .filter((cambio) => cambio.afecta)
        .forEach(({ item, stock, quantity }) => {
          const nombre = item.name || "Un producto de tu carrito";

          if (stock <= 0) {
            notify(
              `Sin stock: "${nombre}" se agotó. Elimínalo del carrito para continuar con tu compra.`,
              "error"
            );
            return;
          }

          notify(
            `Stock actualizado: "${nombre}" ahora tiene ${stock} unidad${
              stock === 1 ? "" : "es"
            } disponible${stock === 1 ? "" : "s"}; ajustamos tu cantidad a ${quantity}.`,
            "info"
          );
        });
    };

    // El callback corre cuando termina una consulta del catálogo (no en el
    // cuerpo del effect), así el carrito se ajusta sin renders en cascada.
    return suscribirCatalogo(alCambiarStock);
  }, [cart, notify]);


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

    // Variante sin unidades: no se agrega ni se compra. Se avisa con el
    // toast del proyecto (nunca alert()).
    if (esAgotado(product.stock)) {
      notify(
        `"${product.name}" está agotado: no se puede agregar al carrito.`,
        "error"
      );
      return false;
    }

    // Si por error llega un producto agrupado, se guarda una variante real:
    // nunca el arreglo `variantes` dentro de localStorage.
    const base =
      product && Array.isArray(product.variantes)
        ? getVarianteBase(product)
        : product;

    const idVariante = base.id_variante ?? base.id;
    const talla = tallaVisible(base.size);
    const linea = {
      ...base,
      id: base.id ?? idVariante,
      id_variante: idVariante,
      color: base.color || "",
    };

    if (talla) linea.size = talla;
    else delete linea.size;

    // Cantidad pedida desde el detalle de producto (por defecto 1),
    // recortada al stock real de la variante.
    const pedidas = cantidadParaCarrito(linea.quantity, linea.stock);

    const existente = cart.find(
      (item) =>
        String(item.id_variante ?? item.id) === String(idVariante)
    );

    if (!existente) {
      setCart([
        ...cart,
        {
          ...linea,
          quantity: pedidas
        }
      ]);
      return true;
    }

    // El stock más reciente manda: el del producto si lo trae,
    // si no el que ya tenía la línea del carrito.
    const stock = hayStock(linea.stock)
      ? Number(linea.stock)
      : existente.stock;

    const anterior = Number(existente.quantity) || 1;
    const deseado = anterior + pedidas;
    const quantity = cantidadParaCarrito(deseado, stock);

    setCart(
      cart.map((item) => {
        if (
          String(item.id_variante ?? item.id) !== String(idVariante)
        ) {
          return item;
        }

        const actualizado = {
          ...item,
          id: linea.id ?? item.id,
          id_variante: idVariante,
          name: linea.name || item.name,
          color: linea.color || item.color || "",
          image: linea.image || item.image,
          price: linea.price || item.price,
          stock: hayStock(linea.stock)
            ? Number(linea.stock)
            : item.stock,
          quantity
        };

        if (talla) actualizado.size = talla;
        else delete actualizado.size;

        return actualizado;
      })
    );

    // La suma pasó del stock disponible: se queda en el máximo y se avisa.
    if (quantity < deseado) {
      notify(
        `Alcanzaste el máximo disponible: ${quantity} unidad${
          quantity === 1 ? "" : "es"
        } de "${product.name}".`,
        "info"
      );
    }

    return true;

  };


  // ==========================================
  // ELIMINAR PRODUCTO DEL CARRITO
  // ==========================================

  const removeFromCart = (productId) => {

    setCart((prevCart) =>
      prevCart.filter(
        (item) =>
          String(item.id_variante ?? item.id) !== String(productId)
      )
    );

  };


  // ==========================================
  // ACTUALIZAR CANTIDAD DE UN PRODUCTO
  // ==========================================

  const updateQuantity = (productId, quantity) => {

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (
          String(item.id_variante ?? item.id) !== String(productId)
        ) {
          return item;
        }

        // Siempre un entero positivo: nunca baja de 1 ni supera el
        // stock de la variante.
        return {
          ...item,
          quantity: cantidadParaCarrito(quantity, item.stock)
        };
      })
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

    // Si la variante está agotada no se agrega ni se abre el carrito
    // (addToCart ya avisó con el toast).
    if (!addToCart(product)) return;

    setIsCartOpen(true);

    // Pide el stock otra vez al backend: si cambió, el efecto de
    // sincronización recorta cantidades y avisa qué producto cambió.
    refrescarCatalogo();

  };


  // ==========================================
  // CONTINUAR COMPRA (siguiente paso pendiente)
  // ==========================================

  const handleContinuarCompra = () => {

    // Una línea sin unidades bloquea el paso al pago: hay que eliminarla.
    if (cart.some((item) => esAgotado(item.stock))) {
      notify(
        "Hay productos agotados en tu carrito: elimínalos para continuar con tu compra.",
        "error"
      );
      return;
    }

    // Cerramos el drawer en todos los casos
    setIsCartOpen(false);

    // Última consulta de stock antes de pagar: si algo cambió, el efecto
    // de sincronización recorta las cantidades y avisa en el resumen.
    refrescarCatalogo();

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
      // Pregunta al backend por el stock una vez más antes de pagar.
      refrescarCatalogo();
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
  // PERFIL ACTUALIZADO DESDE CONFIGURACIÓN
  // ==========================================

  // Tras guardar en PUT /api/clientes/mio, la sesión guardada (menú de
  // cuenta) refleja el nombre y el correo nuevos. El token NO se toca:
  // solo contiene id y rol, así que sigue siendo válido con el correo
  // cambiado, y el próximo login usará el correo nuevo.
  const handlePerfilActualizado = (datos) => {

    const actualizado = {
      ...user,
      nombre: datos.nombre,
      email: datos.email
    };

    localStorage.setItem("usuario", JSON.stringify(actualizado));
    setUser(actualizado);

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

    <FavoritosProvider user={user}>

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
            onIrALogin={() => {
              setFlujoCheckout(false);
              setCurrentView("login");
            }}
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
           key={productoDestacado.id}
           product={productoDestacado}
           catalogoCompleto={catalogo}
           onBack={() => {
              setProductoDestacado(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            addToCart={handleAddToCart}
            onIrALogin={() => {
              setFlujoCheckout(false);
              setCurrentView("login");
            }}
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
            onIrALogin={() => {
              setFlujoCheckout(false);
              setCurrentView("login");
            }}
          />

       )}


      {/* ======================================
          MIS FAVORITOS
      ====================================== */}

      {currentView === "favoritos" && user?.rol === "Cliente" && (

        <MisFavoritos

          onBack={handleSeguirComprando}

          onVerProductos={() => irASeccion("productos")}

          addToCart={handleAddToCart}
          onIrALogin={() => {
            setFlujoCheckout(false);
            setCurrentView("login");
          }}
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
          onIrAMisPedidos={() => {
            setCurrentView("mis-pedidos");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onBack={handleSeguirComprando}
          onStockActualizado={refrescarCatalogo}
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

          onPerfilActualizado={handlePerfilActualizado}

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
                    const talla = tallaVisible(item.size);

                    return (
                      <div
                        key={`${item.id}-${talla || "sin-talla"}`}
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

                          {(item.color || talla) && (
                            <span className="checkout-login-item-specs">
                              {item.color ? `Color: ${item.color}` : ""}
                              {item.color && talla ? " | " : ""}
                              {talla ? `Talla: ${talla}` : ""}
                            </span>
                          )}

                          {esAgotado(item.stock) && (
                            <span className="checkout-login-item-agotado" role="status">
                              Agotado · no hay unidades disponibles
                            </span>
                          )}
                        </div>

                        <div className="checkout-login-item-controls">

                          <CantidadControl
                            className="checkout-login-qty"
                            cantidad={cantidad}
                            stock={item.stock}
                            onChange={(valor) =>
                              updateQuantity &&
                              updateQuantity(item.id, valor)
                            }
                          />

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
                        Se calcula en el checkout
                      </span>
                    </div>

                    <div className="checkout-login-summary-row checkout-login-summary-total">
                      <span>Total productos</span>
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

    </FavoritosProvider>

  );

}