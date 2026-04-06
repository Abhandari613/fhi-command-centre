import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface ChequeLineItem {
  date: string;
  type: string;
  reference: string;
  originalAmount: number;
  balanceDue: number;
  discount: number;
  paymentAmount: number;
}

export interface ChequeOCRResult {
  payer: string;
  payee: string;
  chequeNumber: string;
  chequeDate: string;
  totalAmount: number;
  bank: string;
  lineItems: ChequeLineItem[];
}

const CHEQUE_OCR_PROMPT = `You are an expert accountant analyzing a cheque payment stub from a property management / trades company.

Extract ALL data from this cheque stub image. The stub typically has:
- A payer company name at the top (who wrote the cheque)
- A payee name (who it's made out to)
- A cheque number (usually top right)
- A cheque date
- A table of line items, each with: Date, Type (Bill/Credit), Reference number, Original Amount, Balance Due, Discount, Payment amount
- A total cheque amount at the bottom

Return ONLY valid JSON:
{
  "payer": "string (company name that issued the cheque)",
  "payee": "string (person/company receiving payment)",
  "chequeNumber": "string",
  "chequeDate": "YYYY-MM-DD",
  "totalAmount": number,
  "bank": "string (bank name if visible, otherwise null)",
  "lineItems": [
    {
      "date": "YYYY-MM-DD",
      "type": "Bill or Credit",
      "reference": "string (the invoice/bill reference number)",
      "originalAmount": number,
      "balanceDue": number,
      "discount": number,
      "paymentAmount": number
    }
  ]
}

IMPORTANT:
- Extract EVERY line item, do not skip any
- Reference numbers are critical — these map to invoice numbers
- If discount is empty or zero, use 0
- Amounts should be numbers, not strings (no $ signs)`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, orgId } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Missing imageBase64" },
        { status: 400 },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Missing orgId" },
        { status: 400 },
      );
    }

    // 1. OCR the cheque stub with Gemini
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        CHEQUE_OCR_PROMPT,
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const content = response.text || "{}";
    const ocrResult: ChequeOCRResult = JSON.parse(content);

    // 2. Store the cheque record
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: cheque, error: chequeError } = await supabase
      .from("cheque_records")
      .insert({
        organization_id: orgId,
        cheque_number: ocrResult.chequeNumber,
        cheque_date: ocrResult.chequeDate,
        payer: ocrResult.payer,
        total_amount: ocrResult.totalAmount,
        ocr_raw: ocrResult,
        status: "scanned",
      })
      .select("id")
      .single();

    if (chequeError) {
      console.error("Failed to save cheque record:", chequeError);
      return NextResponse.json(
        { error: "Failed to save cheque record" },
        { status: 500 },
      );
    }

    // 3. Insert line items
    const lineItemRows = ocrResult.lineItems.map((item) => ({
      cheque_id: cheque.id,
      reference_number: item.reference,
      bill_date: item.date,
      original_amount: item.originalAmount,
      discount: item.discount,
      payment_amount: item.paymentAmount,
      match_status: "pending",
    }));

    if (lineItemRows.length > 0) {
      const { error: lineError } = await supabase
        .from("cheque_line_items")
        .insert(lineItemRows);

      if (lineError) {
        console.error("Failed to save cheque line items:", lineError);
      }
    }

    return NextResponse.json({
      success: true,
      chequeId: cheque.id,
      ocr: ocrResult,
      lineItemCount: ocrResult.lineItems.length,
    });
  } catch (error: any) {
    console.error("Cheque scan error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to scan cheque" },
      { status: 500 },
    );
  }
}
