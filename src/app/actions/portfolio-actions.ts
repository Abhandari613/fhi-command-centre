"use server";

import { createClient } from "@/utils/supabase/server";

export type PortfolioProject = {
  id: string;
  title: string;
  address: string;
  completion_date: string;
  hero_photo: string | null;
  scope_summary: string[];
};

export type PortfolioDetail = {
  id: string;
  title: string;
  address: string;
  completion_date: string;
  before_photos: { id: string; url: string }[];
  after_photos: { id: string; url: string }[];
  gallery_photos: { id: string; url: string; type: string }[];
  scope_items: string[];
};

function sanitizeAddress(address: string | null): string {
  if (!address) return "Project Location";
  // Remove unit/apt numbers for privacy, keep street
  return address
    .replace(/\s*(unit|apt|suite|#)\s*\d+\w*/gi, "")
    .replace(/,\s*$/, "")
    .trim();
}

export async function getCompletedPortfolios(): Promise<PortfolioProject[]> {
  const supabase = (await createClient()) as any;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, property_address, address, updated_at, status")
    .in("status", ["completed", "invoiced", "paid"])
    .order("updated_at", { ascending: false });

  if (!jobs?.length) return [];

  // Get hero photos for each job
  const jobIds = jobs.map((j: any) => j.id);
  const { data: photos } = await supabase
    .from("job_photos")
    .select("job_id, url, type")
    .in("job_id", jobIds)
    .in("type", ["after", "completion", "other"])
    .order("created_at", { ascending: false });

  // Get scope items
  const { data: tasks } = await supabase
    .from("job_tasks")
    .select("job_id, description")
    .in("job_id", jobIds)
    .eq("is_confirmed", true);

  const photoMap = new Map<string, string>();
  for (const p of photos || []) {
    if (!photoMap.has(p.job_id)) {
      photoMap.set(p.job_id, p.url);
    }
  }

  const taskMap = new Map<string, string[]>();
  for (const t of tasks || []) {
    const existing = taskMap.get(t.job_id) || [];
    existing.push(t.description);
    taskMap.set(t.job_id, existing);
  }

  return jobs.map((j: any) => ({
    id: j.id,
    title: j.title || "Home Improvement Project",
    address: sanitizeAddress(j.property_address || j.address),
    completion_date: j.updated_at,
    hero_photo: photoMap.get(j.id) || null,
    scope_summary: (taskMap.get(j.id) || []).slice(0, 4),
  }));
}

export async function getPortfolioData(
  jobId: string,
): Promise<PortfolioDetail | null> {
  const supabase = (await createClient()) as any;

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, property_address, address, updated_at, status")
    .eq("id", jobId)
    .in("status", ["completed", "invoiced", "paid"])
    .single();

  if (!job) return null;

  // Get all photos
  const { data: photos } = await supabase
    .from("job_photos")
    .select("id, url, type")
    .eq("job_id", jobId)
    .order("created_at");

  // Get confirmed tasks (scope)
  const { data: tasks } = await supabase
    .from("job_tasks")
    .select("description")
    .eq("job_id", jobId)
    .eq("is_confirmed", true);

  // If no tasks, try quote line items
  let scopeItems: string[] = (tasks || []).map((t: any) => t.description);
  if (scopeItems.length === 0) {
    const { data: lineItems } = await supabase
      .from("quote_line_items")
      .select("description")
      .eq("job_id", jobId);
    scopeItems = (lineItems || []).map((li: any) => li.description);
  }

  const allPhotos = photos || [];

  return {
    id: job.id,
    title: job.title || "Home Improvement Project",
    address: sanitizeAddress(job.property_address || job.address),
    completion_date: job.updated_at,
    before_photos: allPhotos
      .filter((p: any) => p.type === "before")
      .map((p: any) => ({ id: p.id, url: p.url })),
    after_photos: allPhotos
      .filter((p: any) => p.type === "after")
      .map((p: any) => ({ id: p.id, url: p.url })),
    gallery_photos: allPhotos
      .filter((p: any) => !["before"].includes(p.type))
      .map((p: any) => ({ id: p.id, url: p.url, type: p.type })),
    scope_items: scopeItems,
  };
}
