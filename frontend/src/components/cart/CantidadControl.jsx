import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  esAgotado,
  mensajeAgotado,
  mensajeMaximo,
  mensajeStock,
  parsearCantidad,
  soloDigitos,
  topeDe,
} from "./cantidad";
import "./CantidadControl.css";

// =========================================================
// CONTROL DE CANTIDAD EDITABLE - STORE LA MANSIÓN
// =========================================================
// Se usa en el carrito, en la vista "Tu pedido" y en el detalle de
// producto: un solo componente evita duplicar la lógica de cantidad.
// El valor real de la cantidad vive en el carrito (App.jsx); aquí solo
// se mantiene un estado local de TEXTO para poder escribir y borrar sin
// que el campo se reinicie en cada tecla. El número se confirma al
// perder el foco o al pulsar Enter (ver ./cantidad.js).

export default function CantidadControl({
  cantidad,
  stock,
  onChange,
  className = "",
  disabled = false,
}) {
  const cantidadValida = Math.max(1, Number(cantidad) || 1);
  const tope = topeDe(stock);
  // Variante sin unidades y cantidad ya en el tope superior.
  const agotado = esAgotado(stock);
  const enTope = cantidadValida >= tope;

  const [texto, setTexto] = useState(String(cantidadValida));
  const [aviso, setAviso] = useState("");

  // Ajuste durante el render (patrón "adjusting state when props change"):
  // si la cantidad real cambia por fuera (botones, otra vista o un tope
  // por stock) el texto se realinea sin usar un efecto.
  const [cantidadPrevia, setCantidadPrevia] = useState(cantidadValida);
  if (cantidadPrevia !== cantidadValida) {
    setCantidadPrevia(cantidadValida);
    setTexto(String(cantidadValida));
    setAviso("");
  }

  const mensaje = () => mensajeStock(tope);

  // Mensaje que se muestra bajo el control: el aviso puntual del campo
  // escrito a mano manda; si no, el estado actual (agotado o tope).
  const mensajeDerivado = agotado
    ? mensajeAgotado()
    : enTope
      ? mensajeMaximo(tope)
      : "";
  const mensajeVisible = aviso || mensajeDerivado;

  // Confirma lo escrito al perder el foco o al pulsar Enter.
  const confirmar = (valor) => {
    const numero = parsearCantidad(valor);

    // Vacío, 0 o inválido: vuelve a la última cantidad válida (sin errores).
    if (numero === null) {
      setTexto(String(cantidadValida));
      setAviso("");
      return;
    }

    // Más que el stock: ajusta al máximo y avisa bajo el control.
    if (numero > tope) {
      setTexto(String(tope));
      setAviso(agotado ? mensajeAgotado() : mensaje());
      if (tope !== cantidadValida && onChange) onChange(tope);
      return;
    }

    setAviso("");
    setTexto(String(numero));
    if (numero !== cantidadValida && onChange) onChange(numero);
  };

  const bajar = () => {
    if (disabled) return;
    const siguiente = Math.max(1, cantidadValida - 1);
    setAviso("");
    setTexto(String(siguiente));
    if (siguiente !== cantidadValida && onChange) onChange(siguiente);
  };

  const subir = () => {
    if (disabled) return;

    // Variante sin unidades: no puede crecer.
    if (agotado) {
      setTexto(String(cantidadValida));
      setAviso(mensajeAgotado());
      return;
    }

    // + no supera el stock.
    if (cantidadValida >= tope) {
      setTexto(String(cantidadValida));
      setAviso(mensajeStock(tope));
      return;
    }

    const siguiente = cantidadValida + 1;
    setAviso("");
    setTexto(String(siguiente));
    if (onChange) onChange(siguiente);
  };

  return (
    <div className="cantidad-control">
      <div className={`cantidad-control-box ${className}`.trim()}>
        <button
          type="button"
          onClick={bajar}
          disabled={disabled || cantidadValida <= 1}
          aria-label="Disminuir cantidad"
        >
          <Minus size={14} />
        </button>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={texto}
          disabled={disabled}
          aria-label="Cantidad"
          onChange={(evento) => {
            setTexto(soloDigitos(evento.target.value));
            if (aviso) setAviso("");
          }}
          onBlur={(evento) => confirmar(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              confirmar(evento.target.value);
            }
          }}
        />

        <button
          type="button"
          onClick={subir}
          disabled={disabled || agotado || enTope}
          aria-label="Aumentar cantidad"
        >
          <Plus size={14} />
        </button>
      </div>

      {mensajeVisible && (
        <p className="cantidad-control-aviso" role="status">
          {mensajeVisible}
        </p>
      )}
    </div>
  );
}
