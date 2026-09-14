
// 1. Productos para la sección de Inicio (Destacados)

export const featuredProducts = [
    
  {
    id: "f1",
    name: "Blazer Estructurado Beige",
    price: 310000,
    priceFormatted: "$310.000",
    image: new URL("../assets/img/tar.png", import.meta.url).href,
    tag: "Destacado"
  },
  {
    id: "f2",
    name: "Traje Slim Fit Marrón",
    price: 420000,
    priceFormatted: "$420.000",
    image: new URL("../assets/img/jeta.png", import.meta.url).href,
    tag: "Exclusivo"
  },
  {
    id: "f3",
    name: "Vestido Midi Seda Champagne",
    price: 240000,
    priceFormatted: "$240.000",
    image: new URL("../assets/img/top.png", import.meta.url).href,
    tag: "Nuevo"
  },
  {
    id: "f4",
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
    name: "Vestido Midi Seda Champagne",
    category: "mujer",
    price: 240000,
    priceFormatted: "$240.000",
    image: new URL("../assets/img/camisa.png", import.meta.url).href,
    tag: "Nuevo"
  },
  {
    id: "w2",
    name: "Blazer Estructurado Beige",
    category: "mujer",
    price: 310000,
    priceFormatted: "$310.000",
    image: new URL("../assets/img/ten.png", import.meta.url).href,
    tag: "Exclusivo"
  },
  {
    id: "w3",
    name: "Conjunto Lino Premium",
    category: "mujer",
    price: 285000,
    priceFormatted: "$285.000",
    image: new URL("../assets/img/reloj.png", import.meta.url).href,
    tag: "Tendencia"
  },
  {
    id: "w4",
    name: "Top Satén Escote Halter",
    category: "mujer",
    price: 135000,
    priceFormatted: "$135.000",
    image: new URL("../assets/img/suda.png", import.meta.url).href,
    tag: "Básico"
  },
  {
    id: "w5",
    name: "Pantalón Tiro Alto Palazzo",
    category: "mujer",
    price: 195000,
    priceFormatted: "$195.000",
    image: new URL("../assets/img/crop.png", import.meta.url).href,
    tag: "Popular"
  },
  {
    id: "w6",
    name: "Falda Plisada Marfil",
    category: "mujer",
    price: 175000,
    priceFormatted: "$175.000",
    image: new URL("../assets/img/gorra.png", import.meta.url).href,
    tag: "Destacado"
  },
  {
    id: "w7",
    name: "Chaqueta de Cuero Negra",
    category: "mujer",  
    price: 450000,
    priceFormatted: "$450.000",
    image: new URL("../assets/img/buso.png", import.meta.url).href,
    tag: "Exclusivo"
  },
  {
    id: "w8",
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
    name: "Traje Slim Fit Marrón",
    category: "hombre",
    price: 420000,
    priceFormatted: "$420.000",
    image: new URL("../assets/img/cam.png", import.meta.url).href,
    tag: "Exclusivo"
  },
  {
    id: "m2",
    name: "Blazer Sastrero Azul Cobalto",
    category: "hombre",
    price: 380000,
    priceFormatted: "$380.000",
    image: new URL("../assets/img/puma.png", import.meta.url).href,
    tag: "Nuevo"
  },
  {
    id: "m3",
    name: "Camisa de Lino Blanca",
    category: "hombre",
    price: 165000,
    priceFormatted: "$165.000",
    image: new URL("../assets/img/saco.png", import.meta.url).href,
    tag: "Tendencia"
  },
  {
    id: "m4",
    name: "Pantalón Chino Beige",
    category: "hombre",
    price: 190000,
    priceFormatted: "$190.000",
    image: new URL("../assets/img/gor.png", import.meta.url).href,
    tag: "Básico"
  },
  {
    id: "m5",
    name: "Gabardina Clásica Ocasión",
    category: "hombre",
    price: 490000,
    priceFormatted: "$490.000",
    image: new URL("../assets/img/panta.png", import.meta.url).href,
    tag: "Destacado"
  },
  {
    id: "m6",
    name: "Suéter Cuello Alto Negro",
    category: "hombre",
    price: 210000,
    priceFormatted: "$210.000",
    image: new URL("../assets/img/sud.png", import.meta.url).href,
    tag: "Popular"
  },
  {
    id: "m7",
    name: "Suéter Cuello Alto Negro",
    category: "hombre",
    price: 210000,
    priceFormatted: "$210.000",
    image: new URL("../assets/img/rojo.png", import.meta.url).href,
    tag: "Popular"
  },    
  {
    id: "m8",
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
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'S', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/crup.png", import.meta.url).href 
  },
  { 
    id: 128, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/01.png", import.meta.url).href 
  },
  { 
    id: 129, 
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
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/03.png", import.meta.url).href 
  },
  { 
    id: 131, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/04.png", import.meta.url).href 
  },
  { 
    id: 132, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/05.png", import.meta.url).href 
  },
  { 
    id: 133, 
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
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/07.png", import.meta.url).href 
  },
  { 
    id: 135, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/08.png", import.meta.url).href 
  },
  { 
    id: 136, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/09.png", import.meta.url).href 
  },
  { 
    id: 137, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/10.png", import.meta.url).href 
  },
  { 
    id: 138, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/11.png", import.meta.url).href 
  },
  { 
    id: 139, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/13.png", import.meta.url).href 
  },
  { 
    id: 140, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/14.png", import.meta.url).href 
  },
  { 
    id: 141, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/10.png", import.meta.url).href 
  },
  { 
    id: 142, 
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
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/21.png", import.meta.url).href 
  },
  { 
    id: 146, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/ 22.png", import.meta.url).href 
  },
  { 
    id: 147, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/23.png", import.meta.url).href 
  },
  { 
    id: 148, 
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
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/25.png", import.meta.url).href 
  },
  { 
    id: 150, 
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
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/27.png", import.meta.url).href 
  },
  { 
    id: 152, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/28.png", import.meta.url).href 
  },
  { 
    id: 153, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/29.png", import.meta.url).href 
  },
  { 
    id: 154, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/30.png", import.meta.url).href 
  },
  { 
    id: 155, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/31.png", import.meta.url).href 
  },
  { 
    id: 156, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/32.png", import.meta.url).href 
  },
  { 
    id: 157, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/33.png", import.meta.url).href 
  },
  { 
    id: 158, 
    name: 'Camiseta Deportiva Fit', 
    categoryId: 'camisetas', 
    gender: 'mujer', 
    size: 'XS', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/34.png", import.meta.url).href 
  },
  { 
    id: 159, 
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

  { 
    id: 160, 
    name: 'Gorra Trucker Snapback', 
    categoryId: 'gorras', 
    price: '$70.000', 
    image: new URL("../assets/img/go.jpeg", import.meta.url).href 
  },
  { 
    id: 161, 
    name: 'Gorra Casual Classic', 
    categoryId: 'gorras', 
    gender: 'unisex', 
    size: 'Gorras', 
    color: 'Blanco', 
    price: '$65.000', 
    image: new URL("../assets/img/gorr.jpeg", import.meta.url).href 
  },
  { 
    id: 162, 
    name: 'Gorra Casual Classic', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Gorras', 
    price: '$65.000', 
    image: new URL("../assets/img/gorro.jpeg", import.meta.url).href 
  },
  { 
    id: 163, 
    name: 'Buso Hoodie Oversized', 
    categoryId: 'gorras', 
    gender: 'unisex', 
    size: 'Gorras', 
    price: '$140.000', 
    image: new URL("../assets/img/kle.jpeg", import.meta.url).href 
  },
  { 
    id: 164, 
    name: 'Perfume Luxury Essence', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Gorras',
    price: '$220.000', 
    image: new URL("../assets/img/guess.jpeg", import.meta.url).href 
  },
  { 
    id: 165, 
    name: 'Reloj Chronograph Gold', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Gorras', 
    price: '$280.000', 
    image: new URL("../assets/img/gorra.jpeg", import.meta.url).href 
  },
  { 
    id: 166, 
    name: 'Reloj Chronograph Gold', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Gorras', 
    price: '$280.000', 
    image: new URL("../assets/img/lac.jpeg", import.meta.url).href 
  },
  { 
    id: 167, 
    name: 'Reloj Chronograph Gold', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Gorras', 
    price: '$280.000', 
    image: new URL("../assets/img/conjunto.jpeg", import.meta.url).href 
  },
  { 
    id: 168, 
    name: 'Reloj Chronograph Gold', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Gorras', 
    price: '$280.000', 
    image: new URL("../assets/img/jo.jpeg", import.meta.url).href 
  },
  { 
    id: 169, 
    name: 'Reloj Chronograph Gold', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Gorras', 
    price: '$280.000', 
    image: new URL("../assets/img/nejo.jpeg", import.meta.url).href 
  },

  // ==========================================
  // BUSOS DE MUJER
  { 
    id: 170, 
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
    name: 'Camiseta ', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/001.png", import.meta.url).href 
  },{ 
    id: 2, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/002.png", import.meta.url).href 
  },{ 
    id: 3, 
    name: 'Camiseta ', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/003.png", import.meta.url).href 
  },{ 
    id: 4, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/004.png", import.meta.url).href 
  },{ 
    id: 5, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/005.png", import.meta.url).href 

  },{ 
    id: 6, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/006.png", import.meta.url).href 

  },{ 
    id: 7, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/007.png", import.meta.url).href 

  },{ 
    id: 8, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/008.png", import.meta.url).href 

  },{ 
    id: 9, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/009.png", import.meta.url).href 

  },{ 
    id: 10, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/010.png", import.meta.url).href 

  },{ 
    id: 11, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/011.png", import.meta.url).href 

  },{ 
    id: 12, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/012.png", import.meta.url).href 

  },{ 
    id: 13, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/013.png", import.meta.url).href 

  },{ 
    id: 14, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/014.png", import.meta.url).href 

  },{ 
    id: 15, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/015.png", import.meta.url).href 

  },{ 
    id: 16, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/016.png", import.meta.url).href 

  },{ 
    id: 17, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/017.png", import.meta.url).href 

  },{ 
    id: 18, 
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
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'L', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/019.png", import.meta.url).href 

  },{ 
    id: 20, 
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
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/051.png", import.meta.url).href 
  },{ 
    id: 36, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/052.png", import.meta.url).href 
  },{ 
    id: 37, 
    name: 'Camiseta', 
    categoryId: 'camisetas', 
    gender: 'hombre', 
    size: 'M', 
    color: 'Blanco', 
    price: '$90.000', 
    image: new URL("../assets/img/053.png", import.meta.url).href 
  },{ 
    id: 38, 
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

    const esProductoAccesorio = () => {
      if (
        ['gorras', 'accesorios', 'accesorio', 'reloj', 'relojes', 'perfumes', 'perfume']
          .some(t => prodCat.includes(t))
      ) {
        return true;
      }
      return ['gorra', 'perfume', 'reloj'].some(kw =>
        (product.name || '').toLowerCase().includes(kw)
      );
    };

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
      product.gender === gender ||
      (isAccessory && (product.gender === 'unisex' || !product.gender));

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

    if (colors && colors.length > 0 && product.color && !colors.includes(product.color)) {
      return false;
    }

    return true;
  });
};