// Pruebas de la lógica pura del control de cantidad.
// Se ejecutan con: node tests/test-cantidad.mjs
//
// La regla central: pedir exactamente el stock es válido y no genera
// alerta; pedir más que el stock sí genera alerta y se recorta al máximo.

import {
  cantidadParaCarrito,
  esAgotado,
  excedeStock,
  hayStock,
  mensajeAgotado,
  mensajeStock,
  parsearCantidad,
  soloDigitos,
  topeDe,
} from '../src/shared/components/cart/cantidad.js'

let fallos = 0

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

const igual = (nombre, actual, esperado) => {
  comprobar(nombre, Object.is(actual, esperado), `actual=${String(actual)} esperado=${String(esperado)}`)
}

// Parseo del texto escrito a mano.
igual('soloDigitos descarta letras y signos', soloDigitos('12a.3,4e5'), '12345')
igual('parsearCantidad acepta enteros positivos', parsearCantidad('10'), 10)
igual('parsearCantidad rechaza vacío', parsearCantidad(''), null)
igual('parsearCantidad rechaza cero', parsearCantidad('0'), null)

// Stock informado y tope.
igual('hayStock acepta 0 como stock informado', hayStock(0), true)
igual('hayStock rechaza null', hayStock(null), false)
igual('hayStock rechaza undefined', hayStock(undefined), false)
igual('hayStock rechaza vacío', hayStock(''), false)
igual('hayStock rechaza texto no numérico', hayStock('abc'), false)
igual('topeDe respeta el stock', topeDe(10), 10)
igual('topeDe con stock 0 mantiene mínimo 1', topeDe(0), 1)
igual('topeDe sin dato no limita', topeDe(null), Infinity)
igual('esAgotado con stock 0', esAgotado(0), true)
igual('esAgotado con stock negativo', esAgotado(-1), true)
igual('esAgotado con stock disponible', esAgotado(10), false)
igual('esAgotado sin dato no bloquea', esAgotado(null), false)

// Regla de la alerta: solo cuando la cantidad supera el stock.
igual('cantidad igual al stock NO es exceso (10 de 10)', excedeStock(10, 10), false)
igual('cantidad menor al stock NO es exceso (9 de 10)', excedeStock(9, 10), false)
igual('cantidad mayor al stock SÍ es exceso (11 de 10)', excedeStock(11, 10), true)
igual('cantidad mucho mayor al stock SÍ es exceso (100 de 10)', excedeStock(100, 10), true)
igual('exceso acepta cantidades en texto', excedeStock('11', '10'), true)
igual('sin stock informado no se declara exceso', excedeStock(100, null), false)
igual('stock 0 se maneja como agotado, no como exceso', excedeStock(1, 0), false)

// Recorte final al carrito: entero positivo, nunca por encima del stock.
igual('10 de 10 se conserva', cantidadParaCarrito(10, 10), 10)
igual('11 de 10 se recorta a 10', cantidadParaCarrito(11, 10), 10)
igual('100 de 10 se recorta a 10', cantidadParaCarrito(100, 10), 10)
igual('0 se eleva a 1', cantidadParaCarrito(0, 10), 1)
igual('negativo se eleva a 1', cantidadParaCarrito(-5, 10), 1)
igual('texto numérico se respeta', cantidadParaCarrito('7', 10), 7)
igual('texto inválido se eleva a 1', cantidadParaCarrito('abc', 10), 1)
igual('sin stock informado no se recorta', cantidadParaCarrito(5, null), 5)
igual('stock 0 no permite más de 1', cantidadParaCarrito(5, 0), 1)

// Mensajes visibles.
comprobar('mensajeStock singular', mensajeStock(1).includes('1 unidad disponible'))
comprobar('mensajeStock plural', mensajeStock(10).includes('10 unidades disponibles'))
comprobar('mensajeAgotado describe el bloqueo', mensajeAgotado().includes('agotado'))

console.log(`\n=== RESULTADO CANTIDAD: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
process.exitCode = fallos === 0 ? 0 : 1
