"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { 
  Sparkles, 
  Mail, 
  Lock, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  User,
  School,
  Briefcase,
  Globe
} from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup" | "forgot">("login");
  
  // Form fields
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [institution, setInstitution] = useState<string>("");
  const [role, setRole] = useState<string>("Researcher");
  const [country, setCountry] = useState<string>("");
  
  // Status states
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Check if session already exists, redirect to dashboard if yes
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push("/");
      }
    };
    checkSession();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (activeTab === "forgot") {
      if (!email.trim()) {
        setErrorMsg("Please enter your email address.");
        return;
      }
    } else {
      if (!email.trim() || !password.trim()) {
        setErrorMsg("Please fill in all email and password fields.");
        return;
      }

      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters long.");
        return;
      }
    }

    setLoading(true);

    try {
      if (activeTab === "login") {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Success! Logging in...");
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 1000);
        }
      } else if (activeTab === "signup") {
        // Sign Up with User Metadata
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              institution,
              role,
              country
            }
          }
        });
        if (error) {
          setErrorMsg(error.message);
        } else {
          const isAlreadyRegistered = data.user?.identities?.length === 0;
          if (isAlreadyRegistered) {
            setErrorMsg("This email is already registered. Try logging in instead.");
          } else {
            const isConfirmRequired = !data.session;
            setSuccessMsg(
              isConfirmRequired
                ? "Registration successful! Please check your email to confirm your account."
                : "Registration successful! You can now log in."
            );
            // Auto switch to login tab on success
            setTimeout(() => {
              setActiveTab("login");
              setSuccessMsg("");
            }, 6000);
          }
        }
      } else {
        // Forgot Password
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`
        });
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Password reset email sent! Please check your inbox.");
        }
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
            <span className="text-[11px] uppercase font-bold text-indigo-400 tracking-wider">AI Assistant Auth</span>
          </div>
        </div>

        {/* Auth Box Container */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800/60 shadow-2xl">
          
          {/* Tabs header */}
          {activeTab !== "forgot" ? (
            <div className="flex bg-slate-950/60 p-1.5 rounded-xl border border-slate-900 mb-6">
              <button
                onClick={() => { setActiveTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "login"
                    ? "bg-indigo-600/90 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setActiveTab("signup"); setErrorMsg(""); setSuccessMsg(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "signup"
                    ? "bg-indigo-600/90 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="mb-6 text-center">
              <h2 className="text-sm font-semibold text-white">Reset Password</h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter your email and we'll send you a password reset link.
              </p>
            </div>
          )}

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
          <form onSubmit={handleAuth} className="space-y-4.5">
            {/* Email field */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-505" />
              </div>
            </div>

            {activeTab === "signup" && (
              <>
                {/* Name field */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Dr. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all"
                      required
                    />
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* Institution field */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Institution</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Stanford University"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all"
                      required
                    />
                    <School className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* Role field */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Professional Role</label>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                      required
                    >
                      <option value="Researcher">Researcher</option>
                      <option value="Student">Student</option>
                      <option value="Professor">Professor</option>
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="Data Scientist">Data Scientist</option>
                      <option value="Other">Other</option>
                    </select>
                    <Briefcase className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* Country field */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Country</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="United States"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all"
                      required
                    />
                    <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </>
            )}

            {/* Password field */}
            {activeTab !== "forgot" && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Password</label>
                  {activeTab === "login" && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab("forgot"); setErrorMsg(""); setSuccessMsg(""); }}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer bg-transparent border-none"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-all"
                    required={true}
                  />
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-505" />
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/15 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {activeTab === "login" ? "Signing In..." : activeTab === "signup" ? "Signing Up..." : "Sending Link..."}
                </>
              ) : (
                <>
                  {activeTab === "login" ? "Sign In" : activeTab === "signup" ? "Register Account" : "Send Reset Link"}
                </>
              )}
            </button>
          </form>

          {activeTab === "forgot" && (
            <button
              type="button"
              onClick={() => { setActiveTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-200 transition-all cursor-pointer mt-4 bg-transparent border-none"
            >
              Back to Sign In
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
