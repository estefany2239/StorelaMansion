import { pool } from '../config/db.js'

// Categorías base. El `codigo` es el id de texto estable que ya usan hoy los
// productos de la tienda (el que arma useCatalogo en el frontend); el `nombre`
// es el texto visible. NO renombrar los códigos existentes: rompería el
// filtrado de productos. Ver el reporte de la tarea.
// Categorías reales (9). "Accesorios" y "Pantalones" ya no existen: al ser un
// seed estrictamente insert-only, si volvieran a esta lista se recrearían en
// cada reinicio, por eso NO deben aparecer aquí.
export const CATEGORIAS_INICIALES = [
  { codigo: 'camisetas', nombre: 'Camisetas', descripcion: 'Camisetas básicas y estampadas para hombre y mujer.', generos: ['hombre', 'mujer'], imagen: 'camisa.png' },
  { codigo: 'busos', nombre: 'Buzos', descripcion: 'Buzos y sudaderas con capota.', generos: ['hombre', 'mujer'], imagen: 'buso.png' },
  { codigo: 'blusas', nombre: 'Sudaderas', descripcion: 'Sudaderas para hombre.', generos: ['hombre'], imagen: 'sud.png' },
  { codigo: 'tenis', nombre: 'Tenis', descripcion: 'Tenis urbanos y deportivos.', generos: ['hombre', 'mujer'], imagen: 'ten.png' },
  { codigo: 'pantalonetas', nombre: 'Pantalonetas', descripcion: 'Pantalonetas de hombre.', generos: ['hombre'], imagen: 'panta.png' },
  { codigo: 'vestidos', nombre: 'Vestidos', descripcion: 'Vestidos para mujer.', generos: ['mujer'], imagen: 'top.png' },
  { codigo: 'gorras', nombre: 'Gorras', descripcion: 'Gorras y viseras de diferentes estilos.', generos: ['hombre', 'mujer'], imagen: 'gorra.png' },
  { codigo: 'relojes', nombre: 'Relojes', descripcion: 'Relojes para hombre y mujer.', generos: ['hombre', 'mujer'], imagen: 'reloj.png' },
  { codigo: 'perfumes', nombre: 'Perfumes', descripcion: 'Perfumes para hombre.', generos: ['hombre'], imagen: 'per.png' },
]

// Crea (si faltan) las columnas de la tabla categoria y siembra las categorías
// base. Es idempotente y SOLO INSERTA: nunca actualiza filas existentes, así que
// jamás pisa desde el arranque el nombre, la descripción, la imagen, los géneros,
// el orden ni el estado que se hayan editado desde el panel. Si una categoría ya
// existe (por `codigo` o por `nombre`), se deja intacta.
export async function inicializarCategorias() {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    await db.query('ALTER TABLE categoria ADD COLUMN IF NOT EXISTS codigo varchar(30)')
    await db.query('ALTER TABLE categoria ADD COLUMN IF NOT EXISTS generos text[]')
    await db.query('ALTER TABLE categoria ADD COLUMN IF NOT EXISTS imagen varchar(300)')
    await db.query('ALTER TABLE categoria ADD COLUMN IF NOT EXISTS orden integer NOT NULL DEFAULT 0')
    await db.query('ALTER TABLE categoria ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()')

    for (let i = 0; i < CATEGORIAS_INICIALES.length; i += 1) {
      const c = CATEGORIAS_INICIALES[i]
      const orden = i + 1

      // Inserta la categoría solo si no existe ninguna fila con ese código o ese
      // nombre. No hay UPDATE: las filas ya existentes quedan exactamente como están.
      await db.query(
        `INSERT INTO categoria (codigo, nombre, descripcion, generos, imagen, orden, estado)
         SELECT $1::varchar, $2::varchar, $3::varchar, $4::text[], $5::varchar, $6::integer, TRUE
          WHERE NOT EXISTS (
            SELECT 1 FROM categoria
             WHERE LOWER(codigo) = LOWER($1::varchar) OR LOWER(nombre) = LOWER($2::varchar)
          )`,
        [c.codigo, c.nombre, c.descripcion || null, c.generos, c.imagen || null, orden]
      )
    }

    await db.query('CREATE UNIQUE INDEX IF NOT EXISTS categoria_codigo_unico ON categoria (LOWER(codigo))')
    await db.query('CREATE UNIQUE INDEX IF NOT EXISTS categoria_nombre_unico ON categoria (LOWER(nombre))')

    await db.query('COMMIT')
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    db.release()
  }
}
