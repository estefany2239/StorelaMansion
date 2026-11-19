import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CircleAlert, Eye, Heart, RotateCw } from "lucide-react";

import BotonFavorito from "../../../shared/components/favoritos/BotonFavorito";
import ProductDetailPage from "../../product/ProductDetailPage";
import { useFavoritos } from "../../../shared/hooks/useFavoritos";
import { useCatalogo } from "../../../shared/hooks/useCatalogo";
import { useNotify } from "../../../shared/components/notifications/useNotify.js";
import { obtenerFavoritos } from "../../../shared/services/api";
import { urlImagen } from "../../../shared/utils/imagenes";
import "./MisFavoritos.css";

const IMAGEN_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#e5e5e5"/></svg>'
  );

const formatearPrecio = (valor) =>
  "$" + Number(valor || 0).toLocaleString("es-CO");

const imagenDe = (nombre) => urlImagen(nombre) || IMAGEN_FALLBACK;

export default function MisFavoritos({
  onBack,
  onVerProductos,
  addToCart,
}) {
  const notify = useNotify();
  const {
    esFavorito,
    cargando: cargandoIds,
    recargar: recargarIds
  } = useFavoritos();
  const { catalogo } = useCatalogo();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [productoAbierto, setProductoAbierto] = useState(null);

  const cargarFavoritos = useCallback(async () => {
    setCargando(true);
    setErrorCarga("");
    try {
      const lista = await obtenerFavoritos();
      setDatos(Array.isArray(lista) ? lista : []);
    } catch (error) {
      setDatos(null);
      setErrorCarga(error?.message || "No se pudieron cargar tus favoritos");
    } finally {
      setCargando(false);
    }
  }, []);

  const reintentarCarga = useCallback(async () => {
    await recargarIds();
    await cargarFavoritos();
  }, [recargarIds, cargarFavoritos]);

  useEffect(() => {
    let vigente = true;

    obtenerFavoritos()
      .then((lista) => {
        if (vigente) setDatos(Array.isArray(lista) ? lista : []);
      })
      .catch((error) => {
        if (vigente) {
          setDatos(null);
          setErrorCarga(
            error?.message || "No se pudieron cargar tus favoritos"
          );
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  // El corazón manda: la lista visible se deriva del contexto, así al
  // quitar un favorito la tarjeta sale al instante (y vuelve si falla).
  const favoritosVisibles = useMemo(
    () => (datos || []).filter((favorito) => esFavorito(favorito.id_producto)),
    [datos, esFavorito]
  );

  // El detalle se abre sobre el REAL del catálogo (con sus variantes y
  // tallas); el favorito solo trae la fila resumida del backend.
  const abrirDetalle = (favorito) => {
    const producto = catalogo.find(
      (item) =>
        String(item.id_producto ?? item.grupoId) ===
        String(favorito.id_producto)
    );

    if (!producto) {
      notify("Este producto ya no está disponible", "error");
      return;
    }

    setProductoAbierto(producto);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const existeReal = (favorito) => {
    const producto = catalogo.find(
      (item) =>
        String(item.id_producto ?? item.grupoId) ===
        String(favorito.id_producto)
    );
    return Boolean(producto);
  };

  if (productoAbierto) {
    return (
      <ProductDetailPage
        key={productoAbierto.id}
        product={productoAbierto}
        catalogoCompleto={catalogo}
        addToCart={(producto) => addToCart?.(producto)}
        onBack={() => {
          setProductoAbierto(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  }

  return (
    <section className="mis-favoritos-section">
      <div className="mis-favoritos-wrap">
        <div className="mis-favoritos-topbar">
          <button className="mf-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> Seguir comprando
          </button>
        </div>

        <div className="mis-favoritos-header">
          <span className="mf-kicker">Guardados con corazón</span>
          <h2 className="mf-title">
            Mis favoritos{" "}
            {!errorCarga && datos && (
              <span className="mf-contador">({favoritosVisibles.length})</span>
            )}
          </h2>
          <p className="mf-subtitle">
            Los productos que marcaste aparecen aquí; el más reciente primero.
          </p>
        </div>

        {errorCarga && (
          <div className="mf-api-error" role="alert">
            <p>
              <CircleAlert size={16} />
              No pudimos cargar tus favoritos desde el servidor.{" "}
              {errorCarga}
            </p>
            <button
              type="button"
              className="mf-btn-reintentar"
              onClick={reintentarCarga}
              disabled={cargando || cargandoIds}
            >
              <RotateCw size={14} />
              {cargando || cargandoIds ? "Reintentando..." : "Reintentar"}
            </button>
          </div>
        )}

        {cargando || cargandoIds ? (
          <div className="mf-grid" aria-busy="true">
            {[0, 1, 2, 3].map((item) => (
              <div className="fav-card fav-card--skeleton" key={item}>
                <div className="fav-card__img-wrap">
                  <span className="mf-skeleton mf-skeleton--img" />
                </div>
                <div className="fav-card__body">
                  <span className="mf-skeleton mf-skeleton--line" />
                  <span className="mf-skeleton mf-skeleton--line mf-skeleton--corta" />
                  <span className="mf-skeleton mf-skeleton--boton" />
                </div>
              </div>
            ))}
          </div>
        ) : !errorCarga && datos && favoritosVisibles.length > 0 ? (
          <div className="mf-grid">
            {favoritosVisibles.map((favorito) => (
              <article
                className="fav-card"
                key={favorito.id_producto}
              >
                <div className="fav-card__img-wrap">
                  <img
                    className="fav-card__img"
                    src={imagenDe(favorito.imagen)}
                    alt={favorito.nombre}
                    loading="lazy"
                  />

                  {favorito.disponible === false && (
                    <span className="fav-badge-agotado">Agotado</span>
                  )}

                  <BotonFavorito
                    idProducto={favorito.id_producto}
                    nombre={favorito.nombre}
                    variante="chip"
                  />
                </div>

                <div className="fav-card__body">
                  {favorito.categoria ? (
                    <span className="fav-card__categoria">
                      {favorito.categoria}
                    </span>
                  ) : null}

                  <h3 className="fav-card__nombre">{favorito.nombre}</h3>

                  <span className="fav-card__precio">
                    {formatearPrecio(favorito.precio)}
                  </span>

                  <button
                    type="button"
                    className="fav-card__ver"
                    onClick={() => abrirDetalle(favorito)}
                    disabled={!existeReal(favorito)}
                    title={
                      existeReal(favorito)
                        ? "Elegir talla y comprar en el detalle"
                        : "Este producto ya no está disponible"
                    }
                  >
                    <Eye size={15} /> Ver producto
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : !errorCarga ? (
          <div className="mf-empty">
            <Heart size={44} />
            <h3>Aún no tienes favoritos</h3>
            <p>
              Toca el corazón de los productos que te gusten para verlos aquí
              después.
            </p>
            <button type="button" className="mf-empty-btn" onClick={onVerProductos}>
              <Eye size={15} /> Ver los productos
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
