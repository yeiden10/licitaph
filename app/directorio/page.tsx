import { createClient } from "@/lib/supabase/server";

const C = {
  bg: "#07090F", bgCard: "#0D1117", bgPanel: "#111827", border: "#1F2937",
  gold: "#C9A84C", goldDim: "#2D2310", blue: "#4A9EFF", green: "#4ADE80",
  red: "#F87171", text: "#F0F4FF", muted: "#6B7280", sub: "#9CA3AF",
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
        body { background:#07090F; color:#F0F4FF; font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .dir-card { background:#0D1117; border:1px solid #1F2937; border-radius:14px; padding:22px; transition:border-color 0.2s; }
        .dir-card:hover { border-color:rgba(201,168,76,0.3); }

        /* ── RESPONSIVE ── */
        .dir-nav-links { display:flex; gap:20px; align-items:center; }
        .dir-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:44px; }
        .dir-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
        .dir-hero-h1 { font-family:'Plus Jakarta Sans',sans-serif; font-size:40px; font-weight:800; color:#F0F4FF; letter-spacing:-0.6px; margin-bottom:14px; line-height:1.15; }
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
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(7,9,15,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, padding: "0 16px 0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 800 }}>
          <span style={{ color: C.gold }}>Licita</span><span style={{ color: C.text }}>PH</span>
        </a>
        <div className="dir-nav-links">
          <a href="/" style={{ color: C.muted, textDecoration: "none", fontSize: 13, fontWeight: 500 }}>Inicio</a>
          <a href="/directorio" style={{ color: C.gold, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Directorio</a>
          <a href="/" style={{ background: C.gold, color: "#07090F", textDecoration: "none", fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 7 }}>Ingresar</a>
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
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.sub }}>No hay empresas verificadas todavía</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Las empresas aparecen aquí después de completar el proceso de verificación.</div>
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
        <div style={{ marginTop: 72, textAlign: "center", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 18, padding: "48px 36px" }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 10 }}>
            ¿Tu empresa ofrece servicios para PHs?
          </h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.75, maxWidth: 500, margin: "0 auto 28px" }}>
            Únete al directorio verificado y accede a licitaciones de edificios en Panamá. El proceso de verificación es gratuito.
          </p>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.gold, color: "#07090F", borderRadius: 8, padding: "13px 30px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Registrar mi empresa →
          </a>
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
