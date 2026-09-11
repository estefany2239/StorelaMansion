import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  User
} from "lucide-react";

import "./Login.css";

const authBg = new URL("../../assets/img/img.png", import.meta.url).href;

export default function Login({
  onBackToHome,
  onNavigateRegister,
  onNavigateForgot,
  onLoginSuccess
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (
      email === "admin@storelamansion.com" &&
      password === "Admin123"
    ) {
      const usuario = {
        nombre: "Administrador",
        email: email,
        rol: "Administrador"
      };
      localStorage.setItem("usuario", JSON.stringify(usuario));
      if (onLoginSuccess) onLoginSuccess(usuario);
      return;
    }

    if (
      email === "cliente@storelamansion.com" &&
      password === "Cliente123"
    ) {
      const usuario = {
        nombre: "Cliente",
        email: email,
        rol: "Cliente"
      };
      localStorage.setItem("usuario", JSON.stringify(usuario));
      if (onLoginSuccess) onLoginSuccess(usuario);
      return;
    }

    setError("Correo o contraseña incorrectos");
  };

  const fillDemoCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  return (
    <div className="auth-page" style={{ backgroundImage: `url(${authBg})` }}>
      <div className="auth-overlay" />

      <button className="auth__back-btn" onClick={onBackToHome}>
        <ArrowLeft size={18} />
        Volver al inicio
      </button>

      <div className="auth-container">
        <div className="auth-card">

          <div className="auth__brand">
            <h1 className="auth__logo">LA MANSI<span className="auth__logo-accent">ÓN</span></h1>
            <span className="auth__subtitle">STORE</span>
          </div>

          <div className="auth__header">
            <div className="auth__icon-wrapper">
              <Lock size={20} className="auth__gold-icon" />
            </div>
            <h2>Bienvenido de vuelta</h2>
            <p>Inicia sesión en tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="auth__form">

            <div className="auth-field">
              <label>USUARIO O CORREO</label>
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

            <div className="auth-field">
              <label>CONTRASEÑA</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="auth-row-between">
              <label className="auth-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="auth-checkmark" />
                Recordarme
              </label>
              <button type="button" onClick={onNavigateForgot} className="auth-link">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="submit" className="auth-submit-btn">
              Iniciar sesión <ArrowRight size={18} />
            </button>

            <div className="auth-footer-text">
              <span>¿No tienes cuenta? </span>
              <button type="button" onClick={onNavigateRegister} className="auth-link">
                Crear cuenta
              </button>
            </div>
          </form>

          <div className="auth-demo">
            <span className="auth-demo-title">CREDENCIALES DE DEMO</span>
            <div
              className="auth-demo-item"
              onClick={() => fillDemoCredentials("admin@storelamansion.com", "Admin123")}
            >
              <strong>Administrador</strong>
              <span>admin@storelamansion.com · Admin123</span>
            </div>
            <div
              className="auth-demo-item"
              onClick={() => fillDemoCredentials("cliente@storelamansion.com", "Cliente123")}
            >
              <strong>Cliente</strong>
              <span>cliente@storelamansion.com · Cliente123</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
