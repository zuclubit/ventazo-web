import { v4 as uuidv4 } from 'uuid';
import { Country, Region } from '../value-objects/host-city';

/**
 * Business Category Types for World Cup Analytics
 */
export type BusinessCategory =
  | 'RESTAURANT'
  | 'BAR_PUB'
  | 'HOTEL'
  | 'VACATION_RENTAL'
  | 'TRANSPORTATION'
  | 'RETAIL'
  | 'TOUR_OPERATOR'
  | 'ENTERTAINMENT'
  | 'FOOD_TRUCK'
  | 'GROCERY'
  | 'PHARMACY'
  | 'GAS_STATION'
  | 'PARKING'
  | 'OTHER';

/**
 * Subscription Tier for the Analytics Platform
 */
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

/**
 * Business Operating Hours
 */
export interface OperatingHours {
  dayOfWeek: number; // 0-6, Sunday = 0
  openTime: string;  // HH:mm format
  closeTime: string; // HH:mm format
  isOpen: boolean;
}

/**
 * Business Location Details
 */
export interface BusinessLocation {
  address: string;
  city: string;
  hostCityCode: string; // FK to HOST_CITIES
  country: Country;
  postalCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distanceToStadiumKm: number;
  nearbyAttractions: string[];
}

/**
 * Business Capacity Information
 */
export interface BusinessCapacity {
  maxOccupancy: number;
  seatingCapacity?: number;
  parkingSpots?: number;
  rooms?: number; // For hotels
}

/**
 * Integration Connections
 */
export interface IntegrationConnections {
  googlePlaceId?: string;
  yelpBusinessId?: string;
  tripadvisorId?: string;
  facebookPageId?: string;
  instagramHandle?: string;
  ubereatsId?: string;
  doordashId?: string;
  rappiId?: string; // LATAM
  mercadopagoId?: string; // LATAM
}

/**
 * Business Properties for creation
 */
export interface LocalBusinessProps {
  id?: string;
  tenantId: string;
  name: string;
  category: BusinessCategory;
  subcategory?: string;
  description?: string;
  location: BusinessLocation;
  capacity: BusinessCapacity;
  operatingHours: OperatingHours[];
  contactEmail: string;
  contactPhone: string;
  website?: string;
  primaryLanguage: 'EN' | 'ES' | 'FR' | 'PT';
  supportedLanguages: string[];
  acceptedPayments: string[];
  priceRange: 1 | 2 | 3 | 4; // $ to $$$$
  subscriptionTier: SubscriptionTier;
  integrations: IntegrationConnections;
  isVerified: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Domain Events
 */
export interface LocalBusinessEvent {
  type: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

/**
 * Local Business Aggregate Root
 * Represents a business participating in World Cup Analytics platform
 */
export class LocalBusiness {
  private _domainEvents: LocalBusinessEvent[] = [];

  private constructor(private props: LocalBusinessProps) {}

  // Factory Methods
  static create(props: Omit<LocalBusinessProps, 'id' | 'createdAt' | 'updatedAt'>): LocalBusiness {
    const business = new LocalBusiness({
      ...props,
      id: uuidv4(),
      isVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    business.addDomainEvent({
      type: 'LocalBusinessCreated',
      aggregateId: business.id,
      payload: {
        name: props.name,
        category: props.category,
        hostCity: props.location.hostCityCode
      },
      occurredAt: new Date()
    });

    return business;
  }

  static reconstitute(props: LocalBusinessProps): LocalBusiness {
    return new LocalBusiness(props);
  }

  // Getters
  get id(): string { return this.props.id!; }
  get tenantId(): string { return this.props.tenantId; }
  get name(): string { return this.props.name; }
  get category(): BusinessCategory { return this.props.category; }
  get subcategory(): string | undefined { return this.props.subcategory; }
  get description(): string | undefined { return this.props.description; }
  get location(): BusinessLocation { return this.props.location; }
  get capacity(): BusinessCapacity { return this.props.capacity; }
  get operatingHours(): OperatingHours[] { return this.props.operatingHours; }
  get contactEmail(): string { return this.props.contactEmail; }
  get contactPhone(): string { return this.props.contactPhone; }
  get website(): string | undefined { return this.props.website; }
  get primaryLanguage(): string { return this.props.primaryLanguage; }
  get supportedLanguages(): string[] { return this.props.supportedLanguages; }
  get acceptedPayments(): string[] { return this.props.acceptedPayments; }
  get priceRange(): number { return this.props.priceRange; }
  get subscriptionTier(): SubscriptionTier { return this.props.subscriptionTier; }
  get integrations(): IntegrationConnections { return this.props.integrations; }
  get isVerified(): boolean { return this.props.isVerified; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get domainEvents(): LocalBusinessEvent[] { return [...this._domainEvents]; }

  // Business Methods
  updateProfile(updates: Partial<Pick<LocalBusinessProps,
    'name' | 'description' | 'category' | 'subcategory' | 'website' | 'priceRange'
  >>): void {
    Object.assign(this.props, updates);
    this.props.updatedAt = new Date();

    this.addDomainEvent({
      type: 'LocalBusinessProfileUpdated',
      aggregateId: this.id,
      payload: updates,
      occurredAt: new Date()
    });
  }

  updateLocation(location: BusinessLocation): void {
    this.props.location = location;
    this.props.updatedAt = new Date();

    this.addDomainEvent({
      type: 'LocalBusinessLocationUpdated',
      aggregateId: this.id,
      payload: { location },
      occurredAt: new Date()
    });
  }

  updateCapacity(capacity: BusinessCapacity): void {
    this.props.capacity = capacity;
    this.props.updatedAt = new Date();
  }

  updateOperatingHours(hours: OperatingHours[]): void {
    this.props.operatingHours = hours;
    this.props.updatedAt = new Date();
  }

  connectIntegration(integration: keyof IntegrationConnections, value: string): void {
    this.props.integrations[integration] = value;
    this.props.updatedAt = new Date();

    this.addDomainEvent({
      type: 'IntegrationConnected',
      aggregateId: this.id,
      payload: { integration, value },
      occurredAt: new Date()
    });
  }

  disconnectIntegration(integration: keyof IntegrationConnections): void {
    delete this.props.integrations[integration];
    this.props.updatedAt = new Date();
  }

  upgradeTier(newTier: SubscriptionTier): void {
    const tierOrder: SubscriptionTier[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
    const currentIndex = tierOrder.indexOf(this.props.subscriptionTier);
    const newIndex = tierOrder.indexOf(newTier);

    if (newIndex <= currentIndex) {
      throw new Error('Can only upgrade to a higher tier');
    }

    const previousTier = this.props.subscriptionTier;
    this.props.subscriptionTier = newTier;
    this.props.updatedAt = new Date();

    this.addDomainEvent({
      type: 'SubscriptionTierUpgraded',
      aggregateId: this.id,
      payload: { previousTier, newTier },
      occurredAt: new Date()
    });
  }

  verify(): void {
    this.props.isVerified = true;
    this.props.updatedAt = new Date();

    this.addDomainEvent({
      type: 'LocalBusinessVerified',
      aggregateId: this.id,
      payload: {},
      occurredAt: new Date()
    });
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  // Domain Logic
  isNearStadium(): boolean {
    return this.props.location.distanceToStadiumKm <= 5;
  }

  canBenefitFromMatchDay(matchDate: Date): boolean {
    const dayOfWeek = matchDate.getDay();
    const operatingDay = this.props.operatingHours.find(h => h.dayOfWeek === dayOfWeek);
    return operatingDay?.isOpen ?? false;
  }

  getCapacityUtilization(currentOccupancy: number): number {
    return (currentOccupancy / this.props.capacity.maxOccupancy) * 100;
  }

  // Event Management
  private addDomainEvent(event: LocalBusinessEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  // Serialization
  toJSON(): LocalBusinessProps {
    return { ...this.props };
  }
}
