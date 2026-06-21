import InvoicesClient, {
  type InvoiceContractOption,
  type InvoicePaymentAccount,
  type InvoiceView,
} from "@/components/invoices/InvoicesClient";
import DashboardDataError from "@/components/dashboard/DashboardDataError";
import { createClient } from "@/lib/supabase/server";
import { resolveVietQrBankId } from "@/lib/vietqr";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const [
    invoicesResult,
    contractsResult,
    readingsResult,
    confirmedResult,
    ownerProfileResult,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select(`
        id, contract_id, invoice_code, billing_month, due_date, status, total_amount,
        note, issued_at, paid_at,
        rooms!invoices_room_id_fkey(room_number, buildings!rooms_building_id_fkey(name)),
        tenants!invoices_tenant_id_fkey(full_name, phone),
        invoice_items(
          id, item_type, item_name, unit, billing_type, unit_price,
          previous_reading, current_reading, quantity, amount, sort_order
        )
      `)
      .eq("account_id", userId)
      .order("billing_month", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select(`
        id, contract_code, monthly_rent,
        rooms!contracts_room_id_fkey(room_number, buildings!rooms_building_id_fkey(name)),
        tenants!contracts_main_tenant_id_fkey(full_name),
        contract_members(id),
        contract_services(
          id, service_name, unit, price, billing_type, opening_reading
        )
      `)
      .eq("account_id", userId)
      .in("status", ["active", "expiring"])
      .order("created_at", { ascending: false }),
    supabase
      .from("invoice_items")
      .select("source_contract_service_id, current_reading, created_at")
      .eq("account_id", userId)
      .not("source_contract_service_id", "is", null)
      .not("current_reading", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("meter_reading_values")
      .select(`
        contract_service_id, current_reading, created_at,
        meter_reading_submissions!inner(status)
      `)
      .eq("account_id", userId)
      .eq("meter_reading_submissions.status", "confirmed")
      .order("created_at", { ascending: false }),
    supabase
      .from("owner_profiles")
      .select("bank_name, bank_account_number, bank_account_holder")
      .eq("account_id", userId)
      .maybeSingle(),
    ]);

  const error =
    invoicesResult.error ??
    contractsResult.error ??
    readingsResult.error ??
    confirmedResult.error ??
    ownerProfileResult.error;
  if (error) {
    return (
      <DashboardDataError
        title="Không thể tải hóa đơn"
        message={error.message}
        hint="Hãy kiểm tra đã chạy đầy đủ file database NhaTroPro trên Supabase."
      />
    );
  }

  const previousByService = new Map<string, number>();
  for (const item of readingsResult.data ?? []) {
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
  const confirmedByService = new Map<string, number>();
  const confirmedHistoryByService = new Map<string, number[]>();
  for (const item of confirmedResult.data ?? []) {
    const history =
      confirmedHistoryByService.get(item.contract_service_id) ?? [];
    history.push(Number(item.current_reading));
    confirmedHistoryByService.set(item.contract_service_id, history);
    if (!confirmedByService.has(item.contract_service_id)) {
      confirmedByService.set(
        item.contract_service_id,
        Number(item.current_reading)
      );
    }
  }

  const invoices: InvoiceView[] = (invoicesResult.data ?? []).map((invoice) => {
    const room = Array.isArray(invoice.rooms) ? invoice.rooms[0] : invoice.rooms;
    const building = room
      ? Array.isArray(room.buildings)
        ? room.buildings[0]
        : room.buildings
      : null;
    const tenant = Array.isArray(invoice.tenants)
      ? invoice.tenants[0]
      : invoice.tenants;
    return {
      id: invoice.id,
      code: invoice.invoice_code,
      billingMonth: invoice.billing_month,
      dueDate: invoice.due_date,
      status: invoice.status,
      total: Number(invoice.total_amount),
      note: invoice.note ?? "",
      issuedAt: invoice.issued_at,
      paidAt: invoice.paid_at,
      roomNumber: room?.room_number ?? "—",
      buildingName: building?.name ?? "—",
      tenantName: tenant?.full_name ?? "—",
      tenantPhone: tenant?.phone ?? "",
      items: (invoice.invoice_items ?? [])
        .map((item) => ({
          id: item.id,
          type: item.item_type,
          name: item.item_name,
          unit: item.unit,
          billingType: item.billing_type,
          unitPrice: Number(item.unit_price),
          previousReading:
            item.previous_reading === null ? null : Number(item.previous_reading),
          currentReading:
            item.current_reading === null ? null : Number(item.current_reading),
          quantity: Number(item.quantity),
          amount: Number(item.amount),
          sortOrder: item.sort_order,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    };
  });

  const billedMonthsByContract = new Map<string, string[]>();
  for (const invoice of invoicesResult.data ?? []) {
    if (invoice.status === "cancelled") continue;
    const months = billedMonthsByContract.get(invoice.contract_id) ?? [];
    months.push(invoice.billing_month.slice(0, 7));
    billedMonthsByContract.set(invoice.contract_id, months);
  }

  const contracts: InvoiceContractOption[] = (contractsResult.data ?? []).map(
    (contract) => {
      const room = Array.isArray(contract.rooms)
        ? contract.rooms[0]
        : contract.rooms;
      const building = room
        ? Array.isArray(room.buildings)
          ? room.buildings[0]
          : room.buildings
        : null;
      const tenant = Array.isArray(contract.tenants)
        ? contract.tenants[0]
        : contract.tenants;
      return {
        id: contract.id,
        code: contract.contract_code,
        roomNumber: room?.room_number ?? "—",
        buildingName: building?.name ?? "—",
        tenantName: tenant?.full_name ?? "—",
        monthlyRent: Number(contract.monthly_rent),
        residentCount: 1 + (contract.contract_members?.length ?? 0),
        billedMonths: billedMonthsByContract.get(contract.id) ?? [],
        services: (contract.contract_services ?? []).map((service) => ({
          id: service.id,
          name: service.service_name,
          unit: service.unit,
          price: Number(service.price),
          billingType: service.billing_type,
          previousReading:
            previousByService.get(service.id) ??
            (service.opening_reading == null
              ? undefined
              : Number(service.opening_reading)) ??
            confirmedHistoryByService.get(service.id)?.[1] ??
            0,
          suggestedReading: confirmedByService.get(service.id) ?? null,
        })),
      };
    }
  );

  const ownerProfile = ownerProfileResult.data;
  let paymentAccount: InvoicePaymentAccount | null = null;
  if (
    ownerProfile?.bank_name &&
    ownerProfile.bank_account_number &&
    ownerProfile.bank_account_holder
  ) {
    paymentAccount = {
      bankId: await resolveVietQrBankId(ownerProfile.bank_name),
      bankName: ownerProfile.bank_name,
      accountNumber: ownerProfile.bank_account_number,
      accountName: ownerProfile.bank_account_holder,
    };
  }

  return (
    <InvoicesClient
      invoices={invoices}
      contracts={contracts}
      paymentAccount={paymentAccount}
    />
  );
}
