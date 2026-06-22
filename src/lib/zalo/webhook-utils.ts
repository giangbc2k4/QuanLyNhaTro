import "server-only";

export type ZaloWebhook = {
  ok?: boolean;
  result?: {
    event_name?: string;
    message?: ZaloMessage;
  };
  event_name?: string;
  message?: ZaloMessage;
};

export type ZaloMessage = {
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

export const helpMessage = [
  "CÁC LỆNH CỦA BOT",
  "",
  "LIENKET <3 số cuối SĐT> — Liên kết Zalo với phòng",
  "Ví dụ: LIENKET 529",
  "CHECK — Xem hợp đồng và phòng đang thuê",
  "HOADON — Xem hóa đơn gần nhất kèm mã QR",
  "DICHVU — Xem dịch vụ và đơn giá",
  "CHISO — Xem chỉ số điện/nước gần nhất",
  "GUIANH — Hướng dẫn gửi ảnh công tơ",
  "HUYLIENKET — Gỡ liên kết Zalo",
  "HELP — Xem lại danh sách lệnh",
].join("\n");

export function webhookAuthorized(request: Request) {
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

export function webhookMessage(payload: ZaloWebhook) {
  return payload.result?.message ?? payload.message;
}

export function webhookEventName(payload: ZaloWebhook) {
  return payload.result?.event_name ?? payload.event_name ?? null;
}

export function messageImageUrl(message: ZaloMessage) {
  return message.photo_url || message.photo || "";
}

export function detectImageType(
  bytes: Buffer,
  responseContentType: string | null
) {
  const headerType = responseContentType?.split(";")[0].trim().toLowerCase();
  if (
    headerType === "image/jpeg" ||
    headerType === "image/png" ||
    headerType === "image/webp"
  ) {
    return headerType;
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export function currentVietnamDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function currentBillingMonth() {
  return `${currentVietnamDate().slice(0, 7)}-01`;
}

export function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

export function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function parseCorrectedReading(raw: string) {
  let value = raw.replace(/\s/g, "");
  if (value.includes(".") && value.includes(",")) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (value.includes(",")) {
    const decimalLength = value.length - value.lastIndexOf(",") - 1;
    value =
      decimalLength <= 2
        ? value.replace(",", ".")
        : value.replace(/,/g, "");
  } else if (value.includes(".")) {
    const parts = value.split(".");
    if (parts.length > 2) value = parts.join("");
    else if (parts[1]?.length === 3) value = parts.join("");
  }
  return Number(value);
}

export function invoiceStatusLabel(status: string, dueDate: string) {
  if (status === "paid") return "Đã thanh toán";
  if (status === "cancelled") return "Đã hủy";
  if (status === "draft") return "Bản nháp";
  return dueDate < new Date().toISOString().slice(0, 10)
    ? "Quá hạn"
    : "Chưa thanh toán";
}
