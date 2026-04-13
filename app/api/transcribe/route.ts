import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    if (
      !process.env.GROQ_API_KEY ||
      process.env.GROQ_API_KEY === "your_groq_api_key_here"
    ) {
      return NextResponse.json(
        { error: "AI service not configured." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    // Size check (<25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio file too large (max 25MB)" },
        { status: 400 }
      );
    }

    console.log("[/api/transcribe] File size:", file.size, "bytes, type:", file.type);

    // Call Groq Whisper for transcription
    // Use response_format "json" to get a proper JSON object with .text field
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3-turbo",
      response_format: "json",
      language: "hi",
    });

    console.log("[/api/transcribe] Raw response:", JSON.stringify(transcription));

    // With response_format: "json", Groq returns { text: "..." }
    const text = (transcription as { text: string }).text?.trim() || "";

    console.log("[/api/transcribe] Extracted text:", text);

    return NextResponse.json({ text });
  } catch (error: unknown) {
    console.error("[/api/transcribe] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Transcription failed. Please try again.",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
