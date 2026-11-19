// =========================================================
// CONFIGURACIÓN DEL CLIENTE - STORE LA MANSIÓN
// =========================================================
// Caché inicial de la sección "Configuración" del cliente.
// Los DATOS PERSONALES se sincronizan con el backend: la tarjeta los
// carga con GET /api/auth/perfil y los guarda con PUT /api/clientes/mio;
// este objeto solo aporta los valores con los que entra la vista (y los
// últimos guardados) mientras carga o si no hay conexión. El teléfono,
// el tipo y el número de documento se conservan aquí como copia local.

export const cargarPerfilCliente = (user) => {
  const guardado = JSON.parse(localStorage.getItem("perfilCliente"));
  if (guardado) return guardado;
  return {
    nombre: user?.nombre || "",
    email: user?.email || "",
    telefono: "",
    tipoDocumento: "",
    documento: ""
  };
};

export const direccionesClienteIniciales = [
  {
    id: "DIR-001",
    etiqueta: "Casa",
    direccion: "Calle 45 # 20-10, Copacabana, Antioquia",
    predeterminada: true
  },
  {
    id: "DIR-002",
    etiqueta: "Trabajo",
    direccion: "Carrera 43A # 6S-45, El Poblado, Medellín",
    predeterminada: false
  }
];

export const cargarDireccionesCliente = () => {
  const guardado = JSON.parse(localStorage.getItem("direccionesCliente"));
  return guardado && Array.isArray(guardado)
    ? guardado
    : direccionesClienteIniciales;
};

export const preferenciasClienteIniciales = {
  notificacionesEmail: true
};

export const cargarPreferenciasCliente = () => {
  const guardado = JSON.parse(localStorage.getItem("preferenciasCliente"));
  const resto = { ...(guardado || {}) };
  // notificacionesSMS se eliminó junto con su interruptor: si quedó en
  // una copia vieja de localStorage se descarta al cargar.
  delete resto.notificacionesSMS;
  return {
    ...preferenciasClienteIniciales,
    ...resto
  };
};