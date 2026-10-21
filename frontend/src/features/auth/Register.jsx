import { useState } from 'react';
import { User, Mail, Lock, ArrowLeft, Shield, ArrowRight, IdCard, Calendar } from 'lucide-react';
import { registrarUsuario } from '../../services/api';
import { useNotify } from '../../components/notifications/useNotify.js';
import useValidacionFormulario from '../../hooks/useValidacionFormulario';
import './Login.css';

const authBg = new URL("../../assets/img/img.png", import.meta.url).href;

export default function Register({ onBackToLogin }) {
  const notify = useNotify();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tipoDocumento: '',
    documento: '',
    fechaNacimiento: '',
    password: '',
    confirmPassword: ''
  });

  // Reglas alineadas con el backend (auth.js + utils/documentos.js):
  // contraseña mínimo 8; tipo y número de documento van juntos (ambos
  // vacíos o ambos con valor); la fecha de nacimiento es opcional pero,
  // si llega, no puede ser futura ni anterior a 1900.
  const REGLAS_REGISTER = {
    tipoDocumento: (valor, form) => {
      const tipo = String(valor || '').trim();
      const documento = String(form.documento || '').trim();

      if (!tipo && documento) {
        return 'Si indicas el número de documento, también debes elegir el tipo.';
      }

      return '';
    },
    documento: (valor, form) => {
      const tipo = String(form.tipoDocumento || '').trim();
      const documento = String(valor || '').trim();

      if (tipo && !documento) {
        return 'Si eliges el tipo de documento, también debes indicar el número.';
      }

      if (!tipo && documento) {
        return 'Si indicas el número de documento, también debes elegir el tipo.';
      }

      if (!documento) {
        return '';
      }

      if (tipo === 'CC') {
        return /^\d{6,10}$/.test(documento)
          ? ''
          : 'El documento CC debe tener entre 6 y 10 dígitos.';
      }

      if (tipo === 'NIT') {
        return /^[0-9-]{5,15}$/.test(documento) && /\d/.test(documento)
          ? ''
          : 'El documento NIT debe tener entre 5 y 15 caracteres (dígitos y guion).';
      }

      return /^[A-Za-z0-9]{5,15}$/.test(documento)
        ? ''
        : `El documento ${tipo} debe tener entre 5 y 15 letras o números.`;
    },
    fechaNacimiento: (valor) => {
      const fecha = String(valor || '').trim();

      if (!fecha) {
        return '';
      }

      const fechaDate = new Date(`${fecha}T00:00:00`);

      if (Number.isNaN(fechaDate.getTime())) {
        return 'La fecha de nacimiento no es válida.';
      }

      if (fechaDate.getTime() > Date.now()) {
        return 'La fecha de nacimiento no puede ser futura.';
      }

      if (fechaDate.getFullYear() < 1900) {
        return 'La fecha de nacimiento no puede ser anterior a 1900.';
      }

      return '';
    },
    password: (valor) =>
      String(valor || '').length >= 8
        ? ''
        : 'La contraseña debe tener al menos 8 caracteres.',
  };

  const {
    errores,
    manejarBlur,
    revisarCampo,
    validarTodo,
  } = useValidacionFormulario(REGLAS_REGISTER);

  const handleChange = (e) => {
    const siguiente = { ...formData, [e.target.name]: e.target.value };
    setFormData(siguiente);

    // Si el campo ya fue tocado, su error se recalcula al instante.
    revisarCampo(e.target.name, e.target.value, siguiente);

    // Tipo y número de documento son un par: al cambiar uno se revisa
    // también el otro para que su error no quede desactualizado.
    if (e.target.name === 'documento') {
      revisarCampo('tipoDocumento', siguiente.tipoDocumento, siguiente);
    } else if (e.target.name === 'tipoDocumento') {
      revisarCampo('documento', siguiente.documento, siguiente);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Valida todo (documento, fecha y longitud de contraseña) y enfoca
    // el campo inválido.
    if (!validarTodo(formData)) return;

    if (formData.password !== formData.confirmPassword) {
      notify("Las contraseñas no coinciden", "error");
      return;
    }

    try {
      await registrarUsuario(
        formData.name.trim(),
        formData.email.trim(),
        formData.password,
        {
          tipoDocumento: formData.tipoDocumento,
          documento: formData.documento.trim(),
          fechaNacimiento: formData.fechaNacimiento
        }
      );

      notify("¡Cuenta creada correctamente!", "success");
      onBackToLogin();
    } catch (error) {
      notify(error.message, "error");
    }
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
              <label>TIPO DE DOCUMENTO (OPCIONAL)</label>
              <div className="auth-input-wrap">
                <IdCard size={16} className="auth-input-icon" />
                <select
                  name="tipoDocumento"
                  id="campo-tipoDocumento"
                  value={formData.tipoDocumento}
                  onChange={handleChange}
                  onBlur={() =>
                    manejarBlur('tipoDocumento', formData.tipoDocumento, formData)
                  }
                >
                  <option value="">Sin documento</option>
                  <option value="CC">CC — Cédula de ciudadanía</option>
                  <option value="CE">CE — Cédula de extranjería</option>
                  <option value="NIT">NIT</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              {errores.tipoDocumento && (
                <div className="auth-error">{errores.tipoDocumento}</div>
              )}
            </div>

            <div className="auth-field">
              <label>NÚMERO DE DOCUMENTO (OPCIONAL)</label>
              <div className="auth-input-wrap">
                <IdCard size={16} className="auth-input-icon" />
                <input
                  type="text"
                  name="documento"
                  id="campo-documento"
                  placeholder="Solo si eliges un tipo de documento"
                  maxLength={15}
                  value={formData.documento}
                  onChange={handleChange}
                  onBlur={() =>
                    manejarBlur('documento', formData.documento, formData)
                  }
                />
              </div>
              {errores.documento && (
                <div className="auth-error">{errores.documento}</div>
              )}
            </div>

            <div className="auth-field">
              <label>FECHA DE NACIMIENTO (OPCIONAL)</label>
              <div className="auth-input-wrap">
                <Calendar size={16} className="auth-input-icon" />
                <input
                  type="date"
                  name="fechaNacimiento"
                  id="campo-fechaNacimiento"
                  value={formData.fechaNacimiento}
                  onChange={handleChange}
                  onBlur={() =>
                    manejarBlur('fechaNacimiento', formData.fechaNacimiento, formData)
                  }
                />
              </div>
              {errores.fechaNacimiento && (
                <div className="auth-error">{errores.fechaNacimiento}</div>
              )}
            </div>

            <div className="auth-field">
              <label>CONTRASEÑA</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  name="password"
                  id="campo-password"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => manejarBlur('password', formData.password, formData)}
                  required
                />
              </div>
              {errores.password && (
                <div className="auth-error">{errores.password}</div>
              )}
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
