"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { Database } from "@/types/supabase";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, Mail, MessageSquare, FileText, Calendar } from "lucide-react";

type JobEvent = Database['public']['Tables']['job_events']['Row'];

interface QuoteTimelineProps {
    events: JobEvent[];
    className?: string;
}

const getEventIcon = (type: string) => {
    switch (type) {
        case 'created': return <FileText className="w-4 h-4 text-primary" />;
        case 'email_sent': return <Mail className="w-4 h-4 text-blue-400" />;
        case 'viewed': return <Clock className="w-4 h-4 text-amber-400" />;
        case 'replied': return <MessageSquare className="w-4 h-4 text-purple-400" />;
        case 'approved': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
        case 'reminder_sent': return <Calendar className="w-4 h-4 text-orange-400" />;
        default: return <CheckCircle2 className="w-4 h-4 opacity-50" />;
    }
};

const getEventLabel = (type: string) => {
    switch (type) {
        case 'created': return "Quote Created";
        case 'email_sent': return "Quote Sent";
        case 'viewed': return "Client Viewed Quote";
        case 'replied': return "Client Replied";
        case 'approved': return "Quote Approved";
        case 'reminder_sent': return "Reminder Sent";
        default: return type.replace(/_/g, ' ');
    }
};

export function QuoteTimeline({ events, className }: QuoteTimelineProps) {
    if (!events.length) return null;

    return (
        <GlassCard className={cn("p-6", className)}>
            <h3 className="font-bold text-lg mb-4">Activity Log</h3>
            <div className="space-y-6 relative ml-2">
                {/* Vertical Line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-white/10" />

                {events.map((event, i) => (
                    <div key={event.id} className="relative flex gap-4 items-start">
                        {/* Dot */}
                        <div className={cn(
                            "relative z-10 w-4 h-4 rounded-full border-2 border-[#0D0D10] flex items-center justify-center shrink-0 mt-1",
                            "bg-zinc-800"
                        )}>
                            {getEventIcon(event.event_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <div className="text-sm font-medium">{getEventLabel(event.event_type)}</div>
                            <div className="text-xs opacity-50 mt-0.5">
                                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                            </div>
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                                <div className="mt-2 text-xs bg-white/5 p-2 rounded border border-white/5 opacity-70 font-mono">
                                    {JSON.stringify(event.metadata, null, 2)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </GlassCard>
    );
}
