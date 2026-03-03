"use server";

import { createClient } from "@/utils/supabase/server";
import { createQuoteSchema, CreateQuoteInput } from "@/lib/schemas/quoteSchema";
import { revalidatePath } from "next/cache";
import { JOB_STATUS } from "@/lib/constants";
import { logProcessActivity } from "@/utils/engine-server-helpers";
import { getActiveEngagement } from "@/utils/engine-helpers";
import { logJobEvent } from "@/app/actions/event-actions";

import { withActionValidation } from '@/lib/core/actions/wrapper';
import { createActionError, ActionResult } from '@/lib/core/actions/types';
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

type QuoteJob = Database['public']['Tables']['jobs']['Row'];

/**
 * @intent Creates a new quote and logs the activity to the engine.
 * @generated AI-assisted
 */
export async function createQuoteAction(input: unknown): Promise<ActionResult<QuoteJob>> {
    return withActionValidation(createQuoteSchema, input, async (validatedData) => {
        const supabase = await createClient();

        // 1. Auth Check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: createActionError('UNAUTHORIZED', 'Unauthorized access', 401) };
        }

        const { client_id, location_id, title, description, line_items, address, estimated_duration, requires_supplies, expected_supplies, deposit_required, deposit_amount, status } = validatedData;

        // 2. Get Organization ID
        const { data: requestProfile } = await supabase
            .from("user_profiles")
            .select("organization_id")
            .eq("id", user.id)
            .single();

        const profile = requestProfile as { organization_id: string } | null;

        if (!profile?.organization_id) {
            return { success: false, error: createActionError('MISSING_ORG', 'User has no organization', 403) };
        }

        // 3. Create Job (Quote)
        // Snapshot Address Logic: Input > Location > Client Default
        let finalAddress = address;

        if (!finalAddress && location_id) {
            const { data: loc } = await supabase
                .from('client_locations')
                .select('address')
                .eq('id', location_id)
                .single();
            if (loc?.address) finalAddress = loc.address;
        }

        if (!finalAddress && client_id) {
            const { data: client } = await supabase
                .from('clients')
                .select('address')
                .eq('id', client_id)
                .single();
            if (client?.address) finalAddress = client.address;
        }

        // 3. Compute combined expected supplies
        let computedExpectedSupplies = [...(expected_supplies || [])];

        line_items.forEach((item) => {
            if (item.item_type === 'material' && item.provided_by === 'client') {
                if (!computedExpectedSupplies.includes(item.description)) {
                    computedExpectedSupplies.push(item.description);
                }
            }
        });

        const { data, error: jobError } = await supabase
            .from("jobs")
            .insert({
                organization_id: profile.organization_id,
                client_id,
                location_id,
                title,
                description,
                address: finalAddress || null, // Snapshot the resolved address
                estimated_duration,
                requires_supplies: requires_supplies || computedExpectedSupplies.length > 0,
                expected_supplies: computedExpectedSupplies,
                deposit_required,
                deposit_amount,
                status: status || "draft",
                start_date: new Date().toISOString(),
            })
            .select()
            .single();

        const job = data as QuoteJob | null;

        if (jobError || !job) {
            console.error("Job Creation Error:", jobError);
            return { success: false, error: createActionError('DB_INSERT_FAILED', 'Failed to create quote', 500) };
        }

        // 4. Create Line Items
        if (line_items.length > 0 && job?.id) {
            const itemsToInsert = line_items.map((item) => {
                const qty = item.quantity === '' ? 0 : (item.quantity || 0);
                const price = item.unit_price === '' ? 0 : (item.unit_price || 0);

                return {
                    job_id: job.id,
                    description: item.description,
                    quantity: qty,
                    unit_price: price,
                    total: qty * price,
                    item_type: item.item_type,
                    provided_by: item.provided_by
                };
            });

            const { error: itemsError } = await supabase
                .from("quote_line_items")
                .insert(itemsToInsert);

            if (itemsError) {
                console.error("Line Items Error:", itemsError);
                return { success: false, error: createActionError('DB_INSERT_FAILED', 'Quote created but items failed to save', 500) };
            }
        }

        // 5. Engine Integration: Log Activity
        try {
            const engagement = await getActiveEngagement();
            if (engagement) {
                await logProcessActivity(
                    engagement.id,
                    "Draft Proposal",
                    `Created quote: ${job?.title} for ${job?.client_id}`,
                    "completed"
                );
            }
        } catch (e) {
            console.error("Failed to log engine activity", e);
            // Don't block the response for this
        }

        // 6. Log "Quote Created" Event
        await logJobEvent(job.id, "created", {
            created_by: user.id,
            initial_status: "draft"
        });

        revalidatePath("/ops/quotes");
        return { success: true, data: job };
    });
}
