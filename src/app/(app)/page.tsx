"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Mic, Camera, List, Calendar, Clock, MapPin, ArrowRight, Zap, TrendingUp, User, Hammer } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { Database } from "@/types/supabase";

export default function Dashboard() {
  const supabase = createClient();
  const [metrics, setMetrics] = useState({
    activeWorkOrders: 0,
    drafts: 0,
    taskRevenue: 0,
  });

  // Today's Work Orders
  // Use any to bypass strict type check for custom pivot until types are synced
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Work Orders for Metrics
      const { data: wos } = await supabase.from('work_orders').select('status') as { data: { status: string | null }[] | null };
      const { data: tasks } = await supabase.from('work_order_tasks').select('status, estimated_cost') as { data: { status: string, estimated_cost: number }[] | null };

      const activeCount = wos?.filter((j) => ['Scheduled', 'In Progress'].includes(j.status || '')).length || 0;
      const draftCount = wos?.filter((j) => j.status === 'Draft').length || 0;

      // Calculate potential revenue (sum of cost estimates for incomplete tasks)
      const taskRevenue = tasks?.reduce((sum, t) => {
        if (t.status !== 'Completed') {
          return sum + (t.estimated_cost || 0);
        }
        return sum;
      }, 0) || 0;

      setMetrics({ activeWorkOrders: activeCount, drafts: draftCount, taskRevenue });

      // 2. Fetch Active Work Orders
      const { data: woData } = await supabase
        .from('work_orders')
        .select('*, clients(name)')
        .in('status', ['Scheduled', 'In Progress', 'Draft'])
        .order('created_at', { ascending: false })
        .limit(4);

      setActiveOrders(woData || []);
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative min-h-screen pb-24 overflow-hidden">
      <div className="aurora-blur bg-primary/20 top-[-50px] left-[-50px]" />
      <div className="aurora-blur bg-secondary/20 bottom-[-50px] right-[-50px]" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-8 p-6"
      >
        {/* Header */}
        <motion.header variants={item} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                Command Center
              </h1>
              <p className="text-primary font-medium tracking-wide uppercase text-xs opacity-90">{currentDate}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary p-[1px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                <span className="font-bold text-white">F</span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Quick Stats Row */}
        <motion.section variants={item} className="grid grid-cols-3 gap-3">
          <GlassCard intensity="panel" className="p-4 flex flex-col gap-2 items-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Zap className="w-5 h-5 text-primary mb-1" />
            <span className="text-2xl font-bold">{loading ? "-" : metrics.activeWorkOrders}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-60 font-semibold">Active WOs</span>
          </GlassCard>

          <GlassCard intensity="panel" className="p-4 flex flex-col gap-2 items-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <List className="w-5 h-5 text-white/80 mb-1" />
            <span className="text-2xl font-bold">{loading ? "-" : metrics.drafts}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-60 font-semibold">Draft WOs</span>
          </GlassCard>

          <GlassCard intensity="panel" className="p-4 flex flex-col gap-2 items-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <TrendingUp className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-lg font-bold text-emerald-400">{loading ? "-" : `$${(metrics.taskRevenue / 1000).toFixed(1)}k`}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-60 font-semibold">Est Pipeline</span>
          </GlassCard>
        </motion.section>

        {/* Work Orders Pipeline */}
        <motion.section variants={item} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Work Orders Pipeline
            </h2>
            <Link href="/ops/jobs" className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">View all</Link>
          </div>

          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="h-24 bg-white/5 rounded-2xl animate-pulse" />
            ) : activeOrders.length === 0 ? (
              <GlassCard className="p-8 text-center opacity-70 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Calendar className="w-6 h-6 opacity-50" />
                </div>
                <p>No active work orders right now.</p>
                <AnimatedButton size="sm" variant="secondary">Create One</AnimatedButton>
              </GlassCard>
            ) : (
              activeOrders.map((wo, i) => (
                <GlassCard
                  key={wo.id}
                  intensity="bright"
                  className="p-5 border-l-4 border-l-primary relative overflow-hidden group"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{wo.clients?.name || 'Unknown Client'}</h3>
                      <p className="text-sm text-gray-400">{wo.property_address_or_unit}</p>
                    </div>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider border ${wo.status === 'Draft' ? 'bg-white/5 text-gray-400 border-white/10' :
                      wo.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-primary/10 text-primary border-primary/20'
                      }`}>
                      {wo.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm font-medium text-gray-400 relative z-10">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>{wo.due_at ? new Date(wo.due_at).toLocaleDateString() : 'No Due Date'}</span>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </motion.section>

        {/* Quick Actions Grid */}
        <motion.section variants={item} className="space-y-4">
          <h2 className="text-xl font-bold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/ops/subs" className="col-span-1">
              <AnimatedButton className="w-full h-32 flex-col gap-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:border-primary">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                  <Hammer className="w-6 h-6" />
                </div>
                <span className="font-bold">Dispatch Subs</span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/receipts" className="col-span-1">
              <AnimatedButton variant="secondary" className="w-full h-32 flex-col gap-3 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="font-bold">Snap Receipt</span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/clients" className="col-span-1">
              <AnimatedButton variant="secondary" className="w-full h-24 flex-col gap-2 rounded-2xl border border-white/10 hover:border-white/20">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <User className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm">B2B Clients</span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/jobs" className="col-span-1">
              <AnimatedButton variant="secondary" className="w-full h-24 flex-col gap-2 rounded-2xl border border-white/10 hover:border-white/20">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <List className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm">Work Orders</span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/finance" className="col-span-2">
              <AnimatedButton variant="secondary" className="w-full h-24 flex-row gap-4 rounded-2xl border border-white/10 hover:border-white/20">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">Finance Hub</span>
                  <span className="text-xs text-slate-400">Job Costing & Profitability</span>
                </div>
              </AnimatedButton>
            </Link>
          </div>
        </motion.section >
      </motion.div >
    </div >
  );
}
