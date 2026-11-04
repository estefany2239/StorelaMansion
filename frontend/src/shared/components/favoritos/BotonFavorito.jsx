import { Heart } from "lucide-react";

import { useFavoritos } from "../../hooks/useFavoritos";
import { useNotify } from "../notifications/useNotify.js";
import "./BotonFavorito.css";

// Botón de corazón reutilizable. Se muestra solo a visitantes (para
// invitarlos a iniciar sesión) y a clientes con sesión; los
// administradores y vendedores no lo ven.
//
// - variante "chip": círculo oscuro flotado sobre la imagen.
// - variante "contorno": círculo con borde para filas de texto/detalles.
export default function BotonFavorito({
  idProducto,
  nombre = "",
  variante = "chip",
  className = "",
  onIniciarSesion,
}) {
  const { user, esFavorito, alternar } = useFavoritos();
  const notify = useNotify();

  if (user && user.rol !== "Cliente") return null;
  if (idProducto == null) return null;

  const activo = Boolean(user) && esFavorito(idProducto);
  const etiqueta = activo ? "Quitar de favoritos" : "Agregar a favoritos";

  const manejarClick = async (evento) => {
    // Dentro de una tarjeta-enlace no debe disparar la navegación.
    evento.preventDefault();
    evento.stopPropagation();

    // Sin sesión: mensaje y directo al inicio de sesión.
    if (!user) {
      notify("Inicia sesión para guardar tus favoritos", "info");
      onIniciarSesion?.();
      return;
    }

    await alternar(idProducto);
  };

  return (
    <button
      type="button"
      className={`
        btn-favorito
        btn-favorito--${variante}
        ${activo ? "isActive" : ""}
        ${className ? " " + className : ""}
      `}
      aria-pressed={activo}
      aria-label={nombre ? `${etiqueta}: ${nombre}` : etiqueta}
      title={etiqueta}
      onClick={manejarClick}
    >
      <Heart size={16} fill={activo ? "var(--gold)" : "none"} />
    </button>
  );
}
