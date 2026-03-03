'use client';

import { login, signup } from './actions'
import { motion } from 'framer-motion'
import { ArrowRight, Hammer, Wrench } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image';

export default function LoginPage({
    searchParams,
}: {
    searchParams: { message: string, error: string }
}) {
    const params = searchParams;

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center relative overflow-hidden bg-background-dark">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/login_background_painter_v2.jpg"
                    alt="Background"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Overlay to ensure text readability */}
                <div className="absolute inset-0 bg-black/30" />
            </div>

            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-md p-6 relative z-10 mx-4"
            >
                <div className="glass-panel !backdrop-blur-[18px] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                    <div className="p-8 space-y-8">
                        {/* Header */}
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-md uppercase leading-tight">
                                Frank's Home Improvement
                            </h1>
                            <p className="text-primary font-bold tracking-widest text-xs md:text-sm uppercase">
                                Command Centre
                            </p>
                        </div>

                        {/* Form */}
                        <form className="space-y-5">
                            <div className="space-y-1">
                                <div className="relative group">
                                    <input
                                        className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-300 focus:outline-none focus:bg-white/20 focus:border-white/30 transition-all duration-200 shadow-inner backdrop-blur-sm"
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="Username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="relative group">
                                    <input
                                        className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-300 focus:outline-none focus:bg-white/20 focus:border-white/30 transition-all duration-200 shadow-inner backdrop-blur-sm"
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        placeholder="Password"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-200">
                                <input type="checkbox" id="remember" className="rounded border-gray-300 text-primary focus:ring-primary/50" />
                                <label htmlFor="remember">Remember me</label>
                            </div>

                            <div className="pt-2">
                                <button
                                    formAction={login}
                                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg hover:shadow-orange-500/30 transform hover:-translate-y-0.5"
                                >
                                    Log In
                                </button>

                                <div className="mt-6 text-center">
                                    <Link href="/login/forgot-password" className="text-sm text-gray-300 hover:text-white transition-colors">
                                        Forget your password?
                                    </Link>
                                </div>
                            </div>

                            {(params.message || params.error) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-100 text-sm text-center"
                                >
                                    {params.message || params.error}
                                </motion.div>
                            )}
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
