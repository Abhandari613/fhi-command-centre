import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { AIAgent } from "@/lib/clients/fhi/services/ai-agent";

// Detect if email references an existing job number (e.g. FHI-2026-001)
const JOB_NUMBER_PATTERN = /FHI-\d{4}-\d{3}/i;
const ADD_TO_EXISTING_KEYWORDS = /\b(add to|existing|also need|in addition|additional|append|update)\b/i;

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const senderEmail = body.from?.address || body.from || body.sender || "";
        const emailSubject = body.subject || "";
        const emailContent = body.text || body.html || body.content || "";

        if (!emailContent && !emailSubject) {
            return NextResponse.json({ error: "No email content" }, { status: 400 });
        }

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

        const fullText = `${emailSubject}\n\n${emailContent}`;

        // Check if this references an existing job
        const jobNumberMatch = fullText.match(JOB_NUMBER_PATTERN);
        const hasAddKeywords = ADD_TO_EXISTING_KEYWORDS.test(fullText);

        if (jobNumberMatch && hasAddKeywords) {
            // Attempt to find the existing job
            const jobNumber = jobNumberMatch[0].toUpperCase();
            const { data: existingJob } = await supabaseAdmin
                .from('jobs')
                .select('id')
                .eq('job_number', jobNumber)
                .single();

            if (existingJob) {
                // Store the email content as an attachment on the existing job
                await supabaseAdmin.from('job_attachments').insert({
                    job_id: existingJob.id,
                    file_url: '',
                    file_type: 'email',
                });

                // Log event
                await supabaseAdmin.from('job_events').insert({
                    job_id: existingJob.id,
                    event_type: 'photo_addition_email',
                    metadata: {
                        sender: senderEmail,
                        subject: emailSubject,
                        content_preview: emailContent.slice(0, 500),
                    },
                });

                return NextResponse.json({
                    success: true,
                    action: 'added_to_existing',
                    jobId: existingJob.id,
                    jobNumber,
                });
            }
        }

        // Default: create a new work order draft
        const agent = new AIAgent();
        const extractedData = await agent.parseWorkOrderDraft(fullText);

        const { data: insertData, error: insertError } = await supabaseAdmin
            .from('work_order_drafts')
            .insert({
                organization_id: orgId,
                source: 'email',
                raw_content: fullText,
                extracted_data: extractedData,
                status: 'needs_review'
            })
            .select()
            .single();

        if (insertError) {
            console.error("Admin Supabase Insert Error", insertError);
            return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
        }

        return NextResponse.json({ success: true, action: 'new_draft', draft: insertData });

    } catch (error: any) {
        console.error("Email Webhook Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
