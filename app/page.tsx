"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#FFFFFF",
  bg2:         "#F8FAFC",
  bg3:         "#F1F5F9",
  border:      "#E2E8F0",
  border2:     "#CBD5E1",
  text:        "#0F172A",
  text2:       "#475569",
  text3:       "#94A3B8",
  accent:      "#1E3A8A",
  accentMid:   "#1D4ED8",
  accentSoft:  "#EFF6FF",
  blue:        "#3B82F6",
  blueSoft:    "#EFF6FF",
  green:       "#10B981",
  greenSoft:   "#ECFDF5",
  red:         "#EF4444",
  redSoft:     "#FEF2F2",
  warning:     "#F59E0B",
  warningSoft: "#FFFBEB",
  // Marca — solo logo y BETA badge
  gold: "#C9A84C",
};

// ── Servicios PH ──────────────────────────────────────────────────────────────
const SERVICIOS_PH = [
  { icon: "🔒", label: "Seguridad y vigilancia" },
  { icon: "🧹", label: "Limpieza y conserje" },
  { icon: "🛗", label: "Ascensores" },
  { icon: "🌊", label: "Piscinas" },
  { icon: "🎨", label: "Pintura exterior" },
  { icon: "💧", label: "Impermeabilización" },
  { icon: "🌿", label: "Áreas verdes" },
  { icon: "❄️", label: "HVAC / Aire acond." },
  { icon: "⚡", label: "Electricidad" },
  { icon: "🔧", label: "Plomería" },
  { icon: "📹", label: "CCTV / Control acceso" },
  { icon: "🏗️", label: "Remodelaciones" },
  { icon: "🌧️", label: "Sistemas pluviales" },
  { icon: "🦟", label: "Fumigación" },
  { icon: "🔋", label: "Generadores" },
];

// ── Testimonios ───────────────────────────────────────────────────────────────
const TESTIMONIOS = [
  { quote: "Antes tardábamos 3 semanas en conseguir cotizaciones. Con LicitaPH tuvimos 5 propuestas comparables en 48 horas, todas con documentos verificados.", name: "María González", role: "Administradora · PH Costa del Este", color: C.accent, initial: "M" },
  { quote: "Ganamos 2 contratos el primer mes. El proceso es transparente — si no ganamos, sabemos exactamente por qué. Eso nos hace mejorar.", name: "Carlos Ramos", role: "Director · SecuroPanamá S.A.", color: C.blue, initial: "C" },
  { quote: "En la asamblea presenté el reporte de LicitaPH y los copropietarios quedaron sin preguntas. Por fin todos ven exactamente en qué se gasta la cuota.", name: "Ana Díaz", role: "Copropietaria · PH Punta Pacífica", color: C.green, initial: "A" },
];

// ── FAQs ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "¿Cuánto cuesta LicitaPH?", a: "Durante el período de lanzamiento, LicitaPH es completamente gratis. Sin tarjeta de crédito, sin contratos. Queremos que tu PH compruebe el valor antes de hablar de precios." },
  { q: "¿Cómo se garantiza que las empresas están verificadas?", a: "Cada empresa sube sus documentos legales (Registro Público, Paz y Salvo CSS/DGI, pólizas, permisos). El equipo de LicitaPH revisa y aprueba cada documento antes de que la empresa pueda participar en licitaciones." },
  { q: "¿El admin puede ver las propuestas antes del cierre?", a: "No. Las propuestas se bloquean hasta que vence la fecha de cierre. Esto garantiza que no haya ajuste de precios ni favoritismos — el proceso es objetivamente justo y legalmente blindado." },
  { q: "¿Qué pasa si una empresa incumple el contrato?", a: "El contrato generado incluye cláusulas de penalidad y fianza de cumplimiento. El historial de incumplimientos queda registrado en el perfil de la empresa, afectando su puntuación para futuras licitaciones." },
  { q: "¿Puedo usar LicitaPH si soy una empresa pequeña?", a: "Absolutamente. LicitaPH nivela el campo de juego. Una empresa de 5 personas con buenos documentos y buena propuesta técnica compite en igualdad con empresas grandes." },
  { q: "¿Qué ley regula las licitaciones en PHs en Panamá?", a: "La Ley 31 de 2010 (Propiedad Horizontal) establece que las contrataciones significativas deben respaldarse documentalmente. LicitaPH genera el expediente completo para cualquier auditoría o impugnación." },
];

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [vista, setVista] = useState<"inicio" | "login" | "registro">("inicio");
  const [tipoUsuario, setTipoUsuario] = useState("ph_admin");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", telefono: "" });
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ nombre: "", email: "", mensaje: "" });
  const [contactEnviado, setContactEnviado] = useState(false);
  const [contactEnviando, setContactEnviando] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const registrar = async () => {
    if (!form.nombre || !form.email || !form.password) { setMensaje("Por favor completa todos los campos obligatorios."); return; }
    setCargando(true); setMensaje("");
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { nombre_completo: form.nombre, tipo_usuario: tipoUsuario } },
    });
    setCargando(false);
    if (error) setMensaje("Error: " + error.message);
    else { setMensaje("✅ ¡Registro exitoso! Revisa tu email para confirmar tu cuenta."); setForm({ nombre: "", email: "", password: "", telefono: "" }); }
  };

  const login = async () => {
    if (!form.email || !form.password) { setMensaje("Por favor ingresa tu email y contraseña."); return; }
    setCargando(true); setMensaje("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setCargando(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed") || error.message.toLowerCase().includes("email_not_confirmed")) {
        setMensaje("⚠️ Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja (y spam).");
      } else if (error.message.toLowerCase().includes("invalid login credentials") || error.message.toLowerCase().includes("invalid_credentials")) {
        setMensaje("❌ Email o contraseña incorrectos.");
      } else {
        setMensaje("❌ " + error.message);
      }
      return;
    }
    const tipo = data.user?.user_metadata?.tipo_usuario;
    setMensaje("✅ ¡Bienvenido! Iniciando sesión...");
    setTimeout(() => {
      if (tipo === "empresa") router.replace("/empresa");
      else if (tipo === "copropietario") router.replace("/copropietario");
      else if (tipo === "superadmin") router.replace("/superadmin");
      else router.replace("/ph");
    }, 800);
  };

  const enviarContacto = async () => {
    if (!contactForm.nombre || !contactForm.email || !contactForm.mensaje) return;
    setContactEnviando(true);
    await new Promise(r => setTimeout(r, 1200));
    setContactEnviando(false);
    setContactEnviado(true);
    setContactForm({ nombre: "", email: "", mensaje: "" });
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      {/* JSON-LD: FAQPage structured data for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />
      {/* JSON-LD: SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "LicitaPH",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: "Plataforma de licitaciones digitales para Propiedades Horizontales en Panamá.",
            url: "https://licitaph.vercel.app",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Gratis durante el período de lanzamiento",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "5",
              reviewCount: "3",
            },
          }),
        }}
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior: smooth; }
        body { background:${C.bg}; color:${C.text}; font-family:'Inter',sans-serif; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
        ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:${C.bg}; } ::-webkit-scrollbar-thumb { background:${C.border2}; border-radius:3px; }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes pulse    { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes ticker   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

        /* ── BG SUTIL ── */
        .bg-mesh { position:fixed; inset:0; pointer-events:none; z-index:0;
          background-image: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(30,58,138,.04) 0%, transparent 65%); }
        .bg-grid { position:fixed; inset:0; pointer-events:none; z-index:0;
          background-image: linear-gradient(${C.border} 1px, transparent 1px),
                            linear-gradient(90deg, ${C.border} 1px, transparent 1px);
          background-size:64px 64px; opacity:.35;
          mask-image:radial-gradient(ellipse 90% 60% at 50% 0%, black 10%, transparent 70%); }

        /* ── NAV ── */
        .nav { position:fixed; top:0; left:0; right:0; z-index:300; height:60px;
          padding:0 clamp(18px,5vw,64px); display:flex; align-items:center; justify-content:space-between; transition:all .2s; }
        .nav.scrolled { background:rgba(255,255,255,.93); backdrop-filter:blur(20px) saturate(180%); border-bottom:1px solid ${C.border}; box-shadow:0 1px 0 ${C.border}; }
        .nav-logo { font-family:'Plus Jakarta Sans',sans-serif; font-size:21px; font-weight:800;
          background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; gap:5px; }
        .nav-links { display:flex; align-items:center; gap:28px; }
        .nav-link { background:none; border:none; color:${C.text2}; font-size:13.5px; font-weight:500;
          cursor:pointer; font-family:'Inter',sans-serif; transition:color .15s; padding:0; }
        .nav-link:hover { color:${C.text}; }
        .btn-ghost { padding:8px 17px; border-radius:8px; background:transparent; border:1px solid ${C.border2};
          color:${C.text2}; font-size:13px; font-weight:500; cursor:pointer; font-family:'Inter',sans-serif; transition:all .15s; }
        .btn-ghost:hover { color:${C.text}; border-color:${C.text3}; background:${C.bg3}; }
        .btn-primary { padding:8px 18px; border-radius:8px; background:${C.accent}; border:none;
          color:#fff; font-size:13px; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; transition:all .18s; }
        .btn-primary:hover { background:${C.accentMid}; transform:translateY(-1px); box-shadow:0 4px 16px rgba(30,58,138,.22); }

        /* ── HERO ── */
        .hero { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:100px clamp(18px,5vw,80px) 60px; position:relative; z-index:1; text-align:center; }
        .hero-pill { display:inline-flex; align-items:center; gap:8px; padding:6px 16px 6px 8px;
          border-radius:100px; border:1px solid ${C.border2}; background:${C.bg2};
          font-size:12px; font-weight:600; color:${C.accent}; margin-bottom:28px; animation:fadeUp .5s ease both; }
        .pill-dot { width:6px; height:6px; border-radius:50%; background:${C.accent}; animation:pulse 2s ease-in-out infinite; flex-shrink:0; }
        .hero-h1 { font-family:'Plus Jakarta Sans',sans-serif;
          font-size:clamp(38px,6vw,74px); font-weight:800; line-height:1.06;
          letter-spacing:-2.5px; margin-bottom:22px; animation:fadeUp .5s ease .08s both; color:${C.text}; }
        .hero-h1 em { font-style:normal; color:${C.accent}; }
        .hero-sub { font-size:clamp(15px,1.6vw,18px); color:${C.text2}; line-height:1.8;
          max-width:560px; margin:0 auto 36px; animation:fadeUp .5s ease .14s both; }
        .hero-sub strong { color:${C.text}; font-weight:600; }
        .hero-ctas { display:flex; gap:10px; justify-content:center; flex-wrap:wrap;
          margin-bottom:56px; animation:fadeUp .5s ease .2s both; }
        .cta-primary { padding:14px 30px; border-radius:10px; background:${C.accent}; border:none;
          color:#fff; font-size:15px; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif;
          display:flex; align-items:center; gap:8px; transition:all .2s; }
        .cta-primary:hover { background:${C.accentMid}; transform:translateY(-2px); box-shadow:0 10px 32px rgba(30,58,138,.28); }
        .cta-secondary { padding:14px 26px; border-radius:10px; background:${C.bg};
          border:1.5px solid ${C.border2}; color:${C.text2}; font-size:15px; font-weight:500;
          cursor:pointer; font-family:'Inter',sans-serif; transition:all .18s;
          display:flex; align-items:center; gap:8px; }
        .cta-secondary:hover { color:${C.text}; border-color:${C.text3}; background:${C.bg2}; }

        /* ── METRICS ── */
        .metrics { display:flex; border:1px solid ${C.border}; border-radius:16px;
          background:${C.bg}; overflow:hidden; animation:fadeUp .5s ease .26s both;
          box-shadow:0 1px 4px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.04); }
        .metric { flex:1; padding:20px 28px; text-align:center; position:relative; }
        .metric:not(:last-child)::after { content:''; position:absolute; right:0; top:20%; bottom:20%; width:1px; background:${C.border}; }
        .metric-n { font-family:'Plus Jakarta Sans',sans-serif; font-size:27px; font-weight:800; color:${C.accent}; line-height:1; }
        .metric-l { font-size:11px; color:${C.text3}; text-transform:uppercase; letter-spacing:1.5px; margin-top:5px; }

        /* ── TICKER ── */
        .ticker-wrap { overflow:hidden; background:${C.bg3};
          border-top:1px solid ${C.border}; border-bottom:1px solid ${C.border};
          padding:11px 0; position:relative; z-index:1; }
        .ticker-inner { display:flex; width:max-content; animation:ticker 32s linear infinite; }
        .ticker-item { display:flex; align-items:center; gap:10px; padding:0 28px; font-size:12px;
          font-weight:600; color:${C.text3}; text-transform:uppercase; letter-spacing:1.5px; white-space:nowrap; }
        .ticker-sep { width:4px; height:4px; border-radius:50%; background:${C.accent}; opacity:.35; }

        /* ── SECTIONS ── */
        .section { position:relative; z-index:1; padding:88px clamp(18px,5vw,80px); max-width:1160px; margin:0 auto; }
        .section-label { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:700;
          letter-spacing:2px; text-transform:uppercase; color:${C.accent}; margin-bottom:14px; }
        .section-label::before { content:''; display:block; width:18px; height:2px; background:${C.accent}; border-radius:2px; }
        .section-h { font-family:'Plus Jakarta Sans',sans-serif; font-size:clamp(26px,3.2vw,44px);
          font-weight:800; letter-spacing:-.9px; line-height:1.12; margin-bottom:16px; color:${C.text}; }
        .section-p { font-size:16px; color:${C.text2}; line-height:1.75; max-width:560px; }

        /* ── PROBLEMA / SOLUCIÓN ── */
        .prob-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:52px; }
        .prob-col { background:${C.bg}; border-radius:20px; padding:32px;
          box-shadow:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04); }
        .prob-col.bad  { border-left:4px solid ${C.red}; border:1px solid ${C.redSoft}; border-left:4px solid ${C.red}; }
        .prob-col.good { border-left:4px solid ${C.green}; border:1px solid ${C.greenSoft}; border-left:4px solid ${C.green}; }
        .col-tag { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:100px;
          font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:22px; }
        .col-tag.bad  { background:${C.redSoft}; color:${C.red}; border:1px solid rgba(239,68,68,.25); }
        .col-tag.good { background:${C.greenSoft}; color:${C.green}; border:1px solid rgba(16,185,129,.25); }
        .prob-row { display:flex; align-items:flex-start; gap:12px; margin-bottom:15px; }
        .prob-text { font-size:13.5px; line-height:1.65; color:${C.text2}; }
        .prob-text strong { color:${C.text}; display:block; margin-bottom:2px; font-size:13.5px; font-weight:600; }

        /* ── VIDEO ── */
        .video-wrap { position:relative; z-index:1; padding:0 clamp(18px,5vw,80px) 88px; }
        .video-inner-wrap { max-width:1160px; margin:0 auto; }
        .video-box { position:relative; border-radius:20px; overflow:hidden; background:${C.bg3};
          border:1px solid ${C.border}; aspect-ratio:16/9;
          display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .25s;
          box-shadow:0 4px 24px rgba(0,0,0,.06); }
        .video-box:hover { border-color:${C.accentMid}; box-shadow:0 8px 40px rgba(30,58,138,.12); }
        .vbg { position:absolute; inset:0;
          background:radial-gradient(ellipse 60% 50% at 50% 50%, rgba(30,58,138,.04) 0%, transparent 65%); }
        .vgrid { position:absolute; inset:0;
          background-image:linear-gradient(${C.border} 1px, transparent 1px),
                           linear-gradient(90deg, ${C.border} 1px, transparent 1px);
          background-size:48px 48px; opacity:.5; }
        .play-btn { position:relative; z-index:2; width:80px; height:80px; border-radius:50%;
          background:${C.accent}; border:none; display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:all .22s; animation:float 3.5s ease-in-out infinite;
          box-shadow:0 8px 32px rgba(30,58,138,.3); }
        .play-btn:hover { transform:scale(1.1); box-shadow:0 12px 48px rgba(30,58,138,.4); animation:none; }
        .video-label { position:absolute; bottom:24px; left:50%; transform:translateX(-50%);
          background:rgba(255,255,255,.92); backdrop-filter:blur(12px);
          border:1px solid ${C.border}; border-radius:100px; padding:8px 20px;
          white-space:nowrap; font-size:13px; font-weight:500; color:${C.text2}; z-index:2; }

        /* ── STEPS ── */
        .steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; margin-top:52px; }
        .step-card { background:${C.bg}; border:1px solid ${C.border}; border-radius:16px; padding:28px 22px;
          position:relative; overflow:hidden; transition:all .2s;
          box-shadow:0 1px 3px rgba(0,0,0,.05); }
        .step-card::before { content:attr(data-n); position:absolute; top:-10px; right:14px;
          font-family:'Plus Jakarta Sans',sans-serif; font-size:88px; font-weight:800;
          color:rgba(30,58,138,.04); line-height:1; pointer-events:none; }
        .step-card:hover { border-color:rgba(30,58,138,.2); transform:translateY(-3px); box-shadow:0 6px 20px rgba(0,0,0,.08); }
        .step-num { width:36px; height:36px; border-radius:50%; background:${C.accentSoft};
          border:1px solid rgba(30,58,138,.18); display:flex; align-items:center; justify-content:center;
          font-family:'DM Mono',monospace; font-size:12px; font-weight:600; color:${C.accent}; margin-bottom:18px; }
        .step-title { font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; font-weight:700; margin-bottom:8px; color:${C.text}; }
        .step-desc  { font-size:13px; color:${C.text2}; line-height:1.7; }

        /* ── SERVICES GRID ── */
        .svc-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-top:44px; }
        .svc-card { background:${C.bg}; border:1px solid ${C.border}; border-radius:12px;
          padding:18px 12px; display:flex; flex-direction:column; align-items:center; gap:9px;
          text-align:center; transition:all .18s; }
        .svc-card:hover { border-color:rgba(30,58,138,.2); background:${C.accentSoft}; transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,.06); }
        .svc-icon  { font-size:22px; }
        .svc-label { font-size:11.5px; font-weight:500; color:${C.text2}; line-height:1.4; }

        /* ── PROFILES ── */
        .profiles-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:52px; }
        .profile-card { background:${C.bg}; border:1px solid ${C.border}; border-radius:20px; padding:32px 28px;
          display:flex; flex-direction:column; transition:all .2s; position:relative; overflow:hidden;
          box-shadow:0 1px 3px rgba(0,0,0,.05); }
        .profile-card:hover { transform:translateY(-4px); box-shadow:0 8px 28px rgba(0,0,0,.08); }
        .profile-accent { position:absolute; top:0; left:0; right:0; height:3px; border-radius:20px 20px 0 0; }
        .profile-icon { width:50px; height:50px; border-radius:12px; display:flex; align-items:center;
          justify-content:center; font-size:22px; margin-bottom:18px; }
        .profile-title { font-family:'Plus Jakarta Sans',sans-serif; font-size:18px; font-weight:700; margin-bottom:8px; color:${C.text}; }
        .profile-sub   { font-size:13.5px; color:${C.text2}; line-height:1.7; margin-bottom:20px; }
        .profile-bullets { list-style:none; display:flex; flex-direction:column; gap:9px; margin-bottom:24px; flex:1; }
        .pbullet { display:flex; align-items:flex-start; gap:9px; font-size:13px; color:${C.text2}; }
        .profile-cta { padding:10px 20px; border-radius:8px; border:1.5px solid; font-size:13px;
          font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; transition:all .18s; text-align:center; }

        /* ── TESTIMONIALS ── */
        .testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:52px; }
        .testi-card { background:${C.bg}; border:1px solid ${C.border}; border-radius:16px;
          padding:26px; display:flex; flex-direction:column; gap:16px;
          box-shadow:0 1px 3px rgba(0,0,0,.04); }
        .testi-stars { color:${C.warning}; font-size:13px; letter-spacing:2px; }
        .testi-quote { font-size:14px; color:${C.text2}; line-height:1.75; flex:1; }
        .testi-author { display:flex; align-items:center; gap:12px; }
        .t-avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center;
          justify-content:center; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; flex-shrink:0; }
        .t-name { font-size:13px; font-weight:600; color:${C.text}; }
        .t-role { font-size:11px; color:${C.text3}; margin-top:1px; }

        /* ── FAQ ── */
        .faq-wrap { display:grid; grid-template-columns:1fr 1.3fr; gap:60px; align-items:start; }
        .faq-list { display:flex; flex-direction:column; gap:8px; }
        .faq-item { background:${C.bg}; border:1px solid ${C.border}; border-radius:12px; overflow:hidden; }
        .faq-q { width:100%; display:flex; align-items:center; justify-content:space-between; gap:14px;
          padding:18px 22px; background:none; border:none; color:${C.text}; font-size:14.5px;
          font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; text-align:left; transition:background .12s; }
        .faq-q:hover { background:${C.bg2}; }
        .faq-chev { width:22px; height:22px; border-radius:50%; border:1.5px solid ${C.border2};
          display:flex; align-items:center; justify-content:center; font-size:11px;
          color:${C.text3}; flex-shrink:0; transition:transform .22s, color .18s, border-color .18s; }
        .faq-chev.open { transform:rotate(180deg); color:${C.accent}; border-color:rgba(30,58,138,.3); }
        .faq-a { padding:0 22px 18px; font-size:13.5px; color:${C.text2}; line-height:1.75; }

        /* ── CONTACT ── */
        .contact-grid { display:grid; grid-template-columns:1fr 1.25fr; gap:56px; margin-top:52px; align-items:start; }
        .contact-points { display:flex; flex-direction:column; gap:26px; }
        .cp { display:flex; align-items:flex-start; gap:16px; }
        .cp-icon { width:44px; height:44px; border-radius:12px; background:${C.accentSoft};
          border:1px solid rgba(30,58,138,.15); display:flex; align-items:center; justify-content:center;
          font-size:18px; flex-shrink:0; }
        .cp-title { font-size:13.5px; font-weight:600; color:${C.text}; margin-bottom:2px; }
        .cp-val { font-size:13px; color:${C.text2}; }
        .contact-form-box { background:${C.bg}; border:1px solid ${C.border}; border-radius:18px; padding:32px;
          box-shadow:0 2px 12px rgba(0,0,0,.05); }
        .cf-field { margin-bottom:15px; }
        .cf-label { display:block; font-size:11px; font-weight:600; color:${C.text3};
          text-transform:uppercase; letter-spacing:1px; margin-bottom:7px; }
        .cf-input { width:100%; background:${C.bg2}; border:1.5px solid ${C.border};
          border-radius:9px; padding:11px 14px; font-size:14px; color:${C.text};
          font-family:'Inter',sans-serif; outline:none; transition:all .15s; }
        .cf-input:focus { border-color:${C.accent}; background:${C.accentSoft}; box-shadow:0 0 0 3px rgba(30,58,138,.07); }
        .cf-input::placeholder { color:${C.text3}; }
        .cf-textarea { resize:vertical; min-height:108px; }

        /* ── CTA FINAL ── */
        .cta-section { position:relative; z-index:1; padding:0 clamp(18px,5vw,80px) 88px; }
        .cta-box { max-width:1160px; margin:0 auto; border-radius:24px; padding:72px 60px; text-align:center;
          background:linear-gradient(135deg,${C.accentSoft} 0%,${C.bg} 60%);
          border:1px solid rgba(30,58,138,.12); position:relative; overflow:hidden; }
        .cta-box::before { content:''; position:absolute; inset:0;
          background:radial-gradient(ellipse 60% 80% at 50% 120%, rgba(30,58,138,.06) 0%, transparent 65%); }
        .cta-inner { position:relative; z-index:1; }
        .cta-h { font-family:'Plus Jakarta Sans',sans-serif; font-size:clamp(28px,3.6vw,50px);
          font-weight:800; letter-spacing:-1.2px; line-height:1.1; margin-bottom:16px; color:${C.text}; }
        .cta-p { font-size:16px; color:${C.text2}; line-height:1.75; max-width:480px; margin:0 auto 36px; }

        /* ── FOOTER ── */
        .footer { position:relative; z-index:1; border-top:1px solid ${C.border}; background:${C.bg2}; }
        .footer-grid { max-width:1160px; margin:0 auto;
          padding:48px clamp(18px,5vw,80px) 32px;
          display:grid; grid-template-columns:1.6fr 1fr 1fr 1fr; gap:40px; }
        .footer-brand { font-family:'Plus Jakarta Sans',sans-serif; font-size:22px; font-weight:800; margin-bottom:12px; }
        .footer-desc { font-size:13px; color:${C.text2}; line-height:1.7; max-width:240px; }
        .footer-col-title { font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:${C.text3}; margin-bottom:14px; }
        .footer-link { display:block; font-size:13px; color:${C.text2}; cursor:pointer; margin-bottom:9px;
          transition:color .15s; background:none; border:none; font-family:'Inter',sans-serif; text-align:left; padding:0; }
        .footer-link:hover { color:${C.text}; }
        .footer-bottom { border-top:1px solid ${C.border};
          padding:20px clamp(18px,5vw,80px); display:flex; align-items:center;
          justify-content:space-between; font-size:12px; color:${C.text3}; }

        /* ── AUTH FORMS ── */
        .form-page { min-height:100vh; display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:80px 24px 60px; position:relative; z-index:1; background:${C.bg2}; }
        .form-box { max-width:440px; width:100%; animation:fadeUp .3s ease both; }
        .back-btn { display:inline-flex; align-items:center; gap:6px; background:none; border:none;
          color:${C.text2}; cursor:pointer; font-size:13px; font-family:'Inter',sans-serif;
          margin-bottom:26px; padding:0; transition:color .13s; }
        .back-btn:hover { color:${C.text}; }
        .form-card { background:${C.bg}; border:1px solid ${C.border}; border-radius:20px;
          padding:40px; position:relative; box-shadow:0 4px 24px rgba(0,0,0,.07),0 1px 4px rgba(0,0,0,.04); }
        .form-card::after { content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background:${C.accent}; border-radius:20px 20px 0 0; }
        .form-h   { font-family:'Plus Jakarta Sans',sans-serif; font-size:26px; font-weight:800; letter-spacing:-.5px; margin-bottom:6px; color:${C.text}; }
        .form-sub { font-size:13.5px; color:${C.text2}; margin-bottom:24px; line-height:1.6; }
        .type-toggle { display:flex; gap:5px; padding:4px; background:${C.bg3}; border-radius:10px; margin-bottom:20px; border:1px solid ${C.border}; }
        .type-btn { flex:1; padding:9px 6px; border-radius:7px; font-size:12px; font-weight:600;
          cursor:pointer; font-family:'Inter',sans-serif; transition:all .15s; text-align:center; border:none; }
        .type-btn.on  { background:${C.accent}; color:#fff; box-shadow:0 1px 4px rgba(30,58,138,.2); }
        .type-btn.off { background:transparent; color:${C.text3}; }
        .f-field { margin-bottom:14px; }
        .f-label { display:block; font-size:11px; font-weight:600; color:${C.text3};
          text-transform:uppercase; letter-spacing:1px; margin-bottom:7px; }
        .f-input { width:100%; background:${C.bg2}; border:1.5px solid ${C.border};
          border-radius:9px; padding:11px 14px; font-size:14px; color:${C.text};
          font-family:'Inter',sans-serif; transition:all .15s; outline:none; }
        .f-input:focus { border-color:${C.accent}; background:${C.accentSoft}; box-shadow:0 0 0 3px rgba(30,58,138,.07); }
        .f-input::placeholder { color:${C.text3}; }
        .a-ok  { padding:11px 14px; border-radius:9px; font-size:13px; line-height:1.5; margin-bottom:14px; background:${C.greenSoft}; border:1px solid rgba(16,185,129,.25); color:${C.green}; }
        .a-err { padding:11px 14px; border-radius:9px; font-size:13px; line-height:1.5; margin-bottom:14px; background:${C.redSoft}; border:1px solid rgba(239,68,68,.25); color:${C.red}; }
        .f-submit { width:100%; padding:13px; border-radius:9px; background:${C.accent}; border:none;
          color:#fff; font-size:14px; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif; transition:all .18s; margin-bottom:16px; }
        .f-submit:hover:not(:disabled) { background:${C.accentMid}; transform:translateY(-1px); box-shadow:0 4px 14px rgba(30,58,138,.22); }
        .f-submit:disabled { opacity:.5; cursor:not-allowed; }
        .f-foot { text-align:center; font-size:13px; color:${C.text2}; }
        .f-switch { cursor:pointer; font-weight:600; color:${C.accent}; }
        .info-badge { background:${C.greenSoft}; border:1px solid rgba(16,185,129,.2);
          border-radius:8px; padding:10px 14px; font-size:12px; color:${C.green}; line-height:1.55; margin-bottom:4px; }

        /* ── RESPONSIVE ── */
        @media (max-width:1024px) {
          .svc-grid { grid-template-columns:repeat(4,1fr); }
          .steps-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width:768px) {
          .nav-links { display:none; }
          .prob-grid, .profiles-grid, .testi-grid, .contact-grid, .faq-wrap { grid-template-columns:1fr; gap:20px; }
          .svc-grid { grid-template-columns:repeat(3,1fr); }
          .metrics { flex-wrap:wrap; }
          .metric:not(:last-child)::after { display:none; }
          .footer-grid { grid-template-columns:1fr 1fr; }
          .footer-bottom { flex-direction:column; gap:8px; text-align:center; }
          .cta-box { padding:44px 26px; }
          .section { padding:60px clamp(18px,4vw,40px); }
          .video-wrap { padding:0 clamp(18px,4vw,40px) 60px; }
        }
        @media (max-width:480px) {
          .svc-grid { grid-template-columns:repeat(2,1fr); }
          .hero-ctas { flex-direction:column; align-items:center; }
          .cta-primary, .cta-secondary { width:100%; justify-content:center; }
          .footer-grid { grid-template-columns:1fr; }
          .form-card { padding:28px 20px; }
          .steps-grid { grid-template-columns:1fr; }
          .metric { padding:12px 16px; }
        }
      `}</style>

      <div className="bg-mesh" />
      <div className="bg-grid" />

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
        <button className="nav-logo" onClick={() => setVista("inicio")}>
          <span style={{ color: C.accent }}>Licita</span>
          <span style={{ color: C.text }}>PH</span>
          <span style={{ marginLeft: 6, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: C.accent, color: "#fff", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>BETA</span>
        </button>
        <div className="nav-links">
          <button className="nav-link" onClick={() => scrollTo("como-funciona")}>Cómo funciona</button>
          <button className="nav-link" onClick={() => scrollTo("servicios")}>Servicios</button>
          <a href="/directorio" style={{ background: "none", border: "none", color: C.text2, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", textDecoration: "none", transition: "color .18s" }} onMouseOver={e => (e.currentTarget.style.color = C.text)} onMouseOut={e => (e.currentTarget.style.color = C.text2)}>Directorio</a>
          <button className="nav-link" onClick={() => scrollTo("faq")}>FAQ</button>
          <button className="nav-link" onClick={() => scrollTo("contacto")}>Contacto</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn-ghost" onClick={() => { setVista("login"); setMensaje(""); }}>Iniciar sesión</button>
          <button className="btn-primary" onClick={() => { setVista("registro"); setMensaje(""); }}>Empezar gratis →</button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          LANDING
      ══════════════════════════════════════════════════════════════════════ */}
      {vista === "inicio" && (
        <>
          {/* ── HERO ── */}
          <section className="hero">
            <div className="hero-pill">
              <span className="pill-dot" />
              La plataforma #1 de licitaciones para PHs en Panamá
            </div>
            <h1 className="hero-h1">
              Contrata mejor.<br />
              <em>Gasta menos.</em><br />
              Sin conflictos.
            </h1>
            <p className="hero-sub">
              LicitaPH digitaliza la contratación de tu Propiedad Horizontal.{" "}
              <strong>Publica una licitación en 5 minutos</strong>, recibe propuestas de empresas verificadas y adjudica con respaldo legal completo.
            </p>
            <div className="hero-ctas">
              <button className="cta-primary" onClick={() => { setVista("registro"); setMensaje(""); }}>
                Crear cuenta gratis →
              </button>
              <button className="cta-secondary" onClick={() => scrollTo("video")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={C.accent}><polygon points="5,3 19,12 5,21"/></svg>
                Ver demo
              </button>
            </div>
            <div className="metrics">
              {[
                { n: "4,500+", l: "PHs en Panamá"       },
                { n: "18%",    l: "Ahorro promedio"      },
                { n: "48h",    l: "Primer resultado"     },
                { n: "100%",   l: "Proceso documentado"  },
              ].map(m => (
                <div className="metric" key={m.l}>
                  <div className="metric-n">{m.n}</div>
                  <div className="metric-l">{m.l}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── TICKER ── */}
          <div className="ticker-wrap">
            <div className="ticker-inner">
              {[...SERVICIOS_PH, ...SERVICIOS_PH].map((s, i) => (
                <div className="ticker-item" key={i}>
                  <span>{s.icon}</span><span>{s.label}</span>
                  <span className="ticker-sep" />
                </div>
              ))}
            </div>
          </div>

          {/* ── PROBLEMA / SOLUCIÓN ── */}
          <section className="section" id="problema">
            <div className="section-label">El problema real</div>
            <h2 className="section-h">Contratar en un PH hoy<br />es un proceso roto.</h2>
            <p className="section-p">Miles de administradores panameños contratan por WhatsApp, con PDFs sin firma y por recomendaciones de conocidos. El resultado: sobrecostos, contratos sin garantía y conflictos en asamblea.</p>
            <div className="prob-grid">
              <div className="prob-col bad">
                <span className="col-tag bad">✕ Sin LicitaPH</span>
                {[
                  { t: "Cotizaciones por WhatsApp",          d: "Sin documentación, sin registro, imposible auditar." },
                  { t: "Empresas sin verificar",              d: "¿Tienen seguro? ¿Paz y salvo? ¿Permiso vigente? Nadie lo sabe." },
                  { t: "El admin ve precios antes de tiempo", d: "Crea favoritismos y expone al PH a impugnaciones legales." },
                  { t: "Contratos en papel que se pierden",   d: "Cuando hay un problema, no hay expediente que respalde la decisión." },
                  { t: "Copropietarios sin información",      d: "Preguntan en asamblea y el admin no tiene respuestas claras." },
                ].map(p => (
                  <div className="prob-row" key={p.t}>
                    <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>❌</span>
                    <div className="prob-text"><strong>{p.t}</strong>{p.d}</div>
                  </div>
                ))}
              </div>
              <div className="prob-col good">
                <span className="col-tag good">✓ Con LicitaPH</span>
                {[
                  { t: "Proceso digital y documentado",            d: "Cada paso queda registrado. Expediente completo disponible 24/7." },
                  { t: "Empresas 100% verificadas",                 d: "Revisamos documentos legales y pólizas antes de activar cada empresa." },
                  { t: "Propuestas bloqueadas hasta cierre",        d: "Nadie ve nada hasta que vence la fecha. Proceso justo y blindado." },
                  { t: "Contratos con penalidades y garantías",     d: "Generados automáticamente, descargables en Word. Listos para firma." },
                  { t: "Portal de transparencia para copropietarios", d: "Acceso de lectura a licitaciones, contratos y ahorros. Cero conflictos." },
                ].map(p => (
                  <div className="prob-row" key={p.t}>
                    <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>✅</span>
                    <div className="prob-text"><strong>{p.t}</strong>{p.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── VIDEO ── */}
          <div className="video-wrap" id="video">
            <div className="video-inner-wrap">
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div className="section-label" style={{ justifyContent: "center" }}>Demo</div>
                <h2 className="section-h" style={{ textAlign: "center" }}>
                  Mira LicitaPH en acción<br />
                  <span style={{ color: C.accent }}>en menos de 3 minutos</span>
                </h2>
              </div>
              <div className="video-box" ref={videoRef}>
                <div className="vbg" />
                <div className="vgrid" />
                {/* ─── Reemplazar con <iframe> o <video> cuando el video esté listo ─── */}
                <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                  <button className="play-btn" onClick={() => scrollTo("contacto")}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill={C.accent}>
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </button>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Video demo — próximamente</p>
                    <p style={{ color: C.text2, fontSize: 13, margin: "6px 0 0" }}>Estamos grabando el demo completo. Mientras tanto, <span style={{ color: C.accent, cursor: "pointer" }} onClick={() => scrollTo("contacto")}>solicita una presentación en vivo →</span></p>
                  </div>
                </div>
                <div className="video-label">🎬 LicitaPH para administradores de PH · Demo completo · ~3 min</div>
              </div>
            </div>
          </div>

          {/* ── CÓMO FUNCIONA ── */}
          <section className="section" id="como-funciona">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 52, alignItems: "start" }}>
              <div>
                <div className="section-label">Cómo funciona</div>
                <h2 className="section-h">De la licitación al contrato firmado en 4 pasos</h2>
              </div>
              <p className="section-p" style={{ marginTop: 44 }}>Diseñado para que un administrador sin experiencia en licitaciones pueda publicar la primera en menos de 10 minutos.</p>
            </div>
            <div className="steps-grid">
              {[
                { n: "01", t: "Publica la licitación",       d: "Selecciona la categoría y la IA sugiere requisitos técnicos correctos. Agrega fotos del lugar, fechas de inspección y presupuesto referencial." },
                { n: "02", t: "Empresas verificadas aplican", d: "Las empresas inspeccionan el lugar, declaran que leyeron el pliego completo y envían propuesta con precio, metodología y documentos." },
                { n: "03", t: "IA evalúa y rankea",           d: "Claude AI puntúa cada propuesta en precio, experiencia, documentación y reputación. Ves el ranking con justificación detallada." },
                { n: "04", t: "Adjudica y firma",             d: "La decisión queda documentada. El contrato se genera automáticamente con cláusulas de penalidad, fianza y garantías mínimas legales." },
              ].map(s => (
                <div className="step-card" key={s.n} data-n={s.n}>
                  <div className="step-num">{s.n}</div>
                  <div className="step-title">{s.t}</div>
                  <div className="step-desc">{s.d}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── SERVICIOS ── */}
          <section className="section" id="servicios" style={{ paddingTop: 0 }}>
            <div className="section-label">Categorías de servicio</div>
            <h2 className="section-h">Todo lo que contrata tu PH,<br />en un solo lugar</h2>
            <p className="section-p">LicitaPH incluye pliegos de cargos especializados para cada categoría, con requisitos técnicos, garantías mínimas y especificaciones de materiales conforme a la legislación panameña.</p>
            <div className="svc-grid">
              {SERVICIOS_PH.map(s => (
                <div className="svc-card" key={s.label}>
                  <span className="svc-icon">{s.icon}</span>
                  <span className="svc-label">{s.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── PARA QUIÉN ES ── */}
          <section className="section" id="perfiles" style={{ paddingTop: 0 }}>
            <div className="section-label">Para quién es</div>
            <h2 className="section-h">Una plataforma,<br />tres perspectivas</h2>
            <div className="profiles-grid">
              {/* Administrador */}
              <div className="profile-card" style={{ border: `1px solid rgba(30,58,138,.15)` }}>
                <div className="profile-accent" style={{ background: C.accent }} />
                <div className="profile-icon" style={{ background: C.accentSoft, border: `1px solid rgba(30,58,138,.15)` }}>🏗️</div>
                <div className="profile-title">Administrador de PH</div>
                <div className="profile-sub">Gestiona todas las contrataciones con un proceso ordenado, documentado y legalmente respaldado.</div>
                <ul className="profile-bullets">
                  {["Publica licitaciones en 5 minutos","Recibe propuestas de empresas verificadas","IA rankea y justifica cada propuesta","Contratos con cláusulas de protección","Reportes para junta directiva en 1 clic"].map(b => (
                    <li className="pbullet" key={b}><span style={{ color: C.accent, marginTop: 1, flexShrink: 0, fontWeight: 700 }}>✓</span><span>{b}</span></li>
                  ))}
                </ul>
                <button className="profile-cta" style={{ background: C.accent, borderColor: C.accent, color: "#fff" }}
                  onClick={() => { setTipoUsuario("ph_admin"); setVista("registro"); setMensaje(""); }}>
                  Crear cuenta de PH →
                </button>
              </div>
              {/* Empresa */}
              <div className="profile-card" style={{ border: `1px solid rgba(59,130,246,.2)` }}>
                <div className="profile-accent" style={{ background: C.blue }} />
                <div className="profile-icon" style={{ background: C.blueSoft, border: `1px solid rgba(59,130,246,.15)` }}>🏢</div>
                <div className="profile-title">Empresa proveedora</div>
                <div className="profile-sub">Accede a más de 4,500 PHs que contratan regularmente. Compite con tus credenciales, no con tus contactos.</div>
                <ul className="profile-bullets">
                  {["Alertas de licitaciones en tu categoría","Perfil verificado que inspira confianza","Evaluación 100% objetiva y transparente","Construye reputación con cada contrato","Historial como referencia comercial"].map(b => (
                    <li className="pbullet" key={b}><span style={{ color: C.blue, marginTop: 1, flexShrink: 0, fontWeight: 700 }}>✓</span><span>{b}</span></li>
                  ))}
                </ul>
                <button className="profile-cta" style={{ background: C.blue, borderColor: C.blue, color: "#fff" }}
                  onClick={() => { setTipoUsuario("empresa"); setVista("registro"); setMensaje(""); }}>
                  Registrar mi empresa →
                </button>
              </div>
              {/* Copropietario */}
              <div className="profile-card" style={{ border: `1px solid rgba(16,185,129,.2)` }}>
                <div className="profile-accent" style={{ background: C.green }} />
                <div className="profile-icon" style={{ background: C.greenSoft, border: `1px solid rgba(16,185,129,.15)` }}>🏠</div>
                <div className="profile-title">Copropietario</div>
                <div className="profile-sub">Sabe exactamente en qué se gasta tu cuota. Portal de transparencia con acceso a licitaciones y contratos.</div>
                <ul className="profile-bullets">
                  {["Ve todas las licitaciones de tu PH","Accede al resultado de cada adjudicación","Consulta contratos vigentes en tiempo real","Recibe alertas de nuevas contrataciones","Llega a la asamblea con datos concretos"].map(b => (
                    <li className="pbullet" key={b}><span style={{ color: C.green, marginTop: 1, flexShrink: 0, fontWeight: 700 }}>✓</span><span>{b}</span></li>
                  ))}
                </ul>
                <button className="profile-cta" style={{ background: C.green, borderColor: C.green, color: "#fff" }}
                  onClick={() => { setTipoUsuario("copropietario"); setVista("registro"); setMensaje(""); }}>
                  Acceder como copropietario →
                </button>
              </div>
            </div>
          </section>

          {/* ── TESTIMONIOS ── */}
          <section className="section" id="testimonios" style={{ paddingTop: 0 }}>
            <div className="section-label">Testimonios</div>
            <h2 className="section-h">Lo que dicen los primeros<br />usuarios de LicitaPH</h2>
            <div className="testi-grid">
              {TESTIMONIOS.map(t => (
                <div className="testi-card" key={t.name}>
                  <div className="testi-stars">★★★★★</div>
                  <p className="testi-quote">"{t.quote}"</p>
                  <div className="testi-author">
                    <div className="t-avatar" style={{ background: `${t.color}20`, color: t.color }}>{t.initial}</div>
                    <div><div className="t-name">{t.name}</div><div className="t-role">{t.role}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="section" id="faq" style={{ paddingTop: 0 }}>
            <div className="faq-wrap">
              <div>
                <div className="section-label">FAQ</div>
                <h2 className="section-h">Preguntas<br />frecuentes</h2>
                <p className="section-p" style={{ marginTop: 16, fontSize: 14 }}>
                  ¿Tienes más preguntas? Escríbenos a{" "}
                  <span style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }} onClick={() => scrollTo("contacto")}>soporte@licitaph.com</span>
                </p>
              </div>
              <div className="faq-list">
                {FAQS.map((faq, i) => (
                  <div className="faq-item" key={i}>
                    <button className="faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                      {faq.q}
                      <span className={`faq-chev ${faqOpen === i ? "open" : ""}`}>▾</span>
                    </button>
                    {faqOpen === i && <div className="faq-a">{faq.a}</div>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CONTACTO ── */}
          <section className="section" id="contacto" style={{ paddingTop: 0 }}>
            <div className="section-label">Contacto</div>
            <h2 className="section-h">Agenda una demostración<br /><span style={{ color: C.accent }}>personalizada</span></h2>
            <p className="section-p">¿Quieres ver LicitaPH en tu PH? Nuestro equipo te hace una presentación en vivo, responde todas tus preguntas y configura tu cuenta el mismo día.</p>
            <div className="contact-grid">
              <div className="contact-points">
                {[
                  { icon: "📧", t: "Email",       v: "soporte@licitaph.com" },
                  { icon: "📱", t: "WhatsApp",    v: "+507 6000-0000" },
                  { icon: "🏙️", t: "Ubicación",   v: "Ciudad de Panamá, Panamá" },
                  { icon: "🕐", t: "Horario",     v: "Lunes a viernes · 8am – 6pm" },
                ].map(cp => (
                  <div className="cp" key={cp.t}>
                    <div className="cp-icon">{cp.icon}</div>
                    <div><div className="cp-title">{cp.t}</div><div className="cp-val">{cp.v}</div></div>
                  </div>
                ))}
                <div style={{ background: C.accentSoft, border: `1px solid rgba(30,58,138,.15)`, borderRadius: 14, padding: "18px 20px" }}>
                  <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, margin: 0 }}>
                    <span style={{ color: C.accent, fontWeight: 600 }}>Oferta de lanzamiento:</span> Los primeros 50 PHs que se registren obtienen acceso completo{" "}
                    <strong style={{ color: C.text }}>sin costo durante todo el período beta</strong>.
                  </p>
                </div>
              </div>
              <div className="contact-form-box">
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Solicitar presentación</h3>
                <p style={{ fontSize: 13, color: C.text2, marginBottom: 22, lineHeight: 1.6 }}>Te contactamos en menos de 24 horas hábiles.</p>
                {contactEnviado ? (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>¡Mensaje enviado!</p>
                    <p style={{ fontSize: 14, color: C.text2 }}>Te contactaremos en menos de 24 horas.</p>
                  </div>
                ) : (
                  <>
                    {[
                      { key: "nombre", label: "Tu nombre / Nombre del PH *", type: "text",  ph: "María González · PH Torre Pacífica" },
                      { key: "email",  label: "Email de contacto *",          type: "email", ph: "admin@tuph.com" },
                    ].map(f => (
                      <div className="cf-field" key={f.key}>
                        <label className="cf-label">{f.label}</label>
                        <input className="cf-input" type={f.type} placeholder={f.ph}
                          value={contactForm[f.key as "nombre" | "email"]}
                          onChange={e => setContactForm(p => ({ ...p, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="cf-field">
                      <label className="cf-label">¿Qué necesitas contratar? *</label>
                      <textarea className="cf-input cf-textarea"
                        placeholder="Ej: Tenemos un PH de 80 aptos en San Francisco. Necesitamos contratar seguridad y mantenimiento. Nos interesa ver la plataforma."
                        value={contactForm.mensaje}
                        onChange={e => setContactForm(p => ({ ...p, mensaje: e.target.value }))} />
                    </div>
                    <button className="f-submit" style={{ marginBottom: 0 }} onClick={enviarContacto}
                      disabled={contactEnviando || !contactForm.nombre || !contactForm.email || !contactForm.mensaje}>
                      {contactEnviando ? "Enviando..." : "Solicitar presentación →"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ── CTA FINAL ── */}
          <div className="cta-section">
            <div className="cta-box">
              <div className="cta-inner">
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: C.accent, marginBottom: 18 }}>Gratis durante el beta</div>
                <h2 className="cta-h">Tu PH se merece<br />un proceso moderno.</h2>
                <p className="cta-p">Sin tarjeta de crédito. Sin contratos. Los primeros 50 PHs obtienen acceso completo sin costo. Empieza hoy.</p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="cta-primary" onClick={() => { setVista("registro"); setMensaje(""); }}>Crear cuenta gratis →</button>
                  <button className="cta-secondary" onClick={() => scrollTo("contacto")}>Hablar con el equipo</button>
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <footer className="footer">
            <div className="footer-grid">
              <div>
                <div className="footer-brand">
                  <span style={{ color: C.accent }}>Licita</span>
                  <span style={{ color: C.text }}>PH</span>
                </div>
                <p className="footer-desc">La plataforma digital de licitaciones para Propiedades Horizontales en Panamá. Procesos transparentes, contratos sólidos.</p>
              </div>
              <div>
                <div className="footer-col-title">Plataforma</div>
                {["Para administradores","Para empresas","Para copropietarios","Panel superadmin"].map(l => (
                  <button key={l} className="footer-link">{l}</button>
                ))}
              </div>
              <div>
                <div className="footer-col-title">Categorías</div>
                {["Seguridad","Limpieza","Mantenimiento","Ascensores","Pintura","Impermeabilización"].map(l => (
                  <button key={l} className="footer-link">{l}</button>
                ))}
              </div>
              <div>
                <div className="footer-col-title">Legal</div>
                {["Términos de servicio","Política de privacidad","Ley 31 de 2010"].map(l => (
                  <button key={l} className="footer-link">{l}</button>
                ))}
                <div className="footer-col-title" style={{ marginTop: 18 }}>Soporte</div>
                <p style={{ fontSize: 12.5, color: C.text2 }}>soporte@licitaph.com</p>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© 2025 LicitaPH · Ciudad de Panamá · Todos los derechos reservados</span>
              <span>Construido con ❤️ para los administradores de Panamá 🇵🇦</span>
            </div>
          </footer>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REGISTRO
      ══════════════════════════════════════════════════════════════════════ */}
      {vista === "registro" && (
        <div className="form-page">
          <div className="form-box">
            <button className="back-btn" onClick={() => setVista("inicio")}>← Volver al inicio</button>
            <div className="form-card">
              <h2 className="form-h">Crear cuenta gratis</h2>
              <p className="form-sub">Empieza en minutos. Sin tarjeta de crédito.</p>
              <div className="type-toggle">
                {[
                  { val: "ph_admin",      label: "🏗️ Soy PH" },
                  { val: "empresa",       label: "🏢 Soy Empresa" },
                  { val: "copropietario", label: "🏠 Copropietario" },
                ].map(t => (
                  <button key={t.val} className={`type-btn ${tipoUsuario === t.val ? "on" : "off"}`} onClick={() => setTipoUsuario(t.val)}>
                    {t.label}
                  </button>
                ))}
              </div>
              {tipoUsuario === "copropietario" && (
                <div className="info-badge">
                  🏠 Como copropietario tendrás acceso de <strong>solo lectura</strong>. El administrador de tu PH debe registrarte con este email para vincularte a tu edificio.
                </div>
              )}
              <div className="f-field">
                <label className="f-label">{tipoUsuario === "ph_admin" ? "Nombre del PH *" : tipoUsuario === "copropietario" ? "Tu nombre completo *" : "Nombre de la empresa *"}</label>
                <input className="f-input" name="nombre" type="text" value={form.nombre} onChange={handleChange}
                  placeholder={tipoUsuario === "ph_admin" ? "PH Torre Pacífica" : tipoUsuario === "copropietario" ? "Juan García" : "Servicios Generales S.A."} />
              </div>
              <div className="f-field">
                <label className="f-label">Email *</label>
                <input className="f-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="correo@empresa.com" />
              </div>
              <div className="f-field">
                <label className="f-label">Contraseña * (mínimo 6 caracteres)</label>
                <input className="f-input" name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" />
              </div>
              <div className="f-field">
                <label className="f-label">Teléfono (opcional)</label>
                <input className="f-input" name="telefono" type="tel" value={form.telefono} onChange={handleChange} placeholder="+507 6000-0000" />
              </div>
              {mensaje && <div className={mensaje.includes("✅") ? "a-ok" : "a-err"}>{mensaje}</div>}
              <button className="f-submit" onClick={registrar} disabled={cargando}>
                {cargando ? "Creando cuenta..." : "Crear cuenta gratis →"}
              </button>
              <p className="f-foot">¿Ya tienes cuenta? <span className="f-switch" onClick={() => { setVista("login"); setMensaje(""); }}>Inicia sesión</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LOGIN
      ══════════════════════════════════════════════════════════════════════ */}
      {vista === "login" && (
        <div className="form-page">
          <div className="form-box">
            <button className="back-btn" onClick={() => setVista("inicio")}>← Volver al inicio</button>
            <div className="form-card">
              <h2 className="form-h">Bienvenido de vuelta</h2>
              <p className="form-sub">Accede a tu cuenta de LicitaPH.</p>
              <div className="f-field">
                <label className="f-label">Email</label>
                <input className="f-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="correo@empresa.com" />
              </div>
              <div className="f-field">
                <label className="f-label">Contraseña</label>
                <input className="f-input" name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••"
                  onKeyDown={e => { if (e.key === "Enter") login(); }} />
              </div>
              {mensaje && <div className={mensaje.includes("✅") ? "a-ok" : "a-err"}>{mensaje}</div>}
              <button className="f-submit" onClick={login} disabled={cargando}>
                {cargando ? "Iniciando sesión..." : "Entrar →"}
              </button>
              <p className="f-foot">¿No tienes cuenta? <span className="f-switch" onClick={() => { setVista("registro"); setMensaje(""); }}>Regístrate gratis</span></p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
