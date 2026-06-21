"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVietQrBanks } from "@/lib/vietqr";

const SETTINGS_PATH = "/dashboard/settings";

export interface SettingsActionResult {
  success: boolean;
  message: string;
}

export interface OwnerProfileInput {
  ownerProfileId?: string;
  identityDocumentId?: string;
  fullName: string;
  documentNumber: string;
  dateOfBirth: string;
  gender: string;
  hometown: string;
  permanentAddress: string;
  issuedAt: string;
  issuedBy: string;
  frontImagePath?: string;
  backImagePath?: string;
}

export interface BankSettingsInput {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function clean(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function saveOwnerProfileAction(
  input: OwnerProfileInput
): Promise<SettingsActionResult> {
  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, message: "Phiên đăng nhập đã hết hạn." };

  const fullName = clean(input.fullName, 150);
  const documentNumber = input.documentNumber.replace(/\D/g, "").slice(0, 12);
  if (fullName.length < 2) {
    return { success: false, message: "Họ tên phải có ít nhất 2 ký tự." };
  }
  if (!/^\d{12}$/.test(documentNumber)) {
    return { success: false, message: "Số CCCD phải có đúng 12 chữ số." };
  }

  const requestedProfileId =
    input.ownerProfileId && isUuid(input.ownerProfileId)
      ? input.ownerProfileId
      : crypto.randomUUID();
  const { data: profile, error: profileError } = await supabase
    .from("owner_profiles")
    .upsert(
      {
        id: requestedProfileId,
        account_id: user.id,
        full_name: fullName,
        date_of_birth: input.dateOfBirth || null,
        gender: clean(input.gender, 30) || null,
        hometown: clean(input.hometown, 255) || null,
        permanent_address: clean(input.permanentAddress, 500) || null,
      },
      { onConflict: "account_id" }
    )
    .select("id")
    .single();

  if (profileError || !profile) {
    return { success: false, message: "Không thể lưu hồ sơ chủ nhà." };
  }

  const identityValues = {
    account_id: user.id,
    owner_type: "owner" as const,
    owner_profile_id: profile.id,
    tenant_id: null,
    document_number: documentNumber,
    full_name: fullName,
    date_of_birth: input.dateOfBirth || null,
    gender: clean(input.gender, 30) || null,
    hometown: clean(input.hometown, 255) || null,
    permanent_address: clean(input.permanentAddress, 500) || null,
    issued_at: input.issuedAt || null,
    issued_by: clean(input.issuedBy, 255) || null,
    ...(input.frontImagePath && input.backImagePath
      ? {
          front_image_path: input.frontImagePath,
          back_image_path: input.backImagePath,
          verification_status: "ocr_completed" as const,
        }
      : {}),
  };

  const { data: existingIdentity } = await supabase
    .from("identity_documents")
    .select("id")
    .eq("account_id", user.id)
    .eq("owner_type", "owner")
    .maybeSingle();
  const identityId =
    existingIdentity?.id ??
    (input.identityDocumentId && isUuid(input.identityDocumentId)
      ? input.identityDocumentId
      : crypto.randomUUID());
  const { error: identityError } = existingIdentity
    ? await supabase
        .from("identity_documents")
        .update(identityValues)
        .eq("id", identityId)
        .eq("account_id", user.id)
    : await supabase
        .from("identity_documents")
        .insert({ id: identityId, ...identityValues });

  if (identityError) {
    return {
      success: false,
      message:
        identityError.code === "23505"
          ? "Số CCCD này đã tồn tại trong hệ thống."
          : "Không thể lưu thông tin CCCD.",
    };
  }

  revalidatePath(SETTINGS_PATH);
  revalidatePath("/dashboard/contracts");
  return { success: true, message: "Đã lưu hồ sơ chủ nhà." };
}

export async function saveBankSettingsAction(
  input: BankSettingsInput
): Promise<SettingsActionResult> {
  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  const bankName = clean(input.bankName, 100);
  const accountNumber = input.accountNumber.replace(/\s/g, "").slice(0, 40);
  const accountHolder = clean(input.accountHolder, 150).toUpperCase();
  if (!bankName || accountNumber.length < 5 || accountHolder.length < 2) {
    return { success: false, message: "Vui lòng kiểm tra thông tin ngân hàng." };
  }

  const availableBanks = await getVietQrBanks();
  const selectedBank = availableBanks.find(
    (bank) => bank.shortName === bankName
  );
  if (availableBanks.length && !selectedBank) {
    return {
      success: false,
      message: "Vui lòng chọn ngân hàng trong danh sách.",
    };
  }

  const { data: profile } = await supabase
    .from("owner_profiles")
    .select("id")
    .eq("account_id", user.id)
    .maybeSingle();
  if (!profile) {
    return {
      success: false,
      message: "Hãy lưu hồ sơ chủ nhà trước khi lưu tài khoản ngân hàng.",
    };
  }

  const { error } = await supabase
    .from("owner_profiles")
    .update({
      bank_name: selectedBank?.shortName ?? bankName,
      bank_account_number: accountNumber,
      bank_account_holder: accountHolder,
    })
    .eq("id", profile.id)
    .eq("account_id", user.id);
  if (error) {
    return {
      success: false,
      message:
        "Không thể lưu. Hãy chạy migration 0010_account_settings.sql.",
    };
  }
  revalidatePath(SETTINGS_PATH);
  revalidatePath("/dashboard/invoices");
  return { success: true, message: "Đã lưu tài khoản ngân hàng." };
}
