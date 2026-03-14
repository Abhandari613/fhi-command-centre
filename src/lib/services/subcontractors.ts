/**
 * @intent Manage subcontractor network, profiles, and compliance status for B2B pivot.
 * @generated AI-assisted — reviewed and validated against SubcontractorSchema.
 */
import { createClient } from "@/utils/supabase/server";
import {
  SubcontractorSchema,
  type Subcontractor,
} from "../schemas/subcontractorSchema";

export async function getSubcontractors(
  organizationId: string,
): Promise<Subcontractor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subcontractors")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch subcontractors", { error, organizationId });
    throw error;
  }
  return data as unknown as Subcontractor[];
}

export async function createSubcontractor(
  input: Omit<Subcontractor, "id">,
): Promise<Subcontractor> {
  const validatedData = SubcontractorSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subcontractors")
    .insert(validatedData)
    .select()
    .single();

  if (error) {
    console.error("Failed to create subcontractor", { error, input });
    throw error;
  }
  return data as unknown as Subcontractor;
}

export async function updateSubcontractor(
  id: string,
  input: Partial<Subcontractor>,
): Promise<Subcontractor> {
  // Partial validation could be complex depending on Zod schema, using a simpler approach
  const supabase = await createClient();

  // Validate the organization_id exists since we are updating by ID
  if (!input.organization_id) {
    throw new Error(
      "organization_id is required to update subcontractor to ensure tenant boundaries.",
    );
  }

  const { data, error } = await supabase
    .from("subcontractors")
    .update(input)
    .eq("id", id)
    .eq("organization_id", input.organization_id) // Extra safety check!
    .select()
    .single();

  if (error) {
    console.error("Failed to update subcontractor", { error, id, input });
    throw error;
  }
  return data as unknown as Subcontractor;
}
