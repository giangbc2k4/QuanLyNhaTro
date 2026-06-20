"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SERVICES_PATH = "/dashboard/services";
const BUILDINGS_PATH = "/dashboard/buildings";
const billingTypes = ["metered", "fixed", "per_person", "free"] as const;

export interface ServiceInput {
  id?: string;
  name: string;
  unit: string;
  price: number;
  billingType: (typeof billingTypes)[number];
  description: string;
  isActive: boolean;
}

export interface ServiceActionResult {
  success: boolean;
  message: string;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function saveServiceAction(
  input: ServiceInput
): Promise<ServiceActionResult> {
  const { supabase, user } = await authenticatedClient();

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
  const { supabase, user } = await authenticatedClient();

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
