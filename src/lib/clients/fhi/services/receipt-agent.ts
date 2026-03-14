import { GoogleGenAI } from "@google/genai";

export interface ReceiptData {
  merchantName: string;
  date: string; // YYYY-MM-DD
  totalAmount: number;
  items: {
    description: string;
    amount: number;
  }[];
  category?: string;
}

export class ReceiptAgent {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key missing");
    }
    this.ai = new GoogleGenAI({
      apiKey: apiKey,
    });
  }

  async extractReceiptData(imageBase64: string): Promise<ReceiptData> {
    const promptText = `You are an expert accountant. Extract data from this receipt image.
          Return ONLY valid JSON with this structure:
          {
            "merchantName": "string",
            "date": "YYYY-MM-DD",
            "totalAmount": number,
            "items": [{ "description": "string", "amount": number }],
            "category": "string (Supplies, Fuel, Meals, Other)"
          }
          IMPORTANT VENDOR NORMALIZATION RULE:
          Normalize the merchantName to its root corporate entity.
          For example:
          - 'THE HOME DEPOT #1234' -> 'The Home Depot'
          - 'SHERWIN WILLIAMS 402' -> 'Sherwin Williams'
          - 'LOWES COMPANIES INC' -> 'Lowe\\'s'
          If date is missing, use today's date.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          promptText,
          {
            inlineData: {
              data: imageBase64,
              mimeType: "image/jpeg",
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      // The content is expected to be clear JSON since we asked for application/json
      const content = response.text || "{}";
      return JSON.parse(content) as ReceiptData;
    } catch (e) {
      console.error("Failed to parse receipt JSON with Gemini", e);
      throw new Error("Failed to parse receipt data");
    }
  }
}
