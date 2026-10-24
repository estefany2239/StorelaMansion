// Identificación del cliente: tipo de documento, número y fecha de
// nacimiento. Compartida por /api/clientes y /api/auth/register para que
// ambos endpoints validen exactamente lo mismo.
//
// Reglas:
// - Tipo y número van juntos: si hay uno, debe haber el otro; ambos
//   pueden quedar vacíos (clientes antiguos).
// - CC: solo dígitos (6 a 10). NIT: dígitos y guion (5 a 15).
//   CE y Pasaporte: letras y números (5 a 15).
// - La fecha de nacimiento es opcional; si llega, no puede ser futura
//   ni anterior a 1900. En el registro público además es obligatoria y
//   debe cumplir la mayoría de edad (validarMayoriaEdad).
// Son datos personales: nunca se registran en consola.

export const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT', 'Pasaporte']

export const EDAD_MINIMA_REGISTRO = 18

export function validarFormatoDocumento(tipo, documento) {
  if (tipo === 'CC') {
    return /^\d{6,10}$/.test(documento)
      ? ''
      : 'El documento CC debe tener entre 6 y 10 dígitos.'
  }

  if (tipo === 'NIT') {
    return /^[0-9-]{5,15}$/.test(documento) && /\d/.test(documento)
      ? ''
      : 'El documento NIT debe tener entre 5 y 15 caracteres (dígitos y guion).'
  }

  // CE y Pasaporte
  return /^[A-Za-z0-9]{5,15}$/.test(documento)
    ? ''
    : `El documento ${tipo} debe tener entre 5 y 15 letras o números.`
}

export function validarFechaNacimiento(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return 'La fecha de nacimiento no es válida.'
  }

  const [anio, mes, dia] = fecha.split('-').map(Number)
  const fechaDate = new Date(`${fecha}T00:00:00`)

  if (
    Number.isNaN(fechaDate.getTime()) ||
    fechaDate.getFullYear() !== anio ||
    fechaDate.getMonth() + 1 !== mes ||
    fechaDate.getDate() !== dia
  ) {
    return 'La fecha de nacimiento no es válida.'
  }

  if (fechaDate.getTime() > Date.now()) {
    return 'La fecha de nacimiento no puede ser futura.'
  }

  if (anio < 1900) {
    return 'La fecha de nacimiento no puede ser anterior a 1900.'
  }

  return ''
}

// Edad cumplida a partir de una fecha 'YYYY-MM-DD'. Se leen año, mes y
// día con split (sin new Date desde cadena) para que la zona horaria no
// desplace el día; las fechas inexistentes (31 de febrero) devuelven
// null. Única función de cálculo del backend: se usa en el registro
// público para exigir la mayoría de edad.
export function calcularEdad(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null

  const [anio, mes, dia] = fecha.split('-').map(Number)
  const nacimiento = new Date(anio, mes - 1, dia)

  if (
    Number.isNaN(nacimiento.getTime()) ||
    nacimiento.getFullYear() !== anio ||
    nacimiento.getMonth() + 1 !== mes ||
    nacimiento.getDate() !== dia
  ) {
    return null
  }

  const hoy = new Date()
  let edad = hoy.getFullYear() - anio
  const mesHoy = hoy.getMonth() + 1
  if (mesHoy < mes || (mesHoy === mes && hoy.getDate() < dia)) {
    edad -= 1
  }

  return edad
}

// Devuelve '' si la fecha corresponde a alguien mayor o igual que la edad
// mínima; en caso contrario, el mensaje de error para el registro.
export function validarMayoriaEdad(fecha) {
  const edad = calcularEdad(fecha)

  if (edad === null || edad > 120) {
    return 'La fecha de nacimiento no es válida.'
  }
  if (edad < EDAD_MINIMA_REGISTRO) {
    return 'Debes ser mayor de 18 años para crear una cuenta.'
  }

  return ''
}

// Lee tipo_documento, documento y fecha_nacimiento del cuerpo de la
// petición. Devuelve los valores normalizados (null cuando están vacíos)
// y un objeto `errores` campo a campo, listo para fusionar con las
// validaciones propias de cada ruta.
export function leerIdentificacion(body = {}) {
  const errores = {}

  const tipoRaw = String(body.tipo_documento ?? '').trim()
  let tipo = null
  if (tipoRaw) {
    tipo =
      TIPOS_DOCUMENTO.find((t) => t.toLowerCase() === tipoRaw.toLowerCase()) ||
      null
    if (!tipo) {
      errores.tipo_documento = 'El tipo de documento no es válido.'
    }
  }

  const documento = String(body.documento ?? '').trim() || null

  if (!errores.tipo_documento) {
    if (tipo && !documento) {
      errores.documento =
        'Si eliges el tipo de documento, también debes indicar el número.'
    } else if (!tipo && documento) {
      errores.tipo_documento =
        'Si indicas el número de documento, también debes elegir el tipo.'
    } else if (tipo && documento) {
      const formato = validarFormatoDocumento(tipo, documento)
      if (formato) {
        errores.documento = formato
      }
    }
  }

  const fechaRaw = String(body.fecha_nacimiento ?? '').trim()
  let fechaNacimiento = null
  if (fechaRaw) {
    const fechaError = validarFechaNacimiento(fechaRaw)
    if (fechaError) {
      errores.fecha_nacimiento = fechaError
    } else {
      fechaNacimiento = fechaRaw
    }
  }

  return { tipo, documento, fechaNacimiento, errores }
}
