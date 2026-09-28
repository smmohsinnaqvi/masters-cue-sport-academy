import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Premium Snooker & Pool Academy",
  description: "Dark, mobile-first table booking for a premium snooker and pool academy.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
