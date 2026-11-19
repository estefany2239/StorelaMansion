/* =====================================================
   UTILITARIO DE PERMISOS (NIVEL 3)
   Los permisos llegan del backend como "Módulo:Privilegio"
   (ej. "Ventas:Consultar") dentro de user.permisos.
   ===================================================== */

export const tienePermiso = (user, modulo, privilegio) => {
  const permisos = Array.isArray(user?.permisos) ? user.permisos : [];
  return permisos.includes(`${modulo}:${privilegio}`);
};

export default {
  tienePermiso,
};
