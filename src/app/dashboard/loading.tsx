import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div
      className="flex min-h-[45vh] items-center justify-center"
      role="status"
      aria-label="Đang tải dữ liệu"
    >
      <Loader2 className="animate-spin text-accent" size={28} />
    </div>
  );
}
