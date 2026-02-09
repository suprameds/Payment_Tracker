import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/layout/navigation";
import { ToastProvider } from "@/components/providers/toast-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { KeyboardShortcutsModal } from "@/components/ui/keyboard-shortcuts-modal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pharma Dispatch & Payment Reconciliation",
  description: "Manage pharmaceutical dispatches and payment reconciliation efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <AuthProvider>
            <Navigation />
            <div className="lg:pl-64">
              {children}
            </div>
            <KeyboardShortcutsModal />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
