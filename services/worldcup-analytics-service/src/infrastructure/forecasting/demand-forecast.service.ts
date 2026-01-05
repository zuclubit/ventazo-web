import { injectable } from 'tsyringe';
import {
  DemandForecast,
  ForecastGenerationParams,
  ForecastDataPoint,
  DemandDrivers,
  PricingRecommendation,
  StaffingRecommendation,
  InventoryRecommendation,
  MarketingRecommendation,
  ForecastAlert,
  ConfidenceLevel,
  AlertType,
  AlertSeverity
} from '../../domain/aggregates/demand-forecast.aggregate';
import { MatchCalendar, DemandImpactLevel } from '../../domain/aggregates/match-calendar.aggregate';
import { BusinessCategory } from '../../domain/aggregates/local-business.aggregate';
import { HOST_CITIES } from '../../domain/value-objects/host-city';

/**
 * Demand Forecast Service
 * Core ML-powered service for generating demand predictions
 */
@injectable()
export class DemandForecastService {

  /**
   * Generate demand forecast for a business on a specific date
   */
  async generateForecast(
    params: ForecastGenerationParams,
    matchesOnDate: MatchCalendar[]
  ): Promise<DemandForecast> {
    // Calculate base demand drivers
    const drivers = this.calculateDemandDrivers(params, matchesOnDate);

    // Generate hourly data points
    const dataPoints = this.generateDataPoints(params, drivers, matchesOnDate);

    // Calculate overall demand index
    const overallDemandIndex = this.calculateOverallDemandIndex(dataPoints);

    // Determine confidence level
    const confidence = this.determineConfidence(params, matchesOnDate);

    // Generate recommendations
    const pricingRec = this.generatePricingRecommendation(overallDemandIndex, params.businessCategory);
    const staffingRec = this.generateStaffingRecommendation(overallDemandIndex, params.capacity, dataPoints);
    const inventoryRecs = this.generateInventoryRecommendations(overallDemandIndex, params.businessCategory);
    const marketingRec = this.generateMarketingRecommendation(params, matchesOnDate);

    // Generate alerts
    const alerts = this.generateAlerts(overallDemandIndex, matchesOnDate, params);

    return DemandForecast.create({
      businessId: params.businessId,
      businessCategory: params.businessCategory,
      hostCityCode: params.hostCityCode,
      forecastDate: params.targetDate,
      granularity: params.granularity,
      dataPoints,
      overallDemandIndex,
      overallConfidence: confidence,
      matchesImpacting: matchesOnDate.map(m => m.id),
      pricingRecommendation: pricingRec,
      staffingRecommendation: staffingRec,
      inventoryRecommendations: inventoryRecs,
      marketingRecommendation: marketingRec,
      alerts,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours validity
    });
  }

  /**
   * Calculate demand drivers based on various factors
   */
  private calculateDemandDrivers(
    params: ForecastGenerationParams,
    matches: MatchCalendar[]
  ): DemandDrivers {
    // Match impact (0-100)
    let matchImpact = 0;
    for (const match of matches) {
      const baseImpact = this.getImpactScore(match.demandImpactLevel);
      // Distance decay: closer to stadium = higher impact
      const distanceFactor = Math.max(0, 1 - (params.distanceToStadiumKm / 20));
      matchImpact += baseImpact * distanceFactor;
    }
    matchImpact = Math.min(100, matchImpact);

    // Day of week impact (-10 to +10)
    const dayOfWeek = params.targetDate.getDay();
    const dayImpacts: Record<number, number> = {
      0: 5,  // Sunday - high for restaurants/bars
      1: -5, // Monday
      2: -3, // Tuesday
      3: 0,  // Wednesday
      4: 3,  // Thursday
      5: 8,  // Friday
      6: 10  // Saturday - highest
    };
    const dayOfWeekImpact = dayImpacts[dayOfWeek] || 0;

    // Seasonality (summer = peak for World Cup)
    const month = params.targetDate.getMonth();
    const seasonalityImpact = month === 5 || month === 6 ? 10 : 0; // June-July

    // Weather impact (simulated - would integrate with weather API)
    const weatherImpact = Math.floor(Math.random() * 10) - 5;

    // Historical baseline
    const historicalBaselineDemand = params.historicalData?.avgDailyVisitors || 100;

    return {
      matchImpact,
      weatherImpact,
      dayOfWeekImpact,
      seasonalityImpact,
      specialEventImpact: 0,
      historicalBaselineDemand
    };
  }

  /**
   * Generate hourly data points for the forecast
   */
  private generateDataPoints(
    params: ForecastGenerationParams,
    drivers: DemandDrivers,
    matches: MatchCalendar[]
  ): ForecastDataPoint[] {
    const dataPoints: ForecastDataPoint[] = [];
    const baseDate = new Date(params.targetDate);
    baseDate.setHours(0, 0, 0, 0);

    // Typical business hours patterns by category
    const hourlyPatterns = this.getHourlyPatternByCategory(params.businessCategory);

    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(baseDate);
      timestamp.setHours(hour);

      // Base pattern from business type
      let demandIndex = hourlyPatterns[hour] || 50;

      // Apply match impact with time decay
      for (const match of matches) {
        const matchHour = parseInt(match.scheduledTime.split(':')[0]);
        const hourDiff = Math.abs(hour - matchHour);

        // Peak impact at match time, decays before/after
        if (hourDiff <= 4) {
          const impactMultiplier = 1 - (hourDiff / 5);
          demandIndex += drivers.matchImpact * impactMultiplier;
        }
      }

      // Apply other drivers
      demandIndex += drivers.dayOfWeekImpact;
      demandIndex += drivers.seasonalityImpact;
      demandIndex += drivers.weatherImpact;

      // Calculate visitor count
      const visitorMultiplier = demandIndex / 100;
      const predictedVisitors = Math.round(
        drivers.historicalBaselineDemand * visitorMultiplier * (params.capacity / 100)
      );

      // Confidence interval (wider for higher demand = more uncertainty)
      const uncertainty = demandIndex > 150 ? 0.3 : demandIndex > 120 ? 0.2 : 0.15;

      dataPoints.push({
        timestamp,
        predictedDemandIndex: Math.round(demandIndex),
        predictedVisitorCount: predictedVisitors,
        confidenceInterval: {
          lower: Math.round(demandIndex * (1 - uncertainty)),
          upper: Math.round(demandIndex * (1 + uncertainty))
        },
        drivers: { ...drivers }
      });
    }

    return dataPoints;
  }

  /**
   * Get hourly demand pattern by business category
   */
  private getHourlyPatternByCategory(category: BusinessCategory): number[] {
    const patterns: Record<BusinessCategory, number[]> = {
      'RESTAURANT': [
        5, 5, 5, 5, 5, 10, 20, 40, 50, 40, 50, 80,  // 0-11
        100, 90, 70, 50, 40, 50, 80, 100, 90, 70, 50, 20  // 12-23
      ],
      'BAR_PUB': [
        10, 5, 5, 5, 5, 5, 5, 10, 20, 30, 40, 50,  // 0-11
        60, 70, 80, 90, 100, 100, 100, 100, 100, 90, 70, 40  // 12-23
      ],
      'HOTEL': [
        30, 30, 30, 30, 30, 40, 50, 60, 70, 80, 90, 100,  // 0-11
        100, 100, 100, 100, 100, 100, 100, 100, 90, 70, 50, 40  // 12-23
      ],
      'VACATION_RENTAL': [
        50, 50, 50, 50, 50, 50, 60, 70, 80, 90, 100, 100,  // 0-11
        100, 100, 100, 100, 100, 100, 100, 100, 90, 80, 70, 60  // 12-23
      ],
      'TRANSPORTATION': [
        20, 10, 10, 10, 20, 40, 70, 90, 100, 80, 70, 80,  // 0-11
        90, 80, 70, 80, 90, 100, 100, 90, 80, 60, 40, 30  // 12-23
      ],
      'RETAIL': [
        5, 5, 5, 5, 5, 5, 10, 20, 40, 60, 80, 100,  // 0-11
        100, 100, 90, 80, 70, 80, 90, 70, 50, 30, 20, 10  // 12-23
      ],
      'TOUR_OPERATOR': [
        5, 5, 5, 5, 5, 10, 30, 60, 90, 100, 100, 90,  // 0-11
        80, 90, 100, 90, 80, 70, 50, 30, 20, 10, 5, 5  // 12-23
      ],
      'ENTERTAINMENT': [
        10, 5, 5, 5, 5, 5, 10, 20, 30, 40, 50, 60,  // 0-11
        70, 80, 90, 100, 100, 100, 100, 100, 90, 70, 40, 20  // 12-23
      ],
      'FOOD_TRUCK': [
        5, 5, 5, 5, 5, 10, 20, 40, 60, 50, 60, 90,  // 0-11
        100, 80, 60, 50, 60, 80, 100, 100, 80, 50, 30, 10  // 12-23
      ],
      'GROCERY': [
        5, 5, 5, 5, 10, 20, 40, 60, 80, 100, 90, 80,  // 0-11
        80, 90, 80, 70, 80, 90, 80, 60, 40, 30, 20, 10  // 12-23
      ],
      'PHARMACY': [
        10, 10, 10, 10, 10, 20, 40, 60, 80, 100, 90, 80,  // 0-11
        80, 80, 70, 70, 80, 80, 70, 50, 40, 30, 20, 15  // 12-23
      ],
      'GAS_STATION': [
        20, 15, 15, 15, 20, 40, 60, 80, 100, 90, 80, 80,  // 0-11
        80, 80, 80, 80, 90, 100, 90, 70, 50, 40, 30, 25  // 12-23
      ],
      'PARKING': [
        30, 20, 20, 20, 20, 30, 50, 80, 100, 100, 100, 100,  // 0-11
        100, 100, 100, 100, 100, 100, 90, 70, 50, 40, 35, 30  // 12-23
      ],
      'OTHER': [
        30, 30, 30, 30, 30, 40, 50, 60, 70, 80, 90, 100,  // 0-11
        100, 100, 90, 80, 80, 90, 80, 70, 60, 50, 40, 35  // 12-23
      ]
    };

    return patterns[category] || patterns['OTHER'];
  }

  /**
   * Calculate overall demand index from data points
   */
  private calculateOverallDemandIndex(dataPoints: ForecastDataPoint[]): number {
    const businessHours = dataPoints.filter((_, i) => i >= 8 && i <= 22);
    const sum = businessHours.reduce((acc, dp) => acc + dp.predictedDemandIndex, 0);
    return Math.round(sum / businessHours.length);
  }

  /**
   * Determine confidence level based on data quality
   */
  private determineConfidence(
    params: ForecastGenerationParams,
    matches: MatchCalendar[]
  ): ConfidenceLevel {
    let score = 50; // Base score

    // Historical data increases confidence
    if (params.historicalData) {
      score += 20;
    }

    // Known matches increase confidence
    if (matches.length > 0 && matches.every(m => m.homeTeam && m.awayTeam)) {
      score += 20;
    }

    // Distance to stadium - closer is more predictable
    if (params.distanceToStadiumKm <= 5) {
      score += 10;
    }

    if (score >= 80) return 'VERY_HIGH';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate pricing recommendation
   */
  private generatePricingRecommendation(
    demandIndex: number,
    category: BusinessCategory
  ): PricingRecommendation {
    // Categories with elastic pricing
    const elasticCategories: BusinessCategory[] = [
      'RESTAURANT', 'BAR_PUB', 'HOTEL', 'VACATION_RENTAL', 'TRANSPORTATION', 'PARKING'
    ];

    const isElastic = elasticCategories.includes(category);
    const maxIncrease = isElastic ? 0.5 : 0.2; // 50% or 20% max

    let multiplier = 1.0;
    if (demandIndex > 180) {
      multiplier = 1 + maxIncrease;
    } else if (demandIndex > 150) {
      multiplier = 1 + (maxIncrease * 0.8);
    } else if (demandIndex > 130) {
      multiplier = 1 + (maxIncrease * 0.5);
    } else if (demandIndex > 110) {
      multiplier = 1 + (maxIncrease * 0.25);
    }

    const strategy = demandIndex > 150
      ? 'High demand expected. Consider premium pricing for peak hours.'
      : demandIndex > 120
        ? 'Moderate demand increase. Slight price adjustment recommended.'
        : 'Normal pricing recommended. Focus on volume.';

    return {
      recommendedPriceMultiplier: Math.round(multiplier * 100) / 100,
      minRecommendedMultiplier: Math.round((multiplier - 0.1) * 100) / 100,
      maxRecommendedMultiplier: Math.round((multiplier + 0.1) * 100) / 100,
      strategyNotes: strategy
    };
  }

  /**
   * Generate staffing recommendation
   */
  private generateStaffingRecommendation(
    demandIndex: number,
    capacity: number,
    dataPoints: ForecastDataPoint[]
  ): StaffingRecommendation {
    // Estimate normal staff based on capacity
    const normalStaff = Math.ceil(capacity / 20); // 1 staff per 20 capacity

    // Additional staff based on demand
    const additionalMultiplier = (demandIndex - 100) / 100;
    const additionalStaff = Math.max(0, Math.ceil(normalStaff * additionalMultiplier));

    // Find peak hours
    const peakHours: string[] = [];
    for (let i = 0; i < dataPoints.length; i++) {
      if (dataPoints[i].predictedDemandIndex > demandIndex * 1.2) {
        const hour = dataPoints[i].timestamp.getHours();
        const endHour = (hour + 1) % 24;
        peakHours.push(`${hour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`);
      }
    }

    // Skills needed based on demand level
    const skills: string[] = [];
    if (demandIndex > 130) {
      skills.push('high-volume service');
    }
    skills.push('bilingual (EN/ES)');
    if (demandIndex > 150) {
      skills.push('crowd management');
    }

    return {
      recommendedStaffCount: normalStaff + additionalStaff,
      normalStaffCount: normalStaff,
      additionalStaffNeeded: additionalStaff,
      peakHours: [...new Set(peakHours)],
      skillsNeeded: skills
    };
  }

  /**
   * Generate inventory recommendations
   */
  private generateInventoryRecommendations(
    demandIndex: number,
    category: BusinessCategory
  ): InventoryRecommendation[] {
    const recommendations: InventoryRecommendation[] = [];
    const multiplier = Math.max(1, demandIndex / 100);

    if (category === 'RESTAURANT' || category === 'BAR_PUB' || category === 'FOOD_TRUCK') {
      recommendations.push({
        category: 'Beverages',
        recommendedStockMultiplier: Math.round(multiplier * 1.5 * 10) / 10,
        criticalItems: ['Beer', 'Soft drinks', 'Water', 'Ice'],
        notes: 'High demand expected for beverages during matches'
      });
      recommendations.push({
        category: 'Food Items',
        recommendedStockMultiplier: Math.round(multiplier * 1.3 * 10) / 10,
        criticalItems: ['Popular menu items', 'Quick-serve items', 'Snacks'],
        notes: 'Focus on items that can be served quickly'
      });
    }

    if (category === 'RETAIL') {
      recommendations.push({
        category: 'Fan Merchandise',
        recommendedStockMultiplier: Math.round(multiplier * 2 * 10) / 10,
        criticalItems: ['Team colors', 'Flags', 'Face paint', 'Souvenirs'],
        notes: 'Stock items in participating team colors'
      });
    }

    if (category === 'PHARMACY' || category === 'GROCERY') {
      recommendations.push({
        category: 'Essentials',
        recommendedStockMultiplier: Math.round(multiplier * 1.2 * 10) / 10,
        criticalItems: ['Sunscreen', 'Pain relievers', 'Hydration products', 'Batteries'],
        notes: 'Tourists often need these items'
      });
    }

    return recommendations;
  }

  /**
   * Generate marketing recommendation
   */
  private generateMarketingRecommendation(
    params: ForecastGenerationParams,
    matches: MatchCalendar[]
  ): MarketingRecommendation {
    const campaigns: string[] = [];
    const channels: string[] = ['Google Business', 'Instagram'];
    const languages: string[] = ['EN', 'ES'];

    // Add campaigns based on matches
    for (const match of matches) {
      if (match.homeTeam && match.awayTeam) {
        campaigns.push(`${match.homeTeam.name} vs ${match.awayTeam.name} Watch Party`);

        // Add languages based on teams
        if (match.homeTeam.continent === 'CONMEBOL' || match.awayTeam.continent === 'CONMEBOL') {
          languages.push('PT');
        }
        if (match.homeTeam.code === 'FRA' || match.awayTeam.code === 'FRA') {
          languages.push('FR');
        }
        if (match.homeTeam.code === 'GER' || match.awayTeam.code === 'GER') {
          languages.push('DE');
        }
      }
    }

    // General campaigns
    campaigns.push('World Cup Special Menu/Offers');
    campaigns.push('Early Bird Specials for Match Days');

    // Add channels based on category
    if (params.businessCategory === 'RESTAURANT' || params.businessCategory === 'BAR_PUB') {
      channels.push('Yelp', 'TripAdvisor');
    }
    if (params.businessCategory === 'HOTEL' || params.businessCategory === 'VACATION_RENTAL') {
      channels.push('Booking.com', 'Airbnb');
    }

    // Estimate reach based on city
    const cityData = HOST_CITIES[params.hostCityCode];
    const estimatedReach = cityData ? cityData.expectedVisitors * 0.01 : 5000;

    return {
      suggestedCampaigns: campaigns,
      targetAudience: 'World Cup visitors and local fans',
      suggestedChannels: [...new Set(channels)],
      suggestedLanguages: [...new Set(languages)],
      estimatedReach: Math.round(estimatedReach),
      estimatedCost: Math.round(estimatedReach * 0.05) // $0.05 per reach
    };
  }

  /**
   * Generate alerts based on forecast
   */
  private generateAlerts(
    demandIndex: number,
    matches: MatchCalendar[],
    params: ForecastGenerationParams
  ): ForecastAlert[] {
    const alerts: ForecastAlert[] = [];
    const now = new Date();
    const expiresAt = new Date(params.targetDate);

    // Demand alerts
    if (demandIndex >= 180) {
      alerts.push({
        type: 'EXTREME_DEMAND_EXPECTED',
        severity: 'CRITICAL',
        message: `Extreme demand expected (${demandIndex}% of normal). Prepare for overflow crowds.`,
        actionRequired: 'Maximize staffing, stock up inventory, consider overflow capacity',
        expiresAt
      });
    } else if (demandIndex >= 150) {
      alerts.push({
        type: 'VERY_HIGH_DEMAND_EXPECTED',
        severity: 'WARNING',
        message: `Very high demand expected (${demandIndex}% of normal).`,
        actionRequired: 'Increase staffing and inventory levels',
        expiresAt
      });
    } else if (demandIndex >= 120) {
      alerts.push({
        type: 'HIGH_DEMAND_EXPECTED',
        severity: 'INFO',
        message: `Above-average demand expected (${demandIndex}% of normal).`,
        actionRequired: 'Consider slight increases in staffing',
        expiresAt
      });
    }

    // Match-specific alerts
    for (const match of matches) {
      if (match.demandImpactLevel === 'EXTREME' || match.demandImpactLevel === 'VERY_HIGH') {
        alerts.push({
          type: 'HIGH_DEMAND_EXPECTED',
          severity: 'WARNING',
          message: `Major match: ${match.homeTeam?.name || 'TBD'} vs ${match.awayTeam?.name || 'TBD'} at ${match.scheduledTime}`,
          actionRequired: 'Plan for high traffic before and after match',
          relatedMatchId: match.id,
          expiresAt
        });
      }
    }

    // Staffing alerts based on demand
    if (demandIndex >= 150 && params.capacity > 50) {
      alerts.push({
        type: 'STAFFING_SHORTAGE_RISK',
        severity: 'WARNING',
        message: 'High demand may require additional staff',
        actionRequired: 'Schedule additional staff or arrange for backup',
        expiresAt: new Date(params.targetDate.getTime() - 48 * 60 * 60 * 1000)
      });
    }

    return alerts;
  }

  /**
   * Get numeric impact score from level
   */
  private getImpactScore(level: DemandImpactLevel): number {
    const scores: Record<DemandImpactLevel, number> = {
      'LOW': 10,
      'MEDIUM': 25,
      'HIGH': 50,
      'VERY_HIGH': 75,
      'EXTREME': 100
    };
    return scores[level];
  }
}
