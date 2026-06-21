import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getOwnerOnboardingState } from "@/lib/owner-onboarding";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const onboarding = await getOwnerOnboardingState(supabase, data.user.id);

  const name =
    typeof data.user.user_metadata.full_name === "string"
      ? data.user.user_metadata.full_name
      : "Chủ nhà";

  return (
    <DashboardShell
      user={{
        email: data.user.email ?? "",
        name,
      }}
      onboardingRequired={!onboarding.complete}
    >
      {children}
    </DashboardShell>
  );
}
