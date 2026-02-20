"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PERFILES = {
  ninguno: {
    eyebrow: "La plataforma de licitaciones para Panamá 🇵🇦",
    titulo: ["Contrataciones más", "inteligentes,", "transparentes."],
    subtitulo: "Selecciona tu perfil para ver cómo LicitaPH trabaja para ti.",
    cta: "",
    color: "#C9A84C",
  },
  admin: {
    eyebrow: "Para administradores de PH",
    titulo: ["Gestiona contratos", "sin riesgo legal", "ni dolores de cabeza."],
    subtitulo: "Publica licitaciones en minutos, recibe propuestas de empresas verificadas y adjudica con respaldo documental completo. Tu junta directiva queda protegida.",
    cta: "Crear cuenta gratis →",
    color: "#C9A84C",
    beneficios: [
      { icon: "📋", titulo: "Proceso ordenado y documentado", desc: "Cada licitación genera un expediente completo. Si la junta te pregunta por qué elegiste ese proveedor, tienes todo listo." },
      { icon: "⏱️", titulo: "De semanas a horas", desc: "Lo que antes tomaba semanas de llamadas y cotizaciones informales, ahora se resuelve en 48 horas con propuestas comparables." },
      { icon: "💰", titulo: "Ahorra en cada contrato", desc: "La competencia real entre proveedores baja los precios un promedio de 18%. El ahorro queda documentado para reportar en asamblea." },
      { icon: "🛡️", titulo: "Protección ante auditorías", desc: "Todo el proceso queda registrado. Si algún copropietario cuestiona una contratación, tienes el expediente completo para responder." },
    ],
    stats: [
      { num: "18%", label: "Ahorro promedio" },
      { num: "48h", label: "Primer resultado" },
      { num: "100%", label: "Documentado" },
      { num: "0", label: "Llamadas informales" },
    ],
  },
  empresa: {
    eyebrow: "Para empresas proveedoras",
    titulo: ["Accede a contratos", "con PHs que antes", "no te conocían."],
    subtitulo: "Más de 4,500 PHs en Panamá contratan servicios regularmente. LicitaPH te pone frente a ellos con tus credenciales verificadas y tus mejores propuestas.",
    cta: "Registrar mi empresa →",
    color: "#4A9EFF",
    beneficios: [
      { icon: "🏗️", titulo: "Acceso a licitaciones activas", desc: "Recibe alertas de nuevas licitaciones según tu categoría — seguridad, limpieza, HVAC, ascensores, jardinería y más." },
      { icon: "🏆", titulo: "Compite en igualdad de condiciones", desc: "Las licitaciones son abiertas y evaluadas objetivamente. Tu propuesta se evalúa por precio, experiencia y credenciales — no por conexiones." },
      { icon: "⭐", titulo: "Construye tu reputación digital", desc: "Cada contrato cumplido suma a tu perfil verificado. Con el tiempo, tu historial es tu mayor ventaja competitiva." },
      { icon: "📈", titulo: "Crece tu cartera de clientes PH", desc: "Un contrato bien ejecutado se convierte en referencia para otros PHs en la plataforma. El boca a boca digital trabaja para ti." },
    ],
    stats: [
      { num: "4,500+", label: "PHs activos" },
      { num: "$50K+", label: "Contratos/año por PH" },
      { num: "6", label: "Categorías de servicio" },
      { num: "48h", label: "Tiempo de respuesta" },
    ],
  },
  copropietario: {
    eyebrow: "Para copropietarios",
    titulo: ["Sabe exactamente", "en qué se gasta", "tu cuota."],
    subtitulo: "LicitaPH le da a tu PH las herramientas para contratar con transparencia. Tú puedes ver el proceso, las propuestas y el resultado de cada licitación.",
    cta: "Pedir LicitaPH para mi PH →",
    color: "#4ADE80",
    beneficios: [
      { icon: "👁️", titulo: "Visibilidad total del proceso", desc: "Ve qué empresas aplicaron, qué propusieron y por qué ganó la seleccionada. Sin secretos, sin información reservada." },
      { icon: "💰", titulo: "Ahorro real y comprobable", desc: "Cada contrato adjudicado muestra el ahorro vs. precio de mercado. Sabes exactamente cuánto dinero se optimizó en tu nombre." },
      { icon: "📁", titulo: "Historial permanente", desc: "Todos los contratos quedan archivados. Puedes revisar cualquier contratación pasada en cualquier momento." },
      { icon: "🗳️", titulo: "Información para la asamblea", desc: "Recibe un resumen mensual de contrataciones y ahorros. Llega a la asamblea informado y con datos concretos." },
    ],
    stats: [
      { num: "18%", label: "Ahorro promedio" },
      { num: "0", label: "Negociados" },
      { num: "24/7", label: "Acceso a información" },
      { num: "100%", label: "Auditable" },
    ],
  },
};

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [perfil, setPerfil] = useState("ninguno");
  const [vista, setVista] = useState("inicio");
  const [tipoUsuario, setTipoUsuario] = useState("empresa");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", telefono: "" });

  const p = PERFILES[perfil as keyof typeof PERFILES];
  const pa = PERFILES.admin;
  const pe = PERFILES.empresa;
  const pc = PERFILES.copropietario;

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

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
        setMensaje("⚠️ Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada (y spam).");
      } else if (error.message.toLowerCase().includes("invalid login credentials") || error.message.toLowerCase().includes("invalid_credentials")) {
        setMensaje("❌ Email o contraseña incorrectos. Verifica tus datos.");
      } else {
        setMensaje("❌ " + error.message);
      }
      return;
    }
    const tipo = data.user?.user_metadata?.tipo_usuario;
    setMensaje("✅ ¡Bienvenido! Iniciando sesión...");
    setTimeout(() => { router.replace(tipo === "empresa" ? "/empresa" : "/ph"); }, 800);
  };

  const accentColor = perfil === "empresa" ? "#4A9EFF" : perfil === "copropietario" ? "#4ADE80" : "#C9A84C";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #07090F; --bg2: #0D1117; --bg3: #131920;
          --border: rgba(255,255,255,0.06); --border2: rgba(255,255,255,0.1);
          --text: #F0F4FF; --text2: #8896AA; --text3: #3D4A5C;
          --gold: #C9A84C; --blue: #4A9EFF; --green: #4ADE80;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; overflow-x: hidden; -webkit-font-smoothing: antialiased; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.03); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        .bg-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .orb { position: absolute; border-radius: 50%; filter: blur(100px); animation: pulse 8s ease-in-out infinite; }
        .orb-1 { width: 800px; height: 800px; top: -300px; right: -200px; background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%); }
        .orb-2 { width: 600px; height: 600px; bottom: -200px; left: -200px; background: radial-gradient(circle, rgba(74,158,255,0.06) 0%, transparent 65%); animation-delay: 4s; }
        .grid { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px); background-size: 56px 56px; mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%); }

        /* NAV */
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; height: 64px; padding: 0 40px; display: flex; align-items: center; justify-content: space-between; background: rgba(7,9,15,0.8); backdrop-filter: blur(20px) saturate(180%); border-bottom: 1px solid var(--border); }
        .nav-logo { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 6px; }
        .nav-logo-main { color: var(--gold); }
        .nav-logo-ph { color: var(--text); }
        .nav-badge { font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 3px; background: var(--gold); color: var(--bg); font-family: 'DM Mono', monospace; letter-spacing: 1px; text-transform: uppercase; }
        .nav-right { display: flex; align-items: center; gap: 8px; }
        .nav-btn-ghost { padding: 7px 16px; border-radius: 7px; background: transparent; border: 1px solid var(--border2); color: var(--text2); font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.18s; }
        .nav-btn-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }
        .nav-btn-solid { padding: 7px 18px; border-radius: 7px; background: var(--gold); border: none; color: #07090F; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.18s; }
        .nav-btn-solid:hover { background: #DDB95A; transform: translateY(-1px); }

        /* HERO */
        .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 24px 60px; position: relative; z-index: 1; text-align: center; }

        .profile-selector { display: flex; gap: 6px; padding: 5px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 52px; animation: fadeUp 0.6s ease both; }
        .profile-btn { padding: 9px 20px; border-radius: 10px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; display: flex; align-items: center; gap: 7px; white-space: nowrap; }
        .profile-btn.inactive { background: transparent; color: var(--text2); }
        .profile-btn.inactive:hover { color: var(--text); background: rgba(255,255,255,0.04); }
        .profile-btn.active-admin { background: rgba(201,168,76,0.12); color: #E8C96A; border: 1px solid rgba(201,168,76,0.25) !important; }
        .profile-btn.active-empresa { background: rgba(74,158,255,0.1); color: #7BB8FF; border: 1px solid rgba(74,158,255,0.25) !important; }
        .profile-btn.active-copropietario { background: rgba(74,222,128,0.08); color: #6FEBB8; border: 1px solid rgba(74,222,128,0.2) !important; }

        .hero-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; justify-content: center; animation: fadeUp 0.6s ease 0.05s both; transition: color 0.4s; }
        .eyebrow-line { width: 20px; height: 1px; }

        .hero-h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(36px, 5.5vw, 68px); font-weight: 800; line-height: 1.08; letter-spacing: -1.5px; margin-bottom: 22px; animation: fadeUp 0.6s ease 0.1s both; }
        .hero-h1 .line2 { display: block; }
        .hero-sub { font-size: clamp(15px, 1.6vw, 17px); color: var(--text2); line-height: 1.75; max-width: 540px; margin: 0 auto 40px; animation: fadeUp 0.6s ease 0.15s both; transition: all 0.3s; }

        .hero-cta-wrap { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 52px; animation: fadeUp 0.6s ease 0.2s both; }
        .hero-cta-main { padding: 13px 28px; border-radius: 10px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; display: flex; align-items: center; gap: 7px; }
        .hero-cta-main:hover { transform: translateY(-2px); }
        .hero-cta-ghost { padding: 13px 28px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--border2); color: var(--text2); font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
        .hero-cta-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.18); }

        /* STATS */
        .stats-row { display: flex; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: rgba(255,255,255,0.02); animation: fadeUp 0.6s ease 0.25s both; }
        .stat { padding: 18px 32px; text-align: center; position: relative; transition: all 0.3s; }
        .stat:not(:last-child)::after { content: ''; position: absolute; right: 0; top: 18%; bottom: 18%; width: 1px; background: var(--border); }
        .stat-n { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px; font-weight: 800; line-height: 1; margin-bottom: 4px; transition: color 0.3s; }
        .stat-l { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 1.5px; }

        /* BENEFITS — dynamic section */
        .benefits-section { position: relative; z-index: 1; padding: 80px 24px; max-width: 1080px; margin: 0 auto; animation: slideIn 0.5s ease both; }
        .benefits-header { margin-bottom: 48px; }
        .section-tag { font-size: 11px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .section-tag::before { content: ''; display: block; width: 20px; height: 1px; }
        .benefits-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(24px, 3vw, 38px); font-weight: 800; letter-spacing: -0.8px; line-height: 1.15; }
        .benefits-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .benefit-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 28px; display: flex; gap: 18px; transition: all 0.25s; }
        .benefit-card:hover { border-color: rgba(255,255,255,0.1); transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
        .benefit-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .benefit-body strong { display: block; font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .benefit-body p { font-size: 13px; color: var(--text2); line-height: 1.7; }

        /* HOW */
        .how-section { position: relative; z-index: 1; padding: 80px 24px; background: linear-gradient(180deg, transparent, rgba(255,255,255,0.01) 50%, transparent); }
        .how-inner { max-width: 1080px; margin: 0 auto; }
        .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 48px; }
        .step { padding: 28px 22px; background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; transition: all 0.25s; }
        .step:hover { border-color: rgba(255,255,255,0.1); transform: translateY(-3px); }
        .step-n { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; margin-bottom: 16px; }
        .step-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
        .step-desc { font-size: 13px; color: var(--text2); line-height: 1.65; }

        /* SOCIAL PROOF */
        .proof-section { position: relative; z-index: 1; padding: 80px 24px; max-width: 1080px; margin: 0 auto; }
        .proof-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 48px; }
        .proof-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 28px; }
        .proof-quote { font-size: 14px; color: var(--text2); line-height: 1.75; margin-bottom: 20px; font-style: italic; }
        .proof-author { display: flex; align-items: center; gap: 12px; }
        .proof-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; flex-shrink: 0; }
        .proof-name { font-size: 13px; font-weight: 600; color: var(--text); }
        .proof-role { font-size: 11px; color: var(--text3); margin-top: 1px; }

        /* CTA FINAL */
        .cta-final { position: relative; z-index: 1; padding: 80px 24px 100px; text-align: center; }
        .cta-box { max-width: 640px; margin: 0 auto; border-radius: 24px; padding: 60px 44px; position: relative; overflow: hidden; }
        .cta-box::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: conic-gradient(from 0deg, transparent 70%, rgba(201,168,76,0.04) 80%, transparent 90%); animation: spin 25s linear infinite; }
        .cta-box-inner { position: relative; z-index: 1; }
        .cta-box h2 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(24px, 3vw, 36px); font-weight: 800; letter-spacing: -0.8px; line-height: 1.2; margin-bottom: 14px; }
        .cta-box p { font-size: 15px; color: var(--text2); line-height: 1.75; margin-bottom: 32px; }

        /* FOOTER */
        .footer { position: relative; z-index: 1; border-top: 1px solid var(--border); padding: 24px 40px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text3); }

        /* FORM */
        .form-wrap { min-height: 100vh; display: flex; flex-direction: column; position: relative; z-index: 1; padding: 90px 24px 60px; }
        .form-box { max-width: 440px; width: 100%; margin: 0 auto; animation: fadeUp 0.4s ease both; }
        .back { background: none; border: none; color: var(--text2); cursor: pointer; font-size: 13px; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 5px; margin-bottom: 28px; padding: 0; transition: color 0.15s; }
        .back:hover { color: var(--text); }
        .form-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 18px; padding: 36px; position: relative; overflow: hidden; }
        .form-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: 0.35; }
        .form-h { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px; font-weight: 800; letter-spacing: -0.4px; margin-bottom: 5px; }
        .form-p { font-size: 13px; color: var(--text2); margin-bottom: 28px; line-height: 1.6; }
        .toggle { display: flex; gap: 6px; margin-bottom: 24px; padding: 4px; background: rgba(255,255,255,0.03); border-radius: 10px; }
        .toggle-btn { flex: 1; padding: 9px; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.18s; text-align: center; border: none; }
        .toggle-btn.on { background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.3) !important; color: #E8C96A; }
        .toggle-btn.off { background: transparent; color: var(--text3); }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 7px; }
        .field input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 9px; padding: 11px 14px; font-size: 14px; color: var(--text); font-family: 'Inter', sans-serif; transition: all 0.18s; outline: none; }
        .field input:focus { border-color: var(--gold); background: rgba(201,168,76,0.03); box-shadow: 0 0 0 3px rgba(201,168,76,0.07); }
        .field input::placeholder { color: var(--text3); }
        .alert { padding: 11px 14px; border-radius: 9px; font-size: 13px; line-height: 1.5; margin-bottom: 16px; }
        .alert.ok { background: rgba(74,222,128,0.07); border: 1px solid rgba(74,222,128,0.18); color: #4ADE80; }
        .alert.err { background: rgba(248,113,113,0.07); border: 1px solid rgba(248,113,113,0.18); color: #F87171; }
        .form-submit { width: 100%; padding: 13px; border-radius: 9px; background: var(--gold); border: none; color: #07090F; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; margin-bottom: 18px; }
        .form-submit:hover:not(:disabled) { background: #DDB95A; transform: translateY(-1px); }
        .form-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .form-foot { text-align: center; font-size: 13px; color: var(--text2); }
        .form-link { cursor: pointer; font-weight: 600; }

        @media (max-width: 768px) {
          .nav { padding: 0 18px; }
          .profile-selector { flex-wrap: wrap; }
          .stats-row { flex-wrap: wrap; }
          .stat:not(:last-child)::after { display: none; }
          .benefits-grid { grid-template-columns: 1fr; }
          .steps { grid-template-columns: 1fr 1fr; }
          .proof-grid { grid-template-columns: 1fr; }
          .footer { flex-direction: column; gap: 8px; }
          .cta-box { padding: 40px 24px; }
        }
      `}</style>

      <div className="bg-orbs">
        <div className="orb orb-1" /><div className="orb orb-2" />
      </div>
      <div className="grid" />

      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">
          <span className="nav-logo-main">Licita</span>
          <span className="nav-logo-ph">PH</span>
          <span className="nav-badge">BETA</span>
        </div>
        <div className="nav-right">
          <button className="nav-btn-ghost" onClick={() => { setVista("login"); setMensaje(""); }}>Iniciar sesión</button>
          <button className="nav-btn-solid" onClick={() => { setVista("registro"); setMensaje(""); }}>Registrarse →</button>
        </div>
      </nav>

      {vista === "inicio" && (
        <>
          {/* HERO */}
          <section className="hero">
            {/* Selector de perfil */}
            <div className="profile-selector">
              {[
                { key: "admin", emoji: "🏗️", label: "Administrador de PH" },
                { key: "empresa", emoji: "🏢", label: "Empresa proveedora" },
                { key: "copropietario", emoji: "🏠", label: "Copropietario" },
              ].map(opt => {
                const isActive = perfil === opt.key;
                const activeClass = isActive ? `active-${opt.key}` : "inactive";
                return (
                  <button key={opt.key} className={`profile-btn ${activeClass}`} onClick={() => setPerfil(opt.key)}>
                    {opt.emoji} {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Eyebrow */}
            <div className="hero-eyebrow" style={{ color: accentColor }}>
              <span className="eyebrow-line" style={{ background: accentColor }} />
              {p.eyebrow}
              <span className="eyebrow-line" style={{ background: accentColor }} />
            </div>

            {/* Título dinámico */}
            <h1 className="hero-h1" key={perfil}>
              {(p as any).titulo[0]}{" "}
              <span style={{ color: accentColor }}>{(p as any).titulo[1]}</span>
              {(p as any).titulo[2] && <><br />{(p as any).titulo[2]}</>}
            </h1>

            {/* Subtítulo */}
            <p className="hero-sub" key={perfil + "sub"}>{p.subtitulo}</p>

            {/* CTAs */}
            <div className="hero-cta-wrap">
              {perfil !== "ninguno" && (
                <button
                  className="hero-cta-main"
                  style={{ background: accentColor, color: "#07090F", boxShadow: `0 8px 28px ${accentColor}30` }}
                  onClick={() => {
                    setTipoUsuario(perfil === "admin" ? "ph_admin" : "empresa");
                    setVista("registro");
                    setMensaje("");
                  }}
                >
                  {(p as any).cta}
                </button>
              )}
              <button className="hero-cta-ghost" onClick={() => { setVista("registro"); setMensaje(""); }}>
                {perfil === "ninguno" ? "Crear cuenta gratis →" : "Ver demo"}
              </button>
            </div>

            {/* Stats dinámicos */}
            {perfil !== "ninguno" && (
              <div className="stats-row" key={perfil + "stats"}>
                {((p as any).stats || []).map((s: any) => (
                  <div className="stat" key={s.label}>
                    <div className="stat-n" style={{ color: accentColor }}>{s.num}</div>
                    <div className="stat-l">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {perfil === "ninguno" && (
              <div className="stats-row">
                {[{ num: "4,500+", label: "PHs en Panamá" }, { num: "18%", label: "Ahorro promedio" }, { num: "3", label: "Tipos de usuario" }, { num: "100%", label: "Digital" }].map(s => (
                  <div className="stat" key={s.label}>
                    <div className="stat-n" style={{ color: "#C9A84C" }}>{s.num}</div>
                    <div className="stat-l">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* BENEFICIOS DINÁMICOS */}
          {perfil !== "ninguno" && (
            <section className="benefits-section" key={perfil + "ben"}>
              <div className="benefits-header">
                <div className="section-tag" style={{ color: accentColor }}>
                  <span style={{ display: "block", width: 20, height: 1, background: accentColor }} />
                  {perfil === "admin" ? "Por qué LicitaPH" : perfil === "empresa" ? "Tu ventaja competitiva" : "Lo que puedes ver"}
                </div>
                <h2 className="benefits-title">
                  {perfil === "admin" && <>Todo lo que necesita un<br />buen administrador</>}
                  {perfil === "empresa" && <>Más contratos, menos<br />tiempo en ventas</>}
                  {perfil === "copropietario" && <>Tu PH, con cuentas<br />claras y abiertas</>}
                </h2>
              </div>
              <div className="benefits-grid">
                {((p as any).beneficios || []).map((b: any) => (
                  <div className="benefit-card" key={b.titulo}>
                    <div className="benefit-icon" style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}25` }}>
                      {b.icon}
                    </div>
                    <div className="benefit-body">
                      <strong>{b.titulo}</strong>
                      <p>{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CÓMO FUNCIONA */}
          <div className="how-section">
            <div className="how-inner">
              <div className="section-tag" style={{ color: accentColor }}>
                <span style={{ display: "block", width: 20, height: 1, background: accentColor }} />
                Cómo funciona
              </div>
              <h2 className="benefits-title">
                {perfil === "empresa" ? "Tu camino del registro al contrato" : "De la licitación al contrato firmado"}
              </h2>
              <div className="steps">
                {(perfil === "empresa" ? [
                  { n: "01", title: "Regístrate y verifica", desc: "Sube tus documentos una vez. Los PHs los ven en todas tus propuestas." },
                  { n: "02", title: "Recibe alertas", desc: "Te notificamos cuando haya licitaciones en tu categoría de servicio." },
                  { n: "03", title: "Envía tu propuesta", desc: "Precio, metodología y credenciales en un formulario guiado. Menos de 20 minutos." },
                  { n: "04", title: "Gana y ejecuta", desc: "Si eres seleccionado, firmamos el contrato en la plataforma. Tu reputación crece con cada contrato cumplido." },
                ] : [
                  { n: "01", title: "Publica la licitación", desc: "La IA sugiere los requisitos correctos según el tipo de servicio. Listo en minutos." },
                  { n: "02", title: "Empresas aplican", desc: "Empresas verificadas envían propuestas con todos sus documentos en regla." },
                  { n: "03", title: "IA evalúa y rankea", desc: "El sistema puntúa objetivamente. Ves el ranking con justificación detallada." },
                  { n: "04", title: "Adjudica con respaldo", desc: "La decisión queda documentada y los copropietarios pueden consultarla." },
                ]).map(s => (
                  <div className="step" key={s.n}>
                    <div className="step-n" style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}25` }}>{s.n}</div>
                    <div className="step-title">{s.title}</div>
                    <div className="step-desc">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TESTIMONIOS */}
          <section className="proof-section">
            <div className="section-tag" style={{ color: accentColor }}>
              <span style={{ display: "block", width: 20, height: 1, background: accentColor }} />
              Casos de uso
            </div>
            <h2 className="benefits-title">Lo que dicen los primeros usuarios</h2>
            <div className="proof-grid">
              {[
                { quote: "Antes tardábamos 3 semanas en conseguir cotizaciones. Ahora en 48 horas tenemos 4 propuestas comparables y toda la documentación verificada.", name: "María González", role: "Administradora · PH Costa del Este", color: "#C9A84C", initial: "M" },
                { quote: "Ganamos 2 contratos el primer mes. Lo que más valoro es que el proceso es transparente — si no ganamos, sabemos exactamente por qué.", name: "Carlos Ramos", role: "Director · SecuroPanamá S.A.", color: "#4A9EFF", initial: "C" },
                { quote: "Por fin puedo ver en qué se gasta la cuota. En la última asamblea presenté el reporte de LicitaPH y todos los copropietarios quedaron satisfechos.", name: "Ana Díaz", role: "Copropietaria · PH Punta Pacífica", color: "#4ADE80", initial: "A" },
              ].map(t => (
                <div className="proof-card" key={t.name}>
                  <p className="proof-quote">"{t.quote}"</p>
                  <div className="proof-author">
                    <div className="proof-avatar" style={{ background: `${t.color}20`, color: t.color }}>{t.initial}</div>
                    <div>
                      <div className="proof-name">{t.name}</div>
                      <div className="proof-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA FINAL */}
          <section className="cta-final">
            <div className="cta-box" style={{ background: `linear-gradient(135deg, ${accentColor}0D, ${accentColor}04)`, border: `1px solid ${accentColor}30` }}>
              <div className="cta-box-inner">
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase", color: accentColor, marginBottom: 14 }}>
                  Empieza gratis hoy
                </div>
                <h2 className="cta-box h2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.8px", lineHeight: 1.2, marginBottom: 14 }}>
                  {perfil === "empresa" ? <>Tu próximo contrato<br />está esperándote.</> : perfil === "copropietario" ? <>Pídele a tu PH que<br />adopte LicitaPH.</> : <>Moderniza la gestión<br />de tu PH hoy.</>}
                </h2>
                <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.75, marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
                  {perfil === "empresa" ? "Regístrate gratis. Verifica tus documentos una vez y aplica a todas las licitaciones que quieras." : "Sin tarjeta de crédito. Los primeros 3 meses son completamente gratis para tu PH."}
                </p>
                <button
                  className="hero-cta-main"
                  style={{ background: accentColor, color: "#07090F", margin: "0 auto", display: "flex", padding: "13px 28px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif", gap: 7, boxShadow: `0 8px 28px ${accentColor}30` }}
                  onClick={() => { setVista("registro"); setMensaje(""); }}
                >
                  {perfil === "empresa" ? "Registrar mi empresa →" : "Crear cuenta gratis →"}
                </button>
              </div>
            </div>
          </section>

          <footer className="footer">
            <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 700, fontSize: 16 }}>
              <span style={{ color: "var(--gold)" }}>Licita</span><span style={{ color: "var(--text3)" }}>PH</span>
            </div>
            <div>© 2025 LicitaPH · Ciudad de Panamá · soporte@licitaph.com</div>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ cursor: "pointer" }}>Términos</span>
              <span style={{ cursor: "pointer" }}>Privacidad</span>
            </div>
          </footer>
        </>
      )}

      {/* REGISTRO */}
      {vista === "registro" && (
        <div className="form-wrap">
          <div className="form-box">
            <button className="back" onClick={() => setVista("inicio")}>← Volver</button>
            <div className="form-card">
              <h2 className="form-h">Crear cuenta</h2>
              <p className="form-p">Gratis los primeros 3 meses. Sin tarjeta de crédito.</p>
              <div className="toggle">
                {[{ val: "ph_admin", label: "🏗️ Soy PH" }, { val: "empresa", label: "🏢 Soy Empresa" }].map(t => (
                  <button key={t.val} className={`toggle-btn ${tipoUsuario === t.val ? "on" : "off"}`} onClick={() => setTipoUsuario(t.val)}>{t.label}</button>
                ))}
              </div>
              {[
                { name: "nombre", label: tipoUsuario === "ph_admin" ? "Nombre del PH *" : "Nombre de la empresa *", type: "text", placeholder: tipoUsuario === "ph_admin" ? "PH Torre Pacífica" : "Tu empresa S.A." },
                { name: "email", label: "Email *", type: "email", placeholder: "correo@empresa.com" },
                { name: "password", label: "Contraseña * (mínimo 6 caracteres)", type: "password", placeholder: "••••••••" },
                { name: "telefono", label: "Teléfono (opcional)", type: "tel", placeholder: "+507 6000-0000" },
              ].map(campo => (
                <div className="field" key={campo.name}>
                  <label>{campo.label}</label>
                  <input name={campo.name} type={campo.type} value={form[campo.name as keyof typeof form]} onChange={handleChange} placeholder={campo.placeholder} />
                </div>
              ))}
              {mensaje && <div className={`alert ${mensaje.includes("✅") ? "ok" : "err"}`}>{mensaje}</div>}
              <button className="form-submit" onClick={registrar} disabled={cargando}>{cargando ? "Creando cuenta..." : "Crear cuenta gratis →"}</button>
              <p className="form-foot">¿Ya tienes cuenta? <span className="form-link" style={{ color: "var(--gold)" }} onClick={() => { setVista("login"); setMensaje(""); }}>Inicia sesión</span></p>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN */}
      {vista === "login" && (
        <div className="form-wrap">
          <div className="form-box">
            <button className="back" onClick={() => setVista("inicio")}>← Volver</button>
            <div className="form-card">
              <h2 className="form-h">Bienvenido de vuelta</h2>
              <p className="form-p">Accede a tu cuenta de LicitaPH</p>
              {[
                { name: "email", label: "Email", type: "email", placeholder: "correo@empresa.com" },
                { name: "password", label: "Contraseña", type: "password", placeholder: "••••••••" },
              ].map(campo => (
                <div className="field" key={campo.name}>
                  <label>{campo.label}</label>
                  <input name={campo.name} type={campo.type} value={form[campo.name as keyof typeof form]} onChange={handleChange} placeholder={campo.placeholder} />
                </div>
              ))}
              {mensaje && <div className={`alert ${mensaje.includes("✅") ? "ok" : "err"}`}>{mensaje}</div>}
              <button className="form-submit" onClick={login} disabled={cargando}>{cargando ? "Iniciando sesión..." : "Entrar →"}</button>
              <p className="form-foot">¿No tienes cuenta? <span className="form-link" style={{ color: "var(--gold)" }} onClick={() => { setVista("registro"); setMensaje(""); }}>Regístrate gratis</span></p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}