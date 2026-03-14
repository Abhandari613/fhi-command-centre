"use server";

export async function pollGmail(): Promise<{
  processed: number;
  error?: string;
}> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/gmail/poll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) return { processed: 0, error: data.error };
    return { processed: data.processed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { processed: 0, error: message };
  }
}
