"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="glass rounded-2xl border border-red-500/20 p-8 text-center">
      <AlertTriangle className="mx-auto text-red-400" size={30} />
      <h2 className="mt-4 font-semibold text-white">
        Trang quản lý gặp sự cố
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-text-muted">
        {error.message || "Không thể hoàn tất yêu cầu hiện tại."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white"
      >
        <RefreshCw size={14} />
        Thử lại
      </button>
    </div>
  );
}
