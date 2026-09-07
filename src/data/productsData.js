
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
    gender: 'unisex', 
    size: 'Única', 
    color: 'Rojo', 
    brand: 'Boss',
    price: '$70.000', 
    image: new URL("../assets/img/go.png", import.meta.url).href 
  },
  { 
    id: 161, 
    name: 'Gorra Casual Classic', 
    categoryId: 'gorras', 
    gender: 'unisex', 
    size: 'Única', 
    color: 'Blanco', 
    brand: 'Boss',
    price: '$65.000', 
    image: new URL("../assets/img/gorr.png", import.meta.url).href 
  },
  { 
    id: 162, 
    name: 'Gorra Casual Classic', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Única', 
    color: 'Blanco', 
    brand: 'Boss',
    price: '$65.000', 
    image: new URL("../assets/img/gorro.png", import.meta.url).href 
  },
  { 
    id: 163, 
    name: 'Buso Hoodie Oversized', 
    categoryId: 'gorras', 
    gender: 'unisex', 
    color: 'Negro', 
    brand: 'Calvin Klein',
    price: '$140.000', 
    image: new URL("../assets/img/kle.png", import.meta.url).href 
  },
  { 
    id: 164, 
    name: 'Perfume Luxury Essence', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    color: 'Dorado', 
    brand: 'Guess',
    price: '$220.000', 
    image: new URL("../assets/img/guess.png", import.meta.url).href 
  },
  { 
    id: 165, 
    name: 'Reloj Chronograph Gold', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Única', 
    color: 'Dorado', 
    brand: 'Guess',
    price: '$280.000', 
    image: new URL("../assets/img/gorra.png", import.meta.url).href 
  },
  { 
    id: 166, 
    name: 'Reloj Chronograph Gold', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Única', 
    color: 'Dorado', 
    brand: 'Lacoste',
    price: '$280.000', 
    image: new URL("../assets/img/lac.png", import.meta.url).href 
  },
  { 
    id: 167, 
    name: 'Reloj Chronograph Gold', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Única', 
    color: 'Dorado', 
    brand: 'Pyscho Bunny',
    price: '$280.000', 
    image: new URL("../assets/img/con.png", import.meta.url).href 
  },
  { 
    id: 168, 
    name: 'Reloj Chronograph Gold', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Única', 
    color: 'Dorado', 
    brand: 'Pyscho Bunny',
    price: '$280.000', 
    image: new URL("../assets/img/jo.png", import.meta.url).href 
  },
  { 
    id: 169, 
    name: 'Reloj Chronograph Gold', 
    categoryId: 'gorras', 
    gender: 'mujer', 
    size: 'Única', 
    color: 'Dorado', 
    brand: 'Pyscho Bunny',
    price: '$280.000', 
    image: new URL("../assets/img/nejo.png", import.meta.url).href 
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
  }
];

// 5. Función de filtrado flexible (Garantiza que las gorras aparezcan al presionar su categoría o género)
export const getFilteredProducts = (category, gender, brands, sizes, colors) => {
  return allProducts.filter(product => {
    const prodCat = (product.categoryId || "").toLowerCase().trim();
    
    let catString = "";
    if (typeof category === 'object' && category !== null) {
      catString = (category.id || category.title || "").toLowerCase().trim();
    } else if (typeof category === 'string') {
      catString = category.toLowerCase().trim();
    }

    const matchCategory = !catString || catString === 'todos' || prodCat === catString || prodCat.includes(catString);
    
    const isAccessory = ['gorras', 'perfumes', 'reloj', 'relojes', 'accesorios'].some(t => 
      catString.includes(t) || prodCat.includes(t)
    );
    
    const matchGender = !gender || product.gender === gender || (isAccessory && (product.gender === 'unisex' || !product.gender));

    if (!matchCategory || !matchGender) return false;

    // Filtro por marca (solo filtra si el usuario seleccionó alguna marca en el aside)
    if (brands && brands.length > 0) {
      if (!product.brand || !brands.includes(product.brand)) {
        return false;
      }
    }

    if (!isAccessory && sizes && sizes.length > 0 && product.size && !sizes.includes(product.size)) {
      return false;
    }

    if (colors && colors.length > 0 && product.color && !colors.includes(product.color)) {
      return false;
    }

    return true;
  });
};