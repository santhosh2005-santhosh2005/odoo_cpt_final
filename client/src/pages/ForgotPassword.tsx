import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "react-hot-toast";

type Step = "REQUEST_OTP" | "VERIFY_OTP" | "RESET_PASSWORD";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("REQUEST_OTP");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await axios.post(`${apiUrl}/api/users/forgot-password`, { email });
      toast.success("OTP sent to your email!");
      setStep("VERIFY_OTP");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await axios.post(`${apiUrl}/api/users/verify-otp`, { email, otp });
      toast.success("OTP Verified!");
      setStep("RESET_PASSWORD");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await axios.post(`${apiUrl}/api/users/reset-password`, { email, otp, newPassword });
      toast.success("Password reset successfully! You can now login.");
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      {/* 🌑 Top Black Panel */}
      <div className="w-full bg-deep-black text-warm-white p-12 flex flex-col border-b-8 border-golden-yellow">
        <div className="flex justify-between items-start">
          <div className="w-24 h-24 bg-white p-2">
            <img src="/logo.png" alt="Odoo POS Cafe" className="w-full h-full object-contain" />
          </div>
        </div>
        <h1 className="text-5xl md:text-7xl leading-[0.85] italic tracking-tighter mt-6">
          PASSWORD<br />
          <span className="text-golden-yellow">RECOVERY</span><br />
          PROTOCOL.
        </h1>
      </div>

      {/* ⚪️ Main Recovery Area */}
      <div className="flex-1 p-8 md:p-20 flex items-center justify-center">
        <div className="w-full max-w-lg space-y-12">
          <div className="space-y-2">
            <span className="bg-golden-yellow text-deep-black px-2 py-1 font-mono font-black text-xs">SECURITY_OVERRIDE</span>
            <h2 className="text-5xl font-black italic tracking-tight">IDENTITY RESET</h2>
          </div>

          {error && (
            <div className="bg-deep-black text-white p-4 font-mono text-xs border-l-4 border-red-600 flex items-center gap-3">
              <span className="text-red-500 font-black">[!] ERROR</span>
              {error}
            </div>
          )}

          {step === "REQUEST_OTP" && (
            <form className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={handleRequestOtp}>
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-deep-black/60 ml-1">Registered E-Mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-16 bg-white border-2 border-deep-black font-bold focus:shadow-[4px_4px_0_0_#F5B400] transition-all"
                  placeholder="OPERATOR@SYSTEM.COM"
                  required
                />
                <p className="font-mono text-[10px] text-gray-500 mt-2">An OTP will be dispatched to verify your identity.</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-20 bg-golden-yellow text-deep-black font-black text-2xl uppercase italic border-2 border-deep-black shadow-[8px_8px_0_0_#0A0A0A] hover:bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
              >
                {loading ? "TRANSMITTING..." : "SEND_OTP"}
              </Button>
            </form>
          )}

          {step === "VERIFY_OTP" && (
            <form className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500" onSubmit={handleVerifyOtp}>
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-deep-black/60 ml-1">Enter 6-Digit OTP</Label>
                <Input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="h-16 bg-white border-2 border-deep-black font-bold text-center text-2xl tracking-[0.5em] focus:shadow-[4px_4px_0_0_#F5B400] transition-all"
                  placeholder="------"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-20 bg-golden-yellow text-deep-black font-black text-2xl uppercase italic border-2 border-deep-black shadow-[8px_8px_0_0_#0A0A0A] hover:bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
              >
                {loading ? "VERIFYING..." : "CONFIRM_OTP"}
              </Button>
            </form>
          )}

          {step === "RESET_PASSWORD" && (
            <form className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500" onSubmit={handleResetPassword}>
              <div className="space-y-2">
                <Label className="font-mono uppercase text-[10px] tracking-widest text-deep-black/60 ml-1">New Security Cipher</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-16 bg-white border-2 border-deep-black font-bold focus:shadow-[4px_4px_0_0_#F5B400] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-20 bg-deep-black text-white font-black text-2xl uppercase italic border-2 border-golden-yellow shadow-[8px_8px_0_0_#F5B400] hover:bg-golden-yellow hover:text-deep-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
              >
                {loading ? "UPDATING..." : "COMMIT_NEW_PASSWORD"}
              </Button>
            </form>
          )}

          <div className="flex justify-center pt-8 border-t-2 border-deep-black/10">
            <Link 
              to="/login" 
              className="font-black text-sm text-deep-black hover:text-golden-yellow uppercase italic tracking-tighter flex items-center gap-1 group"
            >
              <span className="text-golden-yellow group-hover:pr-2 transition-all">←</span> ABORT_RECOVERY_TO_LOGIN
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
