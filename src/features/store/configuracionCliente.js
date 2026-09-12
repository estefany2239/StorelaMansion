// =========================================================
// CONFIGURACIÓN DEL CLIENTE - STORE LA MANSIÓN
// =========================================================
// Datos MOCK de la sección "Configuración" del cliente.
// El objeto `user` del login solo trae { nombre, email, rol },
// por eso el perfil extendido (teléfono) vive en localStorage
// bajo 'perfilCliente', junto con direcciones y preferencias.

export const cargarPerfilCliente = (user) => {
  const guardado = JSON.parse(localStorage.getItem("perfilCliente"));
  if (guardado) return guardado;
  return {
    nombre: user?.nombre || "",
    email: user?.email || "",
    telefono: ""
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
  notificacionesEmail: true,
  notificacionesSMS: false
};

export const cargarPreferenciasCliente = () => {
  const guardado = JSON.parse(localStorage.getItem("preferenciasCliente"));
  return {
    ...preferenciasClienteIniciales,
    ...(guardado || {})
  };
};