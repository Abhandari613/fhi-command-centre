"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function approveWorkOrderDraft(
  draftId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return { error: "No organization found" };
  }
  const orgId = profile.organization_id;

  const property_address_or_unit = formData.get(
    "property_address_or_unit",
  ) as string;
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
      .from("clients")
      .select("id")
      .eq("organization_id", orgId)
      .ilike("name", client_name)
      .limit(1)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      // Create client
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          organization_id: orgId,
          name: client_name,
          type: "Property Manager",
        })
        .select("id")
        .single();
      if (!clientError && newClient) {
        clientId = newClient.id;
      }
    }
  }

  if (!clientId) {
    // Fallback to a default or first client if not provided, since it's required in schema
    const { data: fallbackClient } = await supabase
      .from("clients")
      .select("id")
      .eq("organization_id", orgId)
      .limit(1)
      .single();
    clientId = fallbackClient?.id || "00000000-0000-0000-0000-000000000000"; // Should handle better in prod
  }

  // 2. Fetch the original draft for raw email content
  const { data: draft } = await supabase
    .from("work_order_drafts")
    .select("raw_content, source")
    .eq("id", draftId)
    .single();

  const rawContent = draft?.raw_content || "";

  // Detect urgency from content
  const RUSH_KEYWORDS = [
    "rush",
    "asap",
    "urgent",
    "emergency",
    "immediately",
    "right away",
  ];
  const textLower =
    `${property_address_or_unit} ${description} ${rawContent}`.toLowerCase();
  const urgency = RUSH_KEYWORDS.some((kw) => textLower.includes(kw))
    ? "rush"
    : "standard";

  // 3. Create a job record (the dashboard source of truth)
  const { data: newJob, error: jobError } = await supabase
    .from("jobs")
    .insert({
      organization_id: orgId,
      client_id: clientId,
      title: `${trade_type || "General"} — ${property_address_or_unit}`,
      description: description,
      status: "incoming",
      urgency,
      property_address: property_address_or_unit,
      address: property_address_or_unit,
      requester_name: client_name || null,
      source_email_subject: rawContent.split("\n")[0] || null,
      source_email_body: rawContent,
    } as any)
    .select("id, job_number")
    .single();

  if (jobError || !newJob) {
    return { error: "Failed to create Job: " + (jobError?.message || "") };
  }

  // 4. Create a job_task line item from the scope
  if (description) {
    await supabase.from("job_tasks").insert({
      job_id: newJob.id,
      description: `${trade_type || "General"}: ${description}`,
      quantity: 1,
      unit_price: 0,
      is_confirmed: false,
    } as any);
  }

  // 5. Also create legacy work_order if that table exists (keeps old UI working)
  const { data: newWo } = await (supabase.from as any)("work_orders")
    .insert({
      organization_id: orgId,
      client_id: clientId,
      property_address_or_unit,
      status: "Unassigned",
    })
    .select("id")
    .single();

  if (newWo) {
    await (supabase.from as any)("work_order_tasks").insert({
      organization_id: orgId,
      work_order_id: newWo.id,
      trade_type: trade_type || "General",
      description: description,
      status: "Pending",
    });
  }

  // 6. Update Draft Status
  await supabase
    .from("work_order_drafts")
    .update({ status: "approved" })
    .eq("id", draftId);

  revalidatePath("/ops/work-orders");
  revalidatePath("/dashboard");
  return {
    success: true,
    workOrderId: newWo?.id,
    jobId: newJob.id,
    jobNumber: (newJob as any).job_number,
  };
}

export async function deleteWorkOrderDraft(draftId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("work_order_drafts")
    .delete()
    .eq("id", draftId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/ops/work-orders");
  return { success: true };
}
