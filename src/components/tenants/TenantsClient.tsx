"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Edit2,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import CccdUpload, { type CccdData } from "@/components/shared/CccdUpload";
import { deleteLargeDraft } from "@/lib/browser-draft";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  deleteTenantAction,
  saveTenantAction,
  type TenantActionResult,
  type TenantInput,
} from "@/app/dashboard/tenants/actions";

export interface TenantView {
  id: string;
  identityDocumentId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  hometown: string | null;
  permanentAddress: string | null;
  occupation: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  documentNumber: string;
  issuedAt: string | null;
  verificationStatus: "pending" | "ocr_completed" | "verified" | "rejected";
  hasIdentityImages: boolean;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  hasContract: boolean;
}

const emptyInput: TenantInput = {
  fullName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  hometown: "",
  permanentAddress: "",
  occupation: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  documentNumber: "",
  issuedAt: "",
};

const TENANT_DRAFT_PREFIX = "nhatropro:tenant-form:v1";

function tenantDraftKey(tenantId?: string) {
  return `${TENANT_DRAFT_PREFIX}:${tenantId || "new"}`;
}

function clearTenantDraft(tenantId?: string) {
  const key = tenantDraftKey(tenantId);
  localStorage.removeItem(key);
  void deleteLargeDraft(`${key}:cccd`);
}

function imageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return (digits.startsWith("84") ? `0${digits.slice(2)}` : digits).slice(0, 10);
}

function normalizeDocumentInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 12);
}

function validateTenantBeforeUpload(input: TenantInput) {
  const fullName = input.fullName.trim();
  const phone = normalizePhoneInput(input.phone);
  const documentNumber = normalizeDocumentInput(input.documentNumber);

  if (fullName.length < 2) return "Họ tên phải có ít nhất 2 ký tự.";
  if (!/^0[35789]\d{8}$/.test(phone)) {
    return `Số điện thoại chưa đúng. Cần 10 số, hiện có ${phone.length} số.`;
  }
  if (!/^\d{12}$/.test(documentNumber)) {
    return `Số CCCD chưa đúng. Cần 12 số, hiện có ${documentNumber.length} số.`;
  }
  return null;
}

async function saveTenantWithImages(
  input: TenantInput,
  images: { front: File | null; back: File | null }
) {
  const validationError = validateTenantBeforeUpload(input);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const normalizedInput = {
    ...input,
    fullName: input.fullName.trim(),
    phone: normalizePhoneInput(input.phone),
    documentNumber: normalizeDocumentInput(input.documentNumber),
  };

  if (!images.front || !images.back) {
    return saveTenantAction(normalizedInput);
  }

  const supabase = createBrowserClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) {
    return { success: false, message: "Phiên đăng nhập đã hết hạn." };
  }

  const identityDocumentId =
    normalizedInput.identityDocumentId || crypto.randomUUID();
  const frontPath = `${data.user.id}/${identityDocumentId}/front.${imageExtension(images.front)}`;
  const backPath = `${data.user.id}/${identityDocumentId}/back.${imageExtension(images.back)}`;
  const bucket = supabase.storage.from("identity-documents");
  const [frontResult, backResult] = await Promise.all([
    bucket.upload(frontPath, images.front, {
      contentType: images.front.type,
      upsert: true,
    }),
    bucket.upload(backPath, images.back, {
      contentType: images.back.type,
      upsert: true,
    }),
  ]);

  if (frontResult.error || backResult.error) {
    return {
      success: false,
      message:
        frontResult.error?.message ||
        backResult.error?.message ||
        "Không thể tải ảnh CCCD lên Storage.",
    };
  }

  const result = await saveTenantAction({
    ...normalizedInput,
    identityDocumentId,
    frontImagePath: frontPath,
    backImagePath: backPath,
  });

  if (!result.success) {
    await bucket.remove([frontPath, backPath]);
  }

  return result;
}

function toDateInput(date: string) {
  const [day, month, year] = date.split("/");
  return day && month && year ? `${year}-${month}-${day}` : date;
}

function maskDocumentNumber(value: string) {
  return value.length === 12
    ? `${value.slice(0, 4)}••••${value.slice(-4)}`
    : value || "Chưa có";
}

export default function TenantsClient({ tenants }: { tenants: TenantView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<TenantView | null | undefined>(
    undefined
  );
  const [viewing, setViewing] = useState<TenantView | null>(null);
  const [deleting, setDeleting] = useState<TenantView | null>(null);
  const [toast, setToast] = useState<TenantActionResult | null>(null);

  const query = search.trim().toLocaleLowerCase("vi");
  const filtered = tenants.filter(
    (tenant) =>
      tenant.fullName.toLocaleLowerCase("vi").includes(query) ||
      tenant.phone.includes(query) ||
      tenant.documentNumber.includes(query) ||
      tenant.email?.toLocaleLowerCase("vi").includes(query)
  );

  function runAction(
    action: () => Promise<TenantActionResult>,
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
        <div className="relative max-w-sm flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            placeholder="Tìm tên, SĐT, CCCD, email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="form-input pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-xs"
        >
          <Plus size={14} /> Thêm người thuê
        </button>
      </div>

      <div className="glass overflow-hidden rounded-2xl border border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Người thuê",
                  "Số điện thoại",
                  "CCCD",
                  "Email",
                  "Quê quán",
                  "Trạng thái",
                  "Thao tác",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b border-border transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent/25 to-purple/25 text-xs font-bold text-white">
                        {tenant.fullName.trim().charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {tenant.fullName}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {tenant.occupation || "Chưa cập nhật nghề nghiệp"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-text-secondary">
                    {tenant.phone}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-text-secondary">
                    {maskDocumentNumber(tenant.documentNumber)}
                  </td>
                  <td className="px-5 py-4 text-xs text-text-muted">
                    {tenant.email || "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-text-secondary">
                    {tenant.hometown || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        tenant.hasContract
                          ? "bg-accent/15 text-accent"
                          : "bg-white/[0.05] text-text-muted"
                      }`}
                    >
                      {tenant.hasContract ? "Có hợp đồng" : "Chưa thuê"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <IconButton
                        label={`Xem ${tenant.fullName}`}
                        onClick={() => setViewing(tenant)}
                      >
                        <Eye size={14} />
                      </IconButton>
                      <IconButton
                        label={`Sửa ${tenant.fullName}`}
                        onClick={() => setEditing(tenant)}
                      >
                        <Edit2 size={14} />
                      </IconButton>
                      {tenant.hasContract ? (
                        <button
                          type="button"
                          disabled
                          title="Phải kết thúc hợp đồng trước khi xóa người thuê"
                          aria-label={`Không thể xóa ${tenant.fullName} vì đang có hợp đồng`}
                          className="cursor-not-allowed rounded-lg p-1.5 text-text-muted opacity-35"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <IconButton
                          label={`Xóa ${tenant.fullName}`}
                          danger
                          onClick={() => setDeleting(tenant)}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-text-muted">
            {tenants.length === 0
              ? "Chưa có người thuê nào."
              : "Không tìm thấy người thuê phù hợp."}
          </div>
        )}
        <div className="border-t border-border px-5 py-3 text-xs text-text-muted">
          Hiển thị {filtered.length}/{tenants.length} người
        </div>
      </div>

      {editing !== undefined && (
        <TenantFormModal
          tenant={editing}
          pending={pending}
          onClose={() => setEditing(undefined)}
          onSubmit={(input, images) =>
            runAction(() => saveTenantWithImages(input, images), () => {
              clearTenantDraft(editing?.id);
              setEditing(undefined);
            })
          }
        />
      )}

      {viewing && (
        <TenantDetail tenant={viewing} onClose={() => setViewing(null)} />
      )}

      {deleting && (
        <ConfirmDelete
          tenant={deleting}
          pending={pending}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            runAction(() => deleteTenantAction(deleting.id), () =>
              setDeleting(null)
            )
          }
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function TenantFormModal({
  tenant,
  pending,
  onClose,
  onSubmit,
}: {
  tenant: TenantView | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (
    input: TenantInput,
    images: { front: File | null; back: File | null }
  ) => void;
}) {
  const [form, setForm] = useState<TenantInput>(
    tenant
      ? {
          id: tenant.id,
          identityDocumentId: tenant.identityDocumentId ?? undefined,
          fullName: tenant.fullName,
          phone: tenant.phone,
          email: tenant.email ?? "",
          dateOfBirth: tenant.dateOfBirth ?? "",
          gender: tenant.gender ?? "",
          hometown: tenant.hometown ?? "",
          permanentAddress: tenant.permanentAddress ?? "",
          occupation: tenant.occupation ?? "",
          emergencyContactName: tenant.emergencyContactName ?? "",
          emergencyContactPhone: tenant.emergencyContactPhone ?? "",
          documentNumber: tenant.documentNumber,
          issuedAt: tenant.issuedAt ?? "",
        }
      : emptyInput
  );
  const [identityImages, setIdentityImages] = useState<{
    front: File | null;
    back: File | null;
  }>({ front: null, back: null });
  const [draftReady, setDraftReady] = useState(false);
  const draftKey = tenantDraftKey(tenant?.id);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          setForm(JSON.parse(saved) as TenantInput);
        }
      } catch {
        localStorage.removeItem(draftKey);
      } finally {
        setDraftReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady) return;
    localStorage.setItem(draftKey, JSON.stringify(form));
  }, [draftKey, draftReady, form]);

  function update(key: keyof TenantInput, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleCccd(data: CccdData) {
    setForm((current) => ({
      ...current,
      fullName: data.fullName,
      documentNumber: normalizeDocumentInput(data.cccd),
      dateOfBirth: toDateInput(data.dob),
      gender: data.gender,
      hometown: data.hometown,
      permanentAddress: data.address,
      issuedAt: toDateInput(data.issueDate),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(form, identityImages);
  }

  return (
    <Modal title={tenant ? "Sửa người thuê" : "Thêm người thuê"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-6">
          {(!tenant || !tenant.hasIdentityImages) && (
            <div className="rounded-xl border border-accent/15 bg-accent/[0.04] p-4">
              <p className="mb-3 text-xs font-semibold text-white">
                Đọc thông tin từ CCCD
              </p>
              <CccdUpload
                label="Ảnh CCCD người thuê"
                onDataExtracted={handleCccd}
                onImagesChange={setIdentityImages}
                draftKey={`${draftKey}:cccd`}
              />
              <p className="mt-3 text-[10px] text-text-muted">
                AI dùng ảnh để đọc và tự điền. Hãy kiểm tra lại thông tin trước
                khi lưu.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên *">
              <input
                required
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Số điện thoại *">
              <input
                required
                inputMode="tel"
                value={form.phone}
                onChange={(event) =>
                  update("phone", normalizePhoneInput(event.target.value))
                }
                className="form-input"
              />
            </Field>
            <Field label="Số CCCD *">
              <input
                required
                inputMode="numeric"
                maxLength={12}
                value={form.documentNumber}
                onChange={(event) =>
                  update(
                    "documentNumber",
                    normalizeDocumentInput(event.target.value)
                  )
                }
                className="form-input font-mono"
              />
            </Field>
            <Field label="Ngày sinh">
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => update("dateOfBirth", event.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Giới tính">
              <input
                value={form.gender}
                onChange={(event) => update("gender", event.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Quê quán">
              <input
                value={form.hometown}
                onChange={(event) => update("hometown", event.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Ngày cấp CCCD">
              <input
                type="date"
                value={form.issuedAt}
                onChange={(event) => update("issuedAt", event.target.value)}
                className="form-input"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Địa chỉ thường trú">
                <input
                  value={form.permanentAddress}
                  onChange={(event) =>
                    update("permanentAddress", event.target.value)
                  }
                  className="form-input"
                />
              </Field>
            </div>
            <Field label="Nghề nghiệp">
              <input
                value={form.occupation}
                onChange={(event) => update("occupation", event.target.value)}
                className="form-input"
              />
            </Field>
            <Field label="Tên liên hệ khẩn cấp">
              <input
                value={form.emergencyContactName}
                onChange={(event) =>
                  update("emergencyContactName", event.target.value)
                }
                className="form-input"
              />
            </Field>
            <Field label="SĐT liên hệ khẩn cấp">
              <input
                inputMode="tel"
                value={form.emergencyContactPhone}
                onChange={(event) =>
                  update("emergencyContactPhone", event.target.value)
                }
                className="form-input"
              />
            </Field>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-text-muted">
            {draftReady
              ? "Bản nháp đang được tự động lưu trên thiết bị này"
              : "Đang khôi phục bản nháp..."}
          </p>
          <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-outline px-4 py-2 text-xs">
            Đóng
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
        </div>
      </form>
    </Modal>
  );
}

function TenantDetail({
  tenant,
  onClose,
}: {
  tenant: TenantView;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<{
    url: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    if (!preview) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [preview]);

  return (
    <>
      <Modal title="Thông tin người thuê" onClose={onClose}>
        <div className="space-y-5 p-6">
        <div>
          <h3 className="text-lg font-bold text-white">{tenant.fullName}</h3>
          <p className="text-xs text-text-muted">
            {tenant.occupation || "Chưa cập nhật nghề nghiệp"}
          </p>
        </div>
        <div className="space-y-3 text-xs">
          <Info icon={Phone} label="Số điện thoại" value={tenant.phone} />
          <Info icon={Mail} label="Email" value={tenant.email || "—"} />
          <Info
            icon={CreditCard}
            label="CCCD"
            value={tenant.documentNumber || "Chưa có"}
          />
          <Info icon={MapPin} label="Quê quán" value={tenant.hometown || "—"} />
          <Info
            icon={Phone}
            label="Liên hệ khẩn cấp"
            value={
              [tenant.emergencyContactName, tenant.emergencyContactPhone]
                .filter(Boolean)
                .join(" — ") || "—"
            }
          />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs">
          <p className="font-semibold text-white">Xác minh CCCD</p>
          <p className="mt-1 text-text-muted">
            {tenant.hasIdentityImages
              ? "Đã có đủ ảnh mặt trước và mặt sau."
              : "Chưa có đủ ảnh CCCD trong Storage."}
          </p>
          {tenant.frontImageUrl && tenant.backImageUrl && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                {
                  url: tenant.frontImageUrl,
                  label: "Mặt trước CCCD",
                },
                {
                  url: tenant.backImageUrl,
                  label: "Mặt sau CCCD",
                },
              ].map((image) => (
                <button
                  key={image.label}
                  type="button"
                  onClick={() => setPreview(image)}
                  className="group relative overflow-hidden rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
                  aria-label={`Xem toàn màn hình ${image.label.toLocaleLowerCase("vi")}`}
                >
                  <Image
                    src={image.url}
                    alt={image.label}
                    width={420}
                    height={260}
                    unoptimized
                    className="h-28 w-full object-cover transition-transform group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
                    <Maximize2
                      size={20}
                      className="text-white opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100"
                    />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </Modal>

      {preview && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={preview.label}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <Image
              src={preview.url}
              alt={preview.label}
              width={1600}
              height={1000}
              unoptimized
              priority
              className="max-h-[92vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
            <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
              {preview.label}
            </div>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/60 p-2 text-white transition-colors hover:bg-white/15"
              aria-label="Đóng ảnh toàn màn hình"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ConfirmDelete({
  tenant,
  pending,
  onClose,
  onConfirm,
}: {
  tenant: TenantView;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Xóa người thuê" onClose={onClose}>
      <div className="p-6 text-sm text-text-secondary">
        Bạn chắc chắn muốn xóa <strong className="text-white">{tenant.fullName}</strong>?
        {tenant.hasContract && (
          <p className="mt-3 text-xs text-warning">
            Người này đang có hợp đồng nên database sẽ không cho phép xóa.
          </p>
        )}
      </div>
      <div className="flex justify-end gap-3 border-t border-border p-4">
        <button type="button" onClick={onClose} className="btn-outline px-4 py-2 text-xs">
          Hủy
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          Xóa
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="glass my-auto w-full max-w-xl rounded-2xl border border-white/[0.08]"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X size={18} className="text-text-muted" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-text-secondary">
      <span className="mb-2 block font-medium">{label}</span>
      {children}
    </label>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={14} className="text-text-muted" />
      <span className="w-28 text-text-muted">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function IconButton({
  label,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded-lg p-1.5 transition-colors ${
        danger
          ? "text-text-muted hover:bg-red-500/10 hover:text-red-400"
          : "text-text-muted hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Toast({
  toast,
  onClose,
}: {
  toast: TenantActionResult;
  onClose: () => void;
}) {
  return (
    <div className="fixed right-5 top-5 z-[1100] w-[min(360px,calc(100vw-40px))]">
      <div className="glass flex gap-3 rounded-2xl border border-white/[0.08] p-4 shadow-2xl">
        {toast.success ? (
          <CheckCircle2 size={18} className="text-success" />
        ) : (
          <AlertCircle size={18} className="text-red-400" />
        )}
        <p className="flex-1 text-xs text-text-secondary">{toast.message}</p>
        <button type="button" onClick={onClose} aria-label="Đóng thông báo">
          <X size={15} className="text-text-muted" />
        </button>
      </div>
    </div>
  );
}
