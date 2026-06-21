"use server";

import { revalidatePath } from "next/cache";
import type { ServiceBillingType } from "@/lib/domain-types";
import { getAuthenticatedClient } from "@/lib/server/auth";
import type { ServerActionResult } from "@/lib/server/action-result";
import {
  isUuid,
} from "@/lib/server/action-utils";

const SERVICES_PATH = "/dashboard/services";
const BUILDINGS_PATH = "/dashboard/buildings";
const billingTypes = [
  "metered",
  "fixed",
  "per_person",
  "free",
] as const satisfies readonly ServiceBillingType[];

export interface ServiceInput {
  id?: string;
  name: string;
  unit: string;
  price: number;
  billingType: ServiceBillingType;
  description: string;
  isActive: boolean;
}

export type ServiceActionResult = ServerActionResult;

export async function saveServiceAction(
  input: ServiceInput
): Promise<ServiceActionResult> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!user) {
    return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  }

  const name = input.name.trim().slice(0, 120);
  const unit = input.unit.trim().slice(0, 30);
  const description = input.description.trim().slice(0, 500) || null;
  const price = input.billingType === "free" ? 0 : Number(input.price);

  if (
    name.length < 2 ||
    !unit ||
    !Number.isSafeInteger(price) ||
    price < 0 ||
    !billingTypes.includes(input.billingType)
  ) {
    return { success: false, message: "Vui lòng kiểm tra lại thông tin dịch vụ." };
  }

  const values = {
    name,
    unit,
    price,
    billing_type: input.billingType,
    description,
    is_active: Boolean(input.isActive),
  };

  if (input.id) {
    if (!isUuid(input.id)) {
      return { success: false, message: "Mã dịch vụ không hợp lệ." };
    }

    const { data, error } = await supabase
      .from("services")
      .update(values)
      .eq("id", input.id)
      .eq("account_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        success: false,
        message:
          error?.code === "23505"
            ? "Tên dịch vụ này đã tồn tại."
            : "Không thể cập nhật dịch vụ.",
      };
    }
  } else {
    const { error } = await supabase.from("services").insert({
      account_id: user.id,
      ...values,
    });

    if (error) {
      return {
        success: false,
        message:
          error.code === "23505"
            ? "Tên dịch vụ này đã tồn tại."
            : "Không thể thêm dịch vụ.",
      };
    }
  }

  revalidatePath(SERVICES_PATH);
  revalidatePath(BUILDINGS_PATH);
  return {
    success: true,
    message: input.id ? "Đã cập nhật dịch vụ." : "Đã thêm dịch vụ mới.",
  };
}

export async function deleteServiceAction(
  serviceId: string
): Promise<ServiceActionResult> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!user) {
    return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  }

  if (!isUuid(serviceId)) {
    return { success: false, message: "Mã dịch vụ không hợp lệ." };
  }

  const { data, error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("account_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, message: "Không thể xóa dịch vụ." };
  }

  revalidatePath(SERVICES_PATH);
  revalidatePath(BUILDINGS_PATH);
  return { success: true, message: "Đã xóa dịch vụ." };
}
