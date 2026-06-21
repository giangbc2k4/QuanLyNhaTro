"use server";

import { revalidatePath } from "next/cache";
import type { RoomOperationalStatus } from "@/lib/domain-types";
import { getAuthenticatedClient } from "@/lib/server/auth";
import type { ServerActionResult } from "@/lib/server/action-result";
import {
  cleanText,
  isUuid,
} from "@/lib/server/action-utils";

const BUILDINGS_PATH = "/dashboard/buildings";
const roomStatuses = ["vacant", "maintenance"] as const satisfies readonly RoomOperationalStatus[];

export interface BuildingInput {
  id?: string;
  name: string;
  address: string;
  description: string;
}

export interface RoomInput {
  id?: string;
  buildingId: string;
  number: string;
  price: number;
  status: RoomOperationalStatus;
  floor: number | null;
  area: number | null;
  description: string;
  serviceIds: string[];
}

export type ActionResult = ServerActionResult;

function databaseErrorMessage(
  code: string | undefined,
  fallback: string
): string {
  if (code === "23505") {
    return "Tên tòa nhà hoặc số phòng đã tồn tại.";
  }

  if (code === "23503") {
    return "Không thể xóa vì dữ liệu này đang được sử dụng trong hợp đồng.";
  }

  return fallback;
}

export async function saveBuildingAction(
  input: BuildingInput
): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!user) {
    return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  }

  const name = cleanText(input.name, 120);
  const address = cleanText(input.address, 300);
  const description = cleanText(input.description, 1000) || null;

  if (name.length < 2 || address.length < 5) {
    return {
      success: false,
      message: "Vui lòng nhập tên tòa nhà và địa chỉ hợp lệ.",
    };
  }

  if (input.id) {
    if (!isUuid(input.id)) {
      return { success: false, message: "Mã tòa nhà không hợp lệ." };
    }

    const { data, error } = await supabase
      .from("buildings")
      .update({ name, address, description })
      .eq("id", input.id)
      .eq("account_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        success: false,
        message: databaseErrorMessage(
          error?.code,
          "Không thể cập nhật tòa nhà."
        ),
      };
    }
  } else {
    const { error } = await supabase.from("buildings").insert({
      account_id: user.id,
      name,
      address,
      description,
    });

    if (error) {
      return {
        success: false,
        message: databaseErrorMessage(error.code, "Không thể thêm tòa nhà."),
      };
    }
  }

  revalidatePath(BUILDINGS_PATH);
  return {
    success: true,
    message: input.id ? "Đã cập nhật tòa nhà." : "Đã thêm tòa nhà mới.",
  };
}

export async function deleteBuildingAction(
  buildingId: string
): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!user) {
    return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  }

  if (!isUuid(buildingId)) {
    return { success: false, message: "Mã tòa nhà không hợp lệ." };
  }

  const { data, error } = await supabase
    .from("buildings")
    .delete()
    .eq("id", buildingId)
    .eq("account_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      message: databaseErrorMessage(error?.code, "Không thể xóa tòa nhà."),
    };
  }

  revalidatePath(BUILDINGS_PATH);
  return { success: true, message: "Đã xóa tòa nhà." };
}

export async function saveRoomAction(input: RoomInput): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!user) {
    return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  }

  if (!isUuid(input.buildingId) || (input.id && !isUuid(input.id))) {
    return { success: false, message: "Thông tin phòng không hợp lệ." };
  }

  const number = cleanText(input.number, 50);
  const description = cleanText(input.description, 1000) || null;
  const price = Number(input.price);
  const floor = input.floor === null ? null : Number(input.floor);
  const area = input.area === null ? null : Number(input.area);
  const serviceIds = Array.isArray(input.serviceIds)
    ? [...new Set(input.serviceIds)]
    : [];

  if (
    !number ||
    !Number.isSafeInteger(price) ||
    price < 0 ||
    (floor !== null && (!Number.isInteger(floor) || floor < 0)) ||
    (area !== null && (!Number.isFinite(area) || area <= 0)) ||
    !roomStatuses.includes(input.status)
  ) {
    return { success: false, message: "Vui lòng kiểm tra lại thông tin phòng." };
  }

  const { data: building } = await supabase
    .from("buildings")
    .select("id")
    .eq("id", input.buildingId)
    .eq("account_id", user.id)
    .maybeSingle();

  if (!building) {
    return { success: false, message: "Bạn không có quyền quản lý tòa nhà này." };
  }

  if (serviceIds.some((serviceId) => !isUuid(serviceId))) {
    return { success: false, message: "Danh sách dịch vụ không hợp lệ." };
  }

  if (serviceIds.length > 0) {
    const { data: ownedServices, error: servicesError } = await supabase
      .from("services")
      .select("id")
      .eq("account_id", user.id)
      .in("id", serviceIds);

    if (servicesError || ownedServices?.length !== serviceIds.length) {
      return {
        success: false,
        message: "Có dịch vụ không tồn tại hoặc đã bị tạm tắt.",
      };
    }
  }

  const values = {
    building_id: input.buildingId,
    room_number: number,
    monthly_rent: price,
    status: input.status,
    floor_number: floor,
    area_m2: area,
    description,
  };

  let roomId = input.id;

  if (roomId) {
    const { data, error } = await supabase
      .from("rooms")
      .update(values)
      .eq("id", roomId)
      .eq("account_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        success: false,
        message: databaseErrorMessage(error?.code, "Không thể cập nhật phòng."),
      };
    }
  } else {
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        account_id: user.id,
        ...values,
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        success: false,
        message: databaseErrorMessage(error.code, "Không thể thêm phòng."),
      };
    }

    roomId = data.id;
  }

  const { error: clearServicesError } = await supabase
    .from("room_services")
    .delete()
    .eq("room_id", roomId)
    .eq("account_id", user.id);

  if (clearServicesError) {
    return { success: false, message: "Không thể cập nhật dịch vụ của phòng." };
  }

  if (serviceIds.length > 0) {
    const { error: assignServicesError } = await supabase
      .from("room_services")
      .insert(
        serviceIds.map((serviceId) => ({
          account_id: user.id,
          room_id: roomId,
          service_id: serviceId,
        }))
      );

    if (assignServicesError) {
      return { success: false, message: "Không thể gán dịch vụ cho phòng." };
    }
  }

  revalidatePath(BUILDINGS_PATH);
  return {
    success: true,
    message: input.id ? "Đã cập nhật phòng." : "Đã thêm phòng mới.",
  };
}

export async function deleteRoomAction(roomId: string): Promise<ActionResult> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!user) {
    return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  }

  if (!isUuid(roomId)) {
    return { success: false, message: "Mã phòng không hợp lệ." };
  }

  const { data, error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", roomId)
    .eq("account_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      message: databaseErrorMessage(error?.code, "Không thể xóa phòng."),
    };
  }

  revalidatePath(BUILDINGS_PATH);
  return { success: true, message: "Đã xóa phòng." };
}
