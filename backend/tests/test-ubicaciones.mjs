// Pruebas unitarias de src/utils/ubicaciones.js (sin servidor ni BD):
// valida el catálogo DIVIPOLA versionado y las reglas de nombre, teléfono,
// barrio, dirección, departamento y municipio.
import {
  listarDepartamentos,
  municipiosDe,
  validarNombreCompleto,
  validarTelefonoEntrega,
  validarBarrio,
  validarDireccion,
  validarDepartamento,
  validarMunicipio,
} from '../src/utils/ubicaciones.js'

let fallos = 0
const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

// 1) Catálogo
const departamentos = listarDepartamentos()
comprobar('catálogo tiene 33 departamentos', departamentos.length === 33, `total=${departamentos.length}`)

const antioquia = departamentos.find((d) => d.nombre === 'ANTIOQUIA')
comprobar('ANTIOQUIA existe con código 05', antioquia?.codigo === '05', `codigo=${antioquia?.codigo}`)

const municipiosAntioquia = municipiosDe('ANTIOQUIA')
comprobar('ANTIOQUIA tiene 125 municipios', municipiosAntioquia.length === 125, `total=${municipiosAntioquia.length}`)
comprobar('MEDELLÍN pertenece a ANTIOQUIA (05001)', municipiosAntioquia.some((m) => m.nombre === 'MEDELLÍN' && m.codigo === '05001'))
comprobar('COPACABANA pertenece a ANTIOQUIA', municipiosAntioquia.some((m) => m.nombre === 'COPACABANA'))
comprobar('CALI no pertenece a ANTIOQUIA', !municipiosAntioquia.some((m) => m.nombre === 'CALI'))
comprobar('municipio inexistente no aparece', municipiosDe('ANTIOQUIA').every((m) => m.nombre !== 'POPAYÁN'))
comprobar('departamento desconocido devuelve lista vacía', municipiosDe('ATLANTIS').length === 0)

const bogota = departamentos.find((d) => d.codigo === '11')
comprobar('BOGOTÁ, D.C. existe (11)', bogota?.nombre === 'BOGOTÁ, D.C.')
comprobar('BOGOTÁ tiene su único municipio (11001)', municipiosDe('BOGOTÁ, D.C.').length === 1 && municipiosDe('BOGOTÁ, D.C.')[0].codigo === '11001')

// 2) Nombre
comprobar('nombre válido acepta tildes, ñ y apóstrofes', validarNombreCompleto("María José O'Connor") === '')
comprobar('nombre con números se rechaza', validarNombreCompleto('Juan123') !== '')
comprobar('nombre vacío se rechaza', validarNombreCompleto('   ') !== '')
comprobar('nombre de más de 100 caracteres se rechaza', validarNombreCompleto('a'.repeat(101)) !== '')

// 3) Teléfono
comprobar('teléfono de 10 dígitos acepta', validarTelefonoEntrega('3001112233') === '')
comprobar('teléfono con letras se rechaza', validarTelefonoEntrega('tres-cero-cero') !== '')
comprobar('teléfono vacío se rechaza', validarTelefonoEntrega('') !== '')
comprobar('teléfono de 11 dígitos se rechaza', validarTelefonoEntrega('30011122334') !== '')

// 4) Barrio
comprobar('barrio válido acepta', validarBarrio('La América') === '')
comprobar('barrio con números acepta', validarBarrio('San José 2') === '')
comprobar('barrio vacío se rechaza', validarBarrio('  ') !== '')
comprobar('barrio con símbolos se rechaza', validarBarrio('Barrio #1!') !== '')

// 5) Dirección
comprobar('dirección válida acepta', validarDireccion('Carrera 43A # 6S-45') === '')
comprobar('dirección vacía se rechaza', validarDireccion('') !== '')
comprobar('dirección de 256 caracteres se rechaza', validarDireccion('a'.repeat(256)) !== '')

// 6) Departamento y municipio
comprobar('ANTIOQUIA es un departamento válido', validarDepartamento('ANTIOQUIA') === '')
comprobar('departamento vacío se rechaza', validarDepartamento('') !== '')
comprobar('departamento inexistente se rechaza', validarDepartamento('ATLANTIS') !== '')
comprobar('municipio válido en su departamento acepta', validarMunicipio('ANTIOQUIA', 'MEDELLÍN') === '')
comprobar('municipio vacío se rechaza', validarMunicipio('ANTIOQUIA', '') !== '')
comprobar('municipio ajeno al departamento se rechaza', validarMunicipio('ANTIOQUIA', 'CALI') !== '')
comprobar('municipio con departamento inválido se rechaza', validarMunicipio('ATLANTIS', 'MEDELLÍN') !== '')

console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
process.exitCode = fallos === 0 ? 0 : 1
