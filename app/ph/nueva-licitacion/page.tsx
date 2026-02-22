"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#07090F",
  bgCard:  "#0D1117",
  bgPanel: "#111827",
  border:  "#1F2937",
  gold:    "#C9A84C",
  goldDim: "#2D2310",
  blue:    "#4A9EFF",
  green:   "#4ADE80",
  red:     "#F87171",
  text:    "#F0F4FF",
  muted:   "#6B7280",
  sub:     "#9CA3AF",
};

type Step = 1 | 2 | 3 | 4;

// ── 25 categorías hardcoded ────────────────────────────────────────────────────
const CATEGORIAS_SERVICIO = [
  { value: "seguridad",            label: "Seguridad 24/7" },
  { value: "limpieza",             label: "Limpieza y mantenimiento" },
  { value: "hvac",                 label: "Mantenimiento HVAC / Aire acondicionado" },
  { value: "jardineria",           label: "Jardinería y áreas verdes" },
  { value: "ascensores",           label: "Mantenimiento de ascensores" },
  { value: "electricidad",         label: "Electricidad y plomería" },
  { value: "pintura",              label: "Pintura y reparaciones generales" },
  { value: "plagas",               label: "Control de plagas" },
  { value: "piscinas",             label: "Mantenimiento de piscinas" },
  { value: "impermeabilizacion",   label: "Impermeabilización y techos" },
  { value: "portones",             label: "Portones y automatismos" },
  { value: "cctv",                 label: "CCTV y sistemas de vigilancia" },
  { value: "incendio",             label: "Sistemas contra incendios" },
  { value: "generadores",          label: "Generadores y UPS" },
  { value: "fumigacion",           label: "Fumigación y desinfección" },
  { value: "mudanzas",             label: "Mudanzas y logística" },
  { value: "valet",                label: "Valet parking y estacionamiento" },
  { value: "conserje",             label: "Conserjería y recepción" },
  { value: "obras_civiles",        label: "Obras civiles y remodelaciones" },
  { value: "tecnologia",           label: "Tecnología / IT y redes" },
  { value: "gestion_residuos",     label: "Gestión de residuos y reciclaje" },
  { value: "energia_solar",        label: "Energía solar y eficiencia energética" },
  { value: "administracion",       label: "Administración de propiedades" },
  { value: "legal_contable",       label: "Servicios legales y contables" },
  { value: "otros",                label: "Otros servicios" },
] as const;

const DURACIONES = [
  { value: "3",  label: "3 meses" },
  { value: "6",  label: "6 meses" },
  { value: "12", label: "12 meses (1 año)" },
  { value: "24", label: "24 meses (2 años)" },
];

// ── Interfaces ────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AISuggestedReq {
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  subsanable: boolean;
  tipo_respuesta: "documento" | "texto";
  aceptado?: boolean; // undefined = pendiente, true = aceptado, false = rechazado
}

interface CustomReq {
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  subsanable: boolean;
  tipo_respuesta: "documento" | "texto";
}

interface FormState {
  titulo: string;
  categoria: string;
  descripcion: string;
  presupuesto_minimo: string;
  presupuesto_maximo: string;
  fecha_cierre: string;
  duracion_contrato_meses: string;
  urgente: boolean;
  precio_referencia: string;
  precio_referencia_visible: boolean;
  condiciones_especiales: string;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, tipo, onClose }: { msg: string; tipo: "ok" | "err"; onClose: () => void }) {
  const bg = tipo === "ok" ? C.green : C.red;
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      background: C.bgCard, border: `1px solid ${bg}`, borderLeft: `4px solid ${bg}`,
      borderRadius: 10, padding: "14px 20px", maxWidth: 380, display: "flex",
      alignItems: "flex-start", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,.7)",
      animation: "slideIn .25s ease",
    }}>
      <span style={{ color: bg, fontSize: 18 }}>{tipo === "ok" ? "✓" : "✕"}</span>
      <p style={{ color: C.text, fontSize: 14, margin: 0, flex: 1 }}>{msg}</p>
      <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>×</button>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Chat con IA" },
    { n: 2, label: "Pliego" },
    { n: 3, label: "Fotos e inspección" },
    { n: 4, label: "Revisar y publicar" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 40 }}>
      {steps.map((s, i) => {
        const done   = step > s.n;
        const active = step === s.n;
        const color   = done ? C.green : active ? C.gold : C.muted;
        const bgColor = done ? C.green + "20" : active ? C.goldDim : "transparent";
        const border  = done ? C.green : active ? C.gold : C.border;
        return (
          <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: bgColor, border: `2px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done ? (
                  <span style={{ color: C.green, fontWeight: 700, fontSize: 16 }}>✓</span>
                ) : (
                  <span style={{ color, fontWeight: 700, fontSize: 15 }}>{s.n}</span>
                )}
              </div>
              <span style={{ color, fontSize: 11, fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? C.green : C.border, margin: "0 8px", marginTop: -18 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: C.sub, fontSize: 13, fontWeight: 500 }}>
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </span>
      {children}
      {hint && !error && <span style={{ color: C.muted, fontSize: 12 }}>{hint}</span>}
      {error && <span style={{ color: C.red, fontSize: 12 }}>{error}</span>}
    </label>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange, activeColor = C.gold }: { value: boolean; onChange: (v: boolean) => void; activeColor?: string }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? activeColor : C.border,
        position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0,
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3,
        left: value ? 21 : 3, transition: "left .2s",
      }} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#111827", border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "10px 14px", color: C.text, fontSize: 14, outline: "none",
  width: "100%", transition: "border-color .2s",
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function NuevaLicitacion() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);
  const [result, setResult] = useState<{ slug: string; titulo: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Step 1 — Chat AI state ───────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "¡Hola! Soy tu asistente para crear la licitación. Cuéntame: ¿qué servicio necesitas contratar para tu edificio?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [propuestaIA, setPropuestaIA] = useState<Record<string, unknown> | null>(null);
  const [chatResumen, setChatResumen] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form fields (pre-filled by AI or manually)
  const [form, setForm] = useState<FormState>({
    titulo: "",
    categoria: "",
    descripcion: "",
    presupuesto_minimo: "",
    presupuesto_maximo: "",
    fecha_cierre: "",
    duracion_contrato_meses: "12",
    urgente: false,
    precio_referencia: "",
    precio_referencia_visible: true,
    condiciones_especiales: "",
  });
  const [showFormManual, setShowFormManual] = useState(false);

  // ── Step 2 — Pliego state ───────────────────────────────────────────────────
  const [aiSuggestedReqs, setAiSuggestedReqs] = useState<AISuggestedReq[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [customReqs, setCustomReqs] = useState<CustomReq[]>([]);

  // ── Step 3 state ────────────────────────────────────────────────────────────
  const [fotosFiles, setFotosFiles] = useState<File[]>([]);
  const [fotosPreview, setFotosPreview] = useState<string[]>([]);
  const [fechasInspeccion, setFechasInspeccion] = useState<string[]>([]);
  const [fechaInspeccionInput, setFechaInspeccionInput] = useState("");
  const [lugarInspeccion, setLugarInspeccion] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived: all active requisitos ─────────────────────────────────────────
  const allRequisitos = [
    ...aiSuggestedReqs
      .filter(r => r.aceptado === true)
      .map(r => ({
        titulo: r.titulo,
        descripcion: r.descripcion,
        obligatorio: r.obligatorio,
        subsanable: r.subsanable,
        tipo_respuesta: r.tipo_respuesta,
      })),
    ...customReqs.map(r => ({
      titulo: r.titulo,
      descripcion: r.descripcion,
      obligatorio: r.obligatorio,
      subsanable: r.subsanable,
      tipo_respuesta: r.tipo_respuesta,
    })),
  ];

  const catLabel = CATEGORIAS_SERVICIO.find(c => c.value === form.categoria)?.label ?? form.categoria;

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Chat send ────────────────────────────────────────────────────────────────
  const sendChatMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/wizard-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, step: "chat" }),
      });
      const data = await res.json();

      if (data.tipo === "propuesta" && data.propuesta) {
        // Claude terminó — pre-llenar el formulario
        const p = data.propuesta;
        setForm(prev => ({
          ...prev,
          titulo: p.titulo || prev.titulo,
          categoria: p.categoria || prev.categoria,
          descripcion: p.descripcion || prev.descripcion,
          presupuesto_minimo: p.presupuesto_minimo ? String(p.presupuesto_minimo) : prev.presupuesto_minimo,
          presupuesto_maximo: p.presupuesto_maximo ? String(p.presupuesto_maximo) : prev.presupuesto_maximo,
          duracion_contrato_meses: p.duracion_contrato_meses ? String(p.duracion_contrato_meses) : prev.duracion_contrato_meses,
          urgente: p.urgente ?? prev.urgente,
          condiciones_especiales: p.condiciones_especiales || prev.condiciones_especiales,
        }));
        setPropuestaIA(p);
        setChatResumen(p.resumen_para_requisitos || "");
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: data.mensaje || "¡Listo! Generé los datos de la licitación. Revísalos abajo y ajusta lo que necesites.",
        }]);
        setShowFormManual(true);
      } else {
        // Respuesta de texto normal
        setChatMessages(prev => [...prev, { role: "assistant", content: data.mensaje || "..." }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Hubo un error. Por favor intenta de nuevo." }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatMessages]);

  // ── Load AI suggested requisitos ──────────────────────────────────────────
  const loadAISuggestedReqs = useCallback(async () => {
    setLoadingReqs(true);
    try {
      const res = await fetch("/api/ai/wizard-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          step: "requisitos",
          contextoChatResumen: chatResumen,
          categoria: form.categoria,
          titulo: form.titulo,
          descripcion: form.descripcion,
        }),
      });
      const data = await res.json();
      if (data.tipo === "requisitos" && Array.isArray(data.requisitos)) {
        setAiSuggestedReqs(data.requisitos.map((r: AISuggestedReq) => ({ ...r, aceptado: undefined })));
      }
    } catch {
      // silently fail
    } finally {
      setLoadingReqs(false);
    }
  }, [chatResumen, form.categoria, form.titulo, form.descripcion]);

  // ── Validation ──────────────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!form.titulo.trim()) errs.titulo = "El título es requerido";
    if (!form.categoria) errs.categoria = "Selecciona una categoría";
    if (!form.descripcion.trim()) errs.descripcion = "La descripción es requerida";
    if (form.presupuesto_minimo && form.presupuesto_maximo) {
      if (Number(form.presupuesto_minimo) >= Number(form.presupuesto_maximo)) {
        errs.presupuesto_maximo = "El presupuesto máximo debe ser mayor al mínimo";
      }
    }
    if (!form.fecha_cierre) errs.fecha_cierre = "La fecha de cierre es requerida";
    else {
      const cierre = new Date(form.fecha_cierre);
      if (cierre <= new Date()) errs.fecha_cierre = "La fecha de cierre debe ser futura";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {};
    if (allRequisitos.length === 0) errs.requisitos = "Acepta al menos un requisito del pliego";
    customReqs.forEach((r, i) => {
      if (!r.titulo.trim()) errs[`custom_${i}_titulo`] = "El título es requerido";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Step 2 handlers ─────────────────────────────────────────────────────────
  function acceptReq(i: number) {
    setAiSuggestedReqs(prev => prev.map((r, idx) => idx === i ? { ...r, aceptado: true } : r));
  }

  function rejectReq(i: number) {
    setAiSuggestedReqs(prev => prev.map((r, idx) => idx === i ? { ...r, aceptado: false } : r));
  }

  function updateSuggestedReq(i: number, field: "obligatorio" | "subsanable", value: boolean) {
    setAiSuggestedReqs(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function addCustomReq() {
    setCustomReqs(prev => [...prev, { titulo: "", descripcion: "", obligatorio: true, subsanable: true, tipo_respuesta: "documento" }]);
  }

  function removeCustomReq(i: number) {
    setCustomReqs(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateCustomReq(i: number, field: keyof CustomReq, value: string | boolean) {
    setCustomReqs(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  // ── Step 3 handlers ─────────────────────────────────────────────────────────
  function handleFotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - fotosFiles.length;
    const toAdd = files.slice(0, remaining);
    const newFiles = [...fotosFiles, ...toAdd];
    const newPreviews = [...fotosPreview];
    toAdd.forEach(f => {
      newPreviews.push(URL.createObjectURL(f));
    });
    setFotosFiles(newFiles);
    setFotosPreview(newPreviews);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFoto(i: number) {
    URL.revokeObjectURL(fotosPreview[i]);
    setFotosFiles(prev => prev.filter((_, idx) => idx !== i));
    setFotosPreview(prev => prev.filter((_, idx) => idx !== i));
  }

  function addFechaInspeccion() {
    if (!fechaInspeccionInput) return;
    if (fechasInspeccion.includes(fechaInspeccionInput)) return;
    setFechasInspeccion(prev => [...prev, fechaInspeccionInput]);
    setFechaInspeccionInput("");
  }

  function removeFechaInspeccion(i: number) {
    setFechasInspeccion(prev => prev.filter((_, idx) => idx !== i));
  }

  // ── Go to step 2 ─────────────────────────────────────────────────────────────
  function goToStep2() {
    if (!validateStep1()) return;
    setStep(2);
    // Load AI requirements when entering step 2
    if (aiSuggestedReqs.length === 0) {
      loadAISuggestedReqs();
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handlePublish(publicar: boolean) {
    setSubmitting(true);
    try {
      const payload = {
        titulo: form.titulo,
        categoria: form.categoria,
        descripcion: form.descripcion,
        presupuesto_minimo: form.presupuesto_minimo ? Number(form.presupuesto_minimo) : null,
        presupuesto_maximo: form.presupuesto_maximo ? Number(form.presupuesto_maximo) : null,
        fecha_cierre: form.fecha_cierre || null,
        urgente: form.urgente,
        duracion_contrato_meses: Number(form.duracion_contrato_meses),
        precio_referencia: form.precio_referencia ? Number(form.precio_referencia) : null,
        precio_referencia_visible: form.precio_referencia_visible,
        fechas_inspeccion: fechasInspeccion,
        lugar_inspeccion: lugarInspeccion || null,
        condiciones_especiales: form.condiciones_especiales || null,
        requisitos: allRequisitos,
        publicar,
      };

      const r = await fetch("/api/licitaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) {
        setToast({ msg: data.error || "Error al crear", tipo: "err" });
        return;
      }

      // Upload photos if any
      if (fotosFiles.length > 0 && data.id) {
        for (const foto of fotosFiles) {
          try {
            const fd = new FormData();
            fd.append("file", foto);
            fd.append("tipo", "foto_licitacion");
            fd.append("contexto", "licitacion");
            fd.append("entidad_id", data.id);
            await fetch("/api/documentos/upload", { method: "POST", body: fd });
          } catch {
            // non-fatal
          }
        }
      }

      setResult({ slug: data.slug, titulo: form.titulo });
    } catch {
      setToast({ msg: "Error inesperado. Intenta de nuevo.", tipo: "err" });
    } finally {
      setSubmitting(false);
    }
  }

  function copyUrl() {
    if (!result) return;
    const url = `${window.location.origin}/licitacion/${result.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/licitacion/${result.slug}`
      : `/licitacion/${result.slug}`;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <style>{`* { box-sizing: border-box; } body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }`}</style>
        <div style={{ background: C.bgCard, border: `1px solid ${C.green}40`, borderRadius: 20, padding: 48, maxWidth: 560, width: "100%", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.green + "20", border: `2px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <span style={{ color: C.green, fontSize: 36 }}>✓</span>
          </div>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>¡Licitación creada!</h1>
          <p style={{ color: C.sub, fontSize: 15, margin: "0 0 32px", lineHeight: 1.6 }}>
            <strong style={{ color: C.text }}>{result.titulo}</strong> ya está en el sistema.
            Comparte el enlace con empresas proveedoras.
          </p>
          <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <p style={{ color: C.blue, fontSize: 13, margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</p>
            <button
              onClick={copyUrl}
              style={{ background: copied ? C.green : C.gold, border: "none", color: copied ? "#fff" : "#000", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {copied ? "Copiado ✓" : "Copiar enlace"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: C.blue, border: "none", color: "#fff", borderRadius: 9, padding: "12px 22px", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>
              Ver licitación →
            </a>
            <a href="/ph" style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 9, padding: "12px 22px", fontSize: 14, textDecoration: "none", display: "inline-block" }}>
              Volver al panel
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        input:focus, textarea:focus, select:focus { border-color: ${C.gold} !important; }
        input[type="checkbox"] { accent-color: ${C.gold}; }

        .wiz-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .wiz-cat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }
        .wiz-main { padding: 48px 24px 80px; }
        .wiz-header { padding: 16px 32px; }
        .chat-bubble-user { animation: fadeIn 0.2s ease; }
        .chat-bubble-ai { animation: fadeIn 0.3s ease; }

        @media (max-width: 768px) {
          .wiz-grid-2 { grid-template-columns: 1fr; }
          .wiz-cat-grid { grid-template-columns: repeat(3, 1fr); }
          .wiz-main { padding: 28px 16px 60px; }
          .wiz-header { padding: 12px 18px; }
        }
        @media (max-width: 480px) {
          .wiz-cat-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="wiz-header" style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/ph" style={{ color: C.muted, textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          ← Volver al panel
        </a>
        <span style={{ color: C.border }}>|</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${C.gold}, #8B6914)`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#000", fontSize: 14, fontWeight: 900 }}>L</span>
          </div>
          <span style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>Nueva licitación</span>
        </div>
      </header>

      <main className="wiz-main" style={{ maxWidth: 760, margin: "0 auto" }}>
        <StepBar step={step} />

        {/* ═══════════════════════════════════════════════════════════
            PASO 1: Chat con IA
        ═══════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0 }}>Cuéntame qué necesitas</h1>
              <span style={{ background: C.blue + "20", color: C.blue, border: `1px solid ${C.blue}40`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                🤖 Asistente IA
              </span>
            </div>
            <p style={{ color: C.sub, fontSize: 14, margin: "0 0 24px" }}>
              Conversa con Claude para definir tu licitación. Él te hará las preguntas necesarias y llenará los campos automáticamente.
            </p>

            {/* Chat container */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
              {/* Messages */}
              <div style={{ height: 360, overflowY: "auto", padding: "20px 20px 12px" }}>
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}
                    style={{
                      display: "flex",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    {msg.role === "assistant" && (
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${C.blue}40, ${C.blue}20)`,
                        border: `1px solid ${C.blue}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginRight: 8, marginTop: 2,
                      }}>
                        <span style={{ fontSize: 13 }}>🤖</span>
                      </div>
                    )}
                    <div style={{
                      maxWidth: "75%",
                      background: msg.role === "user" ? C.gold : C.bgPanel,
                      color: msg.role === "user" ? "#000" : C.text,
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      padding: "10px 14px",
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {chatLoading && (
                  <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}40, ${C.blue}20)`, border: `1px solid ${C.blue}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 13 }}>🤖</span>
                    </div>
                    <div style={{ background: C.bgPanel, borderRadius: "16px 16px 16px 4px", padding: "12px 16px", display: "flex", gap: 4, alignItems: "center" }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", gap: 10 }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                  placeholder="Escribe aquí tu respuesta..."
                  disabled={chatLoading || !!propuestaIA}
                  style={{
                    flex: 1, background: C.bgPanel, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none",
                    opacity: propuestaIA ? 0.5 : 1,
                  }}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !chatInput.trim() || !!propuestaIA}
                  style={{
                    background: chatLoading || !chatInput.trim() || propuestaIA ? C.bgPanel : C.gold,
                    border: `1px solid ${chatLoading || !chatInput.trim() || propuestaIA ? C.border : C.gold}`,
                    color: chatLoading || !chatInput.trim() || propuestaIA ? C.muted : "#000",
                    borderRadius: 8, padding: "10px 18px",
                    cursor: chatLoading || !chatInput.trim() || propuestaIA ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 700, transition: "all .2s",
                  }}
                >
                  Enviar →
                </button>
              </div>
            </div>

            {/* Formulario generado por IA */}
            {showFormManual && propuestaIA && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.green}30`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <span style={{ color: C.green, fontSize: 20 }}>✓</span>
                  <div>
                    <p style={{ color: C.green, fontSize: 14, fontWeight: 700, margin: 0 }}>Datos generados por IA</p>
                    <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Revisa y ajusta los campos según necesites</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Título */}
                  <Field label="Título de la licitación" required error={errors.titulo}>
                    <input
                      type="text"
                      value={form.titulo}
                      onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                      style={{ ...inputStyle, borderColor: errors.titulo ? C.red : C.border }}
                    />
                  </Field>

                  {/* Categoría */}
                  <Field label="Categoría de servicio" required error={errors.categoria}>
                    <select
                      value={form.categoria}
                      onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                      style={{ ...inputStyle, borderColor: errors.categoria ? C.red : C.border, cursor: "pointer" }}
                    >
                      <option value="">Selecciona una categoría...</option>
                      {CATEGORIAS_SERVICIO.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </Field>

                  {/* Descripción */}
                  <Field label="Descripción" required error={errors.descripcion}>
                    <textarea
                      value={form.descripcion}
                      onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                      rows={5}
                      style={{ ...inputStyle, borderColor: errors.descripcion ? C.red : C.border, resize: "vertical" }}
                    />
                  </Field>

                  {/* Presupuesto */}
                  <div className="wiz-grid-2">
                    <Field label="Presupuesto mínimo anual (USD)" hint="Opcional">
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>$</span>
                        <input type="number" min="0" step="100" value={form.presupuesto_minimo}
                          onChange={e => setForm(f => ({ ...f, presupuesto_minimo: e.target.value }))}
                          placeholder="0" style={{ ...inputStyle, paddingLeft: 24 }} />
                      </div>
                    </Field>
                    <Field label="Presupuesto máximo anual (USD)" hint="Opcional" error={errors.presupuesto_maximo}>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>$</span>
                        <input type="number" min="0" step="100" value={form.presupuesto_maximo}
                          onChange={e => setForm(f => ({ ...f, presupuesto_maximo: e.target.value }))}
                          placeholder="0" style={{ ...inputStyle, paddingLeft: 24, borderColor: errors.presupuesto_maximo ? C.red : C.border }} />
                      </div>
                    </Field>
                  </div>

                  {/* Precio referencia */}
                  <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                    <p style={{ color: C.sub, fontSize: 13, fontWeight: 600, margin: "0 0 14px" }}>Precio de referencia (opcional)</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>$</span>
                        <input type="number" min="0" step="100" value={form.precio_referencia}
                          onChange={e => setForm(f => ({ ...f, precio_referencia: e.target.value }))}
                          placeholder="Precio orientativo anual" style={{ ...inputStyle, paddingLeft: 24 }} />
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
                        <Toggle value={form.precio_referencia_visible} onChange={v => setForm(f => ({ ...f, precio_referencia_visible: v }))} />
                        <span style={{ color: form.precio_referencia_visible ? C.gold : C.muted, fontSize: 13 }}>
                          {form.precio_referencia_visible ? "Visible" : "Oculto"}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Fecha y duración */}
                  <div className="wiz-grid-2">
                    <Field label="Fecha de cierre de recepción" required error={errors.fecha_cierre}>
                      <input type="date" value={form.fecha_cierre}
                        onChange={e => setForm(f => ({ ...f, fecha_cierre: e.target.value }))}
                        min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                        style={{ ...inputStyle, borderColor: errors.fecha_cierre ? C.red : C.border, colorScheme: "dark" }} />
                    </Field>
                    <Field label="Duración del contrato" required>
                      <select value={form.duracion_contrato_meses}
                        onChange={e => setForm(f => ({ ...f, duracion_contrato_meses: e.target.value }))}
                        style={{ ...inputStyle, cursor: "pointer" }}>
                        {DURACIONES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </Field>
                  </div>

                  {/* Urgente */}
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "14px 18px", background: form.urgente ? C.red + "10" : C.bgPanel, border: `1px solid ${form.urgente ? C.red + "40" : C.border}`, borderRadius: 10, transition: "all .2s" }}>
                    <input type="checkbox" checked={form.urgente} onChange={e => setForm(f => ({ ...f, urgente: e.target.checked }))} style={{ width: 18, height: 18 }} />
                    <div>
                      <p style={{ color: form.urgente ? C.red : C.text, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>Marcar como URGENTE</p>
                      <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Se destacará con etiqueta roja en el listado</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Saltar chat — llenar manualmente */}
            {!showFormManual && (
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <button
                  onClick={() => setShowFormManual(true)}
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
                >
                  Prefiero llenar el formulario manualmente
                </button>
              </div>
            )}

            {/* Formulario manual (si omitieron el chat) */}
            {showFormManual && !propuestaIA && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <Field label="Título de la licitación" required error={errors.titulo}
                    hint="Ej: Servicio de seguridad 24/7 para PH Costa del Este">
                    <input type="text" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                      placeholder="Ej: Servicio de seguridad 24/7 para PH Costa del Este"
                      style={{ ...inputStyle, borderColor: errors.titulo ? C.red : C.border }} />
                  </Field>

                  <Field label="Categoría de servicio" required error={errors.categoria}>
                    <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                      style={{ ...inputStyle, borderColor: errors.categoria ? C.red : C.border, cursor: "pointer" }}>
                      <option value="">Selecciona una categoría...</option>
                      {CATEGORIAS_SERVICIO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </Field>

                  <Field label="Descripción" required error={errors.descripcion}
                    hint="Describe las características específicas de tu propiedad, necesidades especiales, horarios, etc.">
                    <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                      rows={5} placeholder="Describe el servicio requerido..."
                      style={{ ...inputStyle, borderColor: errors.descripcion ? C.red : C.border, resize: "vertical" }} />
                  </Field>

                  <div className="wiz-grid-2">
                    <Field label="Presupuesto mínimo anual (USD)" hint="Opcional">
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>$</span>
                        <input type="number" min="0" step="100" value={form.presupuesto_minimo}
                          onChange={e => setForm(f => ({ ...f, presupuesto_minimo: e.target.value }))}
                          placeholder="0" style={{ ...inputStyle, paddingLeft: 24 }} />
                      </div>
                    </Field>
                    <Field label="Presupuesto máximo anual (USD)" hint="Opcional" error={errors.presupuesto_maximo}>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>$</span>
                        <input type="number" min="0" step="100" value={form.presupuesto_maximo}
                          onChange={e => setForm(f => ({ ...f, presupuesto_maximo: e.target.value }))}
                          placeholder="0" style={{ ...inputStyle, paddingLeft: 24, borderColor: errors.presupuesto_maximo ? C.red : C.border }} />
                      </div>
                    </Field>
                  </div>

                  <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                    <p style={{ color: C.sub, fontSize: 13, fontWeight: 600, margin: "0 0 14px" }}>Precio de referencia (opcional)</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>$</span>
                        <input type="number" min="0" step="100" value={form.precio_referencia}
                          onChange={e => setForm(f => ({ ...f, precio_referencia: e.target.value }))}
                          placeholder="Precio orientativo anual" style={{ ...inputStyle, paddingLeft: 24 }} />
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
                        <Toggle value={form.precio_referencia_visible} onChange={v => setForm(f => ({ ...f, precio_referencia_visible: v }))} />
                        <span style={{ color: form.precio_referencia_visible ? C.gold : C.muted, fontSize: 13 }}>
                          {form.precio_referencia_visible ? "Visible para empresas" : "Oculto"}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="wiz-grid-2">
                    <Field label="Fecha de cierre de recepción" required error={errors.fecha_cierre}>
                      <input type="date" value={form.fecha_cierre}
                        onChange={e => setForm(f => ({ ...f, fecha_cierre: e.target.value }))}
                        min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                        style={{ ...inputStyle, borderColor: errors.fecha_cierre ? C.red : C.border, colorScheme: "dark" }} />
                    </Field>
                    <Field label="Duración del contrato" required>
                      <select value={form.duracion_contrato_meses}
                        onChange={e => setForm(f => ({ ...f, duracion_contrato_meses: e.target.value }))}
                        style={{ ...inputStyle, cursor: "pointer" }}>
                        {DURACIONES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </Field>
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "14px 18px", background: form.urgente ? C.red + "10" : C.bgPanel, border: `1px solid ${form.urgente ? C.red + "40" : C.border}`, borderRadius: 10, transition: "all .2s" }}>
                    <input type="checkbox" checked={form.urgente} onChange={e => setForm(f => ({ ...f, urgente: e.target.checked }))} style={{ width: 18, height: 18 }} />
                    <div>
                      <p style={{ color: form.urgente ? C.red : C.text, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>Marcar como URGENTE</p>
                      <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Se destacará con etiqueta roja en el listado</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={goToStep2}
                disabled={!showFormManual}
                style={{
                  background: showFormManual ? C.gold : C.bgPanel,
                  border: `1px solid ${showFormManual ? C.gold : C.border}`,
                  color: showFormManual ? "#000" : C.muted,
                  borderRadius: 9, padding: "12px 28px",
                  cursor: showFormManual ? "pointer" : "not-allowed",
                  fontSize: 15, fontWeight: 700,
                  opacity: showFormManual ? 1 : 0.6,
                }}
              >
                Siguiente: Pliego de requisitos →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PASO 2: Pliego de requisitos
        ═══════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0 }}>Pliego de requisitos</h1>
              <span style={{ background: C.blue + "20", color: C.blue, border: `1px solid ${C.blue}40`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                🤖 Sugeridos por IA
              </span>
            </div>
            <p style={{ color: C.sub, fontSize: 14, margin: "0 0 24px" }}>
              Claude sugirió estos requisitos para tu licitación. Acepta los que apliquen y agrega los propios sin límite.
            </p>

            {errors.requisitos && (
              <div style={{ background: C.red + "15", border: `1px solid ${C.red}40`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{errors.requisitos}</p>
              </div>
            )}

            {/* Loading requisitos */}
            {loadingReqs && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.blue}30`, borderRadius: 16, padding: 32, textAlign: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 12 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <p style={{ color: C.blue, fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>Claude está analizando tu licitación...</p>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Generando requisitos específicos para {catLabel || "tu servicio"}</p>
              </div>
            )}

            {/* Sugerencias IA */}
            {!loadingReqs && aiSuggestedReqs.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Requisitos sugeridos por IA</h2>
                    <span style={{ background: C.green + "20", color: C.green, border: `1px solid ${C.green}40`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                      {aiSuggestedReqs.filter(r => r.aceptado === true).length} aceptados
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setAiSuggestedReqs(prev => prev.map(r => ({ ...r, aceptado: true })))}
                      style={{ background: C.green + "15", border: `1px solid ${C.green}40`, color: C.green, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                    >
                      ✓ Aceptar todos
                    </button>
                    <button
                      onClick={() => loadAISuggestedReqs()}
                      style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}
                    >
                      ↻ Regenerar
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {aiSuggestedReqs.map((r, i) => {
                    const isAccepted = r.aceptado === true;
                    const isRejected = r.aceptado === false;
                    const isPending  = r.aceptado === undefined;

                    return (
                      <div
                        key={i}
                        style={{
                          background: isAccepted ? C.bgCard : isRejected ? C.bgPanel : C.bgCard,
                          border: `1px solid ${isAccepted ? C.green + "50" : isRejected ? C.border + "40" : C.border}`,
                          borderRadius: 12, padding: 16,
                          opacity: isRejected ? 0.45 : 1,
                          transition: "all .2s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          {/* Badges */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", flexShrink: 0, marginTop: 2 }}>
                            <span style={{
                              background: r.tipo_respuesta === "documento" ? C.blue + "20" : C.gold + "20",
                              color: r.tipo_respuesta === "documento" ? C.blue : C.gold,
                              borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600,
                            }}>
                              {r.tipo_respuesta === "documento" ? "DOC" : "TEXTO"}
                            </span>
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ color: isRejected ? C.muted : C.text, fontSize: 14, fontWeight: 600 }}>{r.titulo}</span>
                              {r.obligatorio && (
                                <span style={{ background: C.red + "15", color: C.red, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>OBLIGATORIO</span>
                              )}
                            </div>
                            <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px", lineHeight: 1.5 }}>{r.descripcion}</p>

                            {/* Toggles si está aceptado */}
                            {isAccepted && (
                              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                  <Toggle value={r.obligatorio} onChange={v => updateSuggestedReq(i, "obligatorio", v)} activeColor={C.red} />
                                  <span style={{ color: r.obligatorio ? C.red : C.muted, fontSize: 12 }}>{r.obligatorio ? "Obligatorio" : "Opcional"}</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                  <Toggle value={r.subsanable} onChange={v => updateSuggestedReq(i, "subsanable", v)} activeColor={C.gold} />
                                  <span style={{ color: r.subsanable ? C.gold : C.muted, fontSize: 12 }}>{r.subsanable ? "Subsanable" : "No subsanable"}</span>
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            {!isAccepted && (
                              <button
                                onClick={() => acceptReq(i)}
                                style={{
                                  background: C.green + "20", border: `1px solid ${C.green}40`,
                                  color: C.green, borderRadius: 7, padding: "6px 12px",
                                  cursor: "pointer", fontSize: 12, fontWeight: 700,
                                }}
                              >
                                ✓ Aceptar
                              </button>
                            )}
                            {isAccepted && (
                              <button
                                onClick={() => rejectReq(i)}
                                style={{
                                  background: "none", border: `1px solid ${C.border}`,
                                  color: C.muted, borderRadius: 7, padding: "6px 12px",
                                  cursor: "pointer", fontSize: 12,
                                }}
                              >
                                Quitar
                              </button>
                            )}
                            {(isPending || isRejected) && (
                              <button
                                onClick={() => rejectReq(i)}
                                style={{
                                  background: "none", border: "none",
                                  color: C.muted, cursor: "pointer", fontSize: 16, padding: "4px 8px",
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Requisitos personalizados */}
            {customReqs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Mis requisitos adicionales</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {customReqs.map((r, i) => (
                    <div
                      key={i}
                      style={{ background: C.bgCard, border: `1px solid ${errors[`custom_${i}_titulo`] ? C.red : C.gold + "30"}`, borderRadius: 12, padding: 20 }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.gold + "20", border: `1.5px solid ${C.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>+</span>
                        </div>
                        <span style={{ color: C.gold, fontSize: 12, flex: 1, fontWeight: 600 }}>Requisito personalizado</span>
                        <button
                          onClick={() => removeCustomReq(i)}
                          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px", borderRadius: 4 }}
                        >×</button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <input
                          type="text"
                          value={r.titulo}
                          onChange={e => updateCustomReq(i, "titulo", e.target.value)}
                          placeholder="Título del requisito"
                          style={{ background: C.bgPanel, border: `1px solid ${errors[`custom_${i}_titulo`] ? C.red : C.border}`, borderRadius: 7, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none", width: "100%" }}
                        />
                        <textarea
                          value={r.descripcion}
                          onChange={e => updateCustomReq(i, "descripcion", e.target.value)}
                          placeholder="Descripción / instrucciones adicionales"
                          rows={2}
                          style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none", resize: "vertical", width: "100%" }}
                        />
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <Toggle value={r.obligatorio} onChange={v => updateCustomReq(i, "obligatorio", v)} activeColor={C.red} />
                            <span style={{ color: r.obligatorio ? C.red : C.muted, fontSize: 13 }}>{r.obligatorio ? "Obligatorio" : "Opcional"}</span>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <Toggle value={r.subsanable} onChange={v => updateCustomReq(i, "subsanable", v)} activeColor={C.gold} />
                            <span style={{ color: r.subsanable ? C.gold : C.muted, fontSize: 13 }}>{r.subsanable ? "Subsanable" : "No subsanable"}</span>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <span style={{ color: C.sub, fontSize: 13 }}>Tipo:</span>
                            <select
                              value={r.tipo_respuesta}
                              onChange={e => updateCustomReq(i, "tipo_respuesta", e.target.value)}
                              style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", color: C.text, fontSize: 12, cursor: "pointer" }}
                            >
                              <option value="documento">Documento</option>
                              <option value="texto">Texto</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botón agregar — sin límite */}
            <button
              onClick={addCustomReq}
              style={{ width: "100%", background: "none", border: `2px dashed ${C.border}`, color: C.sub, borderRadius: 10, padding: "14px 0", cursor: "pointer", fontSize: 14, transition: "all .2s", marginBottom: 20 }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = C.gold; (e.target as HTMLButtonElement).style.color = C.gold; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = C.border; (e.target as HTMLButtonElement).style.color = C.sub; }}
            >
              + Agregar requisito personalizado
            </button>

            {/* Resumen */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ color: C.sub, fontSize: 13, fontWeight: 600 }}>
                Total: <span style={{ color: C.text }}>{allRequisitos.length} requisito{allRequisitos.length !== 1 ? "s" : ""}</span>
              </span>
              <span style={{ color: C.red, fontSize: 12 }}>Obligatorio = debe cumplirse sí o sí</span>
              <span style={{ color: C.gold, fontSize: 12 }}>Subsanable = puede presentarse después</span>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 24 }}>
              <button onClick={() => setStep(1)} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 9, padding: "12px 22px", cursor: "pointer", fontSize: 14 }}>
                ← Anterior
              </button>
              <button
                onClick={() => { if (validateStep2()) setStep(3); }}
                style={{ background: C.gold, border: "none", color: "#000", borderRadius: 9, padding: "12px 28px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}
              >
                Siguiente: Fotos e inspección →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PASO 3: Fotos e inspecciones
        ═══════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div>
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Fotos del lugar e inspecciones</h1>
            <p style={{ color: C.sub, fontSize: 14, margin: "0 0 36px" }}>
              Sube fotos del área donde se prestará el servicio y define cuándo pueden inspeccionar las empresas.
            </p>

            {/* Fotos */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Fotos del lugar</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 18px" }}>
                Máximo 5 fotos. Las empresas las verán al revisar el pliego.
              </p>

              {fotosPreview.length > 0 && (
                <div className="wiz-cat-grid">
                  {fotosPreview.map((src, i) => (
                    <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                      <img src={src} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        onClick={() => removeFoto(i)}
                        style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >×</button>
                    </div>
                  ))}
                  {Array.from({ length: 5 - fotosPreview.length }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ aspectRatio: "1", borderRadius: 8, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: C.border, fontSize: 20 }}>+</span>
                    </div>
                  ))}
                </div>
              )}

              {fotosFiles.length < 5 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: `2px dashed ${C.border}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "all .2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                >
                  <p style={{ color: C.sub, fontSize: 14, margin: "0 0 6px", fontWeight: 500 }}>Haz clic para agregar fotos</p>
                  <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
                    JPG, PNG o WEBP — {5 - fotosFiles.length} foto{5 - fotosFiles.length !== 1 ? "s" : ""} restante{5 - fotosFiles.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFotosChange} />
            </div>

            {/* Inspecciones */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Inspecciones del lugar</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px" }}>
                Las empresas deben inspeccionar el lugar antes de enviar su propuesta.
              </p>

              <Field label="Fechas disponibles para inspección del lugar">
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="date" value={fechaInspeccionInput}
                    onChange={e => setFechaInspeccionInput(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    style={{ ...inputStyle, flex: 1, colorScheme: "dark" }} />
                  <button
                    onClick={addFechaInspeccion} disabled={!fechaInspeccionInput}
                    style={{ background: fechaInspeccionInput ? C.gold : C.bgPanel, border: `1px solid ${fechaInspeccionInput ? C.gold : C.border}`, color: fechaInspeccionInput ? "#000" : C.muted, borderRadius: 8, padding: "10px 18px", cursor: fechaInspeccionInput ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}
                  >
                    Agregar fecha
                  </button>
                </div>
              </Field>

              {fechasInspeccion.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {fechasInspeccion.map((f, i) => (
                    <div key={i} style={{ background: C.blue + "15", border: `1px solid ${C.blue}40`, borderRadius: 20, padding: "5px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: C.blue, fontSize: 13 }}>
                        {new Date(f + "T12:00:00").toLocaleDateString("es-PA", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <button onClick={() => removeFechaInspeccion(i)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <Field label="Lugar de inspección" hint="Ej: Torre Pacific, lobby principal">
                  <input type="text" value={lugarInspeccion}
                    onChange={e => setLugarInspeccion(e.target.value)}
                    placeholder="Ej: Torre Pacific, lobby principal" style={inputStyle} />
                </Field>
              </div>

              <div style={{ background: C.blue + "10", border: `1px solid ${C.blue}30`, borderRadius: 8, padding: "12px 16px", marginTop: 18 }}>
                <p style={{ color: C.blue, fontSize: 13, margin: 0 }}>
                  Las empresas verán estas fechas y el lugar al revisar la licitación. Deben confirmar que asistirán antes de enviar su propuesta.
                </p>
              </div>
            </div>

            {/* Condiciones especiales */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginTop: 16 }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Condiciones especiales</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 16px" }}>
                Información adicional, restricciones o requisitos particulares que apliquen.
              </p>
              <textarea
                value={form.condiciones_especiales}
                onChange={e => setForm(f => ({ ...f, condiciones_especiales: e.target.value }))}
                rows={4}
                placeholder="Ej: El personal debe tener uniforme. No se permite subcontratación..."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 32 }}>
              <button onClick={() => setStep(2)} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 9, padding: "12px 22px", cursor: "pointer", fontSize: 14 }}>
                ← Anterior
              </button>
              <button onClick={() => setStep(4)} style={{ background: C.gold, border: "none", color: "#000", borderRadius: 9, padding: "12px 28px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
                Siguiente: Revisar →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PASO 4: Revisar y publicar
        ═══════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div>
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Revisar y publicar</h1>
            <p style={{ color: C.sub, fontSize: 14, margin: "0 0 32px" }}>Verifica los datos antes de publicar. Puedes guardar como borrador o publicar de inmediato.</p>

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                {form.urgente && (
                  <span style={{ background: C.red + "20", color: C.red, border: `1px solid ${C.red}40`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>URGENTE</span>
                )}
                <span style={{ background: C.gold + "20", color: C.gold, border: `1px solid ${C.gold}30`, borderRadius: 5, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{catLabel}</span>
              </div>
              <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>{form.titulo}</h2>
              <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>{form.descripcion}</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                {[
                  { label: "Presupuesto anual", val: form.presupuesto_minimo || form.presupuesto_maximo ? `$${Number(form.presupuesto_minimo || 0).toLocaleString()} – $${Number(form.presupuesto_maximo || 0).toLocaleString()}` : "No especificado" },
                  { label: "Fecha de cierre", val: form.fecha_cierre ? new Date(form.fecha_cierre).toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" }) : "—" },
                  { label: "Duración contrato", val: DURACIONES.find(d => d.value === form.duracion_contrato_meses)?.label ?? "—" },
                  ...(form.precio_referencia && form.precio_referencia_visible ? [{ label: "Precio referencia", val: `$${Number(form.precio_referencia).toLocaleString()} / año` }] : []),
                  ...(fotosFiles.length > 0 ? [{ label: "Fotos del lugar", val: `${fotosFiles.length} foto${fotosFiles.length !== 1 ? "s" : ""}` }] : []),
                  ...(fechasInspeccion.length > 0 ? [{ label: "Fechas inspección", val: `${fechasInspeccion.length} fecha${fechasInspeccion.length !== 1 ? "s" : ""} definida${fechasInspeccion.length !== 1 ? "s" : ""}` }] : []),
                ].map(item => (
                  <div key={item.label} style={{ background: C.bgPanel, borderRadius: 8, padding: "12px 16px" }}>
                    <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>{item.label}</p>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{item.val}</p>
                  </div>
                ))}
              </div>

              {fechasInspeccion.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ color: C.sub, fontSize: 12, margin: "0 0 8px", fontWeight: 600 }}>FECHAS DE INSPECCIÓN</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {fechasInspeccion.map((f, i) => (
                      <span key={i} style={{ background: C.blue + "15", color: C.blue, border: `1px solid ${C.blue}30`, borderRadius: 20, padding: "3px 10px", fontSize: 12 }}>
                        {new Date(f + "T12:00:00").toLocaleDateString("es-PA", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    ))}
                  </div>
                  {lugarInspeccion && (
                    <p style={{ color: C.muted, fontSize: 13, margin: "8px 0 0" }}>
                      Lugar: <span style={{ color: C.text }}>{lugarInspeccion}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Requisitos preview */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
              <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 18px" }}>
                Pliego de requisitos ({allRequisitos.length})
              </h3>
              {allRequisitos.length === 0 ? (
                <p style={{ color: C.muted, fontSize: 14 }}>Sin requisitos configurados. Vuelve al paso anterior.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {allRequisitos.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i < allRequisitos.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <span style={{ color: C.gold, fontWeight: 700, fontSize: 13, minWidth: 24 }}>{i + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{r.titulo}</span>
                          <span style={{ background: r.obligatorio ? C.red + "20" : C.muted + "20", color: r.obligatorio ? C.red : C.muted, border: `1px solid ${r.obligatorio ? C.red : C.muted}30`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                            {r.obligatorio ? "OBLIGATORIO" : "OPCIONAL"}
                          </span>
                          <span style={{ background: r.subsanable ? C.gold + "20" : C.red + "10", color: r.subsanable ? C.gold : C.red, border: `1px solid ${r.subsanable ? C.gold : C.red}30`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                            {r.subsanable ? "SUBSANABLE" : "NO SUBSANABLE"}
                          </span>
                        </div>
                        {r.descripcion && <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{r.descripcion}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: C.goldDim, border: `1px solid ${C.gold}30`, borderRadius: 12, padding: "18px 24px", marginBottom: 24 }}>
              <p style={{ color: C.gold, fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Listo para publicar</p>
              <p style={{ color: C.sub, fontSize: 13, margin: 0 }}>
                Al publicar, la licitación será visible para todas las empresas registradas en LicitaPH.
                También puedes guardarla como borrador para editarla después.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
              <button onClick={() => setStep(3)} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 9, padding: "12px 22px", cursor: "pointer", fontSize: 14 }}>
                ← Editar fotos
              </button>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => handlePublish(false)}
                  disabled={submitting}
                  style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 9, padding: "12px 22px", cursor: submitting ? "not-allowed" : "pointer", fontSize: 14, opacity: submitting ? 0.6 : 1 }}
                >
                  Guardar borrador
                </button>
                <button
                  onClick={() => handlePublish(true)}
                  disabled={submitting}
                  style={{ background: C.gold, border: "none", color: "#000", borderRadius: 9, padding: "12px 28px", cursor: submitting ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? "Publicando..." : "Publicar licitación →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
