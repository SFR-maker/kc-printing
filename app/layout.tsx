import type { Metadata } from "next";
import { Geist, Geist_Mono, Archivo } from "next/font/google";
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

// Display face for marketing headlines. Archivo is a signage/grotesk design — it holds up at
// large sizes with tight tracking, which Geist (a UI face) does not.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "KC Printing - Business Cards, Postcards & Banners, Designed Online",
    template: "%s | KC Printing",
  },
  description:
    "Custom business cards, postcards, and banners designed by a real designer and delivered print-ready. Fast online ordering. Serving Kansas City, Dallas, Plano, and nationwide.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  // A relative canonical in the root layout resolves per-route, so every page gets a correct
  // self-referencing canonical without repeating it in 20 files. This also collapses the
  // ?package=silver/gold/platinum order-page variants onto one indexable URL.
  alternates: { canonical: "./" },
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
    >
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
