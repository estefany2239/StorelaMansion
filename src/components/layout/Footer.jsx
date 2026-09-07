import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        
        {/* Columna 1: Branding y Descripción */}
        <div className="footer-brand">
          <h3 className="footer-logo">Store La Mansión</h3>
          <p className="footer-tagline">Fashion Premium</p>
          <p className="footer-description">
            Prendas exclusivas diseñadas para quienes aprecian la distinción y el lujo en cada detalle.
          </p>
        </div>

        {/* Columna 2: Enlaces Rápidos */}
        <div className="footer-links">
          <h4>Navegación</h4>
          <ul>
            <li><a href="#hero">Inicio</a></li>
            <li><a href="#categorias">Categorías</a></li>
            <li><a href="#productos">Productos</a></li>
          </ul>
        </div>

        {/* Columna 3: Atención al Cliente / Contacto */}
        <div className="footer-contact">
          <h4>Atención al Cliente</h4>
          <ul>
            <li><span>Ubicación:</span> Medellín, Colombia</li>
            <li><span>Email:</span> contacto@storelamansión.com</li>
            <li><span>Envíos:</span> Cobertura nacional</li>
          </ul>
        </div>

      </div>

      {/* Derechos de Autor */}
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Store La Mansión. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

export default Footer;