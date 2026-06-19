import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/[0.06] blur-[120px] rounded-full" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-purple/[0.05] blur-[100px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative">
        <div className="glass rounded-3xl p-12 sm:p-16 border border-white/10 text-center relative overflow-hidden">
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 grid-pattern opacity-50 pointer-events-none" />

          {/* Content */}
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-8">
              <Sparkles size={14} className="text-accent" />
              <span className="text-xs font-semibold text-accent tracking-wide uppercase">
                Miễn phí 30 ngày
              </span>
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              Sẵn sàng quản lý nhà trọ{" "}
              <span className="text-gradient">thông minh hơn?</span>
            </h2>

            <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Tham gia cùng <span className="text-white font-semibold">500+ chủ nhà trọ</span> đã
              tin dùng NhaTroPro. Đăng ký ngay, dùng thử miễn phí 30 ngày —
              không cần thẻ tín dụng.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="btn-primary text-base px-10 py-4 flex items-center gap-2"
                id="cta-register"
              >
                Đăng ký miễn phí ngay
                <ArrowRight size={18} />
              </Link>
              <a
                href="#features"
                className="btn-outline text-base px-10 py-4"
              >
                Tìm hiểu thêm
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t border-white/5">
              {[
                { label: "Không cần thẻ tín dụng", icon: "💳" },
                { label: "Hỗ trợ 24/7", icon: "🛟" },
                { label: "Bảo mật SSL", icon: "🔒" },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 text-sm text-text-muted"
                >
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
