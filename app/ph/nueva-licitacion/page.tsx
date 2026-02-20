"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { REQUISITOS_POR_SERVICIO, CATEGORIAS_SERVICIO } from "@/lib/supabase/types";

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

type Step = 1 | 2 | 3;

interface Requisito {
  titulo: string;
  descripcion: string;
  subsanable: boolean;
  obligatorio: boolean;
  _custom?: boolean;
}

interface FormData {
  titulo: string;
  categoria: string;
  descripcion: string;
  presupuesto_minimo: string;
  presupuesto_maximo: string;
  fecha_cierre: string;
  duracion_contrato_meses: string;
  urgente: boolean;
}

const DURACIONES = [
  { value: "3",  label: "3 meses" },
  { value: "6",  label: "6 meses" },
  { value: "12", label: "12 meses (1 año)" },
  { value: "24", label: "24 meses (2 años)" },
];

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
    { n: 2, label: "Pliego de requisitos" },
    { n: 3, label: "Revisar y publicar" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 40 }}>
      {steps.map((s, i) => {
        const done    = step > s.n;
        const active  = step === s.n;
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
              <span style={{ color, fontSize: 12, fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{s.label}</span>
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

const inputStyle: React.CSSProperties = {
  background: "#111827", border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "10px 14px", color: C.text, fontSize: 14, outline: "none",
  width: "100%", transition: "border-color .2s",
};

// ── Main component ────────────────────────────────────────────────────────────
export default function NuevaLicitacion() {
  const supabase = createClient();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);
  const [result, setResult] = useState<{ slug: string; titulo: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormData>({
    titulo: "",
    categoria: "",
    descripcion: "",
    presupuesto_minimo: "",
    presupuesto_maximo: "",
    fecha_cierre: "",
    duracion_contrato_meses: "12",
    urgente: false,
  });

  const [requisitos, setRequisitos] = useState<Requisito[]>([]);

  // When category changes, load default requisitos
  const handleCategoriaChange = useCallback((categoria: string) => {
    setForm(f => ({ ...f, categoria }));
    const defaults = (REQUISITOS_POR_SERVICIO[categoria] || REQUISITOS_POR_SERVICIO["default"]).map(r => ({ ...r }));
    setRequisitos(defaults);
  }, []);

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
    if (requisitos.length === 0) errs.requisitos = "Agrega al menos un requisito al pliego";
    requisitos.forEach((r, i) => {
      if (!r.titulo.trim()) errs[`req_${i}_titulo`] = "El título es requerido";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Requisito handlers ──────────────────────────────────────────────────────
  function addRequisito() {
    setRequisitos(prev => [...prev, { titulo: "", descripcion: "", subsanable: true, obligatorio: true, _custom: true }]);
  }

  function removeRequisito(i: number) {
    setRequisitos(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateRequisito(i: number, field: keyof Requisito, value: string | boolean) {
    setRequisitos(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handlePublish(publicar: boolean) {
    setSubmitting(true);
    try {
      const r = await fetch("/api/licitaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo,
          categoria: form.categoria,
          descripcion: form.descripcion,
          presupuesto_minimo: form.presupuesto_minimo ? Number(form.presupuesto_minimo) : null,
          presupuesto_maximo: form.presupuesto_maximo ? Number(form.presupuesto_maximo) : null,
          fecha_cierre: form.fecha_cierre || null,
          urgente: form.urgente,
          duracion_contrato_meses: Number(form.duracion_contrato_meses),
          requisitos,
          publicar,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setToast({ msg: data.error || "Error al crear", tipo: "err" }); return; }
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
    const url = typeof window !== "undefined" ? `${window.location.origin}/licitacion/${result.slug}` : `/licitacion/${result.slug}`;
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

  const catLabel = CATEGORIAS_SERVICIO.find(c => c.value === form.categoria)?.label ?? form.categoria;

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

        {/* ── STEP 1: Detalles básicos ── */}
        {step === 1 && (
          <div>
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Detalles básicos</h1>
            <p style={{ color: C.sub, fontSize: 14, margin: "0 0 36px" }}>Describe el servicio que necesitas y los parámetros generales de la licitación.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
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

              <Field label="Categoría de servicio" required error={errors.categoria}>
                <select
                  value={form.categoria}
                  onChange={e => handleCategoriaChange(e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.categoria ? C.red : C.border, cursor: "pointer" }}
                >
                  <option value="">Selecciona una categoría...</option>
                  {CATEGORIAS_SERVICIO.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>

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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Presupuesto mínimo anual (USD)" hint="Opcional — referencia para empresas">
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
                <Field label="Presupuesto máximo anual (USD)" error={errors.presupuesto_maximo}>
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

        {/* ── STEP 2: Pliego de requisitos ── */}
        {step === 2 && (
          <div>
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Pliego de requisitos</h1>
            <p style={{ color: C.sub, fontSize: 14, margin: "0 0 8px" }}>
              Define los documentos y condiciones que deben cumplir las empresas postulantes.
              {form.categoria && <> Se cargaron los requisitos sugeridos para <strong style={{ color: C.gold }}>{catLabel}</strong>.</>}
            </p>
            {errors.requisitos && <p style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{errors.requisitos}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {requisitos.map((r, i) => (
                <div
                  key={i}
                  style={{ background: C.bgCard, border: `1px solid ${errors[`req_${i}_titulo`] ? C.red : C.border}`, borderRadius: 12, padding: 20 }}
                >
                  {/* Row header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.gold + "20", border: `1.5px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <span style={{ color: C.muted, fontSize: 12, flex: 1 }}>
                      {r._custom ? "Requisito personalizado" : "Requisito sugerido"}
                    </span>
                    <button
                      onClick={() => removeRequisito(i)}
                      title="Eliminar requisito"
                      style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px", borderRadius: 4 }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Fields */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input
                      type="text"
                      value={r.titulo}
                      onChange={e => updateRequisito(i, "titulo", e.target.value)}
                      placeholder="Título del requisito"
                      style={{ background: C.bgPanel, border: `1px solid ${errors[`req_${i}_titulo`] ? C.red : C.border}`, borderRadius: 7, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none", width: "100%" }}
                    />
                    <textarea
                      value={r.descripcion}
                      onChange={e => updateRequisito(i, "descripcion", e.target.value)}
                      placeholder="Descripción / instrucciones adicionales"
                      rows={2}
                      style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none", resize: "vertical", width: "100%" }}
                    />

                    {/* Toggles */}
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <div
                          onClick={() => updateRequisito(i, "obligatorio", !r.obligatorio)}
                          style={{
                            width: 40, height: 22, borderRadius: 11,
                            background: r.obligatorio ? C.red : C.border,
                            position: "relative", cursor: "pointer", transition: "background .2s",
                          }}
                        >
                          <div style={{
                            width: 16, height: 16, borderRadius: "50%", background: "#fff",
                            position: "absolute", top: 3,
                            left: r.obligatorio ? 21 : 3, transition: "left .2s",
                          }} />
                        </div>
                        <span style={{ color: r.obligatorio ? C.red : C.muted, fontSize: 13, fontWeight: r.obligatorio ? 600 : 400 }}>
                          {r.obligatorio ? "Obligatorio" : "Opcional"}
                        </span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <div
                          onClick={() => updateRequisito(i, "subsanable", !r.subsanable)}
                          style={{
                            width: 40, height: 22, borderRadius: 11,
                            background: r.subsanable ? C.gold : C.border,
                            position: "relative", cursor: "pointer", transition: "background .2s",
                          }}
                        >
                          <div style={{
                            width: 16, height: 16, borderRadius: "50%", background: "#fff",
                            position: "absolute", top: 3,
                            left: r.subsanable ? 21 : 3, transition: "left .2s",
                          }} />
                        </div>
                        <span style={{ color: r.subsanable ? C.gold : C.muted, fontSize: 13, fontWeight: r.subsanable ? 600 : 400 }}>
                          {r.subsanable ? "Subsanable" : "No subsanable"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addRequisito}
              style={{ width: "100%", background: "none", border: `2px dashed ${C.border}`, color: C.sub, borderRadius: 10, padding: "14px 0", cursor: "pointer", fontSize: 14, transition: "all .2s" }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = C.gold; (e.target as HTMLButtonElement).style.color = C.gold; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = C.border; (e.target as HTMLButtonElement).style.color = C.sub; }}
            >
              + Agregar requisito personalizado
            </button>

            {/* Legend */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", marginTop: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
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
                Siguiente: Revisar →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview & publish ── */}
        {step === 3 && (
          <div>
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Revisar y publicar</h1>
            <p style={{ color: C.sub, fontSize: 14, margin: "0 0 32px" }}>Verifica los datos antes de publicar. Puedes guardar como borrador o publicar de inmediato.</p>

            {/* Preview card */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                {form.urgente && <span style={{ background: C.red + "20", color: C.red, border: `1px solid ${C.red}40`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>URGENTE</span>}
                <span style={{ background: C.gold + "20", color: C.gold, border: `1px solid ${C.gold}30`, borderRadius: 5, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{catLabel}</span>
              </div>
              <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>{form.titulo}</h2>
              <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>{form.descripcion}</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { label: "Presupuesto anual", val: form.presupuesto_minimo || form.presupuesto_maximo ? `$${Number(form.presupuesto_minimo).toLocaleString()} – $${Number(form.presupuesto_maximo).toLocaleString()}` : "No especificado" },
                  { label: "Fecha de cierre",   val: form.fecha_cierre ? new Date(form.fecha_cierre).toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" }) : "—" },
                  { label: "Duración contrato", val: DURACIONES.find(d => d.value === form.duracion_contrato_meses)?.label ?? "—" },
                ].map(item => (
                  <div key={item.label} style={{ background: C.bgPanel, borderRadius: 8, padding: "12px 16px" }}>
                    <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>{item.label}</p>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{item.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Requisitos preview */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 28 }}>
              <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 18px" }}>
                Pliego de requisitos ({requisitos.length})
              </h3>
              {requisitos.length === 0 ? (
                <p style={{ color: C.muted, fontSize: 14 }}>Sin requisitos configurados. Vuelve al paso anterior.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {requisitos.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i < requisitos.length - 1 ? `1px solid ${C.border}` : "none" }}>
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

            {/* CTA */}
            <div style={{ background: C.goldDim, border: `1px solid ${C.gold}30`, borderRadius: 12, padding: "18px 24px", marginBottom: 24 }}>
              <p style={{ color: C.gold, fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Listo para publicar</p>
              <p style={{ color: C.sub, fontSize: 13, margin: 0 }}>
                Al publicar, la licitación será visible para todas las empresas registradas en LicitaPH.
                También puedes guardarla como borrador para editarla después.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
              <button onClick={() => setStep(2)} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 9, padding: "12px 22px", cursor: "pointer", fontSize: 14 }}>
                ← Editar pliego
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
