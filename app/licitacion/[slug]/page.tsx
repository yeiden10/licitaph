import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import type { RequisitoLicitacion } from "@/lib/supabase/types";
import QASection from "./QASection";
import VisitaTracker from "./VisitaTracker";

// ── Design tokens (server-safe, no useState) ──────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface LicitacionFull {
  id: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  presupuesto_minimo: number | null;
  presupuesto_maximo: number | null;
  fecha_cierre: string | null;
  fecha_publicacion: string | null;
  duracion_contrato_meses: number | null;
  estado: string;
  urgente: boolean;
  url_slug: string | null;
  precio_referencia: number | null;
  precio_referencia_visible: boolean | null;
  fotos: string[] | null;
  fechas_inspeccion: string[] | null;
  lugar_inspeccion: string | null;
  propiedades_horizontales: {
    nombre: string;
    ciudad: string | null;
  } | null;
  requisitos_licitacion: RequisitoLicitacion[];
}

// ── Utility ───────────────────────────────────────────────────────────────────
function usd(n: number | null) {
  if (!n) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
}

function formatFechaInspeccion(dateStr: string): string {
  // dateStr is YYYY-MM-DD — append noon to avoid timezone shifts
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " — 9:00 AM";
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC METADATA — per-licitacion SEO
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIAS_LABELS: Record<string, string> = {
  seguridad: "Seguridad y vigilancia", limpieza: "Limpieza y aseo",
  hvac: "HVAC / Climatización", jardineria: "Jardinería", ascensores: "Ascensores",
  electricidad: "Electricidad", pintura: "Pintura", plagas: "Control de plagas",
  piscinas: "Piscinas", impermeabilizacion: "Impermeabilización", cctv: "CCTV",
  generadores: "Generadores", fumigacion: "Fumigación", obras_civiles: "Obras civiles",
  tecnologia: "IT / Tecnología", administracion: "Administración", legal_contable: "Legal / Contable",
  portones: "Portones / Acceso", conserje: "Conserjería", valet: "Valet parking",
  mudanzas: "Mudanzas", energia_solar: "Energía solar", gestion_residuos: "Residuos",
  otros: "Otros servicios",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: lic } = await supabase
    .from("licitaciones")
    .select("titulo, descripcion, categoria, estado, url_slug, propiedades_horizontales(nombre, ciudad)")
    .eq("url_slug", slug)
    .single();

  if (!lic) {
    return {
      title: "Licitación no encontrada | LicitaPH",
      robots: { index: false, follow: false },
    };
  }

  const ph = (lic as any).propiedades_horizontales;
  const categoria = CATEGORIAS_LABELS[lic.categoria] ?? lic.categoria;
  const ciudad = ph?.ciudad ?? "Panamá";
  const phNombre = ph?.nombre ? ` — ${ph.nombre}` : "";

  const title = `${lic.titulo}${phNombre} | LicitaPH`;
  const description = lic.descripcion
    ? lic.descripcion.slice(0, 155)
    : `Licitación de ${categoria} en ${ciudad}. Postula tu empresa en LicitaPH — la plataforma de contrataciones para Propiedades Horizontales en Panamá.`;

  const isIndexable = ["activa", "en_evaluacion"].includes(lic.estado);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://licitaph.vercel.app/licitacion/${lic.url_slug}`,
      siteName: "LicitaPH",
      locale: "es_PA",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: {
      index: isIndexable,
      follow: true,
    },
    alternates: {
      canonical: `https://licitaph.vercel.app/licitacion/${lic.url_slug}`,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER COMPONENT — page.tsx
// ─────────────────────────────────────────────────────────────────────────────
export default async function LicitacionPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: licitacion, error } = await supabase
    .from("licitaciones")
    .select(`
      id, titulo, descripcion, categoria,
      presupuesto_minimo, presupuesto_maximo,
      fecha_cierre, fecha_publicacion,
      duracion_contrato_meses, estado, urgente, url_slug,
      precio_referencia, precio_referencia_visible,
      fotos, fechas_inspeccion, lugar_inspeccion,
      propiedades_horizontales (nombre, ciudad),
      requisitos_licitacion (*)
    `)
    .eq("url_slug", slug)
    .single();

  if (error || !licitacion) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`* { box-sizing: border-box; } body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }`}</style>
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ fontSize: 64, margin: "0 0 16px" }}>404</p>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>Licitación no encontrada</h1>
          <p style={{ color: C.sub, fontSize: 15, margin: "0 0 24px" }}>El enlace puede ser incorrecto o la licitación fue eliminada.</p>
          <a href="/" style={{ color: C.blue, fontSize: 14, textDecoration: "underline" }}>Volver al inicio</a>
        </div>
      </div>
    );
  }

  const lic = licitacion as unknown as LicitacionFull;
  const ph = lic.propiedades_horizontales;
  const requisitos: RequisitoLicitacion[] = Array.isArray(lic.requisitos_licitacion) ? lic.requisitos_licitacion : [];
  const obligatorios = requisitos.filter(r => r.obligatorio);
  const opcionales   = requisitos.filter(r => !r.obligatorio);
  const estaActiva   = lic.estado === "activa";

  const fotos: string[] = Array.isArray(lic.fotos) ? lic.fotos.filter(Boolean) : [];
  const fechasInspeccion: string[] = Array.isArray(lic.fechas_inspeccion) ? lic.fechas_inspeccion.filter(Boolean) : [];
  const hayFotos = fotos.length > 0;
  const hayFechas = fechasInspeccion.length > 0;

  return (
    <>
      {/* Tracking silencioso de visitas */}
      <VisitaTracker licitacion_id={lic.id} />
      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inicio", item: "https://licitaph.vercel.app" },
              { "@type": "ListItem", position: 2, name: "Licitaciones", item: "https://licitaph.vercel.app" },
              { "@type": "ListItem", position: 3, name: lic.titulo, item: `https://licitaph.vercel.app/licitacion/${lic.url_slug}` },
            ],
          }),
        }}
      />
      {/* JSON-LD: JobPosting (licitaciones = "job" para buscadores de contratos B2B) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: lic.titulo,
            description: lic.descripcion ?? `Licitación de servicios para Propiedad Horizontal en Panamá.`,
            organizer: { "@type": "Organization", name: ph?.nombre ?? "LicitaPH" },
            location: {
              "@type": "Place",
              name: ph?.ciudad ?? "Panamá",
              address: { "@type": "PostalAddress", addressCountry: "PA", addressLocality: ph?.ciudad ?? "Ciudad de Panamá" },
            },
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
            startDate: lic.fecha_publicacion ?? new Date().toISOString(),
            endDate: lic.fecha_cierre ? (lic.fecha_cierre.includes("T") ? lic.fecha_cierre : `${lic.fecha_cierre}T23:59:59-05:00`) : undefined,
            url: `https://licitaph.vercel.app/licitacion/${lic.url_slug}`,
          }),
        }}
      />
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: ${C.text}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }

        .portal-grid { display: grid; grid-template-columns: 1fr 300px; gap: 28px; align-items: start; }
        .portal-header { padding: 16px 32px; }
        .portal-main { padding: 48px 24px 80px; }

        @media (max-width: 768px) {
          .portal-grid { grid-template-columns: 1fr; }
          .portal-header { padding: 12px 18px; }
          .portal-main { padding: 28px 16px 60px; }
          .portal-h1 { font-size: 22px !important; }
          .portal-stats { grid-template-columns: 1fr 1fr !important; }
          .portal-sidebar { order: -1; }
          .modal-precio-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .portal-stats { grid-template-columns: 1fr !important; }
          .portal-h1 { font-size: 18px !important; }
          .portal-main { padding: 20px 12px 60px; }
          .modal-precio-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="portal-header" style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${C.gold}, #8B6914)`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#000", fontSize: 16, fontWeight: 900 }}>L</span>
          </div>
          <span style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>LicitaPH</span>
        </a>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: C.muted, fontSize: 13 }}>Portal público de licitación</span>
        </div>
      </header>

      {/* ── Inactive banner ── */}
      {!estaActiva && (
        <div style={{ background: C.red + "15", borderBottom: `1px solid ${C.red}30`, padding: "12px 32px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: C.red, fontSize: 16 }}>⚠</span>
          <p style={{ color: C.red, fontSize: 14, fontWeight: 600, margin: 0 }}>
            Esta licitación ya no está abierta — Estado: <strong>{lic.estado}</strong>
          </p>
        </div>
      )}

      <main className="portal-main" style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* ── Hero section ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            {lic.urgente && (
              <span style={{ background: C.red + "20", color: C.red, border: `1px solid ${C.red}40`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                URGENTE
              </span>
            )}
            <span style={{ background: C.gold + "20", color: C.gold, border: `1px solid ${C.gold}30`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
              {lic.categoria}
            </span>
            {ph && (
              <span style={{ color: C.muted, fontSize: 13 }}>📍 {ph.nombre}{ph.ciudad ? ` · ${ph.ciudad}` : ""}</span>
            )}
          </div>

          <h1 className="portal-h1" style={{ color: C.text, fontSize: 32, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.25 }}>
            {lic.titulo}
          </h1>

          {lic.descripcion && (
            <p style={{ color: C.sub, fontSize: 16, lineHeight: 1.75, margin: "0 0 28px", maxWidth: 700 }}>
              {lic.descripcion}
            </p>
          )}

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {(lic.presupuesto_minimo || lic.presupuesto_maximo) && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Presupuesto referencial</p>
                <p style={{ color: C.green, fontSize: 18, fontWeight: 700, margin: 0 }}>
                  {usd(lic.presupuesto_minimo)} – {usd(lic.presupuesto_maximo)}
                </p>
                <p style={{ color: C.muted, fontSize: 11, margin: "2px 0 0" }}>por año</p>
              </div>
            )}
            {lic.fecha_cierre && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Cierre de recepción</p>
                <CountdownIsland fechaCierre={lic.fecha_cierre} />
              </div>
            )}
            {lic.duracion_contrato_meses && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Duración del contrato</p>
                <p style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{lic.duracion_contrato_meses} meses</p>
              </div>
            )}
            {lic.precio_referencia_visible && lic.precio_referencia && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Precio de referencia</p>
                <p style={{ color: C.gold, fontSize: 18, fontWeight: 700, margin: 0 }}>{usd(lic.precio_referencia)}</p>
                <p style={{ color: C.muted, fontSize: 11, margin: "2px 0 0" }}>USD</p>
              </div>
            )}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
              <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Requisitos del pliego</p>
              <p style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{requisitos.length}</p>
              <p style={{ color: C.muted, fontSize: 11, margin: "2px 0 0" }}>{obligatorios.length} obligatorios</p>
            </div>
          </div>
        </div>

        {/* ── Galería de fotos (si hay) ── */}
        {hayFotos && (
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 28 }}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span>🖼</span> Fotos del lugar
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: fotos.length === 1 ? "1fr" : fotos.length === 2 ? "1fr 1fr" : "repeat(auto-fill,minmax(160px,1fr))",
              gap: 10,
              overflowX: "auto",
            }}>
              {fotos.slice(0, 5).map((src, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 8,
                    overflow: "hidden",
                    border: `1px solid ${C.border}`,
                    height: 200,
                    flexShrink: 0,
                    minWidth: fotos.length > 3 ? 220 : "auto",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Foto ${i + 1} del lugar`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
              ))}
            </div>
            {fotos.length > 5 && (
              <p style={{ color: C.muted, fontSize: 12, marginTop: 10, textAlign: "right" }}>
                +{fotos.length - 5} fotos adicionales disponibles
              </p>
            )}
          </div>
        )}

        {/* ── Fechas de inspección (si hay) ── */}
        {hayFechas && (
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 28 }}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
              <span>📅</span> Días de inspección
            </h2>
            <p style={{ color: C.sub, fontSize: 13, margin: "0 0 16px" }}>Días de inspección del lugar</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: lic.lugar_inspeccion ? 14 : 16 }}>
              {fechasInspeccion.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <span style={{ color: C.blue, fontSize: 16 }}>📆</span>
                  <span style={{ color: C.text, fontSize: 14, fontWeight: 500, textTransform: "capitalize" }}>
                    {formatFechaInspeccion(f)}
                  </span>
                </div>
              ))}
            </div>

            {lic.lugar_inspeccion && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: C.sub, fontSize: 14 }}>
                <span>📍</span>
                <span>{lic.lugar_inspeccion}</span>
              </div>
            )}

            <div style={{ background: C.blue + "12", border: `1px solid ${C.blue}30`, borderRadius: 8, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: C.blue, fontSize: 16, flexShrink: 0, marginTop: 1 }}>ℹ</span>
              <p style={{ color: C.sub, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Según el pliego, las empresas están obligadas a realizar una inspección física del lugar antes de enviar su propuesta.
              </p>
            </div>
          </div>
        )}

        <div className="portal-grid">
          {/* ── Left: Pliego de condiciones ── */}
          <div>
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
              <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: "0 0 22px" }}>
                Pliego de condiciones
              </h2>

              {requisitos.length === 0 ? (
                <p style={{ color: C.muted, fontSize: 14 }}>Esta licitación no tiene requisitos publicados.</p>
              ) : (
                <>
                  {obligatorios.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                      <p style={{ color: C.red, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.red, display: "inline-block" }} />
                        Requisitos obligatorios ({obligatorios.length})
                      </p>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {obligatorios.map((r, i) => (
                          <RequisitoRow key={r.id} r={r} numero={i + 1} />
                        ))}
                      </div>
                    </div>
                  )}

                  {opcionales.length > 0 && (
                    <div>
                      <p style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, display: "inline-block" }} />
                        Requisitos opcionales ({opcionales.length})
                      </p>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {opcionales.map((r, i) => (
                          <RequisitoRow key={r.id} r={r} numero={obligatorios.length + i + 1} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Publicado info */}
            {lic.fecha_publicacion && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ color: C.muted, fontSize: 13 }}>📅</span>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                  Publicado el {new Date(lic.fecha_publicacion).toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })}
                  {ph && <> por <strong style={{ color: C.sub }}>{ph.nombre}</strong></>}
                </p>
              </div>
            )}
          </div>

          {/* ── Right: CTA sticky sidebar ── */}
          <div style={{ position: "sticky", top: 24 }}>
            <CTAIsland licitacionId={lic.id} estaActiva={estaActiva} />

            {/* Trust block */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginTop: 16 }}>
              <p style={{ color: C.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 14px" }}>¿Por qué LicitaPH?</p>
              {[
                { icon: "🛡", text: "Proceso transparente y documentado" },
                { icon: "⚡", text: "Respuesta en menos de 48 horas" },
                { icon: "🤝", text: "Contrato formal con respaldo legal" },
              ].map(item => (
                <div key={item.text} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <p style={{ color: C.sub, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <QASection licitacionId={lic.id} />
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px 32px", textAlign: "center" }}>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
          LicitaPH · Plataforma de licitaciones para propiedades horizontales de Panamá
        </p>
      </footer>
    </>
  );
}

// ── Requisito row (server component) ─────────────────────────────────────────
function RequisitoRow({ r, numero }: { r: RequisitoLicitacion; numero: number }) {
  const tipoRespuesta = (r as any).tipo_respuesta as string | undefined;

  return (
    <div style={{
      padding: "16px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ color: C.gold, fontWeight: 700, fontSize: 13, minWidth: 24, paddingTop: 2 }}>{numero}.</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>{r.titulo}</span>
            {/* Tipo respuesta badge */}
            {tipoRespuesta === "documento" && (
              <span style={{
                background: C.blue + "20", color: C.blue, border: `1px solid ${C.blue}30`,
                borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700, letterSpacing: .5
              }}>📎 Documento</span>
            )}
            {tipoRespuesta === "texto" && (
              <span style={{
                background: "rgba(255,255,255,0.06)", color: C.sub, border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700, letterSpacing: .5
              }}>✏️ Texto</span>
            )}
            {/* Subsanable badge */}
            {r.subsanable ? (
              <span style={{
                background: C.gold + "20", color: C.gold, border: `1px solid ${C.gold}30`,
                borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700, letterSpacing: .5
              }}>SUBSANABLE</span>
            ) : (
              <span style={{
                background: C.red + "15", color: C.red, border: `1px solid ${C.red}30`,
                borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700, letterSpacing: .5
              }}>NO SUBSANABLE</span>
            )}
            {/* Obligatorio badge */}
            {r.obligatorio ? (
              <span style={{
                background: C.red + "15", color: C.red, border: `1px solid ${C.red}30`,
                borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700, letterSpacing: .5
              }}>OBLIGATORIO</span>
            ) : (
              <span style={{
                background: C.muted + "15", color: C.muted, border: `1px solid ${C.muted}30`,
                borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 600, letterSpacing: .5
              }}>OPCIONAL</span>
            )}
          </div>
          {r.descripcion && (
            <p style={{ color: C.sub, fontSize: 13, margin: 0, lineHeight: 1.6 }}>{r.descripcion}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT ISLANDS — inline script approach (no separate 'use client' files needed)
// ─────────────────────────────────────────────────────────────────────────────

function CountdownIsland({ fechaCierre }: { fechaCierre: string }) {
  const iso = fechaCierre;
  const id = "countdown-" + iso.replace(/\D/g, "").slice(0, 10);

  return (
    <>
      <div
        id={id}
        style={{ color: C.gold, fontSize: 18, fontWeight: 700, margin: 0, minHeight: 28 }}
        suppressHydrationWarning
      >
        {new Date(fechaCierre).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" })}
      </div>
      <p id={`${id}-sub`} style={{ color: C.muted, fontSize: 11, margin: "2px 0 0" }}>fecha de cierre</p>
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var target = new Date("${iso}");
          function update() {
            var now = new Date();
            var diff = target - now;
            var el = document.getElementById("${id}");
            var sub = document.getElementById("${id}-sub");
            if (!el) return;
            if (diff <= 0) {
              el.textContent = "Cerrada";
              el.style.color = "${C.red}";
              if (sub) sub.textContent = "plazo vencido";
              return;
            }
            var days  = Math.floor(diff / 86400000);
            var hours = Math.floor((diff % 86400000) / 3600000);
            var mins  = Math.floor((diff % 3600000) / 60000);
            if (days > 30) {
              el.textContent = new Date("${iso}").toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });
              if (sub) sub.textContent = days + " días restantes";
            } else if (days > 0) {
              el.textContent = days + "d " + hours + "h " + mins + "m";
              el.style.color = days < 3 ? "${C.red}" : "${C.gold}";
              if (sub) sub.textContent = "tiempo restante";
            } else {
              el.textContent = hours + "h " + mins + "m";
              el.style.color = "${C.red}";
              if (sub) sub.textContent = "¡Cierra hoy!";
            }
          }
          update();
          setInterval(update, 30000);
        })();
      `}} />
    </>
  );
}

function CTAIsland({ licitacionId, estaActiva }: { licitacionId: string; estaActiva: boolean }) {
  const ctaId = `cta-${licitacionId.slice(-8)}`;

  return (
    <>
      <div
        id={ctaId}
        style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}
      >
        {!estaActiva ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p style={{ color: C.red, fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Licitación cerrada</p>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Esta licitación ya no acepta propuestas.</p>
          </div>
        ) : (
          <>
            <p style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>¿Tu empresa puede cubrir este servicio?</p>
            <p style={{ color: C.sub, fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>Postula ahora y recibe la respuesta directamente del administrador.</p>
            <div id={`${ctaId}-actions`}>
              <a
                href={`/?registro=empresa`}
                style={{ display: "block", background: C.gold, border: "none", color: "#000", borderRadius: 9, padding: "13px 0", fontSize: 15, fontWeight: 700, textDecoration: "none", textAlign: "center", width: "100%" }}
              >
                Participar como empresa →
              </a>
              <p style={{ color: C.muted, fontSize: 12, textAlign: "center", margin: "12px 0 0" }}>
                ¿Ya tienes cuenta?{" "}
                <a href="/" style={{ color: C.blue, textDecoration: "underline" }}>Inicia sesión</a>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Client script: check auth and show modal if logged in as empresa */}
      <script dangerouslySetInnerHTML={{ __html: `
        (async function() {
          var SUPABASE_URL  = "${process.env.NEXT_PUBLIC_SUPABASE_URL}";
          var SUPABASE_ANON = "${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}";
          var ctaId = "${ctaId}";
          var licId = "${licitacionId}";

          // Try to get session from localStorage (Supabase SSR stores it there)
          var sessionKey = null;
          for (var k in localStorage) {
            if (k.includes("auth-token") || k.includes("supabase")) {
              sessionKey = k;
              break;
            }
          }

          // Call Supabase REST to get current user
          try {
            var resp = await fetch(SUPABASE_URL + "/auth/v1/user", {
              headers: {
                "apikey": SUPABASE_ANON,
                "Authorization": "Bearer " + (
                  JSON.parse(localStorage.getItem(
                    Object.keys(localStorage).find(k => k.startsWith("sb-")) || ""
                  ) || '{}')?.access_token || ""
                )
              }
            });

            if (!resp.ok) return; // Not logged in — keep default CTA
            var user = await resp.json();
            if (!user || !user.id) return;
            if (user.user_metadata?.tipo_usuario !== "empresa") return;

            // User is logged in as empresa — replace CTA with modal trigger
            var actionsEl = document.getElementById(ctaId + "-actions");
            if (!actionsEl) return;

            actionsEl.innerHTML = '';
            var btn = document.createElement("button");
            btn.textContent = "Enviar mi propuesta →";
            btn.style.cssText = "display:block;width:100%;background:${C.gold};border:none;color:#000;border-radius:9px;padding:13px 0;font-size:15px;font-weight:700;cursor:pointer;";
            btn.onclick = function() { showModal(user); };
            actionsEl.appendChild(btn);

            var note = document.createElement("p");
            note.textContent = "Sesión activa como empresa";
            note.style.cssText = "color:${C.green};font-size:12px;text-align:center;margin:10px 0 0;";
            actionsEl.appendChild(note);
          } catch(e) {
            // Silently fail — default CTA stays
          }

          function showModal(user) {
            var overlay = document.createElement("div");
            overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;";
            overlay.innerHTML = \`
              <div style="background:${C.bgCard};border:1px solid ${C.border};border-radius:16px;padding:32px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                  <h2 style="color:${C.text};font-size:20px;font-weight:700;margin:0;">Enviar propuesta</h2>
                  <button id="closeModalBtn" style="background:none;border:none;color:${C.muted};cursor:pointer;font-size:24px;line-height:1;">×</button>
                </div>
                <div style="display:flex;flex-direction:column;gap:16px;">
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="modal-precio-grid">
                    <label style="display:flex;flex-direction:column;gap:6px;">
                      <span style="color:${C.sub};font-size:13px;font-weight:500;">Precio anual ofertado (USD) *</span>
                      <input id="modalPrecio" type="number" min="0" step="100" placeholder="Ej: 36000"
                        style="background:${C.bgPanel};border:1px solid ${C.border};border-radius:8px;padding:10px 14px;color:${C.text};font-size:15px;outline:none;width:100%;" />
                    </label>
                    <label style="display:flex;flex-direction:column;gap:6px;">
                      <span style="color:${C.sub};font-size:13px;font-weight:500;">Modalidad de pago</span>
                      <select id="modalPago" style="background:${C.bgPanel};border:1px solid ${C.border};border-radius:8px;padding:10px 14px;color:${C.text};font-size:14px;outline:none;width:100%;cursor:pointer;">
                        <option value="mensual">Mensual</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                        <option value="personalizado">Personalizado</option>
                      </select>
                    </label>
                  </div>
                  <label style="display:flex;flex-direction:column;gap:6px;">
                    <span style="color:${C.sub};font-size:13px;font-weight:500;">Descripción de la propuesta</span>
                    <textarea id="modalDesc" rows="3" placeholder="Describe tu oferta de valor..."
                      style="background:${C.bgPanel};border:1px solid ${C.border};border-radius:8px;padding:10px 14px;color:${C.text};font-size:14px;outline:none;resize:vertical;width:100%;"></textarea>
                  </label>
                  <label style="display:flex;flex-direction:column;gap:6px;">
                    <span style="color:${C.sub};font-size:13px;font-weight:500;">Propuesta técnica</span>
                    <textarea id="modalTecnica" rows="4" placeholder="Detalla tu metodología, equipo, experiencia..."
                      style="background:${C.bgPanel};border:1px solid ${C.border};border-radius:8px;padding:10px 14px;color:${C.text};font-size:14px;outline:none;resize:vertical;width:100%;"></textarea>
                  </label>
                  <div style="background:${C.bgPanel};border:1px solid ${C.border};border-radius:10px;padding:14px;">
                    <p style="color:${C.gold};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">Compromisos requeridos</p>
                    <label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;cursor:pointer;">
                      <input type="checkbox" id="chkInspeccion" style="margin-top:2px;accent-color:${C.gold};" />
                      <span style="color:${C.sub};font-size:12px;line-height:1.5;">Me comprometo a inspeccionar físicamente el lugar antes de iniciar el servicio</span>
                    </label>
                    <label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;cursor:pointer;">
                      <input type="checkbox" id="chkCondiciones" style="margin-top:2px;accent-color:${C.gold};" />
                      <span style="color:${C.sub};font-size:12px;line-height:1.5;">Acepto íntegramente las condiciones y especificaciones del pliego</span>
                    </label>
                    <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
                      <input type="checkbox" id="chkPenalidades" style="margin-top:2px;accent-color:${C.gold};" />
                      <span style="color:${C.sub};font-size:12px;line-height:1.5;">Acepto penalidades por incumplimiento (mínimo 10% del valor anual)</span>
                    </label>
                  </div>
                  <p id="modalErr" style="color:${C.red};font-size:13px;margin:0;display:none;"></p>
                  <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="modalCancelBtn" style="background:${C.bgPanel};border:1px solid ${C.border};color:${C.sub};border-radius:8px;padding:10px 20px;cursor:pointer;font-size:14px;">Cancelar</button>
                    <button id="modalSubmitBtn" style="background:${C.gold};border:none;color:#000;border-radius:8px;padding:10px 24px;cursor:pointer;font-size:14px;font-weight:700;">Enviar propuesta →</button>
                  </div>
                </div>
              </div>
            \`;

            document.body.appendChild(overlay);

            document.getElementById("closeModalBtn").onclick   = function() { overlay.remove(); };
            document.getElementById("modalCancelBtn").onclick  = function() { overlay.remove(); };
            overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

            document.getElementById("modalSubmitBtn").onclick = async function() {
              var btn2 = document.getElementById("modalSubmitBtn");
              var err  = document.getElementById("modalErr");
              var precio = document.getElementById("modalPrecio").value;
              var chkInsp = document.getElementById("chkInspeccion").checked;
              var chkCond = document.getElementById("chkCondiciones").checked;
              var chkPen  = document.getElementById("chkPenalidades").checked;
              if (!precio) { err.textContent = "El precio anual es requerido."; err.style.display="block"; return; }
              if (!chkInsp || !chkCond || !chkPen) { err.textContent = "Debes aceptar todos los compromisos para enviar la propuesta."; err.style.display="block"; return; }
              btn2.textContent = "Enviando..."; btn2.disabled = true;
              err.style.display = "none";
              try {
                var r = await fetch("/api/propuestas", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    licitacion_id: licId,
                    precio_anual: Number(precio),
                    descripcion: document.getElementById("modalDesc").value,
                    propuesta_tecnica: document.getElementById("modalTecnica").value,
                    modalidad_pago: document.getElementById("modalPago").value,
                    acepta_condiciones: true,
                    acepta_inspeccion: true,
                    acepta_penalidades: true,
                  })
                });
                var data = await r.json();
                if (!r.ok) { err.textContent = data.error || "Error al enviar"; err.style.display="block"; btn2.textContent = "Enviar propuesta →"; btn2.disabled = false; return; }
                overlay.remove();
                var successDiv = document.createElement("div");
                successDiv.style.cssText = "position:fixed;top:24px;right:24px;z-index:9999;background:${C.bgCard};border:1px solid ${C.green};border-left:4px solid ${C.green};border-radius:10px;padding:14px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.6);";
                successDiv.innerHTML = '<span style="color:${C.green};font-size:18px;">✓</span><p style="color:${C.text};font-size:14px;margin:0;">¡Propuesta enviada! El administrador te contactará pronto.</p>';
                document.body.appendChild(successDiv);
                setTimeout(function() { successDiv.remove(); }, 5000);
              } catch(ex) {
                err.textContent = "Error inesperado. Intenta de nuevo.";
                err.style.display = "block";
                btn2.textContent = "Enviar propuesta →";
                btn2.disabled = false;
              }
            };
          }
        })();
      `}} />
    </>
  );
}
