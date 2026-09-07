import { useState } from 'react';
import { User, Mail, Lock, ArrowLeft, Shield } from 'lucide-react';
import './Login.css';

export default function Register({ onBackToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }
    alert("¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
    onBackToLogin();
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
              <Shield size={20} className="login__gold-icon" />
            </div>
            <h2>Crear Cuenta</h2>
            <p>Únete a Store La Mansión</p>
          </div>

          <form className="login__form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>NOMBRE COMPLETO</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="Tu nombre completo"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>CORREO ELECTRÓNICO</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="tu@correo.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>CONTRASEÑA</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  name="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>CONFIRMAR CONTRASEÑA</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Repite tu contraseña"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login__submit-btn">
              Registrarse
            </button>

            <div className="register-redirect">
              <span>¿Ya tienes una cuenta? </span>
              <button 
                type="button" 
                onClick={onBackToLogin}
                className="forgot-link"
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "inline" }}
              >
                Inicia sesión
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}