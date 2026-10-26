import { useState, useRef } from 'react';
import { User, Mail, Lock, ArrowLeft, Shield, ArrowRight, IdCard, Calendar, Phone } from 'lucide-react';
import { registrarUsuario } from '../../../shared/services/api';
import TurnstileWidget from '../../../shared/components/TurnstileWidget';
import { useNotify } from '../../../shared/components/notifications/useNotify.js';
import useValidacionFormulario from '../../../shared/hooks/useValidacionFormulario';
// Reglas, cálculo de edad y mapeo de `campo` del backend viven en un
// módulo plano para que el formulario y las pruebas usen el mismo código.
import {
  REGLAS as REGLAS_REGISTER,
  CAMPOS_BACKEND,
  maxFechaNacimiento
} from '../../../shared/utils/validacionesRegistro';
import './Login.css';

const authBg = new URL("../../../assets/img/img.png", import.meta.url).href;

const MENSAJE_DEMASIADOS_INTENTOS =
  'Demasiados intentos, intenta de nuevo en unos minutos.';

export default function Register({ onBackToLogin }) {
  const notify = useNotify();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telefono: '',
    tipoDocumento: '',
    documento: '',
    fechaNacimiento: '',
    password: '',
    confirmPassword: '',
    website: ''
  });

  // Instante en que se abrió el formulario. El backend exige que medien al
  // menos unos segundos entre aquí y el envío: una petición hecha a mano
  // contra la API no lo lleva (o lo lleva inventado) y se descarta.
  const [tsFormulario] = useState(() => Date.now());

  // Token de Turnstile: el botón de enviar no se habilita sin él, y cada
  // intento fallido lo gasta, así que el widget se vuelve a pintar.
  const [tokenTurnstile, setTokenTurnstile] = useState('');
  const [reiniciarCaptcha, setReiniciarCaptcha] = useState(0);

  // Evita que un doble clic (o un doble Enter) envíe dos registros.
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  const {
    errores,
    manejarBlur,
    revisarCampo,
    validarTodo,
    setErrores,
  } = useValidacionFormulario(REGLAS_REGISTER);

  const handleChange = (e) => {
    const siguiente = { ...formData, [e.target.name]: e.target.value };
    setFormData(siguiente);

    // Si el campo ya fue tocado, su error se recalcula al instante.
    revisarCampo(e.target.name, e.target.value, siguiente);

    // Tipo y número de documento son un par: al cambiar uno se revisa
    // también el otro para que su error no quede desactualizado. Lo mismo
    // con contraseña y su confirmación.
    if (e.target.name === 'documento') {
      revisarCampo('tipoDocumento', siguiente.tipoDocumento, siguiente);
    } else if (e.target.name === 'tipoDocumento') {
      revisarCampo('documento', siguiente.documento, siguiente);
    } else if (e.target.name === 'password') {
      revisarCampo('confirmPassword', siguiente.confirmPassword, siguiente);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Si ya hay una petición en curso, se ignora el segundo envío.
    if (enviandoRef.current) return;

    // Valida todos los campos (documento, fecha/edad, teléfono, correo,
    // contraseñas) y enfoca el primer inválido.
    if (!validarTodo(formData)) return;

    enviandoRef.current = true;
    setEnviando(true);

    try {
      await registrarUsuario(
        formData.name.trim(),
        formData.email.trim(),
        formData.password,
        {
          telefono: formData.telefono.trim(),
          tipoDocumento: formData.tipoDocumento,
          documento: formData.documento.trim(),
          fechaNacimiento: formData.fechaNacimiento,
          website: formData.website,
          ts: tsFormulario,
          turnstileToken: tokenTurnstile
        }
      );

      notify(
        "¡Cuenta creada correctamente! Si no ves el correo de bienvenida, revisa tu carpeta de spam.",
        "success"
      );
      onBackToLogin();
    } catch (error) {
      // Cualquier envío fallido gasta el token: se limpia aquí y se pide
      // uno nuevo al widget (que se vuelve a pintar al cambiar `reiniciar`).
      setTokenTurnstile('');
      setReiniciarCaptcha((n) => n + 1);

      // Límite de peticiones del servidor: aviso claro en vez de un error
      // genérico o un mensaje sólo en la consola.
      if (error.status === 429) {
        notify(error.message || MENSAJE_DEMASIADOS_INTENTOS, 'error');
        return;
      }

      const campo = CAMPOS_BACKEND[error.campo];

      // El backend identificó el campo exacto (duplicados incluidos):
      // el mensaje se muestra bajo ese input, sin revelar datos de
      // otras cuentas.
      if (campo) {
        setErrores((actuales) => ({ ...actuales, [campo]: error.message }));
        window.setTimeout(() => {
          const elemento = document.getElementById(`campo-${campo}`);

          if (elemento) {
            elemento.scrollIntoView({
              block: "center",
              behavior: "smooth"
            });
            elemento.focus({ preventScroll: true });
          }
        }, 60);
        return;
      }

      notify(error.message, "error");
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
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

          <form className="auth__form" onSubmit={handleSubmit} noValidate>
            {/* Campo trampa: invisible para las personas, presente para los
                rellenadores automáticos. Si llega con texto, el servidor
                descarta el registro sin avisar (respuesta idéntica a la de un
                registro bien hecho). */}
            <input
              type="text"
              name="website"
              id="campo-website"
              value={formData.website}
              onChange={handleChange}
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
              className="auth__trampa"
            />

            <section className="auth-section">
              <h3 className="auth-section__title">Datos personales</h3>

              <div className="auth-field">
                <label htmlFor="campo-tipoDocumento">Tipo de documento</label>
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
                    <option value="">Selecciona una opción</option>
                    <option value="CC">CC — Cédula de ciudadanía</option>
                    <option value="CE">CE — Cédula de extranjería</option>
                    <option value="NIT">NIT</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                </div>
                {errores.tipoDocumento && (
                  <div className="auth-field__error">{errores.tipoDocumento}</div>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="campo-documento">Número de documento</label>
                <div className="auth-input-wrap">
                  <IdCard size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    name="documento"
                    id="campo-documento"
                    placeholder="Ej. 1234567890"
                    maxLength={15}
                    value={formData.documento}
                    onChange={handleChange}
                    onBlur={() =>
                      manejarBlur('documento', formData.documento, formData)
                    }
                  />
                </div>
                {errores.documento && (
                  <div className="auth-field__error">{errores.documento}</div>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="campo-name">Nombres completos</label>
                <div className="auth-input-wrap">
                  <User size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    name="name"
                    id="campo-name"
                    placeholder="Tu nombre completo"
                    maxLength={100}
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() =>
                      manejarBlur('name', formData.name, formData)
                    }
                  />
                </div>
                {errores.name && (
                  <div className="auth-field__error">{errores.name}</div>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="campo-fechaNacimiento">Fecha de nacimiento</label>
                <div className="auth-input-wrap">
                  <Calendar size={16} className="auth-input-icon" />
                  <input
                    type="date"
                    name="fechaNacimiento"
                    id="campo-fechaNacimiento"
                    max={maxFechaNacimiento}
                    value={formData.fechaNacimiento}
                    onChange={handleChange}
                    onBlur={() =>
                      manejarBlur('fechaNacimiento', formData.fechaNacimiento, formData)
                    }
                  />
                </div>
                {errores.fechaNacimiento && (
                  <div className="auth-field__error">{errores.fechaNacimiento}</div>
                )}
              </div>
            </section>

            <section className="auth-section">
              <h3 className="auth-section__title">Contacto</h3>

              <div className="auth-field">
                <label htmlFor="campo-telefono">Teléfono</label>
                <div className="auth-input-wrap">
                  <Phone size={16} className="auth-input-icon" />
                  <input
                    type="tel"
                    name="telefono"
                    id="campo-telefono"
                    placeholder="Ej. 3001234567"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.telefono}
                    onChange={handleChange}
                    onBlur={() =>
                      manejarBlur('telefono', formData.telefono, formData)
                    }
                  />
                </div>
                {errores.telefono && (
                  <div className="auth-field__error">{errores.telefono}</div>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="campo-email">Correo electrónico</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    name="email"
                    id="campo-email"
                    placeholder="tu@correo.com"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() =>
                      manejarBlur('email', formData.email, formData)
                    }
                  />
                </div>
                {errores.email && (
                  <div className="auth-field__error">{errores.email}</div>
                )}
              </div>
            </section>

            <section className="auth-section">
              <h3 className="auth-section__title">Seguridad</h3>

              <div className="auth-field">
                <label htmlFor="campo-password">Contraseña</label>
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
                  />
                </div>
                {errores.password && (
                  <div className="auth-field__error">{errores.password}</div>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="campo-confirmPassword">Confirmar contraseña</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    name="confirmPassword"
                    id="campo-confirmPassword"
                    placeholder="Repite tu contraseña"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={() =>
                      manejarBlur('confirmPassword', formData.confirmPassword, formData)
                    }
                  />
                </div>
                {errores.confirmPassword && (
                  <div className="auth-field__error">{errores.confirmPassword}</div>
                )}
              </div>
            </section>

            <TurnstileWidget
              accion="registro"
              onChange={setTokenTurnstile}
              reiniciar={reiniciarCaptcha}
            />

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={!tokenTurnstile || enviando}
            >
              {enviando ? 'Registrando…' : 'Registrarse'} <ArrowRight size={18} />
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
