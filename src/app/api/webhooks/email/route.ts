import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { AIAgent } from "@/lib/clients/fhi/services/ai-agent";

export async function POST(req: Request) {
    try {
        // Parse inbound parse from Resend / SendGrid (multipart/form-data or JSON)
        // Usually, Resend webhooks are JSON payloads. SendGrid is multipart.
        // Let's assume a generic JSON payload for the mock/local testing.
        const body = await req.json();

        // Extract sender and content based on common webhook formats
        const senderEmail = body.from?.address || body.from || body.sender || "";
        const emailContent = body.text || body.html || body.content || "";

        if (!emailContent) {
            return NextResponse.json({ error: "No email content" }, { status: 400 });
        }

        // Initialize Supabase Admin to bypass RLS since this is a public webhook
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase Admin Keys");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // Find Organization ID from Sender
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('organization_id')
            .eq('email', senderEmail)
            .single();

        let orgId = profile?.organization_id;

        // If not found, use a fallback existing organization for beta/testing
        if (!orgId) {
            const { data: fallbackOrg } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .limit(1)
                .single();
            orgId = fallbackOrg?.id;
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization mapped" }, { status: 400 });
        }

        const agent = new AIAgent();
        const extractedData = await agent.parseWorkOrderDraft(emailContent);

        // Insert into drafts bypassing RLS
        const { data: insertData, error: insertError } = await supabaseAdmin
            .from('work_order_drafts')
            .insert({
                organization_id: orgId,
                source: 'email',
                raw_content: emailContent,
                extracted_data: extractedData,
                status: 'needs_review'
            })
            .select()
            .single();

        if (insertError) {
            console.error("Admin Supabase Insert Error", insertError);
            return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
        }

        return NextResponse.json({ success: true, draft: insertData });

    } catch (error: any) {
        console.error("Email Webhook Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
