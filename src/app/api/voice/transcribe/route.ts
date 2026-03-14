import { NextResponse } from "next/server";
import { AIAgent } from "@/lib/clients/fhi/services/ai-agent";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get("file") as Blob | null;

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await audioFile.arrayBuffer());

        // 2. Initialize Agent
        const agent = new AIAgent();

        // 3. Transcribe
        const transcriptText = await agent.transcribeAudio(buffer);
        console.log("Transcript:", transcriptText);

        // 4. Extract Data
        const structuredData = await agent.extractQuoteDetails(transcriptText);

        return NextResponse.json({
            transcript: transcriptText,
            data: structuredData,
        });

    } catch (error: unknown) {
        console.error("Voice Processing Error:", error);
        // Log environment status safely
        console.log("API Key Present:", !!process.env.GEMINI_API_KEY);

        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message, details: String(error) }, { status: 500 });
    }
}
