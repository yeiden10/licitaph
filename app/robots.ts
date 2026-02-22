import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/licitacion/", "/directorio"],
        disallow: ["/ph", "/empresa", "/superadmin", "/copropietario", "/api/"],
      },
    ],
    sitemap: "https://licitaph.vercel.app/sitemap.xml",
    host: "https://licitaph.vercel.app",
  };
}
