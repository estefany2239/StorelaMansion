const imagenes = import.meta.glob('../assets/img/*', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const urlImagen = (nombre) => {
  if (!nombre) return ''
  if (/^https?:\/\//.test(nombre)) return nombre
  return imagenes[`../assets/img/${nombre}`] || ''
}