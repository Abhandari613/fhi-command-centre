'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";

export async function createProcessActivity(engagementId: string, name: string, description: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('process_activities')
        .insert({ engagement_id: engagementId, name, description } as any)
        .select()
        .single();

    if (error) {
        console.error('Error creating process activity:', error);
        throw new Error('Failed to create process activity');
    }

    revalidatePath(`/engine/discovery`);
    return data;
}

export async function getProcessActivities(engagementId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('process_activities')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching process activities:', error);
        throw new Error('Failed to fetch process activities');
    }

    return data;
}
