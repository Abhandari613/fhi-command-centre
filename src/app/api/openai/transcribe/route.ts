import { NextResponse } from "next/server";
import { AIAgent } from "@/lib/clients/fhi/services/ai-agent";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const agent = new AIAgent();
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await agent.transcribeAudio(buffer);

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 },
    );
  }
}
