/**
 * FIFA World Cup 2026 Host Cities Value Object
 * Represents the 16 host cities across USA, Mexico, and Canada
 */

export type Country = 'USA' | 'MEX' | 'CAN';
export type Region = 'WESTERN' | 'CENTRAL' | 'EASTERN';
export type TimeZone =
  | 'America/Los_Angeles'
  | 'America/Denver'
  | 'America/Chicago'
  | 'America/New_York'
  | 'America/Mexico_City'
  | 'America/Toronto'
  | 'America/Vancouver';

export interface HostCityData {
  code: string;
  name: string;
  country: Country;
  region: Region;
  timezone: TimeZone;
  stadiumName: string;
  stadiumCapacity: number;
  expectedMatches: number;
  expectedVisitors: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export const HOST_CITIES: Record<string, HostCityData> = {
  // WESTERN REGION
  'SEA': {
    code: 'SEA',
    name: 'Seattle',
    country: 'USA',
    region: 'WESTERN',
    timezone: 'America/Los_Angeles',
    stadiumName: 'Lumen Field',
    stadiumCapacity: 69000,
    expectedMatches: 6,
    expectedVisitors: 450000,
    coordinates: { lat: 47.5952, lng: -122.3316 }
  },
  'SFO': {
    code: 'SFO',
    name: 'San Francisco Bay Area',
    country: 'USA',
    region: 'WESTERN',
    timezone: 'America/Los_Angeles',
    stadiumName: 'Levi\'s Stadium',
    stadiumCapacity: 71000,
    expectedMatches: 6,
    expectedVisitors: 450000,
    coordinates: { lat: 37.4033, lng: -121.9694 }
  },
  'LAX': {
    code: 'LAX',
    name: 'Los Angeles',
    country: 'USA',
    region: 'WESTERN',
    timezone: 'America/Los_Angeles',
    stadiumName: 'SoFi Stadium',
    stadiumCapacity: 70000,
    expectedMatches: 8,
    expectedVisitors: 594000,
    coordinates: { lat: 33.9535, lng: -118.3390 }
  },
  'VAN': {
    code: 'VAN',
    name: 'Vancouver',
    country: 'CAN',
    region: 'WESTERN',
    timezone: 'America/Vancouver',
    stadiumName: 'BC Place',
    stadiumCapacity: 54500,
    expectedMatches: 7,
    expectedVisitors: 450000,
    coordinates: { lat: 49.2767, lng: -123.1117 }
  },

  // CENTRAL REGION
  'GDL': {
    code: 'GDL',
    name: 'Guadalajara',
    country: 'MEX',
    region: 'CENTRAL',
    timezone: 'America/Mexico_City',
    stadiumName: 'Estadio Akron',
    stadiumCapacity: 49850,
    expectedMatches: 5,
    expectedVisitors: 400000,
    coordinates: { lat: 20.6825, lng: -103.4626 }
  },
  'MEX': {
    code: 'MEX',
    name: 'Mexico City',
    country: 'MEX',
    region: 'CENTRAL',
    timezone: 'America/Mexico_City',
    stadiumName: 'Estadio Azteca',
    stadiumCapacity: 87000,
    expectedMatches: 6,
    expectedVisitors: 500000,
    coordinates: { lat: 19.3028, lng: -99.1505 }
  },
  'MTY': {
    code: 'MTY',
    name: 'Monterrey',
    country: 'MEX',
    region: 'CENTRAL',
    timezone: 'America/Mexico_City',
    stadiumName: 'Estadio BBVA',
    stadiumCapacity: 53500,
    expectedMatches: 5,
    expectedVisitors: 400000,
    coordinates: { lat: 25.6699, lng: -100.2436 }
  },
  'HOU': {
    code: 'HOU',
    name: 'Houston',
    country: 'USA',
    region: 'CENTRAL',
    timezone: 'America/Chicago',
    stadiumName: 'NRG Stadium',
    stadiumCapacity: 72000,
    expectedMatches: 6,
    expectedVisitors: 450000,
    coordinates: { lat: 29.6847, lng: -95.4107 }
  },
  'DFW': {
    code: 'DFW',
    name: 'Dallas',
    country: 'USA',
    region: 'CENTRAL',
    timezone: 'America/Chicago',
    stadiumName: 'AT&T Stadium',
    stadiumCapacity: 92000,
    expectedMatches: 9,
    expectedVisitors: 650000,
    coordinates: { lat: 32.7473, lng: -97.0945 }
  },
  'MCI': {
    code: 'MCI',
    name: 'Kansas City',
    country: 'USA',
    region: 'CENTRAL',
    timezone: 'America/Chicago',
    stadiumName: 'GEHA Field at Arrowhead Stadium',
    stadiumCapacity: 76000,
    expectedMatches: 6,
    expectedVisitors: 650000,
    coordinates: { lat: 39.0489, lng: -94.4839 }
  },

  // EASTERN REGION
  'ATL': {
    code: 'ATL',
    name: 'Atlanta',
    country: 'USA',
    region: 'EASTERN',
    timezone: 'America/New_York',
    stadiumName: 'Mercedes-Benz Stadium',
    stadiumCapacity: 71000,
    expectedMatches: 8,
    expectedVisitors: 500000,
    coordinates: { lat: 33.7553, lng: -84.4006 }
  },
  'MIA': {
    code: 'MIA',
    name: 'Miami',
    country: 'USA',
    region: 'EASTERN',
    timezone: 'America/New_York',
    stadiumName: 'Hard Rock Stadium',
    stadiumCapacity: 65000,
    expectedMatches: 7,
    expectedVisitors: 480000,
    coordinates: { lat: 25.9580, lng: -80.2389 }
  },
  'YYZ': {
    code: 'YYZ',
    name: 'Toronto',
    country: 'CAN',
    region: 'EASTERN',
    timezone: 'America/Toronto',
    stadiumName: 'BMO Field',
    stadiumCapacity: 45736,
    expectedMatches: 6,
    expectedVisitors: 450000,
    coordinates: { lat: 43.6332, lng: -79.4185 }
  },
  'BOS': {
    code: 'BOS',
    name: 'Boston',
    country: 'USA',
    region: 'EASTERN',
    timezone: 'America/New_York',
    stadiumName: 'Gillette Stadium',
    stadiumCapacity: 65000,
    expectedMatches: 7,
    expectedVisitors: 500000,
    coordinates: { lat: 42.0909, lng: -71.2643 }
  },
  'PHL': {
    code: 'PHL',
    name: 'Philadelphia',
    country: 'USA',
    region: 'EASTERN',
    timezone: 'America/New_York',
    stadiumName: 'Lincoln Financial Field',
    stadiumCapacity: 69000,
    expectedMatches: 6,
    expectedVisitors: 450000,
    coordinates: { lat: 39.9012, lng: -75.1676 }
  },
  'NYC': {
    code: 'NYC',
    name: 'New York/New Jersey',
    country: 'USA',
    region: 'EASTERN',
    timezone: 'America/New_York',
    stadiumName: 'MetLife Stadium',
    stadiumCapacity: 87000,
    expectedMatches: 8,
    expectedVisitors: 600000,
    coordinates: { lat: 40.8135, lng: -74.0745 }
  }
};

export class HostCity {
  private constructor(private readonly data: HostCityData) {}

  static fromCode(code: string): HostCity | null {
    const cityData = HOST_CITIES[code.toUpperCase()];
    return cityData ? new HostCity(cityData) : null;
  }

  static getAllCities(): HostCity[] {
    return Object.values(HOST_CITIES).map(data => new HostCity(data));
  }

  static getCitiesByCountry(country: Country): HostCity[] {
    return Object.values(HOST_CITIES)
      .filter(data => data.country === country)
      .map(data => new HostCity(data));
  }

  static getCitiesByRegion(region: Region): HostCity[] {
    return Object.values(HOST_CITIES)
      .filter(data => data.region === region)
      .map(data => new HostCity(data));
  }

  get code(): string { return this.data.code; }
  get name(): string { return this.data.name; }
  get country(): Country { return this.data.country; }
  get region(): Region { return this.data.region; }
  get timezone(): TimeZone { return this.data.timezone; }
  get stadiumName(): string { return this.data.stadiumName; }
  get stadiumCapacity(): number { return this.data.stadiumCapacity; }
  get expectedMatches(): number { return this.data.expectedMatches; }
  get expectedVisitors(): number { return this.data.expectedVisitors; }
  get coordinates(): { lat: number; lng: number } { return this.data.coordinates; }

  toJSON(): HostCityData {
    return { ...this.data };
  }
}
