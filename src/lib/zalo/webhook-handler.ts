import "server-only";

import { after, NextResponse } from "next/server";
import { extractMeterReadingsFromImage } from "@/lib/ai/gateway";
import {
  errorMessage,
  logError,
  logInfo,
  logWarning,
} from "@/lib/server/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  invoiceTransferContent,
  resolveVietQrBankId,
  vietQrImageUrl,
} from "@/lib/vietqr";
import { sendZaloPhoto, sendZaloText } from "@/lib/zalo/client";
import {
  currentBillingMonth,
  detectImageType,
  formatDate,
  formatMoney,
  helpMessage,
  invoiceStatusLabel,
  messageImageUrl,
  normalized,
  parseCorrectedReading,
  webhookAuthorized,
  webhookEventName,
  webhookMessage,
  type ZaloMessage,
  type ZaloWebhook,
} from "@/lib/zalo/webhook-utils";

// ---------------------------------------------------------------------------
// Nhóm lệnh tra cứu và liên kết
// ---------------------------------------------------------------------------

async function linkedContract(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("zalo_room_links")
    .select(`
      id, account_id, contract_id, room_id,
      contracts!zalo_room_links_contract_id_fkey(
        contract_code, start_date, end_date, monthly_rent,
        deposit_amount, status,
        tenants!contracts_main_tenant_id_fkey(full_name, phone),
        rooms!contracts_room_id_fkey(
          room_number,
          buildings!rooms_building_id_fkey(name, address)
        ),
        contract_members(full_name, relationship),
        contract_services(id, service_name, unit, price, billing_type)
      )
    `)
    .eq("zalo_user_id", userId)
    .maybeSingle();

  return { admin, link: data };
}

async function requireLink(userId: string) {
  const result = await linkedContract(userId);
  if (!result.link) {
    await sendZaloText(
      userId,
      "Zalo này chưa liên kết với phòng.\nHãy gửi: LIENKET <3 số cuối SĐT>"
    );
    return null;
  }
  return { admin: result.admin, link: result.link };
}

async function handleCheckCommand(userId: string) {
  const linked = await requireLink(userId);
  if (!linked) return;

  const contract = Array.isArray(linked.link.contracts)
    ? linked.link.contracts[0]
    : linked.link.contracts;
  if (!contract) {
    await sendZaloText(userId, "Không tìm thấy hợp đồng đã liên kết.");
    return;
  }
  const tenant = Array.isArray(contract.tenants)
    ? contract.tenants[0]
    : contract.tenants;
  const room = Array.isArray(contract.rooms)
    ? contract.rooms[0]
    : contract.rooms;
  const building = room
    ? Array.isArray(room.buildings)
      ? room.buildings[0]
      : room.buildings
    : null;
  const { data: invoice } = await linked.admin
    .from("invoices")
    .select("invoice_code, billing_month, due_date, status, total_amount")
    .eq("contract_id", linked.link.contract_id)
    .neq("status", "cancelled")
    .order("billing_month", { ascending: false })
    .limit(1)
    .maybeSingle();
  const members = contract.contract_members ?? [];

  const lines = [
    "THÔNG TIN ĐANG THUÊ",
    "",
    `Phòng: ${room?.room_number ?? "—"} — ${building?.name ?? "—"}`,
    `Địa chỉ: ${building?.address ?? "—"}`,
    `Người thuê chính: ${tenant?.full_name ?? "—"}`,
    `Mã hợp đồng: ${contract.contract_code}`,
    `Thời hạn: ${formatDate(contract.start_date)} → ${formatDate(contract.end_date)}`,
    `Tiền thuê: ${formatMoney(Number(contract.monthly_rent))}/tháng`,
    `Tiền cọc: ${formatMoney(Number(contract.deposit_amount))}`,
    `Người ở cùng: ${members.length}`,
  ];

  if (invoice) {
    lines.push(
      "",
      "HÓA ĐƠN GẦN NHẤT",
      `Kỳ: ${invoice.billing_month.slice(0, 7)}`,
      `Tổng tiền: ${formatMoney(Number(invoice.total_amount))}`,
      `Hạn thanh toán: ${formatDate(invoice.due_date)}`,
      `Trạng thái: ${invoiceStatusLabel(invoice.status, invoice.due_date)}`
    );
  } else {
    lines.push("", "Chưa có hóa đơn nào.");
  }

  await sendZaloText(userId, lines.join("\n"));
}

async function handleInvoiceCommand(userId: string) {
  const linked = await requireLink(userId);
  if (!linked) return;

  const [invoiceResult, ownerProfileResult] = await Promise.all([
    linked.admin
      .from("invoices")
      .select(`
        invoice_code, billing_month, due_date, status, total_amount, paid_at,
        invoice_items(item_name, unit, unit_price, quantity, amount, billing_type)
      `)
      .eq("contract_id", linked.link.contract_id)
      .neq("status", "cancelled")
      .order("billing_month", { ascending: false })
      .limit(1)
      .maybeSingle(),
    linked.admin
      .from("owner_profiles")
      .select("bank_name, bank_account_number, bank_account_holder")
      .eq("account_id", linked.link.account_id)
      .maybeSingle(),
  ]);
  const invoice = invoiceResult.data;

  if (!invoice) {
    await sendZaloText(userId, "Hợp đồng này chưa có hóa đơn.");
    return;
  }

  const detail = (invoice.invoice_items ?? []).map((item) => {
    const usage =
      item.billing_type === "metered"
        ? ` (${Number(item.quantity)} ${item.unit})`
        : "";
    return `• ${item.item_name}${usage}: ${formatMoney(Number(item.amount))}`;
  });
  const ownerProfile = ownerProfileResult.data;
  const transferContent = invoiceTransferContent(invoice.invoice_code);
  const message = [
    `HÓA ĐƠN ${invoice.billing_month.slice(0, 7)}`,
    `Mã: ${invoice.invoice_code}`,
    "",
    ...detail,
    "",
    `Tổng cộng: ${formatMoney(Number(invoice.total_amount))}`,
    `Hạn thanh toán: ${formatDate(invoice.due_date)}`,
    `Trạng thái: ${invoiceStatusLabel(invoice.status, invoice.due_date)}`,
    ...(invoice.paid_at
      ? [`Ngày thanh toán: ${formatDate(invoice.paid_at)}`]
      : []),
  ];

  if (
    !ownerProfile?.bank_name ||
    !ownerProfile.bank_account_number ||
    !ownerProfile.bank_account_holder
  ) {
    await sendZaloText(
      userId,
      [
        ...message,
        "",
        "Chủ nhà chưa cấu hình đủ thông tin ngân hàng nên chưa thể tạo mã QR.",
      ].join("\n")
    );
    return;
  }

  try {
    const bankId = await resolveVietQrBankId(ownerProfile.bank_name);
    const qrUrl = vietQrImageUrl({
      bankId,
      accountNumber: ownerProfile.bank_account_number,
      accountName: ownerProfile.bank_account_holder,
      amount: Number(invoice.total_amount),
      description: transferContent,
    });
    await sendZaloPhoto(
      userId,
      qrUrl,
      [
        ...message,
        "",
        `Ngân hàng: ${ownerProfile.bank_name}`,
        `Số tài khoản: ${ownerProfile.bank_account_number}`,
        `Chủ tài khoản: ${ownerProfile.bank_account_holder}`,
        `Nội dung CK: ${transferContent}`,
        invoice.status === "paid"
          ? "Hóa đơn này đã được ghi nhận thanh toán."
          : "Sau khi chuyển khoản, vui lòng báo chủ nhà xác nhận.",
      ].join("\n")
    );
  } catch (error) {
    logError("zalo_invoice_qr_failed", {
      error: errorMessage(error),
      invoiceCode: invoice.invoice_code,
    });
    await sendZaloText(
      userId,
      [...message, "", "Chưa thể gửi mã QR lúc này. Vui lòng thử lại sau."].join(
        "\n"
      )
    );
  }
}

async function handleServicesCommand(userId: string) {
  const linked = await requireLink(userId);
  if (!linked) return;
  const contract = Array.isArray(linked.link.contracts)
    ? linked.link.contracts[0]
    : linked.link.contracts;
  const services = contract?.contract_services ?? [];
  if (!services.length) {
    await sendZaloText(userId, "Hợp đồng này chưa có dịch vụ.");
    return;
  }

  await sendZaloText(
    userId,
    [
      "DỊCH VỤ TRONG HỢP ĐỒNG",
      "",
      ...services.map((service) => {
        if (service.billing_type === "free") {
          return `• ${service.service_name}: Miễn phí`;
        }
        const type =
          service.billing_type === "metered"
            ? "theo chỉ số"
            : service.billing_type === "per_person"
              ? "theo người/tháng"
              : "cố định";
        return `• ${service.service_name}: ${formatMoney(Number(service.price))}/${service.unit} (${type})`;
      }),
    ].join("\n")
  );
}

async function handleReadingsCommand(userId: string) {
  const linked = await requireLink(userId);
  if (!linked) return;
  const { data: values } = await linked.admin
    .from("meter_reading_values")
    .select(`
      service_name, unit, current_reading, amount, created_at,
      meter_reading_submissions!inner(status, confirmed_at)
    `)
    .eq("account_id", linked.link.account_id)
    .eq("meter_reading_submissions.contract_id", linked.link.contract_id)
    .eq("meter_reading_submissions.status", "confirmed")
    .order("created_at", { ascending: false });

  const latest = new Map<
    string,
    {
      service_name: string;
      unit: string;
      current_reading: number | string;
    }
  >();
  for (const value of values ?? []) {
    if (!latest.has(value.service_name)) latest.set(value.service_name, value);
  }
  if (!latest.size) {
    await sendZaloText(
      userId,
      "Chưa có chỉ số điện/nước nào được xác nhận. Hãy gửi ảnh công tơ rõ nét cho bot."
    );
    return;
  }

  await sendZaloText(
    userId,
    [
      "CHỈ SỐ GẦN NHẤT",
      "",
      ...[...latest.values()].map(
        (value) =>
          `• ${value.service_name}: ${Number(value.current_reading)} ${value.unit}`
      ),
    ].join("\n")
  );
}

async function handleUnlinkCommand(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("zalo_room_links")
    .delete()
    .eq("zalo_user_id", userId)
    .select("id")
    .maybeSingle();

  await sendZaloText(
    userId,
    error
      ? "Không thể gỡ liên kết lúc này."
      : data
        ? "Đã gỡ liên kết Zalo khỏi hợp đồng."
        : "Zalo này hiện chưa liên kết với hợp đồng nào."
  );
}

async function handleLinkCommand(userId: string, text: string) {
  const match = text.trim().match(/^LIENKET\s+(?:(\S+)\s+)?(\d{3})$/i);
  if (!match) return false;

  const [, contractCode, phoneLastThree] = match;
  const admin = createAdminClient();
  let contractQuery = admin
    .from("contracts")
    .select(`
      id, account_id, room_id, contract_code, status,
      tenants!contracts_main_tenant_id_fkey(phone),
      rooms!contracts_room_id_fkey(room_number)
    `)
    .in("status", ["active", "expiring"]);

  if (contractCode) {
    contractQuery = contractQuery.eq("contract_code", contractCode);
  }

  const { data: contracts } = await contractQuery;
  const candidates = (contracts ?? []).filter((contract) => {
    const tenant = Array.isArray(contract.tenants)
      ? contract.tenants[0]
      : contract.tenants;
    return tenant?.phone?.replace(/\D/g, "").endsWith(phoneLastThree);
  });

  if (candidates.length === 0) {
    await sendZaloText(
      userId,
      "Không tìm thấy hợp đồng đang hoạt động có số điện thoại phù hợp. Hãy kiểm tra lại 3 số cuối."
    );
    return true;
  }

  if (candidates.length > 1) {
    await sendZaloText(
      userId,
      "Có nhiều hợp đồng trùng 3 số cuối. Hãy gửi lại theo mẫu:\nLIENKET <mã hợp đồng> <3 số cuối SĐT>"
    );
    return true;
  }

  const contract = candidates[0];
  const room = Array.isArray(contract.rooms)
    ? contract.rooms[0]
    : contract.rooms;
  const { error } = await admin.from("zalo_room_links").upsert(
    {
      account_id: contract.account_id,
      contract_id: contract.id,
      room_id: contract.room_id,
      zalo_user_id: userId,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "contract_id" }
  );

  await sendZaloText(
    userId,
    error
      ? "Chưa thể liên kết Zalo với phòng. Vui lòng thử lại."
      : `Đã liên kết với phòng ${room?.room_number ?? ""}. Từ giờ bạn có thể gửi ảnh công tơ điện hoặc nước.`
  );
  return true;
}

// ---------------------------------------------------------------------------
// Nhóm xác nhận và chỉnh sửa chỉ số công tơ
// ---------------------------------------------------------------------------

type ProposedMeterValue = {
  account_id: string;
  submission_id: string;
  contract_service_id: string;
  service_name: string;
  unit: string;
  unit_price: number;
  previous_reading: number;
  current_reading: number;
  quantity: number;
  amount: number;
  confidence: number;
};

type PendingMeterPayload = {
  ocr?: unknown;
  proposedValues?: ProposedMeterValue[];
  correctedByUser?: boolean;
};

async function latestPendingSubmission(userId: string) {
  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("meter_reading_submissions")
    .select("id, account_id, contract_id, room_id, billing_month, ai_payload")
    .eq("zalo_user_id", userId)
    .eq("status", "awaiting_confirmation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!submission) {
    await sendZaloText(userId, "Không có chỉ số nào đang chờ xác nhận.");
    return null;
  }
  return { admin, submission };
}

async function confirmLatest(userId: string, accepted: boolean) {
  const pending = await latestPendingSubmission(userId);
  if (!pending) return;
  const { admin, submission } = pending;
  const payload = (submission.ai_payload ?? {}) as PendingMeterPayload;
  const values = payload.proposedValues ?? [];
  let insertedRoomReadingIds: string[] = [];

  if (accepted) {
    if (!values.length) {
      await sendZaloText(
        userId,
        "Không tìm thấy chỉ số đề xuất để xác nhận. Vui lòng gửi lại ảnh."
      );
      return;
    }
    const valuesToInsert = values.map((value) => ({
      ...value,
      billing_month: submission.billing_month,
    }));
    const { error: valueError } = await admin
      .from("meter_reading_values")
      .insert(valuesToInsert);
    if (valueError) {
      if (valueError.code === "23505") {
        await admin
          .from("meter_reading_submissions")
          .update({
            status: "rejected",
            error_message: "Chỉ số dịch vụ này đã được xác nhận trong tháng.",
          })
          .eq("id", submission.id)
          .eq("status", "awaiting_confirmation");
        await sendZaloText(
          userId,
          `Chỉ số này đã được xác nhận cho kỳ ${submission.billing_month.slice(0, 7)}. Mỗi loại công tơ chỉ được xác nhận một lần trong tháng.`
        );
        return;
      }
      await sendZaloText(
        userId,
        "Không thể lưu chỉ số đã xác nhận. Vui lòng thử lại."
      );
      return;
    }

    const contractServiceIds = values.map(
      (value) => value.contract_service_id
    );
    const { data: contractServices, error: contractServicesError } =
      await admin
        .from("contract_services")
        .select("id, source_service_id")
        .in("id", contractServiceIds)
        .eq("contract_id", submission.contract_id)
        .eq("account_id", submission.account_id);

    const sourceServiceByContractService = new Map(
      (contractServices ?? [])
        .filter((service) => service.source_service_id)
        .map((service) => [service.id, service.source_service_id as string])
    );
    const roomReadings = values.flatMap((value) => {
      const serviceId = sourceServiceByContractService.get(
        value.contract_service_id
      );
      return serviceId
        ? [
            {
              account_id: submission.account_id,
              room_id: submission.room_id,
              service_id: serviceId,
              contract_id: submission.contract_id,
              reading_type: "monthly",
              reading_value: value.current_reading,
              recorded_at: new Date().toISOString(),
              note: `Chỉ số xác nhận qua Zalo cho kỳ ${submission.billing_month}`,
            },
          ]
        : [];
    });

    const roomReadingResult =
      roomReadings.length > 0
        ? await admin
            .from("room_meter_readings")
            .insert(roomReadings)
            .select("id")
        : { data: [], error: null };
    insertedRoomReadingIds = (roomReadingResult.data ?? []).map(
      (reading) => reading.id
    );
    if (
      contractServicesError ||
      roomReadings.length !== values.length ||
      roomReadingResult.error
    ) {
      await admin
        .from("meter_reading_values")
        .delete()
        .eq("submission_id", submission.id);
      if (insertedRoomReadingIds.length > 0) {
        await admin
          .from("room_meter_readings")
          .delete()
          .in("id", insertedRoomReadingIds);
      }
      await sendZaloText(
        userId,
        "Không thể lưu lịch sử chỉ số của phòng. Vui lòng thử xác nhận lại."
      );
      return;
    }
  }

  const { error: statusError } = await admin
    .from("meter_reading_submissions")
    .update({
      status: accepted ? "confirmed" : "rejected",
      confirmed_at: accepted ? new Date().toISOString() : null,
    })
    .eq("id", submission.id)
    .eq("status", "awaiting_confirmation");

  if (statusError) {
    if (accepted) {
      await admin
        .from("meter_reading_values")
        .delete()
        .eq("submission_id", submission.id);
      if (insertedRoomReadingIds.length > 0) {
        await admin
          .from("room_meter_readings")
          .delete()
          .in("id", insertedRoomReadingIds);
      }
    }
    await sendZaloText(userId, "Không thể cập nhật trạng thái xác nhận.");
    return;
  }

  await sendZaloText(
    userId,
    accepted
      ? "Đã xác nhận chỉ số. Hệ thống sẽ tự lấy số này khi tạo hóa đơn."
      : "Đã bỏ kết quả vừa đọc. Vui lòng chụp rõ mặt đồng hồ và gửi lại."
  );
}

async function correctLatestReading(userId: string, correctedValue: number) {
  const pending = await latestPendingSubmission(userId);
  if (!pending) return;
  const { admin, submission } = pending;
  const payload = (submission.ai_payload ?? {}) as PendingMeterPayload;
  const values = payload.proposedValues ?? [];
  if (values.length !== 1) {
    await sendZaloText(
      userId,
      "Ảnh này có nhiều chỉ số. Hãy gửi lại riêng từng ảnh công tơ."
    );
    return;
  }

  const value = values[0];
  if (!Number.isFinite(correctedValue) || correctedValue < value.previous_reading) {
    await sendZaloText(
      userId,
      `Số đúng phải từ ${value.previous_reading} ${value.unit} trở lên.`
    );
    return;
  }
  const corrected: ProposedMeterValue = {
    ...value,
    current_reading: correctedValue,
    quantity: 0,
    amount: 0,
    confidence: 100,
  };
  const { error } = await admin
    .from("meter_reading_submissions")
    .update({
      ai_payload: {
        ...payload,
        proposedValues: [corrected],
        correctedByUser: true,
      },
    })
    .eq("id", submission.id)
    .eq("status", "awaiting_confirmation");

  if (error) {
    await sendZaloText(userId, "Không thể cập nhật số đúng. Vui lòng thử lại.");
    return;
  }
  await sendZaloText(
    userId,
    `Đã sửa chỉ số ${corrected.service_name} thành ${corrected.current_reading} ${corrected.unit}.\n\nTrả lời OK để lưu hoặc SAI <số đúng> để sửa tiếp.`
  );
}

async function processImage(
  message: ZaloMessage,
  userId: string,
  imageUrl: string
) {
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("zalo_room_links")
    .select("account_id, contract_id, room_id")
    .eq("zalo_user_id", userId)
    .maybeSingle();

  if (!link) {
    await sendZaloText(
      userId,
      "Zalo này chưa liên kết với phòng. Gửi: LIENKET <3 số cuối SĐT>."
    );
    return;
  }

  const { data: olderPending } = await admin
    .from("meter_reading_submissions")
    .select("id")
    .eq("zalo_user_id", userId)
    .eq("status", "awaiting_confirmation");
  const olderPendingIds = (olderPending ?? []).map((item) => item.id);
  if (olderPendingIds.length > 0) {
    await admin
      .from("meter_reading_values")
      .delete()
      .in("submission_id", olderPendingIds);
    await admin
      .from("meter_reading_submissions")
      .update({ status: "rejected" })
      .in("id", olderPendingIds);
  }

  const { data: submission, error: submissionError } = await admin
    .from("meter_reading_submissions")
    .insert({
      account_id: link.account_id,
      contract_id: link.contract_id,
      room_id: link.room_id,
      zalo_user_id: userId,
      zalo_message_id: message.message_id ?? null,
      billing_month: currentBillingMonth(),
      status: "processing",
    })
    .select("id")
    .single();
  if (submissionError || !submission) throw submissionError;

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error("Không tải được ảnh từ Zalo.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 5 * 1024 * 1024) {
      throw new Error("Ảnh vượt quá 5 MB.");
    }
    const contentType = detectImageType(
      bytes,
      response.headers.get("content-type")
    );
    if (!contentType) {
      throw new Error("Nội dung Zalo gửi về không phải ảnh JPEG, PNG hoặc WebP.");
    }

    const extension =
      contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const imagePath = `${link.account_id}/${submission.id}/meter.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("meter-readings")
      .upload(imagePath, bytes, { contentType, upsert: false });
    if (uploadError) throw uploadError;

    const result = await extractMeterReadingsFromImage({
      mimeType: contentType,
      data: bytes.toString("base64"),
    });
    const { data: services } = await admin
      .from("contract_services")
      .select(
        "id, source_service_id, service_name, unit, price, billing_type"
      )
      .eq("contract_id", link.contract_id)
      .eq("account_id", link.account_id);
    const sourceServiceIds = [
      ...new Set(
        (services ?? [])
          .map((service) => service.source_service_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const { data: currentServices } =
      sourceServiceIds.length > 0
        ? await admin
            .from("services")
            .select("id, billing_type")
            .eq("account_id", link.account_id)
            .in("id", sourceServiceIds)
        : { data: [] };
    const currentBillingTypeByService = new Map(
      (currentServices ?? []).map((service) => [
        service.id,
        service.billing_type,
      ])
    );

    const values: ProposedMeterValue[] = [];
    const ignoredNonMeteredServices = new Set<string>();
    const alreadyConfirmedServices = new Set<string>();
    const billingMonth = currentBillingMonth();
    const { data: confirmedThisMonth } = await admin
      .from("meter_reading_values")
      .select("contract_service_id")
      .eq("account_id", link.account_id)
      .eq("billing_month", billingMonth);
    const confirmedServiceIds = new Set(
      (confirmedThisMonth ?? []).map((value) => value.contract_service_id)
    );
    for (const reading of result.data.readings) {
      const readingSignal = normalized(
        `${reading.type} ${reading.unit} ${result.data.notes}`
      );
      const expectedName =
        reading.type === "electric" ||
        readingSignal.includes("kwh") ||
        readingSignal.includes("dien")
          ? "dien"
          : reading.type === "water" ||
              readingSignal.includes("m3") ||
              readingSignal.includes("nuoc")
            ? "nuoc"
            : "";
      const service = (services ?? []).find((item) =>
        expectedName
          ? normalized(item.service_name).includes(expectedName)
          : false
      );
      if (!service) continue;
      const effectiveBillingType = service.source_service_id
        ? currentBillingTypeByService.get(service.source_service_id) ??
          service.billing_type
        : service.billing_type;
      if (effectiveBillingType !== "metered") {
        ignoredNonMeteredServices.add(service.service_name);
        continue;
      }
      if (confirmedServiceIds.has(service.id)) {
        alreadyConfirmedServices.add(service.service_name);
        continue;
      }

      const { data: previousValue } = await admin
        .from("meter_reading_values")
        .select("current_reading, meter_reading_submissions!inner(status)")
        .eq("contract_service_id", service.id)
        .eq("meter_reading_submissions.status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const previous = Number(previousValue?.current_reading ?? 0);
      if (reading.value < previous) continue;
      values.push({
        account_id: link.account_id,
        submission_id: submission.id,
        contract_service_id: service.id,
        service_name: service.service_name,
        unit: service.unit,
        unit_price: Number(service.price),
        previous_reading: previous,
        current_reading: reading.value,
        quantity: 0,
        amount: 0,
        confidence: reading.confidence,
      });
    }

    if (!result.data.readings.length || result.data.imageQuality === "unreadable") {
      throw new Error(
        `AI không đọc được dãy số trong ảnh (${result.provider}/${result.model}).`
      );
    }
    if (!values.length) {
      if (alreadyConfirmedServices.size > 0) {
        throw new Error(
          `${[...alreadyConfirmedServices].join(", ")} đã được xác nhận cho kỳ ${billingMonth.slice(0, 7)}. Mỗi loại công tơ chỉ được xác nhận một lần trong tháng.`
        );
      }
      if (ignoredNonMeteredServices.size > 0) {
        throw new Error(
          `${[...ignoredNonMeteredServices].join(", ")} đang được tính theo người/tháng hoặc phí cố định nên không cần gửi ảnh công tơ.`
        );
      }
      throw new Error(
        `AI đọc được ${result.data.readings.length} chỉ số nhưng chưa xác định được đó là điện hay nước.`
      );
    }
    await admin
      .from("meter_reading_submissions")
      .update({
        image_path: imagePath,
        status: "awaiting_confirmation",
        ai_provider: result.provider,
        ai_model: result.model,
        ai_payload: {
          ocr: result.data,
          proposedValues: values,
          correctedByUser: false,
        },
      })
      .eq("id", submission.id);

    const lines = values.map(
      (value) =>
        `${value.service_name}: ${value.current_reading} ${value.unit}`
    );
    await sendZaloText(
      userId,
      `AI đọc được (CHƯA LƯU):\n${lines.join("\n\n")}\n\nNếu đúng, trả lời: OK\nNếu sai, trả lời: SAI <số đúng>\nVí dụ: SAI 4040`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể xử lý ảnh.";
    logError("zalo_meter_image_failed", {
      error: message,
      submissionId: submission.id,
    });
    await admin
      .from("meter_reading_submissions")
      .update({ status: "failed", error_message: message })
      .eq("id", submission.id);
    await sendZaloText(
      userId,
      `Không xử lý được ảnh công tơ: ${message}\nHãy chụp thẳng, đủ sáng và thấy rõ toàn bộ dãy số rồi gửi lại.`
    );
  }
}

// ---------------------------------------------------------------------------
// Bộ định tuyến tin nhắn và HTTP handlers
// ---------------------------------------------------------------------------

async function processWebhook(payload: ZaloWebhook) {
  const message = webhookMessage(payload);
  const userId = message?.chat?.id || message?.from?.id || "";
  const imageUrl = message ? messageImageUrl(message) : "";
  logInfo("zalo_webhook_parsed", {
    eventName: webhookEventName(payload),
    hasMessage: Boolean(message),
    hasChatId: Boolean(userId),
    hasText: Boolean(message?.text),
    hasPhoto: Boolean(imageUrl),
  });
  if (!message || !userId) {
    throw new Error("Payload Zalo không có result.message.chat.id.");
  }

  const text = message.text?.trim() ?? message.caption?.trim() ?? "";
  const command = normalized(text).replace(/\s+/g, "");
  if (["help", "menu", "lenh"].includes(command)) {
    await sendZaloText(userId, helpMessage);
    return;
  }
  if (["check", "kiemtra", "hopdong"].includes(command)) {
    await handleCheckCommand(userId);
    return;
  }
  if (["hoadon", "bill"].includes(command)) {
    await handleInvoiceCommand(userId);
    return;
  }
  if (["dichvu", "giadichvu"].includes(command)) {
    await handleServicesCommand(userId);
    return;
  }
  if (["chiso", "diennuoc"].includes(command)) {
    await handleReadingsCommand(userId);
    return;
  }
  if (["guianh", "congto"].includes(command)) {
    await sendZaloText(
      userId,
      "HƯỚNG DẪN GỬI ẢNH\n\n• Chụp thẳng mặt công tơ\n• Ảnh đủ sáng và rõ toàn bộ dãy số\n• Gửi riêng từng ảnh điện hoặc nước\n• Bot chỉ đề xuất, chưa lưu ngay\n• Đúng: trả lời OK\n• Sai: trả lời SAI <số đúng>, ví dụ SAI 4040"
    );
    return;
  }
  if (command === "huylienket") {
    await handleUnlinkCommand(userId);
    return;
  }
  if (text && (await handleLinkCommand(userId, text))) return;
  if (/^OK$/i.test(text)) return confirmLatest(userId, true);
  const correction = text.match(
    /^SAI\s*(?:\(|:|-)?\s*([\d.,]+)\s*\)?$/i
  );
  if (correction) {
    return correctLatestReading(
      userId,
      parseCorrectedReading(correction[1])
    );
  }
  if (/^SAI$/i.test(text)) return confirmLatest(userId, false);

  if (imageUrl) return processImage(message, userId, imageUrl);

  if (webhookEventName(payload) === "message.image.received") {
    await sendZaloText(
      userId,
      "Bot đã nhận sự kiện ảnh nhưng Zalo không gửi kèm đường dẫn ảnh. Vui lòng thử gửi lại ảnh gốc thay vì chuyển tiếp."
    );
    return;
  }

  await sendZaloText(
    userId,
    `Mình chưa hiểu lệnh này.\n\n${helpMessage}`
  );
}

export async function handleZaloWebhookGet(request: Request) {
  if (!webhookAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (new URL(request.url).searchParams.get("health") === "1") {
    return NextResponse.json({
      ok: true,
      configured: {
        webhookSecret: Boolean(process.env.ZALO_WEBHOOK_SECRET),
        botToken: Boolean(process.env.ZALO_BOT_TOKEN),
        supabaseSecret: Boolean(
          process.env.SUPABASE_SECRET_KEY ||
            process.env.SUPABASE_SERVICE_ROLE_KEY
        ),
      },
    });
  }
  const challenge = new URL(request.url).searchParams.get("challenge");
  return new NextResponse(challenge || "Zalo webhook ready");
}

export async function handleZaloWebhookPost(request: Request) {
  const startedAt = Date.now();
  if (!webhookAuthorized(request)) {
    logWarning("zalo_webhook_unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = (await request.json()) as ZaloWebhook;
  logInfo("zalo_webhook_received", {
    eventName: webhookEventName(payload),
    topLevelKeys: Object.keys(payload).slice(0, 10),
    resultKeys:
      payload.result && typeof payload.result === "object"
        ? Object.keys(payload.result).slice(0, 10)
        : [],
    messageKeys:
      payload.message && typeof payload.message === "object"
        ? Object.keys(payload.message).slice(0, 10)
        : payload.result?.message &&
            typeof payload.result.message === "object"
          ? Object.keys(payload.result.message).slice(0, 10)
          : [],
  });
  after(async () => {
    try {
      await processWebhook(payload);
      logInfo("zalo_webhook_completed", {
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      logError("zalo_webhook_failed", {
        error: errorMessage(error),
        durationMs: Date.now() - startedAt,
      });
    }
  });
  return NextResponse.json({ received: true });
}
