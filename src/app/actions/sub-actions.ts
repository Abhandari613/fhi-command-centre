"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export type ActionResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

type Assignment = Database['public']['Tables']['job_assignments']['Row'];

export async function dispatchJobToSub(jobId: string, subcontractorId: string): Promise<ActionResult<{ assignment: Assignment; magicLink: string }>> {
    const supabase = (await createClient()) as unknown as SupabaseClient<Database>;

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    // 2. Generate Token
    const magicLinkToken = uuidv4();

    // 3. Create Assignment
    const { data, error } = await supabase
        .from("job_assignments")
        .insert({
            job_id: jobId,
            subcontractor_id: subcontractorId,
            status: 'dispatched',
            magic_link_token: magicLinkToken,
        })
        .select()
        .single();

    const assignment = data as Assignment | null;

    if (error || !assignment) {
        console.error("Dispatch Error:", error);
        return { success: false, error: "Failed to dispatch job" };
    }

    // 4. Generate magic link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const magicLink = `${baseUrl}/s/${magicLinkToken}`;

    // 5. Send dispatch email via Resend
    const { data: sub } = await supabase
        .from("subcontractors")
        .select("name, email")
        .eq("id", subcontractorId)
        .single();

    const { data: job } = await supabase
        .from("jobs")
        .select("job_number, property_address")
        .eq("id", jobId)
        .single();

    if (sub?.email) {
        try {
            const res = await fetch(`${baseUrl}/api/sub-portal/dispatch-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subName: sub.name,
                    subEmail: sub.email,
                    jobNumber: job?.job_number || jobId.slice(0, 8),
                    address: job?.property_address || "TBD",
                    magicLink,
                }),
            });
            if (!res.ok) {
                console.error("Dispatch email failed:", await res.text());
            }
        } catch (err: any) {
            console.error("Dispatch email error:", err.message);
        }
    }

    revalidatePath("/ops/subs");
    revalidatePath(`/ops/jobs/${jobId}`);
    return { success: true, data: { assignment, magicLink } };
}

// --- CURD Operations for Subcontractors ---

export type Subcontractor = {
    id: string
    organization_id: string
    name: string
    email?: string | null
    phone?: string | null
    address?: string | null
    communication_preference: 'email' | 'sms' | 'phone'
    trade?: string | null
    status: 'active' | 'inactive'
    compliance_status?: string | null
    created_at: string
}

export type CreateSubInput = {
    name: string
    email?: string
    phone?: string
    address?: string
    communication_preference: 'email' | 'sms' | 'phone'
    trade?: string
}

const createSubSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    communication_preference: z.enum(['email', 'sms', 'phone']),
    trade: z.string().optional().or(z.literal(''))
});

export async function getSubcontractors() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // Get Org ID
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

    if (!profile?.organization_id) return []

    const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching subs:', error)
        return []
    }

    return data as Subcontractor[]
}

import { withActionValidation } from '@/lib/core/actions/wrapper';
import { createActionError } from '@/lib/core/actions/types';

/**
 * @intent Creates a new subcontractor under the current user's organization.
 * @generated AI-assisted
 */
export async function createSubcontractor(input: unknown) {
    return withActionValidation(createSubSchema, input, async (validatedData) => {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return {
                success: false,
                error: createActionError('UNAUTHORIZED', 'Unauthorized payload execution', 401)
            };
        }

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return {
                success: false,
                error: createActionError('MISSING_ORG', 'No organization found for the authenticated user', 403)
            };
        }

        const { data, error } = await supabase
            .from('subcontractors')
            .insert({
                organization_id: profile.organization_id,
                name: validatedData.name,
                email: validatedData.email || null,
                phone: validatedData.phone || null,
                address: validatedData.address || null,
                communication_preference: validatedData.communication_preference,
                trade: validatedData.trade || null,
                status: 'active'
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating sub:', error);
            return {
                success: false,
                error: createActionError('DB_INSERT_FAILED', error.message || 'Failed to create subcontractor', 500)
            };
        }

        revalidatePath('/ops/subs');
        return { success: true, data };
    });
}

export async function deleteSubcontractor(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('subcontractors')
        .update({ status: 'inactive', archived_at: new Date().toISOString() })
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/ops/subs')
    return { success: true }
}
