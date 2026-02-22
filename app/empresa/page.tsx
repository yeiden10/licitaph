"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_DOCUMENTO } from "@/lib/supabase/types";
import type { Empresa, Documento, Propuesta, Contrato } from "@/lib/supabase/types";

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  enlace: string | null;
  creado_en: string;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#07090F",
  bgCard:    "#0D1117",
  bgPanel:   "#111827",
  border:    "#1F2937",
  borderHov: "#374151",
  blue:      "#4A9EFF",
  blueDim:   "#1D3557",
  gold:      "#C9A84C",
  goldDim:   "#2D2310",
  green:     "#4ADE80",
  greenDim:  "#052E16",
  red:       "#F87171",
  redDim:    "#2D0A0A",
  text:      "#F0F4FF",
  muted:     "#6B7280",
  sub:       "#9CA3AF",
};

type Tab = "dashboard" | "licitaciones" | "propuestas" | "contratos" | "documentos";

interface LicitacionConPH {
  id: string;
  titulo: string;
  categoria: string;
  descripcion: string | null;
  presupuesto_minimo: number | null;
  presupuesto_maximo: number | null;
  fecha_cierre: string | null;
  estado: string;
  urgente: boolean;
  url_slug: string | null;
  propiedades_horizontales?: { nombre: string; ciudad: string | null } | null;
  propuestas?: Array<{ count: number }>;
}

interface PropuestaConLic extends Propuesta {
  licitaciones?: {
    titulo: string;
    categoria: string;
    propiedades_horizontales?: { nombre: string; ciudad: string | null } | null;
  } | null;
}

interface ContratoConEmpresa extends Contrato {
  empresas?: { nombre: string } | null;
}

interface KycData {
  // Sección 1
  ruc?: string;
  anio_inicio_operaciones?: number;
  descripcion?: string;
  sitio_web?: string;
  actividades_economicas?: string[];
  categorias?: string[];
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  emails?: string[];
  telefonos?: string[];
  // Sección 2
  rep_nombre?: string;
  rep_tipo_id?: string;
  rep_numero_id?: string;
  rep_nacionalidad?: string;
  rep_email?: string;
  rep_telefono?: string;
  // Sección 3
  contacto_op_nombre?: string;
  contacto_op_cargo?: string;
  contacto_op_email?: string;
  contacto_op_telefono?: string;
  contacto_cont_nombre?: string;
  contacto_cont_email?: string;
  contacto_cont_telefono?: string;
  // Sección 4
  num_empleados?: number;
  facturacion_anual?: number;
  referencias_bancarias?: string;
  referencias_comerciales?: string;
  tiene_seguro?: boolean;
  tiene_fianza?: boolean;
  porcentaje_fianza?: number;
  completado?: boolean;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, tipo, onClose }: { msg: string; tipo: "ok" | "err" | "info"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = tipo === "ok" ? C.green : tipo === "err" ? C.red : C.blue;
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      background: C.bgCard, border: `1px solid ${bg}`, borderLeft: `4px solid ${bg}`,
      borderRadius: 10, padding: "14px 20px", maxWidth: 360, display: "flex",
      alignItems: "flex-start", gap: 12, boxShadow: `0 8px 32px rgba(0,0,0,.6)`,
      animation: "slideIn .25s ease",
    }}>
      <span style={{ color: bg, fontSize: 18, marginTop: 1 }}>
        {tipo === "ok" ? "✓" : tipo === "err" ? "✕" : "ℹ"}
      </span>
      <p style={{ color: C.text, fontSize: 14, margin: 0, flex: 1 }}>{msg}</p>
      <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}

// ── Loading spinner ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg }}>
      <div style={{ width: 48, height: 48, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

// ── Currency format ───────────────────────────────────────────────────────────
function usd(n: number | null) {
  if (!n) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function badgeEstado(estado: string) {
  const map: Record<string, { label: string; color: string }> = {
    enviada:       { label: "Enviada",        color: C.blue  },
    en_revision:   { label: "En revisión",    color: C.gold  },
    ganada:        { label: "Ganada",         color: C.green },
    no_seleccionada: { label: "No seleccionada", color: C.red },
    borrador:      { label: "Borrador",       color: C.muted },
    activa:        { label: "Activa",         color: C.green },
    en_evaluacion: { label: "En evaluación",  color: C.gold  },
    adjudicada:    { label: "Adjudicada",     color: C.blue  },
    cancelada:     { label: "Cancelada",      color: C.red   },
  };
  const s = map[estado] ?? { label: estado, color: C.muted };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.color + "20", color: s.color,
      border: `1px solid ${s.color}40`,
      borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

// ── Categorias disponibles ────────────────────────────────────────────────────
const CATEGORIAS_SERVICIO = [
  "Seguridad y vigilancia", "Limpieza y aseo", "HVAC y climatización",
  "Jardinería y paisajismo", "Ascensores y montacargas", "Electricidad e iluminación",
  "Pintura y acabados", "Control de plagas", "Plomería y fontanería",
  "Telecomunicaciones", "Impermeabilización", "Mantenimiento general",
  "Portería y conserje", "Piscinas y amenidades", "Estacionamientos",
  "Manejo de residuos", "Señalización", "Cerrajería y accesos",
  "Sistemas contra incendios", "CCTV y automatización", "Generadores eléctricos",
  "Obras civiles menores", "Desinfección", "Fumigación", "Otros servicios",
];

// ── TagInput helper ───────────────────────────────────────────────────────────
function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  function addTag() {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput("");
  }
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", background: C.bgPanel, display: "flex", flexWrap: "wrap", gap: 6 }}>
      {tags.map(t => (
        <span key={t} style={{ background: C.blue + "20", color: C.blue, border: `1px solid ${C.blue}40`, borderRadius: 5, padding: "2px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
        placeholder={placeholder || "Escribir y Enter para agregar"}
        style={{ border: "none", outline: "none", background: "transparent", color: C.text, fontSize: 13, minWidth: 160, flex: 1 }}
      />
    </div>
  );
}

// ── ModalKYC ──────────────────────────────────────────────────────────────────
function ModalKYC({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [kyc, setKyc] = useState<KycData>({
    actividades_economicas: [],
    categorias: [],
    emails: [],
    telefonos: [],
    tiene_seguro: false,
    tiene_fianza: false,
  });

  // Cargar KYC existente al montar
  useEffect(() => {
    fetch("/api/empresa/kyc")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.kyc) {
          const k = data.kyc;
          setKyc({
            ruc: k.ruc,
            anio_inicio_operaciones: k.ano_inicio_operaciones,
            descripcion: k.descripcion,
            sitio_web: k.sitio_web,
            actividades_economicas: k.actividades_economicas || [],
            categorias: k.categorias_servicio || [],
            direccion: k.direccion,
            ciudad: k.ciudad,
            provincia: k.provincia,
            emails: k.emails_empresa || [],
            telefonos: k.telefonos_empresa || [],
            rep_nombre: k.representante_nombre,
            rep_tipo_id: k.representante_tipo_id,
            rep_numero_id: k.representante_cedula,
            rep_nacionalidad: k.representante_nacionalidad,
            rep_email: k.representante_email,
            rep_telefono: k.representante_telefono,
            contacto_op_nombre: k.contacto_nombre,
            contacto_op_cargo: k.contacto_cargo,
            contacto_op_email: k.contacto_email,
            contacto_op_telefono: k.contacto_telefono,
            contacto_cont_nombre: k.contable_nombre,
            contacto_cont_email: k.contable_email,
            contacto_cont_telefono: k.contable_telefono,
            num_empleados: k.num_empleados,
            facturacion_anual: k.facturacion_anual_promedio,
            referencias_bancarias: k.referencias_bancarias,
            referencias_comerciales: k.referencias_comerciales,
            tiene_seguro: k.tiene_seguro_responsabilidad ?? false,
            tiene_fianza: k.tiene_fianza_cumplimiento ?? false,
            porcentaje_fianza: k.porcentaje_fianza_ofrecido,
            completado: k.completado,
          });
        }
      })
      .catch(() => null);
  }, []);

  function set<K extends keyof KycData>(key: K, val: KycData[K]) {
    setKyc(prev => ({ ...prev, [key]: val }));
  }

  // Calcular progreso de las 4 secciones
  const seccionesCompletas = [
    !!(kyc.ruc && kyc.descripcion && kyc.direccion),
    !!(kyc.rep_nombre && kyc.rep_numero_id),
    !!(kyc.contacto_op_nombre),
    !!(kyc.num_empleados),
  ];
  const progreso = Math.round((seccionesCompletas.filter(Boolean).length / 4) * 100);

  async function guardarSeccion() {
    setSaving(true);
    try {
      // Mapear campos frontend → nombres de columnas en la DB / API
      const payload = {
        ruc: kyc.ruc,
        ano_inicio_operaciones: kyc.anio_inicio_operaciones,
        descripcion: kyc.descripcion,
        sitio_web: kyc.sitio_web,
        actividades_economicas: kyc.actividades_economicas,
        categorias_servicio: kyc.categorias,
        direccion: kyc.direccion,
        ciudad: kyc.ciudad,
        provincia: kyc.provincia,
        emails_empresa: kyc.emails,
        telefonos_empresa: kyc.telefonos,
        representante_nombre: kyc.rep_nombre,
        representante_tipo_id: kyc.rep_tipo_id,
        representante_cedula: kyc.rep_numero_id,
        representante_nacionalidad: kyc.rep_nacionalidad,
        representante_email: kyc.rep_email,
        representante_telefono: kyc.rep_telefono,
        contacto_nombre: kyc.contacto_op_nombre,
        contacto_cargo: kyc.contacto_op_cargo,
        contacto_email: kyc.contacto_op_email,
        contacto_telefono: kyc.contacto_op_telefono,
        contable_nombre: kyc.contacto_cont_nombre,
        contable_email: kyc.contacto_cont_email,
        contable_telefono: kyc.contacto_cont_telefono,
        num_empleados: kyc.num_empleados,
        facturacion_anual_promedio: kyc.facturacion_anual,
        referencias_bancarias: kyc.referencias_bancarias,
        referencias_comerciales: kyc.referencias_comerciales,
        tiene_seguro_responsabilidad: kyc.tiene_seguro,
        tiene_fianza_cumplimiento: kyc.tiene_fianza,
        porcentaje_fianza_ofrecido: kyc.porcentaje_fianza,
      };
      const r = await fetch("/api/empresa/kyc", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  const tabLabels = ["Datos empresa", "Representante legal", "Contactos", "Capacidad financiera"];

  const inputStyle = {
    background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", width: "100%",
  } as React.CSSProperties;
  const labelStyle = { display: "flex", flexDirection: "column" as const, gap: 5 };
  const labelTextStyle = { color: C.sub, fontSize: 12, fontWeight: 500 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 700, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <p style={{ color: C.blue, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Perfil KYC</p>
              <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>Completa la verificación de tu empresa</h2>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 24, lineHeight: 1 }}>×</button>
          </div>

          {/* Barra de progreso */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: C.sub, fontSize: 12 }}>Progreso general</span>
              <span style={{ color: progreso === 100 ? C.green : C.gold, fontSize: 12, fontWeight: 700 }}>{progreso}%</span>
            </div>
            <div style={{ background: C.border, borderRadius: 4, height: 5, overflow: "hidden" }}>
              <div style={{ background: progreso === 100 ? C.green : C.gold, height: "100%", width: `${progreso}%`, transition: "width .4s ease" }} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {tabLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "10px 16px", fontSize: 13, fontWeight: activeTab === i ? 600 : 400,
                  color: activeTab === i ? C.blue : C.muted,
                  borderBottom: activeTab === i ? `2px solid ${C.blue}` : "2px solid transparent",
                  whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {label}
                {seccionesCompletas[i] && <span style={{ color: C.green, fontSize: 12 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {/* SECCION 1: Datos de la empresa */}
          {activeTab === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>RUC</span>
                  <input style={inputStyle} value={kyc.ruc || ""} onChange={e => set("ruc", e.target.value)} placeholder="Ej: 155-1234-1234" />
                </label>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Año de inicio de operaciones</span>
                  <input type="number" style={inputStyle} min={1900} max={2025} value={kyc.anio_inicio_operaciones || ""} onChange={e => set("anio_inicio_operaciones", Number(e.target.value))} placeholder="Ej: 2010" />
                </label>
              </div>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Descripción de la empresa</span>
                <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={kyc.descripcion || ""} onChange={e => set("descripcion", e.target.value)} placeholder="Describe los servicios y experiencia de tu empresa..." />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Sitio web</span>
                <input style={inputStyle} value={kyc.sitio_web || ""} onChange={e => set("sitio_web", e.target.value)} placeholder="https://www.miempresa.com" />
              </label>
              <div style={labelStyle}>
                <span style={labelTextStyle}>Actividades económicas</span>
                <TagInput tags={kyc.actividades_economicas || []} onChange={v => set("actividades_economicas", v)} placeholder="Escribir actividad y Enter..." />
              </div>
              <div style={labelStyle}>
                <span style={labelTextStyle}>Categorías de servicio</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 200, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, background: C.bgPanel }}>
                  {CATEGORIAS_SERVICIO.map(cat => (
                    <label key={cat} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={(kyc.categorias || []).includes(cat)}
                        onChange={e => {
                          const cats = kyc.categorias || [];
                          set("categorias", e.target.checked ? [...cats, cat] : cats.filter(c => c !== cat));
                        }}
                        style={{ accentColor: C.blue, width: 14, height: 14 }}
                      />
                      <span style={{ color: C.sub, fontSize: 12 }}>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Dirección</span>
                  <input style={inputStyle} value={kyc.direccion || ""} onChange={e => set("direccion", e.target.value)} placeholder="Calle, número, edificio..." />
                </label>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Ciudad</span>
                  <input style={inputStyle} value={kyc.ciudad || ""} onChange={e => set("ciudad", e.target.value)} placeholder="Ciudad de Panamá" />
                </label>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Provincia</span>
                  <input style={inputStyle} value={kyc.provincia || ""} onChange={e => set("provincia", e.target.value)} placeholder="Panamá" />
                </label>
              </div>
              <div style={labelStyle}>
                <span style={labelTextStyle}>Emails de contacto de la empresa</span>
                <TagInput tags={kyc.emails || []} onChange={v => set("emails", v)} placeholder="email@empresa.com + Enter" />
              </div>
              <div style={labelStyle}>
                <span style={labelTextStyle}>Teléfonos de la empresa</span>
                <TagInput tags={kyc.telefonos || []} onChange={v => set("telefonos", v)} placeholder="507-XXXX-XXXX + Enter" />
              </div>
            </div>
          )}

          {/* SECCION 2: Representante legal */}
          {activeTab === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Nombre completo</span>
                <input style={inputStyle} value={kyc.rep_nombre || ""} onChange={e => set("rep_nombre", e.target.value)} placeholder="Nombre y apellidos" />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Tipo de identificación</span>
                  <select style={inputStyle} value={kyc.rep_tipo_id || ""} onChange={e => set("rep_tipo_id", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="cedula_panama">Cédula panameña</option>
                    <option value="pasaporte">Pasaporte</option>
                    <option value="cedula_extranjera">Cédula extranjera</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Número de cédula/pasaporte</span>
                  <input style={inputStyle} value={kyc.rep_numero_id || ""} onChange={e => set("rep_numero_id", e.target.value)} placeholder="Ej: 8-123-4567" />
                </label>
              </div>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Nacionalidad</span>
                <input style={inputStyle} value={kyc.rep_nacionalidad || ""} onChange={e => set("rep_nacionalidad", e.target.value)} placeholder="Panameña" />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Email del representante</span>
                  <input type="email" style={inputStyle} value={kyc.rep_email || ""} onChange={e => set("rep_email", e.target.value)} placeholder="rep@empresa.com" />
                </label>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Teléfono del representante</span>
                  <input style={inputStyle} value={kyc.rep_telefono || ""} onChange={e => set("rep_telefono", e.target.value)} placeholder="507-XXXX-XXXX" />
                </label>
              </div>
            </div>
          )}

          {/* SECCION 3: Contactos */}
          {activeTab === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "0 0 14px", paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                  Contacto operativo
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <label style={labelStyle}>
                      <span style={labelTextStyle}>Nombre</span>
                      <input style={inputStyle} value={kyc.contacto_op_nombre || ""} onChange={e => set("contacto_op_nombre", e.target.value)} placeholder="Nombre completo" />
                    </label>
                    <label style={labelStyle}>
                      <span style={labelTextStyle}>Cargo</span>
                      <input style={inputStyle} value={kyc.contacto_op_cargo || ""} onChange={e => set("contacto_op_cargo", e.target.value)} placeholder="Gerente de operaciones" />
                    </label>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <label style={labelStyle}>
                      <span style={labelTextStyle}>Email</span>
                      <input type="email" style={inputStyle} value={kyc.contacto_op_email || ""} onChange={e => set("contacto_op_email", e.target.value)} placeholder="operaciones@empresa.com" />
                    </label>
                    <label style={labelStyle}>
                      <span style={labelTextStyle}>Teléfono</span>
                      <input style={inputStyle} value={kyc.contacto_op_telefono || ""} onChange={e => set("contacto_op_telefono", e.target.value)} placeholder="507-XXXX-XXXX" />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "0 0 14px", paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                  Contacto contable
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Nombre</span>
                    <input style={inputStyle} value={kyc.contacto_cont_nombre || ""} onChange={e => set("contacto_cont_nombre", e.target.value)} placeholder="Nombre completo" />
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <label style={labelStyle}>
                      <span style={labelTextStyle}>Email</span>
                      <input type="email" style={inputStyle} value={kyc.contacto_cont_email || ""} onChange={e => set("contacto_cont_email", e.target.value)} placeholder="contabilidad@empresa.com" />
                    </label>
                    <label style={labelStyle}>
                      <span style={labelTextStyle}>Teléfono</span>
                      <input style={inputStyle} value={kyc.contacto_cont_telefono || ""} onChange={e => set("contacto_cont_telefono", e.target.value)} placeholder="507-XXXX-XXXX" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCION 4: Capacidad financiera */}
          {activeTab === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Número de empleados</span>
                  <input type="number" min={0} style={inputStyle} value={kyc.num_empleados || ""} onChange={e => set("num_empleados", Number(e.target.value))} placeholder="Ej: 25" />
                </label>
                <label style={labelStyle}>
                  <span style={labelTextStyle}>Facturación anual promedio (USD)</span>
                  <input type="number" min={0} style={inputStyle} value={kyc.facturacion_anual || ""} onChange={e => set("facturacion_anual", Number(e.target.value))} placeholder="Ej: 500000" />
                </label>
              </div>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Referencias bancarias (banco, tipo de cuenta, años de relación)</span>
                <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={kyc.referencias_bancarias || ""} onChange={e => set("referencias_bancarias", e.target.value)} placeholder="Banco General, Cuenta corriente, 8 años de relación..." />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Referencias comerciales (mínimo 3: nombre, teléfono, empresa)</span>
                <textarea rows={4} style={{ ...inputStyle, resize: "vertical" }} value={kyc.referencias_comerciales || ""} onChange={e => set("referencias_comerciales", e.target.value)} placeholder="1. Juan Pérez, 507-6000-0000, PH Torre del Mar&#10;2. María López, 507-6111-1111, Residencial Albrook&#10;3. ..." />
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: C.bgPanel, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>Seguro de responsabilidad civil</p>
                    <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>¿Tu empresa cuenta con póliza de seguro?</p>
                  </div>
                  <button
                    onClick={() => set("tiene_seguro", !kyc.tiene_seguro)}
                    style={{
                      width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                      background: kyc.tiene_seguro ? C.green : C.border,
                      position: "relative", transition: "background .2s",
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 3, left: kyc.tiene_seguro ? 24 : 3,
                      width: 20, height: 20, borderRadius: "50%", background: "#fff",
                      transition: "left .2s",
                    }} />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: C.bgPanel, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>Fianza de cumplimiento</p>
                    <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>¿Puedes ofrecer fianza de cumplimiento?</p>
                  </div>
                  <button
                    onClick={() => set("tiene_fianza", !kyc.tiene_fianza)}
                    style={{
                      width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                      background: kyc.tiene_fianza ? C.green : C.border,
                      position: "relative", transition: "background .2s",
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 3, left: kyc.tiene_fianza ? 24 : 3,
                      width: 20, height: 20, borderRadius: "50%", background: "#fff",
                      transition: "left .2s",
                    }} />
                  </button>
                </div>

                {kyc.tiene_fianza && (
                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Porcentaje de fianza ofrecido (0-100)</span>
                    <input type="number" min={0} max={100} style={inputStyle} value={kyc.porcentaje_fianza || ""} onChange={e => set("porcentaje_fianza", Number(e.target.value))} placeholder="Ej: 10" />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {activeTab > 0 && (
              <button onClick={() => setActiveTab(activeTab - 1)} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13 }}>
                ← Anterior
              </button>
            )}
            {activeTab < 3 && (
              <button onClick={() => setActiveTab(activeTab + 1)} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13 }}>
                Siguiente →
              </button>
            )}
          </div>
          <button
            onClick={guardarSeccion}
            disabled={saving}
            style={{ background: C.blue, border: "none", color: "#fff", borderRadius: 8, padding: "10px 24px", cursor: saving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Guardando..." : "Guardar sección"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ModalAceptarContrato ──────────────────────────────────────────────────────
function ModalAceptarContrato({
  contrato, onClose, onSuccess,
}: {
  contrato: ContratoConEmpresa;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [checks, setChecks] = useState({ leido: false, inicio: false, penalidades: false });
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const todosChecked = checks.leido && checks.inicio && checks.penalidades;

  async function aceptar() {
    if (!todosChecked) { setErr("Debes aceptar todos los compromisos para continuar."); return; }
    setSending(true);
    setErr("");
    try {
      const r = await fetch(`/api/contratos/${contrato.id}/aceptar`, { method: "POST" });
      if (!r.ok) {
        const data = await r.json();
        setErr(data.error || "Error al aceptar contrato");
        return;
      }
      onSuccess();
    } finally {
      setSending(false);
    }
  }

  const modalidadLabels: Record<string, string> = {
    mensual: "Mensual (12 cuotas iguales)",
    bimestral: "Bimestral (6 cuotas)",
    "50_50": "50% inicio / 50% al finalizar",
    "70_30": "70% inicio / 30% al finalizar",
    adelantado: "Pago adelantado completo",
    personalizado: "Personalizado",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <p style={{ color: C.green, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Firma de contrato</p>
              <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>Revisar y aceptar contrato</h2>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 24, lineHeight: 1 }}>×</button>
          </div>

          {/* Info del contrato */}
          <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 3px" }}>Valor anual</p>
                <p style={{ color: C.green, fontSize: 20, fontWeight: 700, margin: 0 }}>{usd(contrato.valor_anual)}</p>
              </div>
              <div>
                <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 3px" }}>Monto mensual</p>
                <p style={{ color: C.green, fontSize: 20, fontWeight: 700, margin: 0 }}>{usd(contrato.monto_mensual)}/mes</p>
              </div>
            </div>
            {contrato.modalidad_pago && (
              <div>
                <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 3px" }}>Modalidad de pago</p>
                <p style={{ color: C.text, fontSize: 14, margin: 0 }}>{modalidadLabels[contrato.modalidad_pago] || contrato.modalidad_pago}</p>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 3px" }}>Fecha inicio</p>
                <p style={{ color: C.sub, fontSize: 14, margin: 0 }}>{contrato.fecha_inicio ? new Date(contrato.fecha_inicio).toLocaleDateString("es-PA") : "—"}</p>
              </div>
              <div>
                <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 3px" }}>Fecha fin</p>
                <p style={{ color: C.sub, fontSize: 14, margin: 0 }}>{contrato.fecha_fin ? new Date(contrato.fecha_fin).toLocaleDateString("es-PA") : "—"}</p>
              </div>
            </div>
            {contrato.condiciones_especiales && (
              <div>
                <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 3px" }}>Condiciones especiales</p>
                <p style={{ color: C.sub, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{contrato.condiciones_especiales}</p>
              </div>
            )}
            {contrato.penalidad_porcentaje !== undefined && contrato.penalidad_porcentaje !== null && (
              <div style={{ background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 8, padding: "10px 14px" }}>
                <p style={{ color: C.red, fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>Penalidad por incumplimiento</p>
                <p style={{ color: C.sub, fontSize: 13, margin: 0 }}>{contrato.penalidad_porcentaje}% del valor anual del contrato</p>
              </div>
            )}
          </div>

          {/* Checkboxes de aceptación */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Compromisos de aceptación</p>
            {([
              { key: "leido" as const, label: "He leído y acepto todas las condiciones del contrato" },
              { key: "inicio" as const, label: "Me comprometo a iniciar el servicio en la fecha acordada" },
              { key: "penalidades" as const, label: "Acepto las penalidades por incumplimiento establecidas" },
            ]).map(({ key, label }) => (
              <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={checks[key]}
                  onChange={e => setChecks(prev => ({ ...prev, [key]: e.target.checked }))}
                  style={{ marginTop: 2, accentColor: C.green, width: 16, height: 16 }}
                />
                <span style={{ color: C.sub, fontSize: 13, lineHeight: 1.5 }}>{label}</span>
              </label>
            ))}
          </div>

          {err && <p style={{ color: C.red, fontSize: 13, margin: "0 0 16px" }}>{err}</p>}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14 }}>
              Cancelar
            </button>
            <button
              onClick={aceptar}
              disabled={sending || !todosChecked}
              style={{
                background: todosChecked ? C.green : C.border,
                border: "none", color: todosChecked ? "#000" : C.muted,
                borderRadius: 8, padding: "10px 24px",
                cursor: sending || !todosChecked ? "not-allowed" : "pointer",
                fontSize: 14, fontWeight: 600, opacity: sending ? 0.7 : 1,
                transition: "background .2s",
              }}
            >
              {sending ? "Aceptando..." : "Aceptar contrato"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Apply-to-licitacion modal ─────────────────────────────────────────────────
function ModalPostular({
  lic, empresaId, onClose, onSuccess,
}: {
  lic: LicitacionConPH;
  empresaId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [precio, setPrecio] = useState("");
  const [modalidadPago, setModalidadPago] = useState("mensual");
  const [detallePago, setDetallePago] = useState("");
  const [desc, setDesc] = useState("");
  const [tecnica, setTecnica] = useState("");
  const [checks, setChecks] = useState({
    leyo_pliego: false,
    inspeccion_fisica: false,
    cubre_alcance: false,
    no_adicionales: false,
    condiciones: false,
    penalidades: false,
    veracidad: false,
  });
  const [observacionesInspeccion, setObservacionesInspeccion] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  // ── Chat IA para propuesta técnica ──────────────────────────────────────────
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStarted, setAiStarted] = useState(false);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  async function startAIChat() {
    setShowAIChat(true);
    if (aiStarted) return;
    setAiStarted(true);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/propuesta-tecnica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          licitacion_titulo: lic.titulo,
          licitacion_descripcion: lic.descripcion,
          licitacion_categoria: lic.categoria,
        }),
      });
      const data = await res.json();
      setAiMessages([{ role: "assistant", content: data.mensaje || "¿Cuántos años llevan prestando este servicio?" }]);
    } catch {
      setAiMessages([{ role: "assistant", content: "¿Cuántos años llevan prestando este servicio y cuántos edificios atienden actualmente?" }]);
    } finally {
      setAiLoading(false);
    }
  }

  async function sendAIMessage() {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    const newMsgs = [...aiMessages, { role: "user" as const, content: text }];
    setAiMessages(newMsgs);
    setAiInput("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/propuesta-tecnica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs,
          licitacion_titulo: lic.titulo,
          licitacion_descripcion: lic.descripcion,
          licitacion_categoria: lic.categoria,
        }),
      });
      const data = await res.json();
      if (data.tipo === "propuesta" && data.propuesta_tecnica) {
        setTecnica(data.propuesta_tecnica);
        setAiMessages(prev => [...prev, { role: "assistant", content: data.mensaje || "¡Propuesta generada! Revísala y ajústala si lo deseas." }]);
        setShowAIChat(false);
      } else {
        setAiMessages(prev => [...prev, { role: "assistant", content: data.mensaje || "..." }]);
      }
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Error al conectar. Intenta de nuevo." }]);
    } finally {
      setAiLoading(false);
    }
  }

  const todosChecked = checks.leyo_pliego && checks.inspeccion_fisica && checks.cubre_alcance && checks.no_adicionales && checks.condiciones && checks.penalidades && checks.veracidad;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!precio) { setErr("El precio anual es requerido."); return; }
    if (!todosChecked) { setErr("Debes aceptar todos los compromisos legales."); return; }
    setSending(true);
    setErr("");
    try {
      const r = await fetch("/api/propuestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licitacion_id: lic.id,
          precio_anual: Number(precio),
          descripcion: desc,
          propuesta_tecnica: tecnica,
          modalidad_pago: modalidadPago,
          detalle_pago: modalidadPago === "personalizado" ? detallePago : undefined,
          acepta_condiciones: true,
          acepta_inspeccion: true,
          acepta_penalidades: true,
          verifico_pliego: checks.leyo_pliego,
          inspecciono_lugar: checks.inspeccion_fisica,
          observaciones_inspeccion: observacionesInspeccion || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.error || "Error al enviar"); return; }
      onSuccess();
    } finally { setSending(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <p style={{ color: C.blue, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Postular a licitación</p>
            <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{lic.titulo}</h2>
            {lic.propiedades_horizontales && (
              <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>{lic.propiedades_horizontales.nombre} · {lic.propiedades_horizontales.ciudad}</p>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 24, lineHeight: 1 }}>×</button>
        </div>

        {lic.presupuesto_minimo && (
          <div style={{ background: C.blueDim, border: `1px solid ${C.blue}30`, borderRadius: 8, padding: "10px 16px", marginBottom: 20, display: "flex", gap: 16 }}>
            <span style={{ color: C.muted, fontSize: 13 }}>Presupuesto referencial:</span>
            <span style={{ color: C.blue, fontSize: 13, fontWeight: 600 }}>{usd(lic.presupuesto_minimo)} – {usd(lic.presupuesto_maximo)} / año</span>
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: C.sub, fontSize: 13, fontWeight: 500 }}>Precio anual ofertado (USD) <span style={{ color: C.red }}>*</span></span>
            <input
              type="number" min="0" step="100"
              value={precio} onChange={e => setPrecio(e.target.value)}
              placeholder="Ej: 36000"
              style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 15, outline: "none" }}
            />
          </label>

          {/* Modalidad de pago */}
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: C.sub, fontSize: 13, fontWeight: 500 }}>Modalidad de pago</span>
            <select
              value={modalidadPago}
              onChange={e => setModalidadPago(e.target.value)}
              style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none" }}
            >
              <option value="mensual">Mensual (12 cuotas iguales)</option>
              <option value="bimestral">Bimestral (6 cuotas)</option>
              <option value="50_50">50% al inicio, 50% al finalizar</option>
              <option value="70_30">70% al inicio, 30% al finalizar</option>
              <option value="adelantado">Pago adelantado completo</option>
              <option value="personalizado">Personalizado (especificar)</option>
            </select>
          </label>
          {modalidadPago === "personalizado" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: C.sub, fontSize: 13, fontWeight: 500 }}>Detalla la modalidad de pago</span>
              <textarea
                value={detallePago} onChange={e => setDetallePago(e.target.value)} rows={2}
                placeholder="Describe en detalle la modalidad de pago propuesta..."
                style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", resize: "vertical" }}
              />
            </label>
          )}

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: C.sub, fontSize: 13, fontWeight: 500 }}>Descripción de la propuesta</span>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="Describe brevemente tu oferta de valor..."
              style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", resize: "vertical" }}
            />
          </label>
          {/* Propuesta técnica con asistente IA */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: C.sub, fontSize: 13, fontWeight: 500 }}>Propuesta técnica</span>
              <button
                type="button"
                onClick={startAIChat}
                style={{ background: showAIChat ? C.blue + "20" : C.bgPanel, border: `1px solid ${C.blue}40`, color: C.blue, borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}
              >
                🤖 {showAIChat ? "Asistente activo" : "Redactar con IA"}
              </button>
            </div>

            {/* Chat IA */}
            {showAIChat && (
              <div style={{ background: C.bgPanel, border: `1px solid ${C.blue}30`, borderRadius: 10, overflow: "hidden", marginBottom: 4 }}>
                {/* Mensajes */}
                <div style={{ maxHeight: 220, overflowY: "auto", padding: "12px 14px" }}>
                  {aiMessages.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
                      {m.role === "assistant" && (
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.blue + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 6, marginTop: 2, fontSize: 11 }}>🤖</div>
                      )}
                      <div style={{
                        maxWidth: "80%",
                        background: m.role === "user" ? C.blue + "20" : C.bgCard,
                        color: C.text, fontSize: 13, lineHeight: 1.5,
                        borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                        padding: "8px 12px",
                      }}>{m.content}</div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.blue + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 6, fontSize: 11 }}>🤖</div>
                      <div style={{ background: C.bgCard, borderRadius: "12px 12px 12px 4px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.muted, animation: `pulse 1.4s ease-in-out ${i*0.2}s infinite` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={aiChatEndRef} />
                </div>
                {/* Input */}
                <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 12px", display: "flex", gap: 8 }}>
                  <input
                    type="text" value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAIMessage(); } }}
                    placeholder="Responde aquí..."
                    disabled={aiLoading}
                    style={{ flex: 1, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none" }}
                  />
                  <button type="button" onClick={sendAIMessage} disabled={aiLoading || !aiInput.trim()}
                    style={{ background: aiInput.trim() ? C.blue : C.bgCard, border: "none", color: aiInput.trim() ? "#fff" : C.muted, borderRadius: 6, padding: "7px 14px", cursor: aiInput.trim() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700 }}>
                    →
                  </button>
                </div>
                {tecnica && (
                  <div style={{ padding: "6px 14px 10px", borderTop: `1px solid ${C.border}` }}>
                    <button type="button" onClick={() => setShowAIChat(false)} style={{ background: C.green + "15", border: `1px solid ${C.green}30`, color: C.green, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      ✓ Ver propuesta generada ↓
                    </button>
                  </div>
                )}
              </div>
            )}

            <textarea
              value={tecnica} onChange={e => setTecnica(e.target.value)} rows={tecnica ? 6 : 4}
              placeholder={tecnica ? "" : "Detalla tu metodología, equipo, experiencia relevante... o usa el asistente IA ↑"}
              style={{ background: C.bgPanel, border: `1px solid ${tecnica ? C.green + "40" : C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", resize: "vertical" }}
            />
            {tecnica && (
              <p style={{ color: C.green, fontSize: 11, margin: 0 }}>✓ Propuesta técnica lista — puedes editarla directamente arriba</p>
            )}
          </div>

          {/* Verificación del pliego — NUEVO */}
          <div style={{ background: "rgba(201,168,76,0.04)", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>📋</span>
              <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>
                Declaración de verificación del pliego
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { key: "leyo_pliego" as const, label: "He leído el pliego de cargos completo y comprendo todos los requisitos, especificaciones y alcance del servicio solicitado" },
                { key: "inspeccion_fisica" as const, label: "He realizado una inspección física del lugar o me comprometo formalmente a realizarla antes de firmar el contrato, y la propuesta refleja lo observado" },
                { key: "cubre_alcance" as const, label: "Mi propuesta cubre el 100% del alcance descrito en el pliego sin omisiones ni exclusiones" },
                { key: "no_adicionales" as const, label: "No solicitaré costos adicionales por elementos ya especificados en el pliego de cargos" },
              ]).map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checks[key]}
                    onChange={e => setChecks(prev => ({ ...prev, [key]: e.target.checked }))}
                    style={{ marginTop: 2, accentColor: C.gold, width: 15, height: 15, flexShrink: 0 }}
                  />
                  <span style={{ color: C.sub, fontSize: 13, lineHeight: 1.5 }}>{label}</span>
                </label>
              ))}
            </div>
            {/* Observaciones de inspección */}
            <div style={{ marginTop: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ color: C.sub, fontSize: 12, fontWeight: 500 }}>Observaciones de la inspección <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span></span>
                <textarea
                  value={observacionesInspeccion}
                  onChange={e => setObservacionesInspeccion(e.target.value)}
                  rows={3}
                  placeholder="Describe lo observado en la inspección del lugar, condiciones actuales, materiales encontrados, aspectos relevantes para tu propuesta..."
                  style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }}
                />
              </label>
            </div>
          </div>

          {/* Compromisos legales */}
          <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 12px" }}>
              Compromisos legales — requeridos para enviar
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { key: "condiciones" as const, label: "Me comprometo a cumplir íntegramente las condiciones y especificaciones de esta propuesta" },
                { key: "penalidades" as const, label: "Acepto penalidades por incumplimiento de contrato (mínimo 10% del valor anual)" },
                { key: "veracidad" as const, label: "Confirmo que toda la información proporcionada es verídica y respondo por daños y perjuicios ante falsedad" },
              ]).map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checks[key]}
                    onChange={e => setChecks(prev => ({ ...prev, [key]: e.target.checked }))}
                    style={{ marginTop: 2, accentColor: C.gold, width: 15, height: 15, flexShrink: 0 }}
                  />
                  <span style={{ color: C.sub, fontSize: 13, lineHeight: 1.5 }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14 }}>
              Cancelar
            </button>
            <button type="submit" disabled={sending || !todosChecked} style={{
              background: todosChecked ? C.blue : C.border,
              border: "none", color: todosChecked ? "#fff" : C.muted,
              borderRadius: 8, padding: "10px 24px",
              cursor: sending || !todosChecked ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600, opacity: sending ? 0.7 : 1,
              transition: "background .2s",
            }}>
              {sending ? "Enviando..." : "Enviar propuesta →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmpresaDashboard() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [propuestas, setPropuestas] = useState<PropuestaConLic[]>([]);
  const [contratos, setContratos] = useState<ContratoConEmpresa[]>([]);
  const [licitaciones, setLicitaciones] = useState<LicitacionConPH[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [postularLic, setPostularLic] = useState<LicitacionConPH | null>(null);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; tipo: "ok" | "err" | "info" }>>([]);
  const [showKyc, setShowKyc] = useState(false);
  const [kycCompletado, setKycCompletado] = useState(true);
  const [contratoAceptar, setContratoAceptar] = useState<ContratoConEmpresa | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Mobile sidebar ───────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Review state ─────────────────────────────────────────────────────────────
  const [showReview, setShowReview] = useState<string | null>(null); // contrato_id
  const [reviewPuntaje, setReviewPuntaje] = useState(5);
  const [reviewComentario, setReviewComentario] = useState("");
  const [enviandoReview, setEnviandoReview] = useState(false);
  const [reviewsEnviadas, setReviewsEnviadas] = useState<Set<string>>(new Set());

  // ── Notificaciones Realtime ───────────────────────────────────────────────────
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  const notifNoLeidas = notificaciones.filter(n => !n.leida).length;

  const cargarNotificaciones = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("notificaciones")
      .select("*")
      .eq("usuario_id", userId)
      .order("creado_en", { ascending: false })
      .limit(30);
    setNotificaciones(data || []);
  }, []);

  const marcarLeida = async (id: string) => {
    await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const marcarTodasLeidas = async () => {
    const ids = notificaciones.filter(n => !n.leida).map(n => n.id);
    if (!ids.length) return;
    await supabase.from("notificaciones").update({ leida: true }).in("id", ids);
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setNotifPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toast = useCallback((msg: string, tipo: "ok" | "err" | "info" = "ok") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, tipo }]);
  }, []);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }

      let { data: emp } = await supabase
        .from("empresas")
        .select("*")
        .eq("usuario_id", user.id)
        .single();

      // Si no existe registro en empresas, créalo automáticamente
      if (!emp) {
        const nombre = user.user_metadata?.nombre_completo || user.email?.split("@")[0] || "Mi Empresa";
        const { data: nuevo, error: insertErr } = await supabase
          .from("empresas")
          .insert({
            usuario_id: user.id,
            nombre,
            ruc: "00-000-000",
            email: user.email,
            representante_legal: nombre,
            telefono: "",
            direccion: "",
            estado_verificacion: "pendiente",
            activo: true,
          })
          .select()
          .single();
        if (insertErr) console.error("Error creando empresa:", insertErr.message);
        emp = nuevo;
      }

      if (!emp) { window.location.href = "/"; return; }
      setEmpresa(emp);

      await Promise.all([
        cargarDocumentos(emp.id),
        cargarPropuestas(),
        cargarContratos(emp.id),
        cargarLicitaciones(),
      ]);

      // Cargar KYC y mostrar modal si no está completo
      try {
        const r = await fetch("/api/empresa/kyc");
        if (r.ok) {
          const kycData = await r.json();
          const completado = kycData?.kyc?.completado === true;
          setKycCompletado(completado);
          if (!completado) {
            setTimeout(() => setShowKyc(true), 1000);
          }
        } else {
          setKycCompletado(false);
          setTimeout(() => setShowKyc(true), 1000);
        }
      } catch {
        setKycCompletado(false);
        setTimeout(() => setShowKyc(true), 1000);
      }

      // Cargar notificaciones
      await cargarNotificaciones(user.id);

      // ── Supabase Realtime ──────────────────────────────────
      const channel = supabase
        .channel(`notif-empresa-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notificaciones",
            filter: `usuario_id=eq.${user.id}`,
          },
          (payload) => {
            const nueva = payload.new as Notificacion;
            setNotificaciones(prev => [nueva, ...prev]);
            toast(nueva.titulo, "info");
          }
        )
        .subscribe();

      setLoading(false);

      return () => { supabase.removeChannel(channel); };
    })();
  }, []);

  const cargarDocumentos = async (empresaId: string) => {
    const { data } = await supabase
      .from("documentos")
      .select("*")
      .eq("entidad_id", empresaId)
      .eq("entidad_tipo", "empresa");
    setDocumentos(data || []);
  };

  const cargarPropuestas = async () => {
    const { data } = await supabase
      .from("propuestas")
      .select(`
        *,
        licitaciones (
          titulo, categoria,
          propiedades_horizontales (nombre, ciudad)
        )
      `)
      .order("creado_en", { ascending: false });
    setPropuestas((data || []) as PropuestaConLic[]);
  };

  const cargarContratos = async (empresaId: string) => {
    const { data } = await supabase
      .from("contratos")
      .select("*, empresas (nombre)")
      .eq("empresa_id", empresaId)
      .order("creado_en", { ascending: false });
    setContratos((data || []) as ContratoConEmpresa[]);
  };

  const cargarLicitaciones = async (categoria?: string) => {
    let url = "/api/licitaciones";
    if (categoria && categoria !== "todos") url += `?categoria=${categoria}`;
    const r = await fetch(url);
    if (r.ok) {
      const data = await r.json();
      setLicitaciones(data || []);
    }
  };

  // ── Document upload ─────────────────────────────────────────────────────────
  async function handleUpload(tipo: string, file: File) {
    if (!empresa) return;
    setUploadingTipo(tipo);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tipo", tipo);
      fd.append("contexto", "empresa");
      fd.append("entidad_id", empresa.id);

      const r = await fetch("/api/documentos/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) { toast(data.error || "Error al subir", "err"); return; }
      toast("Documento subido exitosamente", "ok");
      await cargarDocumentos(empresa.id);
    } catch {
      toast("Error inesperado al subir", "err");
    } finally {
      setUploadingTipo(null);
    }
  }

  // ── Document completion ─────────────────────────────────────────────────────
  const docsSubidos = TIPOS_DOCUMENTO.filter(td =>
    documentos.some(d => d.tipo === td.id)
  ).length;
  const docsRequeridos = TIPOS_DOCUMENTO.filter(td => td.requerido).length;
  const docsRequeridosSubidos = TIPOS_DOCUMENTO.filter(td =>
    td.requerido && documentos.some(d => d.tipo === td.id)
  ).length;
  const docCompleto = docsRequeridosSubidos >= docsRequeridos;

  if (loading) return <Spinner />;

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const TABS: Array<{ id: Tab; label: string; icon: string }> = [
    { id: "dashboard",    label: "Dashboard",    icon: "◈" },
    { id: "licitaciones", label: "Licitaciones",  icon: "📋" },
    { id: "propuestas",   label: "Propuestas",    icon: "📤" },
    { id: "contratos",    label: "Contratos",     icon: "📄" },
    { id: "documentos",   label: "Documentos",    icon: "🗂" },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        input:focus, textarea:focus, select:focus { border-color: ${C.blue} !important; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${C.bg}; } ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }

        /* ── RESPONSIVE ── */
        .emp-hamburger { display: none !important; }
        .emp-sidebar { transform: translateX(0); transition: transform 0.25s ease; }

        @media (max-width: 768px) {
          .emp-hamburger { display: flex !important; align-items: center; justify-content: center; }
          .emp-sidebar { transform: translateX(-100%); }
          .emp-sidebar.open { transform: translateX(0); }
          .emp-main { margin-left: 0 !important; padding: 16px !important; padding-top: 56px !important; }
          .emp-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .emp-grid-3 { grid-template-columns: 1fr 1fr !important; }
          .emp-lic-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .emp-grid-4 { grid-template-columns: 1fr !important; }
          .emp-grid-3 { grid-template-columns: 1fr !important; }
          .emp-main { padding: 12px !important; padding-top: 56px !important; }
        }
      `}</style>

      {/* Toasts */}
      {toasts.map(t => (
        <Toast key={t.id} msg={t.msg} tipo={t.tipo} onClose={() => setToasts(ts => ts.filter(x => x.id !== t.id))} />
      ))}

      {/* Modal KYC */}
      {showKyc && (
        <ModalKYC
          onClose={() => setShowKyc(false)}
          onSaved={() => {
            toast("KYC guardado correctamente", "ok");
            // Refrescar estado KYC
            fetch("/api/empresa/kyc")
              .then(r => r.ok ? r.json() : null)
              .then(data => { if (data?.kyc?.completado) setKycCompletado(true); })
              .catch(() => null);
          }}
        />
      )}

      {/* Modal aceptar contrato */}
      {contratoAceptar && (
        <ModalAceptarContrato
          contrato={contratoAceptar}
          onClose={() => setContratoAceptar(null)}
          onSuccess={() => {
            setContratoAceptar(null);
            toast("Contrato aceptado. El PH ha sido notificado.", "ok");
            if (empresa) cargarContratos(empresa.id);
          }}
        />
      )}

      {/* Postular modal */}
      {postularLic && empresa && (
        <ModalPostular
          lic={postularLic}
          empresaId={empresa.id}
          onClose={() => setPostularLic(null)}
          onSuccess={() => {
            setPostularLic(null);
            toast("Propuesta enviada exitosamente!", "ok");
            cargarPropuestas();
          }}
        />
      )}

      {/* Botón hamburguesa — solo mobile */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        aria-label="Menú"
        style={{
          display: "none",
          position: "fixed", top: 12, left: 12, zIndex: 200,
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "8px 10px", cursor: "pointer",
          fontSize: 18, lineHeight: 1, color: C.text,
          // visible solo en mobile via media query en <style>
        }}
        className="emp-hamburger"
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 150 }}
        />
      )}

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* ── Sidebar ── */}
        <aside
          className={`emp-sidebar${sidebarOpen ? " open" : ""}`}
          style={{
            width: 260, background: C.bgCard, borderRight: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", padding: "24px 0", position: "fixed",
            top: 0, left: 0, height: "100vh", overflowY: "auto", zIndex: 160,
          }}
        >
          {/* Logo */}
          <div style={{ padding: "0 24px 24px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${C.blue}, #2563EB)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>L</span>
              </div>
              <div>
                <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>LicitaPH</p>
                <p style={{ color: C.blue, fontSize: 11, margin: 0, fontWeight: 500 }}>Portal Empresa</p>
              </div>
            </div>
          </div>

          {/* Empresa info */}
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>Empresa</p>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>{empresa?.nombre}</p>
            <p style={{ color: C.sub, fontSize: 12, margin: 0 }}>{empresa?.email}</p>
            {empresa?.estado_verificacion && (
              <span style={{
                display: "inline-block", marginTop: 8,
                background: empresa.estado_verificacion === "verificada" ? C.green + "20" : C.gold + "20",
                color: empresa.estado_verificacion === "verificada" ? C.green : C.gold,
                border: `1px solid ${empresa.estado_verificacion === "verificada" ? C.green : C.gold}40`,
                borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600,
              }}>
                {empresa.estado_verificacion === "verificada" ? "✓ Verificada" : "Pendiente verificación"}
              </span>
            )}
          </div>

          {/* Doc progress */}
          {!docCompleto && (
            <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
              <p style={{ color: C.gold, fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>
                Completa tu perfil
              </p>
              <div style={{ background: C.border, borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ background: C.gold, height: "100%", width: `${(docsRequeridosSubidos / docsRequeridos) * 100}%`, transition: "width .3s" }} />
              </div>
              <p style={{ color: C.sub, fontSize: 11, margin: "6px 0 0" }}>
                {docsRequeridosSubidos}/{docsRequeridos} documentos requeridos
              </p>
              <button
                onClick={() => setTab("documentos")}
                style={{ marginTop: 8, background: C.gold, border: "none", color: "#000", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%" }}
              >
                Subir documentos →
              </button>
            </div>
          )}

          {/* Nav */}
          <nav style={{ padding: "12px 12px", flex: 1 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSidebarOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 8, border: "none",
                  background: tab === t.id ? C.blue + "20" : "transparent",
                  color: tab === t.id ? C.blue : C.sub,
                  cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
                  textAlign: "left", marginBottom: 2,
                  borderLeft: tab === t.id ? `3px solid ${C.blue}` : "3px solid transparent",
                }}
              >
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                {t.label}
                {t.id === "documentos" && !docCompleto && (
                  <span style={{ marginLeft: "auto", background: C.gold, color: "#000", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    !
                  </span>
                )}
              </button>
            ))}

            {/* KYC item en sidebar */}
            <button
              onClick={() => setShowKyc(true)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 8, border: "none",
                background: "transparent",
                color: C.sub,
                cursor: "pointer", fontSize: 14, fontWeight: 400,
                textAlign: "left", marginBottom: 2,
                borderLeft: "3px solid transparent",
              }}
            >
              <span style={{ fontSize: 16 }}>🏢</span>
              Perfil KYC
              {!kycCompletado && (
                <span style={{ marginLeft: "auto", background: C.red, color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  !
                </span>
              )}
            </button>
          </nav>

          {/* ── Campana de notificaciones ── */}
          <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}` }} ref={notifPanelRef}>
            <button
              onClick={() => setNotifPanelOpen(o => !o)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 8, border: "none",
                background: notifPanelOpen ? C.blue + "15" : "transparent",
                color: notifPanelOpen ? C.blue : C.sub,
                cursor: "pointer", fontSize: 14, fontWeight: 400,
                textAlign: "left", position: "relative",
              }}
            >
              <span style={{ fontSize: 16 }}>🔔</span>
              Notificaciones
              {notifNoLeidas > 0 && (
                <span style={{
                  marginLeft: "auto", background: C.red, color: "#fff",
                  borderRadius: 8, minWidth: 18, height: 18, fontSize: 10,
                  fontWeight: 700, display: "flex", alignItems: "center",
                  justifyContent: "center", padding: "0 4px",
                }}>
                  {notifNoLeidas > 9 ? "9+" : notifNoLeidas}
                </span>
              )}
            </button>

            {notifPanelOpen && (
              <div style={{
                position: "fixed", left: 268, bottom: 80, width: 340,
                background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,.8)",
                zIndex: 999, overflow: "hidden",
                animation: "slideIn .2s ease",
              }}>
                <div style={{
                  padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>🔔 Notificaciones</span>
                  {notifNoLeidas > 0 && (
                    <button
                      onClick={marcarTodasLeidas}
                      style={{ fontSize: 11, color: C.blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  {notificaciones.length === 0 ? (
                    <div style={{ padding: 28, textAlign: "center", color: C.muted, fontSize: 12 }}>
                      Sin notificaciones por el momento
                    </div>
                  ) : (
                    notificaciones.map(n => (
                      <div
                        key={n.id}
                        onClick={() => { marcarLeida(n.id); if (n.enlace) window.location.href = n.enlace; }}
                        style={{
                          padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
                          cursor: "pointer", transition: "background .15s",
                          borderLeft: n.leida ? `3px solid transparent` : `3px solid ${C.blue}`,
                          opacity: n.leida ? 0.65 : 1,
                          background: "transparent",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 3 }}>{n.titulo}</div>
                        <div style={{ fontSize: 11, color: C.sub }}>{n.mensaje}</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                          {new Date(n.creado_en).toLocaleString("es-PA", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sign out */}
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
              style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13 }}
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="emp-main" style={{ marginLeft: 260, flex: 1, padding: 32, minHeight: "100vh", background: C.bg }}>
          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <div>
              <h1 style={{ color: C.text, fontSize: 26, fontWeight: 700, margin: "0 0 4px" }}>
                Bienvenido, {empresa?.nombre}
              </h1>
              <p style={{ color: C.sub, fontSize: 14, margin: "0 0 32px" }}>
                Panel de control de tu empresa proveedora
              </p>

              {/* Stats cards */}
              <div className="emp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                {[
                  { label: "Propuestas enviadas", val: propuestas.filter(p => p.estado !== "borrador").length, color: C.blue },
                  { label: "Propuestas ganadas",  val: propuestas.filter(p => p.estado === "ganada").length,  color: C.green },
                  { label: "Contratos activos",   val: contratos.filter(c => c.estado === "activo").length,   color: C.gold },
                  { label: "Docs subidos",         val: `${docsSubidos}/8`,                                   color: docCompleto ? C.green : C.gold },
                ].map(s => (
                  <div key={s.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderTop: `3px solid ${s.color}` }}>
                    <p style={{ color: C.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>{s.label}</p>
                    <p style={{ color: s.color, fontSize: 32, fontWeight: 700, margin: 0 }}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Recent propuestas */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Propuestas recientes</h2>
                  <button onClick={() => setTab("propuestas")} style={{ background: "none", border: "none", color: C.blue, fontSize: 13, cursor: "pointer" }}>Ver todas →</button>
                </div>
                {propuestas.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <p style={{ fontSize: 36, marginBottom: 8 }}>📤</p>
                    <p style={{ color: C.sub, fontSize: 14 }}>Aún no has enviado propuestas.</p>
                    <button onClick={() => setTab("licitaciones")} style={{ marginTop: 12, background: C.blue, border: "none", color: "#fff", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                      Ver licitaciones disponibles →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {propuestas.slice(0, 5).map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: C.bgPanel, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div>
                          <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>
                            {p.licitaciones?.titulo ?? "Licitación"}
                          </p>
                          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
                            {p.licitaciones?.propiedades_horizontales?.nombre} · {new Date(p.creado_en).toLocaleDateString("es-PA")}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span style={{ color: C.blue, fontWeight: 600, fontSize: 14 }}>{usd(p.precio_anual)}/año</span>
                          {badgeEstado(p.estado)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LICITACIONES */}
          {tab === "licitaciones" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Licitaciones disponibles</h1>
                  <p style={{ color: C.sub, fontSize: 14, margin: 0 }}>Encuentra contratos para tu empresa</p>
                </div>
                <select
                  value={filtroCategoria}
                  onChange={e => { setFiltroCategoria(e.target.value); cargarLicitaciones(e.target.value); }}
                  style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}
                >
                  <option value="todos">Todas las categorías</option>
                  {["seguridad","limpieza","hvac","jardineria","ascensores","electricidad","pintura","plagas","otros"].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              {licitaciones.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0", background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>📋</p>
                  <p style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No hay licitaciones disponibles</p>
                  <p style={{ color: C.sub, fontSize: 14 }}>Vuelve pronto o cambia el filtro de categoría</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {licitaciones.map(lic => {
                    const yaPostule = propuestas.some(p => p.licitacion_id === lic.id);
                    return (
                      <div key={lic.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            {lic.urgente && (
                              <span style={{ background: C.red + "20", color: C.red, border: `1px solid ${C.red}40`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>URGENTE</span>
                            )}
                            <span style={{ background: C.blue + "15", color: C.blue, border: `1px solid ${C.blue}30`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                              {lic.categoria}
                            </span>
                          </div>
                          <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>{lic.titulo}</h3>
                          {lic.propiedades_horizontales && (
                            <p style={{ color: C.sub, fontSize: 13, margin: "0 0 10px" }}>
                              📍 {lic.propiedades_horizontales.nombre} · {lic.propiedades_horizontales.ciudad}
                            </p>
                          )}
                          {lic.descripcion && (
                            <p style={{ color: C.muted, fontSize: 14, margin: "0 0 12px", lineHeight: 1.6 }}>
                              {lic.descripcion.substring(0, 180)}{lic.descripcion.length > 180 ? "..." : ""}
                            </p>
                          )}
                          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                            {(lic.presupuesto_minimo || lic.presupuesto_maximo) && (
                              <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>
                                💰 {usd(lic.presupuesto_minimo)} – {usd(lic.presupuesto_maximo)} / año
                              </span>
                            )}
                            {lic.fecha_cierre && (
                              <span style={{ color: C.muted, fontSize: 13 }}>
                                🗓 Cierre: {new Date(lic.fecha_cierre).toLocaleDateString("es-PA")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end", minWidth: 160 }}>
                          {yaPostule ? (
                            <span style={{ background: C.green + "20", color: C.green, border: `1px solid ${C.green}40`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600 }}>
                              ✓ Propuesta enviada
                            </span>
                          ) : (
                            <button
                              onClick={() => setPostularLic(lic)}
                              style={{ background: C.blue, border: "none", color: "#fff", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}
                            >
                              Postular →
                            </button>
                          )}
                          {lic.url_slug && (
                            <a href={`/licitacion/${lic.url_slug}`} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, fontSize: 12, textDecoration: "underline" }}>
                              Ver detalles
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PROPUESTAS */}
          {tab === "propuestas" && (
            <div>
              <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Mis propuestas</h1>
              <p style={{ color: C.sub, fontSize: 14, margin: "0 0 28px" }}>Historial de todas tus postulaciones</p>

              {propuestas.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0", background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>📤</p>
                  <p style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No has enviado propuestas aún</p>
                  <p style={{ color: C.sub, fontSize: 14, marginBottom: 20 }}>Encuentra licitaciones abiertas y postula a las que se ajusten a tu servicio</p>
                  <button onClick={() => setTab("licitaciones")} style={{ background: C.blue, border: "none", color: "#fff", borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
                    Ver licitaciones →
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {propuestas.map(p => (
                    <div key={p.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
                            {p.licitaciones?.titulo ?? "Licitación"}
                          </p>
                          <p style={{ color: C.sub, fontSize: 13, margin: "0 0 12px" }}>
                            {p.licitaciones?.propiedades_horizontales?.nombre} ·{" "}
                            {p.licitaciones?.propiedades_horizontales?.ciudad}
                          </p>
                        </div>
                        {badgeEstado(p.estado)}
                      </div>
                      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Precio ofertado</p>
                          <p style={{ color: C.blue, fontSize: 18, fontWeight: 700, margin: 0 }}>{usd(p.precio_anual)}/año</p>
                        </div>
                        {p.puntaje_ia !== null && (
                          <div>
                            <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Score IA</p>
                            <p style={{ color: (p.puntaje_ia ?? 0) > 70 ? C.green : C.gold, fontSize: 18, fontWeight: 700, margin: 0 }}>{p.puntaje_ia}/100</p>
                          </div>
                        )}
                        <div>
                          <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Enviada</p>
                          <p style={{ color: C.sub, fontSize: 14, fontWeight: 500, margin: 0 }}>
                            {p.enviada_at ? new Date(p.enviada_at).toLocaleDateString("es-PA") : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTRATOS */}
          {tab === "contratos" && (
            <div>
              <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Contratos</h1>
              <p style={{ color: C.sub, fontSize: 14, margin: "0 0 28px" }}>Contratos vigentes y pasados de tu empresa</p>

              {contratos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0", background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>📄</p>
                  <p style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Sin contratos activos</p>
                  <p style={{ color: C.sub, fontSize: 14 }}>Cuando ganes una licitación, el contrato aparecerá aquí</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {contratos.map(c => (
                    <div key={c.id} style={{ background: C.bgCard, border: `1px solid ${c.estado_firma === "pendiente" ? C.gold : C.border}`, borderRadius: 12, padding: 22 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                        <div>
                          <p style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
                            Contrato #{c.id.slice(-6).toUpperCase()}
                          </p>
                          <p style={{ color: C.sub, fontSize: 13, margin: "0 0 12px" }}>
                            {c.fecha_inicio && `${new Date(c.fecha_inicio).toLocaleDateString("es-PA")} → `}
                            {c.fecha_fin && new Date(c.fecha_fin).toLocaleDateString("es-PA")}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          {/* Badge estado firma */}
                          {c.estado_firma === "pendiente" && (
                            <span style={{
                              background: C.goldDim, color: C.gold,
                              border: `1px solid ${C.gold}40`,
                              borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                              display: "flex", alignItems: "center", gap: 5,
                            }}>
                              ⏳ Pendiente tu aceptación
                            </span>
                          )}
                          {c.estado_firma === "empresa_acepto" && (
                            <span style={{
                              background: C.green + "15", color: C.green,
                              border: `1px solid ${C.green}40`,
                              borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                              display: "flex", alignItems: "center", gap: 5,
                            }}>
                              ✅ Aceptado por ti — en revisión del PH
                            </span>
                          )}
                          {badgeEstado(c.estado)}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                          <div>
                            <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Valor anual</p>
                            <p style={{ color: C.green, fontSize: 20, fontWeight: 700, margin: 0 }}>{usd(c.valor_anual)}</p>
                          </div>
                          <div>
                            <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Mensual</p>
                            <p style={{ color: C.green, fontSize: 20, fontWeight: 700, margin: 0 }}>{usd(c.monto_mensual)}/mes</p>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          {/* Botón revisar y aceptar */}
                          {c.estado_firma === "pendiente" && (
                            <button
                              onClick={() => setContratoAceptar(c)}
                              style={{
                                background: C.blue, border: "none", color: "#fff",
                                borderRadius: 8, padding: "10px 20px", cursor: "pointer",
                                fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
                              }}
                            >
                              Revisar y aceptar →
                            </button>
                          )}
                          {/* Botón reseñar */}
                          {(c.estado === "completado" || c.estado === "activo") && (
                            reviewsEnviadas.has(c.id) ? (
                              <span style={{ background: "#052E16", color: C.green, border: `1px solid ${C.green}40`, borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 600 }}>
                                ⭐ Reseña enviada
                              </span>
                            ) : (
                              <button
                                onClick={() => { setShowReview(c.id); setReviewPuntaje(5); setReviewComentario(""); }}
                                style={{ background: C.goldDim, border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
                              >
                                ⭐ Dejar reseña
                              </button>
                            )
                          )}
                          {/* Botón descargar Word */}
                          <a
                            href={`/api/contratos/${c.id}/word`}
                            download
                            style={{
                              background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub,
                              borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                              textDecoration: "none", display: "inline-block", whiteSpace: "nowrap",
                            }}
                            title="Descargar contrato en Word"
                          >
                            📄 Descargar contrato
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTOS */}
          {tab === "documentos" && (
            <div>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Documentos de empresa</h1>
                <p style={{ color: C.sub, fontSize: 14, margin: "0 0 16px" }}>
                  Sube tus documentos para postular a licitaciones. Solo se permiten PDF, JPG y PNG (máx. 10MB).
                </p>
                <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: C.sub, fontSize: 13 }}>Progreso de documentación</span>
                      <span style={{ color: docCompleto ? C.green : C.gold, fontSize: 13, fontWeight: 700 }}>
                        {docsRequeridosSubidos}/{docsRequeridos} obligatorios · {docsSubidos}/8 total
                      </span>
                    </div>
                    <div style={{ background: C.border, borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{
                        background: `linear-gradient(90deg, ${docCompleto ? C.green : C.gold}, ${docCompleto ? "#22C55E" : "#F59E0B"})`,
                        height: "100%", width: `${(docsRequeridosSubidos / docsRequeridos) * 100}%`,
                        transition: "width .4s ease",
                      }} />
                    </div>
                  </div>
                  {docCompleto && (
                    <span style={{ background: C.green + "20", color: C.green, border: `1px solid ${C.green}40`, borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                      ✓ Perfil completo
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {TIPOS_DOCUMENTO.map(td => {
                  const doc = documentos.find(d => d.tipo === td.id);
                  const isUploading = uploadingTipo === td.id;
                  const estadoDoc = (doc as any)?.estado || "pendiente";
                  const iconColor = !doc ? C.muted : estadoDoc === "aprobado" ? C.green : estadoDoc === "rechazado" ? C.red : C.gold;
                  const borderColor = !doc ? C.border : estadoDoc === "aprobado" ? C.green + "50" : estadoDoc === "rechazado" ? C.red + "50" : C.gold + "50";
                  return (
                    <div
                      key={td.id}
                      style={{
                        background: C.bgCard,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 12, padding: "18px 22px",
                        display: "flex", alignItems: "center", gap: 16,
                        transition: "border-color .2s",
                      }}
                    >
                      {/* Status icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: iconColor + "20",
                        border: `2px solid ${iconColor}`,
                      }}>
                        {!doc ? (
                          <span style={{ color: C.muted, fontSize: 18 }}>○</span>
                        ) : estadoDoc === "aprobado" ? (
                          <span style={{ color: C.green, fontSize: 20, fontWeight: 700 }}>✓</span>
                        ) : estadoDoc === "rechazado" ? (
                          <span style={{ color: C.red, fontSize: 20, fontWeight: 700 }}>✗</span>
                        ) : (
                          <span style={{ color: C.gold, fontSize: 16 }}>⏳</span>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                          <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{td.label}</p>
                          {td.requerido ? (
                            <span style={{ background: C.red + "20", color: C.red, border: `1px solid ${C.red}30`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>REQUERIDO</span>
                          ) : (
                            <span style={{ background: C.muted + "20", color: C.muted, border: `1px solid ${C.muted}30`, borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>OPCIONAL</span>
                          )}
                          {doc && (
                            <span style={{
                              background: estadoDoc === "aprobado" ? "#052E16" : estadoDoc === "rechazado" ? "#2D0A0A" : "#2D2310",
                              color: estadoDoc === "aprobado" ? C.green : estadoDoc === "rechazado" ? C.red : C.gold,
                              borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700,
                            }}>
                              {estadoDoc === "aprobado" ? "✓ Aprobado" : estadoDoc === "rechazado" ? "✗ Rechazado" : "⏳ En revisión"}
                            </span>
                          )}
                        </div>
                        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{td.desc}</p>
                        {doc && (
                          <p style={{ color: C.sub, fontSize: 12, margin: "4px 0 0" }}>
                            Subido el {new Date(doc.creado_en).toLocaleDateString("es-PA")}
                            {doc.url && (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, marginLeft: 10, textDecoration: "underline" }}>Ver archivo</a>
                            )}
                          </p>
                        )}
                        {estadoDoc === "rechazado" && (doc as any)?.motivo_rechazo && (
                          <p style={{ color: C.red, fontSize: 12, margin: "4px 0 0", fontStyle: "italic" }}>
                            Motivo: {(doc as any).motivo_rechazo}
                          </p>
                        )}
                      </div>

                      {/* Upload button */}
                      <div>
                        <input
                          ref={el => { fileInputRefs.current[td.id] = el; }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          style={{ display: "none" }}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (file) await handleUpload(td.id, file);
                            e.target.value = "";
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[td.id]?.click()}
                          disabled={isUploading}
                          style={{
                            background: doc ? C.bgPanel : C.blue,
                            border: `1px solid ${doc ? C.border : C.blue}`,
                            color: doc ? C.sub : "#fff",
                            borderRadius: 8, padding: "8px 16px",
                            cursor: isUploading ? "not-allowed" : "pointer",
                            fontSize: 13, fontWeight: 600,
                            opacity: isUploading ? 0.6 : 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isUploading ? "Subiendo..." : doc ? "Reemplazar" : "Subir archivo"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MODAL REVIEW ── */}
      {showReview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 460, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <p style={{ color: C.gold, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Reseña de contrato</p>
                <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>Califica la Propiedad Horizontal</h3>
              </div>
              <button onClick={() => setShowReview(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22 }}>×</button>
            </div>

            {/* Estrellas */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: C.sub, fontSize: 13, margin: "0 0 10px" }}>Puntaje general</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setReviewPuntaje(n)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 32, opacity: n <= reviewPuntaje ? 1 : 0.25, transition: "opacity .15s", padding: 0 }}
                  >
                    ⭐
                  </button>
                ))}
                <span style={{ color: C.text, fontSize: 14, fontWeight: 700, marginLeft: 4 }}>{reviewPuntaje}/5</span>
              </div>
            </div>

            {/* Comentario */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: C.sub, fontSize: 13, margin: "0 0 8px" }}>Comentario (opcional)</p>
              <textarea
                rows={4}
                value={reviewComentario}
                onChange={e => setReviewComentario(e.target.value)}
                placeholder="Describe la transparencia del proceso, comunicación, cumplimiento de pagos..."
                style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                disabled={enviandoReview}
                onClick={async () => {
                  setEnviandoReview(true);
                  try {
                    const r = await fetch("/api/reviews", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ contrato_id: showReview, puntaje: reviewPuntaje, comentario: reviewComentario }),
                    });
                    if (!r.ok) { const j = await r.json(); throw new Error(j.error); }
                    setReviewsEnviadas(prev => new Set(prev).add(showReview!));
                    toast("⭐ ¡Reseña enviada correctamente!", "ok");
                    setShowReview(null);
                  } catch (e: any) {
                    toast("Error: " + e.message, "err");
                  } finally {
                    setEnviandoReview(false);
                  }
                }}
                style={{ background: C.gold, border: "none", color: "#07090F", borderRadius: 8, padding: "10px 24px", cursor: enviandoReview ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, flex: 1, opacity: enviandoReview ? 0.7 : 1 }}
              >
                {enviandoReview ? "Enviando..." : "⭐ Enviar reseña"}
              </button>
              <button onClick={() => setShowReview(null)} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
