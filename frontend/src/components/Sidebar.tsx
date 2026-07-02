"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import {
  LayoutDashboard,
  MessageSquare,
  Columns,
  Library,
  Sparkles,
  BookOpen,
  LogOut,
  User
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  const menuItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Chat with Paper", href: "/chat", icon: MessageSquare },
    { name: "Compare Papers", href: "/compare", icon: Columns },
    { name: "Literature Review", href: "/lit-review", icon: Library },
    { name: "Profile", href: "/profile", icon: User },
  ];

  return (
    <aside className="fixed top-0 left-0 h-screen w-[260px] glass-panel border-r border-slate-800/60 p-6 flex flex-col justify-between z-30">
      <div>
        {/* Brand Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-outfit text-white tracking-tight leading-none">PaperWise</h1>
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">AI Assistant</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? "bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white font-medium shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-400"
                  }`} />
                <span className="text-[14px]">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Sign Out */}
      <div className="space-y-3.5">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/10 transition-all text-xs font-bold cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
