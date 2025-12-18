// ============================================
// AI Predict API Route - FASE 6.0
// POST /api/ai/predict
// ============================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { predictStageChange, predictConversion } from '@/lib/ai';
import type { AIProvider, Lead } from '@/lib/ai';

interface PredictRequest {
  type: 'stage' | 'conversion';
  lead: Lead;
  stageHistory?: Array<{
    stage: string;
    enteredAt: string;
  }>;
  options?: {
    provider?: AIProvider;
    temperature?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PredictRequest;

    // Validate request
    if (!body.type) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: type' },
        { status: 400 }
      );
    }

    if (!body.lead || !body.lead.id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: lead with id' },
        { status: 400 }
      );
    }

    if (body.type === 'stage') {
      const result = await predictStageChange(body.lead, body.stageHistory, body.options);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Failed to predict stage change' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        metadata: result.metadata,
      });
    }

    if (body.type === 'conversion') {
      const result = await predictConversion(body.lead, body.options);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Failed to predict conversion' },
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
      { success: false, error: 'Invalid type. Must be "stage" or "conversion"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('AI Predict API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
