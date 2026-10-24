import { useState } from "react";
import {
  Mail,
  ArrowLeft,
  Key,
  ArrowRight,
  Lock,
  ShieldCheck
} from "lucide-react";
import {
  solicitarCodigoRecuperacion,
  verificarCodigoRecuperacion,
  restablecerContrasena
} from "../../../shared/services/api";
import "./Login.css";

const authBg = new URL("../../../assets/img/img.png", import.meta.url).href;

export default function ForgotPassword({ onBackToLogin }) {
  const [paso, setPaso] = useState("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [token, setToken] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const correoNormalizado = () => correo.trim().toLowerCase();

  const enviarSolicitud = async () => {
    setError("");
    setCargando(true);
    try {
      await solicitarCodigoRecuperacion(correoNormalizado());
      setPaso("codigo");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmitCorreo = async (e) => {
    e.preventDefault();
    await enviarSolicitud();
  };

  const handleReenviar = async () => {
    setError("");
    setCargando(true);
    try {
      await solicitarCodigoRecuperacion(correoNormalizado());
      setCodigo("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmitCodigo = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const data = await verificarCodigoRecuperacion(correoNormalizado(), codigo.trim());
      setToken(data.token);
      setContrasena("");
      setConfirmar("");
      setPaso("nueva");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmitNueva = async (e) => {
    e.preventDefault();
    setError("");

    if (contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (contrasena !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);
    try {
      await restablecerContrasena(token, contrasena);
      setPaso("listo");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const volverAlCodigo = () => {
    setError("");
    setCodigo("");
    setPaso("codigo");
  };

  const cambiarCorreo = () => {
    setError("");
    setCodigo("");
    setToken("");
    setPaso("correo");
  };

  return (
    <div className="auth-page" style={{ backgroundImage: `url(${authBg})` }}>
      <div className="auth-overlay" />

      <button className="auth__back-btn" onClick={onBackToLogin}>
        <ArrowLeft size={18} /> Volver al inicio
      </button>

      <div className="auth-container">
        <div className="auth-card">

          <div className="auth__brand">
            <h1 className="auth__logo">LA MANSI<span className="auth__logo-accent">ÓN</span></h1>
            <span className="auth__subtitle">STORE</span>
          </div>

          <div className="auth__header">
            <div className="auth__icon-wrapper">
              {paso === "nueva" ? (
                <Lock size={20} className="auth__gold-icon" />
              ) : paso === "codigo" ? (
                <ShieldCheck size={20} className="auth__gold-icon" />
              ) : (
                <Key size={20} className="auth__gold-icon" />
              )}
            </div>
            <h2>Recuperar Contraseña</h2>
            <p>
              {paso === "correo" && "Te enviaremos un código de verificación a tu correo"}
              {paso === "codigo" && `Ingresa el código que enviamos a ${correo}`}
              {paso === "nueva" && "Elige tu nueva contraseña"}
              {paso === "listo" && "Tu contraseña fue actualizada"}
            </p>
          </div>

          {paso === "correo" && (
            <form className="auth__form" onSubmit={handleSubmitCorreo}>
              <div className="auth-field">
                <label>CORREO ELECTRÓNICO</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit-btn" disabled={cargando}>
                {cargando ? "Enviando..." : "Enviar código"} <ArrowRight size={18} />
              </button>

              <div className="auth-footer-text">
                <button type="button" onClick={onBackToLogin} className="auth-link">
                  <ArrowLeft size={14} /> Regresar al inicio de sesión
                </button>
              </div>
            </form>
          )}

          {paso === "codigo" && (
            <form className="auth__form" onSubmit={handleSubmitCodigo}>
              <div className="auth-field">
                <label>CÓDIGO DE VERIFICACIÓN</label>
                <div className="auth-input-wrap">
                  <ShieldCheck size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6 dígitos"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={cargando || codigo.length !== 6}
              >
                {cargando ? "Verificando..." : "Verificar código"} <ArrowRight size={18} />
              </button>

              <div className="auth-row-between">
                <button type="button" onClick={handleReenviar} className="auth-link" disabled={cargando}>
                  Reenviar código
                </button>
                <button type="button" onClick={cambiarCorreo} className="auth-link">
                  Cambiar correo
                </button>
              </div>
            </form>
          )}

          {paso === "nueva" && (
            <form className="auth__form" onSubmit={handleSubmitNueva}>
              <div className="auth-field">
                <label>NUEVA CONTRASEÑA</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>CONFIRMAR CONTRASEÑA</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    placeholder="Repite la contraseña"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit-btn" disabled={cargando}>
                {cargando ? "Guardando..." : "Restablecer contraseña"} <ArrowRight size={18} />
              </button>

              <div className="auth-footer-text">
                <button type="button" onClick={volverAlCodigo} className="auth-link">
                  <ArrowLeft size={14} /> Volver a ingresar el código
                </button>
              </div>
            </form>
          )}

          {paso === "listo" && (
            <div className="auth-success">
              <p>
                Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión con tu
                correo y tu nueva contraseña.
              </p>
              <button onClick={onBackToLogin} className="auth-submit-btn">
                Ir a iniciar sesión <ArrowRight size={18} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
