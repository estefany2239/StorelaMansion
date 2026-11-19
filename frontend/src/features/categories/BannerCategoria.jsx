// =========================================================
// BANNER PRINCIPAL DE LA CATEGORÍA
// Fondo oscuro #14100b liso con resplandor dorado; la foto se
// funde hacia la izquierda con el fondo (sin líneas ni cortes).
// Con fotoAncha=true la foto cubre todo el banner; con false
// queda a la derecha. El navbar flota encima (es fixed).
// Variante "compacto": banda baja para el listado de
// productos, con botón "‹ Volver" que regresa a la plantilla.
// =========================================================

import { ChevronLeft } from "lucide-react";
import { Corona } from "../../public/Landing";

export default function BannerCategoria({
  titulo,
  descripcion,
  foto,
  fotoAncha = false,
  fotoPosicion,
  onVolver,
  compacto = false,
  etiquetaVolver
}) {
  return (
    <div
      className={`categoria-pagina-banner${
        compacto ? " categoria-pagina-banner--compacto" : ""
      }`}
    >
      {foto ? (
        <div
          className={`categoria-pagina-banner-foto${
            fotoAncha ? " categoria-pagina-banner-foto--ancha" : ""
          }`}
          style={
            fotoAncha && fotoPosicion
              ? { "--foto-pos": fotoPosicion }
              : undefined
          }
          aria-hidden="true"
        >
          <img src={foto} alt="" />
        </div>
      ) : (
        <div className="categoria-pagina-banner-corona" aria-hidden="true">
          <Corona />
        </div>
      )}

      <div className="categoria-pagina-banner-contenido">
        <button
          type="button"
          className="categoria-pagina-volver"
          onClick={onVolver}
        >
          <ChevronLeft size={16} />
          {etiquetaVolver || (compacto ? "Volver" : "Volver a categorías")}
        </button>

        <h1 className="categoria-pagina-banner-titulo">{titulo}</h1>
        <span className="categoria-pagina-banner-linea" aria-hidden="true" />
        {descripcion && (
          <p className="categoria-pagina-banner-descripcion">{descripcion}</p>
        )}
      </div>
    </div>
  );
}
