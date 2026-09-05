"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/site/BrandMark";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 py-10 relative overflow-x-hidden">
      <div className="absolute -top-40 left-1/4 w-[30rem] h-[30rem] rounded-full bg-[#0071e3]/15 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-[30rem] h-[30rem] rounded-full bg-violet-600/15 blur-[130px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <form onSubmit={submit} className="glass-dark rounded-[2rem] p-8 md:p-10">
          <div className="relative w-16 h-16 mx-auto rounded-2xl overflow-hidden border border-white/15 shadow-lg shadow-black/40">
            <BrandMark className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <h1 className="headline text-2xl text-center mt-5">SHADESH<span className="text-white/40 font-normal">.OPTICS</span></h1>
          <p className="text-white/40 text-sm text-center mt-1.5">Dhaka · Sign in to manage your store</p>

          <label className="block mt-8">
            <span className="text-xs font-semibold text-white/50 mb-1.5 block">Email</span>
            <span className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 focus-within:border-[#4da3ff] transition-colors">
              <Mail size={15} className="text-white/30 shrink-0" />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shadesh-optics.com" autoComplete="email"
                className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-white/25"
              />
            </span>
          </label>

          <label className="block mt-3">
            <span className="text-xs font-semibold text-white/50 mb-1.5 block">Password</span>
            <span className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 focus-within:border-[#4da3ff] transition-colors">
              <Lock size={15} className="text-white/30 shrink-0" />
              <input
                type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-white/25"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-white/30 hover:text-white/70" aria-label="Toggle password">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </span>
          </label>

          {error && <p className="text-rose-400 text-xs mt-3 text-center">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="btn-primary w-full mt-6 !py-3.5 text-sm disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => {
              setEmail("admin@shadesh-optics.com");
              setPassword("shadesh123");
              setError("");
            }}
            className="mt-3 w-full text-center text-xs text-white/40 hover:text-white/80 py-1 transition-colors"
          >
            Click here to fill default login
          </button>
        </form>
        <p className="text-center text-white/25 text-xs mt-4">Protected area · Authorised staff only</p>
      </motion.div>
    </div>
  );
}
