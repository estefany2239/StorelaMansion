import { jsPDF } from "jspdf";

export const NOMBRE_NEGOCIO_POR_DEFECTO = "Store La Mansión";

const COLORES = {
  cafe: [62, 43, 34],
  cafeSuave: [94, 71, 58],
  beige: [247, 243, 227],
  beigeClaro: [252, 249, 241],
  beigeOscuro: [233, 224, 202],
  dorado: [201, 162, 39],
  texto: [54, 45, 40],
  gris: [116, 106, 98],
  linea: [220, 209, 186],
  blanco: [255, 255, 255]
};

const limpiar = (valor) => {
  if (valor === null || valor === undefined) return "";

  return String(valor).replace(/\u00a0/g, " ").trim();
};

const formatearPrecio = (valor) => {
  const numero = Number(valor) || 0;

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  })
    .format(numero)
    .replace(/\u00a0/g, " ");
};

const formatearFecha = (fecha) => {
  const texto = limpiar(fecha);

  if (!texto) return "";

  const partes = texto.split("-");

  if (partes.length !== 3) return texto;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const filaConValor = (etiqueta, valor) => {
  const contenido = limpiar(valor);

  return contenido ? { etiqueta, valor: contenido } : null;
};

const datosNegocio = (configuracion) => ({
  nombre: limpiar(configuracion?.nombre) || NOMBRE_NEGOCIO_POR_DEFECTO,
  contacto: [
    configuracion?.nit ? `NIT: ${limpiar(configuracion.nit)}` : "",
    limpiar(configuracion?.direccion),
    configuracion?.telefono ? `Tel.: ${limpiar(configuracion.telefono)}` : "",
    limpiar(configuracion?.correo)
  ].filter(Boolean)
});

export const construirComprobantePdf = (venta, configuracion = null) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const margen = 14;
  const anchoContenido = anchoPagina - margen * 2;
  const limiteContenido = altoPagina - 25;
  const negocio = datosNegocio(configuracion);

  doc.setProperties({
    title: `Comprobante de venta ${limpiar(venta.id) || ""}`,
    subject: `Comprobante de venta ${negocio.nombre}`,
    author: negocio.nombre,
    creator: negocio.nombre
  });

  let y = 0;

  const setFuente = (estilo, tamano, color = COLORES.texto) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tamano);
    doc.setTextColor(...color);
  };

  const dibujarCabeceraPrincipal = () => {
    doc.setFillColor(...COLORES.cafe);
    doc.rect(0, 0, anchoPagina, 40, "F");

    doc.setFillColor(...COLORES.dorado);
    doc.rect(0, 40, anchoPagina, 1.5, "F");

    doc.setFillColor(...COLORES.dorado);
    doc.circle(26, 20, 7.2, "F");

    setFuente("bold", 8.5, COLORES.cafe);
    doc.text("LM", 26, 21.4, { align: "center" });

    setFuente("bold", 17, COLORES.blanco);
    doc.text(negocio.nombre, 38, 18.5);

    setFuente("normal", 7.4, COLORES.beigeOscuro);
    doc.text("MODA Y ESTILO", 38, 25);

    setFuente("bold", 7.2, COLORES.dorado);
    doc.text("COMPROBANTE DE VENTA", 38, 33);

    setFuente("normal", 7, COLORES.beigeOscuro);
    doc.text("COMPROBANTE", anchoPagina - margen, 13, { align: "right" });

    setFuente("bold", 13, COLORES.blanco);
    doc.text(limpiar(venta.id) || "—", anchoPagina - margen, 21, {
      align: "right"
    });

    setFuente("normal", 8, COLORES.beige);
    doc.text(`Fecha: ${formatearFecha(venta.fecha) || "—"}`, anchoPagina - margen, 29, {
      align: "right"
    });

    y = 49;

    if (negocio.contacto.length > 0) {
      const textoContacto = negocio.contacto.join("  ·  ");
      const lineas = doc.splitTextToSize(textoContacto, anchoContenido - 8);
      const altoFranja = Math.max(9, 4.8 + lineas.length * 3.7);

      doc.setFillColor(...COLORES.beige);
      doc.rect(0, 41.5, anchoPagina, altoFranja, "F");

      setFuente("normal", 7.1, COLORES.cafeSuave);
      doc.text(lineas, margen + 4, 46.5);

      y = 41.5 + altoFranja + 7;
    }
  };

  const dibujarCabeceraCompacta = () => {
    doc.setFillColor(...COLORES.cafe);
    doc.rect(0, 0, anchoPagina, 20, "F");

    doc.setFillColor(...COLORES.dorado);
    doc.rect(0, 20, anchoPagina, 1.2, "F");

    setFuente("bold", 10.5, COLORES.blanco);
    doc.text(negocio.nombre, margen, 12.5);

    setFuente("normal", 7.4, COLORES.beige);
    doc.text(
      `Comprobante ${limpiar(venta.id) || ""}  ·  ${formatearFecha(venta.fecha)}`,
      anchoPagina - margen,
      12.5,
      { align: "right" }
    );

    y = 29;
  };

  const nuevaPagina = () => {
    doc.addPage();
    dibujarCabeceraCompacta();
  };

  const asegurarEspacio = (alto) => {
    if (y + alto <= limiteContenido) return false;

    nuevaPagina();
    return true;
  };

  const prepararFilas = (filas) => {
    setFuente("normal", 8);
    const anchoValor = 54;

    return filas
      .filter(Boolean)
      .map((fila) => ({
        ...fila,
        lineas: doc.splitTextToSize(fila.valor, anchoValor)
      }));
  };

  const dibujarTarjeta = (x, ancho, titulo, filas) => {
    const altoFilas = filas.reduce(
      (total, fila) => total + Math.max(1, fila.lineas.length) * 4 + 2.1,
      0
    );
    const alto = Math.max(29, 13 + altoFilas);

    doc.setFillColor(...COLORES.beigeClaro);
    doc.roundedRect(x, y, ancho, alto, 2, 2, "F");

    setFuente("bold", 6.8, COLORES.dorado);
    doc.text(titulo, x + 4, y + 6.5);

    doc.setDrawColor(...COLORES.linea);
    doc.setLineWidth(0.2);
    doc.line(x + 4, y + 8.7, x + ancho - 4, y + 8.7);

    let filaY = y + 14.2;

    filas.forEach((fila) => {
      setFuente("bold", 6.1, COLORES.gris);
      doc.text(fila.etiqueta.toUpperCase(), x + 4, filaY);

      setFuente("normal", 7.9, COLORES.texto);
      doc.text(fila.lineas, x + 31, filaY);

      filaY += Math.max(1, fila.lineas.length) * 4 + 2.1;
    });

    return alto;
  };

  const dibujarDatosGenerales = () => {
    const filasCliente = prepararFilas([
      filaConValor("Nombre", venta.clienteNombre || venta.cliente),
      filaConValor("Correo", venta.clienteCorreo),
      filaConValor("Teléfono", venta.clienteTelefono),
      filaConValor("Entrega", venta.clienteDireccion)
    ]);

    const filasVenta = prepararFilas([
      filaConValor("Comprobante", venta.id),
      filaConValor("Pedido", venta.idPedido ? `#${venta.idPedido}` : ""),
      filaConValor("Fecha", formatearFecha(venta.fecha)),
      filaConValor("Método de pago", venta.metodoPago),
      filaConValor(
        "Estado",
        [limpiar(venta.estado), limpiar(venta.estadoPago)]
          .filter(Boolean)
          .join(" · ")
      ),
      filaConValor("Vendedor", venta.vendedor)
    ]);

    setFuente("normal", 8);
    const altoFilas = Math.max(
      filasCliente.reduce(
        (total, fila) => total + Math.max(1, fila.lineas.length) * 4 + 2.1,
        0
      ),
      filasVenta.reduce(
        (total, fila) => total + Math.max(1, fila.lineas.length) * 4 + 2.1,
        0
      )
    );
    const alto = Math.max(29, 13 + altoFilas);

    asegurarEspacio(alto + 8);

    const xDerecha = margen + 93;
    const anchoColumna = 89;

    dibujarTarjeta(margen, anchoColumna, "DATOS DEL CLIENTE", filasCliente);
    dibujarTarjeta(xDerecha, anchoColumna, "DATOS DE LA VENTA", filasVenta);

    y += alto + 8;
  };

  const columnasTabla = [
    { titulo: "REF.", x: 16, align: "left" },
    { titulo: "PRODUCTO", x: 39, align: "left" },
    { titulo: "TALLA", x: 92, align: "center" },
    { titulo: "COLOR", x: 103, align: "left" },
    { titulo: "CANT.", x: 137, align: "right" },
    { titulo: "V. UNITARIO", x: 166, align: "right" },
    { titulo: "SUBTOTAL", x: 194, align: "right" }
  ];

  const dibujarCabeceraTabla = () => {
    doc.setFillColor(...COLORES.beige);
    doc.rect(margen, y, anchoContenido, 7, "F");

    setFuente("bold", 6.4, COLORES.cafe);

    columnasTabla.forEach((columna) => {
      doc.text(columna.titulo, columna.x, y + 4.6, {
        align: columna.align
      });
    });

    y += 7;
  };

  const dibujarTablaProductos = () => {
    asegurarEspacio(27);

    setFuente("bold", 8.5, COLORES.dorado);
    doc.text("DETALLE DE PRODUCTOS", margen, y);

    doc.setDrawColor(...COLORES.dorado);
    doc.setLineWidth(0.4);
    doc.line(margen + 43, y - 1, anchoPagina - margen, y - 1);

    y += 7;
    dibujarCabeceraTabla();

    (venta.productos || []).forEach((producto, indice) => {
      setFuente("normal", 7.6);

      const codigo = limpiar(producto.codigo) || "—";
      const nombre = limpiar(producto.nombre) || "—";
      const talla = limpiar(producto.talla) || "—";
      const color = limpiar(producto.color) || "—";
      const cantidad = Number(producto.cantidad) || 0;
      const precio = Number(producto.precio) || 0;
      const subtotal =
        Number(producto.subtotal) || Number(precio) * Number(cantidad);

      const lineasCodigo = doc.splitTextToSize(codigo, 20);
      const lineasNombre = doc.splitTextToSize(nombre, 48);
      const lineasColor = doc.splitTextToSize(color, 23);
      const altoFila = Math.max(
        8,
        Math.max(
          lineasCodigo.length,
          lineasNombre.length,
          lineasColor.length
        ) *
          4 +
          3.6
      );

      if (y + altoFila > limiteContenido) {
        nuevaPagina();
        dibujarCabeceraTabla();
      }

      if (indice % 2 === 0) {
        doc.setFillColor(...COLORES.beigeClaro);
        doc.rect(margen, y, anchoContenido, altoFila, "F");
      }

      const base = y + 4.4;

      setFuente("normal", 6.4, COLORES.cafeSuave);
      doc.text(lineasCodigo, 16, base);

      setFuente("bold", 7.3, COLORES.texto);
      doc.text(lineasNombre, 39, base);

      setFuente("normal", 7, COLORES.texto);
      doc.text(talla, 92, base, { align: "center" });
      doc.text(lineasColor, 103, base);
      doc.text(String(cantidad), 137, base, { align: "right" });

      setFuente("normal", 6.9, COLORES.texto);
      doc.text(formatearPrecio(precio), 166, base, { align: "right" });
      doc.text(formatearPrecio(subtotal), 194, base, { align: "right" });

      doc.setDrawColor(...COLORES.linea);
      doc.setLineWidth(0.15);
      doc.line(margen, y + altoFila, anchoPagina - margen, y + altoFila);

      y += altoFila;
    });

    y += 3;
  };

  const dibujarResumen = () => {
    const subtotalProductos = (venta.productos || []).reduce(
      (total, producto) =>
        total +
        (Number(producto.subtotal) ||
          Number(producto.precio) * Number(producto.cantidad) ||
          0),
      0
    );

    const subtotal =
      venta.subtotal !== null && venta.subtotal !== undefined
        ? Number(venta.subtotal) || 0
        : subtotalProductos;
    const descuento = Number(venta.descuento) || 0;
    const iva = Number(venta.iva) || 0;
    const costoEnvio = Number(venta.costoEnvio) || 0;
    const total = Number(venta.total) || 0;
    const abonado = Number(venta.abonado) || 0;
    const abonos = Array.isArray(venta.abonos) ? venta.abonos : [];
    const saldoPendiente =
      venta.saldoPendiente !== null && venta.saldoPendiente !== undefined
        ? Number(venta.saldoPendiente) || 0
        : Math.max(total - abonado, 0);
    const mostrarAbonos = abonado > 0 || abonos.length > 0;

    const filas = [{ etiqueta: "Subtotal", valor: formatearPrecio(subtotal) }];

    if (descuento > 0) {
      filas.push({
        etiqueta: "Descuento",
        valor: `- ${formatearPrecio(descuento)}`
      });
    }

    if (iva > 0) {
      filas.push({ etiqueta: "IVA", valor: formatearPrecio(iva) });
    }

    if (costoEnvio > 0) {
      filas.push({ etiqueta: "Envío", valor: formatearPrecio(costoEnvio) });
    }

    filas.push({
      etiqueta: "Total",
      valor: formatearPrecio(total),
      destacada: true
    });

    if (mostrarAbonos) {
      if (abonado > 0) {
        filas.push({
          etiqueta: "Abonado",
          valor: `- ${formatearPrecio(abonado)}`
        });
      }

      filas.push({
        etiqueta: "Saldo pendiente",
        valor: formatearPrecio(saldoPendiente),
        saldo: true
      });
    }

    const altoCaja = 6 + filas.length * 6;
    const altoResumen = Math.max(34, altoCaja + 3);

    asegurarEspacio(altoResumen + 8);

    const xCaja = anchoPagina - margen - 88;
    const yInicio = y;

    setFuente("bold", 7.3, COLORES.dorado);
    doc.text("RESUMEN DE PAGO", xCaja, yInicio);

    doc.setFillColor(...COLORES.beige);
    doc.roundedRect(xCaja, yInicio + 3, 88, altoCaja, 2, 2, "F");

    let filaY = yInicio + 10;

    filas.forEach((fila) => {
      if (fila.destacada) {
        doc.setDrawColor(...COLORES.dorado);
        doc.setLineWidth(0.35);
        doc.line(xCaja + 4, filaY - 3.6, xCaja + 84, filaY - 3.6);
        setFuente("bold", 10, COLORES.cafe);
      } else if (fila.saldo) {
        setFuente("bold", 8.7, COLORES.cafe);
      } else {
        setFuente("normal", 8, COLORES.gris);
      }

      doc.text(fila.etiqueta, xCaja + 5, filaY);
      doc.text(fila.valor, xCaja + 83, filaY, { align: "right" });

      filaY += 6;
    });

    const xNotas = margen;
    const anchoNotas = xCaja - margen - 10;

    setFuente("bold", 7.3, COLORES.dorado);
    doc.text(venta.estado === "Anulada" ? "VENTA ANULADA" : "GRACIAS POR SU COMPRA", xNotas, y + 6);

    setFuente("normal", 7.4, COLORES.cafeSuave);
    const nota = doc.splitTextToSize(
      venta.estado === "Anulada"
        ? "Este comprobante corresponde a una venta anulada y no representa un cobro vigente."
        : "Conserve este comprobante como soporte de su compra. Documento generado automáticamente.",
      anchoNotas
    );
    doc.text(nota, xNotas, y + 13);

    y = yInicio + altoResumen + 8;
  };

  const dibujarPies = () => {
    const totalPaginas = doc.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
      doc.setPage(pagina);

      doc.setDrawColor(...COLORES.linea);
      doc.setLineWidth(0.3);
      doc.line(margen, altoPagina - 16, anchoPagina - margen, altoPagina - 16);

      setFuente("normal", 6.5, COLORES.gris);
      doc.text(
        `${negocio.nombre}  ·  Comprobante ${limpiar(venta.id) || ""}`,
        margen,
        altoPagina - 11
      );
      doc.text(
        `Página ${pagina} de ${totalPaginas}`,
        anchoPagina - margen,
        altoPagina - 11,
        { align: "right" }
      );
    }
  };

  dibujarCabeceraPrincipal();
  dibujarDatosGenerales();
  dibujarTablaProductos();
  dibujarResumen();
  dibujarPies();

  return doc;
};
