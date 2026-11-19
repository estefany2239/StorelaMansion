import { useContext } from "react";
import { FavoritosContext } from "./FavoritosContext";

export function useFavoritos() {
  const context = useContext(FavoritosContext);

  if (!context) {
    throw new Error("useFavoritos debe usarse dentro de <FavoritosProvider>");
  }

  return context;
}
