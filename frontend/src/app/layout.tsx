import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import { PaperProvider } from "@/context/PaperContext";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PaperWise | Premium Research Assistant",
  description: "AI-Powered Research Assistant with citation-aware RAG, advanced summarization, literature synthesis, and paper comparison.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} dark h-full`}>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>" />
      </head>
      <body className="font-sans antialiased text-slate-100 min-h-screen bg-background">
        <AuthGuard>
          <PaperProvider>
            {children}
          </PaperProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
