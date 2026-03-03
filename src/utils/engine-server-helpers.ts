import { createClient } from "@/utils/supabase/server";

export async function logProcessActivity(
    engagementId: string,
    activityName: string,
    description: string,
    status: 'pending' | 'in_progress' | 'completed' | 'blocked' = 'completed'
) {
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from('process_activities')
            .insert({
                engagement_id: engagementId,
                name: activityName,
                description: description,
                status: status,
                timestamp: new Date().toISOString()
            } as any);

        if (error) {
            console.error("Failed to log process activity:", error);
        }
    } catch (e) {
        console.error("Exception logging process activity:", e);
    }
}
