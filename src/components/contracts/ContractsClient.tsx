"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Eye,
  Loader2,
  Plus,
  Printer,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useAutoDismiss } from "@/lib/use-auto-dismiss";
import {
  createContractAction,
  terminateContractAction,
  type ContractActionResult,
  type ContractInput,
} from "@/app/dashboard/contracts/actions";
import { formatDate, formatVND } from "@/lib/format";
import type {
  ContractStatus,
  ServiceBillingType,
} from "@/lib/domain-types";

// View model của hợp đồng, tách khỏi tên cột snake_case trong PostgreSQL.
export interface ContractView {
  id: string;
  code: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  buildingAddress: string;
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  tenantDateOfBirth: string | null;
  tenantPermanentAddress: string;
  tenantDocumentNumber: string;
  tenantDocumentIssuedAt: string | null;
  tenantDocumentIssuedBy: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  status: ContractStatus;
  note: string;
  members: Array<{
    id: string;
    tenant_id: string | null;
    full_name: string;
    phone: string | null;
    relationship: string | null;
    date_of_birth: string | null;
    permanent_address: string;
    document_number: string;
  }>;
  services: Array<{
    id: string;
    service_name: string;
    unit: string;
    price: number;
    billing_type: ServiceBillingType;
  }>;
}

export interface OwnerContractInfo {
  fullName: string;
  dateOfBirth: string | null;
  permanentAddress: string;
  phone: string;
  documentNumber: string;
  issuedAt: string | null;
  issuedBy: string;
}

export interface RoomOption {
  id: string;
  number: string;
  buildingName: string;
  monthlyRent: number;
  maintenance: boolean;
  occupied: boolean;
  meterServices: Array<{
    serviceId: string;
    name: string;
    unit: string;
    suggestedReading: number | null;
  }>;
}

export interface TenantOption {
  id: string;
  name: string;
  phone: string;
}

const durationOptions = [1, 3, 6, 12] as const;

function dateInputValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function contractEndDate(startDate: string, months: number) {
  const [year, month, day] = startDate.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    targetYear,
    targetMonth + 1,
    0
  ).getDate();
  const end =
    day > lastDayOfTargetMonth
      ? new Date(targetYear, targetMonth, lastDayOfTargetMonth)
      : new Date(targetYear, targetMonth, day - 1);
  return dateInputValue(end);
}

const statusConfig: Record<
  ContractStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  draft: { label: "Bản nháp", className: "bg-white/10 text-text-secondary", icon: ClipboardList },
  active: { label: "Đang hiệu lực", className: "bg-success/15 text-success", icon: CheckCircle2 },
  expiring: { label: "Sắp hết hạn", className: "bg-warning/15 text-warning", icon: AlertTriangle },
  expired: { label: "Đã hết hạn", className: "bg-red-500/15 text-red-400", icon: XCircle },
  terminated: { label: "Đã kết thúc", className: "bg-white/10 text-text-muted", icon: XCircle },
};

export default function ContractsClient({
  contracts,
  rooms,
  tenants,
  owner,
}: {
  contracts: ContractView[];
  rooms: RoomOption[];
  tenants: TenantOption[];
  owner: OwnerContractInfo;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<ContractView | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<ContractActionResult | null>(null);
  useAutoDismiss(toast, setToast);
  const query = search.trim().toLocaleLowerCase("vi");
  const filtered = contracts.filter(
    (contract) =>
      (filter === "all" || contract.status === filter) &&
      (!query ||
        contract.code.toLocaleLowerCase("vi").includes(query) ||
        contract.tenantName.toLocaleLowerCase("vi").includes(query) ||
        contract.roomNumber.toLocaleLowerCase("vi").includes(query))
  );

  function run(action: () => Promise<ContractActionResult>, done?: () => void) {
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

  const active = contracts.filter((item) => item.status === "active").length;
  const expiring = contracts.filter((item) => item.status === "expiring").length;
  const residents = contracts
    .filter((item) => ["active", "expiring"].includes(item.status))
    .reduce((total, item) => total + 1 + item.members.length, 0);
  const summary: Array<{
    label: string;
    value: number;
    icon: LucideIcon;
    color: string;
  }> = [
    { label: "Tổng hợp đồng", value: contracts.length, icon: ClipboardList, color: "text-accent" },
    { label: "Đang hiệu lực", value: active, icon: CheckCircle2, color: "text-success" },
    { label: "Sắp hết hạn", value: expiring, icon: AlertTriangle, color: "text-warning" },
    { label: "Tổng cư dân", value: residents, icon: Users, color: "text-purple" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-2xl border border-white/[0.06] p-5">
            <Icon size={18} className={color} />
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative max-w-sm flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm hợp đồng, người thuê, phòng..." className="form-input pl-9" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-input w-auto">
            <option value="all">Tất cả</option>
            <option value="active">Đang hiệu lực</option>
            <option value="expiring">Sắp hết hạn</option>
            <option value="expired">Đã hết hạn</option>
            <option value="terminated">Đã kết thúc</option>
          </select>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-xs">
          <Plus size={14} /> Tạo hợp đồng
        </button>
      </div>

      <div className="glass overflow-hidden rounded-2xl border border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              {["Mã HĐ", "Phòng", "Người thuê chính", "Thời hạn", "Giá thuê", "Trạng thái", ""].map((item) => (
                <th key={item} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">{item}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((contract) => {
                const status = statusConfig[contract.status];
                const StatusIcon = status.icon;
                return (
                  <tr key={contract.id} className="border-b border-border hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-mono text-xs text-accent">{contract.code}</td>
                    <td className="px-5 py-4 text-xs text-white">P{contract.roomNumber} · {contract.buildingName}</td>
                    <td className="px-5 py-4"><p className="text-sm text-white">{contract.tenantName}</p><p className="text-[10px] text-text-muted">{contract.tenantPhone}</p></td>
                    <td className="px-5 py-4 text-[10px] text-text-secondary"><Calendar size={10} className="mr-1 inline" />{formatDate(contract.startDate)} → {formatDate(contract.endDate)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-white">{formatVND(contract.monthlyRent)}</td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}><StatusIcon size={10} />{status.label}</span></td>
                    <td className="px-5 py-4"><button type="button" onClick={() => setSelected(contract)} className="rounded-lg p-2 text-text-muted hover:bg-white/[0.06] hover:text-white" aria-label={`Xem ${contract.code}`}><Eye size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-10 text-center text-sm text-text-muted">Chưa có hợp đồng phù hợp.</p>}
      </div>

      {creating && (
        <CreateContractModal
          rooms={rooms}
          tenants={tenants}
          pending={pending}
          onClose={() => setCreating(false)}
          onSubmit={(input) => run(() => createContractAction(input), () => setCreating(false))}
        />
      )}
      {selected && (
        <ContractDetail
          contract={selected}
          owner={owner}
          pending={pending}
          onClose={() => setSelected(null)}
          onTerminate={() => run(() => terminateContractAction(selected.id), () => setSelected(null))}
        />
      )}
      {toast && <Toast result={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// Quy trình tạo hợp đồng gồm phòng, người thuê, thời hạn và chỉ số bàn giao.
function CreateContractModal({
  rooms, tenants, pending, onClose, onSubmit,
}: {
  rooms: RoomOption[];
  tenants: TenantOption[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: ContractInput) => void;
}) {
  const availableRooms = rooms.filter((room) => !room.maintenance && !room.occupied);
  const today = dateInputValue();
  const [form, setForm] = useState<ContractInput>({
    roomId: "",
    tenantId: "",
    startDate: today,
    endDate: contractEndDate(today, 12),
    monthlyRent: 0,
    deposit: 0,
    note: "",
    openingReadings: {},
    members: [],
  });
  const [duration, setDuration] = useState<number | null>(12);
  const [memberTenantId, setMemberTenantId] = useState("");
  const [memberRelationship, setMemberRelationship] = useState("");
  const selectableMembers = tenants.filter(
    (tenant) =>
      tenant.id !== form.tenantId &&
      !form.members.some((member) => member.tenantId === tenant.id)
  );
  const selectedRoom = availableRooms.find(
    (room) => room.id === form.roomId
  );

  function changeStartDate(startDate: string) {
    setForm({
      ...form,
      startDate,
      endDate:
        duration && startDate
          ? contractEndDate(startDate, duration)
          : form.endDate,
    });
  }

  function chooseDuration(months: number) {
    setDuration(months);
    if (form.startDate) {
      setForm({
        ...form,
        endDate: contractEndDate(form.startDate, months),
      });
    }
  }

  function addMember() {
    if (!memberTenantId) return;
    setForm({
      ...form,
      members: [
        ...form.members,
        {
          tenantId: memberTenantId,
          relationship: memberRelationship.trim() || "Ở cùng",
        },
      ],
    });
    setMemberTenantId("");
    setMemberRelationship("");
  }

  function submit(event: FormEvent) { event.preventDefault(); onSubmit(form); }
  return (
    <Modal title="Tạo hợp đồng mới" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid max-h-[72vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <Field label="Người thuê chính *"><select required value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value, members: form.members.filter((member) => member.tenantId !== e.target.value) })} className="form-input"><option value="">Chọn người thuê</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.phone}</option>)}</select></Field>
          <Field label="Phòng sẵn sàng *"><select required value={form.roomId} onChange={(e) => {
            const room = rooms.find((item) => item.id === e.target.value);
            setForm({
              ...form,
              roomId: e.target.value,
              monthlyRent: room?.monthlyRent ?? 0,
              openingReadings: Object.fromEntries(
                (room?.meterServices ?? [])
                  .filter((service) => service.suggestedReading !== null)
                  .map((service) => [
                    service.serviceId,
                    service.suggestedReading as number,
                  ])
              ),
            });
          }} className="form-input"><option value="">Chọn phòng</option>{availableRooms.map((room) => <option key={room.id} value={room.id}>P{room.number} · {room.buildingName}</option>)}</select></Field>
          <Field label="Ngày bắt đầu *"><input required type="date" value={form.startDate} onChange={(e) => changeStartDate(e.target.value)} className="form-input" /></Field>
          <Field label="Ngày kết thúc *"><input required type="date" min={form.startDate} value={form.endDate} onChange={(e) => { setDuration(null); setForm({ ...form, endDate: e.target.value }); }} className="form-input" /></Field>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-medium text-text-secondary">Thời hạn nhanh</p>
            <div className="grid grid-cols-4 gap-2">
              {durationOptions.map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => chooseDuration(months)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    duration === months
                      ? "border-accent/40 bg-accent/15 text-accent"
                      : "border-white/[0.07] text-text-secondary hover:bg-white/[0.04]"
                  }`}
                >
                  {months} tháng
                </button>
              ))}
            </div>
          </div>
          <Field label="Giá thuê/tháng *"><MoneyInput value={form.monthlyRent} onChange={(monthlyRent) => setForm({ ...form, monthlyRent })} required /></Field>
          <Field label="Tiền cọc"><MoneyInput value={form.deposit} onChange={(deposit) => setForm({ ...form, deposit })} /></Field>
          {selectedRoom && selectedRoom.meterServices.length > 0 && (
            <div className="sm:col-span-2 rounded-xl border border-accent/20 bg-accent/[0.04] p-4">
              <div>
                <p className="text-xs font-semibold text-white">
                  Chỉ số bàn giao công tơ
                </p>
                <p className="mt-1 text-[10px] text-text-muted">
                  Đây là số cũ dùng để tính hóa đơn đầu tiên. Hệ thống đã điền
                  chỉ số gần nhất nếu phòng từng có dữ liệu.
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {selectedRoom.meterServices.map((service) => (
                  <Field
                    key={service.serviceId}
                    label={`${service.name} (${service.unit}) *`}
                  >
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.openingReadings[service.serviceId] ?? ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          openingReadings: {
                            ...form.openingReadings,
                            [service.serviceId]: Number(event.target.value),
                          },
                        })
                      }
                      placeholder="Nhập chỉ số khi bàn giao"
                      className="form-input"
                    />
                  </Field>
                ))}
              </div>
            </div>
          )}
          <div className="sm:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Người ở cùng</p>
                <p className="mt-1 text-[10px] text-text-muted">Một hợp đồng có thể có nhiều người cùng sinh sống.</p>
              </div>
              <span className="rounded-full bg-purple/10 px-2 py-1 text-[10px] font-semibold text-purple">{form.members.length} người</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <select value={memberTenantId} onChange={(e) => setMemberTenantId(e.target.value)} className="form-input">
                <option value="">Chọn người ở cùng</option>
                {selectableMembers.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.phone}</option>)}
              </select>
              <input value={memberRelationship} onChange={(e) => setMemberRelationship(e.target.value)} placeholder="Quan hệ" className="form-input" />
              <button type="button" onClick={addMember} disabled={!memberTenantId} className="btn-outline flex items-center justify-center gap-1 px-3 text-xs disabled:opacity-40"><Plus size={13} /> Thêm</button>
            </div>
            {form.members.length > 0 && (
              <div className="mt-3 space-y-2">
                {form.members.map((member) => {
                  const tenant = tenants.find((item) => item.id === member.tenantId);
                  return (
                    <div key={member.tenantId} className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-white">{tenant?.name}</p>
                        <p className="text-[10px] text-text-muted">{member.relationship} · {tenant?.phone}</p>
                      </div>
                      <button type="button" onClick={() => setForm({ ...form, members: form.members.filter((item) => item.tenantId !== member.tenantId) })} className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400" aria-label={`Xóa ${tenant?.name}`}><Trash2 size={13} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="sm:col-span-2"><Field label="Ghi chú"><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="form-input min-h-20 resize-none" /></Field></div>
          {availableRooms.length === 0 && <p className="sm:col-span-2 text-xs text-warning">Không có phòng sẵn sàng. Phòng bảo trì hoặc đang thuê không thể tạo hợp đồng.</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-border p-4"><button type="button" onClick={onClose} className="btn-outline px-4 py-2 text-xs">Đóng</button><button disabled={pending || availableRooms.length === 0} className="btn-primary flex items-center gap-2 px-5 py-2 text-xs disabled:opacity-60">{pending && <Loader2 size={14} className="animate-spin" />}Tạo hợp đồng</button></div>
      </form>
    </Modal>
  );
}

// Bản xem chi tiết và bản in hợp đồng pháp lý.
function ContractDetail({ contract, owner, pending, onClose, onTerminate }: { contract: ContractView; owner: OwnerContractInfo; pending: boolean; onClose: () => void; onTerminate: () => void }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
      <div className="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-200 shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:bg-white print:shadow-none">
        <div className="contract-print-toolbar flex items-center justify-between border-b border-slate-300 bg-slate-900 px-5 py-3">
          <p className="text-sm font-semibold text-white">{contract.code}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="btn-primary flex items-center gap-2 px-4 py-2 text-xs"><Printer size={14} /> In hợp đồng</button>
            <button type="button" onClick={onClose} className="btn-outline px-3 py-2 text-xs"><X size={16} /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-4 sm:p-8 print:overflow-visible print:p-0">
          <PrintableContract contract={contract} owner={owner} />
        </div>
        {["draft", "active", "expiring"].includes(contract.status) && (
          <div className="contract-print-toolbar flex justify-end border-t border-slate-300 bg-slate-900 p-3">
            <button type="button" disabled={pending} onClick={onTerminate} className="rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{pending ? "Đang xử lý..." : "Kết thúc hợp đồng"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PrintableContract({ contract, owner }: { contract: ContractView; owner: OwnerContractInfo }) {
  const start = splitDate(contract.startDate);
  const end = splitDate(contract.endDate);
  const electricity = contract.services.find((service) => service.service_name.toLocaleLowerCase("vi").includes("điện"));
  const water = contract.services.find((service) => service.service_name.toLocaleLowerCase("vi").includes("nước"));
  const chargeableServices = contract.services.filter(
    (service) =>
      !["điện", "nước"].includes(service.service_name.toLocaleLowerCase("vi")) &&
      service.billing_type !== "free"
  );

  return (
    <article id="printable-contract" className="contract-document mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[18mm] py-[15mm] text-[14px] leading-[1.55] text-black shadow-xl print:min-h-0 print:max-w-none print:shadow-none">
      <header className="text-center">
        <p className="font-bold uppercase">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
        <p className="font-bold">Độc lập – Tự do – Hạnh phúc</p>
        <p>────────────</p>
        <h1 className="mt-5 text-xl font-bold uppercase">Hợp đồng thuê phòng trọ</h1>
        <p className="mt-1 text-sm">Số: {contract.code}</p>
      </header>

      <section className="mt-7 space-y-2">
        <p>Hôm nay ngày {start.day} tháng {start.month} năm {start.year}; tại địa chỉ: {line(contract.buildingAddress)}.</p>
        <p>Chúng tôi gồm:</p>
        <h2 className="font-bold">1. Đại diện bên cho thuê phòng trọ (Bên A):</h2>
        <p>Ông/bà: {line(owner.fullName)} &nbsp;&nbsp; Sinh ngày: {dateOrLine(owner.dateOfBirth)}</p>
        <p>Nơi đăng ký HK: {line(owner.permanentAddress)}</p>
        <p>CCCD/CMND số: {line(owner.documentNumber)}</p>
        <p>Số điện thoại: {line(owner.phone)}</p>

        <h2 className="pt-2 font-bold">2. Bên thuê phòng trọ (Bên B – Người đại diện):</h2>
        <p>Ông/bà: {line(contract.tenantName)} &nbsp;&nbsp; Sinh ngày: {dateOrLine(contract.tenantDateOfBirth)}</p>
        <p>Nơi đăng ký HK thường trú: {line(contract.tenantPermanentAddress)}</p>
        <p>Số CCCD/CMND: {line(contract.tenantDocumentNumber)}</p>
        <p>Số điện thoại: {line(contract.tenantPhone)}</p>

        <p className="pt-2">Sau khi bàn bạc trên tinh thần dân chủ, hai bên cùng có lợi, cùng thống nhất như sau:</p>
        <p>Bên A đồng ý cho bên B thuê 01 phòng số <strong>{contract.roomNumber}</strong> tại địa chỉ: {line(contract.buildingAddress)}.</p>
        <p>Giá thuê: <strong>{formatVND(contract.monthlyRent)}</strong>/tháng.</p>
        <p>Hình thức thanh toán: Thanh toán theo tháng, vào đầu mỗi kỳ thuê.</p>
        {electricity && <p>Tiền điện: {servicePrice(electricity)} tính theo chỉ số công tơ, thanh toán vào cuối tháng.</p>}
        {water && <p>Tiền nước: {servicePrice(water)}, thanh toán theo thỏa thuận.</p>}
        {chargeableServices.map((service) => <p key={service.id}>{service.service_name}: {servicePrice(service)}.</p>)}
        <p>Tiền đặt cọc: <strong>{formatVND(contract.deposit)}</strong>.</p>
        <p>Hợp đồng có giá trị kể từ ngày {start.day} tháng {start.month} năm {start.year} đến ngày {end.day} tháng {end.month} năm {end.year}.</p>
        {contract.members.length > 0 && (
          <div className="pt-2">
            <p className="font-bold">
              3. Những người cùng thuê/cùng ở thuộc Bên B:
            </p>
            {contract.members.map((member, index) => (
              <div
                key={member.id}
                className="mt-2 break-inside-avoid border-b border-dotted border-black/40 pb-2"
              >
                <p>
                  {index + 1}. Ông/bà: {member.full_name} – Quan hệ:{" "}
                  {member.relationship || "Cùng thuê"}
                </p>
                <p>
                  Sinh ngày: {dateOrLine(member.date_of_birth)} – CCCD/CMND số:{" "}
                  {line(member.document_number)}
                </p>
                <p>
                  Nơi đăng ký HK thường trú:{" "}
                  {line(member.permanent_address)}
                </p>
                <p>Số điện thoại: {line(member.phone)}</p>
              </div>
            ))}
            <p className="mt-2 italic">
              Những người nêu trên cùng sử dụng phòng và có trách nhiệm chấp
              hành các nội dung của hợp đồng này. Người đại diện Bên B chịu
              trách nhiệm chính về nghĩa vụ thanh toán và liên hệ với Bên A.
            </p>
          </div>
        )}
      </section>

      <ContractResponsibilities />

      {contract.note && <p className="mt-4"><strong>Thỏa thuận/Ghi chú bổ sung:</strong> {contract.note}</p>}

      <div className="mt-12 grid grid-cols-2 text-center font-bold">
        <div><p>ĐẠI DIỆN BÊN B</p><p className="font-normal italic">(Ký và ghi rõ họ tên)</p><div className="h-24" /><p>{contract.tenantName}</p></div>
        <div><p>ĐẠI DIỆN BÊN A</p><p className="font-normal italic">(Ký và ghi rõ họ tên)</p><div className="h-24" /><p>{owner.fullName || "……………………"}</p></div>
      </div>
      {contract.members.length > 0 && (
        <div className="mt-10 break-inside-avoid">
          <p className="text-center font-bold">
            XÁC NHẬN CỦA NHỮNG NGƯỜI CÙNG THUÊ/CÙNG Ở
          </p>
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-10 text-center">
            {contract.members.map((member) => (
              <div key={member.id}>
                <p className="font-bold">{member.full_name}</p>
                <p className="italic">(Ký và ghi rõ họ tên)</p>
                <div className="h-20" />
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function ContractResponsibilities() {
  return (
    <section className="mt-7 space-y-2">
      <h2 className="text-center text-base font-bold uppercase">Trách nhiệm của các bên</h2>
      <p className="font-bold">Trách nhiệm của Bên A:</p>
      <p>- Tạo mọi điều kiện thuận lợi để Bên B thực hiện theo hợp đồng.</p>
      <p>- Cung cấp nguồn điện, nước và các dịch vụ đã thỏa thuận để Bên B sử dụng.</p>
      <p className="font-bold">Trách nhiệm của Bên B:</p>
      <p>- Thanh toán đầy đủ các khoản tiền theo đúng thỏa thuận.</p>
      <p>- Bảo quản trang thiết bị và cơ sở vật chất; làm hỏng phải sửa, làm mất phải đền.</p>
      <p>- Không tự ý sửa chữa, cải tạo cơ sở vật chất khi chưa được Bên A đồng ý.</p>
      <p>- Giữ gìn vệ sinh trong và ngoài khuôn viên phòng trọ.</p>
      <p>- Chấp hành quy định pháp luật và quy định của địa phương.</p>
      <p>- Khách ở qua đêm phải được báo và Bên B chịu trách nhiệm trong thời gian khách lưu trú.</p>
      <h2 className="pt-3 text-center text-base font-bold uppercase">Trách nhiệm chung</h2>
      <p>- Hai bên tạo điều kiện cho nhau thực hiện hợp đồng.</p>
      <p>- Bên vi phạm thỏa thuận gây thiệt hại phải bồi thường và bên còn lại có quyền chấm dứt hợp đồng.</p>
      <p>- Muốn chấm dứt trước thời hạn phải báo trước ít nhất 30 ngày và được hai bên thống nhất.</p>
      <p>- Bên A hoàn trả tiền đặt cọc sau khi trừ các nghĩa vụ còn thiếu hoặc thiệt hại hợp lệ.</p>
      <p>- Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p>
    </section>
  );
}

function splitDate(value: string) {
  const [year, month, day] = value.split("-");
  return { day, month, year };
}
function dateOrLine(value: string | null) {
  return value ? formatDate(value) : "……/……/…………";
}
function line(value: string | null | undefined) {
  return value?.trim() || "…………………………………………";
}
function servicePrice(service: ContractView["services"][number]) {
  return service.billing_type === "free"
    ? "Miễn phí"
    : `${formatVND(Number(service.price))}/${service.unit}`;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"><div className="glass w-full max-w-xl rounded-2xl border border-white/[0.08]"><div className="flex items-center justify-between border-b border-border px-6 py-4"><h2 className="font-semibold text-white">{title}</h2><button type="button" onClick={onClose} aria-label="Đóng"><X size={18} className="text-text-muted" /></button></div>{children}</div></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs text-text-secondary"><span className="mb-2 block font-medium">{label}</span>{children}</label>; }
function MoneyInput({ value, onChange, required = false }: { value: number; onChange: (value: number) => void; required?: boolean }) {
  return (
    <div className="relative">
      <input
        required={required}
        inputMode="numeric"
        value={value ? value.toLocaleString("vi-VN") : ""}
        onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, "")))}
        className="form-input pr-14"
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-text-muted">VND</span>
    </div>
  );
}
function Toast({ result, onClose }: { result: ContractActionResult; onClose: () => void }) { return <div className="fixed right-5 top-5 z-[1100] w-[min(360px,calc(100vw-40px))]"><div className="glass flex gap-3 rounded-2xl border border-white/[0.08] p-4">{result.success ? <CheckCircle2 size={18} className="text-success" /> : <AlertCircle size={18} className="text-red-400" />}<p className="flex-1 text-xs text-text-secondary">{result.message}</p><button onClick={onClose} aria-label="Đóng"><X size={15} /></button></div></div>; }
