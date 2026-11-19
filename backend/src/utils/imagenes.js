const imagenes = import.meta.glob('../assets/img/*', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const urlImagen = (nombre) => imagenes[`../assets/img/${nombre}`] || ''