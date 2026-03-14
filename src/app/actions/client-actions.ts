'use server'

import { createClient } from '@/utils/supabase/server'
import { createEngagement } from '@/app/actions/engine/engagement-actions'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createClientSchema = z.object({
    name: z.string().min(1, "Client name is required"),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

import { withActionValidation } from '@/lib/core/actions/wrapper';
import { createActionError, ActionResult } from '@/lib/core/actions/types';
import { Database } from '@/types/supabase';

/**
 * @intent Creates a new client under the user's organization and auto-initiates an engagement journey.
 * @generated AI-assisted
 */
export async function createClientAction(input: unknown): Promise<ActionResult<Database['public']['Tables']['clients']['Row']>> {
    return withActionValidation(createClientSchema, input, async (validatedData) => {
        const supabase = await createClient();

        // 1. Auth Check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: createActionError('UNAUTHORIZED', 'Unauthorized access', 401) };
        }

        const { name, email, phone, address } = validatedData;

        // 2. Get Organization ID
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        const userProfile = profile as { organization_id: string } | null;

        if (!userProfile?.organization_id) {
            return { success: false, error: createActionError('MISSING_ORG', 'Organization not found', 403) };
        }

        // 3. Insert Client
        const { data: newClient, error: insertError } = await supabase
            .from('clients')
            .insert({
                organization_id: userProfile.organization_id,
                name,
                email: email ?? null,
                phone: phone ?? null,
                address: address ?? null
            })
            .select()
            .single();

        if (insertError || !newClient) {
            console.error("Client Insert Error:", insertError);
            return { success: false, error: createActionError('DB_INSERT_FAILED', 'Failed to create client', 500) };
        }

        // 4. Engine Integration: Auto-create Journey
        try {
            await createEngagement(userProfile.organization_id, "Home Improvement Journey");
        } catch (e) {
            console.error("Failed to auto-create engagement:", e);
        }

        revalidatePath('/quotes');
        revalidatePath('/clients');

        return { success: true, data: newClient };
    });
}

export async function updateClientAction(clientId: string, data: any) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: "Unauthorized" }
    }

    // Verify User's Organization matches Client's Organization (Security)
    // We can trust RLS for the update, but good to be explicit or just let RLS handle it.
    // RLS "Users can update clients in their organization" should handle it.

    const { error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', clientId)

    if (error) {
        console.error("Update Client Error:", error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/ops/clients/${clientId}`)
    return { success: true }
}
