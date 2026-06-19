import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập — NhaTroPro",
  description: "Đăng nhập hoặc đăng ký tài khoản NhaTroPro để quản lý nhà trọ thông minh.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
