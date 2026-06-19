import SettingsClient, {
  type SettingsInitialData,
} from "@/components/settings/SettingsClient";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const [accountResult, profileResult, identityResult, settingsResult] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("email, phone")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("owner_profiles")
        .select("id, full_name, date_of_birth, gender, hometown, permanent_address, bank_name, bank_account_number, bank_account_holder")
        .eq("account_id", user.id)
        .maybeSingle(),
      supabase
        .from("identity_documents")
        .select("id, document_number, issued_at, issued_by, front_image_path, back_image_path")
        .eq("account_id", user.id)
        .eq("owner_type", "owner")
        .maybeSingle(),
      supabase
        .from("account_preferences")
        .select("zalo_reminder, email_report, contract_expiry, overdue_payment")
        .eq("account_id", user.id)
        .maybeSingle(),
    ]);

  const settingsMissing =
    settingsResult.error?.code === "42P01" ||
    settingsResult.error?.code === "PGRST205";
  const error =
    accountResult.error ??
    profileResult.error ??
    identityResult.error ??
    (settingsMissing ? null : settingsResult.error);
  if (error) {
    return (
      <div className="glass rounded-2xl border border-red-500/20 p-6">
        <h2 className="font-semibold text-white">Không thể tải cài đặt</h2>
        <p className="mt-2 text-xs text-red-400">{error.message}</p>
      </div>
    );
  }

  const profile = profileResult.data;
  const identity = identityResult.data;
  const settings = settingsResult.data;
  const initialData: SettingsInitialData = {
    ownerProfileId: profile?.id ?? null,
    identityDocumentId: identity?.id ?? null,
    email: accountResult.data?.email ?? user.email ?? "",
    phone:
      accountResult.data?.phone ??
      (typeof user.user_metadata?.phone === "string"
        ? user.user_metadata.phone
        : ""),
    fullName:
      profile?.full_name ??
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : ""),
    documentNumber: identity?.document_number ?? "",
    dateOfBirth: profile?.date_of_birth ?? "",
    gender: profile?.gender ?? "",
    hometown: profile?.hometown ?? "",
    permanentAddress: profile?.permanent_address ?? "",
    issuedAt: identity?.issued_at ?? "",
    issuedBy: identity?.issued_by ?? "",
    hasIdentityImages: Boolean(
      identity?.front_image_path && identity?.back_image_path
    ),
    bankName: profile?.bank_name ?? "",
    bankAccountNumber: profile?.bank_account_number ?? "",
    bankAccountHolder: profile?.bank_account_holder ?? "",
    notifications: {
      zaloReminder: settings?.zalo_reminder ?? true,
      emailReport: settings?.email_report ?? true,
      contractExpiry: settings?.contract_expiry ?? true,
      overduePayment: settings?.overdue_payment ?? true,
    },
    settingsTableReady: !settingsMissing,
  };

  return <SettingsClient initialData={initialData} />;
}
