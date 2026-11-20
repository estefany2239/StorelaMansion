// =========================================================
// PLANTILLA DE PÁGINA DE CATEGORÍA (una sola para todas)
// Une NavbarCategoria + BannerCategoria + CurvaCategoria +
// SeleccionPublico. La configuración (texto y fotos) viene
// de categoriasConfig.js; el contenido se ajusta solo al
// cambiar el archivo de datos, nunca duplicando componentes.
// =========================================================

import { useMemo } from "react";
import { obtenerConfigCategoria } from "./categoriasConfig";
import NavbarCategoria from "./NavbarCategoria";
import BannerCategoria from "./BannerCategoria";
import CurvaCategoria from "./CurvaCategoria";
import SeleccionPublico from "./SeleccionPublico";
import Footer from "../../shared/components/footer/Footer";
import "./CategoriaPagina.css";

export default function PaginaCategoria({
  categoria,
  tema,
  user,
  onAlternarTema,
  onIrALogin,
  onNavigate,
  onLogout,
  onNavigateSection,
  onVolverCategorias,
  onVerProductos,
  onVerCategoria,
  cartCount = 0,
  onCartClick,
}) {
  const config = useMemo(
    () => obtenerConfigCategoria(categoria?.title, categoria?.genders),
    [categoria?.title, categoria?.genders]
  );

  // Respaldo provisional: si una tarjeta no tiene foto propia,
  // usa la foto del banner de la categoría.
  const tarjetas = useMemo(
    () =>
      config.tarjetas.map((tarjeta) => ({
        ...tarjeta,
        foto: tarjeta.foto || config.foto
      })),
    [config]
  );

  return (
    <div className="landing categoria-pagina" data-tema={tema}>
      <NavbarCategoria
        tema={tema}
        user={user}
        onAlternarTema={onAlternarTema}
        onIrALogin={onIrALogin}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onNavigateSection={onNavigateSection}
        onVerCategoria={onVerCategoria}
        cartCount={cartCount}
        onCartClick={onCartClick}
      />

      <BannerCategoria
        titulo={config.titulo}
        descripcion={config.descripcion}
        foto={config.foto}
        fotoAncha={config.fotoAncha}
        fotoPosicion={config.fotoPosicion}
        onVolver={onVolverCategorias}
      />

      <CurvaCategoria />

      <SeleccionPublico
        categoria={config.titulo}
        tarjetas={tarjetas}
        onVerProductos={onVerProductos}
      />

      <Footer tema={tema} onNavigateSection={onNavigateSection} onVerCategoria={onVerCategoria} />
    </div>
  );
}
