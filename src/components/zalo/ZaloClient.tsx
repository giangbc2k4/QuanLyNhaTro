"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  ImageIcon,
  Link2,
  Loader2,
  Search,
  Smartphone,
  Trash2,
  Droplets,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useAutoDismiss } from "@/lib/use-auto-dismiss";
import {
  unlinkZaloAction,
  type ZaloActionResult,
} from "@/app/dashboard/zalo/actions";
import { formatDate } from "@/lib/format";
import type {
  ContractStatus,
  MeterSubmissionStatus,
} from "@/lib/domain-types";

// Một liên kết Zalo kèm hợp đồng và lịch sử ảnh để chủ nhà đối chiếu.
export interface ZaloLinkView {
  id: string;
  zaloUserId: string;
  verifiedAt: string;
  tenantName: string;
  tenantPhone: string;
  contractCode: string;
  contractStatus: ContractStatus;
  contractStart: string | null;
  contractEnd: string | null;
  roomNumber: string;
  buildingName: string;
  buildingAddress: string;
  latestSubmissionStatus: MeterSubmissionStatus | null;
  latestSubmissionAt: string | null;
  submissions: ZaloSubmissionView[];
}

export interface ZaloSubmissionView {
  id: string;
  billingMonth: string;
  status: MeterSubmissionStatus;
  imageUrl: string | null;
  roomNumber: string;
  buildingName: string;
  aiProvider: string | null;
  aiModel: string | null;
  aiReadings: Array<{
    type: string;
    value: number;
    unit: string;
    confidence: number | null;
  }>;
  confirmedValues: Array<{
    serviceName: string;
    value: number;
    unit: string;
    confidence: number | null;
  }>;
  errorMessage: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

const statusLabel: Record<ContractStatus, string> = {
  draft: "Bản nháp",
  active: "Đang hiệu lực",
  expiring: "Sắp hết hạn",
  expired: "Đã hết hạn",
  terminated: "Đã kết thúc",
};

const meterStatusLabel: Record<MeterSubmissionStatus, string> = {
  processing: "Đang đọc ảnh",
  awaiting_confirmation: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  rejected: "Đã gửi lại",
  failed: "Đọc ảnh lỗi",
};

export default function ZaloClient({
  links,
  botConfigured,
}: {
  links: ZaloLinkView[];
  botConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ZaloActionResult | null>(null);
  useAutoDismiss(toast, setToast);
  const [confirming, setConfirming] = useState<ZaloLinkView | null>(null);
  const [viewing, setViewing] = useState<ZaloLinkView | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const query = search.trim().toLocaleLowerCase("vi");
  const filtered = links.filter(
    (link) =>
      !query ||
      link.tenantName.toLocaleLowerCase("vi").includes(query) ||
      link.tenantPhone.includes(query) ||
      link.roomNumber.toLocaleLowerCase("vi").includes(query) ||
      link.buildingName.toLocaleLowerCase("vi").includes(query) ||
      link.contractCode.toLocaleLowerCase("vi").includes(query)
  );
  const activeLinks = links.filter((link) =>
    ["active", "expiring"].includes(link.contractStatus)
  ).length;
  const confirmedReadings = links.filter(
    (link) => link.latestSubmissionStatus === "confirmed"
  ).length;

  function unlink() {
    if (!confirming) return;
    setToast(null);
    startTransition(async () => {
      const result = await unlinkZaloAction(confirming.id);
      setToast(result);
      if (result.success) {
        setConfirming(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl border border-white/[0.06] p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#0068ff]/20 bg-[#0068ff]/15">
              <Bot size={28} className="text-[#3686ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white">Zalo Bot</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                    botConfigured
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {botConfigured ? "Đã cấu hình" : "Thiếu Bot Token"}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Theo dõi các Zalo đã liên kết với hợp đồng thuê.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <Stat value={links.length} label="Đã liên kết" />
            <Stat value={activeLinks} label="Còn hiệu lực" color="text-success" />
            <Stat
              value={confirmedReadings}
              label="Đã chốt số"
              color="text-accent"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="form-input pl-9"
            placeholder="Tìm người thuê, phòng, tòa nhà..."
          />
        </div>
        <p className="text-xs text-text-muted">
          Người thuê liên kết bằng lệnh{" "}
          <span className="font-mono text-accent">LIENKET 123</span>
        </p>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((link) => (
            <article
              key={link.id}
              className="glass rounded-2xl border border-white/[0.06] p-5 transition hover:border-[#3686ff]/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0068ff]/15 text-[#3686ff]">
                    <UserRound size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {link.tenantName}
                    </h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {link.tenantPhone || "Chưa có số điện thoại"}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    ["active", "expiring"].includes(link.contractStatus)
                      ? "bg-success/15 text-success"
                      : "bg-white/10 text-text-muted"
                  }`}
                >
                  {statusLabel[link.contractStatus]}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Info
                  icon={Building2}
                  label="Phòng"
                  value={`${link.roomNumber} — ${link.buildingName}`}
                />
                <Info
                  icon={Link2}
                  label="Hợp đồng"
                  value={link.contractCode}
                />
                <Info
                  icon={Smartphone}
                  label="Zalo ID"
                  value={`••••${link.zaloUserId.slice(-6)}`}
                />
                <Info
                  icon={Clock3}
                  label="Liên kết lúc"
                  value={formatDate(link.verifiedAt)}
                />
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    Ảnh công tơ gần nhất
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {link.latestSubmissionStatus
                      ? meterStatusLabel[link.latestSubmissionStatus] ??
                        link.latestSubmissionStatus
                      : "Chưa gửi ảnh"}
                    {link.latestSubmissionAt
                      ? ` · ${formatDate(link.latestSubmissionAt)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirming(link);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={13} /> Gỡ liên kết
                </button>
              </div>
              <button
                type="button"
                onClick={() => setViewing(link)}
                className="mt-3 flex w-full items-center justify-end gap-1 rounded-lg py-1 text-[10px] font-medium text-[#67a0ff] hover:text-[#8bb7ff]"
              >
                <Eye size={12} />
                Xem ảnh điện và nước
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
          <Link2 size={28} className="mx-auto text-text-muted" />
          <h3 className="mt-3 text-sm font-semibold text-white">
            {links.length ? "Không tìm thấy liên kết" : "Chưa có ai liên kết bot"}
          </h3>
          <p className="mt-2 text-xs text-text-muted">
            Người thuê gửi lệnh LIENKET cùng 3 số cuối điện thoại cho bot.
          </p>
        </div>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={() => setConfirming(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="unlink-zalo-title"
        >
          <div
            className="glass w-full max-w-md rounded-2xl border border-white/[0.08] p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 id="unlink-zalo-title" className="font-semibold text-white">
              Gỡ liên kết Zalo?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              {confirming.tenantName} sẽ phải gửi lại lệnh LIENKET nếu muốn sử
              dụng bot cho phòng {confirming.roomNumber}.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs text-text-secondary"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={unlink}
                className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {pending && <Loader2 size={14} className="animate-spin" />}
                Gỡ liên kết
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={() => setViewing(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="zalo-history-title"
        >
          <div
            className="glass flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/[0.08]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 id="zalo-history-title" className="font-semibold text-white">
                  Lịch sử ảnh — {viewing.tenantName}
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  Phòng {viewing.roomNumber} · {viewing.buildingName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg p-2 text-text-muted hover:bg-white/[0.06] hover:text-white"
                aria-label="Đóng lịch sử"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <MeterHistory
                submissions={viewing.submissions}
                onImageClick={setFullImage}
              />
            </div>
          </div>
        </div>
      )}

      {fullImage && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullImage(null)}
        >
          {/* Signed private Storage URL: keep native img to avoid proxying it through Next Image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullImage}
            alt="Ảnh công tơ kích thước đầy đủ"
            className="max-h-full max-w-full rounded-xl object-contain"
          />
          <button
            type="button"
            onClick={() => setFullImage(null)}
            className="absolute right-5 top-5 rounded-full bg-black/50 p-2 text-white"
            aria-label="Đóng ảnh"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {toast && <Toast result={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

type MeterKind = "electric" | "water";

function MeterHistory({
  submissions,
  onImageClick,
}: {
  submissions: ZaloSubmissionView[];
  onImageClick: (url: string) => void;
}) {
  const dataMonths = [
    ...new Set(
      submissions.map((submission) => submission.billingMonth.slice(0, 7))
    ),
  ].sort((a, b) => b.localeCompare(a));
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonthNumber = String(now.getMonth() + 1).padStart(2, "0");
  const years = [
    ...new Set([
      currentYear,
      ...dataMonths.map((month) => month.slice(0, 4)),
    ]),
  ].sort((a, b) => b.localeCompare(a));
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${currentMonthNumber}`
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "confirmed" | "pending"
  >("all");
  const months = Array.from(
    { length: 12 },
    (_, index) =>
      `${selectedYear}-${String(index + 1).padStart(2, "0")}`
  );
  const displayedMonths = months.filter((month) => month === selectedMonth);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-[10px] font-medium text-text-muted">
          Năm
          <select
            value={selectedYear}
            onChange={(event) => {
              const year = event.target.value;
              setSelectedYear(year);
              setSelectedMonth(`${year}-${selectedMonth.slice(5)}`);
            }}
            className="form-input mt-1.5"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                Năm {year}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-[10px] font-medium text-text-muted">
          Tháng ghi số
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="form-input mt-1.5"
          >
            {months.map((month) => (
              <option key={month} value={month}>
                Tháng {month.slice(5)}/{month.slice(0, 4)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-[10px] font-medium text-text-muted">
          Trạng thái
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "confirmed" | "pending"
              )
            }
            className="form-input mt-1.5"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="pending">Đang chờ xác nhận</option>
          </select>
        </label>
      </div>

      {displayedMonths.map((month) => {
        const monthlySubmissions = getVisibleSubmissions(
          submissions.filter(
            (submission) => submission.billingMonth.slice(0, 7) === month
          )
        ).filter((submission) =>
          statusFilter === "all"
            ? true
            : statusFilter === "confirmed"
              ? submission.status === "confirmed"
              : ["processing", "awaiting_confirmation"].includes(
                  submission.status
                )
        );

        return (
          <section key={month} className="space-y-3">
            <div className="flex items-center gap-3">
              <h4 className="shrink-0 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Tháng {month.slice(5)}/{month.slice(0, 4)}
              </h4>
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-text-muted">
                {monthlySubmissions.length} ảnh
              </span>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <MeterColumn
                kind="electric"
                title="Điện"
                icon={Zap}
                submissions={monthlySubmissions}
                onImageClick={onImageClick}
              />
              <MeterColumn
                kind="water"
                title="Nước"
                icon={Droplets}
                submissions={monthlySubmissions}
                onImageClick={onImageClick}
              />
            </div>
          </section>
        );
      })}

      {!displayedMonths.length && (
        <div className="py-14 text-center">
          <ImageIcon size={28} className="mx-auto text-text-muted" />
          <p className="mt-3 text-xs text-text-muted">
            Chưa có lịch sử ảnh công tơ.
          </p>
        </div>
      )}
    </div>
  );
}

function MeterColumn({
  kind,
  title,
  icon: Icon,
  submissions,
  onImageClick,
}: {
  kind: MeterKind;
  title: string;
  icon: typeof Zap;
  submissions: ZaloSubmissionView[];
  onImageClick: (url: string) => void;
}) {
  const matching = submissions.filter((submission) =>
    submissionKinds(submission).includes(kind)
  );

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon size={17} />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            <p className="text-[10px] text-text-muted">
              Ảnh đã xác nhận và ảnh mới nhất đang chờ
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] text-text-muted">
          {matching.length} ảnh
        </span>
      </div>
      {matching.length ? (
        <div className="space-y-4">
          {matching.map((submission) => (
            <SubmissionCard
              key={`${kind}-${submission.id}`}
              submission={submission}
              kind={kind}
              onImageClick={onImageClick}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.07] text-center">
          <ImageIcon size={24} className="text-text-muted" />
          <p className="mt-2 text-xs text-text-muted">
            Chưa có ảnh {title.toLocaleLowerCase("vi")} phù hợp.
          </p>
        </div>
      )}
    </section>
  );
}

function SubmissionCard({
  submission,
  kind,
  onImageClick,
}: {
  submission: ZaloSubmissionView;
  kind: MeterKind;
  onImageClick: (url: string) => void;
}) {
  const displayValues =
    submission.confirmedValues.length > 0
      ? submission.confirmedValues
          .filter(
            (value) => serviceKind(value.serviceName, value.unit) === kind
          )
          .map((value) => ({
            label: value.serviceName,
            value: value.value,
            unit: value.unit,
            confirmed: true,
          }))
      : submission.aiReadings
          .filter((value) => value.type === kind)
          .map((value) => ({
            label: kind === "electric" ? "Điện" : "Nước",
            value: value.value,
            unit: value.unit,
            confirmed: false,
          }));

  return (
    <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      {submission.imageUrl ? (
        <button
          type="button"
          onClick={() => onImageClick(submission.imageUrl!)}
          className="group relative h-48 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-black/20"
        >
          {/* Signed private Storage URL: keep native img to avoid proxying it through Next Image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={submission.imageUrl}
            alt={`Ảnh công tơ phòng ${submission.roomNumber}`}
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
          <span className="absolute inset-x-0 bottom-0 bg-black/65 px-3 py-2 text-[10px] text-white">
            Bấm để xem ảnh đầy đủ
          </span>
        </button>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-text-muted">
          <ImageIcon size={24} />
        </div>
      )}
      <div className="mt-4 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">
              Phòng {submission.roomNumber} · {submission.buildingName}
            </p>
            <p className="mt-1 text-[10px] text-text-muted">
              Gửi lúc {formatDateTime(submission.createdAt)} · Kỳ{" "}
              {submission.billingMonth.slice(0, 7)}
            </p>
          </div>
          <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold text-text-secondary">
            {meterStatusLabel[submission.status] ?? submission.status}
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {displayValues.map((value, index) => (
            <div
              key={`${value.label}-${index}`}
              className="rounded-xl border border-white/[0.06] p-3"
            >
              <p className="text-[10px] text-text-muted">
                {value.confirmed ? "Đã xác nhận" : "AI đọc được"} · {value.label}
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {value.value.toLocaleString("vi-VN")}{" "}
                <span className="text-xs font-medium text-text-muted">
                  {value.unit}
                </span>
              </p>
            </div>
          ))}
        </div>
        {!displayValues.length && (
          <p className="mt-4 text-xs text-text-muted">
            Chưa có chỉ số được đọc hoặc xác nhận.
          </p>
        )}
        {submission.errorMessage && (
          <p className="mt-3 rounded-lg bg-red-500/10 p-2 text-[10px] text-red-400">
            {submission.errorMessage}
          </p>
        )}
        <p className="mt-3 text-[10px] text-text-muted">
          {submission.confirmedAt
            ? `Xác nhận lúc ${formatDateTime(submission.confirmedAt)}`
            : submission.aiProvider
              ? `AI: ${submission.aiProvider}${submission.aiModel ? ` · ${submission.aiModel}` : ""}`
              : "Chưa có kết quả AI"}
        </p>
      </div>
    </article>
  );
}

function getVisibleSubmissions(submissions: ZaloSubmissionView[]) {
  const confirmed = submissions.filter(
    (submission) => submission.status === "confirmed"
  );
  const latestPending = submissions.find((submission) =>
    ["processing", "awaiting_confirmation"].includes(submission.status)
  );

  return latestPending
    ? [
        latestPending,
        ...confirmed.filter((submission) => submission.id !== latestPending.id),
      ]
    : confirmed;
}

function submissionKinds(submission: ZaloSubmissionView): MeterKind[] {
  const kinds = new Set<MeterKind>();
  for (const value of submission.confirmedValues) {
    const kind = serviceKind(value.serviceName, value.unit);
    if (kind) kinds.add(kind);
  }
  if (submission.confirmedValues.length > 0) return [...kinds];
  for (const reading of submission.aiReadings) {
    if (reading.type === "electric" || reading.type === "water") {
      kinds.add(reading.type);
    }
  }
  return [...kinds];
}

function serviceKind(value: string, unit = ""): MeterKind | null {
  const normalized = `${value} ${unit}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi");
  if (normalized.includes("dien") || normalized.includes("kwh")) {
    return "electric";
  }
  if (
    normalized.includes("nuoc") ||
    normalized.includes("m3") ||
    normalized.includes("m³")
  ) {
    return "water";
  }
  return null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function Stat({
  value,
  label,
  color = "text-white",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-text-muted">{label}</p>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-text-muted" />
      <div className="min-w-0">
        <p className="text-[10px] text-text-muted">{label}</p>
        <p className="mt-0.5 truncate text-xs text-text-secondary">{value}</p>
      </div>
    </div>
  );
}

function Toast({
  result,
  onClose,
}: {
  result: ZaloActionResult;
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed right-5 top-5 z-[1100] flex max-w-sm items-start gap-3 rounded-xl border bg-[#101827] p-4 shadow-2xl ${
        result.success ? "border-success/25" : "border-red-500/25"
      }`}
    >
      {result.success ? (
        <CheckCircle2 size={18} className="text-success" />
      ) : (
        <AlertCircle size={18} className="text-red-400" />
      )}
      <p className="flex-1 text-xs text-text-secondary">{result.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="text-text-muted hover:text-white"
        aria-label="Đóng thông báo"
      >
        <X size={14} />
      </button>
    </div>
  );
}
