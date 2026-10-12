import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

import { NotifyContext } from "./notifyContext";
import "./ToastProvider.css";

// =========================================================
// NOTIFICACIONES PÚBLICAS - STORE LA MANSIÓN
// =========================================================
// Sistema de notificaciones reutilizable para el sitio público.
// Reemplaza los `alert()` nativos por avisos elegantes integrados
// en la interfaz. Se monta una sola vez (nivel App), por lo que
// los avisos sobreviven al desmontaje del componente que los lanza.

// Tiempo que permanece visible cada aviso (ms)
const DURACION = 4500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const cerrar = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, type = "info") => {
    const id = (idRef.current += 1);
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotifyContext.Provider value={value}>
      {children}

      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={cerrar} />
        ))}
      </div>
    </NotifyContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const { id, message, type } = toast;

  useEffect(() => {
    const temporizador = setTimeout(() => onClose(id), DURACION);
    return () => clearTimeout(temporizador);
  }, [id, onClose]);

  const Icono =
    type === "success" ? CheckCircle2 : type === "error" ? AlertTriangle : Info;

  return (
    <div
      className={`toast toast--${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      <span className="toast__icon" aria-hidden="true">
        <Icono size={20} strokeWidth={2} />
      </span>

      <p className="toast__message">{message}</p>

      <button
        type="button"
        className="toast__close"
        onClick={() => onClose(id)}
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default ToastProvider;
