import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight
} from "lucide-react";

import { cambiarContrasena } from "../../shared/services/api";

import "./Login.css";

const authBg = new URL("../../assets/img/img.png", import.meta.url).href;

// Pantalla "Establecer nueva contraseña". Se muestra después de iniciar
// sesión con la contraseña temporal de una invitación (el backend marca
// cambioContrasena). No existe un enlace directo hacia esta vista: solo se
// llega con una sesión iniciada.
export default function CambiarContrasena({
  usuario,
  onContrasenaCambiada,
  onCancelar
}) {
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [verContrasenas, setVerContrasenas] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!contrasenaActual) {
      setError("Ingresa la contraseña temporal con la que iniciaste sesión.");
      return;
    }
    if (contrasenaNueva.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (contrasenaNueva !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);
    try {
      const data = await cambiarContrasena(contrasenaActual, contrasenaNueva);
      onContrasenaCambiada(data.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth-page" style={{ backgroundImage: `url(${authBg})` }}>
      <div className="auth-overlay" />

      <button className="auth__back-btn" onClick={onCancelar}>
        <ArrowLeft size={18} />
        Cerrar sesión
      </button>

      <div className="auth-container">
        <div className="auth-card">

          <div className="auth__brand">
            <h1 className="auth__logo">LA MANSI<span className="auth__logo-accent">ÓN</span></h1>
            <span className="auth__subtitle">STORE</span>
          </div>

          <div className="auth__header">
            <div className="auth__icon-wrapper">
              <KeyRound size={20} className="auth__gold-icon" />
            </div>
            <h2>Establecer nueva contraseña</h2>
            <p>
              Hola {usuario?.nombre}. Usa tu contraseña temporal para crear
              una contraseña propia y completar tu activación.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth__form">

            <div className="auth-field">
              <label>CONTRASEÑA TEMPORAL</label>
              <div className="auth-input-wrap">
                <KeyRound size={16} className="auth-input-icon" />
                <input
                  type={verContrasenas ? "text" : "password"}
                  placeholder="Contraseña que recibiste"
                  value={contrasenaActual}
                  onChange={(e) => setContrasenaActual(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label>NUEVA CONTRASEÑA</label>
              <div className="auth-input-wrap">
                <KeyRound size={16} className="auth-input-icon" />
                <input
                  type={verContrasenas ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={contrasenaNueva}
                  onChange={(e) => setContrasenaNueva(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-pw"
                  onClick={() => setVerContrasenas(!verContrasenas)}
                >
                  {verContrasenas ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label>CONFIRMAR NUEVA CONTRASEÑA</label>
              <div className="auth-input-wrap">
                <KeyRound size={16} className="auth-input-icon" />
                <input
                  type={verContrasenas ? "text" : "password"}
                  placeholder="Repite la nueva contraseña"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={enviando}
            >
              {enviando ? "Guardando..." : "Guardar contraseña"} <ArrowRight size={18} />
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}
