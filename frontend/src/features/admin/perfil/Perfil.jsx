import { useState, useRef } from "react";

import {
  UserRound,
  Moon,
  LogOut,
  Pencil,
  X,
  Camera,
  ShieldCheck,
  Info,
  Star,
  Mail,
  Phone,
  CircleDot,
  CalendarDays,
  MapPin
} from "lucide-react";

import ConfirmDialog from "../shared/ConfirmDialog";
import { actualizarFotoPerfil } from "../../../shared/services/api";

import "./Perfil.css";

export default function Perfil({
  user,
  onLogout,
  onToggleTheme,
  foto,
  onFotoActualizada
}) {

  const [perfil, setPerfil] = useState({
    id: "USR-001",
    nombre:
      user?.nombre || "Carlos Rodríguez",
    correo:
      user?.email || "admin@storelamansion.com",
    telefono: "+57 310 555 0001",
    direccion: "Cra 15 #93-47, Bogotá",
    rol:
      user?.rol || "Administrador",
  });

  const [modalAbierto, setModalAbierto] =
    useState(false);

  const [form, setForm] = useState(perfil);

  const [errores, setErrores] = useState({});

  const [confirmarEdicion, setConfirmarEdicion] =
    useState(false);

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoError, setFotoError] = useState("");
  const inputFotoRef = useRef(null);

  const manejarCambioFoto = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setFotoError("");

    if (!archivo.type.startsWith("image/")) {
      setFotoError("Selecciona un archivo de imagen válido.");
      setTimeout(() => setFotoError(""), 4000);
      e.target.value = "";
      return;
    }

    if (archivo.size > 10 * 1024 * 1024) {
      setFotoError("La imagen no puede superar 10 MB.");
      setTimeout(() => setFotoError(""), 4000);
      e.target.value = "";
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const dataUrlOriginal = String(lector.result || "");
      const img = new Image();
      img.onload = async () => {
        const max = 512;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > max) {
            height = Math.round((height * max) / width);
            width = max;
          }
        } else {
          if (height > max) {
            width = Math.round((width * max) / height);
            height = max;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        if (onFotoActualizada) onFotoActualizada(dataUrl);

        setSubiendoFoto(true);
        try {
          await actualizarFotoPerfil(dataUrl);
        } catch (error) {
          console.error(error);
          setFotoError(
            "No se pudo guardar la foto en el servidor. Se verá solo hasta que recargues."
          );
          setTimeout(() => setFotoError(""), 4000);
        } finally {
          setSubiendoFoto(false);
          e.target.value = "";
        }
      };
      img.onerror = () => {
        setFotoError("No se pudo leer la imagen.");
        setTimeout(() => setFotoError(""), 4000);
        e.target.value = "";
      };
      img.src = dataUrlOriginal;
    };
    lector.onerror = () => {
      setFotoError("No se pudo leer el archivo.");
      setTimeout(() => setFotoError(""), 4000);
      e.target.value = "";
    };
    lector.readAsDataURL(archivo);
  };

  /* =====================================================
     ABRIR MODAL EDITAR
     ===================================================== */

  const abrirEditar = () => {
    setForm({ ...perfil });
    setErrores({});
    setModalAbierto(true);
  };

  /* =====================================================
     CERRAR MODAL
     ===================================================== */

  const cerrarModal = () => {
    setModalAbierto(false);
  };

  /* =====================================================
     MANEJAR CAMPOS
     ===================================================== */

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    const valorFiltrado =
      name === "nombre"
        ? value.replace(
            /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
            ""
          )
        : name === "telefono"
          ? value.replace(/[^0-9]/g, "")
          : value;

    setForm((prev) => ({
      ...prev,
      [name]: valorFiltrado,
    }));

    if (String(valorFiltrado).trim()) {
      setErrores((prev) => {
        if (!prev[name]) return prev;

        const nuevos = { ...prev };
        delete nuevos[name];
        return nuevos;
      });
    }
  };

  /* =====================================================
     GUARDAR PERFIL
     ===================================================== */

  const guardarPerfil = (e) => {
    e.preventDefault();

    const nuevosErrores = {};

    if (!form.nombre.trim()) {
      nuevosErrores.nombre = "Este campo es obligatorio.";
    }

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) return;

    setConfirmarEdicion(true);
  };

  const confirmarEdicionPerfil = () => {
    setPerfil({ ...form });
    setConfirmarEdicion(false);
    cerrarModal();
  };

  return (
    <div className="perfil-page">

      <header className="perfil-header">
        <div className="perfil-header-left">
          <UserRound size={44} strokeWidth={1.5} className="perfil-header-icon" />
          <div className="perfil-header-text">
            <h1>Mi Perfil</h1>
            <p>Información de tu cuenta</p>
          </div>
        </div>

        <div className="perfil-header-line" />

        <div className="perfil-role-pill">
          <ShieldCheck size={14} strokeWidth={2} />
          {perfil.rol}
        </div>
      </header>

      <div className="perfil-content">

        <div className="perfil-user-card">

          <div className="perfil-avatar">
            {foto ? (
              <img
                src={foto}
                alt="Foto de perfil"
                className="perfil-avatar-img"
              />
            ) : (
              <UserRound size={52} strokeWidth={1.5} />
            )}
            <button
              type="button"
              className="perfil-avatar-edit"
              onClick={() => inputFotoRef.current?.click()}
              disabled={subiendoFoto}
              aria-label="Cambiar foto"
            >
              <Pencil size={14} strokeWidth={2} />
            </button>
          </div>

          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={manejarCambioFoto}
          />

          <button
            type="button"
            className="perfil-foto-button"
            onClick={() => inputFotoRef.current?.click()}
            disabled={subiendoFoto}
          >
            <Camera size={16} strokeWidth={2} />
            {subiendoFoto ? "Subiendo..." : "Cambiar foto"}
          </button>
          {fotoError && (
            <span className="perfil-foto-error">{fotoError}</span>
          )}

          <h2>{perfil.nombre}</h2>

          <p className="perfil-email">{perfil.correo}</p>

          <div className="perfil-role-pill perfil-role-pill--inline">
            <ShieldCheck size={14} strokeWidth={2} />
            {perfil.rol}
          </div>

          <div className="perfil-divider" />

          <button
            type="button"
            className="perfil-edit-button"
            onClick={abrirEditar}
          >
            <Pencil size={17} strokeWidth={2} />
            Actualizar perfil
          </button>

          <button
            type="button"
            className="perfil-secondary-button"
            onClick={onToggleTheme}
          >
            <Moon size={18} strokeWidth={2} />
            Modo oscuro
          </button>

          <button
            type="button"
            className="perfil-secondary-button"
            onClick={onLogout}
          >
            <LogOut size={18} strokeWidth={2} />
            Cerrar sesión
          </button>

        </div>

        <div className="perfil-account-card">

          <div className="perfil-account-header">
            <div className="perfil-account-icon">
              <Info size={18} strokeWidth={2} />
            </div>
            <h2>Información de cuenta</h2>
          </div>

          <div className="perfil-line" />

          <div className="perfil-form-grid">

            <div className="perfil-field">
              <div className="perfil-field-icon">
                <UserRound size={22} strokeWidth={1.5} />
              </div>
              <div className="perfil-field-body">
                <label>ID USUARIO</label>
                <div className="perfil-input perfil-input-bold">{perfil.id}</div>
              </div>
            </div>

            <div className="perfil-field">
              <div className="perfil-field-icon">
                <Star size={22} strokeWidth={1.5} />
              </div>
              <div className="perfil-field-body">
                <label>NOMBRE COMPLETO</label>
                <div className="perfil-input">{perfil.nombre}</div>
              </div>
            </div>

            <div className="perfil-field">
              <div className="perfil-field-icon">
                <Mail size={22} strokeWidth={1.5} />
              </div>
              <div className="perfil-field-body">
                <label>CORREO ELECTRÓNICO</label>
                <div className="perfil-input">{perfil.correo}</div>
              </div>
            </div>

            <div className="perfil-field">
              <div className="perfil-field-icon">
                <Phone size={22} strokeWidth={1.5} />
              </div>
              <div className="perfil-field-body">
                <label>TELÉFONO</label>
                <div className="perfil-input">{perfil.telefono}</div>
              </div>
            </div>

            <div className="perfil-field">
              <div className="perfil-field-icon">
                <ShieldCheck size={22} strokeWidth={1.5} />
              </div>
              <div className="perfil-field-body">
                <label>ROL</label>
                <div className="perfil-input">{perfil.rol}</div>
              </div>
            </div>

            <div className="perfil-field">
              <div className="perfil-field-icon">
                <CircleDot size={22} strokeWidth={1.5} />
              </div>
              <div className="perfil-field-body">
                <label>ESTADO</label>
                <div className="perfil-input">
                  <span className="perfil-estado-pill">
                    <span className="perfil-estado-dot" />
                    Activo
                  </span>
                </div>
              </div>
            </div>

            <div className="perfil-field">
              <div className="perfil-field-icon">
                <CalendarDays size={22} strokeWidth={1.5} />
              </div>
              <div className="perfil-field-body">
                <label>FECHA DE REGISTRO</label>
                <div className="perfil-input">2024-01-15</div>
              </div>
            </div>

            <div className="perfil-field perfil-field-full">
              <div className="perfil-field-icon">
                <MapPin size={22} strokeWidth={1.5} />
              </div>
              <div className="perfil-field-body">
                <label>DIRECCIÓN</label>
                <div className="perfil-input">{perfil.direccion}</div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {modalAbierto && (
        <div
          className="rol-modal-overlay"
          onClick={cerrarModal}
        >
          <div
            className="rol-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="rol-modal-header">
              <h3>
                Actualizar perfil
              </h3>
              <button
                type="button"
                className="rol-modal-close"
                onClick={cerrarModal}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarPerfil}>
              <div className="rol-modal-body">
                <div className="rol-form-row">
                  <div className="rol-form-group">
                    <label>
                      NOMBRE COMPLETO
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      placeholder="Tu nombre completo"
                      value={form.nombre}
                      onChange={manejarCambio}
                      className={`input ${errores.nombre ? "input-error" : ""}`}
                      required
                    />
                    {errores.nombre && (
                      <span className="error-text">
                        {errores.nombre}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rol-form-row">
                  <div className="rol-form-group">
                    <label>
                      CORREO ELECTRÓNICO
                    </label>
                    <input
                      type="email"
                      name="correo"
                      placeholder="tu@correo.com"
                      value={form.correo}
                      onChange={manejarCambio}
                      required
                    />
                  </div>

                  <div className="rol-form-group">
                    <label>
                      TELÉFONO
                    </label>
                    <input
                      type="text"
                      name="telefono"
                      placeholder="+57 300 000 0000"
                      value={form.telefono}
                      onChange={manejarCambio}
                      required
                    />
                  </div>
                </div>

                <div className="rol-form-group">
                  <label>
                    DIRECCIÓN
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    placeholder="Tu dirección"
                    value={form.direccion}
                    onChange={manejarCambio}
                    required
                  />
                </div>
              </div>

              <div className="rol-modal-footer">
                <button
                  type="button"
                  className="rol-cancel-button"
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rol-create-button"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        abierto={confirmarEdicion}
        titulo="Confirmar cambios"
        mensaje={
          <>¿Deseas guardar los cambios realizados en tu perfil "
            <strong>{form.nombre.trim()}</strong>"?</>
        }
        textoConfirmar="Guardar cambios"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEdicionPerfil}
        onCancelar={() => setConfirmarEdicion(false)}
      />

    </div>
  );
}