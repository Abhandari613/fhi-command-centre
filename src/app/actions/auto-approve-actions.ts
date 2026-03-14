"use server";

export async function checkAutoApproval(
  jobId: string,
): Promise<{ autoApproved: boolean; reason?: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/jobs/auto-approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    return await res.json();
  } catch (err: any) {
    return { autoApproved: false, reason: err.message };
  }
}
