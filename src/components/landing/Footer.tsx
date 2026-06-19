import { Building2, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  "Sản phẩm": [
    { label: "Tính năng", href: "#features" },
    { label: "Cách hoạt động", href: "#how-it-works" },
    { label: "Bảng giá", href: "#" },
    { label: "Cập nhật", href: "#" },
  ],
  "Hỗ trợ": [
    { label: "Tài liệu hướng dẫn", href: "#" },
    { label: "FAQ", href: "#" },
    { label: "Liên hệ hỗ trợ", href: "#" },
    { label: "Cộng đồng", href: "#" },
  ],
  "Pháp lý": [
    { label: "Điều khoản sử dụng", href: "#" },
    { label: "Chính sách bảo mật", href: "#" },
    { label: "Quy chế hoạt động", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer id="footer" className="border-t border-border relative">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="grid lg:grid-cols-5 gap-12 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-lg shadow-accent/20">
                <Building2 size={22} className="text-white" />
              </div>
              <span
                className="text-xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                <span className="text-white">NhaTro</span>
                <span className="text-gradient-accent">Pro</span>
              </span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed mb-6 max-w-sm">
              Nền tảng quản lý nhà trọ thông minh #1 Việt Nam. Tự động hóa
              quy trình chốt điện nước, hóa đơn và thu tiền qua Zalo Bot + AI.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <Mail size={14} className="text-text-muted flex-shrink-0" />
                <span>support@nhatropro.vn</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <Phone size={14} className="text-text-muted flex-shrink-0" />
                <span>0909 123 456</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <MapPin size={14} className="text-text-muted flex-shrink-0" />
                <span>TP. Hồ Chí Minh, Việt Nam</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4
                className="text-sm font-semibold text-white mb-4"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-text-muted hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="section-divider mb-6" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-text-muted">
            © 2026 NhaTroPro. All rights reserved.
          </p>
          <div className="flex gap-4">
            {/* Social icons */}
            {["Facebook", "Zalo", "YouTube"].map((social) => (
              <a
                key={social}
                href="#"
                className="w-8 h-8 rounded-lg glass border border-white/5 flex items-center justify-center text-text-muted hover:text-white hover:border-white/15 transition-all text-[10px] font-bold"
                aria-label={social}
              >
                {social[0]}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
