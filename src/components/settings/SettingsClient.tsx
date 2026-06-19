"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Save,
  User,
} from "lucide-react";
import CccdUpload, { type CccdData } from "@/components/shared/CccdUpload";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  saveBankSettingsAction,
  saveNotificationSettingsAction,
  saveOwnerProfileAction,
  type SettingsActionResult,
} from "@/app/dashboard/settings/actions";

type Tab = "profile" | "bank" | "notifications";

export interface SettingsInitialData {
  ownerProfileId: string | null;
  identityDocumentId: string | null;
  email: string;
  phone: string;
  fullName: string;
  documentNumber: string;
  dateOfBirth: string;
  gender: string;
  hometown: string;
  permanentAddress: string;
  issuedAt: string;
  issuedBy: string;
  hasIdentityImages: boolean;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  notifications: {
    zaloReminder: boolean;
    emailReport: boolean;
    contractExpiry: boolean;
    overduePayment: boolean;
  };
  settingsTableReady: boolean;
}

function toDateInput(date: string) {
  const [day, month, year] = date.split("/");
  return day && month && year ? `${year}-${month}-${day}` : date;
}

function extension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export default function SettingsClient({
  initialData,
}: {
  initialData: SettingsInitialData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [result, setResult] = useState<SettingsActionResult | null>(null);
  const [images, setImages] = useState<{
    front: File | null;
    back: File | null;
  }>({ front: null, back: null });
  const [profile, setProfile] = useState({
    fullName: initialData.fullName,
    email: initialData.email,
    phone: initialData.phone,
    documentNumber: initialData.documentNumber,
    dateOfBirth: initialData.dateOfBirth,
    gender: initialData.gender,
    hometown: initialData.hometown,
    permanentAddress: initialData.permanentAddress,
    issuedAt: initialData.issuedAt,
    issuedBy: initialData.issuedBy,
  });
  const [bank, setBank] = useState({
    bankName: initialData.bankName,
    accountNumber: initialData.bankAccountNumber,
    accountHolder: initialData.bankAccountHolder,
  });
  const [notifications, setNotifications] = useState(
    initialData.notifications
  );

  function run(action: () => Promise<SettingsActionResult>) {
    setResult(null);
    startTransition(async () => {
      const response = await action();
      setResult(response);
      if (response.success) router.refresh();
    });
  }

  async function saveProfile() {
    const identityDocumentId =
      initialData.identityDocumentId ?? crypto.randomUUID();
    let frontImagePath: string | undefined;
    let backImagePath: string | undefined;

    if (images.front && images.back) {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setResult({ success: false, message: "Phiên đăng nhập đã hết hạn." });
        return;
      }
      frontImagePath = `${data.user.id}/${identityDocumentId}/front.${extension(images.front)}`;
      backImagePath = `${data.user.id}/${identityDocumentId}/back.${extension(images.back)}`;
      const bucket = supabase.storage.from("identity-documents");
      const [frontResult, backResult] = await Promise.all([
        bucket.upload(frontImagePath, images.front, {
          contentType: images.front.type,
          upsert: true,
        }),
        bucket.upload(backImagePath, images.back, {
          contentType: images.back.type,
          upsert: true,
        }),
      ]);
      if (frontResult.error || backResult.error) {
        setResult({
          success: false,
          message:
            frontResult.error?.message ||
            backResult.error?.message ||
            "Không thể tải ảnh CCCD.",
        });
        return;
      }
    }

    run(() =>
      saveOwnerProfileAction({
        ownerProfileId: initialData.ownerProfileId ?? undefined,
        identityDocumentId,
        fullName: profile.fullName,
        documentNumber: profile.documentNumber,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        hometown: profile.hometown,
        permanentAddress: profile.permanentAddress,
        issuedAt: profile.issuedAt,
        issuedBy: profile.issuedBy,
        frontImagePath,
        backImagePath,
      })
    );
  }

  function handleCccd(data: CccdData) {
    setProfile((current) => ({
      ...current,
      fullName: data.fullName,
      documentNumber: data.cccd.replace(/\D/g, "").slice(0, 12),
      dateOfBirth: toDateInput(data.dob),
      gender: data.gender,
      hometown: data.hometown,
      permanentAddress: data.address,
      issuedAt: toDateInput(data.issueDate),
      issuedBy: data.issuedBy ?? "",
    }));
  }

  function saveCurrentTab() {
    if (activeTab === "profile") {
      void saveProfile();
    } else if (activeTab === "bank") {
      run(() => saveBankSettingsAction(bank));
    } else {
      run(() => saveNotificationSettingsAction(notifications));
    }
  }

  const tabs = [
    { key: "profile" as const, label: "Hồ sơ", icon: User },
    { key: "bank" as const, label: "Ngân hàng", icon: CreditCard },
    { key: "notifications" as const, label: "Thông báo", icon: Bell },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.04] bg-white/[0.03] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setResult(null);
            }}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-medium ${
              activeTab === tab.key
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl border border-white/[0.06]">
        {activeTab === "profile" && (
          <div className="space-y-5 p-6">
            <div>
              <h3 className="font-semibold text-white">Thông tin chủ nhà</h3>
              <p className="mt-1 text-xs text-text-muted">
                Dữ liệu này được dùng để tự điền Bên A trên hợp đồng.
              </p>
            </div>
            <div className="rounded-xl border border-accent/15 bg-accent/[0.04] p-4">
              <CccdUpload
                label="Ảnh CCCD chủ tài khoản"
                onDataExtracted={handleCccd}
                onImagesChange={setImages}
                draftKey="nhatropro:owner-profile:cccd"
              />
              {initialData.hasIdentityImages && !images.front && (
                <p className="mt-3 text-[10px] text-success">
                  Đã có ảnh CCCD trong Storage. Chọn ảnh mới nếu muốn thay thế.
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ và tên *"><input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="form-input" /></Field>
              <Field label="Email"><input value={profile.email} readOnly className="form-input opacity-70" /><span className="mt-1 block text-[9px] text-text-muted">Đổi email cần xác nhận qua Supabase Auth.</span></Field>
              <Field label="Số điện thoại tài khoản"><input value={profile.phone} readOnly className="form-input opacity-70" /><span className="mt-1 block text-[9px] text-text-muted">Số này đã được xác minh khi đăng ký tài khoản.</span></Field>
              <Field label="Số CCCD *"><input inputMode="numeric" value={profile.documentNumber} onChange={(e) => setProfile({ ...profile, documentNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })} className="form-input font-mono" /></Field>
              <Field label="Ngày sinh"><input type="date" value={profile.dateOfBirth} onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })} className="form-input" /></Field>
              <Field label="Giới tính"><input value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} className="form-input" /></Field>
              <Field label="Ngày cấp CCCD"><input type="date" value={profile.issuedAt} onChange={(e) => setProfile({ ...profile, issuedAt: e.target.value })} className="form-input" /></Field>
              <Field label="Nơi cấp"><input value={profile.issuedBy} onChange={(e) => setProfile({ ...profile, issuedBy: e.target.value })} className="form-input" /></Field>
              <Field label="Quê quán"><input value={profile.hometown} onChange={(e) => setProfile({ ...profile, hometown: e.target.value })} className="form-input" /></Field>
              <Field label="Địa chỉ thường trú"><input value={profile.permanentAddress} onChange={(e) => setProfile({ ...profile, permanentAddress: e.target.value })} className="form-input" /></Field>
            </div>
          </div>
        )}

        {activeTab === "bank" && (
          <div className="space-y-5 p-6">
            <div>
              <h3 className="font-semibold text-white">Tài khoản ngân hàng</h3>
              <p className="mt-1 text-xs text-text-muted">
                Dùng để tạo QR thanh toán trên hóa đơn sau này.
              </p>
            </div>
            {!initialData.settingsTableReady && <MigrationNotice />}
            <Field label="Ngân hàng"><input value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} className="form-input" placeholder="VD: Vietcombank" /></Field>
            <Field label="Số tài khoản">
              <div className="relative">
                <input type={showBankAccount ? "text" : "password"} value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\s/g, "") })} className="form-input pr-12 font-mono" />
                <button type="button" onClick={() => setShowBankAccount((current) => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white" aria-label={showBankAccount ? "Ẩn số tài khoản" : "Hiện số tài khoản"}>{showBankAccount ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </Field>
            <Field label="Chủ tài khoản"><input value={bank.accountHolder} onChange={(e) => setBank({ ...bank, accountHolder: e.target.value.toUpperCase() })} className="form-input" /></Field>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-5 p-6">
            <h3 className="font-semibold text-white">Cài đặt thông báo</h3>
            {!initialData.settingsTableReady && <MigrationNotice />}
            {[
              ["zaloReminder", "Nhắc nhở Zalo Bot", "Nhắc người thuê gửi chỉ số hàng tháng"],
              ["emailReport", "Báo cáo email", "Nhận báo cáo hoạt động qua email"],
              ["contractExpiry", "Hợp đồng sắp hết hạn", "Thông báo trước khi hợp đồng hết hạn"],
              ["overduePayment", "Nợ quá hạn", "Thông báo khi hóa đơn quá hạn"],
            ].map(([key, label, description]) => {
              const settingKey = key as keyof typeof notifications;
              return (
                <div key={key} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                  <div><p className="text-sm font-medium text-white">{label}</p><p className="mt-1 text-[10px] text-text-muted">{description}</p></div>
                  <button type="button" role="switch" aria-checked={notifications[settingKey]} onClick={() => setNotifications({ ...notifications, [settingKey]: !notifications[settingKey] })} className={`relative h-6 w-11 rounded-full ${notifications[settingKey] ? "bg-accent" : "bg-white/10"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${notifications[settingKey] ? "left-[22px]" : "left-[3px]"}`} /></button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div aria-live="polite">
            {result && <span className={`flex items-center gap-1 text-xs ${result.success ? "text-success" : "text-red-400"}`}>{result.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}{result.message}</span>}
          </div>
          <button type="button" onClick={saveCurrentTab} disabled={pending} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs disabled:opacity-60">{pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Lưu thay đổi</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-text-secondary"><span className="mb-2 block">{label}</span>{children}</label>;
}

function MigrationNotice() {
  return <p className="rounded-xl border border-warning/20 bg-warning/[0.06] p-3 text-xs text-warning">Cần chạy `database/migrations/0010_account_settings.sql` trong Supabase SQL Editor trước khi lưu mục này.</p>;
}
