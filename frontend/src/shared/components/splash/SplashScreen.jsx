import { Store } from "lucide-react";

import "./SplashScreen.css";

export default function SplashScreen({ saliendo }) {
  return (
    <div
      className={
        saliendo
          ? "splash-overlay saliendo"
          : "splash-overlay"
      }
    >
      <div className="splash-content">

        <div className="splash-logo">

          <Store size={42} />

        </div>

        <h1 className="splash-title">
          Store La Mansión
        </h1>

        <div className="splash-divider"></div>

        <p className="splash-tagline">
          Elegancia • Moda • Estilo
        </p>

      </div>
    </div>
  );
}