// =========================================================
// CONFIGURACIÓN POR CATEGORÍA (plantilla PaginaCategoria)
// Cada categoría define: título, descripción, foto del banner,
// las tarjetas de público (masculino / femenino) con su foto y
// el campo `publicoDirecto`:
//   · null (por defecto): al entrar se muestra la pantalla de
//     selección "Moda masculina / Moda femenina".
//   · "hombre" | "mujer": se salta esa pantalla y se va directo
//     al listado con el público ya aplicado.
// La clave se normaliza (minúsculas, sin tildes, singular/plural
// equivalentes) para que "Tenis", "Camiseta" o "Camisetas"
// coincidan con la misma configuración.
//
// ── DÓNDE SE CAMBIAN LAS FOTOS PROPIAS ──────────────────────
// · Foto del BANNER de la categoría: campo `foto` de cada
//   categoría (abajo). Se puede poner un import nuevo arriba
//   (ej. import miFoto from "../../assets/img/mi-foto.jpg")
//   o una ruta de /public (ej. foto: "/landing/mi-foto.jpg").
//   · Foto de cada TARJETA de público: campo `foto` dentro de
//   cada objeto de `tarjetas` (masculino / femenino).
// · Campo `fotoAncha` (booleano, por defecto false): cuando es
//   true la foto del banner cubre TODO el banner (fotos de
//   escena anchas, ~2172x724); cuando es false la foto queda a
//   la derecha con el borde izquierdo difuminado.
// · Campo `fotoPosicion` (opcional): object-position de la foto
//   cuando fotoAncha es true (por defecto "75% center"). La
//   primera cifra mueve la foto en horizontal y la segunda en
//   vertical; úsalo para que el sujeto principal quede a la
//   derecha, completo y sin quedar tapado por el texto.
// · Mientras una categoría no tenga foto propia comparte la
//   del banner del landing o las genéricas moda-masculina /
//   moda-femenina; al cambiar el campo `foto` la reemplaza sin
//   tocar ningún componente.
// =========================================================

import tenisHeroImg from "../../assets/img/tenis-hero.jpeg";
import modaMasculinaImg from "../../assets/img/moda-masculina.jpeg";
import modaFemeninaImg from "../../assets/img/moda-femenina.jpeg";
import camisaImg from "../../assets/img/fondd.png";
import jordaImg from "../../assets/img/fondi.png";
import busoImg from "../../assets/img/fonbuso.png";
import relojImg from "../../assets/img/lujo.png";
import vestidoImg from "../../assets/img/vesti.png";
import pantalonetaImg from "../../assets/img/pantaaa.png";
import sudaderaImg from "../../assets/img/raa.png";
import perfumeImg from "../../assets/img/perfun.png";
import bannerImg from "../../assets/img/banner.png";
import { sinTildes } from "../../shared/utils/destacados";


// Tarjetas de público compartidas por todas las categorías
// mientras no tengan fotos propias (misma plantilla, cero
// duplicación). Para fotos propias de una categoría, copia
// estas dos tarjetas dentro de su config y cambia cada
// campo `foto`.
const TARJETAS_ESTANDAR = [
  {
    publico: "masculino",
    etiqueta: "Moda masculina",
    descripcion: "Estilo, comodidad y las mejores marcas para ti.",
    foto: modaMasculinaImg
  },
  {
    publico: "femenino",
    etiqueta: "Moda femenina",
    descripcion: "Tendencias, versatilidad y estilo en cada prenda.",
    foto: modaFemeninaImg
  }
];

// Tarjetas propias de Perfumes: sin foto propia de tarjeta todavía,
// usan como respaldo provisional la foto del banner (config.foto/per.jpeg).
const TARJETAS_PERFUMES = [
  {
    publico: "hombre",
    etiqueta: "Perfumes masculinos",
    descripcion: "Fragancias con carácter para él.",
    foto: perfumeImg
  },
  {
    publico: "mujer",
    etiqueta: "Perfumes femeninos",
    descripcion: "Fragancias elegantes para ella.",
    foto: perfumeImg
  }
];

// Tarjetas propias de Relojes: fotos de tarjeta propias (no modificadas).
// Solo se ajustan los textos de etiqueta y descripción.
const TARJETAS_RELOJES = [
  {
    publico: "hombre",
    etiqueta: "Relojes masculinos",
    descripcion: "Relojes con presencia para él.",
    foto: modaMasculinaImg
  },
  {
    publico: "mujer",
    etiqueta: "Relojes femeninos",
    descripcion: "Relojes con estilo para ella.",
    foto: modaFemeninaImg
  }
];

const CATEGORIAS_CONFIG = {
  tenis: {
    titulo: "Tenis",
    descripcion: "Comodidad, estilo y exclusividad en cada paso.",
    foto: tenisHeroImg,
    fotoAncha: true,
    publicoDirecto: null,
    tarjetas: TARJETAS_ESTANDAR
  },
  camisetas: {
    titulo: "Camisetas",
    descripcion: "Básicos y diseños con el estilo que te representa.",
    foto: camisaImg,
    fotoAncha: true,
    fotoPosicion: "60% 30%",
    publicoDirecto: null,
    tarjetas: TARJETAS_ESTANDAR
  },
  gorras: {
    titulo: "Gorras",
    descripcion: "El toque final que define tu look.",
    foto: jordaImg,
    fotoAncha: true,
    publicoDirecto: null,
    tarjetas: TARJETAS_ESTANDAR
  },
  busos: {
    titulo: "Buzos",
    descripcion: "Abrigo, comodidad y actitud urbana.",
    foto: busoImg,
    fotoAncha: true,
    fotoPosicion: "50% 30%",
    publicoDirecto: null,
    tarjetas: TARJETAS_ESTANDAR
  },
  relojes: {
    titulo: "Relojes",
    descripcion: "Elegancia que marca cada momento.",
    foto: relojImg,
    fotoAncha: true,
    fotoPosicion: "50% 40%",
    publicoDirecto: null,
    tarjetas: TARJETAS_RELOJES
  },
  vestidos: {
    titulo: "Vestidos",
    descripcion: "Elegancia y frescura para cada ocasión.",
    foto: vestidoImg,
    fotoAncha: true,
    fotoPosicion: "60% 25%",
    publicoDirecto: "mujer",
    tarjetas: TARJETAS_ESTANDAR
  },
  pantalonetas: {
    titulo: "Pantalonetas",
    descripcion: "Frescura y comodidad en movimiento.",
    foto: pantalonetaImg,
    fotoAncha: true,
    fotoPosicion: "60% 35%",
    publicoDirecto: "hombre",
    tarjetas: TARJETAS_ESTANDAR
  },
  sudaderas: {
    titulo: "Sudaderas",
    descripcion: "Suavidad y estilo para cada día.",
    foto: sudaderaImg,
    fotoAncha: true,
    fotoPosicion: "75% 0%",
    publicoDirecto: "hombre",
    tarjetas: TARJETAS_ESTANDAR
  },
  perfumes: {
    titulo: "Perfumes",
    descripcion: "Fragancias que dejan huella.",
    foto: perfumeImg,
    fotoAncha: true,
    fotoPosicion: "60% 20%",
    publicoDirecto: null,
    tarjetas: TARJETAS_PERFUMES
  }
};

// =========================================================
// CONFIGURACIÓN DE LA PÁGINA "TODOS LOS PRODUCTOS"
// Misma estructura que una categoría (título, descripción y
// foto del banner) pero sin filtro por categoría ni público:
// el listado (TodosProductosView) muestra TODO el catálogo.
// ── FOTO PROVISIONAL ────────────────────────────────────────
// No hay foto propia todavía: se usa tenis-hero.jpeg (la misma
// del banner de Tenis). Para la definitiva, reemplaza el campo
// `foto` por tu import (ej. import bannerTodos from
// "../../assets/img/mi-foto.jpg") dejando la imagen en
// src/assets/img/ y sin tocar ningún componente.
// =========================================================
export const CONFIG_TODOS = {
  titulo: "Todos los productos",
  descripcion: "Toda la colección de Store La Mansión en un solo lugar.",
  foto: bannerImg,
  fotoAncha: true
};

// Respaldo para categorías fuera de esta lista (mismo flujo,
// con corona en el banner y tarjetas estándar).
const DESCRIPCIONES_DEFECTO = {
  masculino: "Estilo, comodidad y las mejores marcas para ti.",
  femenino: "Tendencias, versatilidad y estilo en cada prenda."
};

const PUBLICO_POR_GENERO = {
  hombre: "masculino",
  mujer: "femenino"
};

// Clave de la categoría probando plural/singulares contra la configuración.
// EXPORTADA: la navegación (App.handleVerCategoria) y la plantilla
// (obtenerConfigCategoria) usan la MISMA normalización, así que buso,
// buzo y buzos llevan todas a la entrada "busos" (el panel llamó
// "Busos" a los buzos: es la misma categoría).
export const claveCategoria = (nombre) => {
  const clave = sinTildes(nombre);
  const variantes = [clave];
  if (clave.endsWith("es") && clave.length > 4) variantes.push(clave.slice(0, -2));
  if (clave.endsWith("s") && clave.length > 3) variantes.push(clave.slice(0, -1));
  variantes.push(`${clave}s`, `${clave}es`);
  // Equivalencia buzo/buso: aplica a la clave y a todas sus variantes.
  const candidatas = variantes.concat(
    variantes.map((variante) => variante.replace("buzo", "buso"))
  );
  const encontrada = candidatas.find((v) =>
    Object.prototype.hasOwnProperty.call(CATEGORIAS_CONFIG, v)
  );
  return encontrada || clave.replace("buzo", "buso");
};

// Público que aplica directo a la categoría ("hombre" | "mujer" | null).
// null = mostrar la pantalla de selección Moda masculina / Moda femenina.
export function obtenerPublicoDirecto(nombre) {
  const config = CATEGORIAS_CONFIG[claveCategoria(nombre)];
  return config?.publicoDirecto || null;
}

export function obtenerConfigCategoria(nombre, genders = []) {
  const clave = claveCategoria(nombre);
  const config = CATEGORIAS_CONFIG[clave];

  if (config) {
    // Solo las tarjetas cuyo público corresponde a un género real de la
    // categoría (ej. Sudaderas solo permite hombre → solo MASCULINA).
    // Así el género elegido en la tarjeta siempre es válido en la vista
    // de productos. Si la categoría no declara géneros (defensivo) se
    // conservan las tarjetas de la configuración.
    // Excepción: Perfumes debe mostrar siempre sus dos tarjetas.
    if (clave === "perfumes") {
      return { ...config };
    }

    const publicosValidos = new Set(
      (Array.isArray(genders) ? genders : [])
        .map((genero) => PUBLICO_POR_GENERO[genero])
        .filter(Boolean)
    );

    const tarjetasFiltradas =
      publicosValidos.size === 0
        ? config.tarjetas
        : config.tarjetas.filter((t) => publicosValidos.has(t.publico));

    return {
      ...config,
      tarjetas: tarjetasFiltradas.length > 0 ? tarjetasFiltradas : config.tarjetas
    };
  }

  const generos =
    Array.isArray(genders) && genders.length > 0 ? genders : ["hombre", "mujer"];

  return {
    titulo: String(nombre || "").trim(),
    descripcion: "",
    foto: null,
    tarjetas: generos
      .map((genero) => {
        const publico = PUBLICO_POR_GENERO[genero];
        if (!publico) return null;
        return {
          publico,
          etiqueta: publico === "masculino" ? "Moda masculina" : "Moda femenina",
          descripcion: DESCRIPCIONES_DEFECTO[publico],
          foto: null
        };
      })
      .filter(Boolean)
  };
}
