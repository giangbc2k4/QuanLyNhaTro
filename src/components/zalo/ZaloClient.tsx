"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  Link2,
  Loader2,
  Search,
  Smartphone,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  unlinkZaloAction,
  type ZaloActionResult,
} from "@/app/dashboard/zalo/actions";
import { formatDate } from "@/lib/design-system";

type ContractStatus =
  | "draft"
  | "active"
  | "expiring"
  | "expired"
  | "terminated";

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
  latestSubmissionStatus: string | null;
  latestSubmissionAt: string | null;
}

const statusLabel: Record<ContractStatus, string> = {
  draft: "Bản nháp",
  active: "Đang hiệu lực",
  expiring: "Sắp hết hạn",
  expired: "Đã hết hạn",
  terminated: "Đã kết thúc",
};

const meterStatusLabel: Record<string, string> = {
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
  const [confirming, setConfirming] = useState<ZaloLinkView | null>(null);
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
              className="glass rounded-2xl border border-white/[0.06] p-5"
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
                  onClick={() => setConfirming(link)}
                  className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={13} /> Gỡ liên kết
                </button>
              </div>
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

      {toast && <Toast result={toast} onClose={() => setToast(null)} />}
    </div>
  );
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
