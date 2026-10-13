import fotoTienda from "../../assets/img/tienda-la-mansion.png";
import "./About.css";

// ==========================================
// FECHA DE FUNDACIÓN Y AÑOS EN EL COMERCIO
// Se calculan solos a partir de la fecha, no
// se escriben fijos (requiere Math.floor).
// ==========================================
const FECHA_FUNDACION = new Date(2019, 11, 4); // 4 de diciembre de 2019

const calcularAniosCompletos = (desde) => {
  const hoy = new Date();
  let anios = hoy.getFullYear() - desde.getFullYear();
  const aniversarioEsteAnio = new Date(
    hoy.getFullYear(),
    desde.getMonth(),
    desde.getDate()
  );
  if (hoy < aniversarioEsteAnio) anios -= 1;
  return Math.max(0, Math.floor(anios));
};

const ANIOS_EN_COMERCIO = calcularAniosCompletos(FECHA_FUNDACION);
const ANIOS_TEXTO =
  ANIOS_EN_COMERCIO < 1 ? "Menos de 1" : String(ANIOS_EN_COMERCIO);

// ==========================================
// CONTENIDOS EDITABLES DE LA SECCIÓN
// ==========================================
const CONTENIDO = {
  etiqueta: "SOBRE NOSOTROS",
  tituloBlanco: "Más que una tienda,",
  tituloDorado: "somos una familia.",
  parrafos: [
    "Store La Mansión nació en Medellín, en el barrio Villa Hermosa La Mansión, el 4 de diciembre de 2019. Desde entonces, nos hemos mantenido firmes con un solo propósito: ofrecerte ropa y accesorios de calidad, con estilo, autenticidad y la mejor atención.",
    `Durante ${ANIOS_TEXTO} años hemos crecido gracias a la confianza de nuestros clientes, convirtiéndonos en un punto de referencia en el comercio de moda urbana. Hoy seguimos trabajando para llevar la mejor experiencia de compra, tanto en nuestra tienda física como en línea.`,
  ],
  // Cada frase manuscrita se parte en dos líneas (mismo texto).
  firma: ["Gracias por ser parte", "de esta historia"],
  datos: [
    { valor: "4 de diciembre\n2019", etiqueta: "FECHA DE FUNDACIÓN" },
    { valor: `${ANIOS_TEXTO} años`, etiqueta: "EN EL COMERCIO" },
    { valor: "Medellín Villa Hermosa", etiqueta: "LA MANSIÓN" },
    { valor: "Miles", etiqueta: "DE CLIENTES SATISFECHOS" },
  ],
  firmaFranja: ["Tu estilo,", "nuestra pasión."],
};

export default function About() {
  return (
    <section className="about section-glow section-glow--both" id="nosotros">
      <div className="about__inner">
        <div className="about__panel">
          <div className="about__media">
            <img
              className="about__img"
              src={fotoTienda}
              alt="Interior de la tienda La Mansión"
              loading="lazy"
            />
            <span className="about__media-fade" aria-hidden="true" />
          </div>

          <div className="about__main">
            <p className="about__eyebrow">{CONTENIDO.etiqueta}</p>

            <h2 className="about__title">
              {CONTENIDO.tituloBlanco} <br />
              <span className="about__title-gold">
                {CONTENIDO.tituloDorado}
              </span>
            </h2>

            {CONTENIDO.parrafos.map((parrafo, i) => (
              <p className="about__text" key={i}>
                {parrafo}
              </p>
            ))}

            <p className="about__signature">
              <span className="about__signature-text">
                {CONTENIDO.firma[0]}
                <br />
                {CONTENIDO.firma[1]}
              </span>
              <svg
                className="about__signature-line"
                viewBox="0 0 240 12"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M4 9 C 60 2, 180 2, 236 8" />
              </svg>
            </p>
          </div>
        </div>

        <div className="about__stats">
          <div className="about__stats-photo" aria-hidden="true">
            <img src={fotoTienda} alt="" loading="lazy" />
            <span className="about__stats-photo-fade" />
          </div>

          <ul className="about__stats-list">
            {CONTENIDO.datos.map((dato, i) => (
              <li className="about__stat" key={i}>
                <span className="about__stat-value">{dato.valor}</span>
                <span className="about__stat-label">{dato.etiqueta}</span>
              </li>
            ))}
          </ul>

          <p className="about__stats-signature">
            <span className="about__stats-signature-text">
              {CONTENIDO.firmaFranja[0]}
              <br />
              {CONTENIDO.firmaFranja[1]}
            </span>
            <svg
              className="about__stats-signature-line"
              viewBox="0 0 240 12"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M4 9 C 60 2, 180 2, 236 8" />
            </svg>
          </p>
        </div>
      </div>
    </section>
  );
}
