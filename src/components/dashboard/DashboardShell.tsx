"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  MessageCircle,
  ReceiptText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Bell,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { key: "dashboard", label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { key: "buildings", label: "Nhà & Phòng", href: "/dashboard/buildings", icon: Building2 },
  { key: "services", label: "Dịch vụ", href: "/dashboard/services", icon: ReceiptText },
  { key: "tenants", label: "Người thuê", href: "/dashboard/tenants", icon: Users },
  { key: "contracts", label: "Hợp đồng", href: "/dashboard/contracts", icon: ClipboardList },
  { key: "invoices", label: "Hóa đơn", href: "/dashboard/invoices", icon: FileText },
  { key: "zalo", label: "Zalo Bot", href: "/dashboard/zalo", icon: MessageCircle },
  { key: "settings", label: "Cài đặt", href: "/dashboard/settings", icon: Settings },
];

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    email: string;
    name: string;
  };
}

export default function DashboardShell({ children, user }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const activeKey = navItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  )?.key ?? "dashboard";

  const pageTitle = navItems.find((item) => item.key === activeKey)?.label ?? "Tổng quan";

  return (
    <div className="min-h-screen bg-[#060b18] flex">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col border-r border-border transition-all duration-300
          ${collapsed ? "w-[72px]" : "w-64"}
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 bg-[#060b18]/95 backdrop-blur-xl`}
      >
        <div className={`flex items-center gap-3 px-5 py-6 border-b border-border ${collapsed ? "justify-center px-3" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-lg shadow-accent/25 flex-shrink-0">
            <Building2 size={18} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-outfit)" }}>
              <span className="text-white">NhaTro</span>
              <span className="text-gradient-accent">Pro</span>
            </span>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                  ${collapsed ? "justify-center px-2" : ""}
                  ${isActive ? "bg-accent text-white shadow-md shadow-accent/25" : "text-text-secondary hover:text-white hover:bg-white/[0.04]"}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} className={`flex-shrink-0 ${isActive ? "" : "group-hover:scale-110 transition-transform"}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`border-t border-border p-3 space-y-2 ${collapsed ? "px-2" : ""}`}>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-text-muted hover:text-text-secondary hover:bg-white/[0.04] text-xs transition-all"
            id="btn-collapse-sidebar"
          >
            <ChevronLeft size={16} className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span>Thu gọn</span>}
          </button>

          <div className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] ${collapsed ? "justify-center px-2" : ""}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-text-muted truncate">{user.email}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-text-muted hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-50"
              title="Đăng xuất"
              id="btn-logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? "lg:ml-[72px]" : "lg:ml-64"}`}>
        <header className="sticky top-0 z-30 border-b border-border bg-[#060b18]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="lg:hidden text-text-secondary hover:text-white p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                id="btn-mobile-menu"
                aria-label="Mở menu"
              >
                {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-white" style={{ fontFamily: "var(--font-outfit)" }}>
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors" id="btn-search" aria-label="Tìm kiếm">
                <Search size={18} />
              </button>
              <button type="button" className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors relative" id="btn-notifications" aria-label="Thông báo">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              </button>
              <div className="lg:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
