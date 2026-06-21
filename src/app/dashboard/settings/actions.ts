"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedClient } from "@/lib/server/auth";
import type { ServerActionResult } from "@/lib/server/action-result";
import {
  cleanText,
  isUuid,
} from "@/lib/server/action-utils";
import { getVietQrBanks } from "@/lib/vietqr";

const SETTINGS_PATH = "/dashboard/settings";

export type SettingsActionResult = ServerActionResult;

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

export async function saveOwnerProfileAction(
  input: OwnerProfileInput
): Promise<SettingsActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { success: false, message: "Phiên đăng nhập đã hết hạn." };

  const fullName = cleanText(input.fullName, 150);
  const documentNumber = input.documentNumber.replace(/\D/g, "").slice(0, 12);
  const dateOfBirth = input.dateOfBirth;
  const gender = cleanText(input.gender, 30);
  const hometown = cleanText(input.hometown, 255);
  const permanentAddress = cleanText(input.permanentAddress, 500);
  if (fullName.length < 2) {
    return { success: false, message: "Họ tên phải có ít nhất 2 ký tự." };
  }
  if (!/^\d{12}$/.test(documentNumber)) {
    return { success: false, message: "Số CCCD phải có đúng 12 chữ số." };
  }

  if (!dateOfBirth || !gender || !hometown || !permanentAddress) {
    return {
      success: false,
      message:
        "Vui lòng nhập đủ ngày sinh, giới tính, quê quán và địa chỉ thường trú.",
    };
  }

  const { data: existingIdentity } = await supabase
    .from("identity_documents")
    .select("id, front_image_path, back_image_path")
    .eq("account_id", user.id)
    .eq("owner_type", "owner")
    .maybeSingle();
  if (
    !(
      (input.frontImagePath && input.backImagePath) ||
      (existingIdentity?.front_image_path && existingIdentity.back_image_path)
    )
  ) {
    return {
      success: false,
      message: "Vui lòng tải đủ ảnh mặt trước và mặt sau CCCD.",
    };
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
        date_of_birth: dateOfBirth,
        gender,
        hometown,
        permanent_address: permanentAddress,
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
    date_of_birth: dateOfBirth,
    gender,
    hometown,
    permanent_address: permanentAddress,
    issued_at: input.issuedAt || null,
    issued_by: cleanText(input.issuedBy, 255) || null,
    ...(input.frontImagePath && input.backImagePath
      ? {
          front_image_path: input.frontImagePath,
          back_image_path: input.backImagePath,
          verification_status: "ocr_completed" as const,
        }
      : {}),
  };

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
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/contracts");
  return { success: true, message: "Đã lưu hồ sơ chủ nhà." };
}

export async function saveBankSettingsAction(
  input: BankSettingsInput
): Promise<SettingsActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  const bankName = cleanText(input.bankName, 100);
  const accountNumber = input.accountNumber.replace(/\s/g, "").slice(0, 40);
  const accountHolder = cleanText(input.accountHolder, 150).toUpperCase();
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
        "Không thể lưu tài khoản ngân hàng. Hãy kiểm tra database đã cập nhật đầy đủ.",
    };
  }
  revalidatePath(SETTINGS_PATH);
  revalidatePath("/dashboard/invoices");
  return { success: true, message: "Đã lưu tài khoản ngân hàng." };
}
