"use client";

import { useState } from "react";
import {
  MessageCircle,
  Bot,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Settings,
  Zap,
  Users,
  Image,
  FileText,
} from "lucide-react";

const botStatus = {
  connected: true,
  name: "NhaTroPro Bot",
  oaId: "4185932718...",
  lastActive: "2 phút trước",
  totalSent: 1247,
  totalReceived: 983,
};

const messageTemplates = [
  { id: "remind", name: "Nhắc gửi số điện nước", desc: "Gửi tin nhắc nhở đến tất cả phòng chưa gửi số", icon: Zap, color: "text-accent bg-accent/10" },
  { id: "invoice", name: "Gửi hóa đơn", desc: "Gửi hóa đơn kèm QR thanh toán qua Zalo", icon: FileText, color: "text-purple bg-purple/10" },
  { id: "payment", name: "Nhắc thanh toán", desc: "Nhắc các phòng chưa thanh toán hóa đơn", icon: AlertTriangle, color: "text-warning bg-warning/10" },
  { id: "custom", name: "Tin nhắn tùy chỉnh", desc: "Soạn và gửi tin nhắn tự do đến nhóm phòng", icon: MessageCircle, color: "text-teal bg-teal/10" },
];

const recentMessages = [
  { time: "14:32", direction: "out", room: "P201", content: "🔔 Xin chào! Đã đến kỳ chốt số điện nước T6/2026. Vui lòng gửi ảnh công tơ nhé!", status: "delivered" },
  { time: "14:35", direction: "in", room: "P201", content: "📸 [Ảnh công tơ điện]", status: "received" },
  { time: "14:35", direction: "out", room: "P201", content: "✅ Đã đọc số ĐIỆN: 1,320 kWh. Gõ OK để xác nhận hoặc SAI [số đúng]", status: "delivered" },
  { time: "14:36", direction: "in", room: "P201", content: "OK", status: "received" },
  { time: "14:36", direction: "out", room: "P201", content: "✅ Đã xác nhận. Chờ ảnh công tơ NƯỚC nhé!", status: "delivered" },
  { time: "14:40", direction: "out", room: "P102", content: "🔔 Nhắc nhở: Vui lòng gửi ảnh công tơ điện nước T6/2026", status: "delivered" },
  { time: "14:42", direction: "in", room: "P102", content: "📸 [Ảnh công tơ điện]", status: "received" },
  { time: "14:42", direction: "out", room: "P102", content: "✅ Đã đọc số ĐIỆN: 890 kWh. Gõ OK để xác nhận", status: "delivered" },
];

const roomProgress = [
  { room: "P101", electric: true, water: true, confirmed: true },
  { room: "P102", electric: true, water: false, confirmed: false },
  { room: "P103", electric: true, water: true, confirmed: true },
  { room: "P105", electric: false, water: false, confirmed: false },
  { room: "P106", electric: true, water: true, confirmed: true },
  { room: "P201", electric: true, water: true, confirmed: true },
  { room: "P202", electric: true, water: false, confirmed: false },
  { room: "P204", electric: false, water: false, confirmed: false },
];

export default function ZaloPage() {
  const [activeTab, setActiveTab] = useState<"messages" | "templates" | "progress">("messages");

  const confirmedCount = roomProgress.filter((r) => r.confirmed).length;

  return (
    <div className="space-y-6">
      {/* ═══ Bot status ═══ */}
      <div className="glass rounded-2xl p-6 border border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0068ff]/15 flex items-center justify-center border border-[#0068ff]/20">
              <Bot size={28} className="text-[#0068ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-outfit)" }}>{botStatus.name}</h3>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Online
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">OA ID: {botStatus.oaId} • Hoạt động {botStatus.lastActive}</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>{botStatus.totalSent.toLocaleString()}</p>
              <p className="text-[10px] text-text-muted">Tin gửi</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>{botStatus.totalReceived.toLocaleString()}</p>
              <p className="text-[10px] text-text-muted">Tin nhận</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-success" style={{ fontFamily: "var(--font-outfit)" }}>{confirmedCount}/{roomProgress.length}</p>
              <p className="text-[10px] text-text-muted">Đã xác nhận</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Quick actions ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {messageTemplates.map((tpl) => (
          <button key={tpl.id} className="glass glass-hover rounded-2xl p-5 border border-white/[0.06] text-left transition-all group">
            <div className={`w-10 h-10 rounded-xl ${tpl.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <tpl.icon size={20} />
            </div>
            <p className="text-sm font-semibold text-white mb-1">{tpl.name}</p>
            <p className="text-[10px] text-text-muted leading-relaxed">{tpl.desc}</p>
          </button>
        ))}
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.04] w-fit">
        {([
          { key: "messages", label: "Tin nhắn gần đây" },
          { key: "progress", label: "Tiến độ chốt số" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.key ? "bg-accent text-white shadow-md shadow-accent/25" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Tab content ═══ */}
      {activeTab === "messages" && (
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Lịch sử tin nhắn</h3>
            <button className="flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"><RefreshCw size={12} /> Làm mới</button>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
            {recentMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.direction === "out" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                  msg.direction === "out"
                    ? "bg-[#0068ff]/20 border border-[#0068ff]/15 rounded-tr-sm"
                    : "bg-white/[0.05] border border-white/[0.06] rounded-tl-sm"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-semibold text-accent">{msg.room}</span>
                    <span className="text-[9px] text-text-muted">{msg.time}</span>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "progress" && (
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold text-white">Tiến độ chốt số T6/2026</h3>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex-1 h-2 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-all duration-500" style={{ width: `${(confirmedCount / roomProgress.length) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-white">{Math.round((confirmedCount / roomProgress.length) * 100)}%</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Phòng</th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Số điện</th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Số nước</th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Xác nhận</th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {roomProgress.map((rp) => (
                  <tr key={rp.room} className="border-b border-border hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-sm font-semibold text-white">{rp.room}</td>
                    <td className="px-5 py-3 text-center">
                      {rp.electric ? <CheckCircle2 size={16} className="text-success mx-auto" /> : <Clock size={16} className="text-text-muted mx-auto" />}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {rp.water ? <CheckCircle2 size={16} className="text-success mx-auto" /> : <Clock size={16} className="text-text-muted mx-auto" />}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {rp.confirmed
                        ? <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-success/15 text-success">Hoàn tất</span>
                        : <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-warning/15 text-warning">Đang chờ</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-center">
                      {!rp.confirmed && (
                        <button className="text-xs text-accent hover:text-accent-light flex items-center gap-1 mx-auto"><Send size={12} /> Nhắc lại</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
