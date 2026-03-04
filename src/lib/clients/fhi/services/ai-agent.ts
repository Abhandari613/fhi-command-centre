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

export interface WorkOrderDraftData {
    client_name: string | null;
    property_address_or_unit: string | null;
    trade_type: string | null;
    description: string;
    needs_clarification: boolean;
    missing_details: string[];
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

    async parseWorkOrderDraft(transcript: string): Promise<WorkOrderDraftData> {
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert dispatcher for a construction company. Extract work order details from the provided message.
          Output JSON only with this structure:
          {
            "client_name": "string | null (if mentioned)",
            "property_address_or_unit": "string | null (if mentioned)",
            "trade_type": "string | null (e.g., Plumbing, Electrical, General, etc.)",
            "description": "string (the core request or problem)",
            "needs_clarification": boolean,
            "missing_details": ["string"]
          }
          If client_name, property_address_or_unit, or trade_type are missing or you are not highly confident, set needs_clarification to true and list them in missing_details.`,
                },
                {
                    role: "user",
                    content: transcript,
                },
            ],
            response_format: { type: "json_object" },
        });

        return JSON.parse(completion.choices[0].message.content || "{}") as WorkOrderDraftData;
    }
}
