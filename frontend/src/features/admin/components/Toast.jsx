import { CheckCircle, XCircle } from "lucide-react";
import "./Toast.css";

function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div
      className={
        toast.tipo === "error"
          ? "admin-toast admin-toast-error"
          : "admin-toast"
      }
    >
      {toast.tipo === "error" ? (
        <XCircle size={20} />
      ) : (
        <CheckCircle size={20} />
      )}
      <span>{toast.mensaje}</span>
    </div>
  );
}

export default Toast;