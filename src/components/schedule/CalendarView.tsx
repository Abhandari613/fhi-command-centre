"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Database } from "@/types/supabase";

type WorkOrder = Database['public']['Tables']['work_orders']['Row'];

export function CalendarView() {
    const supabase = createClient();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const fetchWorkOrders = async () => {
            // Fetch all active/scheduled work_orders
            const { data, error } = await supabase
                .from('work_orders')
                .select('*')
                .in('status', ['Scheduled', 'In Progress', 'Completed']);

            if (error) {
                console.error("Error fetching work orders for calendar:", error);
            } else {
                setWorkOrders(data || []);
            }
            setLoading(false);
        };

        fetchWorkOrders();
    }, [supabase]);

    // Calendar Helper Functions
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Generate Calendar Grid
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentDate]);

    // Check for work orders on a specific date
    const getWorkOrdersForDate = (date: Date) => {
        return workOrders.filter(wo => {
            if (!wo.start_date) return false;
            const start = new Date(wo.start_date);
            // Reset times for comparison
            start.setHours(0, 0, 0, 0);
            const check = new Date(date);
            check.setHours(0, 0, 0, 0);

            // If we have an expected finish date, string it across
            if (wo.actual_completion_date) {
                const end = new Date(wo.actual_completion_date);
                end.setHours(23, 59, 59, 999);
                return check >= start && check <= end;
            }

            return check.getTime() === start.getTime();
        });
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 opacity-50" /></div>;
    }

    return (
        <div className="space-y-4">
            {/* Calendar Controls */}
            <div className="flex justify-between items-center px-2">
                <h2 className="text-xl font-bold">{monthName} {year}</h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <GlassCard className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-xs font-bold opacity-50 py-2">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((date, index) => {
                        if (!date) return <div key={`empty-${index}`} className="aspect-square" />;

                        const dayWorkOrders = getWorkOrdersForDate(date);
                        const isToday = new Date().toDateString() === date.toDateString();

                        return (
                            <div key={date.toISOString()} className={cn(
                                "aspect-square rounded-lg border border-white/5 flex flex-col items-center justify-start pt-1 relative overflow-hidden transition-colors hover:bg-white/5",
                                isToday && "bg-primary/20 border-primary/50"
                            )}>
                                <span className={cn(
                                    "text-xs font-medium z-10",
                                    isToday && "text-primary font-bold"
                                )}>
                                    {date.getDate()}
                                </span>

                                {/* Work Order Dots/Bars */}
                                <div className="flex flex-col gap-0.5 mt-1 w-full px-0.5">
                                    {dayWorkOrders.map(wo => (
                                        <Link key={wo.id} href={`/ops/work-orders/${wo.id}`} className={cn(
                                            "h-1.5 rounded-full w-full",
                                            wo.status === 'Completed' ? "bg-emerald-500/60" : "bg-blue-500/80"
                                        )} title={wo.property_address_or_unit} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </GlassCard>

            {/* Selected Date Details (Optional - shows active work orders for the month below) */}
            <div className="space-y-2 mt-4">
                <h3 className="text-sm font-bold opacity-70 px-2 uppercase tracking-wider">Upcoming in {monthName}</h3>
                {workOrders.filter(wo => {
                    if (!wo.start_date) return false;
                    const d = new Date(wo.start_date);
                    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
                }).slice(0, 5).map(wo => (
                    <Link key={wo.id} href={`/ops/work-orders/${wo.id}`}>
                        <GlassCard className="p-3 mb-2 flex justify-between items-center hover:bg-white/5 transition-colors">
                            <span className="font-medium text-sm truncate max-w-[70%]">{wo.property_address_or_unit}</span>
                            <span className="text-xs opacity-50">{new Date(wo.start_date!).getDate()} {monthName.slice(0, 3)}</span>
                        </GlassCard>
                    </Link>
                ))}
            </div>
        </div>
    );
}
