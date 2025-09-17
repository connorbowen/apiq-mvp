import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import "./globals.css";
import SessionProvider from "../components/SessionProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "APIQ - AI-Powered API Orchestrator | Stop Writing API Code",
    template: "%s | APIQ - AI-Powered API Orchestrator"
  },
  description: "Stop writing API code. Connect any API in seconds, then describe what you want in plain English. APIQ automatically builds workflows, handles authentication, and orchestrates everything across multiple APIs.",
  keywords: [
    "API orchestrator",
    "API automation",
    "workflow automation",
    "AI API integration",
    "multi-API platform",
    "API workflow builder",
    "no-code API integration",
    "API management",
    "workflow automation tool",
    "API connector",
    "automation platform",
    "API integration platform",
    "workflow builder",
    "API orchestration",
    "business process automation"
  ],
  authors: [{ name: "APIQ Team" }],
  creator: "APIQ Team",
  publisher: "APIQ",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://apiq.co'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://apiq.co',
    siteName: 'APIQ',
    title: 'APIQ - AI-Powered API Orchestrator | Stop Writing API Code',
    description: 'Stop writing API code. Connect any API in seconds, then describe what you want in plain English. APIQ automatically builds workflows, handles authentication, and orchestrates everything.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'APIQ - AI-Powered API Orchestrator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'APIQ - AI-Powered API Orchestrator | Stop Writing API Code',
    description: 'Stop writing API code. Connect any API in seconds, then describe what you want in plain English. APIQ automatically builds workflows.',
    images: ['/og-image.png'],
    creator: '@apiq',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics - Only load in production, not in test environments */}
        {process.env.NODE_ENV === 'production' && !process.env.PLAYWRIGHT_TEST && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-BH42DH58GY"
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-BH42DH58GY');
              `}
            </Script>
          </>
        )}
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {/* Global ARIA live region for announcements */}
        <div id="aria-live-announcements" aria-live="assertive" aria-atomic="true" className="sr-only"></div>
        <div id="aria-live-polite" aria-live="polite" aria-atomic="true" className="sr-only"></div>
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
