import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  esAgotado,
  mensajeAgotado,
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
  // Solo se enciende cuando el usuario intenta pedir más que el stock.
  // Estar justo en el tope (cantidad === stock) NO muestra alerta.
  const [avisoExceso, setAvisoExceso] = useState(false);

  // Ajuste durante el render (patrón "adjusting state when props change"):
  // si la cantidad real cambia por fuera (botones, otra vista o un tope
  // por stock) el texto se realinea sin usar un efecto.
  const [cantidadPrevia, setCantidadPrevia] = useState(cantidadValida);
  if (cantidadPrevia !== cantidadValida) {
    setCantidadPrevia(cantidadValida);
    setTexto(String(cantidadValida));
    // El recorte por exceso deja la cantidad justo en el tope: conserva el
    // aviso. Cualquier otro cambio externo limpia el aviso anterior.
    if (cantidadValida !== tope) setAvisoExceso(false);
  }

  // Mensaje que se muestra bajo el control: agotado o intento de exceso.
  const mensajeVisible = agotado
    ? mensajeAgotado()
    : avisoExceso
      ? mensajeStock(tope)
      : "";

  // Confirma lo escrito al perder el foco o al pulsar Enter.
  const confirmar = (valor) => {
    const numero = parsearCantidad(valor);

    // Vacío, 0 o inválido: vuelve a la última cantidad válida (sin errores).
    if (numero === null) {
      setTexto(String(cantidadValida));
      setAvisoExceso(false);
      return;
    }

    // Más que el stock: ajusta al máximo y avisa bajo el control.
    if (numero > tope) {
      setTexto(String(tope));
      setAvisoExceso(!agotado);
      if (tope !== cantidadValida && onChange) onChange(tope);
      return;
    }

    // Igual o menor que el stock es válido y no genera alerta.
    setAvisoExceso(false);
    setTexto(String(numero));
    if (numero !== cantidadValida && onChange) onChange(numero);
  };

  const bajar = () => {
    if (disabled) return;
    const siguiente = Math.max(1, cantidadValida - 1);
    setAvisoExceso(false);
    setTexto(String(siguiente));
    if (siguiente !== cantidadValida && onChange) onChange(siguiente);
  };

  const subir = () => {
    if (disabled) return;

    // Variante sin unidades: no puede crecer.
    if (agotado) {
      setTexto(String(cantidadValida));
      setAvisoExceso(false);
      return;
    }

    // + no supera el stock.
    if (cantidadValida >= tope) {
      setTexto(String(cantidadValida));
      setAvisoExceso(true);
      return;
    }

    const siguiente = cantidadValida + 1;
    setAvisoExceso(false);
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
            if (avisoExceso) setAvisoExceso(false);
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
        <p className="cantidad-control-aviso" role="alert">
          {mensajeVisible}
        </p>
      )}
    </div>
  );
}
