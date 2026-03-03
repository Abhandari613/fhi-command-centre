import OpenAI from "openai";
import fs from "fs";

// Define the interface for Quote Data based on what we saw in the route
export interface QuoteData {
    jobTitle: string;
    jobDescription: string;
    lineItems: {
        description: string;
        quantity: number;
        unit_price: number;
    }[];
}

export class AIAgent {
    private openai: OpenAI;

    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OpenAI API Key missing");
        }
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async transcribeAudio(filePath: string): Promise<string> {
        const transcription = await this.openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-1",
        });
        return transcription.text;
    }

    async extractQuoteDetails(transcript: string): Promise<QuoteData> {
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert construction estimator. Extract quote details from the transcript.
          Output JSON only with this structure:
          {
            "jobTitle": "string (short summary)",
            "jobDescription": "string (detailed description)",
            "lineItems": [
              {
                "description": "string",
                "quantity": number,
                "unit_price": number
              }
            ]
          }
          If quantity or price is missing, estimate reasonable defaults or use 1 and 0.`,
                },
                {
                    role: "user",
                    content: transcript,
                },
            ],
            response_format: { type: "json_object" },
        });

        return JSON.parse(completion.choices[0].message.content || "{}") as QuoteData;
    }
}
