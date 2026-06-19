"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Droplets,
  Edit2,
  Loader2,
  Plus,
  ReceiptText,
  Sparkles,
  Trash2,
  WashingMachine,
  Snowflake,
  Flame,
  X,
  Zap,
} from "lucide-react";
import {
  deleteServiceAction,
  saveServiceAction,
  type ServiceActionResult,
  type ServiceInput,
} from "@/app/dashboard/services/actions";

export interface ServiceView {
  id: string;
  name: string;
  unit: string;
  price: number;
  billingType: "metered" | "fixed" | "free";
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  roomCount: number;
}

function formatMoneyInput(value: string | number) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
}

function parseMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function serviceIcon(name: string) {
  const normalized = name.toLocaleLowerCase("vi");
  if (normalized.includes("điện")) return Zap;
  if (normalized.includes("nước")) return Droplets;
  if (normalized.includes("giặt")) return WashingMachine;
  if (normalized.includes("vệ sinh") || normalized.includes("dọn")) return Sparkles;
  if (normalized.includes("điều hòa")) return Snowflake;
  if (normalized.includes("nóng lạnh")) return Flame;
  return ReceiptText;
}

export default function ServicesClient({
  services,
}: {
  services: ServiceView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ServiceView | null | undefined>(
    undefined
  );
  const [deleting, setDeleting] = useState<ServiceView | null>(null);
  const [toast, setToast] = useState<ServiceActionResult | null>(null);

  function runAction(
    action: () => Promise<ServiceActionResult>,
    onSuccess: () => void
  ) {
    setToast(null);
    startTransition(async () => {
      const result = await action();
      setToast(result);
      if (result.success) {
        onSuccess();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Bảng giá dịch vụ</h2>
          <p className="mt-1 text-xs text-text-muted">
            Giá ở đây được dùng cho những phòng đã chọn dịch vụ tương ứng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-xs"
        >
          <Plus size={15} /> Thêm dịch vụ
        </button>
      </div>

      {services.length === 0 ? (
        <div className="glass flex min-h-72 flex-col items-center justify-center rounded-2xl text-center">
          <ReceiptText size={30} className="text-text-muted" />
          <p className="mt-4 text-sm font-semibold text-white">
            Chưa có dịch vụ
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Thêm dịch vụ để gán cho các phòng.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const Icon = serviceIcon(service.name);
            return (
              <article
                key={service.id}
                className={`glass rounded-2xl border p-5 ${
                  service.isActive
                    ? "border-white/[0.06]"
                    : "border-white/[0.03] opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{service.name}</h3>
                        {service.isDefault && (
                          <span className="rounded-full bg-purple/10 px-2 py-0.5 text-[9px] font-semibold text-purple">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-text-muted">
                        {service.billingType === "metered"
                          ? "Tính theo chỉ số sử dụng"
                          : service.billingType === "free"
                            ? "Tiện ích miễn phí"
                            : "Phí cố định"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(service)}
                      className="rounded-lg p-2 text-text-muted hover:bg-white/[0.05] hover:text-white"
                      aria-label={`Sửa ${service.name}`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(service)}
                      className="rounded-lg p-2 text-text-muted hover:bg-red-500/10 hover:text-red-400"
                      aria-label={`Xóa ${service.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold text-white">
                      {service.billingType === "free" ? (
                        <span className="text-success">Miễn phí</span>
                      ) : (
                        <>
                          {service.price.toLocaleString("vi-VN")}
                          <span className="ml-1 text-xs font-medium text-text-muted">
                            VND/{service.unit}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="mt-2 text-[10px] text-text-muted">
                      Đang dùng tại {service.roomCount} phòng
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      service.isActive
                        ? "bg-success/10 text-success"
                        : "bg-white/[0.05] text-text-muted"
                    }`}
                  >
                    {service.isActive ? "Đang dùng" : "Tạm tắt"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing !== undefined && (
        <ServiceFormModal
          service={editing}
          pending={pending}
          onClose={() => setEditing(undefined)}
          onSubmit={(input) =>
            runAction(() => saveServiceAction(input), () =>
              setEditing(undefined)
            )
          }
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="glass w-full max-w-md rounded-2xl border border-white/[0.08]"
          >
            <div className="p-6">
              <h3 className="font-semibold text-white">
                Xóa dịch vụ “{deleting.name}”?
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Dịch vụ sẽ được gỡ khỏi {deleting.roomCount} phòng đang sử dụng.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-border p-4">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={pending}
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-text-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  runAction(() => deleteServiceAction(deleting.id), () =>
                    setDeleting(null)
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {pending && <Loader2 size={14} className="animate-spin" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-5 top-5 z-[1100] w-[min(360px,calc(100vw-40px))]">
          <div
            className={`glass flex gap-3 rounded-2xl border p-4 shadow-2xl ${
              toast.success ? "border-success/25" : "border-red-500/25"
            }`}
          >
            {toast.success ? (
              <CheckCircle2 size={18} className="text-success" />
            ) : (
              <AlertCircle size={18} className="text-red-400" />
            )}
            <p className="flex-1 text-xs text-text-secondary">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Đóng thông báo"
            >
              <X size={15} className="text-text-muted" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceFormModal({
  service,
  pending,
  onClose,
  onSubmit,
}: {
  service: ServiceView | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: ServiceInput) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [unit, setUnit] = useState(service?.unit ?? "tháng");
  const [price, setPrice] = useState(
    service ? formatMoneyInput(service.price) : ""
  );
  const [billingType, setBillingType] = useState<
    "metered" | "fixed" | "free"
  >(
    service?.billingType ?? "fixed"
  );
  const [description, setDescription] = useState(service?.description ?? "");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      id: service?.id,
      name,
      unit,
      price: parseMoneyInput(price),
      billingType,
      description,
      isActive,
    });
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="glass my-auto w-full max-w-lg rounded-2xl border border-white/[0.08]"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-semibold text-white">
            {service ? "Sửa dịch vụ" : "Thêm dịch vụ"}
          </h3>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X size={18} className="text-text-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 p-6">
            <label className="col-span-2 text-xs text-text-secondary">
              <span className="mb-2 block">Tên dịch vụ</span>
              <input
                autoFocus
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="form-input"
                placeholder="Ví dụ: Internet"
              />
            </label>
            <label className="text-xs text-text-secondary">
              <span className="mb-2 block">Cách tính</span>
              <select
                value={billingType}
                onChange={(event) =>
                  setBillingType(
                    event.target.value as "metered" | "fixed" | "free"
                  )
                }
                className="form-input"
              >
                <option value="fixed">Phí cố định</option>
                <option value="metered">Theo chỉ số</option>
                <option value="free">Miễn phí</option>
              </select>
            </label>
            <label className="text-xs text-text-secondary">
              <span className="mb-2 block">Đơn vị</span>
              <input
                required
                maxLength={30}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className="form-input"
                placeholder="kWh, m³, tháng..."
              />
            </label>
            {billingType !== "free" && (
              <label className="col-span-2 text-xs text-text-secondary">
                <span className="mb-2 block">Đơn giá</span>
                <div className="relative">
                  <input
                    required
                    inputMode="numeric"
                    value={price}
                    onChange={(event) =>
                      setPrice(formatMoneyInput(event.target.value))
                    }
                    className="form-input pr-14"
                    placeholder="100.000"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-muted">
                    VND
                  </span>
                </div>
              </label>
            )}
            <label className="col-span-2 text-xs text-text-secondary">
              <span className="mb-2 block">Ghi chú</span>
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="form-input resize-none"
              />
            </label>
            <label className="col-span-2 flex items-center gap-3 rounded-xl border border-white/[0.06] p-3 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 accent-blue-500"
              />
              Cho phép chọn dịch vụ này cho phòng
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-text-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="btn-primary flex items-center gap-2 px-5 py-2 text-xs disabled:opacity-60"
            >
              {pending && <Loader2 size={14} className="animate-spin" />}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
