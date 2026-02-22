import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = "https://licitaph.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/directorio`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Dynamic licitacion pages
  try {
    const supabase = await createClient();
    const { data: licitaciones } = await supabase
      .from("licitaciones")
      .select("url_slug, creado_en, estado")
      .not("url_slug", "is", null)
      .in("estado", ["activa", "en_evaluacion", "adjudicada"])
      .order("creado_en", { ascending: false });

    const licitacionPages: MetadataRoute.Sitemap = (licitaciones ?? [])
      .filter((l) => l.url_slug)
      .map((l) => ({
        url: `${BASE_URL}/licitacion/${l.url_slug}`,
        lastModified: new Date(l.creado_en),
        changeFrequency: l.estado === "activa" ? ("daily" as const) : ("monthly" as const),
        priority: l.estado === "activa" ? 0.9 : 0.6,
      }));

    return [...staticPages, ...licitacionPages];
  } catch {
    // If Supabase fails, return only static pages
    return staticPages;
  }
}
