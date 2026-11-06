// Prueba de la columna ESTADO del módulo Roles, renderizando Roles.jsx en un
// DOM real (jsdom) con la API simulada: no toca la base de datos ni la red.
//
// Comprobaciones:
//   1) Las tres filas (Administrador, Cliente, Vendedor) usan el mismo
//      interruptor con la etiqueta ACTIVO debajo
//   2) Administrador y Cliente salen bloqueados: input disabled, aviso
//      "Rol del sistema: no se puede desactivar" en title y aria-label, y el
//      clic no cambia nada
//   3) Vendedor enciende y apaga su interruptor (Activo -> Inactivo -> Activo)
//
// Requiere jsdom, que no es dependencia del proyecto:
//   npm install --no-save jsdom
// y se ejecuta con: node tests/test-roles-render.mjs

import { JSDOM } from 'jsdom'

const MENSAJE = 'Rol del sistema: no se puede desactivar'

const ROLES = [
  { id: 1, nombre: 'Administrador', estado: 'Activo', usuarios: 3, permisos: ['Roles:Consultar'] },
  { id: 2, nombre: 'Cliente', estado: 'Activo', usuarios: 12, permisos: ['Roles:Consultar'] },
  { id: 3, nombre: 'Vendedor', estado: 'Activo', usuarios: 1, permisos: ['Roles:Consultar'] },
]

const USUARIO = {
  permisos: [
    'Roles:Consultar',
    'Roles:Cambiar estado',
    'Roles:Actualizar',
    'Roles:Eliminar',
  ],
}

// El stub de API registra cada llamada de cambio de estado.
globalThis.__cambiosEstado = []

let fallos = 0

const comprobar = (nombre, condicion, detalle = '') => {
  console.log(`${condicion ? 'OK   ' : 'FALLO'} - ${nombre}${detalle ? ' :: ' + detalle : ''}`)
  if (!condicion) fallos += 1
}

const principal = async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="raiz"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  })

  const definir = (nombre, valor) =>
    Object.defineProperty(globalThis, nombre, { value: valor, configurable: true, writable: true })

  definir('window', dom.window)
  definir('document', dom.window.document)
  definir('navigator', dom.window.navigator)
  definir('HTMLElement', dom.window.HTMLElement)
  definir('Element', dom.window.Element)
  definir('Node', dom.window.Node)
  definir('Event', dom.window.Event)
  definir('MouseEvent', dom.window.MouseEvent)
  definir('IS_REACT_ACT_ENVIRONMENT', true)

  const stubApi = {
    name: 'stub-api-roles',
    enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('services/api')) return '\0roles-stub-api'
      return null
    },
    load(id) {
      if (id !== '\0roles-stub-api') return null
      return `
        const ROLES = ${JSON.stringify(ROLES)};
        export const listarRolesAdmin = async () => ROLES;
        export const obtenerCatalogoPermisosAdmin = async () => null;
        export const crearRolAdmin = async (rol) => rol;
        export const actualizarRolAdmin = async (id, rol) => rol;
        export const cambiarEstadoRolAdmin = async (id, estado) => {
          globalThis.__cambiosEstado.push({ id, estado });
          const rol = ROLES.find((r) => r.id === id) || {};
          return { ...rol, estado };
        };
        export const eliminarRolAdmin = async () => ({ ok: true });
      `
    },
  }

  const { createServer } = await import('vite')
  const React = (await import('react')).default
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')

  const servidor = await createServer({
    root: process.cwd(),
    plugins: [stubApi],
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  })

  let raiz = null

  try {
    const { default: Roles } = await servidor.ssrLoadModule(
      '/src/features/admin/roles/Roles.jsx'
    )

    const contenedor = document.getElementById('raiz')
    raiz = createRoot(contenedor)

    await act(async () => {
      raiz.render(React.createElement(Roles, { user: USUARIO }))
    })

    const filas = [...contenedor.querySelectorAll('.roles-table tbody tr')]
    comprobar('1a) La tabla muestra las tres filas', filas.length === 3, `filas=${filas.length}`)

    const celdaEstado = (fila) => fila.children[3]
    const etiquetas = filas.map((fila) => celdaEstado(fila)?.querySelector('.switch-usuario-estado'))
    const interruptores = etiquetas.filter((etiqueta) => etiqueta?.querySelector('.slider-usuario'))
    const casillas = etiquetas.filter((etiqueta) => etiqueta?.querySelector('input[type="checkbox"]'))
    const textos = etiquetas.filter((etiqueta) => etiqueta?.querySelector('.estado-usuario-texto'))

    comprobar(
      '1b) Las tres filas usan el mismo interruptor con etiqueta debajo',
      interruptores.length === 3 && casillas.length === 3 && textos.length === 3,
      `interruptores=${interruptores.length} casillas=${casillas.length} etiquetas=${textos.length}`
    )

    const nombreFila = (fila) => fila.children[1]?.textContent?.trim()
    const textoEstado = (fila) => celdaEstado(fila)?.querySelector('.estado-usuario-texto')?.textContent?.trim()

    for (const protegido of ['Administrador', 'Cliente']) {
      const fila = filas.find((f) => nombreFila(f) === protegido)
      const etiqueta = fila ? celdaEstado(fila).querySelector('.switch-usuario-estado') : null
      const casilla = etiqueta?.querySelector('input[type="checkbox"]')

      comprobar(`2a) ${protegido} muestra interruptor y etiqueta ACTIVO`,
        Boolean(casilla) && etiqueta?.querySelector('.slider-usuario') && textoEstado(fila) === 'ACTIVO',
        `estado=${textoEstado(fila)}`)
      comprobar(`2b) ${protegido} sale deshabilitado`,
        casilla?.disabled === true && casilla?.getAttribute('aria-disabled') === 'true')
      comprobar(`2c) ${protegido} anuncia "${MENSAJE}" en el aviso del ratón`,
        casilla?.getAttribute('title') === MENSAJE && etiqueta?.getAttribute('title') === MENSAJE)
      comprobar(`2d) ${protegido} anuncia "${MENSAJE}" a los lectores de pantalla`,
        casilla?.getAttribute('aria-label') === MENSAJE)
      comprobar(`2e) ${protegido} se marca como bloqueado`,
        etiqueta?.classList.contains('bloqueado') === true)
    }

    // Clic sobre los interruptores protegidos: no debe pasar nada.
    const antes = globalThis.__cambiosEstado.length
    await act(async () => {
      for (const protegido of ['Administrador', 'Cliente']) {
        const fila = filas.find((f) => nombreFila(f) === protegido)
        fila?.querySelector('.switch-usuario-estado input')?.click()
      }
    })
    comprobar(
      '2f) El clic en Administrador/Cliente no llama al servidor',
      globalThis.__cambiosEstado.length === antes,
      `llamadas=${globalThis.__cambiosEstado.length - antes}`
    )
    const siguenActivos = ['Administrador', 'Cliente'].every((nombre) => {
      const fila = filas.find((f) => nombreFila(f) === nombre)
      const casilla = fila?.querySelector('.switch-usuario-estado input')
      return casilla?.checked === true && textoEstado(fila) === 'ACTIVO'
    })
    comprobar('2g) Administrador y Cliente siguen Activo tras el clic', siguenActivos)

    // Vendedor: el interruptor sigue funcionando.
    const filaVendedor = filas.find((f) => nombreFila(f) === 'Vendedor')
    const casillaVendedor = filaVendedor?.querySelector('.switch-usuario-estado input')
    const etiquetaVendedor = filaVendedor?.querySelector('.switch-usuario-estado')

    comprobar('3a) Vendedor muestra interruptor y etiqueta ACTIVO',
      Boolean(casillaVendedor) && textoEstado(filaVendedor) === 'ACTIVO',
      `estado=${textoEstado(filaVendedor)}`)
    comprobar('3b) Vendedor sale habilitado',
      casillaVendedor?.disabled === false && !etiquetaVendedor?.classList.contains('bloqueado') &&
      !casillaVendedor?.getAttribute('title'))

    await act(async () => {
      casillaVendedor?.click()
    })
    await act(async () => {
      await Promise.resolve()
    })
    comprobar(
      '3c) Clic de Vendedor -> Inactivo (una llamada al servidor)',
      globalThis.__cambiosEstado.length === antes + 1 &&
        globalThis.__cambiosEstado[globalThis.__cambiosEstado.length - 1]?.estado === 'Inactivo' &&
        textoEstado(filaVendedor) === 'INACTIVO',
      `llamadas=${globalThis.__cambiosEstado.length - antes} estado=${textoEstado(filaVendedor)}`
    )
    comprobar('3d) El interruptor de Vendedor queda apagado',
      filaVendedor?.querySelector('.switch-usuario-estado input')?.checked === false)

    const casillaVolver = filaVendedor?.querySelector('.switch-usuario-estado input')
    await act(async () => {
      casillaVolver?.click()
    })
    await act(async () => {
      await Promise.resolve()
    })
    comprobar(
      '3e) Segundo clic de Vendedor -> Activo',
      globalThis.__cambiosEstado[globalThis.__cambiosEstado.length - 1]?.estado === 'Activo' &&
        textoEstado(filaVendedor) === 'ACTIVO',
      `estado=${textoEstado(filaVendedor)}`
    )
  } finally {
    if (raiz) {
      await act(async () => {
        raiz.unmount()
      })
    }
    await servidor.close()
    dom.window.close()
  }
}

principal()
  .catch((error) => {
    console.error('Error inesperado:', error.message)
    fallos += 1
  })
  .finally(() => {
    console.log(`\n=== RESULTADO: ${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'} ===`)
    process.exit(fallos === 0 ? 0 : 1)
  })
