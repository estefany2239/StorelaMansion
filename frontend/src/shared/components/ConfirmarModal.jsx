import { useEffect } from "react";
import "./ConfirmarModal.css";

export default function ConfirmarModal({
  abierto = false,
  titulo = "Confirmar acción",
  mensaje = "",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  peligro = false,
  onConfirmar = () => {},
  onCancelar = () => {},
}) {
  useEffect(() => {
    if (!abierto) return undefined;

    const manejarTecla = (evento) => {
      if (evento.key === "Escape") onCancelar();
    };

    document.addEventListener("keydown", manejarTecla);
    return () => document.removeEventListener("keydown", manejarTecla);
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  return (
    <div className="confirmar-modal-overlay" onClick={onCancelar} role="presentation">
      <div
        className="confirmar-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirmar-modal-header">
          <h3>{titulo}</h3>
        </div>

        <div className="confirmar-modal-body">
          <p>{mensaje}</p>
        </div>

        <div className="confirmar-modal-actions">
          <button type="button" className="confirmar-modal-cancelar" onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button
            type="button"
            className={peligro ? "confirmar-modal-confirmar confirmar-modal-confirmar--peligro" : "confirmar-modal-confirmar"}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
