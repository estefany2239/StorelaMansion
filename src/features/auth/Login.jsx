import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail
} from "lucide-react";

import "./Login.css";

export default function Login({
  onBackToHome,
  onNavigateRegister,
  onNavigateForgot,
  onLoginSuccess
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");

    // ADMINISTRADOR
    if (
      email === "admin@storelamansion.com" &&
      password === "Admin123"
    ) {
      const usuario = {
        nombre: "Administrador",
        email: email,
        rol: "Administrador"
      };

      localStorage.setItem(
        "usuario",
        JSON.stringify(usuario)
      );

      if (onLoginSuccess) {
        onLoginSuccess(usuario);
      }

      return;
    }

    // CLIENTE
    if (
      email === "cliente@storelamansion.com" &&
      password === "Cliente123"
    ) {
      const usuario = {
        nombre: "Cliente",
        email: email,
        rol: "Cliente"
      };

      localStorage.setItem(
        "usuario",
        JSON.stringify(usuario)
      );

      if (onLoginSuccess) {
        onLoginSuccess(usuario);
      }

      return;
    }

    setError("Correo o contraseña incorrectos");
  };

  const fillDemoCredentials = (
    demoEmail,
    demoPass
  ) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  return (
    <div className="login-page">

      <button
        className="login__back-btn"
        onClick={onBackToHome}
      >
        <ArrowLeft size={18} />
        Volver
      </button>

      <div className="login-container">

        <div className="login-card">

          <div className="login__header">

            <div className="login__icon-wrapper">
              <Lock
                size={20}
                className="login__gold-icon"
              />
            </div>

            <h2>Store La Mansión</h2>

            <p>
              Inicia sesión en tu cuenta
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="login__form"
          >

            {/* CORREO */}

            <div className="form-group">

              <label>
                CORREO ELECTRÓNICO
              </label>

              <div className="input-with-icon">

                <Mail
                  size={16}
                  className="input-icon"
                />

                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />

              </div>

            </div>

            {/* CONTRASEÑA */}

            <div className="form-group">

              <label>
                CONTRASEÑA
              </label>

              <div className="input-with-icon">

                <Lock
                  size={16}
                  className="input-icon"
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>

              </div>

            </div>

            {/* ERROR */}

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {/* RECUPERAR */}

            <div className="form-options">

              <button
                type="button"
                onClick={onNavigateForgot}
                className="forgot-link"
              >
                ¿Olvidaste tu contraseña?
              </button>

            </div>

            {/* BOTÓN */}

            <button
              type="submit"
              className="login__submit-btn"
            >
              Iniciar sesión
            </button>

            {/* REGISTRO */}

            <div className="register-redirect">

              <span>
                ¿No tienes cuenta?{" "}
              </span>

              <button
                type="button"
                onClick={onNavigateRegister}
                className="forgot-link"
              >
                Crear cuenta
              </button>

            </div>

          </form>

          {/* DEMO */}

          <div className="demo-credentials">

            <span className="demo-title">
              CREDENCIALES DE DEMO
            </span>

            <div
              className="demo-item"
              onClick={() =>
                fillDemoCredentials(
                  "admin@storelamansion.com",
                  "Admin123"
                )
              }
            >
              <strong>
                Administrador
              </strong>

              <span>
                admin@storelamansion.com · Admin123
              </span>

            </div>

            <div
              className="demo-item"
              onClick={() =>
                fillDemoCredentials(
                  "cliente@storelamansion.com",
                  "Cliente123"
                )
              }
            >
              <strong>
                Cliente
              </strong>

              <span>
                cliente@storelamansion.com · Cliente123
              </span>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}