// ============================================
// AI Enrich API Route - FASE 6.0
// POST /api/ai/enrich
// ============================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { enrichLead } from '@/lib/ai';
import type { AIProvider, Lead } from '@/lib/ai';

interface EnrichRequest {
  lead: Lead;
  options?: {
    provider?: AIProvider;
    temperature?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EnrichRequest;

    // Validate request
    if (!body.lead) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: lead' },
        { status: 400 }
      );
    }

    if (!body.lead.id) {
      return NextResponse.json(
        { success: false, error: 'Lead must have an id' },
        { status: 400 }
      );
    }

    // Check if there's enough data to enrich
    const hasData = body.lead.email || body.lead.company || body.lead.firstName || body.lead.lastName;
    if (!hasData) {
      return NextResponse.json(
        { success: false, error: 'Lead must have at least one of: email, company, firstName, lastName' },
        { status: 400 }
      );
    }

    const result = await enrichLead(body.lead, body.options);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Failed to enrich lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('AI Enrich API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
