"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedClient } from "@/lib/server/auth";
import { isUuid } from "@/lib/server/action-utils";
import type { ServerActionResult } from "@/lib/server/action-result";
import {
  invoiceTransferContent,
  resolveVietQrBankId,
  vietQrImageUrl,
} from "@/lib/vietqr";
import { sendZaloPhoto } from "@/lib/zalo/client";

const INVOICES_PATH = "/dashboard/invoices";

export type InvoiceActionResult = ServerActionResult;

export interface CreateInvoiceInput {
  contractId: string;
  billingMonth: string;
  dueDate: string;
  note: string;
  additionalName: string;
  additionalAmount: number;
  readings: Record<string, number>;
}

export interface CreateBulkInvoicesInput {
  contractIds: string[];
  billingMonth: string;
  dueDate: string;
  readingsByContract: Record<string, Record<string, number>>;
}

export async function createInvoiceAction(
  input: CreateInvoiceInput
): Promise<InvoiceActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return { success: false, message: "Phiên đăng nhập đã hết hạn." };

  const billingMonth = /^\d{4}-\d{2}$/.test(input.billingMonth)
    ? `${input.billingMonth}-01`
    : "";
  const additionalAmount = Number(input.additionalAmount);
  if (
    !isUuid(input.contractId) ||
    !billingMonth ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) ||
    !Number.isSafeInteger(additionalAmount) ||
    additionalAmount < 0
  ) {
    return { success: false, message: "Vui lòng kiểm tra thông tin hóa đơn." };
  }

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select(`
      id, room_id, main_tenant_id, monthly_rent, status,
      contract_members(id),
      contract_services(
        id, source_service_id, service_name, unit, price, billing_type,
        opening_reading
      )
    `)
    .eq("id", input.contractId)
    .eq("account_id", user.id)
    .in("status", ["active", "expiring"])
    .maybeSingle();

  if (contractError || !contract) {
    return { success: false, message: "Hợp đồng không còn hiệu lực hoặc không tồn tại." };
  }

  const services = contract.contract_services ?? [];
  const residentCount = 1 + (contract.contract_members?.length ?? 0);
  const serviceIds = services.map((service) => service.id);
  const previousByService = new Map<string, number>();
  const confirmedReadingsByService = new Map<string, number[]>();
  if (serviceIds.length > 0) {
    const [previousItemsResult, confirmedReadingsResult] = await Promise.all([
      supabase
        .from("invoice_items")
        .select(`
          source_contract_service_id, current_reading, created_at,
          invoices!inner(contract_id, status)
        `)
        .eq("account_id", user.id)
        .eq("invoices.contract_id", input.contractId)
        .neq("invoices.status", "cancelled")
        .in("source_contract_service_id", serviceIds)
        .not("current_reading", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("meter_reading_values")
        .select(`
          contract_service_id, current_reading, created_at,
          meter_reading_submissions!inner(status)
        `)
        .eq("account_id", user.id)
        .in("contract_service_id", serviceIds)
        .eq("meter_reading_submissions.status", "confirmed")
        .order("created_at", { ascending: false }),
    ]);

    for (const item of previousItemsResult.data ?? []) {
      if (
        item.source_contract_service_id &&
        !previousByService.has(item.source_contract_service_id)
      ) {
        previousByService.set(
          item.source_contract_service_id,
          Number(item.current_reading)
        );
      }
    }

    for (const reading of confirmedReadingsResult.data ?? []) {
      const values =
        confirmedReadingsByService.get(reading.contract_service_id) ?? [];
      values.push(Number(reading.current_reading));
      confirmedReadingsByService.set(reading.contract_service_id, values);
    }
  }

  const items: Array<Record<string, unknown>> = [
    {
      account_id: user.id,
      item_type: "rent",
      item_name: "Tiền phòng",
      unit: "tháng",
      billing_type: "fixed",
      unit_price: Number(contract.monthly_rent),
      quantity: 1,
      amount: Number(contract.monthly_rent),
      sort_order: 0,
    },
  ];

  for (const [index, service] of services.entries()) {
    const price = Number(service.price);
    let quantity = 1;
    let amount = price;
    let previousReading: number | null = null;
    let currentReading: number | null = null;

    if (service.billing_type === "free") {
      amount = 0;
    } else if (service.billing_type === "per_person") {
      quantity = residentCount;
      amount = residentCount * price;
    } else if (service.billing_type === "metered") {
      currentReading = Number(input.readings[service.id]);
      const invoicedReading = previousByService.get(service.id);
      if (invoicedReading !== undefined) {
        previousReading = invoicedReading;
      } else if (service.opening_reading != null) {
        previousReading = Number(service.opening_reading);
      } else {
        const confirmedReadings =
          confirmedReadingsByService.get(service.id) ?? [];
        const currentIndex = confirmedReadings.findIndex(
          (reading) => reading === currentReading
        );
        previousReading =
          currentIndex >= 0
            ? confirmedReadings[currentIndex + 1] ?? null
            : confirmedReadings.find(
                (reading) => reading < currentReading!
              ) ?? null;
      }

      if (previousReading === null) {
        return {
          success: false,
          message: `Chưa có chỉ số cũ của ${service.service_name}. Cần xác nhận ít nhất hai lần đọc công tơ trước khi lập hóa đơn đầu tiên.`,
        };
      }
      if (
        !Number.isFinite(currentReading) ||
        currentReading < previousReading
      ) {
        return {
          success: false,
          message: `Chỉ số mới của ${service.service_name} phải từ ${previousReading} trở lên.`,
        };
      }
      quantity = currentReading - previousReading;
      amount = Math.round(quantity * price);
    }

    items.push({
      account_id: user.id,
      source_contract_service_id: service.id,
      item_type: "service",
      item_name: service.service_name,
      unit: service.unit,
      billing_type: service.billing_type,
      unit_price: price,
      previous_reading: previousReading,
      current_reading: currentReading,
      quantity,
      amount,
      sort_order: (index + 1) * 10,
    });
  }

  if (additionalAmount > 0) {
    items.push({
      account_id: user.id,
      item_type: "additional",
      item_name: input.additionalName.trim().slice(0, 120) || "Phí phát sinh",
      unit: "lần",
      billing_type: "fixed",
      unit_price: additionalAmount,
      quantity: 1,
      amount: additionalAmount,
      sort_order: 1000,
    });
  }

  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const code = `HĐ-${input.billingMonth.replace("-", "")}-${crypto
    .randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      account_id: user.id,
      contract_id: contract.id,
      room_id: contract.room_id,
      tenant_id: contract.main_tenant_id,
      invoice_code: code,
      billing_month: billingMonth,
      due_date: input.dueDate,
      status: "issued",
      subtotal: total,
      total_amount: total,
      note: input.note.trim().slice(0, 1000) || null,
      issued_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    return {
      success: false,
      message: invoiceError?.code === "23505"
        ? "Hợp đồng này đã có hóa đơn trong tháng đã chọn."
        : "Không thể tạo hóa đơn.",
    };
  }

  const { error: itemError } = await supabase
    .from("invoice_items")
    .insert(items.map((item) => ({ ...item, invoice_id: invoice.id })));
  if (itemError) {
    await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id)
      .eq("account_id", user.id);
    return { success: false, message: "Không thể lưu chi tiết hóa đơn." };
  }

  revalidatePath(INVOICES_PATH);
  return { success: true, message: `Đã tạo hóa đơn ${code}.` };
}

export async function markInvoicePaidAction(
  invoiceId: string
): Promise<InvoiceActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user || !isUuid(invoiceId)) {
    return { success: false, message: "Yêu cầu không hợp lệ." };
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("account_id", user.id)
    .eq("status", "issued")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, message: "Không thể xác nhận thanh toán hóa đơn." };
  }
  revalidatePath(INVOICES_PATH);
  return { success: true, message: "Đã xác nhận hóa đơn được thanh toán." };
}

export async function cancelInvoiceAction(
  invoiceId: string
): Promise<InvoiceActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user || !isUuid(invoiceId)) {
    return { success: false, message: "Yêu cầu không hợp lệ." };
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", invoiceId)
    .eq("account_id", user.id)
    .in("status", ["draft", "issued"])
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, message: "Không thể hủy hóa đơn này." };
  }
  revalidatePath(INVOICES_PATH);
  return { success: true, message: "Đã hủy hóa đơn." };
}

export async function deletePaidInvoiceAction(
  invoiceId: string
): Promise<InvoiceActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user || !isUuid(invoiceId)) {
    return { success: false, message: "Yêu cầu không hợp lệ." };
  }

  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("account_id", user.id)
    .eq("status", "paid")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      message: "Chỉ có thể xóa hóa đơn đã thanh toán trong chế độ thử nghiệm.",
    };
  }
  revalidatePath(INVOICES_PATH);
  return { success: true, message: "Đã xóa hóa đơn đã thanh toán." };
}

export async function createBulkInvoicesAction(
  input: CreateBulkInvoicesInput
): Promise<InvoiceActionResult> {
  const contractIds = [...new Set(input.contractIds)].filter(isUuid);
  if (
    contractIds.length === 0 ||
    !/^\d{4}-\d{2}$/.test(input.billingMonth) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)
  ) {
    return { success: false, message: "Vui lòng kiểm tra thông tin tạo hàng loạt." };
  }

  let created = 0;
  let skipped = 0;
  const concurrency = 3;

  for (let offset = 0; offset < contractIds.length; offset += concurrency) {
    const batch = contractIds.slice(offset, offset + concurrency);
    const results = await Promise.all(
      batch.map((contractId) =>
        createInvoiceAction({
          contractId,
          billingMonth: input.billingMonth,
          dueDate: input.dueDate,
          note: "",
          additionalName: "",
          additionalAmount: 0,
          readings: input.readingsByContract[contractId] ?? {},
        })
      )
    );

    for (const result of results) {
      if (result.success) created += 1;
      else skipped += 1;
    }
  }

  revalidatePath(INVOICES_PATH);
  return {
    success: created > 0,
    message:
      skipped > 0
        ? `Đã tạo ${created} hóa đơn, bỏ qua ${skipped} phòng thiếu dữ liệu hoặc đã có hóa đơn.`
        : `Đã tạo thành công ${created} hóa đơn.`,
  };
}

export async function sendInvoiceZaloAction(
  invoiceId: string
): Promise<InvoiceActionResult> {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user || !isUuid(invoiceId)) {
    return { success: false, message: "Yêu cầu không hợp lệ." };
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      invoice_code, contract_id, billing_month, due_date, status, total_amount,
      rooms!invoices_room_id_fkey(room_number),
      invoice_items(item_name, amount)
    `)
    .eq("id", invoiceId)
    .eq("account_id", user.id)
    .maybeSingle();
  if (error || !invoice) {
    return { success: false, message: "Không tìm thấy hóa đơn." };
  }

  const { data: link } = await supabase
    .from("zalo_room_links")
    .select("zalo_user_id")
    .eq("contract_id", invoice.contract_id)
    .eq("account_id", user.id)
    .maybeSingle();
  if (!link) {
    return {
      success: false,
      message: "Phòng này chưa liên kết với Zalo Bot.",
    };
  }

  const { data: ownerProfile } = await supabase
    .from("owner_profiles")
    .select("bank_name, bank_account_number, bank_account_holder")
    .eq("account_id", user.id)
    .maybeSingle();
  if (
    !ownerProfile?.bank_name ||
    !ownerProfile.bank_account_number ||
    !ownerProfile.bank_account_holder
  ) {
    return {
      success: false,
      message:
        "Chưa có đủ thông tin ngân hàng. Hãy cập nhật trong Cài đặt → Ngân hàng.",
    };
  }

  const room = Array.isArray(invoice.rooms) ? invoice.rooms[0] : invoice.rooms;
  const details = (invoice.invoice_items ?? [])
    .map(
      (item) =>
        `• ${item.item_name}: ${Number(item.amount).toLocaleString("vi-VN")}đ`
    )
    .join("\n");
  try {
    const bankId = await resolveVietQrBankId(ownerProfile.bank_name);
    const transferContent = invoiceTransferContent(invoice.invoice_code);
    const qrUrl = vietQrImageUrl({
      bankId,
      accountNumber: ownerProfile.bank_account_number,
      accountName: ownerProfile.bank_account_holder,
      amount: Number(invoice.total_amount),
      description: transferContent,
    });
    await sendZaloPhoto(
      link.zalo_user_id,
      qrUrl,
      [
        `HÓA ĐƠN PHÒNG ${room?.room_number ?? ""}`,
        `Mã: ${invoice.invoice_code}`,
        `Kỳ: ${invoice.billing_month.slice(0, 7)}`,
        `Hạn thanh toán: ${invoice.due_date.split("-").reverse().join("/")}`,
        "",
        details,
        "",
        `TỔNG CỘNG: ${Number(invoice.total_amount).toLocaleString("vi-VN")}đ`,
        `Nội dung CK: ${transferContent}`,
        "",
        invoice.status === "paid"
          ? "Trạng thái: Đã thanh toán"
          : "Quét QR để thanh toán. Sau khi tiền về, chủ nhà sẽ xác nhận trên hệ thống.",
      ].join("\n")
    );
  } catch (sendError) {
    return {
      success: false,
      message:
        sendError instanceof Error
          ? sendError.message
          : "Không thể gửi thông báo Zalo.",
    };
  }

  return { success: true, message: "Đã gửi thông báo hóa đơn qua Zalo." };
}
