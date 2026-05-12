import { PageHeader } from "@/components/shared/page-header";
import { NewProfileForm } from "@/components/draft/new-profile-form";

export const metadata = { title: "Score a profile" };

export default function NewClientPage() {
  return (
    <>
      <PageHeader
        eyebrow="Score a profile"
        title="Run a profile through the scorer."
        description="Fill in what you know. Every field is optional. The profile is sent to the Claude API to score against all Innovator Founder criteria. Results stay in your browser."
      />
      <div className="container py-20 md:py-24 mx-auto md:max-w-[78%]">
        <NewProfileForm />
      </div>
    </>
  );
}
