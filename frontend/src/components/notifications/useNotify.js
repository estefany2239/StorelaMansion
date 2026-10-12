import { useContext } from "react";

import { NotifyContext } from "./notifyContext";

// Devuelve la función notify(mensaje, tipo) del ToastProvider.
export function useNotify() {
  const context = useContext(NotifyContext);

  if (!context) {
    throw new Error("useNotify debe usarse dentro de <ToastProvider>");
  }

  return context.notify;
}

export default useNotify;
