import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface ShadowOutboundOpts {
  organizationId: string;
  sourceRoute: string;
  emailType: string;
  to: string;
  cc?: string;
  subject: string;
  bodyHtml?: string;
  attachmentsMeta?: Array<{
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  relatedJobId?: string;
  relatedJobNumber?: string;
  metadata?: Record<string, unknown>;
}

const MAX_BODY_LENGTH = 100_000; // 100KB cap

/**
 * Log an outbound email that was suppressed by silent mode.
 * Best-effort — failures are caught so the calling route is never affected.
 */
export async function logShadowOutbound(
  opts: ShadowOutboundOpts,
): Promise<void> {
  try {
    const supabase = getAdminClient();
    await supabase.from("shadow_outbound_log").insert({
      organization_id: opts.organizationId,
      source_route: opts.sourceRoute,
      email_type: opts.emailType,
      to_address: opts.to,
      cc_address: opts.cc || null,
      subject: opts.subject,
      body_html: opts.bodyHtml
        ? opts.bodyHtml.slice(0, MAX_BODY_LENGTH)
        : null,
      attachments_meta: opts.attachmentsMeta || [],
      related_job_id: opts.relatedJobId || null,
      related_job_number: opts.relatedJobNumber || null,
      metadata: opts.metadata || {},
    });
  } catch (err) {
    console.error("[shadow-log] Failed to log suppressed email:", err);
  }
}
