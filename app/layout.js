import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Limpieza de Filtros",
  description: "Sistema de gestión y consulta de turnos para limpieza de filtros industriales",
  
  // PWA Meta tags
  manifest: "/manifest.json",
  themeColor: "#10b981",
  
  // Viewport
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  
  // Apple Web App
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Limpieza de Filtros",
  },
  
  // Open Graph
  openGraph: {
    type: "website",
    title: "Limpieza de Filtros",
    description: "Sistema de gestión y consulta de turnos para limpieza de filtros industriales",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Limpieza de Filtros",
      },
    ],
  },
  
  // Twitter
  twitter: {
    card: "summary",
    title: "Limpieza de Filtros",
    description: "Sistema de gestión y consulta de turnos para limpieza de filtros industriales",
    images: ["/icons/icon-512x512.png"],
  },
  
  // Other meta tags
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "msapplication-TileImage": "/icons/icon-144x144.png",
    "msapplication-TileColor": "#10b981",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* Meta tags adicionales específicos para PWA */}
        <meta name="theme-color" content="#10b981" />
        <meta name="background-color" content="#f8fafc" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}