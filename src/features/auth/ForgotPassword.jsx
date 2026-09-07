import { useState } from "react";
import { Mail, ArrowLeft, Key } from "lucide-react";
import "./Login.css";

export default function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="login-page">
      <button className="login__back-btn" onClick={onBackToLogin}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="login-container">
        <div className="login-card">
          <div className="login__header">
            <div className="login__icon-wrapper">
              <Key size={20} className="login__gold-icon" />
            </div>
            <h2>Recuperar Contraseña</h2>
            <p>Te enviaremos instrucciones a tu correo</p>
          </div>

          {!submitted ? (
            <form className="login__form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>CORREO ELECTRÓNICO</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="login__submit-btn">
                Enviar instrucciones
              </button>

              <div className="register-redirect">
                <button 
                  type="button" 
                  onClick={onBackToLogin}
                  className="forgot-link"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  Regresar al inicio de sesión
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "20px", fontSize: "0.95rem" }}>
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada.
              </p>
              <button 
                onClick={onBackToLogin} 
                className="login__submit-btn"
              >
                Ir a iniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}