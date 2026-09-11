import { useState } from "react";
import { Mail, ArrowLeft, Key, ArrowRight } from "lucide-react";
import "./Login.css";

const authBg = new URL("../../assets/img/img.png", import.meta.url).href;

export default function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
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
              <Key size={20} className="auth__gold-icon" />
            </div>
            <h2>Recuperar Contraseña</h2>
            <p>Te enviaremos instrucciones a tu correo</p>
          </div>

          {!submitted ? (
            <form className="auth__form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label>CORREO ELECTRÓNICO</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn">
                Enviar instrucciones <ArrowRight size={18} />
              </button>

              <div className="auth-footer-text">
                <button type="button" onClick={onBackToLogin} className="auth-link">
                  <ArrowLeft size={14} /> Regresar al inicio de sesión
                </button>
              </div>
            </form>
          ) : (
            <div className="auth-success">
              <p>
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada.
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
