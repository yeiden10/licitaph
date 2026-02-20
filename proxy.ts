import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Rutas protegidas de PH admin
  if (pathname.startsWith("/ph")) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const tipo = user.user_metadata?.tipo_usuario;
    if (tipo !== "ph_admin" && tipo !== "superadmin") {
      return NextResponse.redirect(new URL("/empresa", request.url));
    }
  }

  // Rutas protegidas de empresa
  if (pathname.startsWith("/empresa")) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const tipo = user.user_metadata?.tipo_usuario;
    if (tipo !== "empresa" && tipo !== "superadmin") {
      return NextResponse.redirect(new URL("/ph", request.url));
    }
  }

  // Rutas de superadmin
  if (pathname.startsWith("/superadmin")) {
    if (!user || user.user_metadata?.tipo_usuario !== "superadmin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Portal público de licitación: siempre accesible
  // /licitacion/[slug] — no requiere auth

  return supabaseResponse;
}

export const config = {
  matcher: ["/ph/:path*", "/empresa/:path*", "/superadmin/:path*"],
};
