"use server";

export async function checkStaleQuotes(): Promise<{
  processed: number;
  error?: string;
}> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/jobs/stale-quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) return { processed: 0, error: data.error };
    return { processed: data.processed };
  } catch (err: any) {
    return { processed: 0, error: err.message };
  }
}
