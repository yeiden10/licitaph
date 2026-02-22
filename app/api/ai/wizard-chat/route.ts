import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface WizardChatRequest {
  messages: Message[];
  step: "chat" | "requisitos";
  // Para el paso de requisitos, necesitamos el contexto del chat
  contextoChatResumen?: string;
  categoria?: string;
  titulo?: string;
  descripcion?: string;
  presupuesto_maximo?: number | null;
}

const SYSTEM_CHAT = `Eres un asistente experto en administración de Propiedades Horizontales (PH) en Panamá con 20 años de experiencia elaborando licitaciones profesionales.

Tu misión es ayudar al administrador a definir los detalles de una licitación haciéndole preguntas concretas y útiles, incluyendo preguntas para PREVENIR COBROS ADICIONALES no contemplados.

REGLAS IMPORTANTES:
1. Haz UNA sola pregunta a la vez. No hagas múltiples preguntas en el mismo mensaje.
2. Sé breve y directo. Máximo 2-3 oraciones por respuesta.
3. Cuando tengas suficiente información (después de 4-6 intercambios), genera la propuesta de licitación en formato JSON.
4. Habla en español panameño, usa "B/." para Balboas/USD.
5. Adapta tus preguntas según el tipo de servicio mencionado.

FLUJO DE PREGUNTAS SUGERIDO:
1. Si el usuario no mencionó el servicio específico: pregunta qué servicio necesita.
2. Si mencionó el servicio: pregunta sobre el tamaño del edificio (unidades / pisos / área).
3. Luego: PREGUNTA ANTI-ADICIONALES específica según la categoría (ver tabla abajo).
4. Luego: condiciones especiales o urgencias.
5. Con esa info: genera la propuesta JSON.

PREGUNTAS ANTI-ADICIONALES POR CATEGORÍA (haz la más relevante):
- seguridad: "¿El precio debe incluir los uniformes del personal, equipo de comunicación y libretas de novedades? ¿O eso lo pone el PH?"
- limpieza: "¿El precio del servicio debe incluir los productos de limpieza e insumos (escobas, trapeadores, bolsas) o esos los suministra el PH?"
- hvac: "¿El contrato debe incluir los repuestos para mantenimientos preventivos y mano de obra en reparaciones correctivas, o solo el mantenimiento preventivo?"
- ascensores: "¿La cotización debe incluir repuestos menores y mano de obra en emergencias, o solo el mantenimiento preventivo programado?"
- jardineria: "¿El precio debe incluir plantas, tierra, abono y herramientas, o solo la mano de obra de jardinería?"
- piscinas: "¿El precio debe incluir los químicos del tratamiento del agua, o solo el servicio de limpieza y mantenimiento?"
- electricidad: "¿El precio debe incluir materiales eléctricos de consumo regular (breakers, cables, tuberías), o solo la mano de obra?"
- cctv: "¿El contrato debe incluir el mantenimiento del sistema existente, o también equipos nuevos? ¿Incluye monitoreo remoto?"
- generadores: "¿El precio debe incluir el combustible para pruebas de carga y emergencias, o solo el mantenimiento del equipo?"
- fumigacion: "¿El precio debe incluir los productos fumigantes y materiales de aplicación, o solo el servicio de aplicación?"
- pintura: "¿El precio debe incluir todos los materiales (pintura, rodillos, masilla), o solo la mano de obra?"
- impermeabilizacion: "¿El precio debe incluir los materiales impermeabilizantes y accesorios, o solo la mano de obra de aplicación?"
- conserje: "¿El precio debe incluir los uniformes del personal, o eso lo provee el PH?"
- valet: "¿El precio incluye seguros de responsabilidad civil por daños a vehículos, o ese seguro lo tiene el PH?"
- administracion: "¿El precio incluye software de administración, honorarios de contador y servicios bancarios, o solo la gestión administrativa?"
- DEFAULT: "¿El precio del servicio debe ser todo incluido (materiales, insumos, mano de obra) o habrá costos adicionales por materiales?"

CUANDO GENERES LA PROPUESTA, responde SOLO con este JSON (sin texto adicional, sin markdown):
{
  "listo": true,
  "propuesta": {
    "titulo": "Título profesional de la licitación",
    "categoria": "uno_de: seguridad|limpieza|hvac|jardineria|ascensores|electricidad|pintura|plagas|piscinas|impermeabilizacion|portones|cctv|incendio|generadores|fumigacion|mudanzas|valet|conserje|obras_civiles|tecnologia|gestion_residuos|energia_solar|administracion|legal_contable|otros",
    "descripcion": "Descripción técnica detallada del servicio requerido, incluyendo características del edificio y necesidades específicas. 3-5 oraciones.",
    "presupuesto_minimo": 0,
    "presupuesto_maximo": 0,
    "duracion_contrato_meses": 12,
    "urgente": false,
    "condiciones_especiales": "Condiciones o notas importantes basadas en lo que el admin respondió",
    "clausulas_anti_adicionales": ["Lista de cláusulas concretas basadas en las respuestas del admin. Ej: 'El precio mensual debe incluir todos los uniformes y equipos del personal de seguridad'", "Ej: 'Los productos de limpieza, insumos y equipos son responsabilidad de la empresa contratada'"],
    "resumen_para_requisitos": "Resumen en 1 párrafo de todo el contexto de esta licitación, para que pueda generar los requisitos del pliego"
  },
  "mensaje_final": "Mensaje amigable explicando lo que generaste, mencionando las cláusulas de alcance que se generaron para evitar cobros adicionales"
}

IMPORTANTE: clausulas_anti_adicionales debe contener 2-4 cláusulas específicas basadas en lo que el admin respondió. Si el admin dijo que los materiales están incluidos, genera la cláusula correspondiente. Si el admin dijo que no, no la incluyas.

Si no tienes suficiente info todavía, responde con texto normal (sin JSON) haciendo la siguiente pregunta.`;

// SYSTEM_REQUISITOS se genera dinámicamente con escala de presupuesto
function getSystemRequisitos(presupuesto_maximo?: number | null): string {
  // Determinar escala según presupuesto anual
  let escala = "mediana";
  let polizaMin = "B/. 50,000";
  let experienciaMin = "3 años";
  let cantidadReqs = "6 y 10";
  let nivelExigencia = "razonable para el valor del contrato";

  if (presupuesto_maximo && presupuesto_maximo > 0) {
    if (presupuesto_maximo < 2000) {
      // Trabajo pequeño: piso, reparación menor, etc.
      escala = "pequeña";
      polizaMin = "B/. 10,000";
      experienciaMin = "1 año";
      cantidadReqs = "4 y 7";
      nivelExigencia = "apropiado para un contrato pequeño (bajo B/. 2,000/año). NO pidas pólizas de 100k ni fianzas excesivas para trabajos menores.";
    } else if (presupuesto_maximo < 10000) {
      // Trabajo mediano: limpieza, seguridad edificio pequeño
      escala = "mediana";
      polizaMin = "B/. 25,000";
      experienciaMin = "2 años";
      cantidadReqs = "5 y 9";
      nivelExigencia = "proporcional a un contrato de entre B/. 2,000 y B/. 10,000/año";
    } else if (presupuesto_maximo < 50000) {
      // Trabajo grande: seguridad edificio grande, HVAC, etc.
      escala = "grande";
      polizaMin = "B/. 50,000";
      experienciaMin = "3 años";
      cantidadReqs = "7 y 12";
      nivelExigencia = "apropiado para un contrato de entre B/. 10,000 y B/. 50,000/año";
    } else {
      // Megaproyecto
      escala = "gran empresa";
      polizaMin = "B/. 100,000";
      experienciaMin = "5 años";
      cantidadReqs = "8 y 14";
      nivelExigencia = "apropiado para un contrato mayor de B/. 50,000/año";
    }
  }

  return `Eres un experto en pliegos de cargos para Propiedades Horizontales en Panamá.

Basándote en el contexto de la licitación, genera una lista de requisitos específicos y relevantes para el servicio.

ESCALA DEL CONTRATO: ${escala}
Presupuesto de referencia: ${presupuesto_maximo ? `B/. ${presupuesto_maximo.toLocaleString()}/año` : "no especificado"}
Nivel de exigencia: ${nivelExigencia}
Póliza de responsabilidad civil mínima recomendada: ${polizaMin}
Experiencia mínima recomendada: ${experienciaMin}

Responde ÚNICAMENTE con este JSON (sin markdown, sin texto adicional):
{
  "requisitos": [
    {
      "titulo": "Nombre corto del requisito",
      "descripcion": "Descripción clara de qué se necesita y por qué",
      "obligatorio": true,
      "subsanable": false,
      "tipo_respuesta": "documento"
    }
  ]
}

REGLAS:
- tipo_respuesta: "documento" para certificados/pólizas/cartas, "texto" para declaraciones/metodologías
- obligatorio: true para los críticos para este servicio específico
- subsanable: true si puede entregarse después con un plazo razonable
- Genera entre ${cantidadReqs} requisitos específicos para este tipo de servicio
- NO incluyas los requisitos legales básicos (Registro Público, Paz y Salvo CSS/DGI, cédula) porque ya están en la lista estándar
- Enfócate en requisitos TÉCNICOS y ESPECÍFICOS para este servicio
- Adapta al contexto panameño (AOTC para ascensores, CSS, MITRADEL, etc.)
- IMPORTANTE: Los requisitos deben ser PROPORCIONALES al tamaño y valor del contrato. Para contratos pequeños, NO pidas pólizas millonarias ni fianzas excesivas.`;
}

export async function POST(request: NextRequest) {
  const body: WizardChatRequest = await request.json();
  const { messages, step, contextoChatResumen, categoria, titulo, descripcion, presupuesto_maximo } = body;

  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback sin API key
    if (step === "requisitos") {
      return NextResponse.json({
        tipo: "requisitos",
        requisitos: getFallbackRequisitos(categoria || "otros", presupuesto_maximo),
      });
    }
    return NextResponse.json({
      tipo: "texto",
      mensaje: "¡Hola! ¿Qué tipo de servicio necesitas contratar para tu edificio?",
    });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    if (step === "requisitos") {
      // Generar requisitos específicos basados en el contexto, proporcionales al presupuesto
      const presupuestoStr = presupuesto_maximo
        ? `\nPresupuesto máximo anual: B/. ${presupuesto_maximo.toLocaleString()}`
        : "";

      const contextMsg = contextoChatResumen
        ? `Contexto de la licitación: ${contextoChatResumen}\nCategoría: ${categoria || "general"}\nTítulo: ${titulo || ""}\nDescripción: ${descripcion || ""}${presupuestoStr}`
        : `Categoría: ${categoria || "general"}\nTítulo: ${titulo || ""}\nDescripción: ${descripcion || ""}${presupuestoStr}`;

      const res = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        system: getSystemRequisitos(presupuesto_maximo),
        messages: [{ role: "user", content: contextMsg }],
      });

      const raw = (res.content[0] as { type: string; text: string }).text.trim();
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(jsonStr);

      return NextResponse.json({
        tipo: "requisitos",
        requisitos: parsed.requisitos || [],
      });
    }

    // Paso de chat conversacional
    // Guard: si no hay mensajes del usuario, devolver saludo inicial sin consumir API
    if (messages.length === 0 || !messages.some(m => m.role === "user")) {
      return NextResponse.json({
        tipo: "texto",
        mensaje: "¡Hola! Soy tu asistente para crear la licitación. Cuéntame: ¿qué servicio necesitas contratar para tu edificio?",
      });
    }

    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_CHAT,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const rawText = (res.content[0] as { type: string; text: string }).text.trim();

    // Intentar parsear si es JSON (propuesta lista)
    try {
      const cleanJson = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.listo && parsed.propuesta) {
        return NextResponse.json({
          tipo: "propuesta",
          propuesta: parsed.propuesta,
          mensaje: parsed.mensaje_final || "¡Listo! Revisa los datos generados y ajústalos si es necesario.",
        });
      }
    } catch {
      // No es JSON, es texto normal
    }

    return NextResponse.json({
      tipo: "texto",
      mensaje: rawText,
    });
  } catch (err) {
    console.error("Error en wizard-chat:", err);
    return NextResponse.json(
      { error: "Error al conectar con IA" },
      { status: 500 }
    );
  }
}

function getFallbackRequisitos(categoria: string, presupuesto_maximo?: number | null): Array<{
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  subsanable: boolean;
  tipo_respuesta: "documento" | "texto";
}> {
  // Escalar póliza y fianza según presupuesto
  let polizaCobertura = "B/. 50,000";
  let fianzaPorcentaje = "30%";
  let refsRequeridas = "2";
  let esContratoPequeno = false;

  if (presupuesto_maximo && presupuesto_maximo > 0) {
    if (presupuesto_maximo < 2000) {
      polizaCobertura = "B/. 10,000";
      fianzaPorcentaje = "20%";
      refsRequeridas = "1";
      esContratoPequeno = true;
    } else if (presupuesto_maximo < 10000) {
      polizaCobertura = "B/. 25,000";
      fianzaPorcentaje = "30%";
      refsRequeridas = "2";
    } else if (presupuesto_maximo < 50000) {
      polizaCobertura = "B/. 50,000";
      fianzaPorcentaje = "40%";
      refsRequeridas = "3";
    } else {
      polizaCobertura = "B/. 100,000";
      fianzaPorcentaje = "50%";
      refsRequeridas = "3";
    }
  }

  const comunes = [
    { titulo: "Póliza de seguro de responsabilidad civil", descripcion: `Vigente, cobertura mínima ${polizaCobertura}. Emitida por aseguradora autorizada en Panamá.`, obligatorio: true, subsanable: esContratoPequeno, tipo_respuesta: "documento" as const },
    ...(esContratoPequeno ? [] : [
      { titulo: "Fianza de cumplimiento", descripcion: `Mínimo ${fianzaPorcentaje} del valor anual del contrato, emitida por compañía de seguros autorizada.`, obligatorio: false, subsanable: true, tipo_respuesta: "documento" as const },
    ]),
    { titulo: "Metodología de trabajo", descripcion: "Descripción de cómo se ejecutará el servicio, frecuencias, protocolos y equipo asignado.", obligatorio: true, subsanable: false, tipo_respuesta: "texto" as const },
    { titulo: `Referencias de ${refsRequeridas} cliente${Number(refsRequeridas) > 1 ? "s" : ""} atendido${Number(refsRequeridas) > 1 ? "s" : ""}`, descripcion: "Con datos de contacto que puedan verificar la calidad del servicio.", obligatorio: !esContratoPequeno, subsanable: true, tipo_respuesta: "documento" as const },
    { titulo: "Hoja de vida del personal asignado", descripcion: "CV del equipo que trabajará directamente en el edificio, con experiencia relevante.", obligatorio: !esContratoPequeno, subsanable: true, tipo_respuesta: "documento" as const },
  ];

  const especificos: Record<string, typeof comunes> = {
    seguridad: [
      { titulo: "Licencia de agencia de seguridad privada (SENIAP)", descripcion: "Emitida por el Servicio Nacional de Inteligencia y Protección de Panamá, vigente.", obligatorio: true, subsanable: false, tipo_respuesta: "documento" as const },
      { titulo: "Idoneidad de agentes de seguridad", descripcion: "Certificación de los agentes que prestarán el servicio en el edificio.", obligatorio: true, subsanable: true, tipo_respuesta: "documento" as const },
      { titulo: "Protocolo de emergencias y comunicación", descripcion: "Manual de procedimientos ante incidentes, cadena de mando y tiempos de respuesta.", obligatorio: true, subsanable: false, tipo_respuesta: "documento" as const },
    ],
    limpieza: [
      { titulo: "Registro sanitario de productos de limpieza", descripcion: "Fichas técnicas y registro MINSA de los productos que utilizarán.", obligatorio: true, subsanable: true, tipo_respuesta: "documento" as const },
      { titulo: "Protocolo de limpieza y desinfección", descripcion: "Frecuencias, productos y técnicas por área del edificio.", obligatorio: true, subsanable: false, tipo_respuesta: "texto" as const },
    ],
    ascensores: [
      { titulo: "Certificación AOTC", descripcion: "Registro ante la Autoridad de Tránsito y Transporte Terrestre para mantenimiento de ascensores.", obligatorio: true, subsanable: false, tipo_respuesta: "documento" as const },
      { titulo: "Idoneidad de técnicos en ascensores", descripcion: "Certificación del personal técnico que realizará los mantenimientos.", obligatorio: true, subsanable: false, tipo_respuesta: "documento" as const },
    ],
    hvac: [
      { titulo: "Certificación de manejo de refrigerantes", descripcion: "Personal certificado para manejo de refrigerantes autorizados en Panamá (R-410A, R-32, etc.).", obligatorio: true, subsanable: false, tipo_respuesta: "documento" as const },
      { titulo: "Plan de mantenimiento preventivo", descripcion: "Programa detallado de mantenimiento mensual, trimestral y anual.", obligatorio: true, subsanable: false, tipo_respuesta: "texto" as const },
    ],
  };

  return [...comunes, ...(especificos[categoria] || [])];
}
