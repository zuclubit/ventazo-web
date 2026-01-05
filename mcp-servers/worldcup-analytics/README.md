# WorldCup Analytics MCP Server

MCP (Model Context Protocol) server that provides demand forecasting tools for FIFA World Cup 2026.

## Tools Available

| Tool | Description |
|------|-------------|
| `get_host_cities` | Get all 16 host cities with stadium data |
| `get_matches` | Get matches for a city/date |
| `predict_demand` | Predict demand for a business |
| `get_pricing_recommendation` | Get dynamic pricing suggestions |
| `get_staffing_recommendation` | Get staffing recommendations |
| `get_weather_forecast` | Get weather forecast (simulated) |

## Installation

```bash
# The server is already configured in .mcp.json
# Just verify it's available:
claude mcp list
```

## Usage in Claude Code

Once configured, you can ask Claude:

```
"¿Cuál es la demanda esperada para mi restaurante en CDMX
el 15 de junio 2026 cuando juega México vs USA?"

"Dame recomendaciones de precios para un bar en Miami
durante la final del mundial"

"¿Cuánto personal necesito para mi hotel en Los Angeles
durante las semifinales?"
```

## Example Responses

### predict_demand
```json
{
  "city": "Ciudad de México",
  "date": "2026-06-15",
  "demand_index": 185,
  "demand_level": "VERY_HIGH",
  "recommendations": {
    "pricing_multiplier": 1.42,
    "staff_multiplier": 1.85,
    "inventory_multiplier": 1.57
  }
}
```

### get_pricing_recommendation
```json
{
  "demand_index": 185,
  "pricing": {
    "recommended_multiplier": 1.35,
    "strategy": "SURGE - Very high demand, increase prices moderately"
  },
  "tips": [
    "Consider time-based pricing (higher during match hours)",
    "Bundle deals can increase average ticket"
  ]
}
```

## Testing Locally

```bash
# Run server directly
python3 mcp-servers/worldcup-analytics/server.py

# Or use Claude Code
cd /path/to/zuclubit-smart-crm
claude
# Then ask about World Cup demand
```

## Extending the Server

To add real API integrations:

1. **FIFA/Football API**: Replace mock data in `get_matches()` with API call
2. **Weather API**: Replace simulation in `get_weather_forecast()` with OpenWeather
3. **ML Model**: Load trained model in `predict_demand()` for real predictions

```python
# Example: Add OpenWeather integration
import os
import requests

WEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

def get_weather_forecast(city_code: str, date: str) -> dict:
    city = HOST_CITIES.get(city_code.upper())
    response = requests.get(
        "https://api.openweathermap.org/data/2.5/forecast",
        params={
            "lat": city["lat"],
            "lon": city["lng"],
            "appid": WEATHER_API_KEY,
            "units": "metric"
        }
    )
    return response.json()
```

## World Cup 2026 Data

- **Dates**: June 11 - July 19, 2026
- **Host Cities**: 16 (11 USA, 3 Mexico, 2 Canada)
- **Teams**: 48
- **Matches**: 104
- **Expected Visitors**: 6.5 million
