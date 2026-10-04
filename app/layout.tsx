import type { Metadata } from "next";
import { appUrl } from "@/lib/config";
import "./globals.css";
import "./immersive.css";
export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "SkyCity — Construye tu marca en el mapa.",
    template: "%s · SkyCity",
  },
  description:
    "Una ciudad por construir. Elige un solar, levanta tu edificio desde 3 € y dale a tu marca un sitio en el mapa.",
  openGraph: {
    title: "SkyCity — Construye tu marca en el mapa.",
    description: "Un pequeño rincón de internet, construido para ti.",
    type: "website",
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
