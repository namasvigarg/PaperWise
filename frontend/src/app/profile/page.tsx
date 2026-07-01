"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/utils/supabaseClient";
import { 
  User, 
  Mail, 
  Lock, 
  Briefcase, 
  School, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  Save
} from "lucide-react";

export default function ProfilePage() {
  // Profile fields
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [institution, setInstitution] = useState<string>("");
  const [role, setRole] = useState<string>("Researcher");

  // Auth fields
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"details" | "security">("details");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setName(user.user_metadata?.name || "");
        setInstitution(user.user_metadata?.institution || "");
        setRole(user.user_metadata?.role || "Researcher");
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentEmail = user?.email || "";
      
      let emailUpdated = false;
      if (email && email !== currentEmail) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) {
          setErrorMsg(emailError.message);
          setLoading(false);
          return;
        }
        emailUpdated = true;
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          name,
          institution,
          role
        }
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        if (emailUpdated) {
          setSuccessMsg("Profile information updated! A confirmation link has been sent to your new email.");
        } else {
          setSuccessMsg("Profile information updated successfully!");
        }
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (e) {
      setErrorMsg("Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Validation
    if (newPassword && newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
        setSuccessMsg("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
      }
      
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (e) {
      setErrorMsg("Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <Sidebar />

      <main className="flex-1 ml-[260px] p-8 max-w-7xl animate-fade-in">
        {/* Header */}
        <header className="mb-8">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">User Space</span>
            <h1 className="text-4xl font-extrabold font-outfit text-white tracking-tight mt-1">
              Account <span className="text-gradient">Profile</span>
            </h1>
            <p className="text-slate-400 text-[14px] mt-1">Manage your professional information, email and security settings.</p>
          </div>
        </header>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 flex items-center gap-3 text-sm animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-200 flex items-center gap-3 text-sm animate-fade-in">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="glass-panel rounded-3xl border border-slate-800/60 overflow-hidden flex flex-col w-full shadow-xl">
          {/* Tabs Selector */}
          <div className="flex justify-start border-b border-slate-800/60 bg-slate-950/20 px-8">
            {[
              { id: "details", label: "Profile Details", icon: User },
              { id: "security", label: "Account Security", icon: Lock },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setErrorMsg("");
                    setSuccessMsg("");
                    setActiveTab(tab.id as any);
                  }}
                  className={`flex items-center gap-2 px-8 py-5 border-b-2 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-white bg-indigo-500/5"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-8">
            {/* Profile Details Form */}
            {activeTab === "details" && (
              <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-xl">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. John Doe"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john.doe@example.com"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                      required
                    />
                    <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Institution / Organization</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Stanford University"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                      required
                    />
                    <School className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Professional Role</label>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                      required
                    >
                      <option value="Researcher">Researcher</option>
                      <option value="Student">Student</option>
                      <option value="Professor">Professor</option>
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="Data Scientist">Data Scientist</option>
                      <option value="Other">Other</option>
                    </select>
                    <Briefcase className="absolute left-4 top-3.5 w-4 h-4 text-slate-505" />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Profile
                  </button>
                </div>
              </form>
            )}

            {/* Account Security Form */}
            {activeTab === "security" && (
              <form onSubmit={handleUpdateAccount} className="space-y-6 max-w-xl">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                    />
                    <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                    />
                    <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-550" />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-600/10 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Update Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
