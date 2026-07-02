"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { Loader2, Sparkles } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Fetch current session
        const { data: { session } } = await supabase.auth.getSession();
        const hasSession = !!session;
        setAuthenticated(hasSession);

        handleRedirect(hasSession, pathname);
      } catch (e) {
        console.error("Auth check error:", e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen to session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const hasSession = !!session;
      setAuthenticated(hasSession);
      handleRedirect(hasSession, pathname);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  const handleRedirect = (isAuth: boolean, currentPath: string) => {
    const isAuthPage = currentPath === "/auth";

    if (!isAuth && !isAuthPage) {
      // Redirect to login if not authenticated and trying to access app pages
      router.push("/auth");
    } else if (isAuth && isAuthPage) {
      // Redirect to dashboard if already authenticated and trying to access login page
      router.push("/");
    }
  };

  // Show a premium glassmorphic loading screen on initial check
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4 relative overflow-hidden">
        <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl flex flex-col items-center gap-4.5 text-center shadow-2xl relative z-10">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-3 rounded-2xl animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">PaperWise Workspace</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Authenticating session details...</p>
          </div>
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  // If path is not auth and we are not logged in, render nothing during redirect
  if (!authenticated && pathname !== "/auth") {
    return null;
  }

  // If path is auth and we are logged in, render nothing during redirect
  if (authenticated && pathname === "/auth") {
    return null;
  }

  return <>{children}</>;
}
