import type { Metadata } from "next";
import { Geist_Mono, Space_Grotesk, Inter } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const interHeading = Inter({ subsets: ["latin"], variable: "--font-heading" });

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "FD Advisor — Multilingual Fixed Deposit Guide",
  description:
    "AI-powered multilingual financial assistant that simplifies Fixed Deposit decisions for Indian users. Ask in Hindi, English, or Hinglish.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        spaceGrotesk.variable,
        interHeading.variable
      )}
    >
      <body>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
