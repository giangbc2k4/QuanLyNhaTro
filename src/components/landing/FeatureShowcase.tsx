import {
  ScanEye,
  MessageCircle,
  QrCode,
  CheckCircle2,
} from "lucide-react";

const showcases = [
  {
    id: "zalo-bot",
    badge: "Zalo Bot",
    badgeColor: "text-accent border-accent/20",
    title: "Tự động hóa qua Zalo Bot",
    titleHighlight: "Zalo Bot",
    description:
      "Bot tự động nhắn tin cho người thuê mỗi tháng, nhận ảnh công tơ, đọc chỉ số bằng AI, gửi hóa đơn kèm QR thanh toán — tất cả không cần bạn động tay.",
    features: [
      "Nhắc nhở gửi số điện nước hàng loạt",
      "Nhận ảnh → AI OCR đọc số tự động",
      "Gửi hóa đơn chi tiết + QR VietQR",
      "Lưu log tin nhắn để theo dõi",
    ],
    visual: "zalo",
    reverse: false,
  },
  {
    id: "ai-ocr",
    badge: "AI OCR",
    badgeColor: "text-teal border-teal/20",
    title: "AI đọc công tơ chính xác",
    titleHighlight: "chính xác",
    description:
      "Powered by Google Gemini 2.0 Flash — chỉ cần người thuê chụp ảnh công tơ, AI tự nhận diện và đọc chỉ số. Hỗ trợ cả đồng hồ cơ và điện tử.",
    features: [
      "Nhận diện đồng hồ cơ & điện tử",
      "Xác nhận 2 chiều qua Zalo",
      "Độ chính xác 99%+",
      "Xử lý trong < 3 giây",
    ],
    visual: "ocr",
    reverse: true,
  },
  {
    id: "invoice-qr",
    badge: "Thanh toán",
    badgeColor: "text-purple border-purple/20",
    title: "Hóa đơn & QR thanh toán",
    titleHighlight: "QR thanh toán",
    description:
      "Tự động tính tiền phòng + điện + nước + phí phát sinh. Tạo mã QR VietQR chuẩn ngân hàng, người thuê quét là chuyển đúng số tiền, đúng nội dung.",
    features: [
      "Tự tính toán chi phí hàng tháng",
      "QR VietQR kèm số tiền + nội dung CK",
      "Theo dõi trạng thái thanh toán",
      "Gửi nhắc nợ tự động",
    ],
    visual: "invoice",
    reverse: false,
  },
];

function ZaloVisual() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="glass rounded-2xl p-5 border border-white/10">
        {/* Phone frame */}
        <div className="bg-[#0068ff]/10 rounded-xl p-4 border border-[#0068ff]/20">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <div className="w-8 h-8 rounded-full bg-[#0068ff] flex items-center justify-center">
              <MessageCircle size={14} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold">Bot NhaTroPro</p>
              <p className="text-[10px] text-text-muted">Đang hoạt động</p>
            </div>
          </div>

          {/* Chat messages */}
          <div className="space-y-3">
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                <p className="text-[11px]">
                  🔔 Xin chào! Đã đến kỳ chốt số điện nước tháng 6/2026. Vui
                  lòng gửi ảnh công tơ nhé!
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-[#0068ff]/30 rounded-xl rounded-tr-sm px-3 py-2 max-w-[70%]">
                <div className="w-full h-16 bg-white/10 rounded-lg flex items-center justify-center mb-1">
                  <ScanEye size={20} className="text-text-muted" />
                </div>
                <p className="text-[10px] text-text-muted">📸 Ảnh công tơ</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                <p className="text-[11px]">
                  ✅ Đã đọc số <strong>ĐIỆN: 1,320 kWh</strong>
                  <br />
                  Gõ <span className="text-success font-bold">OK</span> để xác
                  nhận hoặc <span className="text-warning font-bold">SAI [số đúng]</span>
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-[#0068ff]/30 rounded-xl rounded-tr-sm px-3 py-2">
                <p className="text-[11px] font-semibold text-success">OK</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                <p className="text-[11px]">
                  📄 <strong>Hóa đơn T6/2026 — P201</strong>
                  <br />
                  Tiền phòng: 3,500,000đ
                  <br />
                  Tiền điện: 528,000đ
                  <br />
                  Tiền nước: 80,000đ
                  <br />
                  <strong className="text-accent">
                    Tổng: 4,108,000đ
                  </strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -top-3 -right-3 glass rounded-lg px-3 py-1.5 border border-success/20 animate-float">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-success" />
          <span className="text-[10px] font-semibold">42/42 đã xác nhận</span>
        </div>
      </div>
    </div>
  );
}

function OcrVisual() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="glass rounded-2xl p-5 border border-white/10">
        {/* OCR process */}
        <div className="space-y-4">
          {/* Step 1: Image input */}
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">
              📸 Ảnh đầu vào
            </p>
            <div className="h-28 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-white/5 relative overflow-hidden">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-amber-400/80 tracking-widest">
                  0 1 3 2 0
                </div>
                <p className="text-[9px] text-text-muted mt-1">kWh</p>
              </div>
              {/* Scan line animation */}
              <div className="absolute inset-0 bg-gradient-to-b from-teal/10 via-teal/5 to-transparent animate-pulse" />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-teal/30" />
            <div className="w-8 h-8 rounded-full bg-teal/15 flex items-center justify-center border border-teal/20">
              <ScanEye size={14} className="text-teal" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-teal/30" />
          </div>

          {/* Step 2: AI Result */}
          <div className="bg-teal/[0.06] rounded-xl p-4 border border-teal/15">
            <p className="text-[10px] uppercase tracking-wider text-teal font-semibold mb-3">
              🤖 Gemini AI kết quả
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Loại:</span>
                <span className="text-xs font-semibold bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                  Điện
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Chỉ số:</span>
                <span className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
                  1,320
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Độ tin cậy:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-white/10">
                    <div className="w-[98%] h-full rounded-full bg-success" />
                  </div>
                  <span className="text-xs font-semibold text-success">98%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Thời gian:</span>
                <span className="text-xs font-semibold text-text-primary">1.2s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-3 -left-3 glass rounded-lg px-3 py-1.5 border border-teal/20 animate-float delay-200">
        <div className="flex items-center gap-1.5">
          <ScanEye size={12} className="text-teal" />
          <span className="text-[10px] font-semibold">Gemini 2.0 Flash</span>
        </div>
      </div>
    </div>
  );
}

function InvoiceVisual() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="glass rounded-2xl p-5 border border-white/10">
        {/* Invoice */}
        <div className="bg-white/[0.03] rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div>
              <p className="text-sm font-bold" style={{ fontFamily: "var(--font-outfit)" }}>
                HÓA ĐƠN T6/2026
              </p>
              <p className="text-[10px] text-text-muted">Phòng 201 — Tòa A</p>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-warning/15 text-warning border border-warning/20">
              Chưa thanh toán
            </span>
          </div>

          <div className="space-y-2.5 mb-4">
            {[
              { label: "Tiền phòng", value: "3,500,000" },
              { label: "Điện (120 kWh × 4,400đ)", value: "528,000" },
              { label: "Nước (8m³ × 10,000đ)", value: "80,000" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">{item.label}</span>
                <span className="text-xs font-medium">{item.value}đ</span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-3 mb-5">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Tổng cộng</span>
              <span className="text-xl font-bold text-accent" style={{ fontFamily: "var(--font-outfit)" }}>
                4,108,000đ
              </span>
            </div>
          </div>

          {/* QR code mock */}
          <div className="bg-white rounded-xl p-3 flex flex-col items-center">
            <div className="w-28 h-28 bg-gray-100 rounded-lg flex items-center justify-center mb-2 relative">
              <QrCode size={64} className="text-gray-800" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center shadow-sm">
                  <span className="text-[8px] font-extrabold text-blue-600">VQR</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 font-medium">Quét để thanh toán</p>
            <p className="text-[9px] text-gray-400">VIETCOMBANK • NGUYEN VAN A</p>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -top-3 -left-3 glass rounded-lg px-3 py-1.5 border border-purple/20 animate-float delay-400">
        <div className="flex items-center gap-1.5">
          <QrCode size={12} className="text-purple" />
          <span className="text-[10px] font-semibold">VietQR chuẩn NAPAS</span>
        </div>
      </div>
    </div>
  );
}

const visualMap: Record<string, React.FC> = {
  zalo: ZaloVisual,
  ocr: OcrVisual,
  invoice: InvoiceVisual,
};

export default function FeatureShowcase() {
  return (
    <section id="showcase" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="space-y-32">
          {showcases.map((s) => {
            const Visual = visualMap[s.visual];
            return (
              <div
                key={s.id}
                className={`grid lg:grid-cols-2 gap-16 items-center ${
                  s.reverse ? "lg:direction-rtl" : ""
                }`}
                style={s.reverse ? { direction: "rtl" } : undefined}
              >
                {/* Text */}
                <div style={s.reverse ? { direction: "ltr" } : undefined}>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border ${s.badgeColor} mb-6`}
                  >
                    <span className="text-xs font-semibold tracking-wide uppercase">
                      {s.badge}
                    </span>
                  </div>

                  <h2
                    className="text-3xl sm:text-4xl font-bold mb-5"
                    style={{ fontFamily: "var(--font-outfit)" }}
                  >
                    {s.title.split(s.titleHighlight).map((part, pi, arr) => (
                      <span key={pi}>
                        {part}
                        {pi < arr.length - 1 && (
                          <span className="text-gradient">{s.titleHighlight}</span>
                        )}
                      </span>
                    ))}
                  </h2>

                  <p className="text-text-secondary mb-8 leading-relaxed">
                    {s.description}
                  </p>

                  <div className="space-y-3">
                    {s.features.map((feat, fi) => (
                      <div key={fi} className="flex items-start gap-3">
                        <CheckCircle2
                          size={18}
                          className="text-success mt-0.5 flex-shrink-0"
                        />
                        <span className="text-sm text-text-secondary">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual */}
                <div style={s.reverse ? { direction: "ltr" } : undefined}>
                  <Visual />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
