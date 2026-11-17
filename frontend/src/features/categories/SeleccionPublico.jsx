// =========================================================
// SELECCIÓN DE PÚBLICO ("DESCUBRE")
// Encabezado con título dinámico y las dos tarjetas de público
// (etiquetas por categoría, ej. "Moda masculina" o "Perfumes
// masculinos"). Cada tarjeta llama a onVerProductos con su
// público ('masculino' | 'femenino'); App.jsx lo traduce al
// género del filtro existente de productos.
// =========================================================

import { ArrowRight } from "lucide-react";

// Etiqueta por defecto cuando la categoría no define la suya, y
// separación en dos líneas: primera palabra como kicker (ej. MODA
// / PERFUMES / RELOJES) y el resto como título de la tarjeta.
function obtenerTextos(tarjeta) {
  const texto =
    tarjeta.etiqueta ||
    (tarjeta.publico === "femenino" ? "Moda femenina" : "Moda masculina");
  const [kicker, ...resto] = texto.split(" ");
  return { kicker, nombre: resto.join(" ") };
}

export default function SeleccionPublico({ categoria, tarjetas, onVerProductos }) {
  return (
    <section className="categoria-pagina-descubre">
      <div className="categoria-pagina-encabezado">
        <p className="landing-eyebrow categoria-pagina-eyebrow">DESCUBRE</p>
        <h2 className="categoria-pagina-titulo">
          ¿Para quién <em>buscas en {categoria}?</em>
        </h2>
      </div>

      <div className="categoria-pagina-tarjetas">
        {tarjetas.map((tarjeta) => {
          const { kicker, nombre } = obtenerTextos(tarjeta);
          return (
            <article
              key={tarjeta.publico}
              className="categoria-pagina-tarjeta"
            >
              {tarjeta.foto && (
                <div
                  className="categoria-pagina-tarjeta-foto"
                  aria-hidden="true"
                >
                  <img src={tarjeta.foto} alt="" />
                </div>
              )}

              <div className="categoria-pagina-tarjeta-contenido">
                <span className="categoria-pagina-tarjeta-kicker">
                  {kicker}
                </span>
                {nombre && (
                  <h3 className="categoria-pagina-tarjeta-nombre">
                    {nombre}
                  </h3>
                )}
                <p className="categoria-pagina-tarjeta-descripcion">
                  {tarjeta.descripcion}
                </p>

                <button
                  type="button"
                  className="categoria-pagina-btn-publico"
                  onClick={() => onVerProductos?.(tarjeta.publico)}
                >
                  Ver productos
                  <ArrowRight size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
