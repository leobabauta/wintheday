import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/api-auth';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    requireAuth(request);

    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    return handleAuthError(error);
  }
}
