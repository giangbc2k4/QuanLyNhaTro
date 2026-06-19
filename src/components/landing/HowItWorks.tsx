import {
  UserPlus,
  Building2,
  ScanEye,
  MessageCircle,
  FileText,
  QrCode,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    step: "01",
    icon: UserPlus,
    title: "Đăng ký & Thiết lập",
    description:
      "Tạo tài khoản miễn phí, thêm thông tin tòa nhà, phòng, và giá dịch vụ. Chỉ mất 5 phút.",
    color: "blue",
  },
  {
    step: "02",
    icon: Building2,
    title: "Thêm phòng & Người thuê",
    description:
      "Nhập danh sách phòng, thêm người thuê với hợp đồng. Hệ thống tự theo dõi trạng thái.",
    color: "purple",
  },
  {
    step: "03",
    icon: MessageCircle,
    title: "Kết nối Zalo Bot",
    description:
      "Tạo Bot trên Zalo, dán Token vào hệ thống. Bot tự động liên lạc với người thuê.",
    color: "teal",
  },
  {
    step: "04",
    icon: ScanEye,
    title: "AI đọc số hàng tháng",
    description:
      "Bot nhắc người thuê gửi ảnh công tơ → AI đọc số → xác nhận qua chat. Không cần đi từng phòng.",
    color: "green",
  },
  {
    step: "05",
    icon: FileText,
    title: "Tự tạo hóa đơn",
    description:
      "Hệ thống tự tính tiền, tạo hóa đơn chi tiết. Bạn chỉ cần bấm 'Gửi' để chốt cho tất cả phòng.",
    color: "amber",
  },
  {
    step: "06",
    icon: QrCode,
    title: "Thanh toán QR",
    description:
      "Người thuê nhận hóa đơn + mã QR VietQR qua Zalo, quét để chuyển khoản chính xác. Xong!",
    color: "blue",
  },
];

const colorClasses: Record<string, { dot: string; line: string; icon: string }> = {
  blue: {
    dot: "from-accent to-accent",
    line: "from-accent/40",
    icon: "icon-box blue",
  },
  purple: {
    dot: "from-purple to-purple",
    line: "from-purple/40",
    icon: "icon-box purple",
  },
  teal: {
    dot: "from-teal to-teal",
    line: "from-teal/40",
    icon: "icon-box teal",
  },
  green: {
    dot: "from-success to-success",
    line: "from-success/40",
    icon: "icon-box green",
  },
  amber: {
    dot: "from-warning to-warning",
    line: "from-warning/40",
    icon: "icon-box amber",
  },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Section heading */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-teal/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            <span className="text-xs font-semibold text-teal tracking-wide uppercase">
              Cách hoạt động
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Bắt đầu chỉ với{" "}
            <span className="text-gradient">6 bước đơn giản</span>
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Từ đăng ký đến tự động chốt điện nước và thu tiền, mọi thứ được
            thiết kế để bạn không phải lo nghĩ.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((s, i) => {
            const colors = colorClasses[s.color];
            return (
              <div
                key={i}
                className="glass glass-hover rounded-2xl p-6 relative group"
              >
                {/* Step number */}
                <div className="flex items-center justify-between mb-5">
                  <div className={colors.icon}>
                    <s.icon size={24} />
                  </div>
                  <span
                    className="text-4xl font-extrabold text-white/[0.04] group-hover:text-white/[0.08] transition-colors"
                    style={{ fontFamily: "var(--font-outfit)" }}
                  >
                    {s.step}
                  </span>
                </div>

                <h3
                  className="text-base font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-outfit)" }}
                >
                  {s.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {s.description}
                </p>

                {/* Arrow to next */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    {(i + 1) % 3 !== 0 && (
                      <div className="w-6 h-6 rounded-full glass border border-white/10 flex items-center justify-center">
                        <ArrowRight size={10} className="text-text-muted" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
