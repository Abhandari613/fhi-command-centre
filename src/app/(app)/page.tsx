"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Mic, Camera, List, Calendar, Clock, MapPin, ArrowRight, Zap, TrendingUp, User, Hammer } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Dashboard() {
  const supabase = createClient();
  const [metrics, setMetrics] = useState({
    activeWorkOrders: 0,
    drafts: 0,
    taskRevenue: 0,
  });

  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: wos } = await (supabase.from as any)('work_orders').select('status') as { data: { status: string | null }[] | null };
      const { data: tasks } = await (supabase.from as any)('work_order_tasks').select('status, estimated_cost') as { data: { status: string, estimated_cost: number }[] | null };

      const activeCount = wos?.filter((j) => ['Scheduled', 'In Progress'].includes(j.status || '')).length || 0;
      const draftCount = wos?.filter((j) => j.status === 'Draft').length || 0;

      const taskRevenue = tasks?.reduce((sum, t) => {
        if (t.status !== 'Completed') {
          return sum + (t.estimated_cost || 0);
        }
        return sum;
      }, 0) || 0;

      setMetrics({ activeWorkOrders: activeCount, drafts: draftCount, taskRevenue });

      const { data: woData } = await (supabase.from as any)('work_orders')
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
      transition: { staggerChildren: 0.08 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { ease: "easeOut" as const } }
  };

  return (
    <div className="relative min-h-screen pb-24 overflow-hidden">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 py-2"
      >
        {/* Header */}
        <motion.header variants={item} className="space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                Command Centre
              </h1>
              <p className="text-primary/70 font-semibold tracking-[0.15em] text-[10px] uppercase mt-0.5">{currentDate}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-b from-primary to-[#e05e00] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(255,107,0,0.4)]">
              <span className="font-black text-white text-sm">F</span>
            </div>
          </div>
        </motion.header>

        {/* Quick Stats Row */}
        <motion.section variants={item} className="grid grid-cols-3 gap-2">
          <GlassCard intensity="panel" className="p-4 flex flex-col gap-1.5 items-center text-center group">
            <Zap className="w-4 h-4 text-primary mb-0.5" strokeWidth={2.5} />
            <span className="text-2xl font-black tabular-nums">{loading ? "-" : metrics.activeWorkOrders}</span>
            <span className="text-[9px] uppercase tracking-[0.15em] text-gray-500 font-semibold">Active</span>
          </GlassCard>

          <GlassCard intensity="panel" className="p-4 flex flex-col gap-1.5 items-center text-center group">
            <List className="w-4 h-4 text-gray-400 mb-0.5" strokeWidth={2} />
            <span className="text-2xl font-black tabular-nums">{loading ? "-" : metrics.drafts}</span>
            <span className="text-[9px] uppercase tracking-[0.15em] text-gray-500 font-semibold">Drafts</span>
          </GlassCard>

          <GlassCard intensity="panel" className="p-4 flex flex-col gap-1.5 items-center text-center group">
            <TrendingUp className="w-4 h-4 text-emerald-500 mb-0.5" strokeWidth={2.5} />
            <span className="text-xl font-black tabular-nums text-emerald-400">{loading ? "-" : `$${(metrics.taskRevenue / 1000).toFixed(1)}k`}</span>
            <span className="text-[9px] uppercase tracking-[0.15em] text-gray-500 font-semibold">Pipeline</span>
          </GlassCard>
        </motion.section>

        {/* Work Orders Pipeline */}
        <motion.section variants={item} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2 text-white">
              <div className="w-1 h-4 bg-primary rounded-full" />
              Work Orders
            </h2>
            <Link href="/ops/jobs" className="text-[11px] text-gray-500 font-medium hover:text-primary transition-colors tracking-wide uppercase">
              View all
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {loading ? (
              <div className="h-20 bg-white/[0.02] rounded-lg animate-pulse border border-white/[0.03]" />
            ) : activeOrders.length === 0 ? (
              <GlassCard className="p-8 text-center flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center border border-white/[0.04]">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-sm text-gray-500">No active work orders</p>
                <AnimatedButton size="sm" variant="secondary">Create One</AnimatedButton>
              </GlassCard>
            ) : (
              activeOrders.map((wo, i) => (
                <GlassCard
                  key={wo.id}
                  intensity="bright"
                  className="p-4 ember-border-l relative overflow-hidden group"
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
                >
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{wo.clients?.name || 'Unknown Client'}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{wo.property_address_or_unit}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider border ${wo.status === 'Draft' ? 'bg-white/[0.03] text-gray-500 border-white/[0.06]' :
                      wo.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-primary/10 text-primary border-primary/20'
                      }`}>
                      {wo.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 relative z-10">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-gray-600" />
                      <span>{wo.due_at ? new Date(wo.due_at).toLocaleDateString() : 'No Due Date'}</span>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </motion.section>

        {/* Quick Actions Grid */}
        <motion.section variants={item} className="space-y-3">
          <h2 className="text-base font-bold flex items-center gap-2 text-white">
            <div className="w-1 h-4 bg-primary rounded-full" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/ops/subs" className="col-span-1">
              <AnimatedButton className="w-full h-28 flex-col gap-2.5 rounded-lg bg-gradient-to-b from-primary/15 to-primary/5 border-primary/20 hover:border-primary/40">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_12px_-2px_rgba(255,107,0,0.3)]">
                  <Hammer className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm">Dispatch Subs</span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/receipts" className="col-span-1">
              <AnimatedButton variant="secondary" className="w-full h-28 flex-col gap-2.5 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center border border-white/[0.06]">
                  <Camera className="w-5 h-5 text-gray-400" />
                </div>
                <span className="font-bold text-sm">Snap Receipt</span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/clients" className="col-span-1">
              <AnimatedButton variant="secondary" className="w-full h-20 flex-col gap-1.5 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/10">
                  <User className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs">B2B Clients</span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/jobs" className="col-span-1">
              <AnimatedButton variant="secondary" className="w-full h-20 flex-col gap-1.5 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/10">
                  <List className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs">Work Orders</span>
              </AnimatedButton>
            </Link>

            <Link href="/ops/finance" className="col-span-2">
              <AnimatedButton variant="secondary" className="w-full h-16 flex-row gap-3 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/10">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">Finance Hub</span>
                  <span className="text-[10px] text-gray-500">Job Costing & Profitability</span>
                </div>
              </AnimatedButton>
            </Link>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
