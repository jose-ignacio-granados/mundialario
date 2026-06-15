import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PageTransition from "@/components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mundialario | Juego de Predicciones del Mundial de Fútbol",
  description: "¡La plataforma de predicciones definitiva para el Mundial de Fútbol! Pronostica los marcadores de los partidos, crea ligas privadas con tus amigos, compite en tiempo real y demuestra quién es el verdadero experto de fútbol.",
  keywords: [
    "mundialario",
    "predicciones mundial",
    "predicciones de futbol",
    "pronosticos mundial",
    "mundial 2026",
    "juego de predicciones",
    "tabla de posiciones",
    "ligas de amigos",
    "polla mundial",
    "prode futbol"
  ],
  authors: [{ name: "BreinakosLab" }],
  openGraph: {
    title: "Mundialario | Predicciones del Mundial de Fútbol 2026",
    description: "Pronostica los marcadores de los partidos, crea ligas privadas con tus amigos y compite por ser el máximo experto del Mundial.",
    url: "https://mundialario.vercel.app",
    siteName: "Mundialario",
    images: [
      {
        url: "/mudialario.png",
        width: 1200,
        height: 630,
        alt: "Mundialario - Predicciones del Mundial de Fútbol",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mundialario | Predicciones del Mundial de Fútbol 2026",
    description: "Pronostica los marcadores de los partidos, crea ligas privadas con tus amigos y compite por ser el máximo experto del Mundial.",
    images: ["/mudialario.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden max-w-full w-full`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden max-w-full w-full">
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
