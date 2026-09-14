import { useState } from "react";

import {
  UserRound,
  Moon,
  LogOut,
  Pencil,
  X
} from "lucide-react";

import "./Perfil.css";

export default function Perfil({
  user,
  onLogout,
  onToggleTheme
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

  /* =====================================================
     ABRIR MODAL EDITAR
     ===================================================== */

  const abrirEditar = () => {
    setForm({ ...perfil });
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

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =====================================================
     GUARDAR PERFIL
     ===================================================== */

  const guardarPerfil = (e) => {
    e.preventDefault();

    if (!form.nombre.trim()) {
      alert("El nombre no puede estar vacío.");
      return;
    }

    setPerfil({ ...form });
    cerrarModal();
  };

  return (
    <div className="perfil-page">

      {/* =====================================================
          ENCABEZADO
          ===================================================== */}

      <div className="perfil-header">

        <h1>
          Mi Perfil
        </h1>

        <p>
          Información de tu cuenta
        </p>

      </div>


      {/* =====================================================
          CONTENIDO
          ===================================================== */}

      <div className="perfil-content">


        {/* ===================================================
            TARJETA IZQUIERDA
            =================================================== */}

        <div className="perfil-user-card">

          <div className="perfil-avatar">

            <UserRound size={52} />

          </div>


          <h2>
            {perfil.nombre}
          </h2>


          <p className="perfil-email">
            {perfil.correo}
          </p>


          <p className="perfil-role">
            {perfil.rol}
          </p>


          {/* EDITAR PERFIL */}

          <button
            type="button"
            className="perfil-edit-button"
            onClick={abrirEditar}
          >

            <Pencil size={17} />

            Editar perfil

          </button>


          {/* MODO OSCURO */}

          <button
            type="button"
            className="perfil-secondary-button"
            onClick={onToggleTheme}
          >

            <Moon size={18} />

            Modo oscuro

          </button>


          {/* CERRAR SESIÓN */}

          <button
            type="button"
            className="perfil-secondary-button"
            onClick={onLogout}
          >

            <LogOut size={18} />

            Cerrar sesión

          </button>

        </div>


        {/* ===================================================
            INFORMACIÓN DE CUENTA
            =================================================== */}

        <div className="perfil-account-card">

          <div className="perfil-account-header">

            <h2>
              Información de cuenta
            </h2>

            <span>
              ADMINISTRADOR
            </span>

          </div>


          <div className="perfil-line"></div>


          <div className="perfil-form-grid">


            {/* ID USUARIO */}

            <div className="perfil-field">

              <label>
                ID USUARIO
              </label>

              <div className="perfil-input perfil-input-bold">
                {perfil.id}
              </div>

            </div>


            {/* NOMBRE */}

            <div className="perfil-field">

              <label>
                NOMBRE COMPLETO
              </label>

              <div className="perfil-input">
                {perfil.nombre}
              </div>

            </div>


            {/* CORREO */}

            <div className="perfil-field">

              <label>
                CORREO ELECTRÓNICO
              </label>

              <div className="perfil-input">
                {perfil.correo}
              </div>

            </div>


            {/* TELÉFONO */}

            <div className="perfil-field">

              <label>
                TELÉFONO
              </label>

              <div className="perfil-input">
                {perfil.telefono}
              </div>

            </div>


            {/* ROL */}

            <div className="perfil-field">

              <label>
                ROL
              </label>

              <div className="perfil-input">
                {perfil.rol}
              </div>

            </div>


            {/* ESTADO */}

            <div className="perfil-field">

              <label>
                ESTADO
              </label>

              <div className="perfil-input">
                Activo
              </div>

            </div>


            {/* FECHA */}

            <div className="perfil-field">

              <label>
                FECHA DE REGISTRO
              </label>

              <div className="perfil-input">
                2024-01-15
              </div>

            </div>


            {/* DIRECCIÓN */}

            <div className="perfil-field perfil-field-full">

              <label>
                DIRECCIÓN
              </label>

              <div className="perfil-input">
                {perfil.direccion}
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          MODAL EDITAR PERFIL
          ===================================================== */}

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
                Editar perfil
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
                      ID USUARIO
                    </label>

                    <input
                      type="text"
                      name="id"
                      value={form.id}
                      disabled
                    />

                  </div>

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
                      required
                    />

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

    </div>
  );
}