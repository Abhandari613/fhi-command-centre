'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";

export async function createTool(engagementId: string, name: string, category: 'software' | 'hardware' | 'service' | 'other') {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('tools')
        .insert({ engagement_id: engagementId, name, category } as any)
        .select()
        .single();

    if (error) {
        console.error('Error creating tool:', error);
        throw new Error('Failed to create tool');
    }

    revalidatePath(`/engine/discovery`);
    return data;
}

export async function getTools(engagementId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('tools')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching tools:', error);
        throw new Error('Failed to fetch tools');
    }

    return data;
}
