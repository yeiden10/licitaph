"use client";
import { useState, useCallback, useRef } from "react";
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

// ── Requisitos estándar recomendados ──────────────────────────────────────────
const REQUISITOS_ESTANDAR: StandardReq[] = [
  { titulo: "Registro Público vigente", desc: "Emitido en los últimos 3 meses", obligatorio: true,  subsanable: false, tipo_respuesta: "documento" },
  { titulo: "Aviso de operación vigente", desc: "Del municipio correspondiente", obligatorio: true,  subsanable: false, tipo_respuesta: "documento" },
  { titulo: "Paz y Salvo CSS", desc: "Caja de Seguro Social al día", obligatorio: true,  subsanable: true,  tipo_respuesta: "documento" },
  { titulo: "Paz y Salvo DGI", desc: "Dirección General de Ingresos al día", obligatorio: true,  subsanable: true,  tipo_respuesta: "documento" },
  { titulo: "Cédula o pasaporte del representante legal", desc: "Vigente", obligatorio: true,  subsanable: false, tipo_respuesta: "documento" },
  { titulo: "Estados financieros últimos 2 años", desc: "Auditados o certificados por CPA", obligatorio: false, subsanable: true,  tipo_respuesta: "documento" },
  { titulo: "Referencias bancarias (mín. 1)", desc: "Carta de banco que certifique relación comercial", obligatorio: false, subsanable: true,  tipo_respuesta: "documento" },
  { titulo: "Carta de referencias comerciales (mín. 3)", desc: "Con datos de contacto verificables", obligatorio: true,  subsanable: true,  tipo_respuesta: "documento" },
  { titulo: "CV del equipo que participará", desc: "Experiencia y cargos relevantes al servicio", obligatorio: true,  subsanable: true,  tipo_respuesta: "documento" },
  { titulo: "Certificados de idoneidad del personal", desc: "Según tipo de servicio (si aplica)", obligatorio: false, subsanable: true,  tipo_respuesta: "documento" },
  { titulo: "Experiencia comprobable (mín. 3 años)", desc: "En servicios de similar naturaleza y escala", obligatorio: true,  subsanable: false, tipo_respuesta: "texto" },
  { titulo: "Póliza de seguro de responsabilidad civil", desc: "Vigente, monto mínimo según contrato", obligatorio: true,  subsanable: true,  tipo_respuesta: "documento" },
  { titulo: "Fianza de cumplimiento (mín. 50% del valor anual)", desc: "Emitida por compañía de seguros autorizada en Panamá", obligatorio: true,  subsanable: false, tipo_respuesta: "documento" },
  { titulo: "Compromiso de inspección previa al inicio", desc: "La empresa debe inspeccionar el lugar antes de firmar", obligatorio: true,  subsanable: false, tipo_respuesta: "documento" },
  { titulo: "Metodología detallada de trabajo", desc: "Cómo se ejecutará el servicio, frecuencias, equipo", obligatorio: true,  subsanable: false, tipo_respuesta: "texto" },
];

// ── Interfaces ────────────────────────────────────────────────────────────────
interface StandardReq {
  titulo: string;
  desc: string;
  obligatorio: boolean;
  subsanable: boolean;
  tipo_respuesta: "documento" | "texto";
}

interface StandardReqState extends StandardReq {
  enabled: boolean;
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
    { n: 1, label: "Detalles básicos" },
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

  // ── Step 1 state ────────────────────────────────────────────────────────────
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
  });

  // ── Step 2 state ────────────────────────────────────────────────────────────
  // Standard reqs with enabled toggle
  const [stdReqs, setStdReqs] = useState<StandardReqState[]>(
    REQUISITOS_ESTANDAR.map(r => ({ ...r, enabled: r.obligatorio }))
  );
  // Custom reqs added by user
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
    ...stdReqs
      .filter(r => r.enabled)
      .map(r => ({
        titulo: r.titulo,
        descripcion: r.desc,
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
    if (allRequisitos.length === 0) errs.requisitos = "Activa al menos un requisito en el pliego";
    customReqs.forEach((r, i) => {
      if (!r.titulo.trim()) errs[`custom_${i}_titulo`] = "El título es requerido";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Step 2 handlers ─────────────────────────────────────────────────────────
  function toggleStdReq(i: number) {
    setStdReqs(prev => prev.map((r, idx) => idx === i ? { ...r, enabled: !r.enabled } : r));
  }

  function updateStdReq(i: number, field: "obligatorio" | "subsanable", value: boolean) {
    setStdReqs(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
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
    // reset input so same file can be re-added if removed
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
            // non-fatal: photos are best-effort
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
        input:focus, textarea:focus, select:focus { border-color: ${C.gold} !important; }
        input[type="checkbox"] { accent-color: ${C.gold}; }
      `}</style>

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* Header */}
      <header style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
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

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <StepBar step={step} />

        {/* ═══════════════════════════════════════════════════════════
            PASO 1: Detalles básicos
        ═══════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div>
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Detalles básicos</h1>
            <p style={{ color: C.sub, fontSize: 14, margin: "0 0 36px" }}>Describe el servicio que necesitas y los parámetros generales de la licitación.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

              {/* Título */}
              <Field label="Título de la licitación" required error={errors.titulo}
                hint="Ej: Servicio de seguridad 24/7 para PH Costa del Este">
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Servicio de seguridad 24/7 para PH Costa del Este"
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
              <Field label="Descripción" required error={errors.descripcion}
                hint="Describe las características específicas de tu propiedad, necesidades especiales, horarios, etc.">
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={5}
                  placeholder="Describe el servicio requerido, características del edificio, requisitos especiales..."
                  style={{ ...inputStyle, borderColor: errors.descripcion ? C.red : C.border, resize: "vertical" }}
                />
              </Field>

              {/* Presupuesto */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Presupuesto mínimo anual (USD)" hint="Opcional">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>$</span>
                    <input
                      type="number" min="0" step="100"
                      value={form.presupuesto_minimo}
                      onChange={e => setForm(f => ({ ...f, presupuesto_minimo: e.target.value }))}
                      placeholder="0"
                      style={{ ...inputStyle, paddingLeft: 24 }}
                    />
                  </div>
                </Field>
                <Field label="Presupuesto máximo anual (USD)" hint="Opcional" error={errors.presupuesto_maximo}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>$</span>
                    <input
                      type="number" min="0" step="100"
                      value={form.presupuesto_maximo}
                      onChange={e => setForm(f => ({ ...f, presupuesto_maximo: e.target.value }))}
                      placeholder="0"
                      style={{ ...inputStyle, paddingLeft: 24, borderColor: errors.presupuesto_maximo ? C.red : C.border }}
                    />
                  </div>
                </Field>
              </div>

              {/* Precio referencia */}
              <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <p style={{ color: C.sub, fontSize: 13, fontWeight: 600, margin: "0 0 14px" }}>Precio de referencia (opcional)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>$</span>
                    <input
                      type="number" min="0" step="100"
                      value={form.precio_referencia}
                      onChange={e => setForm(f => ({ ...f, precio_referencia: e.target.value }))}
                      placeholder="Precio orientativo anual"
                      style={{ ...inputStyle, paddingLeft: 24 }}
                    />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <Toggle
                      value={form.precio_referencia_visible}
                      onChange={v => setForm(f => ({ ...f, precio_referencia_visible: v }))}
                    />
                    <span style={{ color: form.precio_referencia_visible ? C.gold : C.muted, fontSize: 13 }}>
                      {form.precio_referencia_visible ? "Visible para empresas" : "Oculto"}
                    </span>
                  </label>
                </div>
                <p style={{ color: C.muted, fontSize: 12, margin: "10px 0 0" }}>
                  Si está visible, las empresas lo verán como referencia al cotizar. Si está oculto, solo lo ves tú.
                </p>
              </div>

              {/* Fecha y duración */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Fecha de cierre de recepción" required error={errors.fecha_cierre}>
                  <input
                    type="date"
                    value={form.fecha_cierre}
                    onChange={e => setForm(f => ({ ...f, fecha_cierre: e.target.value }))}
                    min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                    style={{ ...inputStyle, borderColor: errors.fecha_cierre ? C.red : C.border, colorScheme: "dark" }}
                  />
                </Field>
                <Field label="Duración del contrato" required>
                  <select
                    value={form.duracion_contrato_meses}
                    onChange={e => setForm(f => ({ ...f, duracion_contrato_meses: e.target.value }))}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {DURACIONES.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Urgente */}
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "14px 18px", background: form.urgente ? C.red + "10" : C.bgPanel, border: `1px solid ${form.urgente ? C.red + "40" : C.border}`, borderRadius: 10, transition: "all .2s" }}>
                <input
                  type="checkbox"
                  checked={form.urgente}
                  onChange={e => setForm(f => ({ ...f, urgente: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                />
                <div>
                  <p style={{ color: form.urgente ? C.red : C.text, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>
                    Marcar como URGENTE
                  </p>
                  <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Se destacará con etiqueta roja en el listado de empresas</p>
                </div>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
              <button
                onClick={() => { if (validateStep1()) setStep(2); }}
                style={{ background: C.gold, border: "none", color: "#000", borderRadius: 9, padding: "12px 28px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}
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
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Pliego de requisitos</h1>
            <p style={{ color: C.sub, fontSize: 14, margin: "0 0 28px" }}>
              Activa los requisitos recomendados y agrega los personalizados que necesites.
              Las empresas deberán cumplir con los marcados como obligatorios.
            </p>
            {errors.requisitos && <p style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{errors.requisitos}</p>}

            {/* Requisitos recomendados */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>Requisitos recomendados</h2>
                <span style={{ background: C.gold + "20", color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                  {stdReqs.filter(r => r.enabled).length} / {stdReqs.length} activos
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stdReqs.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: r.enabled ? C.bgCard : C.bgPanel,
                      border: `1px solid ${r.enabled ? C.border : C.border + "60"}`,
                      borderRadius: 12, padding: 16,
                      opacity: r.enabled ? 1 : 0.55,
                      transition: "all .2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {/* Enable toggle */}
                      <Toggle value={r.enabled} onChange={() => toggleStdReq(i)} activeColor={C.green} />

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ color: r.enabled ? C.text : C.muted, fontSize: 14, fontWeight: 600 }}>{r.titulo}</span>
                          <span style={{ background: C.gold + "20", color: C.gold, border: `1px solid ${C.gold}30`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                            RECOMENDADO
                          </span>
                          <span style={{ background: r.tipo_respuesta === "documento" ? C.blue + "20" : C.muted + "20", color: r.tipo_respuesta === "documento" ? C.blue : C.muted, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>
                            {r.tipo_respuesta === "documento" ? "DOC" : "TEXTO"}
                          </span>
                        </div>
                        <p style={{ color: C.muted, fontSize: 12, margin: "0 0 10px" }}>{r.desc}</p>

                        {r.enabled && (
                          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                              <Toggle value={r.obligatorio} onChange={v => updateStdReq(i, "obligatorio", v)} activeColor={C.red} />
                              <span style={{ color: r.obligatorio ? C.red : C.muted, fontSize: 12, fontWeight: r.obligatorio ? 600 : 400 }}>
                                {r.obligatorio ? "Obligatorio" : "Opcional"}
                              </span>
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                              <Toggle value={r.subsanable} onChange={v => updateStdReq(i, "subsanable", v)} activeColor={C.gold} />
                              <span style={{ color: r.subsanable ? C.gold : C.muted, fontSize: 12, fontWeight: r.subsanable ? 600 : 400 }}>
                                {r.subsanable ? "Subsanable" : "No subsanable"}
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Requisitos personalizados */}
            {customReqs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Requisitos personalizados</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {customReqs.map((r, i) => (
                    <div
                      key={i}
                      style={{ background: C.bgCard, border: `1px solid ${errors[`custom_${i}_titulo`] ? C.red : C.border}`, borderRadius: 12, padding: 20 }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.blue + "20", border: `1.5px solid ${C.blue}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ color: C.blue, fontSize: 12, fontWeight: 700 }}>+</span>
                        </div>
                        <span style={{ color: C.muted, fontSize: 12, flex: 1 }}>Requisito personalizado</span>
                        <button
                          onClick={() => removeCustomReq(i)}
                          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px", borderRadius: 4 }}
                        >
                          ×
                        </button>
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
                            <span style={{ color: r.obligatorio ? C.red : C.muted, fontSize: 13, fontWeight: r.obligatorio ? 600 : 400 }}>
                              {r.obligatorio ? "Obligatorio" : "Opcional"}
                            </span>
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <Toggle value={r.subsanable} onChange={v => updateCustomReq(i, "subsanable", v)} activeColor={C.gold} />
                            <span style={{ color: r.subsanable ? C.gold : C.muted, fontSize: 13, fontWeight: r.subsanable ? 600 : 400 }}>
                              {r.subsanable ? "Subsanable" : "No subsanable"}
                            </span>
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

            <button
              onClick={addCustomReq}
              style={{ width: "100%", background: "none", border: `2px dashed ${C.border}`, color: C.sub, borderRadius: 10, padding: "14px 0", cursor: "pointer", fontSize: 14, transition: "all .2s", marginBottom: 20 }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = C.gold; (e.target as HTMLButtonElement).style.color = C.gold; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = C.border; (e.target as HTMLButtonElement).style.color = C.sub; }}
            >
              + Agregar requisito personalizado
            </button>

            {/* Legend */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 24, flexWrap: "wrap" }}>
              <span style={{ color: C.muted, fontSize: 12 }}>Leyenda:</span>
              <span style={{ color: C.red, fontSize: 12 }}>Obligatorio = La empresa debe cumplirlo sí o sí</span>
              <span style={{ color: C.gold, fontSize: 12 }}>Subsanable = Puede presentarlo después con plazo</span>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 32 }}>
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

              {/* Preview grid */}
              {fotosPreview.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
                  {fotosPreview.map((src, i) => (
                    <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                      <img src={src} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        onClick={() => removeFoto(i)}
                        style={{
                          position: "absolute", top: 4, right: 4,
                          background: "rgba(0,0,0,0.7)", border: "none",
                          color: "#fff", borderRadius: "50%", width: 22, height: 22,
                          cursor: "pointer", fontSize: 14, lineHeight: 1,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {/* Empty slots */}
                  {Array.from({ length: 5 - fotosPreview.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      style={{ aspectRatio: "1", borderRadius: 8, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <span style={{ color: C.border, fontSize: 20 }}>+</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone / button */}
              {fotosFiles.length < 5 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${C.border}`, borderRadius: 10, padding: "28px 20px",
                    textAlign: "center", cursor: "pointer", transition: "all .2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.gold)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                >
                  <p style={{ color: C.sub, fontSize: 14, margin: "0 0 6px", fontWeight: 500 }}>
                    Haz clic para agregar fotos
                  </p>
                  <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
                    JPG, PNG o WEBP — {5 - fotosFiles.length} foto{5 - fotosFiles.length !== 1 ? "s" : ""} restante{5 - fotosFiles.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleFotosChange}
              />
            </div>

            {/* Inspecciones */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Inspecciones del lugar</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px" }}>
                Las empresas deben inspeccionar el lugar antes de enviar su propuesta.
              </p>

              {/* Agregar fecha */}
              <Field label="Fechas disponibles para inspección del lugar">
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="date"
                    value={fechaInspeccionInput}
                    onChange={e => setFechaInspeccionInput(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    style={{ ...inputStyle, flex: 1, colorScheme: "dark" }}
                  />
                  <button
                    onClick={addFechaInspeccion}
                    disabled={!fechaInspeccionInput}
                    style={{
                      background: fechaInspeccionInput ? C.gold : C.bgPanel,
                      border: `1px solid ${fechaInspeccionInput ? C.gold : C.border}`,
                      color: fechaInspeccionInput ? "#000" : C.muted,
                      borderRadius: 8, padding: "10px 18px",
                      cursor: fechaInspeccionInput ? "pointer" : "not-allowed",
                      fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
                    }}
                  >
                    Agregar fecha
                  </button>
                </div>
              </Field>

              {/* Fechas agregadas */}
              {fechasInspeccion.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {fechasInspeccion.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        background: C.blue + "15", border: `1px solid ${C.blue}40`,
                        borderRadius: 20, padding: "5px 12px",
                        display: "flex", alignItems: "center", gap: 8,
                      }}
                    >
                      <span style={{ color: C.blue, fontSize: 13 }}>
                        {new Date(f + "T12:00:00").toLocaleDateString("es-PA", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <button
                        onClick={() => removeFechaInspeccion(i)}
                        style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Lugar */}
              <div style={{ marginTop: 20 }}>
                <Field label="Lugar de inspección" hint="Ej: Torre Pacific, lobby principal">
                  <input
                    type="text"
                    value={lugarInspeccion}
                    onChange={e => setLugarInspeccion(e.target.value)}
                    placeholder="Ej: Torre Pacific, lobby principal"
                    style={inputStyle}
                  />
                </Field>
              </div>

              {/* Info box */}
              <div style={{ background: C.blue + "10", border: `1px solid ${C.blue}30`, borderRadius: 8, padding: "12px 16px", marginTop: 18 }}>
                <p style={{ color: C.blue, fontSize: 13, margin: 0 }}>
                  Las empresas verán estas fechas y el lugar al revisar la licitación. Deben confirmar que asistirán a la inspección antes de enviar su propuesta.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 32 }}>
              <button onClick={() => setStep(2)} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 9, padding: "12px 22px", cursor: "pointer", fontSize: 14 }}>
                ← Anterior
              </button>
              <button
                onClick={() => setStep(4)}
                style={{ background: C.gold, border: "none", color: "#000", borderRadius: 9, padding: "12px 28px", cursor: "pointer", fontSize: 15, fontWeight: 700 }}
              >
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

            {/* Preview card */}
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
                  {
                    label: "Presupuesto anual",
                    val: form.presupuesto_minimo || form.presupuesto_maximo
                      ? `$${Number(form.presupuesto_minimo || 0).toLocaleString()} – $${Number(form.presupuesto_maximo || 0).toLocaleString()}`
                      : "No especificado",
                  },
                  {
                    label: "Fecha de cierre",
                    val: form.fecha_cierre
                      ? new Date(form.fecha_cierre).toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })
                      : "—",
                  },
                  {
                    label: "Duración contrato",
                    val: DURACIONES.find(d => d.value === form.duracion_contrato_meses)?.label ?? "—",
                  },
                  ...(form.precio_referencia && form.precio_referencia_visible ? [{
                    label: "Precio referencia",
                    val: `$${Number(form.precio_referencia).toLocaleString()} / año`,
                  }] : []),
                  ...(fotosFiles.length > 0 ? [{
                    label: "Fotos del lugar",
                    val: `${fotosFiles.length} foto${fotosFiles.length !== 1 ? "s" : ""}`,
                  }] : []),
                  ...(fechasInspeccion.length > 0 ? [{
                    label: "Fechas inspección",
                    val: `${fechasInspeccion.length} fecha${fechasInspeccion.length !== 1 ? "s" : ""} definida${fechasInspeccion.length !== 1 ? "s" : ""}`,
                  }] : []),
                ].map(item => (
                  <div key={item.label} style={{ background: C.bgPanel, borderRadius: 8, padding: "12px 16px" }}>
                    <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>{item.label}</p>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{item.val}</p>
                  </div>
                ))}
              </div>

              {/* Fechas inspección detalle */}
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

            {/* CTA info */}
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
