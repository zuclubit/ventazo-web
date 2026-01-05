import { v4 as uuidv4 } from 'uuid';
import { BusinessCategory } from './local-business.aggregate';
import { DemandImpactLevel } from './match-calendar.aggregate';

/**
 * Forecast Granularity
 */
export type ForecastGranularity = 'HOURLY' | 'DAILY' | 'WEEKLY';

/**
 * Forecast Confidence Level
 */
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

/**
 * Demand Drivers - factors influencing the forecast
 */
export interface DemandDrivers {
  matchImpact: number;           // 0-100, impact from scheduled matches
  weatherImpact: number;         // -20 to +20, weather influence
  dayOfWeekImpact: number;       // -10 to +10
  seasonalityImpact: number;     // -10 to +10
  specialEventImpact: number;    // 0-50, other events (concerts, etc.)
  historicalBaselineDemand: number; // Base demand without World Cup
}

/**
 * Pricing Recommendation
 */
export interface PricingRecommendation {
  recommendedPriceMultiplier: number;  // 1.0 = normal, 1.5 = 50% increase
  minRecommendedMultiplier: number;
  maxRecommendedMultiplier: number;
  strategyNotes: string;
  competitorAvgPriceChange?: number;
}

/**
 * Staffing Recommendation
 */
export interface StaffingRecommendation {
  recommendedStaffCount: number;
  normalStaffCount: number;
  additionalStaffNeeded: number;
  peakHours: string[];  // e.g., ['14:00-16:00', '18:00-22:00']
  skillsNeeded: string[]; // e.g., ['bilingual', 'high-volume service']
}

/**
 * Inventory Recommendation (for restaurants/retail)
 */
export interface InventoryRecommendation {
  category: string;
  recommendedStockMultiplier: number;
  criticalItems: string[];
  notes: string;
}

/**
 * Marketing Recommendation
 */
export interface MarketingRecommendation {
  suggestedCampaigns: string[];
  targetAudience: string;
  suggestedChannels: string[];
  suggestedLanguages: string[];
  estimatedReach: number;
  estimatedCost: number;
}

/**
 * Forecast Data Point
 */
export interface ForecastDataPoint {
  timestamp: Date;
  predictedDemandIndex: number;      // 0-200, 100 = normal baseline
  predictedVisitorCount: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  drivers: DemandDrivers;
}

/**
 * Demand Forecast Properties
 */
export interface DemandForecastProps {
  id?: string;
  businessId: string;
  businessCategory: BusinessCategory;
  hostCityCode: string;
  forecastDate: Date;
  granularity: ForecastGranularity;
  dataPoints: ForecastDataPoint[];
  overallDemandIndex: number;        // Daily average
  overallConfidence: ConfidenceLevel;
  matchesImpacting: string[];        // Match IDs affecting this forecast
  pricingRecommendation: PricingRecommendation;
  staffingRecommendation: StaffingRecommendation;
  inventoryRecommendations: InventoryRecommendation[];
  marketingRecommendation: MarketingRecommendation;
  alerts: ForecastAlert[];
  generatedAt: Date;
  expiresAt: Date;
  modelVersion: string;
}

/**
 * Alert Types
 */
export type AlertType =
  | 'HIGH_DEMAND_EXPECTED'
  | 'VERY_HIGH_DEMAND_EXPECTED'
  | 'EXTREME_DEMAND_EXPECTED'
  | 'STAFFING_SHORTAGE_RISK'
  | 'INVENTORY_DEPLETION_RISK'
  | 'COMPETITOR_PRICE_CHANGE'
  | 'WEATHER_IMPACT'
  | 'SPECIAL_EVENT_NEARBY'
  | 'MATCH_TIME_CONFLICT';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface ForecastAlert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  actionRequired: string;
  relatedMatchId?: string;
  expiresAt: Date;
}

/**
 * Demand Forecast Aggregate
 * Represents a demand prediction for a local business
 */
export class DemandForecast {
  private constructor(private props: DemandForecastProps) {}

  // Factory Methods
  static create(props: Omit<DemandForecastProps, 'id' | 'generatedAt' | 'modelVersion'>): DemandForecast {
    return new DemandForecast({
      ...props,
      id: uuidv4(),
      generatedAt: new Date(),
      modelVersion: '1.0.0'
    });
  }

  static reconstitute(props: DemandForecastProps): DemandForecast {
    return new DemandForecast(props);
  }

  // Getters
  get id(): string { return this.props.id!; }
  get businessId(): string { return this.props.businessId; }
  get businessCategory(): BusinessCategory { return this.props.businessCategory; }
  get hostCityCode(): string { return this.props.hostCityCode; }
  get forecastDate(): Date { return this.props.forecastDate; }
  get granularity(): ForecastGranularity { return this.props.granularity; }
  get dataPoints(): ForecastDataPoint[] { return this.props.dataPoints; }
  get overallDemandIndex(): number { return this.props.overallDemandIndex; }
  get overallConfidence(): ConfidenceLevel { return this.props.overallConfidence; }
  get matchesImpacting(): string[] { return this.props.matchesImpacting; }
  get pricingRecommendation(): PricingRecommendation { return this.props.pricingRecommendation; }
  get staffingRecommendation(): StaffingRecommendation { return this.props.staffingRecommendation; }
  get inventoryRecommendations(): InventoryRecommendation[] { return this.props.inventoryRecommendations; }
  get marketingRecommendation(): MarketingRecommendation { return this.props.marketingRecommendation; }
  get alerts(): ForecastAlert[] { return this.props.alerts; }
  get generatedAt(): Date { return this.props.generatedAt; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get modelVersion(): string { return this.props.modelVersion; }

  // Domain Logic
  /**
   * Check if forecast is still valid
   */
  isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  /**
   * Get peak demand hours
   */
  getPeakDemandPeriods(): { start: Date; end: Date; demandIndex: number }[] {
    const threshold = this.props.overallDemandIndex * 1.2; // 20% above average
    const peaks: { start: Date; end: Date; demandIndex: number }[] = [];

    let currentPeak: { start: Date; end: Date; demandIndex: number } | null = null;

    for (const point of this.props.dataPoints) {
      if (point.predictedDemandIndex >= threshold) {
        if (!currentPeak) {
          currentPeak = {
            start: point.timestamp,
            end: point.timestamp,
            demandIndex: point.predictedDemandIndex
          };
        } else {
          currentPeak.end = point.timestamp;
          currentPeak.demandIndex = Math.max(currentPeak.demandIndex, point.predictedDemandIndex);
        }
      } else if (currentPeak) {
        peaks.push(currentPeak);
        currentPeak = null;
      }
    }

    if (currentPeak) peaks.push(currentPeak);
    return peaks;
  }

  /**
   * Get critical alerts only
   */
  getCriticalAlerts(): ForecastAlert[] {
    return this.props.alerts.filter(a => a.severity === 'CRITICAL');
  }

  /**
   * Calculate potential revenue impact
   */
  calculateRevenueImpact(baselineDailyRevenue: number): {
    estimatedRevenue: number;
    revenueIncrease: number;
    revenueIncreasePercent: number;
  } {
    const demandMultiplier = this.props.overallDemandIndex / 100;
    const priceMultiplier = this.props.pricingRecommendation.recommendedPriceMultiplier;

    const estimatedRevenue = baselineDailyRevenue * demandMultiplier * priceMultiplier;
    const revenueIncrease = estimatedRevenue - baselineDailyRevenue;
    const revenueIncreasePercent = (revenueIncrease / baselineDailyRevenue) * 100;

    return {
      estimatedRevenue: Math.round(estimatedRevenue),
      revenueIncrease: Math.round(revenueIncrease),
      revenueIncreasePercent: Math.round(revenueIncreasePercent)
    };
  }

  /**
   * Get action items for the business
   */
  getActionItems(): { priority: number; action: string; deadline: string }[] {
    const actions: { priority: number; action: string; deadline: string }[] = [];

    // From alerts
    for (const alert of this.props.alerts) {
      actions.push({
        priority: alert.severity === 'CRITICAL' ? 1 : alert.severity === 'WARNING' ? 2 : 3,
        action: alert.actionRequired,
        deadline: alert.expiresAt.toISOString()
      });
    }

    // From staffing
    if (this.props.staffingRecommendation.additionalStaffNeeded > 0) {
      actions.push({
        priority: 2,
        action: `Hire/schedule ${this.props.staffingRecommendation.additionalStaffNeeded} additional staff`,
        deadline: new Date(this.props.forecastDate.getTime() - 48 * 60 * 60 * 1000).toISOString()
      });
    }

    // From inventory
    for (const inv of this.props.inventoryRecommendations) {
      if (inv.recommendedStockMultiplier > 1.5) {
        actions.push({
          priority: 2,
          action: `Stock up on ${inv.category}: ${inv.criticalItems.join(', ')}`,
          deadline: new Date(this.props.forecastDate.getTime() - 72 * 60 * 60 * 1000).toISOString()
        });
      }
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  // Serialization
  toJSON(): DemandForecastProps {
    return { ...this.props };
  }
}

/**
 * Forecast Generation Parameters
 */
export interface ForecastGenerationParams {
  businessId: string;
  hostCityCode: string;
  businessCategory: BusinessCategory;
  distanceToStadiumKm: number;
  capacity: number;
  historicalData?: {
    avgDailyVisitors: number;
    avgDailyRevenue: number;
    peakDayMultiplier: number;
  };
  targetDate: Date;
  granularity: ForecastGranularity;
}
