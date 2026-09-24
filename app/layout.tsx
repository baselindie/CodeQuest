import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://basel-code-lab.baselindie.chatgpt.site"),
  title: "CodeQuest",
  description: "Aprende programación superando misiones y construyendo proyectos.",
  manifest: "/manifest.webmanifest?v=3",
  icons: { icon: "/icon.svg", shortcut: "/favicon.ico", apple: "/icon-180.png" },
  openGraph: {
    type: "website",
    locale: "es_EC",
    url: "/",
    siteName: "CodeQuest",
    title: "CodeQuest — aprende programación jugando",
    description: "Supera 131 misiones de HTML, CSS y JavaScript mientras construyes proyectos.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Icono de CodeQuest" }],
  },
  twitter: {
    card: "summary",
    title: "CodeQuest — aprende programación jugando",
    description: "Supera 131 misiones de HTML, CSS y JavaScript mientras construyes proyectos.",
    images: ["/icon-512.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><head>
    <meta name="theme-color" content="#090a0e"/><meta name="color-scheme" content="dark"/><meta name="referrer" content="strict-origin-when-cross-origin"/><meta name="mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-title" content="CodeQuest"/>
    <link rel="stylesheet" href="/app.css?v=53"/><link rel="stylesheet" href="/learning.css?v=53"/><link rel="stylesheet" href="/account.css?v=53"/><link rel="stylesheet" href="/install.css?v=53"/>
  </head><body>{children}</body></html>;
}
