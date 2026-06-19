import {
  Building2,
  MessageCircle,
  ScanEye,
  FileText,
  QrCode,
  Users,
  BarChart3,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Quản lý Nhà & Phòng",
    description:
      "Quản lý nhiều tòa nhà, phòng trọ với trạng thái real-time. Thêm/sửa/xóa nhanh, theo dõi phòng trống & đang thuê.",
    color: "blue",
  },
  {
    icon: Users,
    title: "Người thuê & Hợp đồng",
    description:
      "Lưu thông tin người thuê, CCCD, số điện thoại. Tạo hợp đồng điện tử, theo dõi ngày hết hạn tự động.",
    color: "purple",
  },
  {
    icon: ScanEye,
    title: "AI Đọc Công tơ (OCR)",
    description:
      "Người thuê chụp ảnh công tơ → Gemini AI tự đọc số → xác nhận qua Zalo. Không cần nhập tay, chính xác 99%.",
    color: "teal",
  },
  {
    icon: MessageCircle,
    title: "Zalo Bot Tự động",
    description:
      "Bot nhắc gửi số điện nước, nhận ảnh, xác nhận chỉ số, gửi hóa đơn — tất cả qua Zalo, tự động 100%.",
    color: "green",
  },
  {
    icon: FileText,
    title: "Hóa đơn Thông minh",
    description:
      "Tự tính tiền phòng + điện + nước + phí phát sinh. Tạo hóa đơn chi tiết, gửi cho người thuê chỉ 1 click.",
    color: "amber",
  },
  {
    icon: QrCode,
    title: "QR Thanh toán VietQR",
    description:
      "Tạo mã QR VietQR kèm số tiền + nội dung chuyển khoản. Người thuê quét là xong, không nhầm tài khoản.",
    color: "blue",
  },
  {
    icon: BarChart3,
    title: "Thống kê & Báo cáo",
    description:
      "Dashboard tổng quan doanh thu theo tháng, tỷ lệ lấp đầy, nợ xấu. Biểu đồ trực quan, dễ hiểu.",
    color: "purple",
  },
  {
    icon: Shield,
    title: "Bảo mật & Phân quyền",
    description:
      "Xác thực Supabase Auth, dữ liệu mã hóa, Row Level Security. Mỗi chủ nhà chỉ thấy dữ liệu của mình.",
    color: "teal",
  },
];

const colorMap: Record<string, string> = {
  blue: "icon-box blue",
  purple: "icon-box purple",
  teal: "icon-box teal",
  green: "icon-box green",
  amber: "icon-box amber",
};

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section heading */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-purple/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-purple animate-pulse" />
            <span className="text-xs font-semibold text-purple tracking-wide uppercase">
              Tính năng
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Mọi thứ bạn cần{" "}
            <span className="text-gradient">trong một nền tảng</span>
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            NhaTroPro tích hợp đầy đủ công cụ giúp chủ nhà trọ quản lý hiệu
            quả, tiết kiệm thời gian và tăng doanh thu.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass glass-hover rounded-2xl p-6 transition-all duration-300 cursor-default group"
            >
              <div className={`${colorMap[f.color]} mb-5 group-hover:scale-110 transition-transform`}>
                <f.icon size={24} />
              </div>
              <h3
                className="text-base font-semibold mb-2 text-white"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                {f.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
