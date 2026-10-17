// TODO(respaldo temporal): este archivo ya NO es la fuente de verdad.
// La fuente de verdad es la base de datos, leída con GET /api/categorias
// (ver src/hooks/useCategorias.js). Se conserva solo como respaldo para que el
// carrusel del inicio nunca quede en blanco si la API falla o tarda.
// Cuando las categorías de la base de datos estén estabilizadas, se puede
// eliminar este respaldo. Ojo: los ids deben coincidir con la columna `codigo`
// de la tabla `categoria`.
export const categories = [
  { id: "camisetas", name: "Camisetas", genders: ["hombre", "mujer"], image: new URL("../assets/img/camisa.png", import.meta.url).href },
  { id: "busos", name: "Buzos", genders: ["hombre", "mujer"], image: new URL("../assets/img/buso.png", import.meta.url).href },
  { id: "tenis", name: "Tenis", genders: ["hombre", "mujer"], image: new URL("../assets/img/ten.png", import.meta.url).href },
  { id: "blusas", name: "Sudaderas", genders: ["hombre"], image: new URL("../assets/img/sud.png", import.meta.url).href },
  { id: "vestidos", name: "Vestidos", genders: ["mujer"], image: new URL("../assets/img/top.png", import.meta.url).href },
  { id: "pantalonetas", name: "Pantalonetas", genders: ["hombre"], image: new URL("../assets/img/panta.png", import.meta.url).href },
  { id: "gorras", name: "Gorras", genders: ["hombre", "mujer"], image: new URL("../assets/img/gorra.png", import.meta.url).href },
  { id: "relojes", name: "Relojes", genders: ["hombre", "mujer"], image: new URL("../assets/img/reloj.png", import.meta.url).href },
  { id: "perfumes", name: "Perfumes", genders: ["hombre"], image: new URL("../assets/img/per.jpeg", import.meta.url).href },
];
