"use client";

import { login, signup } from "./actions";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string; error: string };
}) {
  const params = searchParams;

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center relative overflow-hidden bg-[#0a0a0a]">
      {/* Ambient ember glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-orange-900/[0.03] blur-[100px] pointer-events-none" />

      {/* Subtle grid lines */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm p-6 relative z-10 mx-4"
      >
        <div className="bg-[#0e0e10] rounded-lg overflow-hidden border border-white/[0.06] shadow-[0_8px_40px_-8px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,107,0,0.03)]">
          {/* Top ember accent line */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <div className="p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              {/* Logo mark */}
              <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-b from-primary to-[#e05e00] flex items-center justify-center shadow-[0_4px_16px_-2px_rgba(255,107,0,0.4)]">
                <span className="text-white font-black text-xl">F</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Frank's Home Improvement
                </h1>
                <p className="text-primary/80 font-semibold tracking-[0.2em] text-[10px] uppercase mt-1">
                  Command Centre
                </p>
              </div>
            </div>

            {/* Form */}
            <form className="space-y-4">
              <div>
                <input
                  className="w-full bg-[#111113] border border-white/[0.06] rounded-lg px-4 py-3 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/40 focus:bg-[#141416] transition-all duration-200 shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset]"
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="Email"
                />
              </div>

              <div>
                <input
                  className="w-full bg-[#111113] border border-white/[0.06] rounded-lg px-4 py-3 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/40 focus:bg-[#141416] transition-all duration-200 shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset]"
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Password"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  id="remember"
                  className="rounded border-white/10 bg-[#111113] text-primary focus:ring-primary/30 focus:ring-offset-0"
                />
                <label htmlFor="remember">Remember me</label>
              </div>

              <div className="pt-2">
                <button
                  formAction={login}
                  className="w-full bg-gradient-to-b from-primary to-[#e05e00] text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_4px_16px_-2px_rgba(255,107,0,0.4)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_6px_24px_-2px_rgba(255,107,0,0.5)] hover:from-[#ff7a1a] hover:to-primary active:from-[#e05e00] active:to-[#cc5500] active:shadow-[0_1px_3px_0_rgba(0,0,0,0.4)_inset] active:translate-y-px text-sm tracking-wide"
                >
                  Sign In
                </button>

                <div className="mt-6 text-center">
                  <Link
                    href="/login/forgot-password"
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              {(params.message || params.error) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 rounded-lg bg-red-950/50 border border-red-500/20 text-red-400 text-xs text-center"
                >
                  {params.message || params.error}
                </motion.div>
              )}
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
