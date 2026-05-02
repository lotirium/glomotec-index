import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Topbar } from "@/components/layout/topbar";
import { Footer } from "@/components/layout/footer";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "glomotec INDEX · advisor preview",
    template: "%s · glomotec INDEX",
  },
  description:
    "Indexes UK Home Office caseworker guidance against live client profiles for immigration advisors.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f6fb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <Topbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <FeedbackWidget />
      </body>
    </html>
  );
}
