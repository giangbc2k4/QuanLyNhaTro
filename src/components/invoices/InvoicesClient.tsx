"use client";

import { FormEvent, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FilePlus2,
  Files,
  Loader2,
  Printer,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  cancelInvoiceAction,
  createBulkInvoicesAction,
  createInvoiceAction,
  deletePaidInvoiceAction,
  markInvoicePaidAction,
  sendInvoiceZaloAction,
  type InvoiceActionResult,
} from "@/app/dashboard/invoices/actions";
import { formatDate, formatVND } from "@/lib/format";
import type {
  InvoiceItemType,
  InvoiceStatus,
  ServiceBillingType,
} from "@/lib/domain-types";
import { useAutoDismiss } from "@/lib/use-auto-dismiss";
import { invoiceTransferContent, vietQrImageUrl } from "@/lib/vietqr";

type DisplayStatus = InvoiceStatus | "overdue";

// Hóa đơn hiển thị đã bao gồm phòng, người thuê và toàn bộ khoản thu.
export interface InvoiceView {
  id: string;
  code: string;
  billingMonth: string;
  dueDate: string;
  status: InvoiceStatus;
  total: number;
  note: string;
  issuedAt: string | null;
  paidAt: string | null;
  roomNumber: string;
  buildingName: string;
  tenantName: string;
  tenantPhone: string;
  items: Array<{
    id: string;
    type: InvoiceItemType;
    name: string;
    unit: string;
    billingType: ServiceBillingType | null;
    unitPrice: number;
    previousReading: number | null;
    currentReading: number | null;
    quantity: number;
    amount: number;
    sortOrder: number;
  }>;
}

export interface InvoiceContractOption {
  id: string;
  code: string;
  roomNumber: string;
  buildingName: string;
  tenantName: string;
  monthlyRent: number;
  residentCount: number;
  billedMonths: string[];
  services: Array<{
    id: string;
    name: string;
    unit: string;
    price: number;
    billingType: ServiceBillingType;
    previousReading: number;
    suggestedReading: number | null;
  }>;
}

export interface InvoicePaymentAccount {
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function localMonth() {
  return localDate().slice(0, 7);
}

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return localDate(date);
}

function displayStatus(invoice: InvoiceView): DisplayStatus {
  return invoice.status === "issued" && invoice.dueDate < localDate()
    ? "overdue"
    : invoice.status;
}

const statusConfig: Record<
  DisplayStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  draft: { label: "Bản nháp", className: "bg-white/10 text-text-secondary", icon: Clock },
  issued: { label: "Chưa thanh toán", className: "bg-warning/15 text-warning", icon: Clock },
  overdue: { label: "Quá hạn", className: "bg-red-500/15 text-red-400", icon: AlertCircle },
  paid: { label: "Đã thanh toán", className: "bg-success/15 text-success", icon: CheckCircle2 },
  cancelled: { label: "Đã hủy", className: "bg-white/10 text-text-muted", icon: X },
};

export default function InvoicesClient({
  invoices,
  contracts,
  paymentAccount,
}: {
  invoices: InvoiceView[];
  contracts: InvoiceContractOption[];
  paymentAccount: InvoicePaymentAccount | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [creatingBulk, setCreatingBulk] = useState(false);
  const [selected, setSelected] = useState<InvoiceView | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<InvoiceActionResult | null>(null);
  useAutoDismiss(toast, setToast);

  const filtered = invoices.filter((invoice) => {
    const query = search.trim().toLocaleLowerCase("vi");
    const status = displayStatus(invoice);
    return (
      (filter === "all" || status === filter) &&
      (!query ||
        invoice.code.toLocaleLowerCase("vi").includes(query) ||
        invoice.roomNumber.toLocaleLowerCase("vi").includes(query) ||
        invoice.tenantName.toLocaleLowerCase("vi").includes(query))
    );
  });
  const paid = invoices.filter((invoice) => invoice.status === "paid");
  const outstanding = invoices.filter((invoice) =>
    ["issued"].includes(invoice.status)
  );
  const selectedInvoices = invoices.filter((invoice) =>
    selectedIds.includes(invoice.id)
  );

  function run(action: () => Promise<InvoiceActionResult>, done?: () => void) {
    setToast(null);
    startTransition(async () => {
      const result = await action();
      setToast(result);
      if (result.success) {
        done?.();
        router.refresh();
      }
    });
  }

  function exportCsv() {
    const rows = [
      ["Mã hóa đơn", "Tháng", "Phòng", "Người thuê", "Hạn thanh toán", "Tổng tiền", "Trạng thái"],
      ...filtered.map((invoice) => [
        invoice.code,
        invoice.billingMonth.slice(0, 7),
        `${invoice.roomNumber} - ${invoice.buildingName}`,
        invoice.tenantName,
        invoice.dueDate,
        String(invoice.total),
        statusConfig[displayStatus(invoice)].label,
      ]),
    ];
    const csv = "\uFEFF" + rows.map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    ).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `hoa-don-${localDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Tổng đã lập" value={formatVND(invoices.reduce((sum, item) => sum + item.total, 0))} />
        <Summary label="Đã thanh toán" value={formatVND(paid.reduce((sum, item) => sum + item.total, 0))} color="text-success" />
        <Summary label="Còn phải thu" value={formatVND(outstanding.reduce((sum, item) => sum + item.total, 0))} color="text-warning" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative max-w-sm flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input className="form-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã, phòng, người thuê..." />
          </div>
          <select className="form-input w-auto" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Tất cả</option>
            <option value="issued">Chưa thanh toán</option>
            <option value="overdue">Quá hạn</option>
            <option value="paid">Đã thanh toán</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-white/[0.06] px-4 py-2.5 text-xs text-text-secondary hover:bg-white/[0.04]">
            <Download size={14} /> Xuất CSV
          </button>
          <button type="button" onClick={() => setCreating(true)} disabled={!contracts.length} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-xs disabled:opacity-40">
            <FilePlus2 size={14} /> Tạo hóa đơn
          </button>
          <button type="button" onClick={() => setCreatingBulk(true)} disabled={!contracts.length} className="btn-outline flex items-center gap-2 px-4 py-2.5 text-xs disabled:opacity-40">
            <Files size={14} /> Tạo hàng loạt
          </button>
          <button type="button" onClick={() => window.print()} disabled={!selectedInvoices.length} className="btn-outline flex items-center gap-2 px-4 py-2.5 text-xs disabled:opacity-40">
            <Printer size={14} /> In đã chọn ({selectedInvoices.length})
          </button>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl border border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              {["", "Mã hóa đơn", "Phòng", "Người thuê", "Kỳ", "Hạn thanh toán", "Tổng tiền", "Trạng thái", ""].map((label, index) => (
                <th key={`${label}-${index}`} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((invoice) => {
                const status = statusConfig[displayStatus(invoice)];
                const StatusIcon = status.icon;
                return (
                  <tr key={invoice.id} className="border-b border-border hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5"><input type="checkbox" checked={selectedIds.includes(invoice.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, invoice.id] : current.filter((id) => id !== invoice.id))} className="h-4 w-4 accent-blue-500" aria-label={`Chọn ${invoice.code} để in`} /></td>
                    <td className="px-5 py-3.5 text-xs font-mono text-text-secondary">{invoice.code}</td>
                    <td className="px-5 py-3.5"><span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">{invoice.roomNumber}</span><span className="ml-2 text-[10px] text-text-muted">{invoice.buildingName}</span></td>
                    <td className="px-5 py-3.5 text-sm text-white">{invoice.tenantName}</td>
                    <td className="px-5 py-3.5 text-xs text-text-secondary">{invoice.billingMonth.slice(0, 7)}</td>
                    <td className="px-5 py-3.5 text-xs text-text-secondary">{formatDate(invoice.dueDate)}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-white">{formatVND(invoice.total)}</td>
                    <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}><StatusIcon size={10} />{status.label}</span></td>
                    <td className="px-5 py-3.5"><div className="flex items-center gap-1"><button type="button" onClick={() => run(() => sendInvoiceZaloAction(invoice.id))} disabled={pending} className="rounded-lg p-2 text-[#3686ff] hover:bg-[#0068ff]/10 disabled:opacity-40" title="Gửi hóa đơn qua Zalo"><Send size={15} /></button><button type="button" onClick={() => setSelected(invoice)} className="rounded-lg p-2 text-text-muted hover:bg-white/[0.06] hover:text-white" title="Xem chi tiết"><Eye size={15} /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && <p className="p-8 text-center text-sm text-text-muted">Chưa có hóa đơn phù hợp.</p>}
      </div>

      {creating && <CreateInvoiceModal contracts={contracts} pending={pending} onClose={() => setCreating(false)} onSubmit={(input) => run(() => createInvoiceAction(input), () => setCreating(false))} />}
      {creatingBulk && <CreateBulkInvoiceModal contracts={contracts} pending={pending} onClose={() => setCreatingBulk(false)} onSubmit={(input) => run(() => createBulkInvoicesAction(input), () => setCreatingBulk(false))} />}
      {selected && <InvoiceDetail invoice={selected} paymentAccount={paymentAccount} pending={pending} onClose={() => setSelected(null)} onPaid={() => run(() => markInvoicePaidAction(selected.id), () => setSelected(null))} onCancel={() => run(() => cancelInvoiceAction(selected.id), () => setSelected(null))} onDelete={() => run(() => deletePaidInvoiceAction(selected.id), () => setSelected(null))} onSendZalo={() => run(() => sendInvoiceZaloAction(selected.id))} />}
      <BulkPrintInvoices invoices={selectedInvoices} />
      {toast && <Toast result={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function Summary({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return <div className="glass rounded-2xl border border-white/[0.06] p-5"><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</p><p className={`mt-2 text-xl font-bold ${color}`}>{value}</p></div>;
}

// Tạo nhiều hóa đơn trong cùng kỳ, giới hạn dữ liệu nhập theo từng hợp đồng.
function CreateBulkInvoiceModal({ contracts, pending, onClose, onSubmit }: {
  contracts: InvoiceContractOption[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: Parameters<typeof createBulkInvoicesAction>[0]) => void;
}) {
  const [billingMonth, setBillingMonth] = useState(localMonth());
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [contractIds, setContractIds] = useState(
    contracts
      .filter((contract) => !contract.billedMonths.includes(localMonth()))
      .map((contract) => contract.id)
  );
  const availableContracts = contracts.filter(
    (contract) => !contract.billedMonths.includes(billingMonth)
  );
  const readingsByContract = Object.fromEntries(
    contracts.map((contract) => [
      contract.id,
      Object.fromEntries(
        contract.services
          .filter(
            (service) =>
              service.billingType === "metered" &&
              service.suggestedReading !== null
          )
          .map((service) => [service.id, service.suggestedReading as number])
      ),
    ])
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit({ contractIds, billingMonth, dueDate, readingsByContract }); }} onMouseDown={(event) => event.stopPropagation()} className="glass max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4"><div><h3 className="font-semibold text-white">Tạo hóa đơn hàng loạt</h3><p className="mt-1 text-xs text-text-muted">Phòng thiếu chỉ số công tơ sẽ được bỏ qua.</p></div><button type="button" onClick={onClose}><X size={18} className="text-text-muted" /></button></div>
        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-text-secondary">Tháng hóa đơn<input required type="month" value={billingMonth} onChange={(event) => { const month = event.target.value; setBillingMonth(month); setContractIds(contracts.filter((contract) => !contract.billedMonths.includes(month)).map((contract) => contract.id)); }} className="form-input mt-2" /></label><label className="text-xs text-text-secondary">Hạn thanh toán<input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="form-input mt-2" /></label></div>
          <div className="space-y-2">{availableContracts.map((contract) => { const missing = contract.services.some((service) => service.billingType === "metered" && service.suggestedReading === null); return <label key={contract.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] p-3"><span className="flex items-center gap-3"><input type="checkbox" checked={contractIds.includes(contract.id)} onChange={(event) => setContractIds((current) => event.target.checked ? [...current, contract.id] : current.filter((id) => id !== contract.id))} className="h-4 w-4 accent-blue-500" /><span><span className="block text-xs text-white">{contract.roomNumber} — {contract.tenantName}</span><span className="text-[10px] text-text-muted">{contract.code}</span></span></span>{missing && <span className="text-[10px] text-warning">Thiếu chỉ số</span>}</label>; })}{!availableContracts.length && <p className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-text-muted">Tất cả phòng đã có hóa đơn trong tháng này.</p>}</div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-4"><button type="button" onClick={onClose} className="btn-outline px-4 py-2 text-xs">Đóng</button><button disabled={pending || !contractIds.length} className="btn-primary flex items-center gap-2 px-5 py-2 text-xs disabled:opacity-50">{pending && <Loader2 size={14} className="animate-spin" />}Tạo {contractIds.length} hóa đơn</button></div>
      </form>
    </div>
  );
}

function CreateInvoiceModal({ contracts, pending, onClose, onSubmit }: {
  contracts: InvoiceContractOption[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: Parameters<typeof createInvoiceAction>[0]) => void;
}) {
  const [billingMonth, setBillingMonth] = useState(localMonth());
  const availableContracts = contracts.filter(
    (item) => !item.billedMonths.includes(billingMonth)
  );
  const [contractId, setContractId] = useState(
    availableContracts[0]?.id ?? ""
  );
  const contract =
    availableContracts.find((item) => item.id === contractId) ??
    availableContracts[0];
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [readings, setReadings] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (contracts[0]?.services ?? [])
        .filter(
          (service) =>
            service.billingType === "metered" &&
            service.suggestedReading !== null
        )
        .map((service) => [service.id, service.suggestedReading as number])
    )
  );
  const [additionalName, setAdditionalName] = useState("");
  const [additionalAmount, setAdditionalAmount] = useState(0);
  const [note, setNote] = useState("");
  const estimatedTotal = (() => {
    if (!contract) return 0;
    return contract.monthlyRent + contract.services.reduce((sum, service) => {
      if (service.billingType === "free") return sum;
      if (service.billingType === "per_person") {
        return sum + service.price * contract.residentCount;
      }
      if (service.billingType === "fixed") return sum + service.price;
      const current = readings[service.id];
      return sum + (Number.isFinite(current) && current >= service.previousReading
        ? Math.round((current - service.previousReading) * service.price)
        : 0);
    }, 0) + Number(additionalAmount || 0);
  })();

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ contractId, billingMonth, dueDate, note, additionalName, additionalAmount: Number(additionalAmount), readings });
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="glass max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-[#0b1220]/95 px-6 py-4"><div><h3 className="font-semibold text-white">Tạo hóa đơn</h3><p className="mt-1 text-xs text-text-muted">Tiền phòng và dịch vụ lấy từ hợp đồng.</p></div><button type="button" onClick={onClose} className="text-text-muted hover:text-white"><X size={18} /></button></div>
        <div className="space-y-5 p-6">
          <label className="block text-xs text-text-secondary">Hợp đồng<select required className="form-input mt-2" value={contractId} onChange={(event) => {
            const nextId = event.target.value;
            const nextContract = contracts.find((item) => item.id === nextId);
            setContractId(nextId);
            setReadings(
              Object.fromEntries(
                (nextContract?.services ?? [])
                  .filter(
                    (service) =>
                      service.billingType === "metered" &&
                      service.suggestedReading !== null
                  )
                  .map((service) => [
                    service.id,
                    service.suggestedReading as number,
                  ])
              )
            );
          }}><option value="">Chọn hợp đồng</option>{availableContracts.map((item) => <option key={item.id} value={item.id}>{item.roomNumber} — {item.tenantName} ({item.code})</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-text-secondary">Tháng hóa đơn<input required type="month" className="form-input mt-2" value={billingMonth} onChange={(event) => { const month = event.target.value; const nextContracts = contracts.filter((item) => !item.billedMonths.includes(month)); setBillingMonth(month); setContractId(nextContracts[0]?.id ?? ""); setReadings(Object.fromEntries((nextContracts[0]?.services ?? []).filter((service) => service.billingType === "metered" && service.suggestedReading !== null).map((service) => [service.id, service.suggestedReading as number]))); }} /></label>
            <label className="text-xs text-text-secondary">Hạn thanh toán<input required type="date" className="form-input mt-2" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
          </div>
          {!availableContracts.length && <p className="rounded-xl border border-dashed border-white/[0.08] p-5 text-center text-xs text-text-muted">Tất cả phòng đã có hóa đơn trong tháng này.</p>}
          {contract && <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Tiền phòng</span><span className="font-semibold text-white">{formatVND(contract?.monthlyRent ?? 0)}</span></div>
            <div className="mt-4 space-y-3">
              {contract?.services.map((service) => (
                <div key={service.id} className="rounded-xl border border-white/[0.05] p-3">
                  <div className="flex items-center justify-between"><div><p className="text-sm text-white">{service.name}</p><p className="text-[10px] text-text-muted">{service.billingType === "free" ? "Miễn phí" : `${formatVND(service.price)}/${service.unit}`}</p></div>{service.billingType !== "metered" && <span className="text-xs font-semibold text-text-secondary">{service.billingType === "free" ? "0đ" : service.billingType === "per_person" ? formatVND(service.price * contract.residentCount) : formatVND(service.price)}</span>}</div>
                  {service.billingType === "metered" && <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-[10px] text-text-muted">Chỉ số cũ<input readOnly className="form-input mt-1 opacity-70" value={service.previousReading} /></label><label className="text-[10px] text-text-muted">Chỉ số mới {service.suggestedReading !== null && <span className="text-success">(từ Zalo)</span>}<input required type="number" min={service.previousReading} step="0.01" className="form-input mt-1" value={readings[service.id] ?? ""} onChange={(event) => setReadings((current) => ({ ...current, [service.id]: Number(event.target.value) }))} /></label></div>}
                </div>
              ))}
              {!contract?.services.length && <p className="text-xs text-text-muted">Hợp đồng này chưa có dịch vụ.</p>}
            </div>
          </div>}
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-text-secondary">Tên phí phát sinh<input className="form-input mt-2" value={additionalName} onChange={(event) => setAdditionalName(event.target.value)} placeholder="Ví dụ: Sửa khóa" /></label><label className="text-xs text-text-secondary">Số tiền (VND)<input type="number" min="0" step="1000" className="form-input mt-2" value={additionalAmount || ""} onChange={(event) => setAdditionalAmount(Number(event.target.value))} /></label></div>
          <label className="block text-xs text-text-secondary">Ghi chú<textarea className="form-input mt-2 min-h-20 resize-y" value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <div className="flex items-center justify-between rounded-xl bg-accent/10 p-4"><span className="text-sm font-semibold text-white">Tạm tính</span><span className="text-xl font-bold text-accent">{formatVND(estimatedTotal)}</span></div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-[#0b1220]/95 px-6 py-4"><button type="button" onClick={onClose} className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs text-text-secondary">Đóng</button><button disabled={pending || !contract} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs disabled:opacity-50">{pending && <Loader2 size={14} className="animate-spin" />}Lưu hóa đơn</button></div>
      </form>
    </div>
  );
}

// Chi tiết, QR thanh toán và bản in được giữ cùng một nguồn dữ liệu InvoiceView.
function InvoiceDetail({
  invoice,
  paymentAccount,
  pending,
  onClose,
  onPaid,
  onCancel,
  onDelete,
  onSendZalo,
}: {
  invoice: InvoiceView;
  paymentAccount: InvoicePaymentAccount | null;
  pending: boolean;
  onClose: () => void;
  onPaid: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSendZalo: () => void;
}) {
  const status = statusConfig[displayStatus(invoice)];
  const transferContent = invoiceTransferContent(invoice.code);
  const qrUrl = paymentAccount
    ? vietQrImageUrl({
        bankId: paymentAccount.bankId,
        accountNumber: paymentAccount.accountNumber,
        accountName: paymentAccount.accountName,
        amount: invoice.total,
        description: transferContent,
      })
    : null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div onMouseDown={(event) => event.stopPropagation()} className="glass max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="font-semibold text-white">{invoice.code}</h3>
            <p className="mt-1 text-xs text-text-muted">{invoice.roomNumber} — {invoice.buildingName} · {invoice.tenantName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex justify-between text-xs"><span className="text-text-muted">Kỳ hóa đơn</span><span className="text-white">{invoice.billingMonth.slice(0, 7)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-text-muted">Hạn thanh toán</span><span className="text-white">{formatDate(invoice.dueDate)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-text-muted">Trạng thái</span><span className={status.className.split(" ").at(-1)}>{status.label}</span></div>
          <div className="section-divider" />
          {invoice.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 text-xs">
              <div>
                <p className="text-text-secondary">{item.name}</p>
                <p className="mt-1 text-[10px] text-text-muted">{item.billingType === "metered" ? `${item.previousReading} → ${item.currentReading} ${item.unit} · ${item.quantity} × ${formatVND(item.unitPrice)}` : item.billingType === "free" ? "Miễn phí" : item.billingType === "per_person" ? `${item.quantity} người × ${formatVND(item.unitPrice)}` : `${item.quantity} × ${formatVND(item.unitPrice)}`}</p>
              </div>
              <span className="shrink-0 font-semibold text-white">{formatVND(item.amount)}</span>
            </div>
          ))}
          {invoice.note && <div className="rounded-xl bg-white/[0.03] p-3 text-xs text-text-secondary">{invoice.note}</div>}
          <div className="section-divider" />
          <div className="flex items-center justify-between"><span className="font-semibold text-white">Tổng cộng</span><span className="text-xl font-bold text-accent">{formatVND(invoice.total)}</span></div>

          {qrUrl && paymentAccount ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <h4 className="text-sm font-semibold text-white">Mã QR thanh toán</h4>
              <p className="mt-1 text-[11px] text-text-muted">Quét QR để chuyển đúng số tiền và nội dung hóa đơn.</p>
              <a href={qrUrl} target="_blank" rel="noreferrer" className="mx-auto mt-4 block w-full max-w-[300px] overflow-hidden rounded-2xl bg-white p-2">
                <Image src={qrUrl} alt={`Mã QR thanh toán hóa đơn ${invoice.code}`} width={600} height={760} unoptimized className="h-auto w-full" />
              </a>
              <div className="mt-4 grid gap-3 rounded-xl bg-black/20 p-3 text-[11px] sm:grid-cols-2">
                <div><p className="text-text-muted">Ngân hàng</p><p className="mt-1 font-medium text-white">{paymentAccount.bankName}</p></div>
                <div><p className="text-text-muted">Số tài khoản</p><p className="mt-1 font-mono font-medium text-white">{paymentAccount.accountNumber}</p></div>
                <div><p className="text-text-muted">Chủ tài khoản</p><p className="mt-1 font-medium uppercase text-white">{paymentAccount.accountName}</p></div>
                <div><p className="text-text-muted">Nội dung</p><p className="mt-1 font-mono font-medium text-accent">{transferContent}</p></div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-xs text-warning">
              Chưa thể tạo mã QR. Hãy bổ sung ngân hàng, số tài khoản và tên chủ tài khoản trong Cài đặt.
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 border-t border-border px-6 py-4">
          <button disabled={pending} type="button" onClick={onSendZalo} className="btn-outline flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs"><Send size={14} />Gửi Zalo</button>
          {invoice.status === "issued" && <>
            <button disabled={pending} type="button" onClick={onCancel} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-xs text-red-400"><Trash2 size={14} />Hủy hóa đơn</button>
            <button disabled={pending} type="button" onClick={onPaid} className="btn-primary flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs">{pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}Đã thanh toán</button>
          </>}
          {invoice.status === "paid" && <button disabled={pending} type="button" onClick={onDelete} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white"><Trash2 size={14} />Xóa để test</button>}
        </div>
      </div>
    </div>
  );
}

function BulkPrintInvoices({ invoices }: { invoices: InvoiceView[] }) {
  return (
    <div id="printable-invoices">
      {invoices.map((invoice) => (
        <article key={invoice.id} className="invoice-print-page">
          <div className="text-center"><h1>HÓA ĐƠN TIỀN PHÒNG</h1><p>{invoice.code}</p></div>
          <div className="invoice-print-meta"><p>Phòng: <strong>{invoice.roomNumber} — {invoice.buildingName}</strong></p><p>Người thuê: <strong>{invoice.tenantName}</strong></p><p>Kỳ hóa đơn: {invoice.billingMonth.slice(0, 7)}</p><p>Hạn thanh toán: {formatDate(invoice.dueDate)}</p></div>
          <table><thead><tr><th>Khoản thu</th><th>Chi tiết</th><th>Thành tiền</th></tr></thead><tbody>{invoice.items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.billingType === "metered" ? `${item.previousReading} → ${item.currentReading} ${item.unit}` : `${item.quantity} × ${formatVND(item.unitPrice)}`}</td><td>{formatVND(item.amount)}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Tổng cộng</th><th>{formatVND(invoice.total)}</th></tr></tfoot></table>
          <p className="invoice-print-note">Ghi chú: {invoice.note || "—"}</p>
        </article>
      ))}
    </div>
  );
}

function Toast({ result, onClose }: { result: InvoiceActionResult; onClose: () => void }) {
  return <div className={`fixed right-5 top-5 z-[1100] flex max-w-sm items-start gap-3 rounded-xl border bg-[#101827] p-4 shadow-2xl ${result.success ? "border-success/25" : "border-red-500/25"}`}>{result.success ? <CheckCircle2 size={18} className="text-success" /> : <AlertCircle size={18} className="text-red-400" />}<div className="flex-1"><p className="text-xs font-semibold text-white">{result.success ? "Thành công" : "Không thành công"}</p><p className="mt-1 text-xs text-text-secondary">{result.message}</p></div><button onClick={onClose} className="text-text-muted hover:text-white"><X size={14} /></button></div>;
}
