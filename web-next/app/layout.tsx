import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Topbar } from "@/components/layout/topbar";
import { Footer } from "@/components/layout/footer";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Canonical public URL. Override at deploy time by setting
// INDEX_PUBLIC_URL on the Vercel project — the Vercel-built URL stays the
// working fallback, so any link that has already been forwarded continues
// to resolve.
const PUBLIC_URL =
  process.env.INDEX_PUBLIC_URL ?? "https://index-advisor.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_URL),
  title: {
    default: "glomotec · ENGINE · INDEX preview",
    template: "%s · glomotec · INDEX",
  },
  description:
    "INDEX is the regulatory and scoring layer of ENGINE. SIGNAL queries it for qualification. COMPASS consumes its outputs for execution.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F7FA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <Topbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <FeedbackWidget />
      </body>
    </html>
  );
}
