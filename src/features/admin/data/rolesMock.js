/* =====================================================
   ROLES MOCK (NIVEL 3 - Rol / Módulo / Privilegios)
   ===================================================== */

const MODULOS_BASE = [
  "Dashboard",
  "Roles",
  "Usuarios",
  "Productos",
  "Categorías",
  "Tallas",
  "Colores",
  "Ventas",
  "Clientes",
  "Pedidos",
  "Domicilios",
];

const PRIVILEGIOS_TODOS = ["Crear", "Consultar", "Actualizar", "Eliminar"];

export const ROLES_MOCK = [
  {
    id: "ROL-001",
    nombre: "Administrador",
    permisos: MODULOS_BASE.map((modulo) => ({
      modulo,
      privilegios: [...PRIVILEGIOS_TODOS],
    })),
    usuarios: 1,
    estado: "Activo",
  },
  {
    id: "ROL-002",
    nombre: "Vendedor",
    permisos: [
      { modulo: "Dashboard", privilegios: ["Consultar"] },
      { modulo: "Productos", privilegios: ["Consultar"] },
      { modulo: "Ventas", privilegios: ["Crear", "Consultar", "Actualizar"] },
      { modulo: "Clientes", privilegios: ["Consultar", "Actualizar"] },
      { modulo: "Pedidos", privilegios: ["Crear", "Consultar", "Actualizar"] },
      { modulo: "Domicilios", privilegios: ["Consultar", "Actualizar"] },
    ],
    usuarios: 2,
    estado: "Activo",
  },
  {
    id: "ROL-003",
    nombre: "Cliente",
    permisos: [],
    usuarios: 12,
    estado: "Activo",
  },
];

export default ROLES_MOCK;