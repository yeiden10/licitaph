import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LicitaPH — Licitaciones digitales para Propiedades Horizontales en Panamá",
  description: "Publica licitaciones, recibe propuestas de empresas verificadas y adjudica contratos con respaldo legal completo. La plataforma #1 de contrataciones para PHs en Panamá.",
  keywords: "licitaciones Panama, propiedades horizontales Panama, contrataciones PH, licitaciones edificios Panama, administrador PH, empresas proveedoras Panama",
  authors: [{ name: "LicitaPH" }],
  openGraph: {
    title: "LicitaPH — Contrata mejor. Gasta menos. Sin conflictos.",
    description: "Digitaliza la contratación de tu Propiedad Horizontal. Licitaciones transparentes, empresas verificadas, contratos con respaldo legal.",
    url: "https://licitaph.vercel.app",
    siteName: "LicitaPH",
    locale: "es_PA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LicitaPH — Licitaciones para PHs en Panamá",
    description: "Publica una licitación en 5 minutos. Recibe propuestas de empresas verificadas. Adjudica con respaldo legal completo.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏗️</text></svg>" />
        <meta name="theme-color" content="#07090F" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#07090F" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "LicitaPH",
              url: "https://licitaph.vercel.app",
              logo: "https://licitaph.vercel.app/favicon.ico",
              description: "Plataforma de licitaciones digitales para Propiedades Horizontales en Panamá. Transparencia total, empresas verificadas y contratos con respaldo legal.",
              address: {
                "@type": "PostalAddress",
                addressCountry: "PA",
                addressLocality: "Ciudad de Panamá",
              },
              areaServed: {
                "@type": "Country",
                name: "Panamá",
              },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                availableLanguage: "Spanish",
              },
              sameAs: [
                "https://licitaph.vercel.app",
              ],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
