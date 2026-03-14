'use server'

import { createClient } from "@/utils/supabase/server";
import { Database } from "@/types/supabase";

type JobEvent = Database['public']['Tables']['job_events']['Row'];

export async function logJobEvent(
    jobId: string,
    eventType: string,
    metadata?: any
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        // 1. Auth Check (Optional: ensure user has access to this job)
        // For now, relying on RLS and createClient context

        const { error } = await supabase
            .from("job_events")
            .insert({
                job_id: jobId,
                event_type: eventType,
                metadata: metadata || {},
            });

        if (error) {
            console.error("Error logging job event:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error("Exception logging job event:", err);
        return { success: false, error: "Internal Server Error" };
    }
}
