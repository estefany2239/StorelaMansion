import { Trash2, AlertTriangle, X } from "lucide-react";
import "./ConfirmDialog.css";

export default function ConfirmDialog({
  abierto = true,
  titulo = "Confirmar acción",
  mensaje,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  onConfirmar = () => {},
  onCancelar = () => {},
  variante = "peligro",
}) {
  if (!abierto) return null;

  return (
    <div
      className="confirm-dialog-overlay"
      onClick={onCancelar}
    >
      <div
        className={`confirm-dialog-card confirm-dialog-${variante}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="confirm-dialog-close"
          onClick={onCancelar}
        >
          <X size={20} />
        </button>

        <div className="confirm-dialog-icon">
          {variante === "info" ? (
            <AlertTriangle size={30} />
          ) : (
            <Trash2 size={30} />
          )}
        </div>

        <h3>{titulo}</h3>

        <p>{mensaje}</p>

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-cancel-button"
            onClick={onCancelar}
          >
            {textoCancelar}
          </button>

          <button
            type="button"
            className="confirm-action-button"
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}