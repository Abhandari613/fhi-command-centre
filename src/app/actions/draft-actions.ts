"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function approveWorkOrderDraft(draftId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return { error: "No organization found" };
    }
    const orgId = profile.organization_id;

    const property_address_or_unit = formData.get("property_address_or_unit") as string;
    const trade_type = formData.get("trade_type") as string;
    const description = formData.get("description") as string;
    const client_name = formData.get("client_name") as string; // Optional: could lookup client by name or create one contextually

    if (!property_address_or_unit) {
        return { error: "Property Address is required" };
    }

    // 1. Resolve or Create Client (Simplistic lookup for MVP)
    let clientId = null;
    if (client_name) {
        const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('organization_id', orgId)
            .ilike('name', client_name)
            .limit(1)
            .single();

        if (existingClient) {
            clientId = existingClient.id;
        } else {
            // Create client
            const { data: newClient, error: clientError } = await supabase
                .from('clients')
                .insert({ organization_id: orgId, name: client_name, type: 'Property Manager' })
                .select('id')
                .single();
            if (!clientError && newClient) {
                clientId = newClient.id;
            }
        }
    }

    if (!clientId) {
        // Fallback to a default or first client if not provided, since it's required in schema
        const { data: fallbackClient } = await supabase
            .from('clients')
            .select('id')
            .eq('organization_id', orgId)
            .limit(1)
            .single();
        clientId = fallbackClient?.id || "00000000-0000-0000-0000-000000000000"; // Should handle better in prod
    }

    // 2. Create the real Work Order
    const { data: newWo, error: woError } = await supabase
        .from('work_orders')
        .insert({
            organization_id: orgId,
            client_id: clientId,
            property_address_or_unit,
            status: 'Unassigned',
        })
        .select('id')
        .single();

    if (woError || !newWo) {
        return { error: "Failed to create Work Order: " + (woError?.message || "") };
    }

    // 3. Create the Work Order Task (trade type and description)
    const { error: taskError } = await supabase
        .from('work_order_tasks')
        .insert({
            organization_id: orgId,
            work_order_id: newWo.id,
            trade_type: trade_type || 'General',
            description: description,
            status: 'Pending',
        });

    if (taskError) {
        console.error("Task creation failed", taskError);
    }

    // 4. Update Draft Status
    await supabase
        .from('work_order_drafts')
        .update({ status: 'approved' })
        .eq('id', draftId);

    revalidatePath('/ops/work-orders');
    return { success: true, workOrderId: newWo.id };
}

export async function deleteWorkOrderDraft(draftId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('work_order_drafts').delete().eq('id', draftId);
    if (error) {
        return { error: error.message };
    }
    revalidatePath('/ops/work-orders');
    return { success: true };
}
