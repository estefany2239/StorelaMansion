
// 1. Productos para la sección de Inicio (Destacados)

export const featuredProducts = [
    
  {
    id: "f1",
    grupoId: "f1",
    name: "Blazer Estructurado Beige",
    price: 310000,
    priceFormatted: "$310.000",
    image: new URL("../assets/img/tar.png", import.meta.url).href,
    tag: "Destacado"
  },
  {
    id: "f2",
    grupoId: "f2",
    name: "Traje Slim Fit Marrón",
    price: 420000,
    priceFormatted: "$420.000",
    image: new URL("../assets/img/jeta.png", import.meta.url).href,
    tag: "Exclusivo"
  },
  {
    id: "f3",
    grupoId: "f3",
    name: "Vestido Midi Seda Champagne",
    price: 240000,
    priceFormatted: "$240.000",
    image: new URL("../assets/img/top.png", import.meta.url).href,
    tag: "Nuevo"
  },
  {
    id: "f4",
    grupoId: "f4",
    name: "Reloj Minimalista Dorado",
    price: 180000,
    priceFormatted: "$180.000",
    image: new URL("../assets/img/lone.png", import.meta.url).href,
    tag: "Top"
  }
];

// 2. Productos EXCLUSIVOS de la sección Moda Femenina (WomenCollection)
export const womenProducts = [
  {
    id: "w1",
    grupoId: "w1",
    name: "Vestido Midi Seda Champagne",
    category: "mujer",
    price: 240000,
    priceFormatted: "$240.000",
    image: new URL("../assets/img/camisa.png", import.meta.url).href,
    tag: "Nuevo"
  },
  {
    id: "w2",
    grupoId: "w2",
    name: "Blazer Estructurado Beige",
    category: "mujer",
    price: 310000,
    priceFormatted: "$310.000",
    image: new URL("../assets/img/ten.png", import.meta.url).href,
    tag: "Exclusivo"
  },
  {
    id: "w3",
    grupoId: "w3",
    name: "Conjunto Lino Premium",
    category: "mujer",
    price: 285000,
    priceFormatted: "$285.000",
    image: new URL("../assets/img/reloj.png", import.meta.url).href,
    tag: "Tendencia"
  },
  {
    id: "w4",
    grupoId: "w4",
    name: "Top Satén Escote Halter",
    category: "mujer",
    price: 135000,
    priceFormatted: "$135.000",
    image: new URL("../assets/img/suda.png", import.meta.url).href,
    tag: "Básico"
  },
  {
    id: "w5",
    grupoId: "w5",
    name: "Pantalón Tiro Alto Palazzo",
    category: "mujer",
    price: 195000,
    priceFormatted: "$195.000",
    image: new URL("../assets/img/crop.png", import.meta.url).href,
    tag: "Popular"
  },
  {
    id: "w6",
    grupoId: "w6",
    name: "Falda Plisada Marfil",
    category: "mujer",
    price: 175000,
    priceFormatted: "$175.000",
    image: new URL("../assets/img/gorra.png", import.meta.url).href,
    tag: "Destacado"
  },
  {
    id: "w7",
    grupoId: "w7",
    name: "Chaqueta de Cuero Negra",
    category: "mujer",  
    price: 450000,
    priceFormatted: "$450.000",
    image: new URL("../assets/img/buso.png", import.meta.url).href,
    tag: "Exclusivo"
  },
  {
    id: "w8",
    grupoId: "w8",
    name: "Chaqueta de Cuero Negra",
    category: "mujer",  
    price: 450000,
    priceFormatted: "$450.000",
    image: new URL("../assets/img/teni.png", import.meta.url).href,
    tag: "Exclusivo"
  }
];

// 3. Productos EXCLUSIVOS de la sección de Hombres
export const menProducts = [
  {
    id: "m1",
    grupoId: "m1",
    name: "Traje Slim Fit Marrón",
    category: "hombre",
    price: 420000,
    priceFormatted: "$420.000",
    image: new URL("../assets/img/cam.png", import.meta.url).href,
    tag: "Exclusivo"
  },
  {
    id: "m2",
    grupoId: "m2",
    name: "Blazer Sastrero Azul Cobalto",
    category: "hombre",
    price: 380000,
    priceFormatted: "$380.000",
    image: new URL("../assets/img/puma.png", import.meta.url).href,
    tag: "Nuevo"
  },
  {
    id: "m3",
    grupoId: "m3",
    name: "Camisa de Lino Blanca",
    category: "hombre",
    price: 165000,
    priceFormatted: "$165.000",
    image: new URL("../assets/img/saco.png", import.meta.url).href,
    tag: "Tendencia"
  },
  {
    id: "m4",
    grupoId: "m4",
    name: "Pantalón Chino Beige",
    category: "hombre",
    price: 190000,
    priceFormatted: "$190.000",
    image: new URL("../assets/img/gor.png", import.meta.url).href,
    tag: "Básico"
  },
  {
    id: "m5",
    grupoId: "m5",
    name: "Gabardina Clásica Ocasión",
    category: "hombre",
    price: 490000,
    priceFormatted: "$490.000",
    image: new URL("../assets/img/panta.png", import.meta.url).href,
    tag: "Destacado"
  },
  {
    id: "m6",
    grupoId: "m6",
    name: "Suéter Cuello Alto Negro",
    category: "hombre",
    price: 210000,
    priceFormatted: "$210.000",
    image: new URL("../assets/img/sud.png", import.meta.url).href,
    tag: "Popular"
  },
  {
    id: "m7",
    grupoId: "m7",
    name: "Suéter Cuello Alto Negro",
    category: "hombre",
    price: 210000,
    priceFormatted: "$210.000",
    image: new URL("../assets/img/rojo.png", import.meta.url).href,
    tag: "Popular"
  },    
  {
    id: "m8",
    grupoId: "m8",
    name: "Suéter Cuello Alto Negro",
    category: "hombre",
    price: 210000,
    priceFormatted: "$210.000",
    image: new URL("../assets/img/per.png", import.meta.url).href,
    tag: "Popular"
  }
];

// 4. Catálogo general
export const allProducts = [
  // ==========================================
  // TENIS DE MUJER 
  { 
    id: 101,
    grupoId: 101,
    name: 'Tenis Urban Classic', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '35', 
    color: 'Blanco', 
    price: '$185.000', 
    image: new URL("../assets/img/roj.png", import.meta.url).href
  },
  { 
    id: 102,
    grupoId: 102,
    name: 'Tenis Sport Low', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '35', 
    color: 'Negro', 
    price: '$190.000', 
    image: new URL("../assets/img/oso.png", import.meta.url).href 
  },
  { 
    id: 103,
    grupoId: 103,
    name: 'Tenis Street Runner', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '35.5', 
    color: 'Blanco', 
    price: '$195.000', 
    image: new URL("../assets/img/gato.png", import.meta.url).href 
  },
  { 
    id: 104,
    grupoId: 104,
    name: 'Tenis Platform Chic', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '35.5', 
    color: 'Negro', 
    price: '$200.000', 
    image: new URL("../assets/img/rosa.png", import.meta.url).href 
  },
  { 
    id: 105,
    grupoId: 105,
    name: 'Tenis Sport Runner', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '35.5', 
    color: 'Dorado', 
    price: '$195.000', 
    image: new URL("../assets/img/ck.png", import.meta.url).href 
  },
  { 
    id: 106,
    grupoId: 106,
    name: 'Tenis Luxury Edition', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36', 
    color: 'Blanco', 
    price: '$240.000', 
    image: new URL("../assets/img/teni.png", import.meta.url).href 
  },
  { 
    id: 107,
    grupoId: 107,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/cal.png", import.meta.url).href 
  },
  { 
    id: 108,
    grupoId: 108,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/bei.png", import.meta.url).href 
  },
  { 
    id: 109,
    grupoId: 109,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/ax.png", import.meta.url).href 
  },
  { 
    id: 110,
    grupoId: 110,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/dor.png", import.meta.url).href 
  },
  { 
    id: 111,
    grupoId: 111,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36.5', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/ten.png", import.meta.url).href 
  },
  { 
    id: 112,
    grupoId: 112,
    name: 'Tenis Sport Low', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '35', 
    color: 'Negro', 
    price: '$190.000', 
    image: new URL("../assets/img/blan.png", import.meta.url).href 
  },
  { 
    id: 113,
    grupoId: 113,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/ro.png", import.meta.url).href 
  },
  { 
    id: 114,
    grupoId: 114,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/ca.png", import.meta.url).href 
  },
  { 
    id: 115,
    grupoId: 115,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36.5', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/ne.png", import.meta.url).href 
  },
  { 
    id: 116,
    grupoId: 116,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36.5', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/azu.png", import.meta.url).href 
  },
  { 
    id: 117,
    grupoId: 117,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '36.5', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/pe.png", import.meta.url).href 
  },
  { 
    id: 118,
    grupoId: 118,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '37', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/negro.png", import.meta.url).href 
  },
  { 
    id: 119,
    grupoId: 119,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '37', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/blanco.png", import.meta.url).href 
  },
  { 
    id: 120,
    grupoId: 120,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '37', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/este.png", import.meta.url).href 
  },
  { 
    id: 121,
    grupoId: 121,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '37', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/ell.png", import.meta.url).href 
  },
  { 
    id: 122,
    grupoId: 122,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '38', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/fuc.png", import.meta.url).href 
  },
  { 
    id: 123,
    grupoId: 123,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '38', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/nike.png", import.meta.url).href 
  },
  { 
    id: 124,
    grupoId: 124,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '38', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/teni.png", import.meta.url).href 
  },
  { 
    id: 125,
    grupoId: 125,
    name: 'Tenis Classic Casual', 
    categoryId: 'tenis', 
    gender: 'mujer', 
    size: '38', 
    color: 'Negro', 
    price: '$180.000', 
    image: new URL("../assets/img/tel.png", import.meta.url).href 
  },

  // ==========================================
  // CAMISETAS DE MUJER 
  { 
    id: 126,
    grupoId: 126,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/crop.png", import.meta.url).href 
  },
  { 
    id: 127,
    grupoId: 127,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/crup.png", import.meta.url).href 
  },
  { 
    id: 128,
    grupoId: 128,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Rosado', 
    price: '$90.000', 
    image: new URL("../assets/img/01.png", import.meta.url).href 
  },
  { 
    id: 129,
    grupoId: 129,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/02.png", import.meta.url).href 
  },
  { 
    id: 130,
    grupoId: 130,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/03.png", import.meta.url).href 
  },
  { 
    id: 131,
    grupoId: 131,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/04.png", import.meta.url).href 
  },
  { 
    id: 132,
    grupoId: 132,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/05.png", import.meta.url).href 
  },
  { 
    id: 133,
    grupoId: 133,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/06.png", import.meta.url).href 
  },
  { 
    id: 134,
    grupoId: 134,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/07.png", import.meta.url).href 
  },
  { 
    id: 135,
    grupoId: 135,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Rosado', 
    price: '$90.000', 
    image: new URL("../assets/img/08.png", import.meta.url).href 
  },
  { 
    id: 136,
    grupoId: 136,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/09.png", import.meta.url).href 
  },
  { 
    id: 137,
    grupoId: 137,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Gris jaspeado', 
    price: '$90.000', 
    image: new URL("../assets/img/10.png", import.meta.url).href 
  },
  { 
    id: 138,
    grupoId: 138,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/11.png", import.meta.url).href 
  },
  { 
    id: 139,
    grupoId: 139,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'L', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/13.png", import.meta.url).href 
  },
  { 
    id: 140,
    grupoId: 140,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'L', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/14.png", import.meta.url).href 
  },
  { 
    id: 141,
    grupoId: 141,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'L', 
    color: '', 
    price: '$90.000', 
    image: new URL("../assets/img/10.png", import.meta.url).href 
  },
  { 
    id: 142,
    grupoId: 142,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/18.png", import.meta.url).href 
  },
  { 
    id: 143,
    grupoId: 143,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/19.png", import.meta.url).href 
  },
  { 
    id: 144,
    grupoId: 144,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/20.png", import.meta.url).href 
  },
  { 
    id: 145,
    grupoId: 145,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/21.png", import.meta.url).href 
  },
  { 
    id: 146,
    grupoId: 146,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Cafe', 
    price: '$90.000', 
    image: new URL("../assets/img/22.png", import.meta.url).href 
  },
  { 
    id: 147,
    grupoId: 147,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/23.png", import.meta.url).href 
  },
  { 
    id: 148,
    grupoId: 148,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/24.png", import.meta.url).href 
  },
  { 
    id: 149,
    grupoId: 149,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/25.png", import.meta.url).href 
  },
  { 
    id: 150,
    grupoId: 150,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/26.png", import.meta.url).href 
  },
  { 
    id: 151,
    grupoId: 151,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/27.png", import.meta.url).href 
  },
  { 
    id: 152,
    grupoId: 152,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Rosa palo', 
    price: '$90.000', 
    image: new URL("../assets/img/28.png", import.meta.url).href 
  },
  { 
    id: 153,
    grupoId: 153,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Rosado', 
    price: '$90.000', 
    image: new URL("../assets/img/29.png", import.meta.url).href 
  },
  { 
    id: 154,
    grupoId: 154,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/30.png", import.meta.url).href 
  },
  { 
    id: 155,
    grupoId: 155,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/31.png", import.meta.url).href 
  },
  { 
    id: 156,
    grupoId: 156,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/32.png", import.meta.url).href 
  },
  { 
    id: 157,
    grupoId: 157,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/33.png", import.meta.url).href 
  },
  { 
    id: 158,
    grupoId: 158,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Negro', 
    price: '$90.000', 
    image: new URL("../assets/img/34.png", import.meta.url).href 
  },
  { 
    id: 159,
    grupoId: 159,
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/35.png", import.meta.url).href 
  },

  // ==========================================
  // GORRAS Y ACCESORIOS
   { id: 160, grupoId: 160, name: 'Gorra Trucker Snapback', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', price: '$70.000', image: new URL("../assets/img/go.jpeg", import.meta.url).href },
  { id: 161, grupoId: 161, name: 'Gorra Casual Classic', categoryId: 'gorras', gender: 'unisex', size: 'Gorras', color: 'Rosado', price: '$65.000', image: new URL("../assets/img/gorr.jpeg", import.meta.url).href },
  { id: 162, grupoId: 162, name: 'Gorra Casual Classic', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Negro', price: '$65.000', image: new URL("../assets/img/gorro.jpeg", import.meta.url).href },
  { id: 163, grupoId: 163, name: 'Gorra', categoryId: 'gorras', gender: 'unisex', size: 'Gorras', color: 'Blanco', price: '$140.000', image: new URL("../assets/img/kle.jpeg", import.meta.url).href },
  { id: 164, grupoId: 164, name: 'Gorra', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Beige', price: '$220.000', image: new URL("../assets/img/guess.png", import.meta.url).href },
  { id: 165, grupoId: 165, name: 'Gorra', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Azul Claro', price: '$280.000', image: new URL("../assets/img/gorra.jpeg", import.meta.url).href },
  { id: 166, grupoId: 166, name: 'Gorra', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Azul Claro', price: '$280.000', image: new URL("../assets/img/lac.jpeg", import.meta.url).href },
  { id: 167, grupoId: 167, name: 'Gorra', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Negro', price: '$280.000', image: new URL("../assets/img/conjunto.jpeg", import.meta.url).href },
  { id: 168, grupoId: 168, name: 'Gorra', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Blanco', price: '$280.000', image: new URL("../assets/img/jo.png", import.meta.url).href },
  { id: 169, grupoId: 169, name: 'Gorra', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Blanco', price: '$280.000', image: new URL("../assets/img/nejo.jpeg", import.meta.url).href },
  { id: 170, grupoId: 170, name: 'Gorra', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Negro', price: '$280.000', image: new URL("../assets/img/kle.png", import.meta.url).href },
  { id: 171, grupoId: 171, name: 'Gorra', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Blanco', price: '$280.000', image: new URL("../assets/img/gorra.png", import.meta.url).href },
  { id: 172, grupoId: 172, name: 'Gorra', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Blanco', price: '$280.000', image: new URL("../assets/img/conn.png", import.meta.url).href },
  { id: 173, grupoId: 173, name: 'Gorra', categoryId: 'gorras', gender: 'mujer', size: 'Gorras', color: 'Negro', price: '$280.000', image: new URL("../assets/img/guess.jpeg", import.meta.url).href },
  
  



  // ==========================================
  // BUSOS DE MUJER
  { 
    id: 170,
    grupoId: 170,
    name: 'Reloj Chronograph Gold', 
    categoryId: 'busos', 
    gender: 'mujer', 
    size: 's', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/pra.png", import.meta.url).href 
  },
  { 
    id: 171,
    grupoId: 171,
    name: 'Reloj Chronograph Gold', 
    categoryId: 'busos', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/gris.png", import.meta.url).href 
  },
  { 
    id: 172,
    grupoId: 172,
    name: 'Reloj Chronograph Gold', 
    categoryId: 'busos', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/buss.png", import.meta.url).href 
  },
  { 
    id: 173,
    grupoId: 173,
    name: 'Reloj Chronograph Gold', 
    categoryId: 'busos', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/jor.png", import.meta.url).href 
  },
  { 
    id: 174,
    grupoId: 174,
    name: 'Reloj Chronograph Gold', 
    categoryId: 'busos', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/let.png", import.meta.url).href 
  },
  { 
    id: 175,
    grupoId: 175,
    name: 'Reloj Chronograph Gold', 
    categoryId: 'busos', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/coach.png", import.meta.url).href 
  },
  { 
    id: 176,
    grupoId: 176,
    name: 'Reloj Chronograph Gold', 
    categoryId: 'busos', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/coach.png", import.meta.url).href 
  },
  { 
    id: 177,
    grupoId: 177,
    name: 'Reloj Chronograph Gold', 
    categoryId: 'busos', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/coach.png", import.meta.url).href 
  },
  { 
    id: 178,
    grupoId: 178,
    name: 'Reloj Chronograph Gold', 
    categoryId: 'busos', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/coach.png", import.meta.url).href 
  },
  { 
    id: 179,
    grupoId: 179,
    name: 'Reloj Chronograph Gold', 
    categoryId: 'busos', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/coach.png", import.meta.url).href 
  },
  //--------------------------------
  //Sudaderas mujer
  
  { 
    id: 179,
    grupoId: 179,
    name: 'Reloj Chronograph Gold', 
   categoryId: 'Pantalones', 
    gender: 'mujer',  
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/suda.png", import.meta.url).href 
  },
  { 
    id: 179,
    grupoId: 179,
    name: 'sudadera blanco', 
    categoryId: 'Pantalones', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Dorado', 
    price: '$280.000', 
    image: new URL("../assets/img/dera.png", import.meta.url).href 
  },
//-----------------
//Seccion hombre 

{ 
    id: 1,
    grupoId: 1,
    name: 'Camiseta ', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/001.png", import.meta.url).href 
  },{ 
    id: 2,
    grupoId: 2,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/002.png", import.meta.url).href 
  },{ 
    id: 3,
    grupoId: 3,
    name: 'Camiseta ', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/003.png", import.meta.url).href 
  },{ 
    id: 4,
    grupoId: 4,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/004.png", import.meta.url).href 
  },{ 
    id: 5,
    grupoId: 5,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/005.png", import.meta.url).href 

  },{ 
    id: 6,
    grupoId: 6,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/006.png", import.meta.url).href 

  },{ 
    id: 7,
    grupoId: 7,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/007.png", import.meta.url).href 

  },{ 
    id: 8,
    grupoId: 8,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/008.png", import.meta.url).href 

  },{ 
    id: 9,
    grupoId: 9,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/009.png", import.meta.url).href 

  },{ 
    id: 10,
    grupoId: 10,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/010.png", import.meta.url).href 

  },{ 
    id: 11,
    grupoId: 11,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/011.png", import.meta.url).href 

  },{ 
    id: 12,
    grupoId: 12,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/012.png", import.meta.url).href 

  },{ 
    id: 13,
    grupoId: 13,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/013.png", import.meta.url).href 

  },{ 
    id: 14,
    grupoId: 14,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/014.png", import.meta.url).href 

  },{ 
    id: 15,
    grupoId: 15,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/015.png", import.meta.url).href 

  },{ 
    id: 16,
    grupoId: 16,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/016.png", import.meta.url).href 

  },{ 
    id: 17,
    grupoId: 17,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/017.png", import.meta.url).href 

  },{ 
    id: 18,
    grupoId: 18,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/018.png", import.meta.url).href 

  },
  { 
    id: 19,
    grupoId: 19,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/019.png", import.meta.url).href 

  },{ 
    id: 20,
    grupoId: 20,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/020.png", import.meta.url).href 
  },
  { 
    id: 21,
    grupoId: 21,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/cam.png", import.meta.url).href 
  },
  { 
    id: 22,
    grupoId: 22,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/037.png", import.meta.url).href 
  },
  { 
    id: 23,
    grupoId: 23,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/038.png", import.meta.url).href 
  },
  { 
    id: 24,
    grupoId: 24,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/039.png", import.meta.url).href 
  },
  { 
    id: 25,
    grupoId: 25,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/040.png", import.meta.url).href 
  },
  { 
    id: 26,
    grupoId: 26,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/041.png", import.meta.url).href 
  },
  { 
    id: 27,
    grupoId: 27,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/042.png", import.meta.url).href 
  },
  { 
    id: 28,
    grupoId: 28,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/043.png", import.meta.url).href 
  },
  { 
    id: 29,
    grupoId: 29,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/044.png", import.meta.url).href 
  },
  { 
    id: 30,
    grupoId: 30,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/045.png", import.meta.url).href 
  },
  { 
    id: 31,
    grupoId: 31,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/046.png", import.meta.url).href 
  },
  { 
    id: 32,
    grupoId: 32,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/048.png", import.meta.url).href 
  },
  { 
    id: 33,
    grupoId: 33,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/049.png", import.meta.url).href 
  },
  { 
    id: 34,
    grupoId: 34,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/050.png", import.meta.url).href 
  },
  { 
    id: 35,
    grupoId: 35,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/051.png", import.meta.url).href 
  },{ 
    id: 36,
    grupoId: 36,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/052.png", import.meta.url).href 
  },{ 
    id: 37,
    grupoId: 37,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/053.png", import.meta.url).href 
  },{ 
    id: 38,
    grupoId: 38,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/054.png", import.meta.url).href 
  },
  { 
    id: 39,
    grupoId: 39,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/055.png", import.meta.url).href 
  },
  { 
    id: 40,
    grupoId: 40,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/056.png", import.meta.url).href 
  },
  { 
    id: 41,
    grupoId: 41,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/057.png", import.meta.url).href 
  },
  { 
    id: 42,
    grupoId: 42,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/058.png", import.meta.url).href 
  },
  { 
    id: 43,
    grupoId: 43,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/059.png", import.meta.url).href 
  },
  { 
    id: 44,
    grupoId: 44,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/060.png", import.meta.url).href 
  },
  { 
    id: 45,
    grupoId: 45,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/061.png", import.meta.url).href 
  },
  { 
    id: 46,
    grupoId: 46,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/062.png", import.meta.url).href 
  },
  { 
    id: 47,
    grupoId: 47,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/063.png", import.meta.url).href 
  },
  { 
    id: 48,
    grupoId: 48,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/064.png", import.meta.url).href 
  },
  { 
    id: 49,
    grupoId: 49,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/065.png", import.meta.url).href 
  },
  { 
    id: 50,
    grupoId: 50,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/066.png", import.meta.url).href 
  },
  { 
    id: 51,
    grupoId: 51,
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'XL', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/067.png", import.meta.url).href 
  },
  
  

   


];

// 5. Función de filtrado flexible
//    La categoría "Accesorios" agrupa gorras, perfumes y relojes
//    tanto para hombre como para mujer.
const normalizarNombreColor = (color) =>
  String(color || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const getFilteredProducts = (category, gender, brands, sizes, colors) => {
  const tipoKeywords = {
    gorras: 'gorra',
    perfumes: 'perfume',
    relojes: 'reloj',
  };

  return allProducts.filter(product => {
    const prodCat = (product.categoryId || "").toLowerCase().trim();

    let catString = "";
    if (typeof category === 'object' && category !== null) {
      catString = (category.id || category.title || "").toLowerCase().trim();
    } else if (typeof category === 'string') {
      catString = category.toLowerCase().trim();
    }

    const sinFiltroCategoria = !catString || catString === 'todos';

    const esCategoriaAccesorios =
      !sinFiltroCategoria &&
      ['accesorios', 'accesorio', 'reloj', 'relojes', 'perfumes', 'perfume']
        .some(t => catString.includes(t));

    const esProductoAccesorio = () =>
      ['gorras', 'accesorios', 'accesorio', 'reloj', 'relojes', 'perfumes', 'perfume']
        .some(t => prodCat.includes(t));

    let matchCategory;
    if (esCategoriaAccesorios) {
      matchCategory = esProductoAccesorio();
    } else {
      matchCategory =
        sinFiltroCategoria ||
        prodCat === catString ||
        prodCat.includes(catString);
    }

    const isAccessory =
      sinFiltroCategoria ||
      ['gorras', 'perfumes', 'reloj', 'relojes', 'accesorios']
        .some(t => catString.includes(t) || prodCat.includes(t));

    const matchGender =
      !gender ||
      product.gender === gender;

    if (!matchCategory || !matchGender) return false;

    // Filtro por marca (solo filtra si el usuario seleccionó alguna marca en el aside)
    if (brands && brands.length > 0) {
      if (!product.brand || !brands.includes(product.brand)) {
        return false;
      }
    }

    // En accesorios los "sizes" son tipos (Gorras, Perfumes, Relojes)
    if (esCategoriaAccesorios && sizes && sizes.length > 0) {
      const nombre = (product.name || '').toLowerCase();
      const coincideTipo = sizes.some(tipo => {
        const kw = tipoKeywords[String(tipo).toLowerCase()] || String(tipo).toLowerCase();
        return nombre.includes(kw);
      });
      if (!coincideTipo) return false;
    } else if (!isAccessory && sizes && sizes.length > 0 && product.size && !sizes.includes(product.size)) {
      return false;
    }

    if (
      colors && colors.length > 0 && product.color &&
      !colors.some(
        (c) => normalizarNombreColor(c) === normalizarNombreColor(product.color)
      )
    ) {
      return false;
    }

    return true;
  });
};

// 6. Variantes por color
//    Agrupa los productos del catálogo que comparten el mismo grupoId
//    (cada variante conserva su propio color). El grupoId lo define
//    manualmente la dueña del proyecto; por defecto es igual al id.
export const getVariantesPorColor = (producto, catalogoCompleto) => {
  if (!producto || typeof producto !== 'object' || !producto.grupoId || !Array.isArray(catalogoCompleto)) {
    return [];
  }

  return catalogoCompleto.filter((item) =>
    item && typeof item === 'object' && String(item.grupoId) === String(producto.grupoId)
  );
};

// 7. Tallas estándar del catálogo público (las que muestra el detalle)
export const TALLAS_ESTANDAR = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// 8. Tallas disponibles por grupo
//    Devuelve SOLO las tallas que existen como producto real dentro del
//    mismo grupoId: nunca se inventa disponibilidad. El catálogo actual
//    define la talla por producto y no por color, así que se comprueba
//    dinámicamente: si dentro del grupo cada color tuviera un juego de
//    tallas distinto, la talla dependería del color recibido y se recorta
//    a ese color; si todos los colores comparten el mismo juego (caso del
//    catálogo actual), el color no altera las tallas.
export const getTallasDisponibles = (producto, catalogoCompleto) => {
  if (!producto || typeof producto !== 'object') return [];

  const catalogo = Array.isArray(catalogoCompleto) ? catalogoCompleto : [];

  const delGrupo =
    producto.grupoId === undefined || producto.grupoId === null
      ? []
      : catalogo.filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            String(item.grupoId) === String(producto.grupoId)
        );

  // Sin compañeros de grupo: solo la talla real del propio producto.
  const base = delGrupo.length > 0 ? delGrupo : [producto];

  const tallasPorColor = new Map();
  base.forEach((item) => {
    if (!item || !item.size || !item.color) return;
    const clave = String(item.color);
    const actuales = tallasPorColor.get(clave) || new Set();
    actuales.add(String(item.size));
    tallasPorColor.set(clave, actuales);
  });

  const juegos = Array.from(tallasPorColor.values()).map((set) =>
    Array.from(set).sort().join('|')
  );
  const tallaDependeDelColor = new Set(juegos).size > 1;

  let fuente = base;
  if (tallaDependeDelColor && producto.color) {
    const mismoColor = base.filter(
      (item) => item && item.color && String(item.color) === String(producto.color)
    );
    if (mismoColor.length > 0) fuente = mismoColor;
  }

  const tallas = [];
  fuente.forEach((item) => {
    if (!item || !item.size) return;
    const talla = String(item.size);
    if (!tallas.includes(talla)) tallas.push(talla);
  });

  if (tallas.length === 0 && producto.size) return [String(producto.size)];
  return tallas;
};
