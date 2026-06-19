import { after, NextResponse } from "next/server";
import { extractMeterReadingsFromImage } from "@/lib/ai/gateway";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendZaloText } from "@/lib/zalo/client";

export const runtime = "nodejs";

type ZaloWebhook = {
  event_name?: string;
  timestamp?: string | number;
  sender?: { id?: string };
  user_id_by_app?: string;
  message?: {
    msg_id?: string;
    text?: string;
    attachments?: Array<{
      type?: string;
      payload?: { url?: string; thumbnail?: string };
    }>;
  };
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

function senderId(payload: ZaloWebhook) {
  return payload.sender?.id || payload.user_id_by_app || "";
}

function firstImageUrl(payload: ZaloWebhook) {
  return payload.message?.attachments?.find(
    (attachment) => attachment.type === "image"
  )?.payload?.url;
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

async function handleLinkCommand(userId: string, text: string) {
  const match = text.trim().match(/^LIENKET\s+(\S+)\s+(\d{4})$/i);
  if (!match) return false;

  const [, contractCode, phoneLastFour] = match;
  const admin = createAdminClient();
  const { data: contracts } = await admin
    .from("contracts")
    .select(`
      id, account_id, room_id, contract_code, status,
      tenants!contracts_main_tenant_id_fkey(phone),
      rooms!contracts_room_id_fkey(room_number)
    `)
    .eq("contract_code", contractCode)
    .in("status", ["active", "expiring"]);

  const candidates = (contracts ?? []).filter((contract) => {
    const tenant = Array.isArray(contract.tenants)
      ? contract.tenants[0]
      : contract.tenants;
    return tenant?.phone?.replace(/\D/g, "").endsWith(phoneLastFour);
  });

  if (candidates.length !== 1) {
    await sendZaloText(
      userId,
      "Không tìm thấy hợp đồng phù hợp. Kiểm tra lại mã hợp đồng và 4 số cuối điện thoại."
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

async function processImage(payload: ZaloWebhook, userId: string, imageUrl: string) {
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("zalo_room_links")
    .select("account_id, contract_id, room_id")
    .eq("zalo_user_id", userId)
    .maybeSingle();

  if (!link) {
    await sendZaloText(
      userId,
      "Zalo này chưa liên kết với phòng. Gửi: LIENKET <mã hợp đồng> <4 số cuối SĐT>."
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
      zalo_message_id: payload.message?.msg_id ?? null,
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
  const userId = senderId(payload);
  if (!userId) return;

  const text = payload.message?.text?.trim() ?? "";
  if (text && (await handleLinkCommand(userId, text))) return;
  if (/^OK$/i.test(text)) return confirmLatest(userId, true);
  if (/^SAI$/i.test(text)) return confirmLatest(userId, false);

  const imageUrl = firstImageUrl(payload);
  if (imageUrl) return processImage(payload, userId, imageUrl);
}

export async function GET(request: Request) {
  if (!webhookAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const challenge = new URL(request.url).searchParams.get("challenge");
  return new NextResponse(challenge || "Zalo webhook ready");
}

export async function POST(request: Request) {
  if (!webhookAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = (await request.json()) as ZaloWebhook;
  after(async () => {
    try {
      await processWebhook(payload);
    } catch (error) {
      console.error("Zalo webhook processing failed", error);
    }
  });
  return NextResponse.json({ received: true });
}
