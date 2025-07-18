import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APIQ - Multi-API Orchestrator",
  description: "AI-powered workflow automation across multiple APIs",
  keywords: ["API", "orchestrator", "workflow", "automation", "AI", "OpenAI"],
  authors: [{ name: "APIQ Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {/* Global ARIA live region for announcements */}
        <div id="aria-live-announcements" aria-live="assertive" aria-atomic="true" className="sr-only"></div>
        <div id="aria-live-polite" aria-live="polite" aria-atomic="true" className="sr-only"></div>
        {children}
      </body>
    </html>
  );
}
