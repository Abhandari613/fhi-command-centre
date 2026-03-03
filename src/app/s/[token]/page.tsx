"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { MapPin, Calendar, CheckCircle, Loader2, Camera } from "lucide-react";

export default function MagicLinkPage() {
    const { token } = useParams();
    const supabase = createClient() as any;
    const [job, setJob] = useState<any>(null);
    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [markingComplete, setMarkingComplete] = useState(false);

    const fetchJobDetails = async () => {
        // 1. Find assignment by token
        const { data: assignData, error: assignError } = await supabase
            .from('job_assignments')
            .select('*, jobs(*, clients(name, address, phone))')
            .eq('magic_link_token', token)
            .single();

        if (assignError || !assignData) {
            console.error("Invalid token:", assignError);
            setLoading(false);
            return;
        }

        setAssignment(assignData);
        setJob(assignData.jobs);
        setLoading(false);
    };

    useEffect(() => {
        if (token) fetchJobDetails();
    }, [token]);

    const handleComplete = async () => {
        if (!confirm("Mark this job as complete?")) return;
        setMarkingComplete(true);

        const { error } = await supabase
            .from('job_assignments')
            .update({ status: 'completed' })
            .eq('id', assignment.id);

        if (!error) {
            setAssignment({ ...assignment, status: 'completed' });
        }
        setMarkingComplete(false);
    };

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;

    if (!job) return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
            <p className="opacity-60">This magic link is invalid or has expired.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white relative">
            <AuroraBackground />

            <div className="relative z-10 p-6 max-w-md mx-auto space-y-6">
                <header className="pt-6 pb-2">
                    <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                        Subcontractor Portal
                    </div>
                    <h1 className="text-3xl font-extrabold leading-tight mb-2">{job.title}</h1>
                    <div className="flex items-center gap-2 opacity-70">
                        <MapPin className="w-4 h-4" />
                        <span>{job.address}</span>
                    </div>
                </header>

                <GlassCard className="p-5 space-y-4">
                    <h3 className="font-bold border-b border-white/5 pb-2">Job Details</h3>

                    <div className="space-y-3 text-sm">
                        <div className="flex gap-3">
                            <Calendar className="w-4 h-4 opacity-50" />
                            <div>
                                <div className="opacity-50 text-xs uppercase font-bold">Start Date</div>
                                <div>{new Date(job.start_date).toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div>
                            <div className="opacity-50 text-xs uppercase font-bold mb-1">Description</div>
                            <p className="leading-relaxed opacity-90">{job.description || "No description provided."}</p>
                        </div>
                    </div>
                </GlassCard>

                {/* Assignment Status */}
                <div className="space-y-4">
                    {assignment.status === 'completed' ? (
                        <GlassCard className="p-6 bg-emerald-500/10 border-emerald-500/30 flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-emerald-400">Job Complete</h3>
                                <p className="text-sm opacity-70">You marked this job as finished.</p>
                            </div>
                        </GlassCard>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={markingComplete}
                            className="w-full py-4 bg-primary hover:bg-primary/90 rounded-xl font-bold text-lg shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                        >
                            {markingComplete ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                            Mark as Complete
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2">
                        <Camera className="w-4 h-4" /> Upload Photo
                    </button>
                </div>
            </div>
        </div>
    );
}
