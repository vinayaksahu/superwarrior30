import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { LanguageProvider } from "@/components/shared/language-provider";
import { GlobalFloatingLanguageWidget } from "@/components/shared/global-floating-language-widget";
import { SessionGuard } from "@/components/auth/session-guard";
import { MaintenanceGuard } from "@/components/shared/maintenance-guard";
import { PwaRegister } from "@/components/shared/pwa-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Rahul Trade Warrior Academy | Super Warrior 30",
    template: "%s | Rahul Trade Warrior Academy",
  },
  description:
    "Master professional trading with Rahul Trade Warrior Academy. Learn | Trade | Earn with expert mentorship and proven trading systems.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trade Warrior",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
      { url: "/logo.png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          <LanguageProvider>
            <MaintenanceGuard>
              {children}
            </MaintenanceGuard>
            <SessionGuard />
            <GlobalFloatingLanguageWidget />
            <PwaRegister />
            <Toaster richColors position="top-right" />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
