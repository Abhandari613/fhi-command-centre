'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";

export async function createDesire(engagementId: string, statement: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('owner_desires')
        .insert({ engagement_id: engagementId, statement } as any)
        .select()
        .single();

    if (error) {
        console.error('Error creating desire:', error);
        throw new Error('Failed to create desire');
    }

    revalidatePath(`/engine/discovery`);
    return data;
}

export async function getDesires(engagementId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('owner_desires')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching desires:', error);
        throw new Error('Failed to fetch desires');
    }

    return data;
}
