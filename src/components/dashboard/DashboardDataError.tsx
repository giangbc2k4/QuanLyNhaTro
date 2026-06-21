interface DashboardDataErrorProps {
  title: string;
  message: string;
  hint?: string;
}

/**
 * Trạng thái lỗi dùng chung cho các trang dashboard khi truy vấn Supabase lỗi.
 */
export default function DashboardDataError({
  title,
  message,
  hint,
}: DashboardDataErrorProps) {
  return (
    <div className="glass rounded-2xl border border-red-500/20 p-6">
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-red-400">{message}</p>
      {hint && <p className="mt-3 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
