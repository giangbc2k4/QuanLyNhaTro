import SettingsClient, {
  type SettingsInitialData,
} from "@/components/settings/SettingsClient";
import DashboardDataError from "@/components/dashboard/DashboardDataError";
import { createClient } from "@/lib/supabase/server";
import { isOwnerOnboardingComplete } from "@/lib/owner-onboarding";
import { getVietQrBanks } from "@/lib/vietqr";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const [accountResult, profileResult, identityResult, banks] =
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
      getVietQrBanks(),
    ]);

  const error =
    accountResult.error ??
    profileResult.error ??
    identityResult.error;
  if (error) {
    return (
      <DashboardDataError
        title="Không thể tải cài đặt"
        message={error.message}
      />
    );
  }

  const profile = profileResult.data;
  const identity = identityResult.data;
  const onboardingRequired = !isOwnerOnboardingComplete(profile, identity);
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
  };

  return (
    <SettingsClient
      initialData={initialData}
      banks={banks}
      onboardingRequired={onboardingRequired}
    />
  );
}
