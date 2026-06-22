"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedClient } from "@/lib/server/auth";
import { isUuid } from "@/lib/server/action-utils";
import type { ServerActionResult } from "@/lib/server/action-result";
import { errorMessage, logWarning } from "@/lib/server/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendZaloText } from "@/lib/zalo/client";

const CONTRACTS_PATH = "/dashboard/contracts";

export interface ContractInput {
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  note: string;
  openingReadings: Record<string, number>;
  members: Array<{
    tenantId: string;
    relationship: string;
  }>;
}

export type ContractActionResult = ServerActionResult;

export async function createContractAction(
  input: ContractInput
): Promise<ContractActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { success: false, message: "Phiên đăng nhập đã hết hạn." };

  const rent = Number(input.monthlyRent);
  const deposit = Number(input.deposit);
  const members = Array.isArray(input.members)
    ? input.members.filter((member) => member.tenantId)
    : [];
  const memberIds = [...new Set(members.map((member) => member.tenantId))];
  const openingReadings =
    input.openingReadings && typeof input.openingReadings === "object"
      ? input.openingReadings
      : {};
  if (
    !isUuid(input.roomId) ||
    !isUuid(input.tenantId) ||
    !input.startDate ||
    !input.endDate ||
    input.endDate < input.startDate ||
    !Number.isSafeInteger(rent) ||
    rent < 0 ||
    !Number.isSafeInteger(deposit) ||
    deposit < 0 ||
    memberIds.some((id) => !isUuid(id)) ||
    memberIds.includes(input.tenantId) ||
    memberIds.length !== members.length
  ) {
    return { success: false, message: "Vui lòng kiểm tra thông tin hợp đồng." };
  }

  const [
    { data: room },
    { data: tenant },
    { data: currentContract },
    { data: activeContracts },
  ] =
    await Promise.all([
      supabase
        .from("rooms")
        .select("id, status")
        .eq("id", input.roomId)
        .eq("account_id", user.id)
        .maybeSingle(),
      supabase
        .from("tenants")
        .select("id")
        .eq("id", input.tenantId)
        .eq("account_id", user.id)
        .maybeSingle(),
      supabase
        .from("contracts")
        .select("id")
        .eq("room_id", input.roomId)
        .eq("account_id", user.id)
        .in("status", ["active", "expiring"])
        .maybeSingle(),
      supabase
        .from("contracts")
        .select("id, main_tenant_id, contract_members(tenant_id)")
        .eq("account_id", user.id)
        .in("status", ["active", "expiring"]),
    ]);

  if (!room || !tenant) {
    return { success: false, message: "Phòng hoặc người thuê không hợp lệ." };
  }
  if (room.status === "maintenance") {
    return {
      success: false,
      message: "Phòng đang bảo trì. Hãy chuyển về sẵn sàng trước.",
    };
  }
  if (currentContract) {
    return { success: false, message: "Phòng đang có hợp đồng hiệu lực." };
  }

  const { data: meteredRoomServices, error: meteredServicesError } =
    await supabase
      .from("room_services")
      .select("service_id, services!inner(name, unit, billing_type)")
      .eq("room_id", input.roomId)
      .eq("account_id", user.id)
      .eq("services.billing_type", "metered");

  if (meteredServicesError) {
    return {
      success: false,
      message: "Không thể tải danh sách công tơ của phòng.",
    };
  }

  const invalidOpeningReading = (meteredRoomServices ?? []).find((item) => {
    const reading = Number(openingReadings[item.service_id]);
    return !Number.isFinite(reading) || reading < 0;
  });
  if (invalidOpeningReading) {
    const service = Array.isArray(invalidOpeningReading.services)
      ? invalidOpeningReading.services[0]
      : invalidOpeningReading.services;
    return {
      success: false,
      message: `Vui lòng nhập chỉ số bàn giao của ${service?.name ?? "công tơ"}.`,
    };
  }

  const unavailableTenantIds = new Set<string>();
  for (const contract of activeContracts ?? []) {
    unavailableTenantIds.add(contract.main_tenant_id);
    for (const member of contract.contract_members ?? []) {
      if (member.tenant_id) unavailableTenantIds.add(member.tenant_id);
    }
  }
  if (
    unavailableTenantIds.has(input.tenantId) ||
    memberIds.some((id) => unavailableTenantIds.has(id))
  ) {
    return {
      success: false,
      message:
        "Có người đã thuộc một hợp đồng đang hiệu lực hoặc sắp hết hạn.",
    };
  }

  let memberTenants: Array<{ id: string; full_name: string; phone: string }> = [];
  if (memberIds.length > 0) {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, full_name, phone")
      .eq("account_id", user.id)
      .in("id", memberIds);

    if (error || !data || data.length !== memberIds.length) {
      return {
        success: false,
        message: "Có người ở cùng không tồn tại hoặc không thuộc tài khoản.",
      };
    }
    memberTenants = data;
  }

  const code = `HD-${new Date().getFullYear()}-${crypto.randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;
  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      account_id: user.id,
      contract_code: code,
      room_id: input.roomId,
      main_tenant_id: input.tenantId,
      start_date: input.startDate,
      end_date: input.endDate,
      monthly_rent: rent,
      deposit_amount: deposit,
      status: "active",
      note: input.note.trim().slice(0, 1000) || null,
    })
    .select("id")
    .single();

  if (error || !contract) {
    return {
      success: false,
      message: error.message.includes("bảo trì")
        ? error.message
        : "Không thể tạo hợp đồng.",
    };
  }

  if ((meteredRoomServices ?? []).length > 0) {
    for (const service of meteredRoomServices ?? []) {
      const reading = Number(openingReadings[service.service_id]);
      const { error: contractServiceError } = await supabase
        .from("contract_services")
        .update({ opening_reading: reading })
        .eq("contract_id", contract.id)
        .eq("account_id", user.id)
        .eq("source_service_id", service.service_id);

      if (contractServiceError) {
        await supabase
          .from("contracts")
          .delete()
          .eq("id", contract.id)
          .eq("account_id", user.id);
        return {
          success: false,
          message: "Không thể lưu chỉ số bàn giao vào hợp đồng.",
        };
      }
    }

    const { error: readingError } = await supabase
      .from("room_meter_readings")
      .insert(
        (meteredRoomServices ?? []).map((service) => ({
          account_id: user.id,
          room_id: input.roomId,
          service_id: service.service_id,
          contract_id: contract.id,
          reading_type: "contract_start",
          reading_value: Number(openingReadings[service.service_id]),
          recorded_at: `${input.startDate}T00:00:00+07:00`,
          note: "Chỉ số bàn giao khi bắt đầu hợp đồng",
        }))
      );

    if (readingError) {
      await supabase
        .from("contracts")
        .delete()
        .eq("id", contract.id)
        .eq("account_id", user.id);
      return {
        success: false,
        message: "Không thể lưu lịch sử chỉ số bàn giao.",
      };
    }
  }

  if (memberTenants.length > 0) {
    const relationshipByTenant = new Map(
      members.map((member) => [
        member.tenantId,
        member.relationship.trim().slice(0, 80) || "Ở cùng",
      ])
    );
    const { error: memberError } = await supabase
      .from("contract_members")
      .insert(
        memberTenants.map((member) => ({
          contract_id: contract.id,
          tenant_id: member.id,
          full_name: member.full_name,
          phone: member.phone,
          relationship: relationshipByTenant.get(member.id),
        }))
      );

    if (memberError) {
      await supabase
        .from("room_meter_readings")
        .delete()
        .eq("contract_id", contract.id)
        .eq("account_id", user.id);
      await supabase
        .from("contracts")
        .delete()
        .eq("id", contract.id)
        .eq("account_id", user.id);
      return {
        success: false,
        message: "Không thể thêm danh sách người ở cùng.",
      };
    }
  }

  revalidatePath(CONTRACTS_PATH);
  revalidatePath("/dashboard/buildings");
  return { success: true, message: `Đã tạo hợp đồng ${code}.` };
}

export async function terminateContractAction(
  contractId: string
): Promise<ContractActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  if (!isUuid(contractId)) {
    return { success: false, message: "Mã hợp đồng không hợp lệ." };
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select(`
      contract_code,
      rooms!contracts_room_id_fkey(
        room_number,
        buildings!rooms_building_id_fkey(name)
      )
    `)
    .eq("id", contractId)
    .eq("account_id", user.id)
    .in("status", ["draft", "active", "expiring"])
    .maybeSingle();

  if (!contract) {
    return { success: false, message: "Không tìm thấy hợp đồng có thể kết thúc." };
  }

  const admin = createAdminClient();
  const { data: zaloLinks, error: linksError } = await admin
    .from("zalo_room_links")
    .select("id, zalo_user_id")
    .eq("contract_id", contractId)
    .eq("account_id", user.id);

  if (linksError) {
    logWarning("contract_termination_zalo_links_lookup_failed", {
      contractId,
      error: linksError.message,
    });
  }

  const { data, error } = await supabase
    .from("contracts")
    .update({ status: "terminated" })
    .eq("id", contractId)
    .eq("account_id", user.id)
    .in("status", ["draft", "active", "expiring"])
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, message: "Không thể kết thúc hợp đồng." };
  }

  const linkedZaloAccounts = zaloLinks ?? [];
  let notificationFailed = false;
  let unlinkFailed = false;

  for (const link of linkedZaloAccounts) {
    const room = Array.isArray(contract.rooms)
      ? contract.rooms[0]
      : contract.rooms;
    const building = room
      ? Array.isArray(room.buildings)
        ? room.buildings[0]
        : room.buildings
      : null;
    const roomLabel = [
      room?.room_number ? `phòng ${room.room_number}` : null,
      building?.name ?? null,
    ]
      .filter(Boolean)
      .join(" · ");

    try {
      await sendZaloText(
        link.zalo_user_id,
        [
          "THÔNG BÁO HỢP ĐỒNG",
          "",
          `Hợp đồng ${contract.contract_code}${roomLabel ? ` của ${roomLabel}` : ""} đã được chủ nhà kết thúc.`,
          "Liên kết Zalo với hợp đồng này sẽ được tự động hủy.",
        ].join("\n")
      );
    } catch (sendError) {
      notificationFailed = true;
      logWarning("contract_termination_zalo_notification_failed", {
        contractId,
        linkId: link.id,
        error: errorMessage(sendError),
      });
    }

  }

  if (linkedZaloAccounts.length > 0) {
    const { data: deletedLinks, error: unlinkError } = await admin
      .from("zalo_room_links")
      .delete()
      .eq("contract_id", contractId)
      .eq("account_id", user.id)
      .select("id");
    if (
      unlinkError ||
      (deletedLinks?.length ?? 0) !== linkedZaloAccounts.length
    ) {
      unlinkFailed = true;
      logWarning("contract_termination_zalo_unlink_failed", {
        contractId,
        expectedCount: linkedZaloAccounts.length,
        deletedCount: deletedLinks?.length ?? 0,
        error: unlinkError?.message ?? "Số liên kết đã xóa không khớp.",
      });
    }
  }

  revalidatePath(CONTRACTS_PATH);
  revalidatePath("/dashboard/buildings");
  revalidatePath("/dashboard/zalo");

  if (unlinkFailed) {
    return {
      success: true,
      message:
        "Đã kết thúc hợp đồng nhưng chưa thể tự gỡ liên kết Zalo. Vui lòng kiểm tra trang Zalo Bot.",
    };
  }
  if (notificationFailed) {
    return {
      success: true,
      message:
        "Đã kết thúc hợp đồng và gỡ liên kết Zalo, nhưng bot không gửi được thông báo.",
    };
  }
  return {
    success: true,
    message: linkedZaloAccounts.length
      ? "Đã kết thúc hợp đồng, thông báo người thuê và gỡ liên kết Zalo."
      : "Đã kết thúc hợp đồng.",
  };
}
