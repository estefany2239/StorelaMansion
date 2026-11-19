import { useState, useEffect } from "react";

import { Plus, Search, Eye, Pencil, X } from "lucide-react";

import "./Proveedores.css";

import Pagination from "../components/Pagination";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import useValidacionFormulario from "../../../shared/hooks/useValidacionFormulario";
import { tienePermiso } from "../utils/permisos";

import {
  listarProveedoresAdmin,
  obtenerProveedorAdmin,
  crearProveedorAdmin,
  actualizarProveedorAdmin,
  cambiarEstadoProveedorAdmin
} from "../../../shared/services/api";

const REGISTROS_POR_PAGINA = 10;

// Mismos valores que TIPOS_DOCUMENTO del backend (utils/documentos.js)
const TIPOS_DOCUMENTO = ["NIT", "CC", "CE", "Pasaporte"];

const FORMULARIO_VACIO = {
  id: null,
  nombre: "",
  tipo_documento: "NIT",
  documento: "",
  contacto: "",
  telefono: "",
  correo: "",
  direccion: "",
  ciudad: ""
};

// Reglas alineadas con proveedoresAdmin.js (las mismas expresiones regulares)
const REGLAS_PROVEEDOR = {
  tipo_documento: (valor) => {
    const tipo = String(valor || "").trim();
    if (!tipo) return "Este campo es obligatorio.";
    return "";
  },
  nombre: (valor) => {
    const nombre = String(valor || "").trim().replace(/\s+/g, " ");
    if (!nombre) return "Este campo es obligatorio.";
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(nombre)) return "El nombre solo admite letras y espacios.";
    if (nombre.length > 150) return "El nombre no puede superar los 150 caracteres.";
    return "";
  },
  contacto: (valor) => {
    const contacto = String(valor || "").trim().replace(/\s+/g, " ");
    if (!contacto) return "";
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(contacto)) return "El contacto solo admite letras y espacios.";
    return "";
  },
  ciudad: (valor) => {
    const ciudad = String(valor || "").trim().replace(/\s+/g, " ");
    if (!ciudad) return "";
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(ciudad)) return "La ciudad solo admite letras y espacios.";
    return "";
  },
  documento: (valor, formularioActual) => {
    const documento = String(valor || "").trim();
    if (!documento) return "Este campo es obligatorio.";
    const tipo = formularioActual?.tipo_documento || "";
    if (tipo === "NIT") {
      if (!/^\d{1,}-?\d$/.test(documento)) return "El NIT debe ser números con un guion seguido de un dígito (ej. 900123456-7).";
      return "";
    }
    if (!/^\d+$/.test(documento)) return "El documento solo admite números.";
    const min = tipo === "CC" || tipo === "CE" ? 6 : 1;
    if (documento.length < min) return "El documento debe tener al menos " + min + " dígitos.";
    return "";
  },
  telefono: (valor) => {
    const telefono = String(valor || "").trim();
    if (!telefono) return "Este campo es obligatorio.";
    const digitos = (telefono.match(/\d/g) || []).length;
    if (digitos < 7 || digitos > 15) return "El teléfono debe tener entre 7 y 15 dígitos.";
    if (!/^[0-9+\s]+$/.test(telefono)) return "El teléfono solo admite números, + y espacios.";
    return "";
  },
  correo: (valor) => {
    const correo = String(valor || "").trim();
    if (!correo) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)
      ? ""
      : "El correo no tiene un formato válido.";
  },
  direccion: (valor) => {
    const direccion = String(valor || "").trim();
    if (!direccion) return "";
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9#\-.,\s]+$/.test(direccion)) return "La dirección solo admite letras, números, #, -, comas y puntos.";
    return "";
  }
};

const formatearPrecio = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(valor) || 0);

const formatearId = (id) => `PRV-${String(id).padStart(3, "0")}`;

export default function Proveedores({ user }) {
  // =====================================================
  // PERMISOS (los botones sin permiso se ocultan)
  // =====================================================

  const puedeConsultar = tienePermiso(user, "Proveedores", "Consultar");
  const puedeCrear = tienePermiso(user, "Proveedores", "Crear");
  const puedeActualizar = tienePermiso(user, "Proveedores", "Actualizar");
  const puedeCambiarEstado = tienePermiso(user, "Proveedores", "Cambiar estado");

  // =====================================================
  // ESTADOS
  // =====================================================

  const [proveedores, setProveedores] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, paginas: 1, total: 0 });
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [recargar, setRecargar] = useState(0);

  const [modal, setModal] = useState(null); // "crear" | "editar" | null
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const { toast, mostrarToast } = useToast();

  const {
    errores,
    manejarBlur,
    revisarCampo,
    validarTodo,
    limpiarValidacion,
    setErrores
  } = useValidacionFormulario(REGLAS_PROVEEDOR);

  // =====================================================
  // CARGA DE LA LISTA (bÃºsqueda con pausa de 300 ms)
  // =====================================================

  useEffect(() => {
    if (!puedeConsultar) return;

    let activo = true;

    const temporizador = setTimeout(async () => {
      setCargando(true);
      try {
        const respuesta = await listarProveedoresAdmin({
          q: busqueda.trim(),
          pagina,
          limite: REGISTROS_POR_PAGINA
        });
        if (!activo) return;
        setProveedores(respuesta.data);
        setPaginacion(respuesta.paginacion);
      } catch (error) {
        if (activo) mostrarToast(error.message, "error");
      } finally {
        if (activo) setCargando(false);
      }
    }, 300);

    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [busqueda, pagina, recargar, puedeConsultar, mostrarToast]);

  const recargarLista = () => setRecargar((actual) => actual + 1);

  const manejarBusqueda = (valor) => {
    setBusqueda(valor);
    setPagina(1);
  };


  // =====================================================
  // CREAR / EDITAR
  // =====================================================

  const abrirCrear = () => {
    setFormulario(FORMULARIO_VACIO);
    limpiarValidacion();
    setModal("crear");
  };

  const abrirEditar = (proveedor) => {
    setFormulario({
      id: proveedor.id,
      nombre: proveedor.nombre || "",
      tipo_documento: proveedor.tipo_documento || "NIT",
      documento: proveedor.documento || "",
      contacto: proveedor.contacto || "-",
      telefono: proveedor.telefono || "",
      correo: proveedor.correo || "",
      direccion: proveedor.direccion || "",
      ciudad: proveedor.ciudad || ""
    });
    limpiarValidacion();
    setModal("editar");
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModal(null);
  };

  const filtrarValor = (campo, valor) => {
    if (campo === "nombre" || campo === "contacto" || campo === "ciudad") {
      return valor.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "");
    }
    if (campo === "documento") {
      const tipo = formulario?.tipo_documento || "";
      if (tipo === "NIT") return valor.replace(/[^0-9-]/g, "");
      return valor.replace(/[^0-9]/g, "");
    }
    if (campo === "telefono") {
      return valor.replace(/[^0-9+\s]/g, "");
    }
    return valor;
  };

  const cambiarCampo = (campo, valor) => {
    const valorFiltrado = filtrarValor(campo, valor);
    const siguiente = { ...formulario, [campo]: valorFiltrado };
    setFormulario(siguiente);
    revisarCampo(campo, valorFiltrado, siguiente);
    if (campo === "tipo_documento") {
      revisarCampo("documento", siguiente.documento, siguiente);
    }
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();

    if (!validarTodo(formulario)) return;

    const datos = {
      nombre: formulario.nombre.trim().replace(/\s+/g, " "),
      tipo_documento: formulario.tipo_documento,
      documento: formulario.documento.trim(),
      contacto: formulario.contacto.trim(),
      telefono: formulario.telefono.trim(),
      correo: formulario.correo.trim(),
      direccion: formulario.direccion.trim(),
      ciudad: formulario.ciudad.trim()
    };

    setGuardando(true);
    try {
      if (modal === "editar") {
        await actualizarProveedorAdmin(formulario.id, datos);
        mostrarToast("Proveedor actualizado con Ã©xito");
      } else {
        await crearProveedorAdmin(datos);
        mostrarToast("Proveedor creado con Ã©xito");
      }
      setModal(null);
      recargarLista();
    } catch (error) {
      // El backend indica el campo repetido (nombre o documento):
      // el mensaje queda debajo de ese input.
      if (error.campo) {
        setErrores((previos) => ({
          ...previos,
          [error.campo]: error.message
        }));
      }
      mostrarToast(error.message, "error");
    } finally {
      setGuardando(false);
    }
  };

  // =====================================================
  // ACTIVAR / INACTIVAR (no existe borrado fÃ­sico)
  // =====================================================

  const cambiarEstado = async (proveedor) => {
    try {
      const actualizado = await cambiarEstadoProveedorAdmin(
        proveedor.id,
        !proveedor.estado
      );
      mostrarToast(
        actualizado.estado ? "Proveedor activado" : "Proveedor inactivado"
      );
      recargarLista();
    } catch (error) {
      mostrarToast(error.message, "error");
    }
  };

  // =====================================================
  // DETALLE
  // =====================================================

  const verDetalle = async (proveedor) => {
    setDetalle(null);
    setCargandoDetalle(true);
    setMostrarDetalle(true);
    try {
      const datos = await obtenerProveedorAdmin(proveedor.id);
      setDetalle(datos);
    } catch (error) {
      mostrarToast(error.message, "error");
      setMostrarDetalle(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    setMostrarDetalle(false);
    setDetalle(null);
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (!puedeConsultar) {
    return (
      <div className="proveedores-page">
        <div className="proveedores-header">
          <div className="proveedores-title">
            <h2>Proveedores</h2>
            <p>No tienes permisos para acceder a este mÃ³dulo.</p>
          </div>
        </div>
      </div>
    );
  }

  const resumen = detalle?.resumen_compras || {};

  return (
    <div className="proveedores-page">

      {/* ENCABEZADO */}

      <div className="proveedores-header">

        <div className="proveedores-title">
          <h2>Proveedores</h2>
          <p>Gestiona los proveedores de la tienda y sus datos de contacto.</p>
        </div>

        <div className="proveedores-actions">

          <div className="proveedores-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar proveedores"
              value={busqueda}
              onChange={(e) => manejarBusqueda(e.target.value)}
            />
          </div>

          {puedeCrear && (
            <button
              type="button"
              className="proveedores-add-button"
              onClick={abrirCrear}
            >
              <Plus size={18} />
              Registrar proveedor
            </button>
          )}

        </div>
      </div>

      {/* TABLA */}

      <div className="proveedores-table-container">

        <table className="proveedores-table">

          <thead>
            <tr>
              <th>ID</th>
              <th>NOMBRE</th>
              <th>DOCUMENTO</th>
              <th>CONTACTO</th>
              <th>ESTADO</th>
              <th className="col-acciones">ACCIONES</th>
            </tr>
          </thead>

          <tbody>

            {proveedores.map((proveedor) => (
              <tr key={proveedor.id}>

                <td>
                  <strong className="proveedor-id">{formatearId(proveedor.id)}</strong>
                </td>

                <td>
                  <span className="proveedor-nombre">{proveedor.nombre}</span>
                </td>

                <td>
                  <span className="proveedor-secundario">
                    {proveedor.tipo_documento} {proveedor.documento}
                  </span>
                </td>

                <td>
                  <span className="proveedor-secundario">
                    {proveedor.contacto || "-"}
                  </span>
                </td>


                <td>
                  <div className="proveedor-estado-control">

                    {puedeCambiarEstado && (
                      <button
                        type="button"
                        className={
                          proveedor.estado
                            ? "estado-toggle activo"
                            : "estado-toggle inactivo"
                        }
                        onClick={() => cambiarEstado(proveedor)}
                        title={
                          proveedor.estado
                            ? "Inactivar proveedor"
                            : "Activar proveedor"
                        }
                        aria-label={
                          proveedor.estado
                            ? "Inactivar proveedor"
                            : "Activar proveedor"
                        }
                      >
                        <span className="estado-toggle-circle"></span>
                      </button>
                    )}

                    <span
                      className={
                        proveedor.estado
                          ? "estado-label activo"
                          : "estado-label inactivo"
                      }
                    >
                      {proveedor.estado ? "ACTIVO" : "INACTIVO"}
                    </span>

                  </div>
                </td>

                <td className="col-acciones">
                  <div className="proveedor-actions">

                    <button
                      type="button"
                      title="Ver proveedor"
                      aria-label="Ver proveedor"
                      onClick={() => verDetalle(proveedor)}
                    >
                      <Eye size={18} />
                    </button>

                    {puedeActualizar && (
                      <button
                        type="button"
                        title="Editar proveedor"
                        aria-label="Editar proveedor"
                        onClick={() => abrirEditar(proveedor)}
                      >
                        <Pencil size={18} />
                      </button>
                    )}

                  </div>
                </td>

              </tr>
            ))}

            {!cargando && proveedores.length === 0 && (
              <tr>
                <td colSpan="8" className="proveedores-empty">
                  Proveedor no encontrado en el sistema.
                </td>
              </tr>
            )}

          </tbody>

        </table>

        <Pagination
          currentPage={paginacion.pagina}
          totalPages={paginacion.paginas}
          onPageChange={setPagina}
        />

      </div>

      {/* MODAL CREAR / EDITAR */}

      {modal && (
        <div className="proveedor-modal-overlay">

          <form className="proveedor-modal" onSubmit={guardarProveedor}>

            <div className="proveedor-modal-header">
              <h3>{modal === "editar" ? "Actualizar proveedor" : "Registrar proveedor"}</h3>
              <button
                type="button"
                className="proveedor-modal-close"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="proveedor-modal-body">

              <div className="proveedor-field">
                <label htmlFor="proveedor-nombre">NOMBRE DEL PROVEEDOR</label>
                <input
                  id="proveedor-nombre"
                  type="text"
                  maxLength={150}
                  placeholder="Nombre del proveedor"
                  value={formulario.nombre}
                  disabled={guardando}
                  className={errores.nombre ? "input-error" : ""}
                  onChange={(e) => cambiarCampo("nombre", e.target.value)}
                  onBlur={() => manejarBlur("nombre", formulario.nombre, formulario)}
                />
                {errores.nombre && <span className="error-text">{errores.nombre}</span>}
              </div>

              <div className="proveedor-form-row">

                <div className="proveedor-field">
                  <label htmlFor="proveedor-tipo">TIPO DE DOCUMENTO</label>
                  <select
                    id="proveedor-tipo"
                    value={formulario.tipo_documento}
                    disabled={guardando}
                    onChange={(e) => cambiarCampo("tipo_documento", e.target.value)}
                  >
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div className="proveedor-field">
                  <label htmlFor="proveedor-documento">DOCUMENTO</label>
                  <input
                    id="proveedor-documento"
                    type="text"
                    placeholder="Ej. 900123456-7"
                    maxLength={30}
                    value={formulario.documento}
                    disabled={guardando}
                    className={errores.documento ? "input-error" : ""}
                    onChange={(e) => cambiarCampo("documento", e.target.value)}
                    onBlur={() => manejarBlur("documento", formulario.documento, formulario)}
                  />
                  {errores.documento && <span className="error-text">{errores.documento}</span>}
                </div>

              </div>

              <div className="proveedor-form-row">

                <div className="proveedor-field">
                  <label htmlFor="proveedor-contacto">CONTACTO</label>
                  <input
                    id="proveedor-contacto"
                    type="text"
                    maxLength={100}
                    placeholder="Persona de contacto"
                    value={formulario.contacto}
                    disabled={guardando}
                    onChange={(e) => cambiarCampo("contacto", e.target.value)}
                  />
                </div>

                <div className="proveedor-field">
                  <label htmlFor="proveedor-telefono">TELÉFONO</label>
                  <input
                    id="proveedor-telefono"
                    type="text"
                    maxLength={25}
                    placeholder="+57 300 123 4567"
                    value={formulario.telefono}
                    disabled={guardando}
                    className={errores.telefono ? "input-error" : ""}
                    onChange={(e) => cambiarCampo("telefono", e.target.value)}
                    onBlur={() => manejarBlur("telefono", formulario.telefono, formulario)}
                  />
                  {errores.telefono && <span className="error-text">{errores.telefono}</span>}
                </div>

              </div>

              <div className="proveedor-field">
                <label htmlFor="proveedor-correo">CORREO</label>
                <input
                  id="proveedor-correo"
                  type="email"
                  maxLength={150}
                  placeholder="correo@proveedor.com"
                  value={formulario.correo}
                  disabled={guardando}
                  className={errores.correo ? "input-error" : ""}
                  onChange={(e) => cambiarCampo("correo", e.target.value)}
                  onBlur={() => manejarBlur("correo", formulario.correo, formulario)}
                />
                {errores.correo && <span className="error-text">{errores.correo}</span>}
              </div>

              <div className="proveedor-form-row">

                <div className="proveedor-field">
                  <label htmlFor="proveedor-direccion">DIRECCIÓN</label>
                  <input
                    id="proveedor-direccion"
                    type="text"
                    maxLength={255}
                    value={formulario.direccion}
                    disabled={guardando}
                    onChange={(e) => cambiarCampo("direccion", e.target.value)}
                  />
                </div>

                <div className="proveedor-field">
                  <label htmlFor="proveedor-ciudad">CIUDAD</label>
                  <input
                    id="proveedor-ciudad"
                    type="text"
                    maxLength={100}
                    value={formulario.ciudad}
                    disabled={guardando}
                    onChange={(e) => cambiarCampo("ciudad", e.target.value)}
                  />
                </div>

              </div>

            </div>

            <div className="proveedor-modal-footer">
              <button
                type="button"
                className="proveedor-cancel-button"
                onClick={cerrarModal}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="proveedor-create-button"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : modal === "editar"
                    ? "Guardar cambios"
                    : "Crear proveedor"}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* MODAL DETALLE */}

      {mostrarDetalle && (
        <div className="proveedor-modal-overlay">

          <div className="proveedor-modal">

            <div className="proveedor-modal-header">
              <h3>Detalle del proveedor</h3>
              <button
                type="button"
                className="proveedor-modal-close"
                onClick={cerrarDetalle}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="proveedor-modal-body">

              {(cargandoDetalle || !detalle) && <p>Cargando detalle…</p>}

              {detalle && (
                <>
                  <div className="proveedor-detail-top">
                    <strong>{detalle.nombre}</strong>
                    <span>{formatearId(detalle.id)}</span>
                  </div>

                  <div className="proveedor-info-grid">

                    <div className="proveedor-info">
                      <label>DOCUMENTO</label>
                      <div className="proveedor-info-value">
                        {detalle.tipo_documento} {detalle.documento}
                      </div>
                    </div>

                    <div className="proveedor-info">
                      <label>ESTADO</label>
                      <div className="proveedor-info-value">
                        {detalle.estado_label}
                      </div>
                    </div>

                    <div className="proveedor-info">
                      <label>CONTACTO</label>
                      <div className="proveedor-info-value">
                        {detalle.contacto || "-"}
                      </div>
                    </div>

                    <div className="proveedor-info">
                      <label>TELÉFONO</label>
                      <div className="proveedor-info-value">
                        {detalle.telefono || "-"}
                      </div>
                    </div>

                    <div className="proveedor-info">
                      <label>CORREO</label>
                      <div className="proveedor-info-value">
                        {detalle.correo || "-"}
                      </div>
                    </div>

                    <div className="proveedor-info">
                      <label>CIUDAD Y DIRECCIÓN</label>
                      <div className="proveedor-info-value">
                        {[detalle.ciudad, detalle.direccion].filter(Boolean).join(" · ") || "-"}
                      </div>
                    </div>

                    <div className="proveedor-info">
                      <label>SALDO A FAVOR</label>
                      <div className="proveedor-info-value">
                        {formatearPrecio(detalle.saldo_disponible)}
                      </div>
                    </div>

                    <div className="proveedor-info">
                      <label>COMPRAS (NO ANULADAS)</label>
                      <div className="proveedor-info-value">
                        {resumen.total - resumen.anuladas || 0} Â· {formatearPrecio(resumen.costo_total)}
                      </div>
                    </div>

                  </div>

                  <h4 className="proveedor-seccion-titulo">Ãšltimas compras</h4>

                  {(detalle.ultimas_compras || []).length === 0 ? (
                    <p className="proveedor-vacio">Este proveedor aÃºn no tiene compras.</p>
                  ) : (
                    <div className="proveedor-tabla-scroll">
                      <table className="proveedor-detalle-tabla">
                        <thead>
                          <tr>
                            <th>CÃ“DIGO</th>
                            <th>FECHA</th>
                            <th>ESTADO</th>
                            <th>COSTO FINAL</th>
                            <th>PAGADO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalle.ultimas_compras.map((compra) => (
                            <tr key={compra.id}>
                              <td>{compra.codigo}</td>
                              <td>{compra.fecha}</td>
                              <td>{compra.estado}</td>
                              <td>{formatearPrecio(compra.costo_final)}</td>
                              <td>{formatearPrecio(compra.valor_pagado)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

            </div>

            <div className="proveedor-modal-footer">
              <button
                type="button"
                className="proveedor-cancel-button"
                onClick={cerrarDetalle}
              >
                Cerrar
              </button>
            </div>

          </div>

        </div>
      )}

      <Toast toast={toast} />

    </div>
  );
}
