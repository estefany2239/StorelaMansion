import { useEffect, useRef, useState } from 'react';

// Widget de Cloudflare Turnstile, reutilizable y con carga perezosa del
// script oficial (sólo se descarga cuando hace falta, una vez por sesión).
//
// - `accion` es la misma que exige el backend en siteverify: con ella un
//   token de registro no sirve para la recuperación de contraseña.
// - El token es de un solo uso y caduca, así que el padre lo reinicia
//   (cambiando `reiniciar`) y limpia su copia del token tras cada intento.
// - Sin clave pública no se pide token y el padre mantiene el botón
//   deshabilitado (fallo cerrado también en el navegador).
//
// Los avisos se actualizan en callbacks de Turnstile, en la carga del script
// y al reiniciar el widget; nunca durante el render.

const URL_SCRIPTO = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const CLAVE_PUBLICA = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const AVISO_SIN_CLAVE =
  'Falta la clave pública de Turnstile (VITE_TURNSTILE_SITE_KEY) en el archivo .env del frontend.';

let promesaScripto = null;

const cargarScripto = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (promesaScripto) return promesaScripto;

  promesaScripto = new Promise((resolver, rechazar) => {
    const guion = document.createElement('script');
    guion.src = URL_SCRIPTO;
    guion.async = true;
    guion.defer = true;
    guion.onload = () => resolver(window.turnstile);
    guion.onerror = () => {
      promesaScripto = null;
      rechazar(new Error('no se pudo cargar el script de Turnstile'));
    };
    document.head.appendChild(guion);
  });

  return promesaScripto;
};

export default function TurnstileWidget({ accion, onChange, reiniciar = 0 }) {
  const contenedor = useRef(null);
  const widget = useRef(null);
  const avisar = useRef(onChange);
  const primeraVez = useRef(true);
  const resetPendiente = useRef(false);
  const [texto, setTexto] = useState('');

  // Mantener a mano la última función del padre sin volver a pintar.
  useEffect(() => {
    avisar.current = onChange;
  }, [onChange]);

  // Dibuja el widget cuando cambia la acción y lo retira al desmontar.
  useEffect(() => {
    if (!CLAVE_PUBLICA) return undefined;

    let cancelado = false;

    cargarScripto()
      .then((turnstile) => {
        if (cancelado || !contenedor.current) return;
        contenedor.current.innerHTML = '';
        widget.current = turnstile.render(contenedor.current, {
          sitekey: CLAVE_PUBLICA,
          action: accion,
          callback: (token) => {
            if (cancelado) return;
            setTexto('');
            avisar.current(token);
          },
          'expired-callback': () => {
            if (cancelado) return;
            avisar.current('');
            setTexto('La verificación expiró: vuelve a marcarla para continuar.');
          },
          'error-callback': () => {
            if (cancelado) return;
            avisar.current('');
            setTexto('No se pudo completar la verificación. Inténtalo de nuevo.');
          },
        });

        // Si el padre pidió reiniciar antes de que el script terminara de
        // cargar, el reset se aplica ahora que el widget ya existe.
        if (resetPendiente.current) {
          resetPendiente.current = false;
          try {
            turnstile.reset(widget.current);
            setTexto('');
          } catch {
            // El widget acaba de pintarse; si reset falla, el próximo
            // reinicio explícito lo intentará de nuevo.
          }
        }
      })
      .catch(() => {
        if (cancelado) return;
        avisar.current('');
        setTexto('No se pudo cargar la verificación de seguridad. Revisa tu conexión.');
      });

    return () => {
      cancelado = true;
      if (widget.current && window.turnstile) {
        try {
          window.turnstile.remove(widget.current);
        } catch {
          // El widget ya no existe: no hay nada que limpiar.
        }
        widget.current = null;
      }
    };
  }, [accion]);

  // Reinicio tras cada intento: el token anterior ya se gastó. Quien limpia
  // su copia del token es el padre, al mismo tiempo que incrementa `reiniciar`.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (widget.current && window.turnstile) {
      try {
        window.turnstile.reset(widget.current);
        resetPendiente.current = false;
      } catch {
        resetPendiente.current = true;
      }
    } else {
      // El widget todavía no está listo: se reinicia al terminar el render.
      resetPendiente.current = true;
    }
  }, [reiniciar]);

  const aviso = CLAVE_PUBLICA ? texto : AVISO_SIN_CLAVE;

  return (
    <div className="auth-field auth-captcha">
      <div className="auth-captcha__widget" ref={contenedor} />
      {aviso && <div className="auth-field__error">{aviso}</div>}
    </div>
  );
}
