import { createClient } from "@/utils/supabase/server";

export async function getActiveEngagement() {
  const supabase = await createClient();

  // For now, just get the most recent engagement
  const { data: engagements } = await supabase
    .from("engagements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (engagements && engagements.length > 0) {
    return engagements[0];
  }

  // If no engagement exists, create a default one for the "Frank Home Improvement" org
  // First get the org
  const { data: orgs } = await supabase
    .from("organizations")
    .select("*")
    .limit(1);

  let orgId;
  if (orgs && orgs.length > 0) {
    orgId = orgs[0].id;
  } else {
    // Create default org
    const { data: newOrg } = await supabase
      .from("organizations")
      .insert({ name: "Frank Home Improvement" })
      .select()
      .single();
    if (newOrg) orgId = newOrg.id;
  }

  if (orgId) {
    const { data: newEngagement } = await supabase
      .from("engagements")
      .insert({
        organization_id: orgId,
        client_name: "Test Client",
        phase: "discovery",
        start_date: new Date().toISOString(),
      })
      .select()
      .single();
    return newEngagement;
  }

  return null;
}
