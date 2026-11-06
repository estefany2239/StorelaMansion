const texto = (valor) => String(valor ?? "").trim();

const sinTildes = (valor) =>
  texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const buscarDepartamento = (departamentos, valor) => {
  const buscado = texto(valor);

  if (!buscado) return null;

  return (
    departamentos.find((dep) => dep.codigo === buscado) ||
    departamentos.find(
      (dep) => sinTildes(dep.nombre) === sinTildes(buscado)
    ) ||
    null
  );
};

const buscarMunicipio = (departamento, valor) => {
  const buscado = texto(valor);

  if (!departamento || !buscado) return null;

  return (
    departamento.municipios.find((mun) => mun.codigo === buscado) ||
    departamento.municipios.find(
      (mun) => sinTildes(mun.nombre) === sinTildes(buscado)
    ) ||
    null
  );
};

export const normalizarTelefono = (valor) =>
  texto(valor).replace(/\D/g, "").slice(0, 10);

export const ubicacionDesdePerfil = (perfil, departamentos = []) => {
  const departamento = buscarDepartamento(
    departamentos,
    perfil?.departamento_codigo ??
      perfil?.departamentoCodigo ??
      perfil?.departamento
  );

  const municipio = buscarMunicipio(
    departamento,
    perfil?.municipio_codigo ??
      perfil?.municipioCodigo ??
      perfil?.municipio
  );

  return {
    departamentoCodigo: departamento?.codigo ?? "",
    municipioCodigo: municipio?.codigo ?? "",
    barrio: municipio ? texto(perfil?.barrio) : "",
    direccion: texto(perfil?.direccion ?? perfil?.direccion_entrega),
  };
};

export const combinarDatosEntrega = (
  actual = {},
  perfil = {},
  departamentos = []
) => {
  const perfilUbicacion = ubicacionDesdePerfil(perfil, departamentos);

  const puedeUsarUbicacion =
    !texto(actual.departamentoCodigo) && !texto(actual.municipioCodigo);

  return {
    nombre: texto(actual.nombre) || texto(perfil?.nombre),
    telefono: texto(actual.telefono) || normalizarTelefono(perfil?.telefono),
    departamentoCodigo: puedeUsarUbicacion
      ? perfilUbicacion.departamentoCodigo || texto(actual.departamentoCodigo)
      : texto(actual.departamentoCodigo),
    municipioCodigo: puedeUsarUbicacion
      ? perfilUbicacion.municipioCodigo || texto(actual.municipioCodigo)
      : texto(actual.municipioCodigo),
    barrio:
      texto(actual.barrio) ||
      (puedeUsarUbicacion ? perfilUbicacion.barrio : ""),
    direccion: texto(actual.direccion) || perfilUbicacion.direccion,
  };
};
