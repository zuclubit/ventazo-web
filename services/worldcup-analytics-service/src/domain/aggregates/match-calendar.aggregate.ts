import { v4 as uuidv4 } from 'uuid';

/**
 * World Cup 2026 Match Stages
 */
export type MatchStage =
  | 'GROUP_STAGE'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL';

/**
 * Match Status
 */
export type MatchStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'HALF_TIME'
  | 'COMPLETED'
  | 'POSTPONED'
  | 'CANCELLED';

/**
 * Demand Impact Level based on match importance
 */
export type DemandImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';

/**
 * Team Information
 */
export interface TeamInfo {
  code: string;        // FIFA country code (e.g., 'MEX', 'USA', 'ARG')
  name: string;        // Full name
  continent: string;   // UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC
  fifaRanking?: number;
  fanBaseEstimate?: number; // Estimated traveling fans
}

/**
 * Match Properties
 */
export interface MatchProps {
  id?: string;
  matchNumber: number;           // 1-104
  hostCityCode: string;          // FK to HOST_CITIES
  stadiumName: string;
  stage: MatchStage;
  groupCode?: string;            // A-L for group stage
  homeTeam: TeamInfo | null;     // null for TBD in knockouts
  awayTeam: TeamInfo | null;
  scheduledDate: Date;
  scheduledTime: string;         // HH:mm local time
  estimatedEndTime: string;
  status: MatchStatus;
  attendance?: number;
  // Demand Prediction Fields
  demandImpactLevel: DemandImpactLevel;
  estimatedLocalDemandMultiplier: number;  // 1.0 = normal, 3.0 = 3x normal
  estimatedTouristInflow: number;
  estimatedFanZoneAttendance: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Match Calendar Aggregate
 * Represents a World Cup match with demand prediction data
 */
export class MatchCalendar {
  private constructor(private props: MatchProps) {}

  // Factory Methods
  static create(props: Omit<MatchProps, 'id' | 'createdAt' | 'updatedAt'>): MatchCalendar {
    return new MatchCalendar({
      ...props,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  static reconstitute(props: MatchProps): MatchCalendar {
    return new MatchCalendar(props);
  }

  // Getters
  get id(): string { return this.props.id!; }
  get matchNumber(): number { return this.props.matchNumber; }
  get hostCityCode(): string { return this.props.hostCityCode; }
  get stadiumName(): string { return this.props.stadiumName; }
  get stage(): MatchStage { return this.props.stage; }
  get groupCode(): string | undefined { return this.props.groupCode; }
  get homeTeam(): TeamInfo | null { return this.props.homeTeam; }
  get awayTeam(): TeamInfo | null { return this.props.awayTeam; }
  get scheduledDate(): Date { return this.props.scheduledDate; }
  get scheduledTime(): string { return this.props.scheduledTime; }
  get estimatedEndTime(): string { return this.props.estimatedEndTime; }
  get status(): MatchStatus { return this.props.status; }
  get attendance(): number | undefined { return this.props.attendance; }
  get demandImpactLevel(): DemandImpactLevel { return this.props.demandImpactLevel; }
  get estimatedLocalDemandMultiplier(): number { return this.props.estimatedLocalDemandMultiplier; }
  get estimatedTouristInflow(): number { return this.props.estimatedTouristInflow; }
  get estimatedFanZoneAttendance(): number { return this.props.estimatedFanZoneAttendance; }

  // Domain Logic
  /**
   * Calculate demand impact based on match characteristics
   */
  static calculateDemandImpact(
    stage: MatchStage,
    homeTeam: TeamInfo | null,
    awayTeam: TeamInfo | null,
    hostCityCode: string
  ): { level: DemandImpactLevel; multiplier: number } {
    let baseMultiplier = 1.0;

    // Stage-based multiplier
    const stageMultipliers: Record<MatchStage, number> = {
      'GROUP_STAGE': 1.5,
      'ROUND_OF_32': 2.0,
      'ROUND_OF_16': 2.5,
      'QUARTER_FINAL': 3.0,
      'SEMI_FINAL': 3.5,
      'THIRD_PLACE': 2.0,
      'FINAL': 5.0
    };
    baseMultiplier = stageMultipliers[stage];

    // Host nation bonus (if USA, Mexico, or Canada is playing)
    const hostNations = ['USA', 'MEX', 'CAN'];
    const hostNationBonus = [homeTeam?.code, awayTeam?.code]
      .some(code => hostNations.includes(code || '')) ? 0.5 : 0;
    baseMultiplier += hostNationBonus;

    // Popular team bonus (top 10 FIFA ranking or large fan base)
    const popularTeams = ['BRA', 'ARG', 'FRA', 'ENG', 'GER', 'ESP', 'ITA', 'POR', 'NED', 'BEL'];
    const popularTeamBonus = [homeTeam?.code, awayTeam?.code]
      .filter(code => popularTeams.includes(code || '')).length * 0.3;
    baseMultiplier += popularTeamBonus;

    // Determine level
    let level: DemandImpactLevel;
    if (baseMultiplier < 1.5) level = 'LOW';
    else if (baseMultiplier < 2.0) level = 'MEDIUM';
    else if (baseMultiplier < 3.0) level = 'HIGH';
    else if (baseMultiplier < 4.0) level = 'VERY_HIGH';
    else level = 'EXTREME';

    return { level, multiplier: Math.round(baseMultiplier * 10) / 10 };
  }

  /**
   * Get time window for demand (hours before/after match)
   */
  getDemandTimeWindow(): { preMatchHours: number; postMatchHours: number } {
    // Higher impact matches have longer demand windows
    const windows: Record<DemandImpactLevel, { pre: number; post: number }> = {
      'LOW': { pre: 2, post: 2 },
      'MEDIUM': { pre: 3, post: 3 },
      'HIGH': { pre: 4, post: 4 },
      'VERY_HIGH': { pre: 5, post: 5 },
      'EXTREME': { pre: 6, post: 6 }
    };
    const window = windows[this.props.demandImpactLevel];
    return { preMatchHours: window.pre, postMatchHours: window.post };
  }

  /**
   * Check if this match is on a specific date
   */
  isOnDate(date: Date): boolean {
    return this.props.scheduledDate.toDateString() === date.toDateString();
  }

  /**
   * Check if match is happening soon (within X hours)
   */
  isHappeningSoon(withinHours: number = 24): boolean {
    const now = new Date();
    const matchTime = new Date(this.props.scheduledDate);
    const [hours, minutes] = this.props.scheduledTime.split(':').map(Number);
    matchTime.setHours(hours, minutes, 0, 0);

    const diffMs = matchTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours > 0 && diffHours <= withinHours;
  }

  /**
   * Update status
   */
  updateStatus(status: MatchStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  /**
   * Record attendance after match
   */
  recordAttendance(attendance: number): void {
    this.props.attendance = attendance;
    this.props.updatedAt = new Date();
  }

  // Serialization
  toJSON(): MatchProps {
    return { ...this.props };
  }
}

/**
 * Helper to get all teams participating
 */
export const PARTICIPATING_TEAMS: TeamInfo[] = [
  // CONCACAF (Host confederation + guests)
  { code: 'USA', name: 'United States', continent: 'CONCACAF', fifaRanking: 11 },
  { code: 'MEX', name: 'Mexico', continent: 'CONCACAF', fifaRanking: 15 },
  { code: 'CAN', name: 'Canada', continent: 'CONCACAF', fifaRanking: 48 },
  // CONMEBOL
  { code: 'ARG', name: 'Argentina', continent: 'CONMEBOL', fifaRanking: 1 },
  { code: 'BRA', name: 'Brazil', continent: 'CONMEBOL', fifaRanking: 5 },
  { code: 'COL', name: 'Colombia', continent: 'CONMEBOL', fifaRanking: 12 },
  { code: 'URU', name: 'Uruguay', continent: 'CONMEBOL', fifaRanking: 14 },
  { code: 'ECU', name: 'Ecuador', continent: 'CONMEBOL', fifaRanking: 30 },
  // UEFA
  { code: 'FRA', name: 'France', continent: 'UEFA', fifaRanking: 2 },
  { code: 'ENG', name: 'England', continent: 'UEFA', fifaRanking: 4 },
  { code: 'ESP', name: 'Spain', continent: 'UEFA', fifaRanking: 3 },
  { code: 'GER', name: 'Germany', continent: 'UEFA', fifaRanking: 16 },
  { code: 'POR', name: 'Portugal', continent: 'UEFA', fifaRanking: 6 },
  { code: 'NED', name: 'Netherlands', continent: 'UEFA', fifaRanking: 7 },
  { code: 'ITA', name: 'Italy', continent: 'UEFA', fifaRanking: 8 },
  { code: 'BEL', name: 'Belgium', continent: 'UEFA', fifaRanking: 9 },
  // ... more teams to be added after qualification
];
