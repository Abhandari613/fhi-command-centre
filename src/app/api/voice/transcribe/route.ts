import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import os from "os";
import { AIAgent } from "@/lib/clients/fhi/services/ai-agent";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get("file") as Blob | null;

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        // 1. Save Blob to Temp File
        const buffer = Buffer.from(await audioFile.arrayBuffer());
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `${uuidv4()}.webm`);
        fs.writeFileSync(tempFilePath, buffer);

        try {
            // 2. Initialize Agent
            const agent = new AIAgent();

            // 3. Transcribe
            const transcriptText = await agent.transcribeAudio(tempFilePath);
            console.log("Transcript:", transcriptText);

            // 4. Extract Data
            const structuredData = await agent.extractQuoteDetails(transcriptText);

            return NextResponse.json({
                transcript: transcriptText,
                data: structuredData,
            });
        } finally {
            // Cleanup temp file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }

    } catch (error: unknown) {
        console.error("Voice Processing Error:", error);
        // Log environment status safely
        console.log("API Key Present:", !!process.env.OPENAI_API_KEY);
        console.log("Temp Dir:", os.tmpdir());

        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message, details: String(error) }, { status: 500 });
    }
}
