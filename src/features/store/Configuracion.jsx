import React, { useState } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  KeyRound,
  MapPin,
  Plus,
  Trash2,
  Star,
  Bell,
  Moon,
  Sun,
  LogOut,
  UserX,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

import "./Configuracion.css";

export default function Configuracion({
  user,
  theme,
  onToggleTheme,
  onLogout,
  onBack,
  perfilCliente,
  setPerfilCliente,
  direccionesCliente,
  setDireccionesCliente,
  preferenciasCliente,
  setPreferenciasCliente
}) {
  const [formPerfil, setFormPerfil] = useState({
    nombre: perfilCliente?.nombre || "",
    email: perfilCliente?.email || "",
    telefono: perfilCliente?.telefono || ""
  });

  const [passwordForm, setPasswordForm] = useState({
    actual: "",
    nueva: "",
    confirmar: ""
  });
  const [mostrarContrasenas, setMostrarContrasenas] = useState(false);
  const [errorPassword, setErrorPassword] = useState("");

  const [mensajeExito, setMensajeExito] = useState("");
  const [errorDireccion, setErrorDireccion] = useState("");

  const [mostrarFormDireccion, setMostrarFormDireccion] = useState(false);
  const [nuevaDireccion, setNuevaDireccion] = useState({
    etiqueta: "Casa",
    direccion: ""
  });

  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const mostrarToast = (mensaje) => {
    setMensajeExito(mensaje);
    window.setTimeout(() => setMensajeExito(""), 3200);
  };

  const guardarPerfil = () => {
    setPerfilCliente({
      ...perfilCliente,
      nombre: formPerfil.nombre.trim(),
      email: formPerfil.email.trim(),
      telefono: formPerfil.telefono.trim()
    });
    mostrarToast("Tus datos personales se guardaron correctamente.");
  };

  const guardarPassword = () => {
    if (passwordForm.nueva.length < 6) {
      setErrorPassword(
        "La nueva contraseña debe tener al menos 6 caracteres."
      );
      return;
    }
    if (passwordForm.nueva !== passwordForm.confirmar) {
      setErrorPassword("Las contraseñas no coinciden.");
      return;
    }
    setErrorPassword("");
    setPasswordForm({ actual: "", nueva: "", confirmar: "" });
    mostrarToast("Contraseña actualizada correctamente.");
  };

  const agregarDireccion = () => {
    if (!nuevaDireccion.direccion.trim()) {
      setErrorDireccion("Escribe la dirección completa.");
      return;
    }
    const tienePredeterminada = direccionesCliente.some(
      (direccion) => direccion.predeterminada
    );
    setDireccionesCliente([
      ...direccionesCliente,
      {
        id: `DIR-${Date.now()}`,
        etiqueta: nuevaDireccion.etiqueta,
        direccion: nuevaDireccion.direccion.trim(),
        predeterminada: !tienePredeterminada
      }
    ]);
    setNuevaDireccion({ etiqueta: "Casa", direccion: "" });
    setErrorDireccion("");
    setMostrarFormDireccion(false);
    mostrarToast("Dirección agregada correctamente.");
  };

  const marcarPredeterminada = (id) => {
    setDireccionesCliente((actuales) =>
      actuales.map((direccion) => ({
        ...direccion,
        predeterminada: direccion.id === id
      }))
    );
  };

  const eliminarDireccion = (id) => {
    setDireccionesCliente((actuales) => {
      const restantes = actuales.filter((direccion) => direccion.id !== id);
      if (
        restantes.length > 0 &&
        !restantes.some((direccion) => direccion.predeterminada)
      ) {
        restantes[0] = { ...restantes[0], predeterminada: true };
      }
      return restantes;
    });
  };

  const togglePreferencia = (clave) => {
    setPreferenciasCliente((actuales) => ({
      ...actuales,
      [clave]: !actuales[clave]
    }));
  };

  return (
    <section className="configuracion-section">
      <div className="configuracion-wrap">

        <div className="configuracion-topbar">
          <button className="cfg-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> Volver al inicio
          </button>
        </div>

        <div className="configuracion-header">
          <span className="cfg-kicker">Tu cuenta</span>
          <h2 className="cfg-title">Configuración</h2>
          <p className="cfg-subtitle">
            Administra tu información, tus direcciones y las preferencias
            de tu cuenta.
          </p>
        </div>

        <div className="cfg-layout">

          {/* ============ 1. DATOS PERSONALES ============ */}
          <div className="cfg-card">
            <div className="cfg-card-head">
              <User size={18} />
              <h3>Datos personales</h3>
            </div>

            <div className="cfg-field-grid">
              <div className="cfg-form-group">
                <label className="cfg-label">NOMBRE</label>
                <input
                  type="text"
                  className="cfg-input"
                  value={formPerfil.nombre}
                  onChange={(e) =>
                    setFormPerfil({ ...formPerfil, nombre: e.target.value })
                  }
                />
              </div>

              <div className="cfg-form-group">
                <label className="cfg-label">CORREO</label>
                <input
                  type="email"
                  className="cfg-input"
                  value={formPerfil.email}
                  onChange={(e) =>
                    setFormPerfil({ ...formPerfil, email: e.target.value })
                  }
                />
              </div>

              <div className="cfg-form-group">
                <label className="cfg-label">TELÉFONO</label>
                <input
                  type="tel"
                  className="cfg-input"
                  placeholder="Ej. 300 123 4567"
                  value={formPerfil.telefono}
                  onChange={(e) =>
                    setFormPerfil({ ...formPerfil, telefono: e.target.value })
                  }
                />
              </div>
            </div>

            <button
              type="button"
              className="cfg-btn cfg-btn-primary"
              onClick={guardarPerfil}
            >
              Guardar cambios
            </button>
          </div>

          {/* ============ 2. CAMBIAR CONTRASEÑA ============ */}
          <div className="cfg-card">
            <div className="cfg-card-head">
              <KeyRound size={18} />
              <h3>Cambiar contraseña</h3>
            </div>

            <div className="cfg-form-group">
              <label className="cfg-label">CONTRASEÑA ACTUAL</label>
              <div className="cfg-password-wrap">
                <input
                  type={mostrarContrasenas ? "text" : "password"}
                  className="cfg-input"
                  value={passwordForm.actual}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, actual: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="cfg-eye-btn"
                  onClick={() => setMostrarContrasenas((v) => !v)}
                  tabIndex="-1"
                  aria-label="Mostrar u ocultar contraseñas"
                >
                  {mostrarContrasenas ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="cfg-field-grid">
              <div className="cfg-form-group">
                <label className="cfg-label">NUEVA CONTRASEÑA</label>
                <input
                  type={mostrarContrasenas ? "text" : "password"}
                  className="cfg-input"
                  value={passwordForm.nueva}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, nueva: e.target.value })
                  }
                />
              </div>

              <div className="cfg-form-group">
                <label className="cfg-label">CONFIRMAR NUEVA CONTRASEÑA</label>
                <input
                  type={mostrarContrasenas ? "text" : "password"}
                  className="cfg-input"
                  value={passwordForm.confirmar}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmar: e.target.value
                    })
                  }
                />
              </div>
            </div>

            {errorPassword && (
              <p className="cfg-error">{errorPassword}</p>
            )}

            <button
              type="button"
              className="cfg-btn cfg-btn-primary"
              onClick={guardarPassword}
            >
              Actualizar contraseña
            </button>
          </div>

          {/* ============ 3. DIRECCIONES GUARDADAS ============ */}
          <div className="cfg-card">
            <div className="cfg-card-head">
              <MapPin size={18} />
              <h3>Direcciones guardadas</h3>
            </div>

            {direccionesCliente.length > 0 ? (
              <div className="cfg-direcciones">
                {direccionesCliente.map((direccion) => (
                  <div
                    className={`cfg-direccion ${direccion.predeterminada ? "predeterminada" : ""}`}
                    key={direccion.id}
                  >
                    <div className="cfg-direccion-info">
                      <div className="cfg-direccion-etiqueta">
                        <strong>{direccion.etiqueta}</strong>
                        {direccion.predeterminada && (
                          <span className="cfg-badge-default">
                            <Star size={11} /> Predeterminada
                          </span>
                        )}
                      </div>
                      <p>{direccion.direccion}</p>
                    </div>

                    <div className="cfg-direccion-actions">
                      {!direccion.predeterminada && (
                        <button
                          type="button"
                          className="cfg-addr-btn"
                          title="Marcar como predeterminada"
                          onClick={() => marcarPredeterminada(direccion.id)}
                        >
                          <Star size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="cfg-addr-btn danger"
                        title="Eliminar dirección"
                        onClick={() => eliminarDireccion(direccion.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cfg-empty">
                <MapPin size={30} />
                <p>Aún no tienes direcciones guardadas.</p>
                <span>Agrega tu primera dirección para agilizar tus envíos.</span>
              </div>
            )}

            {mostrarFormDireccion ? (
              <div className="cfg-direccion-form">
                <div className="cfg-field-grid">
                  <div className="cfg-form-group">
                    <label className="cfg-label">ETIQUETA</label>
                    <select
                      className="cfg-input"
                      value={nuevaDireccion.etiqueta}
                      onChange={(e) =>
                        setNuevaDireccion({
                          ...nuevaDireccion,
                          etiqueta: e.target.value
                        })
                      }
                    >
                      <option value="Casa">Casa</option>
                      <option value="Trabajo">Trabajo</option>
                      <option value="Apartamento">Apartamento</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div className="cfg-form-group">
                    <label className="cfg-label">DIRECCIÓN</label>
                    <input
                      type="text"
                      className="cfg-input"
                      placeholder="Ej. Calle 45 # 20-10, Copacabana"
                      value={nuevaDireccion.direccion}
                      onChange={(e) =>
                        setNuevaDireccion({
                          ...nuevaDireccion,
                          direccion: e.target.value
                        })
                      }
                    />
                  </div>
                </div>

                {errorDireccion && (
                  <p className="cfg-error">{errorDireccion}</p>
                )}

                <div className="cfg-form-buttons">
                  <button
                    type="button"
                    className="cfg-btn cfg-btn-outline"
                    onClick={() => {
                      setMostrarFormDireccion(false);
                      setErrorDireccion("");
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="cfg-btn cfg-btn-primary"
                    onClick={agregarDireccion}
                  >
                    Guardar dirección
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="cfg-btn cfg-btn-outline cfg-add-address"
                onClick={() => setMostrarFormDireccion(true)}
              >
                <Plus size={16} /> Agregar nueva dirección
              </button>
            )}
          </div>

          {/* ============ 4. PREFERENCIAS ============ */}
          <div className="cfg-card">
            <div className="cfg-card-head">
              <Bell size={18} />
              <h3>Preferencias</h3>
            </div>

            <div className="cfg-preferencias">
              <div className="cfg-pref-row">
                <div>
                  <span className="cfg-pref-title">Tema de la tienda</span>
                  <span className="cfg-pref-desc">
                    {theme === "dark"
                      ? "Modo oscuro activo"
                      : "Modo claro activo"}
                  </span>
                </div>
                <button
                  type="button"
                  className={`cfg-switch ${theme === "dark" ? "on" : ""}`}
                  onClick={onToggleTheme}
                  aria-label="Cambiar tema claro u oscuro"
                >
                  <span className="cfg-switch-knob" />
                </button>
              </div>

              <div className="cfg-pref-row">
                <div>
                  <span className="cfg-pref-title">
                    Recibir notificaciones por correo
                  </span>
                  <span className="cfg-pref-desc">
                    Novedades, promociones y estado de tus pedidos
                  </span>
                </div>
                <button
                  type="button"
                  className={`cfg-switch ${preferenciasCliente.notificacionesEmail ? "on" : ""}`}
                  onClick={() => togglePreferencia("notificacionesEmail")}
                  aria-label="Notificaciones por correo"
                >
                  <span className="cfg-switch-knob" />
                </button>
              </div>

              <div className="cfg-pref-row">
                <div>
                  <span className="cfg-pref-title">
                    Recibir notificaciones por SMS
                  </span>
                  <span className="cfg-pref-desc">
                    Avisos de envío a tu teléfono
                  </span>
                </div>
                <button
                  type="button"
                  className={`cfg-switch ${preferenciasCliente.notificacionesSMS ? "on" : ""}`}
                  onClick={() => togglePreferencia("notificacionesSMS")}
                  aria-label="Notificaciones por SMS"
                >
                  <span className="cfg-switch-knob" />
                </button>
              </div>
            </div>
          </div>

          {/* ============ 5. ZONA DE CUENTA ============ */}
          <div className="cfg-card cfg-account-card">
            <div className="cfg-card-head">
              <UserX size={18} />
              <h3>Zona de cuenta</h3>
            </div>

            <div className="cfg-account-actions">
              <button
                type="button"
                className="cfg-btn cfg-btn-outline"
                onClick={onLogout}
              >
                <LogOut size={16} /> Cerrar sesión
              </button>

              <button
                type="button"
                className="cfg-btn cfg-btn-danger-outline"
                onClick={() => setConfirmarEliminar(true)}
              >
                <UserX size={16} /> Eliminar mi cuenta
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ============ TOAST DE CONFIRMACIÓN ============ */}
      {mensajeExito && (
        <div className="cfg-toast">
          <CheckCircle size={17} />
          {mensajeExito}
        </div>
      )}

      {/* ============ MODAL ELIMINAR CUENTA ============ */}
      {confirmarEliminar && (
        <div
          className="cfg-modal-overlay"
          onClick={() => setConfirmarEliminar(false)}
        >
          <div
            className="cfg-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="cfg-modal-icon">
              <AlertTriangle size={26} />
            </div>
            <h3>¿Eliminar tu cuenta?</h3>
            <p>
              Esta acción cerrará tu sesión. (Función de eliminación completa
              pendiente de conexión con el sistema)
            </p>
            <div className="cfg-modal-actions">
              <button
                type="button"
                className="cfg-btn cfg-btn-outline"
                onClick={() => setConfirmarEliminar(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="cfg-btn cfg-btn-danger"
                onClick={() => {
                  setConfirmarEliminar(false);
                  onLogout();
                }}
              >
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}