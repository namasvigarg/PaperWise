"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { 
  Sparkles, 
  Lock, 
  Loader2, 
  AlertTriangle, 
  CheckCircle 
} from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  
  // Form fields
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  
  // Status states
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Check if session exists (Supabase automatically logs in via the link before rendering)
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setErrorMsg("Session expired or invalid link. Please request a new link.");
      }
    };
    checkSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!password.trim() || !confirmPassword.trim()) {
      setErrorMsg("Please fill in all password fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("Success! Password updated. Logging you in...");
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 2000);
      }
    } catch (e) {
      setErrorMsg("Failed to connect to Supabase auth client.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0B0F19]">
      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-[440px] z-10">
        
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-8 text-center">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/10">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold font-outfit text-white tracking-tight leading-none">PaperWise</h1>
            <span className="text-[11px] uppercase font-bold text-indigo-400 tracking-wider">Reset Password</span>
          </div>
        </div>

        {/* Auth Box Container */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800/60 shadow-2xl">
          
          <div className="mb-6 text-center">
            <h2 className="text-sm font-semibold text-white">Create New Password</h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Please enter your new secure password below.
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 flex items-center gap-3 text-xs leading-relaxed animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-200 flex items-center gap-3 text-xs leading-relaxed animate-fade-in">
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleReset} className="space-y-4.5">
            {/* New Password field */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-505" />
              </div>
            </div>

            {/* Confirm Password field */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-505" />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/15 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>Update Password</>
              )}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
