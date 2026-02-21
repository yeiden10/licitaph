/**
 * Script para crear usuario superadmin en Supabase
 * Uso: node scripts/create-superadmin.js <email> <password>
 * Ejemplo: node scripts/create-superadmin.js admin@licitaph.com MiPassword123!
 */

const email    = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Uso: node scripts/create-superadmin.js <email> <password>");
  process.exit(1);
}

const SUPABASE_URL      = "https://iamwobdseodeaacjavql.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbXdvYmRzZW9kZWFhY2phdnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDcxNTgsImV4cCI6MjA4NzAyMzE1OH0.bBHWDXtevbCIa6w0Wks_Zum_2lb3oAadk1lPWyfTWkI";

async function main() {
  // 1. Registrar el usuario con tipo superadmin
  const signUpRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        nombre_completo: "Super Admin",
        tipo_usuario: "superadmin",
      },
    }),
  });

  const signUpData = await signUpRes.json();

  if (!signUpRes.ok) {
    // Si ya existe, intentar actualizar sus metadatos
    if (signUpData.msg?.includes("already registered") || signUpData.code === "user_already_exists") {
      console.log("⚠️  El usuario ya existe. Para convertirlo en superadmin, ejecuta este SQL en Supabase:");
      console.log(`
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"tipo_usuario": "superadmin"}'::jsonb
WHERE email = '${email}';
      `);
      return;
    }
    console.error("❌ Error al crear usuario:", signUpData);
    process.exit(1);
  }

  const userId = signUpData.user?.id;
  console.log(`✅ Usuario superadmin creado exitosamente`);
  console.log(`   Email: ${email}`);
  console.log(`   ID: ${userId}`);
  console.log(`   tipo_usuario: superadmin`);
  console.log(``);
  console.log(`⚠️  IMPORTANTE: Confirma el email en Supabase Dashboard o ejecuta esto en SQL Editor:`);
  console.log(`UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = '${userId}';`);
  console.log(``);
  console.log(`🔗 Luego inicia sesión en: https://licitaph.vercel.app`);
}

main().catch(e => { console.error(e); process.exit(1); });
