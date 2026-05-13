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
    "ATLAS is the visualisation surface of ENGINE. INDEX scores. SIGNAL qualifies. COMPASS executes. One common standard, multiple jurisdictions.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "glomotec · ATLAS preview",
    description:
      "A common standard for global mobility, visualised. Six rubrics, five regions, one engine.",
    type: "website",
    siteName: "glomotec",
  },
  twitter: {
    card: "summary_large_image",
    title: "glomotec · ATLAS preview",
    description:
      "A common standard for global mobility, visualised. Six rubrics, five regions, one engine.",
  },
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
