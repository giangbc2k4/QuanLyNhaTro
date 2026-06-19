"use client";

import {
  Building2,
  Users,
  DoorOpen,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Zap,
  FileText,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatVND, formatVNDShort } from "@/lib/design-system";

// ─── Mock Data ─────────────────────────────────────────────

const stats = [
  {
    label: "Tổng phòng",
    value: 48,
    suffix: "",
    change: "+4",
    trend: "up" as const,
    icon: Building2,
    color: "blue",
    bg: "bg-accent/10",
    textColor: "text-accent",
  },
  {
    label: "Đang thuê",
    value: 42,
    suffix: "",
    change: "+2",
    trend: "up" as const,
    icon: Users,
    color: "green",
    bg: "bg-success/10",
    textColor: "text-success",
  },
  {
    label: "Phòng trống",
    value: 6,
    suffix: "",
    change: "-2",
    trend: "down" as const,
    icon: DoorOpen,
    color: "amber",
    bg: "bg-warning/10",
    textColor: "text-warning",
  },
  {
    label: "Doanh thu T6",
    value: 86400000,
    suffix: "đ",
    change: "+12%",
    trend: "up" as const,
    icon: TrendingUp,
    color: "purple",
    bg: "bg-purple/10",
    textColor: "text-purple",
  },
];

const revenueData = [
  { month: "T1", value: 45 },
  { month: "T2", value: 52 },
  { month: "T3", value: 60 },
  { month: "T4", value: 72 },
  { month: "T5", value: 78 },
  { month: "T6", value: 86.4 },
];

const rooms = [
  { number: "101", status: "occupied", tenant: "Nguyễn Văn A", price: 3500000 },
  { number: "102", status: "occupied", tenant: "Trần Thị B", price: 3000000 },
  { number: "103", status: "occupied", tenant: "Lê Văn C", price: 3500000 },
  { number: "104", status: "vacant", tenant: null, price: 3200000 },
  { number: "105", status: "occupied", tenant: "Phạm Thị D", price: 3500000 },
  { number: "106", status: "occupied", tenant: "Hoàng Văn E", price: 3000000 },
  { number: "201", status: "occupied", tenant: "Vũ Thị F", price: 4000000 },
  { number: "202", status: "occupied", tenant: "Đặng Văn G", price: 4000000 },
  { number: "203", status: "vacant", tenant: null, price: 3800000 },
  { number: "204", status: "occupied", tenant: "Bùi Thị H", price: 4000000 },
  { number: "205", status: "occupied", tenant: "Ngô Văn I", price: 3500000 },
  { number: "206", status: "occupied", tenant: "Dương Thị K", price: 3500000 },
  { number: "301", status: "occupied", tenant: "Mai Văn L", price: 4500000 },
  { number: "302", status: "vacant", tenant: null, price: 4200000 },
  { number: "303", status: "occupied", tenant: "Trịnh Thị M", price: 4500000 },
  { number: "304", status: "occupied", tenant: "Lý Văn N", price: 4500000 },
];

const recentActivities = [
  { icon: CheckCircle2, text: "P201 — Đã xác nhận số điện: 1,320 kWh", time: "5 phút trước", color: "text-success" },
  { icon: FileText, text: "Đã tạo 12 hóa đơn tháng 6/2026", time: "1 giờ trước", color: "text-accent" },
  { icon: MessageCircle, text: "Zalo Bot đã gửi nhắc nhở 42 phòng", time: "3 giờ trước", color: "text-purple" },
  { icon: AlertCircle, text: "P104 — Hợp đồng sắp hết hạn (còn 7 ngày)", time: "5 giờ trước", color: "text-warning" },
  { icon: Clock, text: "P302 — Chưa thanh toán hóa đơn T5", time: "1 ngày trước", color: "text-red-400" },
];

const quickActions = [
  { icon: Zap, label: "Nhắc gửi số", desc: "Zalo Bot nhắc tất cả", color: "bg-accent/10 text-accent hover:bg-accent/20" },
  { icon: FileText, label: "Tạo hóa đơn", desc: "Chốt số tháng này", color: "bg-purple/10 text-purple hover:bg-purple/20" },
  { icon: Users, label: "Thêm người thuê", desc: "Tạo hợp đồng mới", color: "bg-teal/10 text-teal hover:bg-teal/20" },
  { icon: Building2, label: "Thêm phòng", desc: "Mở rộng quản lý", color: "bg-success/10 text-success hover:bg-success/20" },
];

// ─── Dashboard Page ────────────────────────────────────────

export default function DashboardPage() {
  const maxRevenue = Math.max(...revenueData.map((d) => d.value));

  return (
    <div className="space-y-6">
      {/* ═══ Stats cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.1] transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} className={stat.textColor} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${stat.trend === "up" ? "text-success" : "text-warning"}`}>
                {stat.trend === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.change}
              </div>
            </div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">
              {stat.label}
            </p>
            <p
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              {stat.label === "Doanh thu T6"
                ? formatVNDShort(stat.value)
                : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ═══ Main grid: Chart + Activities ═══ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3
                className="text-base font-semibold text-white"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                Doanh thu 6 tháng
              </h3>
              <p className="text-xs text-text-muted mt-0.5">Đơn vị: triệu VND</p>
            </div>
            <button className="p-2 rounded-lg hover:bg-white/[0.04] text-text-muted transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-3 h-48">
            {revenueData.map((d, i) => {
              const height = (d.value / maxRevenue) * 100;
              const isLast = i === revenueData.length - 1;
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-xs font-semibold text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.value}tr
                  </span>
                  <div className="w-full relative">
                    <div
                      className={`w-full rounded-lg transition-all duration-500 ${
                        isLast
                          ? "bg-gradient-to-t from-accent to-accent-light shadow-lg shadow-accent/20"
                          : "bg-gradient-to-t from-accent/40 to-accent/15 group-hover:from-accent/60 group-hover:to-accent/25"
                      }`}
                      style={{ height: `${height * 1.8}px` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${isLast ? "text-accent" : "text-text-muted"}`}>
                    {d.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="glass rounded-2xl p-6 border border-white/[0.06]">
          <h3
            className="text-base font-semibold text-white mb-5"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Hoạt động gần đây
          </h3>
          <div className="space-y-4">
            {recentActivities.map((act, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <div className={`mt-0.5 ${act.color} flex-shrink-0`}>
                  <act.icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {act.text}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Quick actions ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className={`flex items-center gap-3 p-4 rounded-2xl border border-white/[0.06] transition-all duration-200 text-left ${action.color}`}
          >
            <action.icon size={22} className="flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="text-[10px] opacity-60">{action.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ═══ Room grid ═══ */}
      <div className="glass rounded-2xl p-6 border border-white/[0.06]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3
              className="text-base font-semibold text-white"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              Sơ đồ phòng — Tòa A
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              <span className="text-accent">●</span> Đang thuê ({rooms.filter((r) => r.status === "occupied").length}) &nbsp;
              <span className="text-success">●</span> Trống ({rooms.filter((r) => r.status === "vacant").length})
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {rooms.map((room) => {
            const isOccupied = room.status === "occupied";
            return (
              <div
                key={room.number}
                className={`rounded-xl p-3 text-center cursor-pointer transition-all duration-200 hover:-translate-y-1 border ${
                  isOccupied
                    ? "bg-accent/[0.06] border-accent/20 hover:border-accent/40"
                    : "bg-success/[0.06] border-success/20 hover:border-success/40"
                }`}
              >
                <p
                  className={`text-lg font-bold ${isOccupied ? "text-accent" : "text-success"}`}
                  style={{ fontFamily: "var(--font-outfit)" }}
                >
                  {room.number}
                </p>
                <p className="text-[10px] text-text-muted mt-1 truncate">
                  {isOccupied ? room.tenant : "Trống"}
                </p>
                <p className="text-[9px] text-text-muted mt-0.5">
                  {formatVNDShort(room.price)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
