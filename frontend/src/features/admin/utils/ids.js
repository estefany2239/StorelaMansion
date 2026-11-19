// Formato compartido del ID de cliente para que se vea igual en todos los
// módulos del panel (Clientes, Pedidos, etc.): CLI-001 con 3 dígitos.
// Acepta tanto el id numérico del backend como uno ya con el prefijo.
export const formatoCliente = (id) => {
  const digitos = String(id ?? "").replace(/\D/g, "");

  if (!digitos) {
    return "";
  }

  return `CLI-${digitos.padStart(3, "0")}`;
};
