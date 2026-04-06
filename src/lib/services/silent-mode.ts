import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Check if an organization has silent_mode enabled.
 * When silent, all outbound emails are suppressed — but jobs,
 * classifications, and in-app notifications continue normally.
 */
export async function isSilentMode(organizationId: string): Promise<boolean> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("organizations")
    .select("silent_mode")
    .eq("id", organizationId)
    .single();

  return data?.silent_mode === true;
}
