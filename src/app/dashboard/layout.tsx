import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
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
    >
      {children}
    </DashboardShell>
  );
}
