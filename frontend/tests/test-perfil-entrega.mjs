// Pruebas de la precarga del formulario de entrega desde el perfil.
// Se ejecutan con: node tests/test-perfil-entrega.mjs

import { readFileSync } from 'node:fs'

import {
  combinarDatosEntrega,
  normalizarTelefono,
  ubicacionDesdePerfil,
} from '../src/features/checkout/perfilEntrega.js'

const DIVIPOLA = JSON.parse(
  readFileSync(new URL('../src/shared/data/divipola.json', import.meta.url), 'utf8')
)
const DEPARTAMENTOS = DIVIPOLA.departamentos

let fallos = 0

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

const igual = (nombre, actual, esperado) => {
  comprobar(nombre, Object.is(actual, esperado), `actual=${String(actual)} esperado=${String(esperado)}`)
}

const VACIO = {
  nombre: '',
  telefono: '',
  departamentoCodigo: '',
  municipioCodigo: '',
  barrio: '',
  direccion: '',
}

const CUENTA_A = {
  id: 1,
  nombre: 'Ana Cliente',
  email: 'ana@test.com',
  telefono: '3001112233',
  departamento_codigo: '05',
  municipio_codigo: '05212',
  barrio: 'Centro',
  direccion: 'Calle 45 # 20-10',
}

const CUENTA_B = {
  id: 2,
  nombre: 'Beto Cliente',
  email: 'beto@test.com',
  telefono: '3104445566',
  departamento_codigo: '76',
  municipio_codigo: '76001',
  barrio: 'El Poblado',
  direccion: 'Carrera 43A # 6S-45',
}

// Una cuenta completa precarga nombre, teléfono, ubicación y dirección.
const a = combinarDatosEntrega(VACIO, CUENTA_A, DEPARTAMENTOS)
igual('cuenta A: nombre', a.nombre, 'Ana Cliente')
igual('cuenta A: teléfono', a.telefono, '3001112233')
igual('cuenta A: departamento', a.departamentoCodigo, '05')
igual('cuenta A: municipio', a.municipioCodigo, '05212')
igual('cuenta A: barrio', a.barrio, 'Centro')
igual('cuenta A: dirección', a.direccion, 'Calle 45 # 20-10')

// Otra cuenta distinta no mezcla datos.
const b = combinarDatosEntrega(VACIO, CUENTA_B, DEPARTAMENTOS)
igual('cuenta B: nombre', b.nombre, 'Beto Cliente')
igual('cuenta B: teléfono', b.telefono, '3104445566')
igual('cuenta B: departamento', b.departamentoCodigo, '76')
igual('cuenta B: municipio', b.municipioCodigo, '76001')
igual('cuenta B: barrio', b.barrio, 'El Poblado')
igual('cuenta B: dirección', b.direccion, 'Carrera 43A # 6S-45')

// Aplicar B sobre lo ya precargado de A no sobrescribe ni mezcla.
const trasB = combinarDatosEntrega(a, CUENTA_B, DEPARTAMENTOS)
comprobar('aplicar B sobre A conserva A', JSON.stringify(trasB) === JSON.stringify(a))

// Lo que el usuario ya escribió se respeta.
const escrito = {
  nombre: 'Nombre escrito',
  telefono: '3209998877',
  departamentoCodigo: '05',
  municipioCodigo: '05001',
  barrio: 'Barrio escrito',
  direccion: 'Dirección escrita',
}
const respetado = combinarDatosEntrega(escrito, CUENTA_A, DEPARTAMENTOS)
comprobar('datos escritos no se sobrescriben', JSON.stringify(respetado) === JSON.stringify(escrito))

// Si el usuario empezó a elegir ubicación, no se completa desde el perfil.
const ubicacionParcial = combinarDatosEntrega(
  { ...VACIO, departamentoCodigo: '76' },
  CUENTA_A,
  DEPARTAMENTOS
)
igual('ubicación parcial: departamento respetado', ubicacionParcial.departamentoCodigo, '76')
igual('ubicación parcial: municipio no se mezcla', ubicacionParcial.municipioCodigo, '')
igual('ubicación parcial: barrio no se mezcla', ubicacionParcial.barrio, '')

// El teléfono del perfil se limpia a dígitos (máx. 10).
igual('normalizarTeléfono quita separadores', normalizarTelefono('300 111 2233'), '3001112233')
igual('normalizarTeléfono recorta a 10', normalizarTelefono('30011122334455'), '3001112233')

// El perfil antiguo solo tiene dirección: no inventa ubicación.
const soloDireccion = combinarDatosEntrega(
  VACIO,
  {
    nombre: 'Cliente Antiguo',
    telefono: '3000000000',
    direccion: 'Calle 1 # 2-3',
  },
  DEPARTAMENTOS
)
igual('solo dirección: nombre', soloDireccion.nombre, 'Cliente Antiguo')
igual('solo dirección: dirección', soloDireccion.direccion, 'Calle 1 # 2-3')
igual('solo dirección: sin departamento', soloDireccion.departamentoCodigo, '')
igual('solo dirección: sin municipio', soloDireccion.municipioCodigo, '')
igual('solo dirección: sin barrio', soloDireccion.barrio, '')

// También acepta nombres oficiales además de códigos DANE.
const porNombre = ubicacionDesdePerfil(
  {
    departamento: 'Antioquia',
    municipio: 'Copacabana',
    barrio: 'Centro',
    direccion: 'Calle 45 # 20-10',
  },
  DEPARTAMENTOS
)
igual('nombre de departamento -> código', porNombre.departamentoCodigo, '05')
igual('nombre de municipio -> código', porNombre.municipioCodigo, '05212')

// Sin perfil no se precarga nada.
const sinPerfil = combinarDatosEntrega(VACIO, null, DEPARTAMENTOS)
comprobar('sin perfil no precarga nada', JSON.stringify(sinPerfil) === JSON.stringify(VACIO))

console.log(`\n=== RESULTADO PERFIL ENTREGA: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
process.exitCode = fallos === 0 ? 0 : 1
