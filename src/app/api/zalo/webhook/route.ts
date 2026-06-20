import { after, NextResponse } from "next/server";
import { extractMeterReadingsFromImage } from "@/lib/ai/gateway";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendZaloText } from "@/lib/zalo/client";

export const runtime = "nodejs";

type ZaloWebhook = {
  ok?: boolean;
  result?: {
    event_name?: string;
    message?: ZaloMessage;
  };
  event_name?: string;
  message?: ZaloMessage;
};

type ZaloMessage = {
  from?: {
    id?: string;
    display_name?: string;
    is_bot?: boolean;
  };
  chat?: {
    id?: string;
    chat_type?: "PRIVATE" | "GROUP";
  };
  message_id?: string;
  date?: number;
  text?: string;
  photo?: string;
  photo_url?: string;
  caption?: string;
};

function webhookAuthorized(request: Request) {
  const configured = process.env.ZALO_WEBHOOK_SECRET;
  if (!configured) return false;
  const authorization = request.headers.get("authorization");
  const received =
    request.headers.get("x-bot-api-secret-token") ||
    request.headers.get("x-zalo-secret-token") ||
    request.headers.get("x-webhook-secret") ||
    (authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null) ||
    new URL(request.url).searchParams.get("secret");
  return received === configured;
}

function webhookMessage(payload: ZaloWebhook) {
  return payload.result?.message ?? payload.message;
}

function webhookEventName(payload: ZaloWebhook) {
  return payload.result?.event_name ?? payload.event_name ?? null;
}

function messageImageUrl(message: ZaloMessage) {
  return message.photo_url || message.photo || "";
}

function currentBillingMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-01`;
}

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function invoiceStatusLabel(status: string, dueDate: string) {
  if (status === "paid") return "Đã thanh toán";
  if (status === "cancelled") return "Đã hủy";
  if (status === "draft") return "Bản nháp";
  return dueDate < new Date().toISOString().slice(0, 10)
    ? "Quá hạn"
    : "Chưa thanh toán";
}

const helpMessage = [
  "CÁC LỆNH CỦA BOT",
  "",
  "CHECK — Xem hợp đồng và phòng đang thuê",
  "HOADON — Xem hóa đơn gần nhất",
  "DICHVU — Xem dịch vụ và đơn giá",
  "CHISO — Xem chỉ số điện/nước gần nhất",
  "GUIANH — Hướng dẫn gửi ảnh công tơ",
  "HUYLIENKET — Gỡ liên kết Zalo",
  "HELP — Xem lại danh sách lệnh",
].join("\n");

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

  const { data: invoice } = await linked.admin
    .from("invoices")
    .select(`
      invoice_code, billing_month, due_date, status, total_amount, paid_at,
      invoice_items(item_name, unit, unit_price, quantity, amount, billing_type)
    `)
    .eq("contract_id", linked.link.contract_id)
    .neq("status", "cancelled")
    .order("billing_month", { ascending: false })
    .limit(1)
    .maybeSingle();

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
  await sendZaloText(
    userId,
    [
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
    ].join("\n")
  );
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
          service.billing_type === "metered" ? "theo chỉ số" : "cố định";
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

async function confirmLatest(userId: string, accepted: boolean) {
  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("meter_reading_submissions")
    .select("id")
    .eq("zalo_user_id", userId)
    .eq("status", "awaiting_confirmation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!submission) {
    await sendZaloText(userId, "Không có chỉ số nào đang chờ xác nhận.");
    return;
  }

  await admin
    .from("meter_reading_submissions")
    .update({
      status: accepted ? "confirmed" : "rejected",
      confirmed_at: accepted ? new Date().toISOString() : null,
    })
    .eq("id", submission.id);

  await sendZaloText(
    userId,
    accepted
      ? "Đã xác nhận chỉ số. Hệ thống sẽ tự lấy số này khi tạo hóa đơn."
      : "Đã bỏ kết quả vừa đọc. Vui lòng chụp rõ mặt đồng hồ và gửi lại."
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
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      throw new Error("Định dạng ảnh không được hỗ trợ.");
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 5 * 1024 * 1024) {
      throw new Error("Ảnh vượt quá 5 MB.");
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
      .select("id, service_name, unit, price, billing_type")
      .eq("contract_id", link.contract_id)
      .eq("account_id", link.account_id)
      .eq("billing_type", "metered");

    const values: Array<Record<string, unknown>> = [];
    for (const reading of result.data.readings) {
      const expectedName =
        reading.type === "electric" ? "dien" : reading.type === "water" ? "nuoc" : "";
      const service = (services ?? []).find((item) =>
        expectedName ? normalized(item.service_name).includes(expectedName) : false
      );
      if (!service) continue;

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
      const quantity = reading.value - previous;
      values.push({
        account_id: link.account_id,
        submission_id: submission.id,
        contract_service_id: service.id,
        service_name: service.service_name,
        unit: service.unit,
        unit_price: Number(service.price),
        previous_reading: previous,
        current_reading: reading.value,
        quantity,
        amount: Math.round(quantity * Number(service.price)),
        confidence: reading.confidence,
      });
    }

    if (!values.length || result.data.imageQuality === "unreadable") {
      throw new Error("AI không đọc được chỉ số phù hợp trong ảnh.");
    }
    await admin.from("meter_reading_values").insert(values);
    await admin
      .from("meter_reading_submissions")
      .update({
        image_path: imagePath,
        status: "awaiting_confirmation",
        ai_provider: result.provider,
        ai_model: result.model,
        ai_payload: result.data,
      })
      .eq("id", submission.id);

    const lines = values.map(
      (value) =>
        `${value.service_name}: ${value.current_reading} ${value.unit}\n` +
        `Tiêu thụ: ${value.quantity} ${value.unit} × ${Number(value.unit_price).toLocaleString("vi-VN")}đ = ${Number(value.amount).toLocaleString("vi-VN")}đ`
    );
    await sendZaloText(
      userId,
      `AI đọc được:\n${lines.join("\n\n")}\n\nTrả lời OK để xác nhận hoặc SAI để gửi ảnh lại.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể xử lý ảnh.";
    await admin
      .from("meter_reading_submissions")
      .update({ status: "failed", error_message: message })
      .eq("id", submission.id);
    await sendZaloText(
      userId,
      "Không đọc được ảnh công tơ. Hãy chụp thẳng, đủ sáng và thấy rõ toàn bộ dãy số."
    );
  }
}

async function processWebhook(payload: ZaloWebhook) {
  const message = webhookMessage(payload);
  const userId = message?.chat?.id || message?.from?.id || "";
  const imageUrl = message ? messageImageUrl(message) : "";
  console.log(
    JSON.stringify({
      level: "info",
      message: "zalo_webhook_parsed",
      eventName: webhookEventName(payload),
      hasMessage: Boolean(message),
      hasChatId: Boolean(userId),
      hasText: Boolean(message?.text),
      hasPhoto: Boolean(imageUrl),
    })
  );
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
      "HƯỚNG DẪN GỬI ẢNH\n\n• Chụp thẳng mặt công tơ\n• Ảnh đủ sáng và rõ toàn bộ dãy số\n• Gửi riêng từng ảnh điện hoặc nước\n• Bot sẽ đọc số và yêu cầu bạn trả lời OK hoặc SAI"
    );
    return;
  }
  if (command === "huylienket") {
    await handleUnlinkCommand(userId);
    return;
  }
  if (text && (await handleLinkCommand(userId, text))) return;
  if (/^OK$/i.test(text)) return confirmLatest(userId, true);
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

export async function GET(request: Request) {
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

export async function POST(request: Request) {
  const startedAt = Date.now();
  if (!webhookAuthorized(request)) {
    console.warn(
      JSON.stringify({
        level: "warning",
        message: "zalo_webhook_unauthorized",
      })
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = (await request.json()) as ZaloWebhook;
  console.log(
    JSON.stringify({
      level: "info",
      message: "zalo_webhook_received",
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
    })
  );
  after(async () => {
    try {
      await processWebhook(payload);
      console.log(
        JSON.stringify({
          level: "info",
          message: "zalo_webhook_completed",
          durationMs: Date.now() - startedAt,
        })
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "zalo_webhook_failed",
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startedAt,
        })
      );
    }
  });
  return NextResponse.json({ received: true });
}
