import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppearanceApplier } from "@/components/AppearanceApplier";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI UPSC",
  description: "UPSC exam preparation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <AppearanceApplier />
        {children}
      </body>
    </html>
  );
}
