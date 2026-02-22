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
}

const SYSTEM_CHAT = `Eres un asistente experto en administración de Propiedades Horizontales (PH) en Panamá con 20 años de experiencia elaborando licitaciones profesionales.

Tu misión es ayudar al administrador a definir los detalles de una licitación haciéndole preguntas concretas y útiles.

REGLAS IMPORTANTES:
1. Haz UNA sola pregunta a la vez. No hagas múltiples preguntas en el mismo mensaje.
2. Sé breve y directo. Máximo 2-3 oraciones por respuesta.
3. Cuando tengas suficiente información (después de 3-5 intercambios), genera la propuesta de licitación en formato JSON.
4. Habla en español panameño, usa "B/." para Balboas/USD.
5. Adapta tus preguntas según el tipo de servicio mencionado.

FLUJO DE PREGUNTAS SUGERIDO:
1. Si el usuario no mencionó el servicio específico: pregunta qué servicio necesita.
2. Si mencionó el servicio: pregunta sobre el tamaño del edificio (unidades / pisos / área).
3. Luego: condiciones especiales o urgencias.
4. Luego: presupuesto referencial (si tiene idea).
5. Con esa info: genera la propuesta JSON.

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
    "condiciones_especiales": "Condiciones o notas importantes (puede ser vacío)",
    "resumen_para_requisitos": "Resumen en 1 párrafo de todo el contexto de esta licitación, para que pueda generar los requisitos del pliego"
  },
  "mensaje_final": "Mensaje amigable explicando lo que generaste y pidiendo al admin que revise los campos"
}

Si no tienes suficiente info todavía, responde con texto normal (sin JSON) haciendo la siguiente pregunta.`;

const SYSTEM_REQUISITOS = `Eres un experto en pliegos de cargos para Propiedades Horizontales en Panamá.

Basándote en el contexto de la licitación, genera una lista de requisitos específicos y relevantes para el servicio.

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
- Genera entre 8 y 14 requisitos específicos para este tipo de servicio
- NO incluyas los requisitos legales básicos (Registro Público, Paz y Salvo CSS/DGI, cédula) porque ya están en la lista estándar
- Enfócate en requisitos TÉCNICOS y ESPECÍFICOS para este servicio
- Adapta al contexto panameño (AOTC para ascensores, CSS, MITRADEL, etc.)`;

export async function POST(request: NextRequest) {
  const body: WizardChatRequest = await request.json();
  const { messages, step, contextoChatResumen, categoria, titulo, descripcion } = body;

  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback sin API key
    if (step === "requisitos") {
      return NextResponse.json({
        tipo: "requisitos",
        requisitos: getFallbackRequisitos(categoria || "otros"),
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
      // Generar requisitos específicos basados en el contexto
      const contextMsg = contextoChatResumen
        ? `Contexto de la licitación: ${contextoChatResumen}\nCategoría: ${categoria || "general"}\nTítulo: ${titulo || ""}\nDescripción: ${descripcion || ""}`
        : `Categoría: ${categoria || "general"}\nTítulo: ${titulo || ""}\nDescripción: ${descripcion || ""}`;

      const res = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        system: SYSTEM_REQUISITOS,
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

function getFallbackRequisitos(categoria: string): Array<{
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  subsanable: boolean;
  tipo_respuesta: "documento" | "texto";
}> {
  const comunes = [
    { titulo: "Póliza de seguro de responsabilidad civil", descripcion: "Vigente, cobertura mínima B/. 100,000. Emitida por aseguradora autorizada en Panamá.", obligatorio: true, subsanable: false, tipo_respuesta: "documento" as const },
    { titulo: "Fianza de cumplimiento", descripcion: "Mínimo 50% del valor anual del contrato, emitida por compañía de seguros autorizada.", obligatorio: true, subsanable: false, tipo_respuesta: "documento" as const },
    { titulo: "Metodología detallada de trabajo", descripcion: "Descripción de cómo se ejecutará el servicio, frecuencias, protocolos y equipo asignado.", obligatorio: true, subsanable: false, tipo_respuesta: "texto" as const },
    { titulo: "Referencias de 3 PH o edificios atendidos", descripcion: "Con datos de contacto del administrador o junta directiva que pueda verificar el servicio.", obligatorio: true, subsanable: true, tipo_respuesta: "documento" as const },
    { titulo: "Hoja de vida del personal asignado", descripcion: "CV del equipo que trabajará directamente en el edificio, con experiencia relevante.", obligatorio: true, subsanable: true, tipo_respuesta: "documento" as const },
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
