import {
  UserRound,
  Moon,
  LogOut,
  Pencil
} from "lucide-react";

import "./Perfil.css";

export default function Perfil({
  user,
  onLogout,
  onToggleTheme
}) {

  const nombre =
    user?.nombre || "Carlos Rodríguez";

  const correo =
    user?.email || "admin@storelamansion.com";

  const rol =
    user?.rol || "Administrador";

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
            {nombre}
          </h2>


          <p className="perfil-email">
            {correo}
          </p>


          <p className="perfil-role">
            {rol}
          </p>


          {/* EDITAR PERFIL */}

          <button
            type="button"
            className="perfil-edit-button"
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
                USR-001
              </div>

            </div>


            {/* NOMBRE */}

            <div className="perfil-field">

              <label>
                NOMBRE COMPLETO
              </label>

              <div className="perfil-input">
                {nombre}
              </div>

            </div>


            {/* CORREO */}

            <div className="perfil-field">

              <label>
                CORREO ELECTRÓNICO
              </label>

              <div className="perfil-input">
                {correo}
              </div>

            </div>


            {/* TELÉFONO */}

            <div className="perfil-field">

              <label>
                TELÉFONO
              </label>

              <div className="perfil-input">
                +57 310 555 0001
              </div>

            </div>


            {/* ROL */}

            <div className="perfil-field">

              <label>
                ROL
              </label>

              <div className="perfil-input">
                {rol}
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
                Cra 15 #93-47, Bogotá
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}