"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  Shield,
  ArrowRight,
  RefreshCcw,
  Check,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });

  // State Captcha Sederhana
  const [captchaAuth, setCaptchaAuth] = useState({ num1: 0, num2: 0 });
  const [captchaInput, setCaptchaInput] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Generate soal matematika acak (1 - 10)
  const generateCaptcha = () => {
    setCaptchaAuth({
      num1: Math.floor(Math.random() * 10) + 1,
      num2: Math.floor(Math.random() * 10) + 1,
    });
    setCaptchaInput("");
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Validasi Captcha
    if (parseInt(captchaInput) !== captchaAuth.num1 + captchaAuth.num2) {
      setErrorMsg("Jawaban verifikasi keamanan salah!");
      generateCaptcha();
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect paksa untuk memastikan middleware membaca cookie baru
        window.location.href = "/";
      } else {
        setErrorMsg(data.error);
        generateCaptcha(); // Acak ulang captcha jika gagal login
      }
    } catch (err) {
      setErrorMsg("Gagal terhubung ke server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4 font-[family-name:var(--font-quicksand)]">
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header Design */}
        <div className="flex flex-col items-center justify-center px-8 pt-8 pb-6 text-center border-b border-slate-100">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center mb-4 shadow-sm">
            <Shield size={24} className="text-slate-900" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 font-[family-name:var(--font-plus-jakarta-sans)]">
            NBI System Monitoring
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">
            Masuk untuk mengakses pusat kendali
          </p>
        </div>

        <div className="p-8 pt-6">
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold tracking-tight rounded-md text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Input Username */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-900">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-900">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Captcha Matematika Sederhana */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-900">
                Verifikasi Keamanan
              </label>
              <div className="flex gap-3">
                <div className="flex-1 flex items-center justify-center bg-slate-50/50 border border-slate-200 text-slate-600 text-sm font-semibold tracking-tight rounded-md select-none shadow-sm">
                  {captchaAuth.num1} + {captchaAuth.num2} = ?
                </div>
                <input
                  type="number"
                  required
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="flex h-10 w-24 text-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 font-mono font-semibold"
                  placeholder="Hasil"
                />
              </div>
            </div>

            {/* Ingat Saya (Custom Checkbox) */}
            <div
              className="flex items-center gap-2.5 pt-1 cursor-pointer group w-max"
              onClick={() =>
                setFormData({ ...formData, rememberMe: !formData.rememberMe })
              }
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shadow-sm ${
                  formData.rememberMe
                    ? "bg-slate-900 border-slate-900"
                    : "bg-white border-slate-300 group-hover:border-slate-400"
                }`}
              >
                {formData.rememberMe && (
                  <Check size={12} className="text-white" strokeWidth={3} />
                )}
              </div>
              <span className="text-sm font-medium text-slate-600 select-none group-hover:text-slate-900 transition-colors">
                Ingat sesi saya (30 Hari)
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 disabled:pointer-events-none disabled:opacity-70 bg-slate-900 text-slate-50 shadow hover:bg-slate-900/90 h-10"
            >
              {isLoading ? (
                <>
                  <RefreshCcw size={16} className="animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk Sistem <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
