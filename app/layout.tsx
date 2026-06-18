import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const businessPhone = "+5568999678343";
const mapUrl = "https://maps.app.goo.gl/aBFog7BSRxvbQS4k7";

const siteName = "Barbearia Carvalho - Sistema de Gestão";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: siteName,
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: "Sistema de gestão da Barbearia Carvalho com agendamento online, pagamentos, atendimento e perfil de clientes.",
  keywords: [
    "barbearia carvalho",
    "barbearia",
    "agendamento online",
    "sistema de gestão",
    "corte de cabelo",
    "barbeiro",
    "telefone da barbearia",
  ],
  authors: [{ name: "Barbearia Carvalho" }],
  creator: "Barbearia Carvalho",
  publisher: "Barbearia Carvalho",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName,
    title: siteName,
    description: "Sistema de gestão da Barbearia Carvalho com agendamento online e pagamentos via Pix.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Logo Barbearia Carvalho Sistema de Gestão",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: "Sistema de gestão da Barbearia Carvalho com agendamento online e pagamentos via Pix.",
    images: ["/opengraph-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
  category: "business",
};

export const viewport: Viewport = {
  themeColor: "#d4a017",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "BarberShop",
  name: siteName,
  url: appUrl,
  telephone: businessPhone,
  hasMap: mapUrl,
  image: `${appUrl}/opengraph-image.png`,
  sameAs: [mapUrl],
  priceRange: "$$",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        {children}
      </body>
    </html>
  );
}
