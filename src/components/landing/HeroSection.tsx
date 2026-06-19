import {
  Building2,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const highlights = [
  "Quản lý phòng trọ & hợp đồng",
  "AI đọc công tơ điện nước tự động",
  "Gửi hóa đơn + QR thanh toán qua Zalo",
];

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-accent/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-purple/[0.04] blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text content */}
          <div className="animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-accent/20 mb-8">
              <Zap size={14} className="text-accent" />
              <span className="text-xs font-semibold text-accent tracking-wide uppercase">
                Nền tảng #1 cho chủ nhà trọ
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              Quản lý nhà trọ{" "}
              <span className="text-gradient">thông minh</span>
              <br />
              <span className="text-text-secondary font-semibold text-3xl sm:text-4xl lg:text-5xl">
                hoàn toàn tự động
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-text-secondary max-w-xl mb-8 leading-relaxed">
              Từ quản lý phòng, chốt điện nước bằng AI, đến gửi hóa đơn qua
              Zalo — tất cả trong một nền tảng duy nhất. Tiết kiệm{" "}
              <span className="text-accent font-semibold">90% thời gian</span>{" "}
              mỗi tháng.
            </p>

            {/* Feature checks */}
            <div className="flex flex-col gap-3 mb-10">
              {highlights.map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2
                    size={18}
                    className="text-success flex-shrink-0"
                  />
                  <span className="text-sm text-text-secondary">{text}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="btn-primary text-base px-8 py-4 flex items-center gap-2 animate-pulse-glow"
                id="hero-cta-primary"
              >
                Bắt đầu miễn phí
                <ArrowRight size={18} />
              </Link>
              <a
                href="#showcase"
                className="btn-outline text-base px-8 py-4 flex items-center gap-2"
                id="hero-cta-secondary"
              >
                Xem demo
                <span className="text-xs">↓</span>
              </a>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex items-center gap-6 pt-6 border-t border-border">
              <div className="flex -space-x-2">
                {[
                  "bg-accent",
                  "bg-purple",
                  "bg-teal",
                  "bg-success",
                  "bg-warning",
                ].map((bg, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${bg} border-2 border-background flex items-center justify-center text-[10px] font-bold text-white`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      className="w-3.5 h-3.5 text-warning fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-text-muted">
                  <span className="text-text-secondary font-semibold">
                    500+
                  </span>{" "}
                  chủ nhà trọ đang sử dụng
                </p>
              </div>
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="hidden lg:block animate-fade-in-right delay-200">
            <div className="relative">
              {/* Glow behind */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-purple/10 to-transparent blur-3xl rounded-3xl scale-110" />

              {/* Dashboard card */}
              <div className="relative glass rounded-2xl p-6 border border-white/10">
                {/* Mock topbar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center">
                      <Building2 size={16} className="text-white" />
                    </div>
                    <span
                      className="font-semibold text-sm"
                      style={{ fontFamily: "var(--font-outfit)" }}
                    >
                      Dashboard
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                </div>

                {/* Mock stat cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    {
                      label: "Tổng phòng",
                      value: "48",
                      color: "text-accent",
                      bg: "bg-accent/10",
                    },
                    {
                      label: "Đang thuê",
                      value: "42",
                      color: "text-success",
                      bg: "bg-success/10",
                    },
                    {
                      label: "Doanh thu",
                      value: "86tr",
                      color: "text-purple",
                      bg: "bg-purple/10",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`${stat.bg} rounded-xl p-4 border border-white/5`}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">
                        {stat.label}
                      </p>
                      <p
                        className={`text-2xl font-bold ${stat.color}`}
                        style={{ fontFamily: "var(--font-outfit)" }}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Mock chart */}
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5 mb-4">
                  <p className="text-xs text-text-muted mb-3 font-medium">
                    Doanh thu 6 tháng (triệu VND)
                  </p>
                  <div className="flex items-end gap-2 h-24">
                    {[45, 52, 60, 72, 78, 86].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-md bg-gradient-to-t from-accent/60 to-accent/20 transition-all duration-500"
                          style={{ height: `${(h / 86) * 100}%` }}
                        />
                        <span className="text-[9px] text-text-muted">
                          T{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock room grid */}
                <div className="grid grid-cols-6 gap-1.5">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const occupied = i < 10;
                    return (
                      <div
                        key={i}
                        className={`h-8 rounded-md text-[9px] font-bold flex items-center justify-center ${
                          occupied
                            ? "bg-accent/15 text-accent border border-accent/20"
                            : "bg-success/15 text-success border border-success/20"
                        }`}
                      >
                        P{i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Floating notification cards */}
              <div className="absolute -top-4 -right-4 glass rounded-xl p-3 border border-success/20 animate-float shadow-lg shadow-success/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-success" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold">
                      Đã nhận số điện
                    </p>
                    <p className="text-[9px] text-text-muted">
                      P201 — 1,320 kWh
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-3 -left-4 glass rounded-xl p-3 border border-accent/20 animate-float delay-300 shadow-lg shadow-accent/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                    <Zap size={14} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold">Zalo Bot</p>
                    <p className="text-[9px] text-text-muted">
                      Đã gửi 42 hóa đơn
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
