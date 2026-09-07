import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import TabBar from "@/components/TabBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "식물집사",
  description: "사진 한 장으로 식물을 알아보고 관리까지 이어지는 앱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-neutral-900">
        <div className="mx-auto min-h-screen max-w-md px-5 pb-20">
          {children}
        </div>
        <TabBar />
      </body>
    </html>
  );
}
