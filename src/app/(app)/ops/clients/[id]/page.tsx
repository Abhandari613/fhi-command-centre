import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { ClientProfileView } from "./ClientProfileView";

interface ClientProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProfilePage({
  params,
}: ClientProfilePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch Client Details
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (clientError || !client) {
    notFound();
  }

  // Fetch Client Jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen pb-24 p-6">
      <ClientProfileView client={client} jobs={jobs || []} />
    </div>
  );
}
