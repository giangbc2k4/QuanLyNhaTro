"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TENANTS_PATH = "/dashboard/tenants";

export interface TenantInput {
  id?: string;
  identityDocumentId?: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  hometown: string;
  permanentAddress: string;
  occupation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  documentNumber: string;
  issuedAt: string;
  frontImagePath?: string;
  backImagePath?: string;
}

export interface TenantActionResult {
  success: boolean;
  message: string;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function clean(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function nullable(value: string, maxLength: number) {
  return clean(value, maxLength) || null;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function saveTenantAction(
  input: TenantInput
): Promise<TenantActionResult> {
  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  }

  const fullName = clean(input.fullName, 150);
  const phone = normalizePhone(input.phone);
  const documentNumber = input.documentNumber.replace(/\D/g, "").slice(0, 12);

  if (fullName.length < 2) {
    return {
      success: false,
      message: "Họ tên phải có ít nhất 2 ký tự.",
    };
  }

  if (!/^0[35789]\d{8}$/.test(phone)) {
    return {
      success: false,
      message: `Số điện thoại phải gồm 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09. Hiện nhận được ${phone.length} số.`,
    };
  }

  if (!/^\d{12}$/.test(documentNumber)) {
    return {
      success: false,
      message: `Số CCCD phải có đúng 12 chữ số. Hiện nhận được ${documentNumber.length} số.`,
    };
  }

  const tenantValues = {
    full_name: fullName,
    phone,
    email: nullable(input.email, 255),
    date_of_birth: input.dateOfBirth || null,
    gender: nullable(input.gender, 30),
    hometown: nullable(input.hometown, 255),
    permanent_address: nullable(input.permanentAddress, 500),
    occupation: nullable(input.occupation, 120),
    emergency_contact_name: nullable(input.emergencyContactName, 150),
    emergency_contact_phone: input.emergencyContactPhone
      ? normalizePhone(input.emergencyContactPhone)
      : null,
  };

  let tenantId = input.id;

  if (tenantId) {
    if (!isUuid(tenantId)) {
      return { success: false, message: "Mã người thuê không hợp lệ." };
    }

    const { data, error } = await supabase
      .from("tenants")
      .update(tenantValues)
      .eq("id", tenantId)
      .eq("account_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        success: false,
        message:
          error?.code === "23505"
            ? "Số điện thoại này đã được sử dụng."
            : "Không thể cập nhật người thuê.",
      };
    }
  } else {
    const { data, error } = await supabase
      .from("tenants")
      .insert({ account_id: user.id, ...tenantValues })
      .select("id")
      .single();

    if (error || !data) {
      return {
        success: false,
        message:
          error?.code === "23505"
            ? "Số điện thoại này đã được sử dụng."
            : "Không thể thêm người thuê.",
      };
    }

    tenantId = data.id;
  }

  const identityValues = {
    account_id: user.id,
    owner_type: "tenant" as const,
    tenant_id: tenantId,
    owner_profile_id: null,
    document_number: documentNumber,
    full_name: fullName,
    date_of_birth: input.dateOfBirth || null,
    gender: nullable(input.gender, 30),
    hometown: nullable(input.hometown, 255),
    permanent_address: nullable(input.permanentAddress, 500),
    issued_at: input.issuedAt || null,
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
    .eq("tenant_id", tenantId)
    .eq("account_id", user.id)
    .maybeSingle();

  const requestedIdentityId =
    input.identityDocumentId && isUuid(input.identityDocumentId)
      ? input.identityDocumentId
      : undefined;
  const identityResult = existingIdentity
    ? await supabase
        .from("identity_documents")
        .update(identityValues)
        .eq("id", existingIdentity.id)
        .eq("account_id", user.id)
    : await supabase
        .from("identity_documents")
        .insert({
          ...(requestedIdentityId ? { id: requestedIdentityId } : {}),
          ...identityValues,
        });

  if (identityResult.error) {
    if (!input.id) {
      await supabase
        .from("tenants")
        .delete()
        .eq("id", tenantId)
        .eq("account_id", user.id);
    }

    return {
      success: false,
      message:
        identityResult.error.code === "23505"
          ? "Số CCCD này đã tồn tại trong hệ thống."
          : "Không thể lưu thông tin CCCD.",
    };
  }

  revalidatePath(TENANTS_PATH);
  return {
    success: true,
    message: input.id ? "Đã cập nhật người thuê." : "Đã thêm người thuê mới.",
  };
}

export async function deleteTenantAction(
  tenantId: string
): Promise<TenantActionResult> {
  const { supabase, user } = await authenticatedClient();

  if (!user) {
    return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  }

  if (!isUuid(tenantId)) {
    return { success: false, message: "Mã người thuê không hợp lệ." };
  }

  const [{ data: mainContract }, { data: memberContracts }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id")
      .eq("account_id", user.id)
      .eq("main_tenant_id", tenantId)
      .in("status", ["draft", "active", "expiring"])
      .limit(1)
      .maybeSingle(),
    supabase
      .from("contract_members")
      .select("contract_id, contracts!inner(account_id, status)")
      .eq("tenant_id", tenantId)
      .eq("contracts.account_id", user.id)
      .in("contracts.status", ["draft", "active", "expiring"])
      .limit(1),
  ]);

  if (mainContract || (memberContracts?.length ?? 0) > 0) {
    return {
      success: false,
      message:
        "Không thể xóa người thuê đang tham gia hợp đồng chưa kết thúc.",
    };
  }

  const { data: identity, error: identityError } = await supabase
    .from("identity_documents")
    .select("front_image_path, back_image_path")
    .eq("tenant_id", tenantId)
    .eq("account_id", user.id)
    .maybeSingle();

  if (identityError) {
    return {
      success: false,
      message: "Không thể kiểm tra ảnh CCCD trước khi xóa người thuê.",
    };
  }

  const { data, error } = await supabase
    .from("tenants")
    .delete()
    .eq("id", tenantId)
    .eq("account_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      message:
        error?.code === "23503"
          ? "Không thể xóa người thuê đang có hợp đồng."
          : "Không thể xóa người thuê.",
    };
  }

  const imagePaths = [
    identity?.front_image_path,
    identity?.back_image_path,
  ].filter((path): path is string => Boolean(path));

  if (imagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("identity-documents")
      .remove(imagePaths);

    if (storageError) {
      revalidatePath(TENANTS_PATH);
      return {
        success: true,
        message:
          "Đã xóa người thuê nhưng chưa dọn được ảnh CCCD trong Storage. Hãy thử dọn lại trong Supabase.",
      };
    }
  }

  revalidatePath(TENANTS_PATH);
  return {
    success: true,
    message: "Đã xóa người thuê và ảnh CCCD trong Storage.",
  };
}
