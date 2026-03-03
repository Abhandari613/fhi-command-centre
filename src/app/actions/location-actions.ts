'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createLocationSchema = z.object({
    client_id: z.string().uuid(),
    name: z.string().min(1, "Name is required"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    is_primary: z.boolean().optional(),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

import { withActionValidation } from '@/lib/core/actions/wrapper';
import { createActionError } from '@/lib/core/actions/types';

export async function createLocationAction(input: unknown) {
    return withActionValidation(createLocationSchema, input, async (validatedData) => {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('client_locations')
            .insert(validatedData)
            .select()
            .single();

        if (error) {
            console.error('Error creating location:', error);
            return {
                success: false,
                error: createActionError('DB_INSERT_FAILED', error.message || 'Failed to create location', 500)
            };
        }

        revalidatePath('/ops/clients');
        return { success: true, data };
    });
}

/**
 * @intent Fetches all client locations ordered by primary status and creation date.
 * @generated AI-assisted
 */
export async function getClientLocationsAction(clientId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('client_locations')
        .select('*')
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching locations:', error);
        return {
            success: false,
            error: createActionError('DB_FETCH_FAILED', 'Failed to fetch locations', 500)
        };
    }

    return { success: true, data };
}
