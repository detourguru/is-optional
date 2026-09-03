import { Analytics } from "@vercel/analytics/next";
import { Noto_Sans_KR } from "next/font/google";

import { SpendingProvider } from "@/components/spending/spending-provider";

import type { Metadata } from "next";

import "./globals.css";

const bodyFont = Noto_Sans_KR({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const siteName = "소비 습관 들여보기";
const siteDescription = "한 달 동안 쓴 돈을 슥슥 넘겨보며, 이건 안 써도 됐겠다를 발견하는 앱";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteName,
  description: siteDescription,
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: siteUrl,
    siteName: siteName,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${bodyFont.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        <SpendingProvider>{children}</SpendingProvider>
        <Analytics />
      </body>
    </html>
  );
}
