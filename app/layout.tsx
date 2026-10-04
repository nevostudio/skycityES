import type { Metadata } from "next";
import { appUrl } from "@/lib/config";
import "./globals.css";
import "./immersive.css";
export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "SkyCity — Put your brand on the map.",
    template: "%s · SkyCity",
  },
  description:
    "A city of possibilities. Explore a living virtual city, claim a building, and give your brand a place on the map.",
  openGraph: {
    title: "SkyCity — Put your brand on the map.",
    description: "A little corner of the internet, made yours.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
