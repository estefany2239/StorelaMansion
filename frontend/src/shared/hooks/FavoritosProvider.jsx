import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { useNotify } from "../components/notifications/useNotify.js";
import {
  agregarFavorito,
  obtenerIdsFavoritos,
  quitarFavorito
} from "../services/api";
import { FavoritosContext } from "./FavoritosContext";

const normalizarIds = (respuesta) => {
  const valores = Array.isArray(respuesta)
    ? respuesta
    : Array.isArray(respuesta?.ids)
      ? respuesta.ids
      : [];
  return [
    ...new Set(
      valores
        .map((valor) =>
          valor && typeof valor === "object" ? valor.id_producto : valor
        )
        .filter((id) => id !== null && id !== undefined)
        .map(String)
    )
  ];
};

export default function FavoritosProvider({ user, children }) {
  const notify = useNotify();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const sesionCliente = Boolean(
    user?.rol === "Cliente" && token && !user?.cambioContrasena
  );
  const sessionKey = sesionCliente
    ? `${user?.id_usuario ?? user?.id ?? user?.email ?? ""}:${token}`
    : null;
  const [estado, setEstado] = useState({ sessionKey: null, ids: [] });
  const idsRef = useRef([]);
  const sesionRef = useRef({ key: null, version: 0 });
  const revisionRef = useRef(0);
  const accionesPorIdRef = useRef(new Map());
  const secuenciaPorIdRef = useRef(new Map());
  const ids = useMemo(
    () => (estado.sessionKey === sessionKey ? estado.ids : []),
    [estado, sessionKey]
  );
  const cargando = Boolean(sessionKey && estado.sessionKey !== sessionKey);

  const aplicarIds = useCallback((nuevosIds, key, version) => {
    if (
      sesionRef.current.key !== key ||
      sesionRef.current.version !== version
    ) {
      return;
    }

    idsRef.current = nuevosIds;
    setEstado({ sessionKey: key, ids: nuevosIds });
  }, []);

  // La carga se invalida al cambiar de cuenta o si ocurre una acción
  // optimista mientras la respuesta de carga sigue en curso.
  useEffect(() => {
    const version = sesionRef.current.version + 1;
    sesionRef.current = { key: sessionKey, version };
    idsRef.current = [];
    revisionRef.current += 1;

    if (!sessionKey) {
      return undefined;
    }

    const revision = revisionRef.current;
    let vigente = true;
    obtenerIdsFavoritos()
      .then((respuesta) => {
        if (vigente && revisionRef.current === revision) {
          aplicarIds(normalizarIds(respuesta), sessionKey, version);
        }
      })
      .catch((error) => {
        if (vigente && sesionRef.current.version === version) {
          aplicarIds([], sessionKey, version);
          notify(
            error?.message || "No se pudieron cargar tus favoritos",
            "error"
          );
        }
      });

    return () => {
      vigente = false;
    };
  }, [sessionKey, notify, aplicarIds]);

  const cargar = useCallback(async () => {
    if (!sessionKey || sesionRef.current.key !== sessionKey) return;
    const { version } = sesionRef.current;
    const revision = revisionRef.current;
    try {
      const respuesta = await obtenerIdsFavoritos();
      if (
        revisionRef.current === revision &&
        sesionRef.current.key === sessionKey
      ) {
        aplicarIds(normalizarIds(respuesta), sessionKey, version);
      }
    } catch (error) {
      notify(error?.message || "No se pudieron cargar tus favoritos", "error");
    }
  }, [sessionKey, aplicarIds, notify]);

  const esFavorito = useCallback(
    (idProducto) => {
      if (idProducto === null || idProducto === undefined) return false;
      return ids.includes(String(idProducto));
    },
    [ids]
  );

  const alternar = useCallback(
    async (idProducto) => {
      if (
        !sessionKey ||
        sesionRef.current.key !== sessionKey ||
        idProducto === null ||
        idProducto === undefined
      ) {
        return false;
      }

      const clave = String(idProducto);
      const version = sesionRef.current.version;
      const previo = idsRef.current;
      const estaba = previo.includes(clave);
      const objetivo = !estaba;
      const nuevosIds = objetivo
        ? [...previo, clave]
        : previo.filter((id) => id !== clave);
      const secuencia = (secuenciaPorIdRef.current.get(clave) || 0) + 1;

      secuenciaPorIdRef.current.set(clave, secuencia);
      revisionRef.current += 1;
      aplicarIds(nuevosIds, sessionKey, version);

      const anterior = accionesPorIdRef.current.get(clave) || Promise.resolve();
      const accion = anterior
        .catch(() => false)
        .then(async () => {
          if (
            sesionRef.current.key !== sessionKey ||
            sesionRef.current.version !== version
          ) {
            return false;
          }

          try {
            if (objetivo) await agregarFavorito(idProducto);
            else await quitarFavorito(idProducto);
            return true;
          } catch (error) {
            if (
              sesionRef.current.key !== sessionKey ||
              sesionRef.current.version !== version
            ) {
              return false;
            }

            notify(
              error?.message || "No se pudo actualizar tus favoritos",
              "error"
            );

            const esUltimaAccion =
              secuenciaPorIdRef.current.get(clave) === secuencia;
            if (esUltimaAccion) {
              try {
                const respuesta = await obtenerIdsFavoritos();
                if (
                  sesionRef.current.key === sessionKey &&
                  sesionRef.current.version === version &&
                  secuenciaPorIdRef.current.get(clave) === secuencia
                ) {
                  const delServidor = normalizarIds(respuesta);
                  const actuales = idsRef.current.filter((id) => id !== clave);
                  if (delServidor.includes(clave)) actuales.push(clave);
                  aplicarIds(actuales, sessionKey, version);
                }
              } catch {
                if (
                  sesionRef.current.key === sessionKey &&
                  sesionRef.current.version === version &&
                  secuenciaPorIdRef.current.get(clave) === secuencia
                ) {
                  const actuales = idsRef.current.filter((id) => id !== clave);
                  aplicarIds(
                    estaba ? [...actuales, clave] : actuales,
                    sessionKey,
                    version
                  );
                }
              }
            }
            return false;
          }
        });

      accionesPorIdRef.current.set(clave, accion);
      try {
        return await accion;
      } finally {
        if (accionesPorIdRef.current.get(clave) === accion) {
          accionesPorIdRef.current.delete(clave);
        }
      }
    },
    [sessionKey, aplicarIds, notify]
  );

  const valor = useMemo(
    () => ({
      user,
      ids,
      cargando,
      esFavorito,
      alternar,
      recargar: cargar
    }),
    [user, ids, cargando, esFavorito, alternar, cargar]
  );

  return (
    <FavoritosContext.Provider value={valor}>
      {children}
    </FavoritosContext.Provider>
  );
}
