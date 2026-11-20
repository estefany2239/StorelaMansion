import { useEffect, useMemo, useState } from "react";

import {
  Scale,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
  Crown,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
} from "lucide-react";

import Footer from "../../shared/components/footer/Footer";
import "./Licencias.css";

/* ============================================================
   LICENCIAS Y DERECHOS DE AUTOR — página pública (/licencias)
   Datos cargados de forma perezosa (import dinámico) desde
   features/licencias/data/, generados por
   scripts/licensing/export-web-data.mjs (Paso 3).
   ============================================================ */

const PROYECTO = {
  nombre: "STORE LA MANSIÓN",
  programa: "Tecnología en Análisis y Desarrollo de Software",
  institucion: "Servicio Nacional de Aprendizaje — SENA",
  ficha: "3256538",
  instructor: "Alber Arango",
  beneficiaria: "Leidy Juliet Quiroga Herrera",
  autoras: "Estefany Arango Morales y Hannah Molina Valencia",
  anioFin: "2027",
};

const ETIQUETA_ESTADO = {
  verificada: "Verificada",
  "declarada-sin-texto": "Declarada, sin texto",
  pendiente: "Pendiente de verificación",
};

const ETIQUETA_TIPO = {
  "directa-produccion": "Producción",
  "directa-desarrollo": "Desarrollo",
};

const ETIQUETA_TABLA = {
  "directa-produccion": "Directa de producción",
  "directa-desarrollo": "Directa de desarrollo",
  "indirecta-produccion": "Indirecta de producción",
  "indirecta-desarrollo": "Indirecta de desarrollo",
};

const ETIQUETA_SERVICIO_VERIFICADA = {
  "verificada": "Verificada",
  "verificada (términos de servicio)": "Verificada",
  "verificada (licencia); USO EN EL CÓDIGO: PENDIENTE DE VERIFICACIÓN": "Licencia verificada · uso pendiente",
};

const etiquetaServicio = (estado) =>
  ETIQUETA_SERVICIO_VERIFICADA[estado] ||
  (estado && /verificada/i.test(estado) ? "Verificada" : "Pendiente de verificación");

function EnlaceExterno({ href, children, className }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function BadgeEstado({ estado }) {
  return (
    <span className={`lic-badge lic-badge--${estado}`}>
      {ETIQUETA_ESTADO[estado] || estado}
    </span>
  );
}

function LicenciaConEnlaces({ paquete }) {
  const enlaces = paquete.spdx || [];
  return (
    <span className="lic-licencia">
      {enlaces.length > 0 ? (
        <>
          {enlaces.map((e, i) => (
            <span key={e.id}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <EnlaceExterno href={e.url} className="lic-link-spdx">
                {e.id}
              </EnlaceExterno>
            </span>
          ))}
          {paquete.licenciaMultiple && (
            <span className="lic-licencia-nota"> (varias alternativas; ver texto original)</span>
          )}
        </>
      ) : (
        <span className="lic-licencia-nota">Pendiente de verificación</span>
      )}
    </span>
  );
}

/* ---------- Tabla de dependencias directas (sección h) ---------- */

function TablaDirectas({ registros }) {
  if (registros.length === 0) {
    return <p className="lic-vacio">No hay dependencias directas en este proyecto.</p>;
  }
  return (
    <div className="lic-tabla-wrap">
      <table className="lic-tabla">
        <thead>
          <tr>
            <th scope="col">Paquete</th>
            <th scope="col">Versión</th>
            <th scope="col">Licencia</th>
            <th scope="col">Tipo</th>
            <th scope="col">Estado</th>
            <th scope="col">Enlaces</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((r) => (
            <tr key={r.nombre + "@" + r.version}>
              <td data-titulo="Paquete" className="lic-celda-nombre">{r.nombre}</td>
              <td data-titulo="Versión">{r.version}</td>
              <td data-titulo="Licencia"><LicenciaConEnlaces paquete={r} /></td>
              <td data-titulo="Tipo">{ETIQUETA_TIPO[r.tipo] || r.tipo}</td>
              <td data-titulo="Estado"><BadgeEstado estado={r.estado} /></td>
              <td data-titulo="Enlaces">
                <span className="lic-enlaces">
                  {r.repositorio && (
                    <EnlaceExterno href={r.repositorio} className="lic-link">
                      Repositorio <ExternalLink size={12} aria-hidden="true" />
                    </EnlaceExterno>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Inventario completo (sección k) ---------- */

const PASO_MOSTRAR = 50;

function InventarioCompleto({ dependencias }) {
  const [abierto, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [visibles, setVisibles] = useState(PASO_MOSTRAR);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = [...dependencias.frontend, ...dependencias.backend];
    if (!q) return lista;
    return lista.filter((r) => r.nombre.toLowerCase().includes(q));
  }, [dependencias, busqueda]);

  const visiblesLista = filtrados.slice(0, visibles);
  const hayMas = filtrados.length > visiblesLista.length;

  return (
    <section className="lic-card lic-inventario">
      <button
        type="button"
        className="lic-inventario-toggle"
        aria-expanded={abierto}
        onClick={() => setOpen((v) => !v)}
      >
        {abierto ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
        <span>
          Inventario completo de dependencias ({dependencias.meta.total} paquetes, directas e
          indirectas)
        </span>
      </button>

      {abierto && (
        <div className="lic-inventario-cuerpo">
          <label className="lic-buscador lic-buscador--inventario">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar paquete por nombre…"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setVisibles(PASO_MOSTRAR);
              }}
            />
          </label>

          <div className="lic-tabla-wrap">
            <table className="lic-tabla">
              <thead>
                <tr>
                  <th scope="col">Paquete</th>
                  <th scope="col">Versión</th>
                  <th scope="col">Licencia</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {visiblesLista.map((r) => (
                  <tr key={(r.proyecto || "") + r.nombre + "@" + r.version}>
                    <td data-titulo="Paquete" className="lic-celda-nombre">{r.nombre}</td>
                    <td data-titulo="Versión">{r.version}</td>
                    <td data-titulo="Licencia"><LicenciaConEnlaces paquete={r} /></td>
                    <td data-titulo="Estado"><BadgeEstado estado={r.estado} /></td>
                    <td data-titulo="Tipo">{ETIQUETA_TABLA[r.tipo] || r.tipo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visiblesLista.length === 0 && (
            <p className="lic-vacio">No hay paquetes que coincidan con «{busqueda}».</p>
          )}

          {hayMas && (
            <button
              type="button"
              className="lic-btn-secundario"
              onClick={() => setVisibles((n) => n + PASO_MOSTRAR)}
            >
              Mostrar más ({filtrados.length - visiblesLista.length} restantes)
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Página ---------- */

export default function Licencias() {
  const [datos, setDatos] = useState(null);
  const [errorDatos, setErrorDatos] = useState(false);
  const [pestaña, setPestaña] = useState("frontend");
  const [busquedaDirectas, setBusquedaDirectas] = useState("");

  // Carga perezosa: los JSON solo se descargan cuando se abre /licencias.
  useEffect(() => {
    let cancelado = false;
    Promise.all([import("./data/dependencias.json"), import("./data/servicios.json")])
      .then(([dep, srv]) => {
        if (cancelado) return;
        setDatos({ dependencias: dep.default, servicios: srv.default.servicios });
      })
      .catch(() => {
        if (!cancelado) setErrorDatos(true);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const directas = useMemo(() => {
    if (!datos) return [];
    const q = busquedaDirectas.trim().toLowerCase();
    const lista = datos.dependencias[pestaña].filter(
      (r) => r.tipo === "directa-produccion" || r.tipo === "directa-desarrollo"
    );
    if (!q) return lista;
    return lista.filter((r) => r.nombre.toLowerCase().includes(q));
  }, [datos, pestaña, busquedaDirectas]);

  return (
    <div className="lic-page">
      {/* ---------- ENCABEZADO ---------- */}
      <header className="lic-header">
        <div className="lic-header-inner">
          <a href="/" className="lic-marca">
            <Crown size={22} aria-hidden="true" className="lic-marca-icono" />
            <span>STORE LA MANSIÓN</span>
          </a>
          <a href="/" className="lic-btn-volver">
            <ArrowLeft size={15} aria-hidden="true" />
            Volver a la tienda
          </a>
        </div>
      </header>

      <main className="lic-main">
        {/* a) Título */}
        <section className="lic-hero">
          <h1 className="lic-titulo">
            <Scale size={26} aria-hidden="true" className="lic-titulo-icono" />
            Licencias y derechos de autor
          </h1>
          <p className="lic-hero-frase">
            Información oficial sobre la licencia propietaria del aplicativo, sus autoras y
            los componentes, herramientas y servicios de terceros que utiliza.
          </p>
        </section>

        {/* b) Información general */}
        <section className="lic-card" aria-labelledby="lic-info-general">
          <h2 id="lic-info-general" className="lic-card-titulo">Información general del proyecto</h2>
          <dl className="lic-datos">
            <div><dt>Proyecto</dt><dd>{PROYECTO.nombre} (tienda virtual con panel administrativo)</dd></div>
            <div><dt>Programa</dt><dd>{PROYECTO.programa}</dd></div>
            <div><dt>Institución</dt><dd>{PROYECTO.institucion}</dd></div>
            <div><dt>Ficha</dt><dd>{PROYECTO.ficha}</dd></div>
            <div><dt>Instructor</dt><dd>{PROYECTO.instructor}</dd></div>
            <div><dt>Beneficiaria</dt><dd>{PROYECTO.beneficiaria}</dd></div>
          </dl>
        </section>

        {/* c) Tipo de licencia */}
        <section className="lic-card" aria-labelledby="lic-tipo">
          <h2 id="lic-tipo" className="lic-card-titulo">Tipo de licencia</h2>
          <p className="lic-resaltado">
            Licencia propietaria de software. No es una licencia MIT ni ninguna otra licencia
            abierta o de código disponible.
          </p>
          <ul className="lic-lista">
            <li>
              <strong>Permite:</strong> a STORE LA MANSIÓN operar el aplicativo para su tienda
              virtual; a sus empleados y administradores acceder según los roles y permisos del
              sistema; y a los clientes usar la tienda como usuarios finales (consultar productos
              y comprar).
            </li>
            <li>
              <strong>Prohíbe</strong> (sin autorización escrita de los titulares): copiar,
              reproducir, modificar, crear obras derivadas, distribuir, sublicenciar, ceder o
              publicar el código fuente, así como realizar ingeniería inversa, salvo lo permitido
              por la ley.
            </li>
            <li>
              <strong>Sin garantías:</strong> el software se entrega «tal cual», sin prometer
              garantías ni soporte.
            </li>
            <li>
              <strong>Texto completo:</strong> consulta el archivo{" "}
              <a href="/LICENSE" download="LICENSE" className="lic-link">LICENSE</a> (licencia
              propietaria del código original; borrador sujeto a revisión del instructor y a la
              formalización del convenio de transferencia).
            </li>
          </ul>
        </section>

        {/* d) Autoras */}
        <section className="lic-card" aria-labelledby="lic-autoras">
          <h2 id="lic-autoras" className="lic-card-titulo">Autoras del software</h2>
          <p>
            <strong>Estefany Arango Morales</strong> y <strong>Hannah Molina Valencia</strong>,
            autoras y desarrolladoras del proyecto. Conservan su autoría y sus derechos morales
            conforme a la legislación colombiana de derecho de autor.
          </p>
        </section>

        {/* e) Titular patrimonial previsto */}
        <section className="lic-card lic-card--aviso" aria-labelledby="lic-titular">
          <h2 id="lic-titular" className="lic-card-titulo">Titular patrimonial previsto</h2>
          <p>
            <strong>STORE LA MANSIÓN</strong>, representada por su propietaria{" "}
            <strong>Leidy Juliet Quiroga Herrera</strong>.
          </p>
          <p className="lic-aviso-texto">
            <AlertCircle size={16} aria-hidden="true" className="lic-aviso-icono" />
            La transferencia de derechos patrimoniales está pendiente de formalización mediante
            convenio.
          </p>
        </section>

        {/* f) Año de finalización */}
        <section className="lic-card" aria-labelledby="lic-anio">
          <h2 id="lic-anio" className="lic-card-titulo">Año previsto de finalización</h2>
          <p className="lic-grande">{PROYECTO.anioFin}</p>
        </section>

        {/* g) Componentes del aplicativo */}
        <section className="lic-card" aria-labelledby="lic-componentes">
          <h2 id="lic-componentes" className="lic-card-titulo">Componentes del aplicativo</h2>
          <ul className="lic-lista">
            <li>
              <strong>Tienda virtual:</strong> interfaz pública con catálogo, carrito de compras,
              checkout y cuenta de cliente.
            </li>
            <li>
              <strong>Panel administrativo:</strong> módulos de gestión (dashboard, roles,
              usuarios, productos, categorías, ventas, pedidos, domicilios y perfil).
            </li>
            <li>
              <strong>API / Backend:</strong> servidor Node.js con Express que expone la API
              REST del aplicativo.
            </li>
            <li>
              <strong>Base de datos:</strong> PostgreSQL, hospedada como servicio administrado en
              Neon.
            </li>
            <li>
              <strong>Imágenes de productos:</strong> se sirven desde el backend; las subidas se
              gestionan con Multer en el servidor. Durante la auditoría no se detectó un servicio
              externo de almacenamiento de imágenes en uso (Cloudinary figura como pendiente de
              verificación).
            </li>
          </ul>
        </section>

        {/* h) Tecnologías y bibliotecas (directas) */}
        <section className="lic-card" aria-labelledby="lic-tecnologias">
          <h2 id="lic-tecnologias" className="lic-card-titulo">Tecnologías y bibliotecas utilizadas</h2>
          <p className="lic-card-sub">
            Dependencias directas de cada proyecto. Los enlaces de licencia llevan a la ficha
            SPDX oficial; el texto original de cada una se conserva en la carpeta licenses/ del
            repositorio.
          </p>

          {!datos && !errorDatos && (
            <p className="lic-cargando">Cargando datos de dependencias…</p>
          )}
          {errorDatos && (
            <p className="lic-vacio">
              No se pudieron cargar los datos de dependencias (PENDIENTE DE VERIFICACIÓN).
            </p>
          )}

          {datos && (
            <>
              <div className="lic-pestanas" role="tablist" aria-label="Proyecto">
                <button
                  type="button"
                  role="tab"
                  aria-selected={pestaña === "frontend"}
                  className={pestaña === "frontend" ? "lic-pestaña activa" : "lic-pestaña"}
                  onClick={() => setPestaña("frontend")}
                >
                  Frontend
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={pestaña === "backend"}
                  className={pestaña === "backend" ? "lic-pestaña activa" : "lic-pestaña"}
                  onClick={() => setPestaña("backend")}
                >
                  Backend
                </button>
              </div>

              <label className="lic-buscador">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Buscar dependencia por nombre…"
                  value={busquedaDirectas}
                  onChange={(e) => setBusquedaDirectas(e.target.value)}
                />
              </label>

              <TablaDirectas registros={directas} />

              {directas.length === 0 && busquedaDirectas && (
                <p className="lic-vacio">Sin coincidencias para «{busquedaDirectas}».</p>
              )}
            </>
          )}
        </section>

        {/* i) Servicios externos */}
        <section className="lic-card" aria-labelledby="lic-servicios">
          <h2 id="lic-servicios" className="lic-card-titulo">Condiciones de uso de servicios externos</h2>
          <p className="lic-card-sub">
            Herramientas y servicios que utiliza el proyecto. Los servicios en la nube se rigen
            por sus términos de servicio, no por la licencia del proyecto.
          </p>

          {!datos && !errorDatos && <p className="lic-cargando">Cargando servicios…</p>}

          {datos && (
            <div className="lic-servicios-grid">
              {datos.servicios.map((s) => (
                <article key={s.nombre} className="lic-servicio">
                  <h3 className="lic-servicio-nombre">{s.nombre}</h3>
                  <p className="lic-servicio-tipo">{s.tipo}</p>
                  <p className="lic-servicio-uso">{s.uso}</p>
                  <p className="lic-servicio-licencia">{s.licencia}</p>
                  <div className="lic-servicio-pies">
                    {s.terminosUrl ? (
                      <EnlaceExterno href={s.terminosUrl} className="lic-link">
                        Términos oficiales <ExternalLink size={12} aria-hidden="true" />
                      </EnlaceExterno>
                    ) : (
                      <span className="lic-pendiente-mini">Términos: Pendiente de verificación</span>
                    )}
                    {s.urlOficial && (
                      <EnlaceExterno href={s.urlOficial} className="lic-link">
                        Sitio oficial <ExternalLink size={12} aria-hidden="true" />
                      </EnlaceExterno>
                    )}
                    <span className={`lic-badge lic-badge--servicio ${/verificada/i.test(s.estado) ? "lic-badge--verificada" : "lic-badge--pendiente"}`}>
                      {etiquetaServicio(s.estado)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* j) Avisos de derechos de autor */}
        <section className="lic-card" aria-labelledby="lic-avisos">
          <h2 id="lic-avisos" className="lic-card-titulo">Avisos de derechos de autor</h2>
          <p>
            <strong>
              © 2026 Estefany Arango Morales y Hannah Molina Valencia. Todos los derechos
              reservados.
            </strong>
          </p>
          <p>
            Las bibliotecas, herramientas y servicios de terceros utilizados por el aplicativo
            conservan sus avisos de copyright y sus licencias originales, indicados en el
            documento{" "}
            <a href="/THIRD_PARTY_NOTICES.md" download="THIRD_PARTY_NOTICES.md" className="lic-link">
              THIRD_PARTY_NOTICES.md
            </a>{" "}
            y en los textos originales de licencia del repositorio. La licencia propietaria del
            proyecto no reemplaza ni modifica las licencias de terceros.
          </p>
          <ul className="lic-leyenda">
            <li><CheckCircle2 size={14} aria-hidden="true" /> Verificada: licencia declarada y texto original encontrado.</li>
            <li><AlertCircle size={14} aria-hidden="true" /> Declarada, sin texto: licencia declarada, sin archivo de texto en el paquete.</li>
            <li><CircleDashed size={14} aria-hidden="true" /> Pendiente de verificación: dato aún no verificable.</li>
          </ul>
        </section>

        {/* k) Inventario completo */}
        {datos && <InventarioCompleto dependencias={datos.dependencias} />}
        {!datos && !errorDatos && (
          <section className="lic-card">
            <h2 className="lic-card-titulo">
              <FileText size={18} aria-hidden="true" /> Inventario completo de dependencias
            </h2>
            <p className="lic-cargando">Cargando inventario…</p>
          </section>
        )}

        <section className="lic-descargas" aria-label="Documentos descargables">
          <a href="/LICENSE" download="LICENSE" className="lic-btn-primario">
            <Download size={16} aria-hidden="true" />
            Descargar LICENSE (licencia propietaria)
          </a>
          <a href="/THIRD_PARTY_NOTICES.md" download="THIRD_PARTY_NOTICES.md" className="lic-btn-secundario">
            <Download size={16} aria-hidden="true" />
            Descargar THIRD_PARTY_NOTICES.md (avisos de terceros)
          </a>
        </section>
      </main>

      {/* ---------- PIE ---------- */}
      <footer className="lic-footer">
        <p>
          © 2026 Estefany Arango Morales y Hannah Molina Valencia — {PROYECTO.nombre}. SENA,
          ficha {PROYECTO.ficha}. Proyecto con finalización prevista en {PROYECTO.anioFin}.
        </p>
        <nav aria-label="Enlaces de licencias">
          <a href="/LICENSE" download="LICENSE" className="lic-link">LICENSE</a>
          <span aria-hidden="true"> · </span>
          <a href="/THIRD_PARTY_NOTICES.md" download="THIRD_PARTY_NOTICES.md" className="lic-link">
            THIRD_PARTY_NOTICES.md
          </a>
          <span aria-hidden="true"> · </span>
          <a href="/" className="lic-link">Volver a la tienda</a>
        </nav>
      </footer>

      {/* Footer compartido de la tienda (la página /licencias es de tema
          claro fijo, igual que su propia estética) */}
      <Footer tema="claro" />
    </div>
  );
}
