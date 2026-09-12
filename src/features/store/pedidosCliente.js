// =========================================================
// PEDIDOS DEL CLIENTE - STORE LA MANSIÓN
// =========================================================
// Datos MOCK iniciales de "Mis pedidos" para el cliente autenticado.
// Son independientes del panel administrativo (Pedidos.jsx).
// Este array se usa como valor inicial del estado en StoreDashboard;
// los pedidos nuevos generados desde el checkout se guardan en
// localStorage y se mezclan con estos al cargar la app.

export const pedidosClienteIniciales = [
  {
    id: "PED-1025",
    clienteEmail: "cliente@storelamansion.com",
    fecha: "2025-05-14",
    estado: "En camino",
    mensajeEstado: "Tu pedido está en camino",
    estimadoEntrega: "Llegará entre el 18 y 20 de mayo",
    productos: [
      {
        nombre: "Camiseta Clásica",
        imagen: new URL("../../assets/img/camisa.png", import.meta.url).href,
        cantidad: 1,
        talla: "M",
        color: "Negro",
        precio: 120000
      },
      {
        nombre: "Tenis Urban Classic",
        imagen: new URL("../../assets/img/roj.png", import.meta.url).href,
        cantidad: 1,
        talla: "39",
        color: "Blanco",
        precio: 185000
      },
      {
        nombre: "Gorra Tone",
        imagen: new URL("../../assets/img/gor.png", import.meta.url).href,
        cantidad: 1,
        talla: "Única",
        color: "Negro",
        precio: 115000
      }
    ],
    total: 420000,
    abonos: [
      { fecha: "2025-05-10", valor: 120000, metodoPago: "Nequi" }
    ]
  },
  {
    id: "PED-1026",
    clienteEmail: "cliente@storelamansion.com",
    fecha: "2025-05-20",
    estado: "En proceso",
    mensajeEstado: "Tu pedido está siendo preparado",
    estimadoEntrega: "Se despachará dentro de 2 días hábiles",
    productos: [
      {
        nombre: "Blazer Estructurado Beige",
        imagen: new URL("../../assets/img/tar.png", import.meta.url).href,
        cantidad: 1,
        talla: "S",
        color: "Beige",
        precio: 310000
      }
    ],
    total: 310000,
    abonos: []
  },
  {
    id: "PED-1024",
    clienteEmail: "cliente@storelamansion.com",
    fecha: "2025-04-25",
    estado: "Entregado",
    mensajeEstado: "Tu pedido fue entregado",
    estimadoEntrega: "Entregado el 5 de mayo",
    productos: [
      {
        nombre: "Top Satén Escote Halter",
        imagen: new URL("../../assets/img/suda.png", import.meta.url).href,
        cantidad: 1,
        talla: "M",
        color: "Champagne",
        precio: 135000
      },
      {
        nombre: "Pantalón Tiro Alto Palazzo",
        imagen: new URL("../../assets/img/crop.png", import.meta.url).href,
        cantidad: 1,
        talla: "S",
        color: "Crema",
        precio: 155000
      }
    ],
    total: 290000,
    abonos: [
      { fecha: "2025-04-28", valor: 200000, metodoPago: "Nequi" },
      { fecha: "2025-05-02", valor: 90000, metodoPago: "Bancolombia" }
    ]
  },
  {
    id: "PED-1023",
    clienteEmail: "cliente@storelamansion.com",
    fecha: "2025-04-13",
    estado: "Cancelado",
    mensajeEstado: "Tu pedido fue cancelado",
    estimadoEntrega: "El reembolso se verá reflejado en 5 días hábiles",
    productos: [
      {
        nombre: "Traje Slim Fit Marrón",
        imagen: new URL("../../assets/img/jeta.png", import.meta.url).href,
        cantidad: 1,
        talla: "42",
        color: "Marrón",
        precio: 420000
      },
      {
        nombre: "Camisa de Lino Blanca",
        imagen: new URL("../../assets/img/saco.png", import.meta.url).href,
        cantidad: 1,
        talla: "M",
        color: "Blanco",
        precio: 165000
      }
    ],
    total: 585000,
    abonos: [
      { fecha: "2025-04-15", valor: 200000, metodoPago: "Nequi" }
    ]
  },
  {
    id: "PED-1027",
    clienteEmail: "cliente@storelamansion.com",
    fecha: "2025-06-08",
    estado: "Entregado",
    mensajeEstado: "Tu pedido fue entregado",
    estimadoEntrega: "Entregado el 14 de junio",
    productos: [
      {
        nombre: "Tenis Sport Low",
        imagen: new URL("../../assets/img/oso.png", import.meta.url).href,
        cantidad: 1,
        talla: "36",
        color: "Negro",
        precio: 190000
      },
      {
        nombre: "Sudadera Oversize",
        imagen: new URL("../../assets/img/sud.png", import.meta.url).href,
        cantidad: 1,
        talla: "M",
        color: "Gris",
        precio: 175000
      }
    ],
    total: 365000,
    abonos: [
      { fecha: "2025-06-10", valor: 365000, metodoPago: "Tarjeta" }
    ]
  },
  {
    id: "PED-1028",
    clienteEmail: "cliente@storelamansion.com",
    fecha: "2025-06-18",
    estado: "En proceso",
    mensajeEstado: "Tu pedido está en proceso de preparación",
    estimadoEntrega: "Llegará entre el 28 y 30 de junio",
    productos: [
      {
        nombre: "Gorra Dad Cap",
        imagen: new URL("../../assets/img/gorra.png", import.meta.url).href,
        cantidad: 1,
        talla: "Única",
        color: "Negro",
        precio: 120000
      },
      {
        nombre: "Reloj Minimalista Dorado",
        imagen: new URL("../../assets/img/lone.png", import.meta.url).href,
        cantidad: 1,
        talla: "Única",
        color: "Dorado",
        precio: 180000
      }
    ],
    total: 300000,
    abonos: [
      { fecha: "2025-06-20", valor: 100000, metodoPago: "Nequi" }
    ]
  },
  {
    id: "PED-1029",
    clienteEmail: "cliente@storelamansion.com",
    fecha: "2025-06-30",
    estado: "En camino",
    mensajeEstado: "Tu pedido está en camino",
    estimadoEntrega: "Llegará entre el 6 y 8 de julio",
    productos: [
      {
        nombre: "Buzo Deportivo Premium",
        imagen: new URL("../../assets/img/buso.png", import.meta.url).href,
        cantidad: 1,
        talla: "L",
        color: "Negro",
        precio: 210000
      },
      {
        nombre: "Jogger Cargo Beige",
        imagen: new URL("../../assets/img/panta.png", import.meta.url).href,
        cantidad: 1,
        talla: "32",
        color: "Beige",
        precio: 170000
      }
    ],
    total: 380000,
    abonos: [
      { fecha: "2025-07-02", valor: 380000, metodoPago: "Bancolombia" }
    ]
  },
  {
    id: "PED-1030",
    clienteEmail: "cliente@storelamansion.com",
    fecha: "2025-07-10",
    estado: "En proceso",
    mensajeEstado: "Tu pedido está siendo preparado",
    estimadoEntrega: "Se despachará dentro de 3 días hábiles",
    productos: [
      {
        nombre: "Camisa de Lino Blanca",
        imagen: new URL("../../assets/img/saco.png", import.meta.url).href,
        cantidad: 1,
        talla: "M",
        color: "Blanco",
        precio: 165000
      },
      {
        nombre: "Pantalón Chino Beige",
        imagen: new URL("../../assets/img/gor.png", import.meta.url).href,
        cantidad: 1,
        talla: "32",
        color: "Beige",
        precio: 190000
      }
    ],
    total: 355000,
    abonos: []
  }
];

export const getTotalAbonado = (pedido) =>
  pedido.abonos.reduce((acc, a) => acc + a.valor, 0);

export const getSaldoPendiente = (pedido) =>
  pedido.total - getTotalAbonado(pedido);