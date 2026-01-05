// ============================================
// AI Score API Route - FASE 6.0
// POST /api/ai/score
// ============================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { scoreLead, scoreLeadsBatch } from '@/lib/ai';
import type { AIProvider, Lead } from '@/lib/ai';

interface ScoreRequest {
  lead?: Lead;
  leads?: Lead[];
  options?: {
    provider?: AIProvider;
    temperature?: number;
    concurrency?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScoreRequest;

    // Batch scoring
    if (body.leads && body.leads.length > 0) {
      if (body.leads.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Maximum 100 leads per batch' },
          { status: 400 }
        );
      }

      const result = await scoreLeadsBatch(body.leads, body.options);

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // Single lead scoring
    if (body.lead) {
      if (!body.lead.id) {
        return NextResponse.json(
          { success: false, error: 'Lead must have an id' },
          { status: 400 }
        );
      }

      const result = await scoreLead(body.lead, body.options);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Failed to score lead' },
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
      { success: false, error: 'Missing required field: lead or leads' },
      { status: 400 }
    );
  } catch (error) {
    console.error('AI Score API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
