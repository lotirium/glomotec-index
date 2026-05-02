import type { Metadata } from "next";
import { SignalSessionView } from "@/components/signal/signal-session-view";

export const metadata: Metadata = {
  title: "SIGNAL conversation",
};

export default async function SignalSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SignalSessionView sessionId={id} />;
}
