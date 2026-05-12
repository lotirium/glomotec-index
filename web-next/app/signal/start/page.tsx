import type { Metadata } from "next";
import { OperatorOnboarding } from "@/components/signal/operator-onboarding";

export const metadata: Metadata = {
  title: "SIGNAL · Begin qualification",
  description:
    "Tell us about yourself before SIGNAL begins qualification.",
};

export default function SignalStartPage() {
  return <OperatorOnboarding />;
}
