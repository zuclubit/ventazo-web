# WorldCup Analytics Service

Demand forecasting and analytics platform for local businesses during FIFA World Cup 2026.

## Overview

This service provides AI-powered demand predictions, pricing recommendations, staffing suggestions, and marketing insights for businesses located in the 16 World Cup 2026 host cities.

### Key Features

- **Demand Forecasting**: ML-powered predictions based on match schedules, team popularity, and historical data
- **Dynamic Pricing**: Recommendations for optimal pricing during high-demand periods
- **Staffing Optimization**: Suggestions for staffing levels based on predicted foot traffic
- **Inventory Management**: Stock level recommendations for restaurants, retail, and hospitality
- **Marketing Insights**: Campaign suggestions targeting World Cup visitors
- **Real-time Alerts**: Notifications for high-demand periods and actionable insights

## World Cup 2026 Quick Facts

| Metric | Value |
|--------|-------|
| **Dates** | June 11 - July 19, 2026 |
| **Host Countries** | USA, Mexico, Canada |
| **Host Cities** | 16 |
| **Teams** | 48 |
| **Matches** | 104 |
| **Expected Visitors** | 6.5 million |

### Host Cities

**Western Region:** Seattle, San Francisco, Los Angeles, Vancouver

**Central Region:** Guadalajara, Mexico City, Monterrey, Houston, Dallas, Kansas City

**Eastern Region:** Atlanta, Miami, Toronto, Boston, Philadelphia, New York/New Jersey

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis (optional, for caching)

### Installation

```bash
cd services/worldcup-analytics-service
npm install
```

### Development

```bash
npm run dev
```

The server will start at `http://localhost:3002`

### Build

```bash
npm run build
npm start
```

## API Endpoints

### Forecasts

```
POST /api/v1/worldcup/forecasts
Generate demand forecast for a specific business and date

GET /api/v1/worldcup/forecasts/business/:businessId
Get forecasts for a business for the next X days
```

### Matches

```
GET /api/v1/worldcup/matches
Get match calendar for a date range
```

### Cities

```
GET /api/v1/worldcup/cities
Get all host cities

GET /api/v1/worldcup/cities/:code
Get specific host city data
```

### Dashboard

```
GET /api/v1/worldcup/dashboard
Get aggregated analytics for a host city
```

### Alerts

```
POST /api/v1/worldcup/alerts/subscribe
Subscribe to demand alerts
```

## Example API Usage

### Generate Forecast

```bash
curl -X POST http://localhost:3002/api/v1/worldcup/forecasts \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "550e8400-e29b-41d4-a716-446655440000",
    "hostCityCode": "MEX",
    "businessCategory": "RESTAURANT",
    "distanceToStadiumKm": 2.5,
    "capacity": 100,
    "targetDate": "2026-06-15T00:00:00Z",
    "granularity": "HOURLY"
  }'
```

### Get City Dashboard

```bash
curl "http://localhost:3002/api/v1/worldcup/dashboard?hostCityCode=MEX&days=14"
```

## Business Categories

- `RESTAURANT`
- `BAR_PUB`
- `HOTEL`
- `VACATION_RENTAL`
- `TRANSPORTATION`
- `RETAIL`
- `TOUR_OPERATOR`
- `ENTERTAINMENT`
- `FOOD_TRUCK`
- `GROCERY`
- `PHARMACY`
- `GAS_STATION`
- `PARKING`
- `OTHER`

## Demand Impact Levels

| Level | Multiplier | Description |
|-------|-----------|-------------|
| LOW | 1.0-1.5x | Minor local event |
| MEDIUM | 1.5-2.0x | Group stage match |
| HIGH | 2.0-3.0x | Round of 16/32 |
| VERY_HIGH | 3.0-4.0x | Quarter/Semi-finals |
| EXTREME | 4.0-5.0x+ | Final, host nation matches |

## Architecture

```
worldcup-analytics-service/
├── src/
│   ├── domain/
│   │   ├── aggregates/
│   │   │   ├── local-business.aggregate.ts
│   │   │   ├── match-calendar.aggregate.ts
│   │   │   └── demand-forecast.aggregate.ts
│   │   └── value-objects/
│   │       └── host-city.ts
│   ├── infrastructure/
│   │   ├── forecasting/
│   │   │   └── demand-forecast.service.ts
│   │   ├── external-apis/
│   │   ├── database/
│   │   └── cache/
│   ├── presentation/
│   │   ├── routes/
│   │   │   └── forecast.routes.ts
│   │   └── middlewares/
│   └── app.ts
```

## Integration with Zuclubit CRM

This service integrates with the main CRM via:

1. **NATS Events**: Publishes `ForecastGenerated`, `AlertTriggered` events
2. **Shared Database**: Uses the same PostgreSQL cluster with separate schema
3. **Authentication**: Uses Supabase Auth (shared with lead-service)

## Environment Variables

```env
PORT=3002
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/worldcup_analytics

# NATS
NATS_SERVERS=nats://localhost:4222

# External APIs (future)
FIFA_API_KEY=your_api_key
WEATHER_API_KEY=your_api_key
GOOGLE_PLACES_API_KEY=your_api_key
```

## Roadmap

### Phase 1 (Current) - MVP
- [x] Host city data models
- [x] Basic demand forecasting
- [x] Pricing recommendations
- [x] Staffing suggestions
- [x] REST API endpoints

### Phase 2 - External Integrations
- [ ] FIFA match calendar API
- [ ] Weather API integration
- [ ] Google Places integration
- [ ] Social media sentiment

### Phase 3 - Advanced ML
- [ ] Historical data training
- [ ] Competitor pricing analysis
- [ ] Personalized recommendations
- [ ] Anomaly detection

### Phase 4 - Real-time Features
- [ ] Live demand updates during matches
- [ ] Push notifications
- [ ] WebSocket dashboard updates

## License

Proprietary - Zuclubit Technologies
