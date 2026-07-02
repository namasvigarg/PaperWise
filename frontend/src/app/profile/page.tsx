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
  Save,
  Globe
} from "lucide-react";

export default function ProfilePage() {
  // Profile fields
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [institution, setInstitution] = useState<string>("");
  const [role, setRole] = useState<string>("Researcher");
  const [country, setCountry] = useState<string>("");

  // Auth fields
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // UI state toggles
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);
  const [showPasswordForm, setShowPasswordForm] = useState<boolean>(false);
  
  // Status states
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Local feedback states for credentials forms
  const [emailError, setEmailError] = useState<string>("");
  const [emailSuccess, setEmailSuccess] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [passwordSuccess, setPasswordSuccess] = useState<string>("");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setName(user.user_metadata?.name || "");
        setInstitution(user.user_metadata?.institution || "");
        setRole(user.user_metadata?.role || "Researcher");
        setCountry(user.user_metadata?.country || "");
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
          role,
          country
        }
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("Profile details updated successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (e) {
      setErrorMsg("Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    if (!newEmail.trim() || newEmail === email) {
      setEmailError("Please enter a new valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        setEmailError(error.message);
      } else {
        setEmailSuccess("Email change requested! Please check the confirmation link sent to your new email.");
        setNewEmail("");
        setTimeout(() => {
          setEmailSuccess("");
          setShowEmailForm(false);
        }, 6000);
      }
    } catch (e) {
      setEmailError("Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setPasswordSuccess("");
          setShowPasswordForm(false);
        }, 4000);
      }
    } catch (e) {
      setPasswordError("Failed to connect to authentication server.");
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
          <div className="border-b border-slate-800/60 bg-slate-950/20 px-8 py-5 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              Profile Details
            </span>
          </div>

          <div className="p-8 space-y-8">
            {/* Profile Details Form */}
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
                  <Briefcase className="absolute left-4 top-3.5 w-4 h-4 text-slate-550" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Country</label>
                <div className="relative">
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="United States"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                    required
                  />
                  <Globe className="absolute left-4 top-3.5 w-4 h-4 text-slate-505" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile Details
                </button>
              </div>
            </form>

            {/* Account Credentials Section */}
            <div className="pt-6 border-t border-slate-850 space-y-5 max-w-xl">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Account Credentials</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Manage your registered email and secure authentication credentials.</p>
              </div>

              {/* Email credentials card */}
              <div className="bg-slate-900/10 border border-slate-850 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Registered Email</label>
                    <span className="text-xs font-medium text-slate-200 mt-1 block">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailForm(!showEmailForm);
                      setShowPasswordForm(false);
                      setEmailError("");
                      setEmailSuccess("");
                    }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-850"
                  >
                    {showEmailForm ? "Cancel" : "Change Email"}
                  </button>
                </div>

                {emailError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-center gap-2.5 text-xs animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}

                {emailSuccess && (
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-200 flex items-center gap-2.5 text-xs animate-fade-in">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <span>{emailSuccess}</span>
                  </div>
                )}

                {showEmailForm && (
                  <form onSubmit={handleUpdateEmail} className="space-y-4 pt-4 border-t border-slate-800/40 animate-fade-in">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">New Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="new.email@example.com"
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                          required
                        />
                        <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Confirm Email Change
                    </button>
                  </form>
                )}
              </div>

              {/* Password credentials card */}
              <div className="bg-slate-900/10 border border-slate-850 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Account Password</label>
                    <span className="text-xs font-medium text-slate-500 mt-1 block">••••••••••••</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(!showPasswordForm);
                      setShowEmailForm(false);
                      setPasswordError("");
                      setPasswordSuccess("");
                    }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-850"
                  >
                    {showPasswordForm ? "Cancel" : "Change Password"}
                  </button>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-center gap-2.5 text-xs animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-200 flex items-center gap-2.5 text-xs animate-fade-in">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {showPasswordForm && (
                  <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4 border-t border-slate-800/40 animate-fade-in">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                          required
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
                          required
                        />
                        <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-550" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Confirm Password Change
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
