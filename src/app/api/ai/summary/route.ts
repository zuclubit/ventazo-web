// ============================================
// AI Summary API Route - FASE 6.0
// POST /api/ai/summary
// ============================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { generateLeadSummary, generateNoteSummary } from '@/lib/ai';
import type { AIProvider } from '@/lib/ai';

interface SummaryRequest {
  type: 'lead' | 'notes';
  leadId?: string;
  text?: string;
  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author?: string;
  }>;
  options?: {
    provider?: AIProvider;
    temperature?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SummaryRequest;

    // Validate request
    if (!body.type) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: type' },
        { status: 400 }
      );
    }

    if (body.type === 'lead') {
      if (!body.text || !body.leadId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: text, leadId' },
          { status: 400 }
        );
      }

      const result = await generateLeadSummary(body.text, body.leadId, body.options);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Failed to generate summary' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        metadata: result.metadata,
      });
    }

    if (body.type === 'notes') {
      if (!body.notes || body.notes.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: notes' },
          { status: 400 }
        );
      }

      const result = await generateNoteSummary(body.notes, body.options);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Failed to generate summary' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        metadata: result.metadata,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid type. Must be "lead" or "notes"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('AI Summary API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
