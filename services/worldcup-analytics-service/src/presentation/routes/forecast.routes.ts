import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DemandForecastService } from '../../infrastructure/forecasting/demand-forecast.service';
import { HOST_CITIES } from '../../domain/value-objects/host-city';
import { BusinessCategory } from '../../domain/aggregates/local-business.aggregate';
import { MatchCalendar, MatchStage } from '../../domain/aggregates/match-calendar.aggregate';

// Validation schemas
const generateForecastSchema = z.object({
  businessId: z.string().uuid(),
  hostCityCode: z.string().length(3),
  businessCategory: z.enum([
    'RESTAURANT', 'BAR_PUB', 'HOTEL', 'VACATION_RENTAL', 'TRANSPORTATION',
    'RETAIL', 'TOUR_OPERATOR', 'ENTERTAINMENT', 'FOOD_TRUCK', 'GROCERY',
    'PHARMACY', 'GAS_STATION', 'PARKING', 'OTHER'
  ]),
  distanceToStadiumKm: z.number().min(0).max(100),
  capacity: z.number().min(1).max(10000),
  targetDate: z.string().datetime(),
  granularity: z.enum(['HOURLY', 'DAILY', 'WEEKLY']).default('HOURLY'),
  historicalData: z.object({
    avgDailyVisitors: z.number(),
    avgDailyRevenue: z.number(),
    peakDayMultiplier: z.number()
  }).optional()
});

const dateRangeQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  hostCityCode: z.string().length(3).optional()
});

const businessQuerySchema = z.object({
  businessId: z.string().uuid(),
  days: z.number().min(1).max(30).default(7)
});

/**
 * Forecast Routes
 * API endpoints for demand forecasting
 */
export async function forecastRoutes(fastify: FastifyInstance) {
  const forecastService = new DemandForecastService();

  /**
   * POST /api/v1/worldcup/forecasts
   * Generate a demand forecast for a specific business and date
   */
  fastify.post('/forecasts', {
    schema: {
      description: 'Generate demand forecast for a business',
      tags: ['WorldCup Analytics'],
      body: generateForecastSchema,
      response: {
        200: {
          description: 'Forecast generated successfully',
          type: 'object'
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = generateForecastSchema.parse(request.body);

    // Validate host city
    if (!HOST_CITIES[body.hostCityCode]) {
      return reply.status(400).send({
        error: 'Invalid host city code',
        validCodes: Object.keys(HOST_CITIES)
      });
    }

    // Get matches for the target date (mock data for now)
    const targetDate = new Date(body.targetDate);
    const mockMatches = getMockMatchesForDate(targetDate, body.hostCityCode);

    const forecast = await forecastService.generateForecast({
      businessId: body.businessId,
      hostCityCode: body.hostCityCode,
      businessCategory: body.businessCategory as BusinessCategory,
      distanceToStadiumKm: body.distanceToStadiumKm,
      capacity: body.capacity,
      historicalData: body.historicalData,
      targetDate,
      granularity: body.granularity
    }, mockMatches);

    return reply.send({
      success: true,
      data: forecast.toJSON()
    });
  });

  /**
   * GET /api/v1/worldcup/forecasts/business/:businessId
   * Get forecasts for a business for the next X days
   */
  fastify.get('/forecasts/business/:businessId', {
    schema: {
      description: 'Get demand forecasts for a business',
      tags: ['WorldCup Analytics'],
      params: z.object({
        businessId: z.string().uuid()
      }),
      querystring: z.object({
        days: z.coerce.number().min(1).max(30).default(7),
        hostCityCode: z.string().length(3),
        category: z.string(),
        distanceKm: z.coerce.number().default(5),
        capacity: z.coerce.number().default(100)
      })
    }
  }, async (request: FastifyRequest<{
    Params: { businessId: string };
    Querystring: { days: number; hostCityCode: string; category: string; distanceKm: number; capacity: number }
  }>, reply: FastifyReply) => {
    const { businessId } = request.params;
    const { days, hostCityCode, category, distanceKm, capacity } = request.query;

    const forecasts = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + i);

      const mockMatches = getMockMatchesForDate(targetDate, hostCityCode);

      const forecast = await forecastService.generateForecast({
        businessId,
        hostCityCode,
        businessCategory: category as BusinessCategory,
        distanceToStadiumKm: distanceKm,
        capacity,
        targetDate,
        granularity: 'DAILY'
      }, mockMatches);

      forecasts.push({
        date: targetDate.toISOString().split('T')[0],
        demandIndex: forecast.overallDemandIndex,
        confidence: forecast.overallConfidence,
        matchCount: forecast.matchesImpacting.length,
        criticalAlerts: forecast.getCriticalAlerts().length,
        pricingMultiplier: forecast.pricingRecommendation.recommendedPriceMultiplier,
        additionalStaffNeeded: forecast.staffingRecommendation.additionalStaffNeeded
      });
    }

    return reply.send({
      success: true,
      data: {
        businessId,
        hostCity: HOST_CITIES[hostCityCode],
        forecasts
      }
    });
  });

  /**
   * GET /api/v1/worldcup/matches
   * Get match calendar for a date range
   */
  fastify.get('/matches', {
    schema: {
      description: 'Get World Cup matches for a date range',
      tags: ['WorldCup Analytics'],
      querystring: dateRangeQuerySchema
    }
  }, async (request: FastifyRequest<{
    Querystring: { startDate: string; endDate: string; hostCityCode?: string }
  }>, reply: FastifyReply) => {
    const { startDate, endDate, hostCityCode } = request.query;

    // Generate mock matches (in production, this would come from FIFA API)
    const matches = generateMockMatchCalendar(new Date(startDate), new Date(endDate), hostCityCode);

    return reply.send({
      success: true,
      data: {
        totalMatches: matches.length,
        matches: matches.map(m => m.toJSON())
      }
    });
  });

  /**
   * GET /api/v1/worldcup/cities
   * Get all host cities with their data
   */
  fastify.get('/cities', {
    schema: {
      description: 'Get all World Cup 2026 host cities',
      tags: ['WorldCup Analytics']
    }
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        totalCities: Object.keys(HOST_CITIES).length,
        cities: Object.values(HOST_CITIES)
      }
    });
  });

  /**
   * GET /api/v1/worldcup/cities/:code
   * Get specific host city data
   */
  fastify.get('/cities/:code', {
    schema: {
      description: 'Get specific host city data',
      tags: ['WorldCup Analytics'],
      params: z.object({
        code: z.string().length(3)
      })
    }
  }, async (request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
    const { code } = request.params;
    const city = HOST_CITIES[code.toUpperCase()];

    if (!city) {
      return reply.status(404).send({
        error: 'City not found',
        validCodes: Object.keys(HOST_CITIES)
      });
    }

    return reply.send({
      success: true,
      data: city
    });
  });

  /**
   * GET /api/v1/worldcup/dashboard
   * Get aggregated dashboard data for a host city
   */
  fastify.get('/dashboard', {
    schema: {
      description: 'Get dashboard analytics for a host city',
      tags: ['WorldCup Analytics'],
      querystring: z.object({
        hostCityCode: z.string().length(3),
        days: z.coerce.number().min(1).max(45).default(7)
      })
    }
  }, async (request: FastifyRequest<{
    Querystring: { hostCityCode: string; days: number }
  }>, reply: FastifyReply) => {
    const { hostCityCode, days } = request.query;

    const city = HOST_CITIES[hostCityCode.toUpperCase()];
    if (!city) {
      return reply.status(404).send({ error: 'City not found' });
    }

    // Generate dashboard data
    const today = new Date();
    const demandTrend = [];
    const upcomingMatches = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const matches = getMockMatchesForDate(date, hostCityCode);
      const baseIndex = 100 + (matches.length * 30) + Math.random() * 20;

      demandTrend.push({
        date: date.toISOString().split('T')[0],
        demandIndex: Math.round(baseIndex),
        matchCount: matches.length
      });

      for (const match of matches) {
        upcomingMatches.push({
          id: match.id,
          date: date.toISOString().split('T')[0],
          time: match.scheduledTime,
          teams: `${match.homeTeam?.name || 'TBD'} vs ${match.awayTeam?.name || 'TBD'}`,
          stage: match.stage,
          demandImpact: match.demandImpactLevel
        });
      }
    }

    return reply.send({
      success: true,
      data: {
        city,
        summary: {
          avgDemandIndex: Math.round(demandTrend.reduce((a, b) => a + b.demandIndex, 0) / demandTrend.length),
          totalMatchesInPeriod: upcomingMatches.length,
          peakDemandDate: demandTrend.sort((a, b) => b.demandIndex - a.demandIndex)[0]?.date,
          expectedVisitors: city.expectedVisitors
        },
        demandTrend,
        upcomingMatches: upcomingMatches.slice(0, 10)
      }
    });
  });

  /**
   * POST /api/v1/worldcup/alerts/subscribe
   * Subscribe to demand alerts
   */
  fastify.post('/alerts/subscribe', {
    schema: {
      description: 'Subscribe to demand alerts for a business',
      tags: ['WorldCup Analytics'],
      body: z.object({
        businessId: z.string().uuid(),
        hostCityCode: z.string().length(3),
        alertThreshold: z.number().min(100).max(200).default(130),
        channels: z.array(z.enum(['email', 'sms', 'whatsapp', 'push'])),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional()
      })
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    // In production, this would save to database
    return reply.send({
      success: true,
      data: {
        subscriptionId: `sub_${Date.now()}`,
        businessId: body.businessId,
        alertThreshold: body.alertThreshold,
        channels: body.channels,
        status: 'active',
        createdAt: new Date().toISOString()
      }
    });
  });
}

/**
 * Mock function to generate matches for a date
 * In production, this would fetch from FIFA API or database
 */
function getMockMatchesForDate(date: Date, hostCityCode: string): MatchCalendar[] {
  const matches: MatchCalendar[] = [];

  // Only generate matches during World Cup period (June 11 - July 19, 2026)
  const wcStart = new Date('2026-06-11');
  const wcEnd = new Date('2026-07-19');

  if (date < wcStart || date > wcEnd) {
    return matches;
  }

  // Simulate match probability based on date
  const daysSinceStart = Math.floor((date.getTime() - wcStart.getTime()) / (1000 * 60 * 60 * 24));

  // Group stage: days 0-17 (more matches per day, per city)
  // Knockouts: days 18+ (fewer but bigger matches)
  const isGroupStage = daysSinceStart <= 17;
  const matchProbability = isGroupStage ? 0.6 : 0.3;

  if (Math.random() < matchProbability) {
    const stage: MatchStage = isGroupStage ? 'GROUP_STAGE' :
      daysSinceStart <= 21 ? 'ROUND_OF_32' :
        daysSinceStart <= 25 ? 'ROUND_OF_16' :
          daysSinceStart <= 29 ? 'QUARTER_FINAL' :
            daysSinceStart <= 33 ? 'SEMI_FINAL' : 'FINAL';

    const { level, multiplier } = MatchCalendar.calculateDemandImpact(
      stage,
      { code: 'USA', name: 'United States', continent: 'CONCACAF' },
      { code: 'MEX', name: 'Mexico', continent: 'CONCACAF' },
      hostCityCode
    );

    const match = MatchCalendar.create({
      matchNumber: daysSinceStart + 1,
      hostCityCode,
      stadiumName: HOST_CITIES[hostCityCode]?.stadiumName || 'Stadium',
      stage,
      groupCode: isGroupStage ? 'A' : undefined,
      homeTeam: { code: 'USA', name: 'United States', continent: 'CONCACAF', fifaRanking: 11 },
      awayTeam: { code: 'MEX', name: 'Mexico', continent: 'CONCACAF', fifaRanking: 15 },
      scheduledDate: date,
      scheduledTime: '18:00',
      estimatedEndTime: '20:00',
      status: 'SCHEDULED',
      demandImpactLevel: level,
      estimatedLocalDemandMultiplier: multiplier,
      estimatedTouristInflow: 15000,
      estimatedFanZoneAttendance: 25000
    });

    matches.push(match);
  }

  return matches;
}

/**
 * Generate mock match calendar for a date range
 */
function generateMockMatchCalendar(
  startDate: Date,
  endDate: Date,
  hostCityCode?: string
): MatchCalendar[] {
  const matches: MatchCalendar[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const cities = hostCityCode ? [hostCityCode] : Object.keys(HOST_CITIES);

    for (const cityCode of cities) {
      const dayMatches = getMockMatchesForDate(current, cityCode);
      matches.push(...dayMatches);
    }

    current.setDate(current.getDate() + 1);
  }

  return matches;
}
