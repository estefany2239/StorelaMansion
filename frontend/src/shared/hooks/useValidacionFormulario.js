import { useState } from "react";

// =========================================================
// VALIDACIÓN EN TIEMPO REAL — STORE LA MANSIÓN
// =========================================================
// Hook compartido por los formularios del panel y el registro
// público. Reglas:
// - Un campo muestra su error solo después de que el usuario lo
//   toca (onBlur) o intenta enviar el formulario.
// - Al corregir el valor, el error desaparece de inmediato.
// - Al enviar se valida todo; si hay errores, se enfoca el primer
//   campo inválido (cada campo validado debe tener id="campo-<nombre>").
//
// reglas: { campo: (valor, formulario) => "mensaje" | "" }
// El orden de las claves define el orden de validación y de foco.
export function useValidacionFormulario(reglas) {
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});

  const validarCampo = (campo, valor, formulario) => {
    const regla = reglas[campo];
    if (!regla) return "";

    const mensaje = regla(valor, formulario);
    return typeof mensaje === "string" ? mensaje : "";
  };

  // Muestra u oculta el error de un campo sin tocar el resto.
  const aplicarError = (campo, mensaje) => {
    setErrores((actuales) => {
      if (!mensaje) {
        if (!actuales[campo]) return actuales;

        const siguientes = { ...actuales };
        delete siguientes[campo];
        return siguientes;
      }

      if (actuales[campo] === mensaje) return actuales;
      return { ...actuales, [campo]: mensaje };
    });
  };

  // onBlur: el campo queda "tocado" y, si es inválido, muestra su error.
  const manejarBlur = (campo, valor, formulario) => {
    setTocados((actuales) =>
      actuales[campo] ? actuales : { ...actuales, [campo]: true }
    );
    aplicarError(campo, validarCampo(campo, valor, formulario));
  };

  // onChange: solo recalcula si el campo ya fue tocado, de modo que
  // corregir el valor limpia el error de inmediato.
  const revisarCampo = (campo, valor, formulario) => {
    if (!tocados[campo]) return;
    aplicarError(campo, validarCampo(campo, valor, formulario));
  };

  // Valida todos los campos con regla y enfoca el primer inválido.
  // Devuelve true si el formulario es válido.
  const validarTodo = (formulario) => {
    const nuevosErrores = {};

    Object.keys(reglas).forEach((campo) => {
      const mensaje = validarCampo(
        campo,
        formulario[campo],
        formulario
      );
      if (mensaje) nuevosErrores[campo] = mensaje;
    });

    setTocados((actuales) => {
      const siguientes = { ...actuales };
      Object.keys(reglas).forEach((campo) => {
        siguientes[campo] = true;
      });
      return siguientes;
    });
    setErrores(nuevosErrores);

    const primerInvalido = Object.keys(reglas).find(
      (campo) => nuevosErrores[campo]
    );

    if (primerInvalido) {
      window.setTimeout(() => {
        const elemento = document.getElementById(
          `campo-${primerInvalido}`
        );

        if (elemento) {
          elemento.scrollIntoView({
            block: "center",
            behavior: "smooth"
          });
          elemento.focus({ preventScroll: true });
        }
      }, 60);

      return false;
    }

    return true;
  };

  // Reinicia errores y campos tocados (al abrir o cerrar un modal).
  const limpiarValidacion = () => {
    setErrores({});
    setTocados({});
  };

  return {
    errores,
    tocados,
    manejarBlur,
    revisarCampo,
    validarTodo,
    limpiarValidacion,
    setErrores
  };
}

export default useValidacionFormulario;
