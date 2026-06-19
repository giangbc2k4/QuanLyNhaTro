"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  CheckCircle2,
  CreditCard,
  Loader2,
  ScanEye,
  X,
} from "lucide-react";
import {
  deleteLargeDraft,
  readLargeDraft,
  writeLargeDraft,
} from "@/lib/browser-draft";

export interface CccdData {
  fullName: string;
  cccd: string;
  dob: string;
  gender: string;
  hometown: string;
  address: string;
  issueDate: string;
  issuedBy?: string;
  confidence?: number;
}

interface CccdUploadProps {
  label?: string;
  onDataExtracted?: (data: CccdData) => void;
  onImagesChange?: (images: {
    front: File | null;
    back: File | null;
  }) => void;
  compact?: boolean;
  draftKey?: string;
}

type ImageSide = "front" | "back";
type ScanStage = "idle" | "preparing" | "uploading" | "reading" | "completed";

interface CccdDraft {
  frontImage: string | null;
  backImage: string | null;
  extractedData: CccdData | null;
}

const scanStages: Array<{
  stage: Exclude<ScanStage, "idle">;
  label: string;
  progress: number;
}> = [
  { stage: "preparing", label: "Chuẩn bị ảnh", progress: 15 },
  { stage: "uploading", label: "Gửi ảnh an toàn", progress: 35 },
  { stage: "reading", label: "AI đang đọc thông tin", progress: 75 },
  { stage: "completed", label: "Đã điền thông tin", progress: 100 },
];

async function dataUrlToFile(dataUrl: string, name: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type });
}

export default function CccdUpload({
  label = "Ảnh CCCD/CMND",
  onDataExtracted,
  onImagesChange,
  compact = false,
  draftKey,
}: CccdUploadProps) {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<CccdData | null>(null);
  const [scanError, setScanError] = useState("");
  const [scanStage, setScanStage] = useState<ScanStage>("idle");
  const [draftRestored, setDraftRestored] = useState(!draftKey);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const onImagesChangeRef = useRef(onImagesChange);

  useEffect(() => {
    onImagesChangeRef.current = onImagesChange;
  }, [onImagesChange]);

  useEffect(() => {
    if (!draftKey) return;

    let active = true;

    readLargeDraft<CccdDraft>(draftKey)
      .then(async (draft) => {
        if (!active || !draft) return;

        setFrontImage(draft.frontImage);
        setBackImage(draft.backImage);
        setExtractedData(draft.extractedData);
        setScanStage(draft.extractedData ? "completed" : "idle");

        const [restoredFront, restoredBack] = await Promise.all([
          draft.frontImage
            ? dataUrlToFile(draft.frontImage, "cccd-front")
            : null,
          draft.backImage ? dataUrlToFile(draft.backImage, "cccd-back") : null,
        ]);

        if (!active) return;
        setFrontFile(restoredFront);
        setBackFile(restoredBack);
        onImagesChangeRef.current?.({
          front: restoredFront,
          back: restoredBack,
        });
      })
      .catch(() => {
        // Draft recovery is optional; OCR still works without browser storage.
      })
      .finally(() => {
        if (active) setDraftRestored(true);
      });

    return () => {
      active = false;
    };
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !draftRestored) return;
    if (!frontImage && !backImage && !extractedData) {
      void deleteLargeDraft(draftKey);
      return;
    }
    void writeLargeDraft<CccdDraft>(draftKey, {
      frontImage,
      backImage,
      extractedData,
    });
  }, [backImage, draftKey, draftRestored, extractedData, frontImage]);

  function handleFileSelect(
    side: ImageSide,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setScanError("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > 1.4 * 1024 * 1024) {
      setScanError("Mỗi ảnh CCCD không được vượt quá 1,4 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const preview = loadEvent.target?.result as string;
      if (side === "front") {
        setFrontFile(file);
        setFrontImage(preview);
        onImagesChangeRef.current?.({ front: file, back: backFile });
      } else {
        setBackFile(file);
        setBackImage(preview);
        onImagesChangeRef.current?.({ front: frontFile, back: file });
      }
      setExtractedData(null);
      setScanStage("idle");
      setScanError("");
    };
    reader.readAsDataURL(file);
  }

  async function handleScan() {
    if (!frontFile || !backFile) return;

    setScanning(true);
    setScanStage("preparing");
    setScanError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setScanStage("uploading");
      const formData = new FormData();
      formData.append("front", frontFile);
      formData.append("back", backFile);

      await new Promise((resolve) => setTimeout(resolve, 250));
      setScanStage("reading");
      const response = await fetch("/api/ai/cccd-ocr", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        data?: CccdData;
        error?: string;
      };

      if (!response.ok || !result.data) {
        throw new Error(result.error || "Không thể đọc ảnh CCCD.");
      }

      setExtractedData(result.data);
      setScanStage("completed");
      onImagesChangeRef.current?.({ front: frontFile, back: backFile });
      onDataExtracted?.(result.data);
    } catch (error) {
      setScanStage("idle");
      setScanError(
        error instanceof Error ? error.message : "Không thể đọc ảnh CCCD."
      );
    } finally {
      setScanning(false);
    }
  }

  function clearAll() {
    setFrontFile(null);
    setBackFile(null);
    setFrontImage(null);
    setBackImage(null);
    setExtractedData(null);
    setScanStage("idle");
    setScanError("");
    onImagesChangeRef.current?.({ front: null, back: null });
    if (draftKey) void deleteLargeDraft(draftKey);
    if (frontRef.current) frontRef.current.value = "";
    if (backRef.current) backRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <CreditCard size={13} className="text-text-muted" />
          {label}
        </p>
        {(frontImage || backImage) && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-red-400"
          >
            <X size={10} /> Xóa ảnh
          </button>
        )}
      </div>

      <div className={`grid gap-3 ${compact ? "grid-cols-2" : "sm:grid-cols-2"}`}>
        <ImagePicker
          side="front"
          title="Mặt trước"
          image={frontImage}
          inputRef={frontRef}
          scanned={Boolean(extractedData)}
          onChange={(event) => handleFileSelect("front", event)}
        />
        <ImagePicker
          side="back"
          title="Mặt sau"
          image={backImage}
          inputRef={backRef}
          scanned={Boolean(extractedData)}
          onChange={(event) => handleFileSelect("back", event)}
        />
      </div>

      {(frontImage || backImage) && !extractedData && (
        <>
          {(!frontImage || !backImage) && (
            <p className="text-center text-[10px] text-warning">
              Vui lòng tải đủ ảnh mặt trước và mặt sau.
            </p>
          )}
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning || !frontFile || !backFile}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal/20 bg-teal/10 px-4 py-2.5 text-xs font-semibold text-teal hover:bg-teal/15 disabled:opacity-60"
          >
            {scanning ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                AI đang đọc CCCD...
              </>
            ) : (
              <>
                <ScanEye size={14} />
                AI đọc thông tin từ ảnh CCCD
              </>
            )}
          </button>
        </>
      )}

      {scanning && (
        <ScanProgress currentStage={scanStage} />
      )}

      {scanError && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[10px] text-red-400">
          {scanError}
        </p>
      )}

      {extractedData && (
        <div className="space-y-2 rounded-xl border border-success/20 bg-success/[0.04] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-success" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-success">
              AI đã đọc thành công
              {typeof extractedData.confidence === "number"
                ? ` · ${Math.round(extractedData.confidence)}%`
                : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Họ tên", extractedData.fullName],
              ["Số CCCD", extractedData.cccd],
              ["Ngày sinh", extractedData.dob],
              ["Giới tính", extractedData.gender],
              ["Quê quán", extractedData.hometown],
              ["Ngày cấp", extractedData.issueDate],
            ].map(([itemLabel, value]) => (
              <div key={itemLabel}>
                <p className="text-[9px] text-text-muted">{itemLabel}</p>
                <p className="text-[11px] font-semibold text-white">
                  {value || "Không đọc được"}
                </p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[9px] text-text-muted">Địa chỉ thường trú</p>
            <p className="text-[11px] font-semibold text-white">
              {extractedData.address || "Không đọc được"}
            </p>
          </div>
          <p className="pt-1 text-[9px] text-teal">
            Hãy kiểm tra lại thông tin trước khi lưu.
          </p>
        </div>
      )}
    </div>
  );
}

function ScanProgress({ currentStage }: { currentStage: ScanStage }) {
  const currentIndex = Math.max(
    0,
    scanStages.findIndex((item) => item.stage === currentStage)
  );
  const current = scanStages[currentIndex];

  return (
    <div
      className="rounded-xl border border-teal/20 bg-teal/[0.05] p-3"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between text-[10px]">
        <span className="font-semibold text-teal">{current.label}</span>
        <span className="font-mono text-text-muted">{current.progress}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={current.progress}
      >
        <div
          className="h-full rounded-full bg-teal transition-all duration-500"
          style={{ width: `${current.progress}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {scanStages.map((item, index) => (
          <div
            key={item.stage}
            className={`text-center text-[8px] ${
              index <= currentIndex ? "text-teal" : "text-text-muted"
            }`}
          >
            <div
              className={`mx-auto mb-1 h-1.5 w-1.5 rounded-full ${
                index <= currentIndex ? "bg-teal" : "bg-white/10"
              }`}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ImagePicker({
  side,
  title,
  image,
  inputRef,
  scanned,
  onChange,
}: {
  side: ImageSide;
  title: string;
  image: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  scanned: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
      {image ? (
        <div className="group relative overflow-hidden rounded-xl border border-accent/20">
          <Image
            src={image}
            alt={`CCCD ${title.toLocaleLowerCase("vi")}`}
            width={480}
            height={280}
            unoptimized
            className="h-28 w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-white/20 px-3 py-1 text-[10px] text-white backdrop-blur-sm"
            >
              Đổi ảnh
            </button>
          </div>
          <div className="absolute left-1.5 top-1.5 rounded-md bg-accent/80 px-1.5 py-0.5 text-[8px] font-bold text-white">
            {side === "front" ? "MẶT TRƯỚC" : "MẶT SAU"}
          </div>
          {scanned && (
            <CheckCircle2
              size={16}
              className="absolute right-1.5 top-1.5 text-success"
            />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] hover:border-accent/30 hover:bg-accent/[0.03]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 transition-transform group-hover:scale-110">
            <Camera size={16} className="text-accent" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold text-text-secondary">
              {title}
            </p>
            <p className="text-[9px] text-text-muted">Chụp/tải ảnh CCCD</p>
          </div>
        </button>
      )}
    </div>
  );
}
