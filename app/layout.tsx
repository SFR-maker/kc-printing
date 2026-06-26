import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KC Printing - Premium Print and Design Services Online",
    template: "%s | KC Printing",
  },
  description:
    "Custom business cards, postcards, banners, logo design, and website design. Fast online ordering, print-ready files, AI-assisted creative direction. Serving Kansas City, Dallas, Plano, and nationwide.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "KC Printing",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const htmlContent = (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-kc-bg text-kc-dark">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );

  if (!clerkPublishableKey) {
    return htmlContent;
  }

  return <ClerkProvider publishableKey={clerkPublishableKey}>{htmlContent}</ClerkProvider>;
}
