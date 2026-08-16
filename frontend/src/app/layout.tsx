import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MessageSquare, Calendar, BookOpen, Search, Bell, User } from "lucide-react";
import Link from "next/link";
import { NimadeaLogo } from "../components/NimadeaLogo";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nimadea | AI Learning",
  description: "AI-powered learning and document retrieval",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-appDark text-appText antialiased overflow-hidden`}>
        
        {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
        <aside className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-appGray flex-col border-r border-slate-700/50 z-50">
          <div className="p-6 mb-4 flex items-center gap-3">
            {/* Custom SVG Logo */}
<NimadeaLogo className="w-8 h-8" />
<span className="text-2xl font-black tracking-wider text-appText">Nimadea</span>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brandBlue/20 text-brandBlue font-medium transition-all">
              <MessageSquare size={20} />
              <span>AI Chat</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-appText transition-all">
              <Calendar size={20} />
              <span>Study Planner</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-appText transition-all">
              <BookOpen size={20} />
              <span>Materials</span>
            </Link>
          </nav>

          <div className="p-4 border-t border-slate-700/50">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-aiPurple flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Kwasi</span>
                <span className="text-xs text-slate-400">Pro Member</span>
              </div>
            </div>
          </div>
        </aside>

        {/* TOP HEADER */}
        <header className="fixed top-0 md:left-72 right-0 h-16 bg-appDark/90 backdrop-blur-xl z-40 flex items-center justify-between md:justify-end px-4 md:px-6 border-b border-slate-700/50">
          {/* Mobile Only Logo */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-xl font-black tracking-wider">Nimadea</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-appText transition-colors"><Search size={20} /></button>
            <button className="p-2 text-slate-400 hover:text-appText transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-aiPurple rounded-full animate-pulse"></span>
            </button>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="pt-16 md:pl-72 h-[100dvh]">
          {children}
        </main>

        {/* MOBILE BOTTOM NAV (Hidden on Desktop) */}
        <nav className="md:hidden fixed bottom-0 w-full bg-appGray/95 backdrop-blur-xl border-t border-slate-700/50 z-50 pb-safe">
          <div className="flex justify-around items-center h-16 px-4">
            <Link href="/" className="flex flex-col items-center gap-1 text-brandBlue font-medium">
              <MessageSquare size={20} />
              <span className="text-[10px]">Chat</span>
            </Link>
            <Link href="#" className="flex flex-col items-center gap-1 text-slate-400 hover:text-appText">
              <Calendar size={20} />
              <span className="text-[10px]">Planner</span>
            </Link>
            <Link href="#" className="flex flex-col items-center gap-1 text-slate-400 hover:text-appText">
              <BookOpen size={20} />
              <span className="text-[10px]">Materials</span>
            </Link>
          </div>
        </nav>

      </body>
    </html>
  );
}