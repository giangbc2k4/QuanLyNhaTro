import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "NhaTroPro — Phần mềm Quản lý Nhà trọ thông minh",
  description:
    "Quản lý nhà trọ, phòng cho thuê toàn diện. Tự động chốt điện nước bằng AI, gửi hóa đơn qua Zalo, thanh toán QR VietQR. Giải pháp #1 cho chủ nhà trọ Việt Nam.",
  keywords: [
    "quản lý nhà trọ",
    "phần mềm nhà trọ",
    "quản lý phòng trọ",
    "chốt điện nước",
    "hóa đơn nhà trọ",
    "zalo bot nhà trọ",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
