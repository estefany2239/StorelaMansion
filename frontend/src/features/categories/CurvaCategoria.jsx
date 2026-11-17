// =========================================================
// CURVA ASIMÉTRICA ("OLA") ENTRE EL BANNER Y EL FONDO
// Va directamente después del banner en el flujo normal y se
// monta sobre su base con margen negativo, cortando la foto.
// El relleno toma var(--fondo) para fundirse con la página;
// la cinta dorada nace gruesa a la izquierda y se afina hacia
// la derecha (path de relleno con degradado que se desvanece
// + trazo fino superior). vector-effect non-scaling-stroke
// mantiene el grosor al cambiar el ancho.
// =========================================================

export default function CurvaCategoria({ compacto = false }) {
  return (
    <svg
      className={`categoria-pagina-curva${
        compacto ? " categoria-pagina-curva--compacto" : ""
      }`}
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="curvaCategoriaOro" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#b8860b" />
          <stop offset="0.4" stopColor="#f5d36b" />
          <stop offset="0.75" stopColor="#d4af37" stopOpacity="0.7" />
          <stop offset="1" stopColor="#d4af37" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path className="categoria-pagina-curva-fondo" d="M0 70C240 160 520 192 760 172S1200 92 1440 20V200H0Z" />
      {/* El resplandor dorado va SOLO sobre las cintas (clase
          categoria-pagina-curva-oro), no sobre el SVG completo: si el
          filtro cubriera todo el cuadro, el brillo seguiría también los
          bordes rectos del recuadro y se vería como una caja con sombra. */}
      <path className="categoria-pagina-curva-oro" d="M0 70C240 160 520 192 760 172S1200 92 1440 20C1200 100 1000 188 760 184C520 200 240 170 0 104Z" fill="url(#curvaCategoriaOro)" />
      <path className="categoria-pagina-curva-oro" d="M0 70C240 160 520 192 760 172S1200 92 1440 20" fill="none" stroke="#f5d36b" strokeWidth="2" vectorEffect="non-scaling-stroke" opacity="0.9" />
    </svg>
  );
}
