import { useState } from "react";

function useToast() {
  const [toast, setToast] = useState(null);

  const mostrarToast = (mensaje, tipo = "exito") => {
    setToast({ mensaje, tipo });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  return { toast, mostrarToast };
}

export default useToast;