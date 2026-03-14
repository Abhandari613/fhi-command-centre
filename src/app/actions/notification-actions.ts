"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export async function getUnreadNotifications(): Promise<Notification[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }

  return (data || []) as Notification[];
}

export async function getRecentNotifications(): Promise<Notification[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return (data || []) as Notification[];
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();

  await (supabase as any)
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);

  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return;

  await (supabase as any)
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("organization_id", profile.organization_id)
    .eq("is_read", false);

  revalidatePath("/dashboard");
}

// Helper: create a notification from server-side code
export async function createNotification(opts: {
  organizationId: string;
  userId?: string;
  type: string;
  title: string;
  body?: string;
  metadata?: Record<string, any>;
}) {
  const supabase = await createClient();

  const { error } = await (supabase as any).from("notifications").insert({
    organization_id: opts.organizationId,
    user_id: opts.userId || null,
    type: opts.type,
    title: opts.title,
    body: opts.body || null,
    metadata: opts.metadata || {},
  });

  if (error) {
    console.error("Failed to create notification:", error);
  }

  revalidatePath("/dashboard");
}
