import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CartProvider } from "@/contexts/CartContext"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { ChatProvider } from "@/contexts/ChatContext"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import LicenseGuard from "@/components/LicenseGuard"

export const metadata: Metadata = {
  title: "Store name",
  description: "Store description",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ThemeProvider>
            <TooltipProvider>
              <CartProvider>
                <ChatProvider>
                  <LicenseGuard>
                    <Toaster />
                    <Sonner />
                    {children}
                  </LicenseGuard>
                </ChatProvider>
              </CartProvider>
            </TooltipProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
