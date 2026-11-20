import './ColoresSelector.css'

export default function ColoresSelector({ colores = [], seleccionados = [], onCambiar }) {
  const manejarCambio = (nombre, marcado) => {
    const siguientes = marcado
      ? [...seleccionados, nombre]
      : seleccionados.filter((c) => c !== nombre)
    onCambiar(siguientes)
  }

  return (
    <div className="colores-selector-grid">
      {colores.map((color) => {
        const marcado = seleccionados.includes(color.nombre)
        return (
          <label
            key={color.nombre}
            className="colores-selector-tarjeta"
            title={color.nombre}
            aria-label={color.nombre}
          >
            <input
              type="checkbox"
              className="colores-selector-casilla"
              checked={marcado}
              onChange={(e) => manejarCambio(color.nombre, e.target.checked)}
            />
            <span
              className="colores-selector-muestra"
              style={{ backgroundColor: color.hex || color.codigo_hex || color.codigoHex || 'transparent' }}
            />
          </label>
        )
      })}
    </div>
  )
}
