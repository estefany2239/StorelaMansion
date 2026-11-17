// Validaciones del registro público ("Crear Cuenta").
// Módulo plano (sin JSX ni CSS) para que el formulario y las pruebas
// usen exactamente las mismas funciones, sin duplicarlas.
//
// Reglas alineadas con el backend (src/routes/auth.js y
// src/utils/documentos.js): en el registro público todos los campos son
// obligatorios, el documento se valida por su tipo, el teléfono es de
// dígitos (máx. 10), el correo tiene formato, la fecha debe ser real y
// mayor de 18 años, y la contraseña (mínimo 8) debe coincidir con su
// confirmación.

export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mismas reglas que el perfil (Configuracion.jsx) y el backend: letras
// (con tildes y ñ), espacios, apóstrofes y guiones; sin números.
export const NOMBRE_COMPLETO_VALIDO = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/;

// El backend devuelve `campo` en snake_case; aquí se traduce al nombre
// del input para mostrar el mensaje bajo el elemento correcto.
export const CAMPOS_BACKEND = {
  nombre: 'name',
  correo: 'email',
  contrasena: 'password',
  telefono: 'telefono',
  tipo_documento: 'tipoDocumento',
  documento: 'documento',
  fecha_nacimiento: 'fechaNacimiento'
};

// Ayuda visual del input date (atributo max): la fecha más tardía que
// cumple 18 años hoy. La validación real vive en REGLAS y en el
// backend, nunca solo en este atributo.
export const maxFechaNacimiento = (() => {
  const hoy = new Date();
  const cumple18 = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
  const anio = cumple18.getFullYear();
  const mes = String(cumple18.getMonth() + 1).padStart(2, '0');
  const dia = String(cumple18.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
})();

// Edad cumplida a partir de 'YYYY-MM-DD'. Año, mes y día se leen con
// split (sin construir la fecha desde la cadena) para que la zona horaria
// no desplace el día; una fecha inexistente (31 de febrero) devuelve
// null. Única función de cálculo del frontend (el backend tiene la suya
// en src/utils/documentos.js).
export function calcularEdad(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const nacimiento = new Date(anio, mes - 1, dia);

  if (
    Number.isNaN(nacimiento.getTime()) ||
    nacimiento.getFullYear() !== anio ||
    nacimiento.getMonth() + 1 !== mes ||
    nacimiento.getDate() !== dia
  ) {
    return null;
  }

  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;
  const mesHoy = hoy.getMonth() + 1;
  if (mesHoy < mes || (mesHoy === mes && hoy.getDate() < dia)) {
    edad -= 1;
  }

  return edad;
}

// reglas: { campo: (valor, formulario) => mensaje | "" }.
// El orden de las claves define el orden de validación y de foco.
export const REGLAS = {
  tipoDocumento: (valor) =>
    String(valor || '').trim()
      ? ''
      : 'Debes elegir el tipo de documento.',
  documento: (valor, form) => {
    const tipo = String(form.tipoDocumento || '').trim();
    const documento = String(valor || '').trim();

    if (!documento) {
      return 'El número de documento es obligatorio.';
    }

    if (!tipo) {
      return 'Si indicas el número de documento, también debes elegir el tipo.';
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
  name: (valor) =>
    String(valor || '').trim()
      ? ''
      : 'Este campo es obligatorio.',
  fechaNacimiento: (valor) => {
    const fecha = String(valor || '').trim();

    if (!fecha) {
      return 'La fecha de nacimiento es obligatoria.';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return 'La fecha de nacimiento no es válida.';
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaDate = new Date(anio, mes - 1, dia);

    // Round-trip de año/mes/día: detecta fechas inexistentes
    // (31 de febrero) sin depender de la zona horaria.
    if (
      Number.isNaN(fechaDate.getTime()) ||
      fechaDate.getFullYear() !== anio ||
      fechaDate.getMonth() + 1 !== mes ||
      fechaDate.getDate() !== dia
    ) {
      return 'La fecha de nacimiento no es válida.';
    }

    if (fechaDate.getTime() > Date.now()) {
      return 'La fecha de nacimiento no puede ser futura.';
    }

    if (anio < 1900) {
      return 'La fecha de nacimiento no puede ser anterior a 1900.';
    }

    const edad = calcularEdad(fecha);

    if (edad === null || edad > 120) {
      return 'La fecha de nacimiento no es válida.';
    }

    if (edad < 18) {
      return 'Debes ser mayor de 18 años para crear una cuenta.';
    }

    return '';
  },
  telefono: (valor) => {
    const telefono = String(valor || '').trim();

    if (!telefono) {
      return 'El teléfono es obligatorio.';
    }

    if (!/^[0-9]+$/.test(telefono) || telefono.length > 10) {
      return 'El teléfono solo puede contener dígitos (máx. 10).';
    }

    return '';
  },
  email: (valor) => {
    const correo = String(valor || '').trim();

    if (!correo) {
      return 'Este campo es obligatorio.';
    }

    if (!CORREO_VALIDO.test(correo)) {
      return 'El correo no es válido.';
    }

    return '';
  },
  password: (valor) =>
    String(valor || '').length >= 8
      ? ''
      : 'La contraseña debe tener al menos 8 caracteres.',
  confirmPassword: (valor, form) => {
    const confirmacion = String(valor || '');

    if (!confirmacion) {
      return 'Confirma tu contraseña.';
    }

    if (confirmacion !== String(form.password || '')) {
      return 'Las contraseñas no coinciden.';
    }

    return '';
  }
};

export default REGLAS;
