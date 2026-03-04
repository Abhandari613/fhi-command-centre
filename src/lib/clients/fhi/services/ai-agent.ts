import { GoogleGenAI } from "@google/genai";
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
    private ai: GoogleGenAI;

    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Gemini API Key missing (GEMINI_API_KEY)");
        }
        this.ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });
    }

    async transcribeAudio(filePath: string): Promise<string> {
        // Upload the audio file to the Gemini File API
        const uploadedFile = await this.ai.files.upload({
            file: filePath,
            config: { mimeType: "audio/webm" },
        });

        // Prompt Gemini to transcribe
        const response = await this.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                uploadedFile,
                { text: "Transcribe this audio file accurately. Do not add any commentary. Output only the exact words spoken." },
            ],
        });

        return response.text || "";
    }

    async extractQuoteDetails(transcript: string): Promise<QuoteData> {
        const prompt = `You are an expert construction estimator. Extract quote details from the transcript.
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
If quantity or price is missing, estimate reasonable defaults or use 1 and 0.

Transcript:
${transcript}`;

        const response = await this.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });

        return JSON.parse(response.text || "{}") as QuoteData;
    }

    async parseWorkOrderDraft(transcript: string): Promise<WorkOrderDraftData> {
        const prompt = `You are an expert dispatcher for a construction company. Extract work order details from the provided message.
Output JSON only with this exact structure:
{
  "client_name": "string | null (if mentioned)",
  "property_address_or_unit": "string | null (if mentioned)",
  "trade_type": "string | null (e.g., Plumbing, Electrical, General, etc.)",
  "description": "string (the core request or problem)",
  "needs_clarification": boolean,
  "missing_details": ["string"]
}
If client_name, property_address_or_unit, or trade_type are missing or you are not highly confident, set needs_clarification to true and list them in missing_details.

Message:
${transcript}`;

        const response = await this.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });

        return JSON.parse(response.text || "{}") as WorkOrderDraftData;
    }
}
