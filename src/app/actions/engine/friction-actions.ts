'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";

export async function updateFrictionStatus(id: string, status: 'identified' | 'analyzed' | 'resolved' | 'archived') {
    const supabase = await createClient();

    const { error } = await supabase
        .from('friction_items')
        .update({ status } as any)
        .eq('id', id);

    if (error) {
        console.error('Error updating friction status:', error);
        throw new Error('Failed to update friction status');
    }

    revalidatePath(`/engine/discovery/friction`);
    return { success: true };
}

export async function createFriction(engagementId: string, description: string, severity: 'low' | 'medium' | 'high' | 'critical') {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('friction_items')
        .insert({ engagement_id: engagementId, description, severity } as any)
        .select()
        .single();

    if (error) {
        console.error('Error creating friction:', error);
        throw new Error('Failed to create friction');
    }

    revalidatePath(`/engine/discovery/friction`);
    return data;
}

export async function getFrictionItems(engagementId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('friction_items')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching friction items:', error);
        throw new Error('Failed to fetch friction items');
    }

    return data;
}
