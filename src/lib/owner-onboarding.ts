import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const profileFields =
  "full_name, date_of_birth, gender, hometown, permanent_address";
const identityFields = "document_number, front_image_path, back_image_path";

export async function getOwnerOnboardingState(
  supabase: SupabaseClient,
  accountId: string
) {
  const [profileResult, identityResult] = await Promise.all([
    supabase
      .from("owner_profiles")
      .select(profileFields)
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("identity_documents")
      .select(identityFields)
      .eq("account_id", accountId)
      .eq("owner_type", "owner")
      .maybeSingle(),
  ]);

  return {
    complete:
      !profileResult.error &&
      !identityResult.error &&
      isOwnerOnboardingComplete(profileResult.data, identityResult.data),
    profile: profileResult.data,
    identity: identityResult.data,
  };
}

export function isOwnerOnboardingComplete(
  profile: {
    full_name: string | null;
    date_of_birth: string | null;
    gender: string | null;
    hometown: string | null;
    permanent_address: string | null;
  } | null,
  identity: {
    document_number: string | null;
    front_image_path: string | null;
    back_image_path: string | null;
  } | null
) {
  return Boolean(
    profile?.full_name?.trim() &&
      profile.date_of_birth &&
      profile.gender?.trim() &&
      profile.hometown?.trim() &&
      profile.permanent_address?.trim() &&
      /^\d{12}$/.test(identity?.document_number ?? "") &&
      identity?.front_image_path &&
      identity.back_image_path
  );
}
