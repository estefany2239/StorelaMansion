import { useState } from 'react';
import { User, Mail, Lock, ArrowLeft, Shield, ArrowRight } from 'lucide-react';
import './Login.css';

const authBg = new URL("../../assets/img/img.png", import.meta.url).href;

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
              <Shield size={20} className="auth__gold-icon" />
            </div>
            <h2>Crear Cuenta</h2>
            <p>Únete a Store La Mansión</p>
          </div>

          <form className="auth__form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>NOMBRE COMPLETO</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
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

            <div className="auth-field">
              <label>CORREO ELECTRÓNICO</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
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

            <div className="auth-field">
              <label>CONTRASEÑA</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
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

            <div className="auth-field">
              <label>CONFIRMAR CONTRASEÑA</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
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

            <button type="submit" className="auth-submit-btn">
              Registrarse <ArrowRight size={18} />
            </button>

            <div className="auth-footer-text">
              <span>¿Ya tienes una cuenta? </span>
              <button type="button" onClick={onBackToLogin} className="auth-link">
                Inicia sesión
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
