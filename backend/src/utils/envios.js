import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const directorioDatos = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'data'
)

const leerJson = (nombre) =>
  JSON.parse(readFileSync(path.join(directorioDatos, nombre), 'utf8'))

const catalogo = leerJson('divipola.json')
const configuracion = leerJson('zonas-envio.json')

const CODIGOS_VALLE_ABURRA = new Set(
  (configuracion.valleAburra || []).map((codigo) => String(codigo))
)

export const METODOS_ENVIO = ['Domicilio', 'Recoger en tienda', 'Transportadora']

export const esValleAburra = (codigoMunicipio) =>
  CODIGOS_VALLE_ABURRA.has(String(codigoMunicipio || '').trim())

const buscarDepartamento = (codigoDepartamento) =>
  catalogo.departamentos.find(
    (departamento) => departamento.codigo === String(codigoDepartamento || '').trim()
  )

export const metodosEnvioPermitidos = (codigoMunicipio) =>
  esValleAburra(codigoMunicipio)
    ? ['Domicilio', 'Recoger en tienda']
    : ['Transportadora']

// Valida la pareja departamento/municipio SOLO por código DANE y devuelve
// los nombres oficiales que se persisten en domicilio.
export const validarUbicacionCodigos = (codigoDepartamento, codigoMunicipio) => {
  const departamento = buscarDepartamento(codigoDepartamento)

  if (!departamento) {
    return {
      error: 'El departamento seleccionado no es válido.',
      campo: 'departamento_codigo',
    }
  }

  const codigoBuscado = String(codigoMunicipio || '').trim()
  const municipio = departamento.municipios.find(
    (item) => item.codigo === codigoBuscado
  )

  if (!municipio) {
    return {
      error: 'La ciudad o municipio no pertenece al departamento seleccionado.',
      campo: 'municipio_codigo',
    }
  }

  return {
    departamento: departamento.nombre,
    municipio: municipio.nombre,
    codigoMunicipio: municipio.codigo,
  }
}

// El costo siempre lo decide el backend a partir de zonas-envio.json.
// `pendiente` permite no mostrar $0 como si fuera una tarifa real.
export const calcularCostoEnvio = (metodoEnvio) => {
  if (metodoEnvio === 'Recoger en tienda') {
    return { costo: 0, pendiente: false }
  }

  const clave = metodoEnvio === 'Transportadora' ? 'transportadora' : 'domicilio'
  const tarifa = configuracion.tarifas?.[clave] || {}

  if (tarifa.modo === 'gratis') {
    return { costo: 0, pendiente: false }
  }

  const valor = Number(tarifa.valor)

  if (tarifa.modo === 'fijo' && Number.isFinite(valor) && valor >= 0) {
    return { costo: valor, pendiente: false }
  }

  return { costo: 0, pendiente: true }
}
