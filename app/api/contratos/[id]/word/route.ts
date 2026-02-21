import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  ShadingType,
} from "docx";

// GET /api/contratos/[id]/word — genera y descarga el contrato en .docx
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contrato_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipo = user.user_metadata?.tipo_usuario;
  if (tipo !== "ph_admin" && tipo !== "empresa" && tipo !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Obtener contrato con todas las relaciones
  const { data: contrato, error } = await supabase
    .from("contratos")
    .select(`
      *,
      licitaciones (
        titulo, categoria, descripcion, duracion_contrato_meses,
        condiciones_especiales,
        propiedades_horizontales (
          nombre, direccion, ciudad, provincia, ruc, telefono, email_contacto
        )
      ),
      empresas (
        nombre, ruc, representante_legal, email, telefono, direccion
      )
    `)
    .eq("id", contrato_id)
    .single();

  if (error || !contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  // Verificar acceso: ph_admin solo ve sus contratos, empresa solo los suyos
  if (tipo === "ph_admin") {
    const { data: ph } = await supabase
      .from("propiedades_horizontales")
      .select("id")
      .eq("admin_id", user.id)
      .single();
    if (!ph || contrato.ph_id !== ph.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  } else if (tipo === "empresa") {
    const { data: emp } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", user.id)
      .single();
    if (!emp || contrato.empresa_id !== emp.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const lic = contrato.licitaciones as any;
  const ph = lic?.propiedades_horizontales as any;
  const emp = contrato.empresas as any;

  const fmt = (n: number | null | undefined) =>
    n != null ? `$${n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";

  const fmtFecha = (s: string | null | undefined) => {
    if (!s) return "—";
    const d = new Date(s + "T12:00:00");
    return d.toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" });
  };

  const modalidadLabel: Record<string, string> = {
    mensual: "Mensual",
    bimestral: "Bimestral",
    "50/50": "50% al inicio, 50% a mitad de período",
    "70/30": "70% al inicio, 30% al final",
    adelantado: "Pago adelantado al inicio del período",
    personalizado: contrato.detalle_pago ?? "Según acuerdo",
  };

  const categoriaLabel: Record<string, string> = {
    seguridad: "Seguridad y Vigilancia",
    limpieza: "Limpieza y Aseo General",
    mantenimiento: "Mantenimiento General",
    electricidad: "Electricidad e Instalaciones",
    plomeria: "Plomería y Sistemas Hidráulicos",
    ascensores: "Ascensores y Escaleras Mecánicas",
    hvac: "HVAC / Climatización / Ventilación",
    areas_verdes: "Jardinería y Áreas Verdes",
    piscina: "Mantenimiento de Piscina",
    fumigacion: "Fumigación y Control de Plagas",
    pintura: "Pintura y Acabados",
    administracion: "Administración de PH",
    auditoria: "Auditoría y Contabilidad",
    legal: "Servicios Legales",
    seguros: "Seguros",
    control_acceso: "Control de Acceso",
    cctv: "CCTV y Videovigilancia",
    remodelacion: "Remodelaciones y Obras Civiles",
    generadores: "Generadores y UPS",
    telecomunicaciones: "Telecomunicaciones / Internet",
    otros: "Otros Servicios",
  };

  // ─── HELPERS DOCX ─────────────────────────────────────────────────────────

  const titulo = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
    });

  const subtitulo = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: 26, color: "1A1A1A" })],
      spacing: { before: 320, after: 120 },
      border: {
        bottom: { color: "C9A84C", space: 1, style: BorderStyle.SINGLE, size: 4 },
      },
    });

  const parrafo = (text: string, options?: { bold?: boolean; italic?: boolean; size?: number }) =>
    new Paragraph({
      children: [
        new TextRun({
          text,
          size: options?.size ?? 22,
          bold: options?.bold,
          italics: options?.italic,
          color: "2D2D2D",
        }),
      ],
      spacing: { before: 80, after: 80 },
      alignment: AlignmentType.JUSTIFIED,
    });

  const lineaEnBlanco = () => new Paragraph({ text: "", spacing: { before: 60, after: 60 } });

  const clausula = (num: string, titulo_: string, cuerpo: string) => [
    new Paragraph({
      children: [
        new TextRun({ text: `CLÁUSULA ${num} — `, bold: true, size: 23, color: "1A1A1A" }),
        new TextRun({ text: titulo_.toUpperCase(), bold: true, size: 23, color: "1A1A1A" }),
      ],
      spacing: { before: 260, after: 100 },
    }),
    parrafo(cuerpo),
  ];

  const tablaInfo = (filas: [string, string][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: filas.map(([label, val]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: "F5F0E8" },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true, size: 20, color: "4A3800" })],
                  spacing: { before: 60, after: 60 },
                }),
              ],
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: val || "—", size: 20, color: "2D2D2D" })],
                  spacing: { before: 60, after: 60 },
                }),
              ],
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
            }),
          ],
        })
      ),
    });

  // ─── DOCUMENTO ────────────────────────────────────────────────────────────

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: "2D2D2D" },
          paragraph: { spacing: { line: 276 } },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: {
            font: "Calibri",
            size: 32,
            bold: true,
            color: "1A1A1A",
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "LicitaPH — Contrato de Servicios", size: 18, color: "888888" }),
                  new TextRun({ text: "   |   ", size: 18, color: "CCCCCC" }),
                  new TextRun({ text: lic?.titulo ?? "", size: 18, color: "888888" }),
                ],
                alignment: AlignmentType.RIGHT,
                border: {
                  bottom: { color: "E0D5C0", space: 1, style: BorderStyle.SINGLE, size: 2 },
                },
                spacing: { after: 200 },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Página ", size: 18, color: "888888" }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: "888888",
                  }),
                  new TextRun({ text: " de ", size: 18, color: "888888" }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: "888888",
                  }),
                  new TextRun({ text: "   |   licitaph.vercel.app", size: 18, color: "BBBBBB" }),
                ],
                alignment: AlignmentType.CENTER,
                border: {
                  top: { color: "E0D5C0", space: 1, style: BorderStyle.SINGLE, size: 2 },
                },
                spacing: { before: 200 },
              }),
            ],
          }),
        },
        children: [
          // ── PORTADA ──────────────────────────────────────────────────────
          lineaEnBlanco(),
          lineaEnBlanco(),
          lineaEnBlanco(),
          new Paragraph({
            children: [new TextRun({ text: "CONTRATO DE PRESTACIÓN DE SERVICIOS", bold: true, size: 36, color: "1A1A1A", font: "Calibri" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 160 },
          }),
          new Paragraph({
            children: [new TextRun({ text: categoriaLabel[lic?.categoria] ?? lic?.categoria ?? "Servicios", size: 26, color: "C9A84C", font: "Calibri" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 480 },
          }),
          tablaInfo([
            ["Propiedad Horizontal", ph?.nombre ?? "—"],
            ["Empresa Contratada", emp?.nombre ?? "—"],
            ["Fecha de Inicio", fmtFecha(contrato.fecha_inicio)],
            ["Fecha de Fin", fmtFecha(contrato.fecha_fin)],
            ["Valor Anual del Contrato", fmt(contrato.valor_anual)],
            ["Número de Contrato", contrato.id.substring(0, 8).toUpperCase()],
          ]),
          lineaEnBlanco(),
          lineaEnBlanco(),
          new Paragraph({
            children: [new TextRun({ text: `Generado el ${fmtFecha(new Date().toISOString())} mediante LicitaPH`, size: 18, color: "AAAAAA", italics: true })],
            alignment: AlignmentType.CENTER,
          }),

          // ── SALTO DE PÁGINA ──────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),

          // ── SECCIÓN 1: PARTES ────────────────────────────────────────────
          subtitulo("I. PARTES CONTRATANTES"),
          parrafo(
            `El presente contrato de prestación de servicios (el "Contrato") se celebra entre:`,
          ),
          lineaEnBlanco(),
          parrafo(`PARTE CONTRATANTE (Propiedad Horizontal):`, { bold: true }),
          tablaInfo([
            ["Nombre", ph?.nombre ?? "—"],
            ["Dirección", ph?.direccion ?? "—"],
            ["Ciudad / Provincia", `${ph?.ciudad ?? "—"} / ${ph?.provincia ?? "—"}`],
            ["RUC", ph?.ruc ?? "—"],
            ["Teléfono", ph?.telefono ?? "—"],
            ["Email de contacto", ph?.email_contacto ?? "—"],
          ]),
          lineaEnBlanco(),
          parrafo(`PARTE CONTRATADA (Empresa de Servicios):`, { bold: true }),
          tablaInfo([
            ["Razón Social", emp?.nombre ?? "—"],
            ["Representante Legal", emp?.representante_legal ?? "—"],
            ["RUC", emp?.ruc ?? "—"],
            ["Dirección", emp?.direccion ?? "—"],
            ["Teléfono", emp?.telefono ?? "—"],
            ["Email", emp?.email ?? "—"],
          ]),

          // ── SECCIÓN 2: OBJETO ────────────────────────────────────────────
          subtitulo("II. OBJETO DEL CONTRATO"),
          ...clausula("PRIMERA", "Objeto",
            `La Parte Contratada se obliga a prestar los servicios de ${categoriaLabel[lic?.categoria] ?? lic?.categoria ?? "servicios"} a la Propiedad Horizontal "${ph?.nombre ?? ""}", según las condiciones establecidas en el presente contrato y las especificaciones técnicas acordadas durante el proceso de licitación denominado "${lic?.titulo ?? ""}".`
          ),
          ...(lic?.descripcion ? [
            lineaEnBlanco(),
            parrafo("Descripción del servicio:"),
            parrafo(lic.descripcion, { italic: true }),
          ] : []),

          // ── SECCIÓN 3: PLAZO ─────────────────────────────────────────────
          subtitulo("III. PLAZO"),
          ...clausula("SEGUNDA", "Vigencia",
            `El presente contrato tendrá una vigencia de ${lic?.duracion_contrato_meses ?? 12} meses, iniciando el ${fmtFecha(contrato.fecha_inicio)} y finalizando el ${fmtFecha(contrato.fecha_fin)}, salvo que alguna de las partes notifique por escrito su intención de no renovar con un mínimo de treinta (30) días calendario de anticipación al vencimiento.`
          ),
          ...clausula("TERCERA", "Renovación",
            `Al vencimiento del plazo establecido, el contrato podrá renovarse por períodos iguales mediante acuerdo escrito de ambas partes. En ausencia de notificación de no renovación, el contrato continuará en los mismos términos y condiciones por un período adicional de doce (12) meses.`
          ),

          // ── SECCIÓN 4: VALOR ─────────────────────────────────────────────
          subtitulo("IV. VALOR Y CONDICIONES DE PAGO"),
          ...clausula("CUARTA", "Valor del Contrato",
            `El valor total anual del presente contrato es de ${fmt(contrato.valor_anual)}, equivalente a ${fmt(contrato.monto_mensual)} mensuales, más los impuestos que correspondan conforme a la legislación panameña vigente.`
          ),
          ...clausula("QUINTA", "Modalidad de Pago",
            `Las partes acuerdan la siguiente modalidad de pago: ${modalidadLabel[contrato.modalidad_pago ?? "mensual"] ?? "Mensual"}. ${contrato.detalle_pago ? `Detalle adicional: ${contrato.detalle_pago}` : ""}`.trim()
          ),
          ...clausula("SEXTA", "Facturación",
            `La Parte Contratada emitirá las facturas correspondientes de conformidad con la modalidad de pago pactada. La Parte Contratante deberá efectuar los pagos dentro de los treinta (30) días calendario siguientes a la recepción de cada factura.`
          ),

          // ── SECCIÓN 5: OBLIGACIONES ──────────────────────────────────────
          subtitulo("V. OBLIGACIONES DE LAS PARTES"),
          ...clausula("SÉPTIMA", "Obligaciones de la Parte Contratada",
            `La Parte Contratada se obliga a: (a) Prestar los servicios de manera profesional, oportuna y continua; (b) Mantener el personal idóneo y con las certificaciones vigentes requeridas para la prestación del servicio; (c) Cumplir con todas las normas de seguridad, salud ocupacional y medioambientales aplicables; (d) Mantener vigentes los seguros de responsabilidad civil y demás pólizas requeridas; (e) Informar con antelación cualquier situación que pueda afectar la normal prestación del servicio; (f) Designar un supervisor responsable de las operaciones en las instalaciones de la Propiedad Horizontal.`
          ),
          ...clausula("OCTAVA", "Obligaciones de la Parte Contratante",
            `La Parte Contratante se obliga a: (a) Efectuar los pagos en los plazos convenidos; (b) Facilitar a la Parte Contratada el acceso a las áreas necesarias para la prestación del servicio; (c) Proveer un punto de contacto responsable para la coordinación operativa; (d) Notificar con la debida anticipación cualquier situación especial que pueda afectar el desarrollo de los servicios.`
          ),

          // ── SECCIÓN 6: PENALIDADES ───────────────────────────────────────
          subtitulo("VI. PENALIDADES Y CAUSALES DE RESCISIÓN"),
          ...clausula("NOVENA", "Penalidades por Incumplimiento",
            `En caso de incumplimiento imputable a la Parte Contratada, ésta deberá pagar una penalidad equivalente al ${contrato.penalidad_porcentaje ?? 10}% del valor mensual del contrato por cada mes o fracción de mes en que se mantenga el incumplimiento, sin perjuicio de las demás acciones legales que correspondan.`
          ),
          ...clausula("DÉCIMA", "Causales de Rescisión",
            `Cualquiera de las partes podrá rescindir el presente contrato sin responsabilidad en caso de: (a) Incumplimiento grave y reiterado de las obligaciones pactadas; (b) Cesación de operaciones o quiebra de alguna de las partes; (c) Caso fortuito o fuerza mayor que impida la ejecución del contrato por más de sesenta (60) días calendario. La parte que rescinda deberá notificarlo por escrito con treinta (30) días de anticipación, salvo en casos de incumplimiento grave donde la rescisión será inmediata.`
          ),

          // ── SECCIÓN 7: CONDICIONES ESPECIALES ───────────────────────────
          ...(lic?.condiciones_especiales || contrato.condiciones_especiales ? [
            subtitulo("VII. CONDICIONES ESPECIALES"),
            ...clausula("DECIMOPRIMERA", "Condiciones Específicas Acordadas",
              [lic?.condiciones_especiales, contrato.condiciones_especiales].filter(Boolean).join("\n\n")
            ),
          ] : []),

          // ── SECCIÓN 8: DISPOSICIONES GENERALES ──────────────────────────
          subtitulo(`${lic?.condiciones_especiales || contrato.condiciones_especiales ? "VIII" : "VII"}. DISPOSICIONES GENERALES`),
          ...clausula("DECIMOSEGUNDA", "Legislación Aplicable",
            `El presente contrato se rige por las leyes de la República de Panamá. Las partes acuerdan someter cualquier controversia derivada de este contrato a los tribunales competentes de la ciudad de ${ph?.ciudad ?? "Panamá"}.`
          ),
          ...clausula("DECIMOTERCERA", "Confidencialidad",
            `Las partes se obligan a mantener la más estricta confidencialidad sobre toda la información a la que tengan acceso en virtud de la ejecución del presente contrato, tanto durante su vigencia como por un período de dos (2) años posteriores a su terminación.`
          ),
          ...clausula("DECIMOCUARTA", "Integridad del Acuerdo",
            `El presente contrato constituye el acuerdo íntegro entre las partes respecto al objeto del mismo y deja sin efecto cualquier acuerdo o negociación anterior. Cualquier modificación deberá constar por escrito y ser suscrita por los representantes autorizados de ambas partes.`
          ),

          // ── FIRMAS ───────────────────────────────────────────────────────
          new Paragraph({ children: [new PageBreak()] }),
          subtitulo("FIRMAS DE LAS PARTES"),
          parrafo(
            `En señal de conformidad con todos los términos y condiciones del presente contrato, las partes lo suscriben en la ciudad de ${ph?.ciudad ?? "Panamá"}, a los _____ días del mes de _____________ del año _______.`,
          ),
          lineaEnBlanco(),
          lineaEnBlanco(),
          lineaEnBlanco(),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({ text: "_".repeat(40), spacing: { after: 80 } }),
                      new Paragraph({ children: [new TextRun({ text: ph?.nombre ?? "Propiedad Horizontal", bold: true, size: 20 })], spacing: { after: 40 } }),
                      new Paragraph({ children: [new TextRun({ text: "Parte Contratante", size: 18, color: "888888" })], spacing: { after: 40 } }),
                      new Paragraph({ children: [new TextRun({ text: `Firma y sello`, size: 18, color: "AAAAAA" }) ]} ),
                    ],
                  }),
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [new Paragraph({ text: "" })],
                  }),
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({ text: "_".repeat(40), spacing: { after: 80 } }),
                      new Paragraph({ children: [new TextRun({ text: emp?.nombre ?? "Empresa", bold: true, size: 20 })], spacing: { after: 40 } }),
                      new Paragraph({ children: [new TextRun({ text: "Parte Contratada", size: 18, color: "888888" })], spacing: { after: 40 } }),
                      new Paragraph({ children: [new TextRun({ text: emp?.representante_legal ? `Rep. Legal: ${emp.representante_legal}` : "Representante Legal", size: 18, color: "AAAAAA" })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          lineaEnBlanco(),
          lineaEnBlanco(),
          new Paragraph({
            children: [new TextRun({ text: "Testigo: _______________________________   Cédula: ___________________", size: 20, color: "666666" })],
            spacing: { before: 200 },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const uint8 = new Uint8Array(buffer);

  const nombreArchivo = `Contrato-${(emp?.nombre ?? "empresa").replace(/[^a-zA-Z0-9]/g, "-")}-${contrato.id.substring(0, 8).toUpperCase()}.docx`;

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Content-Length": uint8.length.toString(),
    },
  });
}
