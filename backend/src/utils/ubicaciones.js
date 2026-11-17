import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rutaCatalogo = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'divipola.json'
)

const catalogo = JSON.parse(readFileSync(rutaCatalogo, 'utf8'))

export const LARGO_MAX_NOMBRE = 100
export const LARGO_MAX_BARRIO = 100
export const LARGO_MAX_DIRECCION = 255
export const LARGO_MAX_TELEFONO = 10

export const NOMBRE_VALIDO = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/
export const BARRIO_VALIDO = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s'\-.]+$/
export const TELEFONO_VALIDO = /^[0-9]+$/

export const listarDepartamentos = () =>
  catalogo.departamentos.map(({ codigo, nombre }) => ({ codigo, nombre }))

export const municipiosDe = (nombreDepartamento) => {
  const departamento = catalogo.departamentos.find(
    (d) => d.nombre === String(nombreDepartamento || '').trim()
  )
  return departamento ? departamento.municipios : []
}

export const validarNombreCompleto = (valor) => {
  const nombre = String(valor || '').trim()

  if (!nombre) {
    return 'El nombre es obligatorio.'
  }
  if (nombre.length > LARGO_MAX_NOMBRE) {
    return `El nombre no puede superar los ${LARGO_MAX_NOMBRE} caracteres.`
  }
  if (!NOMBRE_VALIDO.test(nombre)) {
    return 'El nombre solo puede contener letras, espacios, apóstrofes y guiones.'
  }

  return ''
}

export const validarTelefonoEntrega = (valor) => {
  const telefono = String(valor || '').trim()

  if (!telefono) {
    return 'El teléfono es obligatorio.'
  }
  if (!TELEFONO_VALIDO.test(telefono) || telefono.length > LARGO_MAX_TELEFONO) {
    return 'El teléfono solo puede contener dígitos (máx. 10).'
  }

  return ''
}

export const validarBarrio = (valor) => {
  const barrio = String(valor || '').trim()

  if (!barrio) {
    return 'El barrio es obligatorio.'
  }
  if (barrio.length > LARGO_MAX_BARRIO) {
    return `El barrio no puede superar los ${LARGO_MAX_BARRIO} caracteres.`
  }
  if (!BARRIO_VALIDO.test(barrio)) {
    return 'El barrio solo puede contener letras, espacios, apóstrofes, puntos y guiones.'
  }

  return ''
}

export const validarDireccion = (valor) => {
  const direccion = String(valor || '').trim()

  if (!direccion) {
    return 'La dirección de entrega es obligatoria.'
  }
  if (direccion.length > LARGO_MAX_DIRECCION) {
    return `La dirección no puede superar los ${LARGO_MAX_DIRECCION} caracteres.`
  }

  return ''
}

export const validarDepartamento = (departamento) => {
  const nombre = String(departamento || '').trim()

  if (!nombre) {
    return 'El departamento es obligatorio.'
  }

  const existe = catalogo.departamentos.some((d) => d.nombre === nombre)

  if (!existe) {
    return 'El departamento seleccionado no es válido.'
  }

  return ''
}

export const validarMunicipio = (departamento, municipio) => {
  const nombreDepartamento = String(departamento || '').trim()
  const nombreMunicipio = String(municipio || '').trim()

  if (!nombreMunicipio) {
    return 'La ciudad o municipio es obligatoria.'
  }

  const datosDepartamento = catalogo.departamentos.find(
    (d) => d.nombre === nombreDepartamento
  )

  if (!datosDepartamento) {
    return 'La ciudad o municipio no pertenece al departamento seleccionado.'
  }

  const municipioValido = datosDepartamento.municipios.some(
    (m) => m.nombre === nombreMunicipio
  )

  if (!municipioValido) {
    return 'La ciudad o municipio no pertenece al departamento seleccionado.'
  }

  return ''
}
