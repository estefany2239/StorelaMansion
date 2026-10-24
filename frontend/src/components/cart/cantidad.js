// =========================================================
// LÓGICA PURA DEL CONTROL DE CANTIDAD
// =========================================================
// Funciones sin dependencias de React, compartidas por
// CantidadControl.jsx y verificables con Node directamente.

// Deja únicamente dígitos: descarta letras, signos, puntos, comas y la 'e'.
export const soloDigitos = (texto) => String(texto ?? "").replace(/\D/g, "");

// Convierte el texto escrito en una cantidad válida; null = inválido.
export const parsearCantidad = (texto) => {
  const limpio = soloDigitos(texto);
  if (!limpio) return null;
  const numero = Number(limpio);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
};

// ¿La línea trae un stock informado? (null/undefined/vacío = sin dato)
export const hayStock = (stock) =>
  !(
    stock === null ||
    stock === undefined ||
    stock === "" ||
    !Number.isFinite(Number(stock))
  );

// Tope superior por stock. Sin dato de stock (null/undefined/vacío)
// no hay tope en el frontend: el backend valida el stock real.
// Con stock 0 el tope es 1: la línea ya no puede crecer y, además,
// se marca como agotada (ver esAgotado) para bloquear la compra.
export const topeDe = (stock) => {
  if (!hayStock(stock)) return Infinity;
  // Nunca por debajo de 1: la cantidad mínima es una unidad.
  return Math.max(1, Number(stock));
};

// ¿La variante no tiene unidades? (stock informado menor o igual a 0).
// Un producto agotado no se puede agregar al carrito ni comprar.
export const esAgotado = (stock) => hayStock(stock) && Number(stock) <= 0;

// Aviso mostrado bajo el control al superar el stock disponible.
export const mensajeStock = (tope) =>
  `Solo hay ${tope} unidad${tope === 1 ? "" : "es"} disponible${
    tope === 1 ? "" : "s"
  } de esta variante`;

// Aviso persistente bajo el control cuando la cantidad llegó al tope.
export const mensajeMaximo = (tope) =>
  `Alcanzaste el máximo disponible: ${tope} unidad${tope === 1 ? "" : "es"}`;

// Aviso persistente bajo el control cuando la variante está agotada.
export const mensajeAgotado = () =>
  "Producto agotado: no hay unidades disponibles";

// Cantidad final que debe quedar en el carrito: SIEMPRE un entero
// positivo (nunca 0, negativo, decimal, NaN o texto), nunca por debajo
// de 1 ni por encima del stock de la variante.
export const cantidadParaCarrito = (cantidad, stock) => {
  const numero = Math.trunc(Number(cantidad));
  return Math.min(
    topeDe(stock),
    Math.max(1, Number.isFinite(numero) ? numero : 1)
  );
};
