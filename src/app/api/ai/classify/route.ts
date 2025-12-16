// ============================================
// AI Classify API Route - FASE 6.0
// POST /api/ai/classify
// ============================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { classifyLead } from '@/lib/ai';
import type { AIProvider } from '@/lib/ai';

interface ClassifyRequest {
  text: string;
  options?: {
    provider?: AIProvider;
    temperature?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClassifyRequest;

    // Validate request
    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: text' },
        { status: 400 }
      );
    }

    if (body.text.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Text exceeds maximum length of 10000 characters' },
        { status: 400 }
      );
    }

    const result = await classifyLead(body.text, body.options);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Failed to classify lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('AI Classify API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
