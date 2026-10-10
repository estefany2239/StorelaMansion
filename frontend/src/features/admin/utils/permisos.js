/* =====================================================
   UTILITARIO DE PERMISOS (NIVEL 3)
   Rol / Módulo / Privilegio (Crear, Consultar, Actualizar, Eliminar)
   ===================================================== */

export const tienePrivilegio = (
  usuarioRol,
  rolesDisponibles = [],
  modulo,
  privilegio
) => {
  if (!usuarioRol) return false;

  const rol = rolesDisponibles.find(
    (r) => r && r.nombre === usuarioRol
  );

  if (!rol) return false;

  const permisos = Array.isArray(rol.permisos)
    ? rol.permisos
    : [];

  const permisoModulo = permisos.find(
    (p) => p && p.modulo === modulo
  );

  if (!permisoModulo) return false;

  const privilegios = Array.isArray(permisoModulo.privilegios)
    ? permisoModulo.privilegios
    : [];

  return privilegios.includes(privilegio);
};

export default {
  tienePrivilegio,
};
