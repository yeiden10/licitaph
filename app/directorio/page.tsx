import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Directorio de Empresas Verificadas en Panamá | LicitaPH",
  description: "Encuentra empresas verificadas de seguridad, limpieza, HVAC, ascensores, piscinas y más para tu Propiedad Horizontal en Panamá. Todas con documentos validados por LicitaPH.",
  openGraph: {
    title: "Directorio de Empresas Verificadas | LicitaPH",
    description: "Empresas verificadas para Propiedades Horizontales en Panamá. Seguridad, limpieza, mantenimiento, HVAC y más.",
    url: "https://licitaph.vercel.app/directorio",
    siteName: "LicitaPH",
    locale: "es_PA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Directorio de Empresas Verificadas | LicitaPH",
    description: "Empresas verificadas para PHs en Panamá. Seguridad, limpieza, mantenimiento y más.",
  },
  alternates: {
    canonical: "https://licitaph.vercel.app/directorio",
  },
};

const C = {
  bg: "#FFFFFF", bgCard: "#FFFFFF", bgPanel: "#F8FAFC", border: "#E2E8F0",
  accent: "#1E3A8A", accentSoft: "#EFF6FF",
  gold: "#1E3A8A", goldDim: "#EFF6FF",   // compat aliases
  blue: "#3B82F6", green: "#10B981",
  red: "#EF4444", text: "#0F172A", muted: "#94A3B8", sub: "#64748B",
};

const CATEGORIAS_LABELS: Record<string, string> = {
  seguridad: "Seguridad 24/7", limpieza: "Limpieza", hvac: "HVAC / Aire acondicionado",
  jardineria: "Jardinería", ascensores: "Ascensores", electricidad: "Electricidad",
  pintura: "Pintura", plagas: "Control de plagas", piscinas: "Piscinas",
  impermeabilizacion: "Impermeabilización", cctv: "CCTV", generadores: "Generadores",
  fumigacion: "Fumigación", obras_civiles: "Obras civiles", tecnologia: "IT / Tecnología",
  administracion: "Administración", legal_contable: "Legal / Contable",
  portones: "Portones / Acceso", conserje: "Conserjería", valet: "Valet parking",
  mudanzas: "Mudanzas", energia_solar: "Energía solar", gestion_residuos: "Residuos",
};

interface Empresa {
  id: string;
  nombre: string;
  descripcion: string | null;
  categorias: string[] | null;
  anios_experiencia: number | null;
  calificacion_promedio: number | null;
  total_contratos_ganados: number | null;
  estado_verificacion: string;
  sitio_web: string | null;
  direccion: string | null;
}

function stars(rating: number | null) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
}

export default async function DirectorioPage() {
  const supabase = await createClient();

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nombre, descripcion, categorias, anios_experiencia, calificacion_promedio, total_contratos_ganados, estado_verificacion, sitio_web, direccion")
    .eq("estado_verificacion", "verificada")
    .eq("activo", true)
    .order("calificacion_promedio", { ascending: false, nullsFirst: false })
    .limit(100);

  const lista = (empresas || []) as Empresa[];
  const allCats = Array.from(new Set(lista.flatMap(e => e.categorias || [])));
  const totalContratos = lista.reduce((s, e) => s + (e.total_contratos_ganados || 0), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { background:#FFFFFF; color:#0F172A; font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .dir-card { background:#FFFFFF; border:1px solid #E2E8F0; border-radius:14px; padding:22px; transition:border-color 0.2s; box-shadow:0 1px 3px rgba(0,0,0,.06); }
        .dir-card:hover { border-color:rgba(30,58,138,0.3); }

        /* ── RESPONSIVE ── */
        .dir-nav-links { display:flex; gap:20px; align-items:center; }
        .dir-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:44px; }
        .dir-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
        .dir-hero-h1 { font-family:'Plus Jakarta Sans',sans-serif; font-size:40px; font-weight:800; color:#0F172A; letter-spacing:-0.6px; margin-bottom:14px; line-height:1.15; }
        .dir-main { max-width:1100px; margin:0 auto; padding:48px 24px; }

        @media(max-width:768px){
          .dir-nav-links { gap:14px; }
          .dir-nav-links a:first-child { display:none; }
          .dir-stats { grid-template-columns:1fr 1fr; gap:10px; margin-bottom:28px; }
          .dir-grid { grid-template-columns:1fr; }
          .dir-hero-h1 { font-size:28px; letter-spacing:-0.3px; }
          .dir-main { padding:32px 16px; }
        }
        @media(max-width:480px){
          .dir-stats { grid-template-columns:1fr; }
          .dir-hero-h1 { font-size:24px; }
          .dir-main { padding:24px 14px; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, padding: "0 16px 0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 800 }}>
          <span style={{ color: C.gold }}>Licita</span><span style={{ color: C.text }}>PH</span>
        </a>
        <div className="dir-nav-links">
          <a href="/" style={{ color: C.muted, textDecoration: "none", fontSize: 13, fontWeight: 500 }}>Inicio</a>
          <a href="/directorio" style={{ color: C.gold, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Directorio</a>
          <a href="/" style={{ background: C.gold, color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 7 }}>Ingresar</a>
        </div>
      </nav>

      <main className="dir-main">

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 52, animation: "fadeUp 0.5s ease" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.green, fontWeight: 600, marginBottom: 20 }}>
            ✓ {lista.length} empresa{lista.length !== 1 ? "s" : ""} con verificación completa
          </div>
          <h1 className="dir-hero-h1">
            Directorio de proveedores<br /><span style={{ color: C.gold }}>verificados</span> para PHs
          </h1>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 580, margin: "0 auto", lineHeight: 1.75 }}>
            Empresas con documentación, idoneidades y trayectoria verificada por LicitaPH para servicios de Propiedades Horizontales en Panamá.
          </p>
        </div>

        {/* Stats */}
        <div className="dir-stats">
          {[
            { icon: "🏢", val: lista.length, label: "Empresas verificadas", color: C.green },
            { icon: "🔧", val: allCats.length, label: "Categorías de servicio", color: C.blue },
            { icon: "📄", val: totalContratos, label: "Contratos adjudicados", color: C.gold },
          ].map(s => (
            <div key={s.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 30 }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Grid */}
        {lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0 80px" }}>
            {/* Placeholder cards ilustrativas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 700, margin: "0 auto 44px", opacity: 0.35, pointerEvents: "none" }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 18px", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E2E8F0" }} />
                    <div>
                      <div style={{ width: 70 + (i % 3) * 22, height: 9, background: "#E2E8F0", borderRadius: 4, marginBottom: 5 }} />
                      <div style={{ width: 48, height: 7, background: "#E2E8F0", borderRadius: 4 }} />
                    </div>
                  </div>
                  <div style={{ width: "100%", height: 7, background: "#E2E8F0", borderRadius: 4, marginBottom: 6 }} />
                  <div style={{ width: "75%", height: 7, background: "#E2E8F0", borderRadius: 4 }} />
                </div>
              ))}
            </div>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#EFF6FF", border: "2px solid rgba(30,58,138,.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 26 }}>🏢</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>Sé el primero en aparecer aquí</div>
            <div style={{ fontSize: 14, color: C.muted, maxWidth: 400, margin: "0 auto 28px", lineHeight: 1.75 }}>
              Las empresas verificadas aparecen en este directorio y reciben alertas de licitaciones activas en su categoría.
            </div>
            <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.accent, color: "#fff", borderRadius: 9, padding: "12px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Registrar mi empresa →
            </a>
          </div>
        ) : (
          <div className="dir-grid">
            {lista.map((e) => {
              const rating = e.calificacion_promedio && e.calificacion_promedio > 0 ? e.calificacion_promedio : null;
              return (
                <div key={e.id} className="dir-card">
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.nombre}
                      </h2>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>✓ Verificada</span>
                        {e.anios_experiencia && (
                          <span style={{ fontSize: 11, color: C.muted }}>· {e.anios_experiencia} años</span>
                        )}
                      </div>
                    </div>
                    {rating && (
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                        <div style={{ fontSize: 12, color: C.gold }}>{stars(rating)}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{Number(rating).toFixed(1)}/5</div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {e.descripcion && (
                    <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.65, marginBottom: 12 }}>
                      {e.descripcion.length > 110 ? e.descripcion.slice(0, 110) + "…" : e.descripcion}
                    </p>
                  )}

                  {/* Category pills */}
                  {e.categorias && e.categorias.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                      {e.categorias.slice(0, 4).map((cat: string) => (
                        <span key={cat} style={{ background: "rgba(74,158,255,0.08)", border: "1px solid rgba(74,158,255,0.2)", borderRadius: 4, padding: "2px 9px", fontSize: 10, color: C.blue, fontWeight: 500 }}>
                          {CATEGORIAS_LABELS[cat] || cat}
                        </span>
                      ))}
                      {e.categorias.length > 4 && (
                        <span style={{ fontSize: 10, color: C.muted, padding: "2px 6px" }}>+{e.categorias.length - 4} más</span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {e.total_contratos_ganados
                        ? `${e.total_contratos_ganados} contrato${e.total_contratos_ganados > 1 ? "s" : ""} adjudicado${e.total_contratos_ganados > 1 ? "s" : ""}`
                        : "Nueva en la plataforma"}
                    </div>
                    {e.sitio_web && (
                      <a
                        href={e.sitio_web.startsWith("http") ? e.sitio_web : `https://${e.sitio_web}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: C.blue, textDecoration: "none", fontWeight: 500 }}
                      >
                        🌐 Web →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA para empresas */}
        <div style={{ marginTop: 72, textAlign: "center", background: "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)", border: "1px solid rgba(30,58,138,.12)", borderRadius: 20, padding: "52px 40px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(30,58,138,.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(59,130,246,.04)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>🏢</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 10, letterSpacing: -0.4 }}>
              ¿Tu empresa ofrece servicios para PHs?
            </h2>
            <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.75, maxWidth: 480, margin: "0 auto 32px" }}>
              Únete al directorio verificado y accede a licitaciones activas de edificios en toda Panamá. El proceso de verificación es <strong style={{ color: C.text }}>completamente gratuito</strong>.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.accent, color: "#fff", borderRadius: 9, padding: "13px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                Registrar mi empresa →
              </a>
              <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: C.accent, border: `1.5px solid rgba(30,58,138,.25)`, borderRadius: 9, padding: "13px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                Conocer más
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 56, fontSize: 12, color: C.muted }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700 }}>
          <span style={{ color: C.gold }}>Licita</span><span style={{ color: C.text }}>PH</span>
        </span>
        <span>Directorio de proveedores verificados · Panamá</span>
        <a href="/" style={{ color: C.muted, textDecoration: "none" }}>Inicio</a>
      </footer>
    </>
  );
}
