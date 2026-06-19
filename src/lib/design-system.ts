/**
 * ============================================================
 *  NhaTroPro — Design System
 * ============================================================
 *  File trung tâm định nghĩa toàn bộ design tokens.
 *  Import file này ở bất kỳ component nào cần dùng.
 *
 *  Usage:
 *    import { colors, spacing, typography, shadows } from "@/lib/design-system";
 * ============================================================
 */

// ─────────────────────────────────────────────
//  COLORS
// ─────────────────────────────────────────────

export const colors = {
  // ── Background ──
  bg: {
    base: "#060b18",
    surface: "rgba(15, 23, 42, 0.6)",
    surfaceHover: "rgba(30, 41, 59, 0.5)",
    card: "rgba(15, 23, 42, 0.45)",
    input: "rgba(15, 23, 42, 0.65)",
    hover: "rgba(255, 255, 255, 0.04)",
    overlay: "rgba(0, 0, 0, 0.55)",
  },

  // ── Text ──
  text: {
    primary: "#f1f5f9",
    secondary: "#94a3b8",
    muted: "#64748b",
    inverse: "#0f172a",
  },

  // ── Brand ──
  brand: {
    primary: "#3b82f6",     // Blue — main accent
    primaryLight: "#60a5fa",
    primaryDark: "#2563eb",
    secondary: "#8b5cf6",   // Purple — secondary accent
    secondaryLight: "#a78bfa",
  },

  // ── Semantic ──
  semantic: {
    success: "#10b981",
    successLight: "#34d399",
    warning: "#f59e0b",
    warningLight: "#fbbf24",
    danger: "#ef4444",
    dangerLight: "#f87171",
    info: "#3b82f6",
  },

  // ── Accent palette ──
  accent: {
    blue: "#3b82f6",
    purple: "#8b5cf6",
    teal: "#14b8a6",
    green: "#10b981",
    amber: "#f59e0b",
    red: "#ef4444",
    pink: "#ec4899",
    cyan: "#06b6d4",
  },

  // ── Glow (dùng cho backgrounds mờ, icon boxes) ──
  glow: {
    blue: "rgba(59, 130, 246, 0.15)",
    blueStrong: "rgba(59, 130, 246, 0.35)",
    purple: "rgba(139, 92, 246, 0.15)",
    teal: "rgba(20, 184, 166, 0.15)",
    green: "rgba(16, 185, 129, 0.15)",
    amber: "rgba(245, 158, 11, 0.15)",
    red: "rgba(239, 68, 68, 0.15)",
  },

  // ── Border ──
  border: {
    default: "rgba(255, 255, 255, 0.07)",
    hover: "rgba(255, 255, 255, 0.15)",
    focus: "#3b82f6",
    focusRing: "rgba(59, 130, 246, 0.3)",
  },

  // ── Zalo brand ──
  zalo: {
    primary: "#0068ff",
    light: "rgba(0, 104, 255, 0.15)",
  },
} as const;

// ─────────────────────────────────────────────
//  GRADIENTS
// ─────────────────────────────────────────────

export const gradients = {
  /** Gradient chính: xanh → tím */
  primary: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  /** Gradient accent: xanh → xanh lá */
  accent: "linear-gradient(135deg, #3b82f6, #14b8a6)",
  /** Gradient text shimmer */
  text: "linear-gradient(135deg, #60a5fa, #a78bfa, #2dd4bf)",
  /** Gradient warm: vàng → đỏ */
  warm: "linear-gradient(135deg, #f59e0b, #ef4444)",
  /** Gradient button primary */
  buttonPrimary: "linear-gradient(135deg, #3b82f6, #2563eb)",
  /** Gradient hero glow */
  heroGlow: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.06), rgba(20,184,166,0.04))",
  /** Gradient sidebar */
  sidebar: "linear-gradient(180deg, rgba(15,23,42,0.8), rgba(15,23,42,0.95))",
} as const;

// ─────────────────────────────────────────────
//  TYPOGRAPHY
// ─────────────────────────────────────────────

export const typography = {
  /** Font family chính (body text) — Inter */
  fontFamily: {
    sans: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
    heading: "var(--font-outfit), system-ui, sans-serif",
    mono: "var(--font-geist-mono), 'Fira Code', monospace",
  },

  /** Font sizes — rem values */
  fontSize: {
    xs: "0.75rem",     // 12px
    sm: "0.875rem",    // 14px
    base: "1rem",      // 16px
    lg: "1.125rem",    // 18px
    xl: "1.25rem",     // 20px
    "2xl": "1.5rem",   // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem",  // 36px
    "5xl": "3rem",     // 48px
    "6xl": "3.75rem",  // 60px
  },

  /** Font weights */
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  /** Line heights */
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.55,
    relaxed: 1.7,
  },

  /** Letter spacing */
  letterSpacing: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.03em",
    wider: "0.06em",
  },
} as const;

// ─────────────────────────────────────────────
//  SPACING
// ─────────────────────────────────────────────

export const spacing = {
  /** Padding / margin steps (px) */
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",

  /** Layout-specific */
  sidebarWidth: "256px",
  sidebarCollapsed: "72px",
  topbarHeight: "64px",
  maxContentWidth: "1280px",   // max-w-7xl
  pageX: "24px",               // padding-x mobile
  pageXDesktop: "32px",        // padding-x desktop
} as const;

// ─────────────────────────────────────────────
//  BORDER RADIUS
// ─────────────────────────────────────────────

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  full: "9999px",
} as const;

// ─────────────────────────────────────────────
//  SHADOWS
// ─────────────────────────────────────────────

export const shadows = {
  /** Card / glass panels */
  glass: "0 8px 32px rgba(0, 0, 0, 0.3)",
  /** Elevated elements */
  elevated: "0 20px 40px rgba(0, 0, 0, 0.5)",
  /** Button hover glow */
  buttonGlow: "0 8px 24px rgba(59, 130, 246, 0.4), 0 0 48px rgba(59, 130, 246, 0.15)",
  /** Accent icon glow */
  accentGlow: "0 4px 14px rgba(59, 130, 246, 0.35)",
  /** Success glow */
  successGlow: "0 4px 14px rgba(16, 185, 129, 0.35)",
  /** Danger glow */
  dangerGlow: "0 4px 14px rgba(239, 68, 68, 0.35)",
  /** Focus ring */
  focusRing: "0 0 0 2.5px rgba(59, 130, 246, 0.3)",
  /** Notification badge */
  notification: "0 4px 12px rgba(0, 0, 0, 0.3)",
} as const;

// ─────────────────────────────────────────────
//  TRANSITIONS / ANIMATIONS
// ─────────────────────────────────────────────

export const transitions = {
  /** Easing function chính */
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Durations */
  fast: "0.15s",
  normal: "0.25s",
  slow: "0.4s",

  /** Presets — dùng trực tiếp trong style */
  default: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  quick: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
  smooth: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

// ─────────────────────────────────────────────
//  GLASS EFFECT
// ─────────────────────────────────────────────

export const glass = {
  /** Blur intensity */
  blur: "blur(16px)",
  /** Standard glass background */
  background: "rgba(15, 23, 42, 0.5)",
  /** Lighter glass */
  backgroundLight: "rgba(30, 41, 59, 0.35)",
  /** Glass border */
  border: "1px solid rgba(255, 255, 255, 0.06)",
  /** Glass border hover */
  borderHover: "1px solid rgba(59, 130, 246, 0.2)",
} as const;

// ─────────────────────────────────────────────
//  BREAKPOINTS (px, min-width)
// ─────────────────────────────────────────────

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// ─────────────────────────────────────────────
//  Z-INDEX LAYERS
// ─────────────────────────────────────────────

export const zIndex = {
  behind: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 50,
  sidebar: 100,
  navbar: 200,
  modal: 1000,
  toast: 1100,
  tooltip: 1200,
} as const;

// ─────────────────────────────────────────────
//  ICON BOX STYLES
// ─────────────────────────────────────────────
//  Dùng cho stat cards, feature cards, sidebar icons

export type IconColor = "blue" | "purple" | "teal" | "green" | "amber" | "red";

export const iconBoxStyles: Record<IconColor, { bg: string; color: string }> = {
  blue:   { bg: colors.glow.blue,   color: colors.accent.blue },
  purple: { bg: colors.glow.purple, color: colors.accent.purple },
  teal:   { bg: colors.glow.teal,   color: colors.accent.teal },
  green:  { bg: colors.glow.green,  color: colors.accent.green },
  amber:  { bg: colors.glow.amber,  color: colors.accent.amber },
  red:    { bg: colors.glow.red,    color: colors.accent.red },
};

// ─────────────────────────────────────────────
//  BADGE STYLES
// ─────────────────────────────────────────────

export type BadgeVariant = "blue" | "green" | "amber" | "red" | "purple" | "teal";

export const badgeStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  blue:   { bg: colors.glow.blue,   color: colors.accent.blue },
  green:  { bg: colors.glow.green,  color: colors.accent.green },
  amber:  { bg: colors.glow.amber,  color: colors.accent.amber },
  red:    { bg: colors.glow.red,    color: colors.accent.red },
  purple: { bg: colors.glow.purple, color: colors.accent.purple },
  teal:   { bg: colors.glow.teal,   color: colors.accent.teal },
};

// ─────────────────────────────────────────────
//  ROOM STATUS
// ─────────────────────────────────────────────

export const roomStatus = {
  occupied: {
    label: "Đang thuê",
    color: colors.accent.blue,
    glow: colors.glow.blue,
    borderClass: "border-l-4 border-l-blue-500",
  },
  vacant: {
    label: "Phòng trống",
    color: colors.accent.green,
    glow: colors.glow.green,
    borderClass: "border-l-4 border-l-green-500",
  },
} as const;

// ─────────────────────────────────────────────
//  PAYMENT STATUS
// ─────────────────────────────────────────────

export const paymentStatus = {
  paid: {
    label: "Đã thanh toán",
    color: colors.semantic.success,
    glow: colors.glow.green,
    badge: "green" as BadgeVariant,
  },
  unpaid: {
    label: "Chưa thanh toán",
    color: colors.semantic.warning,
    glow: colors.glow.amber,
    badge: "amber" as BadgeVariant,
  },
  overdue: {
    label: "Quá hạn",
    color: colors.semantic.danger,
    glow: colors.glow.red,
    badge: "red" as BadgeVariant,
  },
} as const;

// ─────────────────────────────────────────────
//  CONTRACT STATUS
// ─────────────────────────────────────────────

export const contractStatus = {
  active: {
    label: "Đang hiệu lực",
    color: colors.semantic.success,
    badge: "green" as BadgeVariant,
  },
  expired: {
    label: "Hết hạn",
    color: colors.semantic.warning,
    badge: "amber" as BadgeVariant,
  },
  terminated: {
    label: "Đã hủy",
    color: colors.semantic.danger,
    badge: "red" as BadgeVariant,
  },
} as const;

// ─────────────────────────────────────────────
//  UTILITY READING STATUS
// ─────────────────────────────────────────────

export const readingStatus = {
  pending: {
    label: "Chờ xác nhận",
    color: colors.semantic.warning,
    badge: "amber" as BadgeVariant,
  },
  confirmed: {
    label: "Đã xác nhận",
    color: colors.semantic.success,
    badge: "green" as BadgeVariant,
  },
} as const;

// ─────────────────────────────────────────────
//  SIDEBAR NAVIGATION ITEMS
// ─────────────────────────────────────────────

export const sidebarNav = [
  { key: "dashboard",  label: "Tổng quan",     href: "/",          icon: "LayoutDashboard" },
  { key: "buildings",  label: "Nhà & Phòng",   href: "/buildings", icon: "Building2" },
  { key: "tenants",    label: "Người thuê",    href: "/tenants",   icon: "Users" },
  { key: "invoices",   label: "Hóa đơn",       href: "/invoices",  icon: "FileText" },
  { key: "zalo",       label: "Zalo Bot",       href: "/zalo",      icon: "MessageCircle" },
  { key: "settings",   label: "Cài đặt",       href: "/settings",  icon: "Settings" },
] as const;

// ─────────────────────────────────────────────
//  HELPER: CSS inline glass style object
// ─────────────────────────────────────────────

export function glassStyle(options?: {
  blur?: string;
  bg?: string;
  border?: boolean;
}): React.CSSProperties {
  return {
    background: options?.bg ?? glass.background,
    backdropFilter: options?.blur ?? glass.blur,
    WebkitBackdropFilter: options?.blur ?? glass.blur,
    border: options?.border !== false ? glass.border : "none",
    boxShadow: shadows.glass,
  };
}

// ─────────────────────────────────────────────
//  HELPER: Icon box inline style
// ─────────────────────────────────────────────

export function iconBoxStyle(
  color: IconColor,
  size: number = 56
): React.CSSProperties {
  const style = iconBoxStyles[color];
  return {
    width: size,
    height: size,
    borderRadius: radius.md,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: style.bg,
    color: style.color,
    flexShrink: 0,
    transition: transitions.default,
  };
}

// ─────────────────────────────────────────────
//  TAILWIND CLASS MAPPINGS
// ─────────────────────────────────────────────
//  Dùng khi muốn map logic → Tailwind classes

export const tw = {
  /** Icon box backgrounds */
  iconBox: {
    blue: "bg-accent/15 text-accent",
    purple: "bg-purple/15 text-purple",
    teal: "bg-teal/15 text-teal",
    green: "bg-success/15 text-success",
    amber: "bg-warning/15 text-warning",
    red: "bg-red-500/15 text-red-500",
  } as Record<IconColor, string>,

  /** Badge classes */
  badge: {
    blue: "bg-accent/15 text-accent border-accent/20",
    green: "bg-success/15 text-success border-success/20",
    amber: "bg-warning/15 text-warning border-warning/20",
    red: "bg-red-500/15 text-red-500 border-red-500/20",
    purple: "bg-purple/15 text-purple border-purple/20",
    teal: "bg-teal/15 text-teal border-teal/20",
  } as Record<BadgeVariant, string>,

  /** Glass panel */
  glass: "bg-surface backdrop-blur-2xl border border-border shadow-lg",
  glassHover: "hover:bg-surface-hover hover:border-accent/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300",

  /** Gradient text */
  gradientText: "bg-gradient-to-r from-accent-light via-purple to-teal bg-clip-text text-transparent",
} as const;

// ─────────────────────────────────────────────
//  FORMAT HELPERS (VND currency, dates, etc.)
// ─────────────────────────────────────────────

/** Format số thành tiền VND: 1234567 → "1,234,567đ" */
export function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

/** Format số thành tiền VND ngắn gọn: 1500000 → "1.5tr" */
export function formatVNDShort(amount: number): string {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + "tỷ";
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace(".0", "") + "tr";
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + "k";
  return amount.toString();
}

/** Format tháng: "2026-06" → "Tháng 6/2026" */
export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  return `Tháng ${parseInt(month)}/${year}`;
}

/** Format ngày: ISO string → "19/06/2026" */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
