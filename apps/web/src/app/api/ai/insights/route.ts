// ============================================
// AI Insights API Route - FASE 6.0
// POST /api/ai/insights
// ============================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { generateInsights } from '@/lib/ai';
import type { AIProvider, CRMContext } from '@/lib/ai';

interface InsightsRequest {
  context: CRMContext;
  options?: {
    provider?: AIProvider;
    temperature?: number;
    maxInsights?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InsightsRequest;

    // Validate request
    if (!body.context) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: context' },
        { status: 400 }
      );
    }

    if (!body.context.tenantId || !body.context.userId) {
      return NextResponse.json(
        { success: false, error: 'Context must include tenantId and userId' },
        { status: 400 }
      );
    }

    if (!body.context.entityType || !body.context.entityId) {
      return NextResponse.json(
        { success: false, error: 'Context must include entityType and entityId' },
        { status: 400 }
      );
    }

    const validEntityTypes = ['lead', 'opportunity', 'customer', 'task'];
    if (!validEntityTypes.includes(body.context.entityType)) {
      return NextResponse.json(
        { success: false, error: `Invalid entityType. Must be one of: ${validEntityTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await generateInsights(body.context, body.options);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Failed to generate insights' },
        { status: 500 }
      );
    }

    // Optionally limit insights
    let insights = result.data || [];
    if (body.options?.maxInsights && insights.length > body.options.maxInsights) {
      insights = insights.slice(0, body.options.maxInsights);
    }

    return NextResponse.json({
      success: true,
      data: insights,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('AI Insights API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
