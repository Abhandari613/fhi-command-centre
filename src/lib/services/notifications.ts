import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function pushNotification(opts: {
  organizationId: string;
  userId?: string;
  type: string;
  title: string;
  body?: string;
  metadata?: Record<string, any>;
}) {
  const supabase = getAdminClient();

  const { error } = await supabase.from("notifications").insert({
    organization_id: opts.organizationId,
    user_id: opts.userId || null,
    type: opts.type,
    title: opts.title,
    body: opts.body || null,
    metadata: opts.metadata || {},
  });

  if (error) {
    console.error("pushNotification failed:", error);
  }
}
