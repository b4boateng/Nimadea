import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Sparkles, FolderKanban } from "lucide-react";
import AuthStatus from "@/components/AuthStatus";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nimadea - AI Study & Research Hub",
  description: "Privacy-first study workspace powered by Django, Next.js, and Ollama RAG.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-appDark text-appText min-h-screen flex flex-col antialiased">
        {/* Global Top Navbar */}
        <header className="h-16 border-b border-slate-800 bg-appGray/70 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brandBlue to-aiPurple flex items-center justify-center text-white shadow-lg">
                <BookOpen size={18} />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent group-hover:text-brandBlue transition">
                Nimadea
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-1.5 hover:text-slate-100 transition px-3 py-1.5 rounded-lg hover:bg-slate-800"
              >
                <FolderKanban size={15} />
                <span>Notebooks</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <AuthStatus />
            <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-full">
              <Sparkles size={13} className="text-aiPurple animate-pulse" />
              <span>Local Ollama</span>
            </span>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
      </body>
    </html>
  );
}