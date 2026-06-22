"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Zap,
  ScanEye,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

// ─── Login / Register Page ─────────────────────────────────

function normalizeVietnamPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `84${digits.slice(1)}` : digits;
}

function isValidVietnamPhone(value: string) {
  return /^84(3|5|7|8|9)\d{8}$/.test(normalizeVietnamPhone(value));
}

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("email rate limit exceeded")) {
    return "Supabase đã tạm giới hạn số email xác nhận. Vui lòng chờ một lúc rồi thử lại, hoặc cấu hình Custom SMTP trong Supabase.";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "Email này đã được đăng ký.";
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.";
  }

  if (normalizedMessage.includes("database error")) {
    return "Số điện thoại này đã được đăng ký hoặc dữ liệu không hợp lệ.";
  }

  return message;
}

function isExistingSignUpUser(
  user: { identities?: unknown[] | null } | null
) {
  return Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!error && !success) return;

    const timer = window.setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [error, success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(getAuthErrorMessage(signInError.message));
          return;
        }

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp.");
        return;
      }

      if (!isValidVietnamPhone(phone)) {
        setError("Số điện thoại Việt Nam không hợp lệ.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: fullName.trim(),
            phone: normalizeVietnamPhone(phone),
          },
        },
      });

      if (signUpError) {
        setError(getAuthErrorMessage(signUpError.message));
        return;
      }

      // Khi bật xác nhận email, Supabase có thể trả về một user ẩn danh với
      // identities rỗng thay vì báo lỗi, nhằm tránh để lộ email đã đăng ký.
      if (isExistingSignUpUser(data.user)) {
        setError("Email này đã được đăng ký. Vui lòng chuyển sang đăng nhập.");
        return;
      }

      if (!data.user) {
        setError("Không thể tạo tài khoản. Vui lòng thử lại.");
        return;
      }

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setSuccess("Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.");
    } catch {
      setError("Không thể kết nối Supabase. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {(error || success) && (
        <div
          className="fixed top-5 right-5 z-[1200] w-[calc(100%-2.5rem)] max-w-sm animate-fade-in-right"
          role="status"
          aria-live="polite"
        >
          <div
            className={`glass flex items-start gap-3 rounded-2xl border px-4 py-4 shadow-2xl ${
              error
                ? "border-red-500/25 bg-red-500/[0.08]"
                : "border-success/25 bg-success/[0.08]"
            }`}
          >
            <div
              className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                error ? "bg-red-500/15 text-red-400" : "bg-success/15 text-success"
              }`}
            >
              {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {error ? "Không thành công" : "Đăng ký thành công"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                {error || success}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
              }}
              className="text-text-muted transition-colors hover:text-white"
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Background effects ═══ */}
      <div className="absolute inset-0 bg-[#060b18]" />
      <div className="absolute inset-0 grid-pattern pointer-events-none opacity-40" />
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-purple/[0.05] blur-[120px] pointer-events-none" />

      {/* ═══ Left panel — Branding (desktop only) ═══ */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 xl:p-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group" id="login-logo">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-lg shadow-accent/30 group-hover:shadow-accent/50 transition-shadow">
            <Building2 size={24} className="text-white" />
          </div>
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            <span className="text-white">NhaTro</span>
            <span className="text-gradient-accent">Pro</span>
          </span>
        </Link>

        {/* Center content */}
        <div className="max-w-lg">
          <h1
            className="text-4xl xl:text-5xl font-bold leading-tight mb-6"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Quản lý nhà trọ
            <br />
            <span className="text-gradient">chưa bao giờ dễ đến vậy</span>
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed mb-10">
            Tự động chốt điện nước bằng AI, gửi hóa đơn qua Zalo, thanh toán
            QR — tất cả trong một nền tảng.
          </p>

          {/* Feature highlights */}
          <div className="space-y-5">
            {[
              {
                icon: ScanEye,
                title: "AI OCR đọc công tơ",
                desc: "Chụp ảnh → AI đọc số tự động, chính xác 99%",
                color: "text-teal",
                bg: "bg-teal/10",
              },
              {
                icon: MessageCircle,
                title: "Zalo Bot tự động",
                desc: "Nhắc nhở, nhận số, gửi hóa đơn qua Zalo",
                color: "text-accent",
                bg: "bg-accent/10",
              },
              {
                icon: Zap,
                title: "Tiết kiệm 90% thời gian",
                desc: "Không cần đi ghi số, không tính nhầm, không quên",
                color: "text-purple",
                bg: "bg-purple/10",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div
                  className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                >
                  <item.icon size={20} className={item.color} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-0.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="flex gap-8">
          {[
            { value: "500+", label: "Chủ nhà trọ" },
            { value: "5,000+", label: "Phòng trọ" },
            { value: "99.9%", label: "Uptime" },
          ].map((s, i) => (
            <div key={i}>
              <p
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                {s.value}
              </p>
              <p className="text-xs text-text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Right panel — Form ═══ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-lg shadow-accent/30">
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
          </div>

          {/* ── Card ── */}
          <div className="glass rounded-2xl p-8 sm:p-10 border border-white/[0.06]">
            {/* Heading */}
            <div className="text-center mb-8">
              <h2
                className="text-2xl font-bold text-white mb-2"
                style={{ fontFamily: "var(--font-outfit)" }}
              >
                {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
              </h2>
              <p className="text-sm text-text-muted">
                {mode === "login"
                  ? "Đăng nhập để quản lý nhà trọ của bạn"
                  : "Đăng ký miễn phí, bắt đầu trong 2 phút"}
              </p>
            </div>

            {/* ── Tab switcher ── */}
            <div className="flex bg-white/[0.03] rounded-xl p-1 mb-8 border border-white/[0.04]">
              {(["login", "register"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMode(tab)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                    mode === tab
                      ? "bg-accent text-white shadow-md shadow-accent/25"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                  id={`tab-${tab}`}
                >
                  {tab === "login" ? "Đăng nhập" : "Đăng ký"}
                </button>
              ))}
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name — only register */}
              {mode === "register" && (
                <div className="animate-fade-in-up">
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <input
                      id="input-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm placeholder:text-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Phone — only register */}
              {mode === "register" && (
                <div className="animate-fade-in-up delay-100">
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <input
                      id="input-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0909 123 456"
                      inputMode="tel"
                      autoComplete="tel"
                      pattern="(?:\+?84|0)(3|5|7|8|9)[0-9]{8}"
                      title="Nhập số điện thoại Việt Nam, ví dụ 0909123456"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm placeholder:text-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  />
                  <input
                    id="input-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm placeholder:text-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-text-secondary">
                    Mật khẩu
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="text-xs text-accent hover:text-accent-light transition-colors"
                      id="forgot-password"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  />
                  <input
                    id="input-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm placeholder:text-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password — only register */}
              {mode === "register" && (
                <div className="animate-fade-in-up delay-200">
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <input
                      id="input-confirm-password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm placeholder:text-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                id="btn-submit"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* ── Divider ── */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-xs text-text-muted">hoặc</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* ── Social login (placeholder) ── */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-secondary hover:text-white hover:border-white/[0.12] hover:bg-white/[0.05] transition-all"
              id="btn-google"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Tiếp tục với Google
            </button>

            {/* ── Terms (register) ── */}
            {mode === "register" && (
              <p className="text-[11px] text-text-muted text-center mt-5 leading-relaxed">
                Bằng việc đăng ký, bạn đồng ý với{" "}
                <a href="#" className="text-accent hover:underline">
                  Điều khoản sử dụng
                </a>{" "}
                và{" "}
                <a href="#" className="text-accent hover:underline">
                  Chính sách bảo mật
                </a>{" "}
                của NhaTroPro.
              </p>
            )}
          </div>

          {/* ── Bottom text ── */}
          <p className="text-center text-xs text-text-muted mt-6">
            {mode === "login" ? (
              <>
                Chưa có tài khoản?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-accent hover:text-accent-light font-medium transition-colors"
                >
                  Đăng ký miễn phí
                </button>
              </>
            ) : (
              <>
                Đã có tài khoản?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-accent hover:text-accent-light font-medium transition-colors"
                >
                  Đăng nhập
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
