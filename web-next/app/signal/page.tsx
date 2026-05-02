import type { Metadata } from "next";
import { SignalLanding } from "@/components/signal/signal-landing";

export const metadata: Metadata = {
  title: "SIGNAL · prospect preview",
  description:
    "SIGNAL is glomotec's prospect-facing pre-qualification chat for the UK Innovator Founder route.",
};

export default function SignalLandingPage() {
  return <SignalLanding />;
}
