"use client";

import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import { AppLayout } from "@/components/AppLayout";
import { AuthGuard } from "@/components/AuthGuard";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConfigProvider locale={enUS}>
          <AuthGuard>
            <AppLayout>{children}</AppLayout>
          </AuthGuard>
        </ConfigProvider>
      </body>
    </html>
  );
}
