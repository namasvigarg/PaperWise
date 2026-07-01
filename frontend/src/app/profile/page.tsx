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
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

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
        setSuccessMsg("Profile information updated successfully!");
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
      if (newEmail && newEmail !== email) {
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
        setSuccessMsg("Email update initiated! A confirmation link has been sent to your new email.");
        setNewEmail("");
      }

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

      <main className="flex-1 ml-[260px] p-8 max-w-4xl animate-fade-in">
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

        <div className="flex flex-col gap-8 max-w-2xl">
          {/* Card 1: Profile Details */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-400 border border-indigo-500/20">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold text-white">Profile Details</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. John Doe"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Institution / Organization</label>
                <div className="relative">
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Stanford University"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                    required
                  />
                  <School className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Professional Role</label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    required
                  >
                    <option value="Researcher">Researcher</option>
                    <option value="Student">Student</option>
                    <option value="Professor">Professor</option>
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="Other">Other</option>
                  </select>
                  <Briefcase className="absolute left-3.5 top-3 w-4 h-4 text-slate-505" />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/10 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Account Security */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-500/10 p-2.5 rounded-xl text-purple-400 border border-purple-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold text-white">Account Security</h3>
            </div>

            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Current Email Address</span>
                <p className="text-xs text-slate-300 mt-1 font-semibold">{email}</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">New Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new-email@university.edu"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                  />
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                </div>
              </div>

              <div className="border-t border-slate-800/60 my-4 pt-4">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                  />
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
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
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                  />
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-505" />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-600/10 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Update Account
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
