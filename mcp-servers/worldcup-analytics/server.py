#!/usr/bin/env python3
"""
WorldCup Analytics MCP Server
Provides demand forecasting tools for FIFA World Cup 2026

Tools:
- get_matches: Get World Cup matches for a date/city
- get_host_cities: Get all 16 host cities with data
- predict_demand: Predict demand for a business
- get_pricing_recommendation: Get dynamic pricing suggestions
- get_staffing_recommendation: Get staffing suggestions
- get_weather_forecast: Get weather for a city/date
"""

import json
import os
import sys
from datetime import datetime, timedelta
from typing import Optional
import random
import math

# MCP Protocol Implementation (stdio)
def send_response(response: dict):
    """Send JSON-RPC response to stdout"""
    output = json.dumps(response)
    sys.stdout.write(f"Content-Length: {len(output)}\r\n\r\n{output}")
    sys.stdout.flush()

def read_request():
    """Read JSON-RPC request from stdin"""
    # Read headers
    headers = {}
    while True:
        line = sys.stdin.readline()
        if line == '\r\n' or line == '\n':
            break
        if ':' in line:
            key, value = line.split(':', 1)
            headers[key.strip()] = value.strip()

    # Read body
    content_length = int(headers.get('Content-Length', 0))
    if content_length > 0:
        body = sys.stdin.read(content_length)
        return json.loads(body)
    return None

# =============================================================================
# HOST CITIES DATA
# =============================================================================

HOST_CITIES = {
    "MEX": {"name": "Ciudad de México", "country": "Mexico", "stadium": "Estadio Azteca", "capacity": 87000, "matches": 6, "timezone": "America/Mexico_City", "lat": 19.3028, "lng": -99.1505},
    "GDL": {"name": "Guadalajara", "country": "Mexico", "stadium": "Estadio Akron", "capacity": 49850, "matches": 5, "timezone": "America/Mexico_City", "lat": 20.6825, "lng": -103.4626},
    "MTY": {"name": "Monterrey", "country": "Mexico", "stadium": "Estadio BBVA", "capacity": 53500, "matches": 5, "timezone": "America/Mexico_City", "lat": 25.6699, "lng": -100.2436},
    "LAX": {"name": "Los Angeles", "country": "USA", "stadium": "SoFi Stadium", "capacity": 70000, "matches": 8, "timezone": "America/Los_Angeles", "lat": 33.9535, "lng": -118.3390},
    "NYC": {"name": "New York/New Jersey", "country": "USA", "stadium": "MetLife Stadium", "capacity": 87000, "matches": 8, "timezone": "America/New_York", "lat": 40.8135, "lng": -74.0745},
    "DFW": {"name": "Dallas", "country": "USA", "stadium": "AT&T Stadium", "capacity": 92000, "matches": 9, "timezone": "America/Chicago", "lat": 32.7473, "lng": -97.0945},
    "MIA": {"name": "Miami", "country": "USA", "stadium": "Hard Rock Stadium", "capacity": 65000, "matches": 7, "timezone": "America/New_York", "lat": 25.9580, "lng": -80.2389},
    "ATL": {"name": "Atlanta", "country": "USA", "stadium": "Mercedes-Benz Stadium", "capacity": 71000, "matches": 8, "timezone": "America/New_York", "lat": 33.7553, "lng": -84.4006},
    "SEA": {"name": "Seattle", "country": "USA", "stadium": "Lumen Field", "capacity": 69000, "matches": 6, "timezone": "America/Los_Angeles", "lat": 47.5952, "lng": -122.3316},
    "SFO": {"name": "San Francisco", "country": "USA", "stadium": "Levi's Stadium", "capacity": 71000, "matches": 6, "timezone": "America/Los_Angeles", "lat": 37.4033, "lng": -121.9694},
    "HOU": {"name": "Houston", "country": "USA", "stadium": "NRG Stadium", "capacity": 72000, "matches": 6, "timezone": "America/Chicago", "lat": 29.6847, "lng": -95.4107},
    "BOS": {"name": "Boston", "country": "USA", "stadium": "Gillette Stadium", "capacity": 65000, "matches": 7, "timezone": "America/New_York", "lat": 42.0909, "lng": -71.2643},
    "PHL": {"name": "Philadelphia", "country": "USA", "stadium": "Lincoln Financial Field", "capacity": 69000, "matches": 6, "timezone": "America/New_York", "lat": 39.9012, "lng": -75.1676},
    "MCI": {"name": "Kansas City", "country": "USA", "stadium": "Arrowhead Stadium", "capacity": 76000, "matches": 6, "timezone": "America/Chicago", "lat": 39.0489, "lng": -94.4839},
    "YYZ": {"name": "Toronto", "country": "Canada", "stadium": "BMO Field", "capacity": 45736, "matches": 6, "timezone": "America/Toronto", "lat": 43.6332, "lng": -79.4185},
    "VAN": {"name": "Vancouver", "country": "Canada", "stadium": "BC Place", "capacity": 54500, "matches": 7, "timezone": "America/Vancouver", "lat": 49.2767, "lng": -123.1117},
}

# =============================================================================
# TEAMS DATA
# =============================================================================

TEAMS = {
    "USA": {"name": "United States", "continent": "CONCACAF", "ranking": 11, "popularity": 85},
    "MEX": {"name": "Mexico", "continent": "CONCACAF", "ranking": 15, "popularity": 90},
    "CAN": {"name": "Canada", "continent": "CONCACAF", "ranking": 48, "popularity": 60},
    "ARG": {"name": "Argentina", "continent": "CONMEBOL", "ranking": 1, "popularity": 98},
    "BRA": {"name": "Brazil", "continent": "CONMEBOL", "ranking": 5, "popularity": 97},
    "FRA": {"name": "France", "continent": "UEFA", "ranking": 2, "popularity": 92},
    "ENG": {"name": "England", "continent": "UEFA", "ranking": 4, "popularity": 93},
    "ESP": {"name": "Spain", "continent": "UEFA", "ranking": 3, "popularity": 91},
    "GER": {"name": "Germany", "continent": "UEFA", "ranking": 16, "popularity": 88},
    "POR": {"name": "Portugal", "continent": "UEFA", "ranking": 6, "popularity": 89},
    "NED": {"name": "Netherlands", "continent": "UEFA", "ranking": 7, "popularity": 82},
    "ITA": {"name": "Italy", "continent": "UEFA", "ranking": 8, "popularity": 87},
    "COL": {"name": "Colombia", "continent": "CONMEBOL", "ranking": 12, "popularity": 78},
    "URU": {"name": "Uruguay", "continent": "CONMEBOL", "ranking": 14, "popularity": 75},
}

# =============================================================================
# TOOL IMPLEMENTATIONS
# =============================================================================

def get_host_cities() -> dict:
    """Get all 16 World Cup 2026 host cities with their data"""
    return {
        "total_cities": len(HOST_CITIES),
        "countries": ["USA", "Mexico", "Canada"],
        "cities": HOST_CITIES,
        "tournament_dates": {
            "start": "2026-06-11",
            "end": "2026-07-19",
            "total_days": 39,
            "total_matches": 104
        }
    }

def get_matches(city_code: str, date: Optional[str] = None) -> dict:
    """Get matches for a specific city and optional date"""
    city = HOST_CITIES.get(city_code.upper())
    if not city:
        return {"error": f"Invalid city code. Valid codes: {list(HOST_CITIES.keys())}"}

    # Generate sample matches
    wc_start = datetime(2026, 6, 11)
    wc_end = datetime(2026, 7, 19)

    matches = []
    current = wc_start
    match_num = 1

    while current <= wc_end and len(matches) < city["matches"]:
        # Distribute matches across the tournament
        if random.random() > 0.7:  # Not every day has a match
            team_codes = list(TEAMS.keys())
            home = random.choice(team_codes)
            away = random.choice([t for t in team_codes if t != home])

            # Determine stage based on date
            days_in = (current - wc_start).days
            if days_in <= 17:
                stage = "GROUP_STAGE"
            elif days_in <= 21:
                stage = "ROUND_OF_32"
            elif days_in <= 25:
                stage = "ROUND_OF_16"
            elif days_in <= 29:
                stage = "QUARTER_FINAL"
            elif days_in <= 33:
                stage = "SEMI_FINAL"
            else:
                stage = "FINAL"

            match = {
                "match_id": f"WC2026-{match_num:03d}",
                "date": current.strftime("%Y-%m-%d"),
                "time": random.choice(["12:00", "15:00", "18:00", "21:00"]),
                "home_team": {"code": home, **TEAMS[home]},
                "away_team": {"code": away, **TEAMS[away]},
                "stadium": city["stadium"],
                "city": city["name"],
                "stage": stage,
                "expected_attendance": int(city["capacity"] * random.uniform(0.9, 1.0))
            }
            matches.append(match)
            match_num += 1

        current += timedelta(days=random.randint(2, 5))

    # Filter by date if provided
    if date:
        matches = [m for m in matches if m["date"] == date]

    return {
        "city": city,
        "total_matches": len(matches),
        "matches": matches
    }

def predict_demand(
    city_code: str,
    business_category: str,
    date: str,
    distance_to_stadium_km: float = 5.0,
    capacity: int = 100
) -> dict:
    """
    Predict demand for a business on a specific date

    Args:
        city_code: Host city code (MEX, LAX, NYC, etc.)
        business_category: RESTAURANT, BAR_PUB, HOTEL, RETAIL, etc.
        date: Target date (YYYY-MM-DD)
        distance_to_stadium_km: Distance from stadium in km
        capacity: Business capacity
    """
    city = HOST_CITIES.get(city_code.upper())
    if not city:
        return {"error": f"Invalid city code"}

    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD"}

    # Check if during World Cup
    wc_start = datetime(2026, 6, 11)
    wc_end = datetime(2026, 7, 19)

    is_during_wc = wc_start <= target_date <= wc_end

    # Base demand calculation
    base_demand = 100  # Normal day = 100

    if is_during_wc:
        # World Cup bonus
        base_demand += 30

        # Day of week effect
        dow = target_date.weekday()
        if dow >= 5:  # Weekend
            base_demand += 20

        # Distance effect (closer = more demand)
        distance_factor = max(0, 1 - (distance_to_stadium_km / 20))
        base_demand += int(30 * distance_factor)

        # Check for matches on this date
        matches = get_matches(city_code, date)
        if matches.get("matches"):
            for match in matches["matches"]:
                # Match impact based on teams
                home_pop = match["home_team"].get("popularity", 50)
                away_pop = match["away_team"].get("popularity", 50)
                match_popularity = (home_pop + away_pop) / 2

                # Stage multiplier
                stage_multipliers = {
                    "GROUP_STAGE": 1.2,
                    "ROUND_OF_32": 1.5,
                    "ROUND_OF_16": 1.8,
                    "QUARTER_FINAL": 2.2,
                    "SEMI_FINAL": 2.8,
                    "FINAL": 4.0
                }
                stage_mult = stage_multipliers.get(match["stage"], 1.0)

                base_demand += int(match_popularity * stage_mult * distance_factor * 0.5)

        # Business category adjustments
        category_multipliers = {
            "RESTAURANT": 1.3,
            "BAR_PUB": 1.8,
            "HOTEL": 1.5,
            "RETAIL": 1.2,
            "TRANSPORTATION": 1.6,
            "FOOD_TRUCK": 1.4,
            "PARKING": 1.7
        }
        base_demand = int(base_demand * category_multipliers.get(business_category.upper(), 1.0))

    # Add some variance
    base_demand += random.randint(-10, 10)
    base_demand = max(50, min(300, base_demand))  # Clamp between 50-300

    # Determine impact level
    if base_demand >= 200:
        impact_level = "EXTREME"
    elif base_demand >= 170:
        impact_level = "VERY_HIGH"
    elif base_demand >= 140:
        impact_level = "HIGH"
    elif base_demand >= 115:
        impact_level = "MEDIUM"
    else:
        impact_level = "LOW"

    # Confidence based on data quality
    confidence = "HIGH" if is_during_wc else "MEDIUM"

    return {
        "city": city["name"],
        "date": date,
        "business_category": business_category,
        "demand_index": base_demand,
        "demand_level": impact_level,
        "confidence": confidence,
        "is_during_worldcup": is_during_wc,
        "factors": {
            "base_demand": 100,
            "worldcup_bonus": 30 if is_during_wc else 0,
            "weekend_bonus": 20 if target_date.weekday() >= 5 else 0,
            "proximity_bonus": int(30 * distance_factor) if is_during_wc else 0,
            "match_bonus": base_demand - 100 - (30 if is_during_wc else 0)
        },
        "recommendations": {
            "pricing_multiplier": round(1 + (base_demand - 100) / 200, 2),
            "staff_multiplier": round(base_demand / 100, 2),
            "inventory_multiplier": round(1 + (base_demand - 100) / 150, 2)
        }
    }

def get_pricing_recommendation(
    city_code: str,
    business_category: str,
    date: str,
    current_prices: Optional[dict] = None
) -> dict:
    """Get dynamic pricing recommendations for a business"""

    # Get demand prediction first
    demand = predict_demand(city_code, business_category, date)

    if "error" in demand:
        return demand

    demand_index = demand["demand_index"]

    # Calculate price adjustments
    if demand_index >= 200:
        min_mult, rec_mult, max_mult = 1.4, 1.5, 1.6
        strategy = "PREMIUM - Extreme demand justifies significant price increase"
    elif demand_index >= 170:
        min_mult, rec_mult, max_mult = 1.25, 1.35, 1.45
        strategy = "SURGE - Very high demand, increase prices moderately"
    elif demand_index >= 140:
        min_mult, rec_mult, max_mult = 1.15, 1.25, 1.35
        strategy = "ELEVATED - High demand, slight price increase recommended"
    elif demand_index >= 115:
        min_mult, rec_mult, max_mult = 1.05, 1.1, 1.2
        strategy = "MODERATE - Consider small price adjustments"
    else:
        min_mult, rec_mult, max_mult = 1.0, 1.0, 1.1
        strategy = "NORMAL - Maintain regular pricing"

    # Apply to current prices if provided
    adjusted_prices = None
    if current_prices:
        adjusted_prices = {
            item: {
                "current": price,
                "recommended": round(price * rec_mult, 2),
                "range": [round(price * min_mult, 2), round(price * max_mult, 2)]
            }
            for item, price in current_prices.items()
        }

    return {
        "city": demand["city"],
        "date": date,
        "demand_index": demand_index,
        "demand_level": demand["demand_level"],
        "pricing": {
            "min_multiplier": min_mult,
            "recommended_multiplier": rec_mult,
            "max_multiplier": max_mult,
            "strategy": strategy
        },
        "adjusted_prices": adjusted_prices,
        "competitor_insight": f"Similar businesses likely increasing prices {int((rec_mult-1)*100)}%",
        "tips": [
            "Consider time-based pricing (higher during match hours)",
            "Bundle deals can increase average ticket",
            "VIP/premium options for high-demand periods"
        ]
    }

def get_staffing_recommendation(
    city_code: str,
    date: str,
    normal_staff_count: int,
    business_hours: str = "10:00-22:00"
) -> dict:
    """Get staffing recommendations based on predicted demand"""

    demand = predict_demand(city_code, "RESTAURANT", date)

    if "error" in demand:
        return demand

    demand_index = demand["demand_index"]
    staff_multiplier = demand["recommendations"]["staff_multiplier"]

    recommended_staff = max(normal_staff_count, int(normal_staff_count * staff_multiplier))
    additional_needed = recommended_staff - normal_staff_count

    # Peak hours based on matches
    matches = get_matches(city_code, date)
    peak_hours = []

    if matches.get("matches"):
        for match in matches["matches"]:
            match_hour = int(match["time"].split(":")[0])
            # 2 hours before to 2 hours after
            peak_hours.extend([
                f"{max(0, match_hour-2):02d}:00",
                f"{max(0, match_hour-1):02d}:00",
                f"{match_hour:02d}:00",
                f"{min(23, match_hour+1):02d}:00",
                f"{min(23, match_hour+2):02d}:00"
            ])

    peak_hours = sorted(list(set(peak_hours)))

    # Skills needed
    skills_needed = ["customer service"]
    if demand_index >= 140:
        skills_needed.append("high-volume experience")
    if demand_index >= 170:
        skills_needed.append("bilingual (EN/ES)")
        skills_needed.append("crowd management")

    return {
        "city": demand["city"],
        "date": date,
        "demand_index": demand_index,
        "staffing": {
            "normal_staff": normal_staff_count,
            "recommended_staff": recommended_staff,
            "additional_needed": additional_needed,
            "staff_multiplier": staff_multiplier
        },
        "peak_hours": peak_hours if peak_hours else ["12:00-14:00", "18:00-22:00"],
        "skills_needed": skills_needed,
        "tips": [
            "Book temporary staff at least 1 week in advance",
            "Consider split shifts for peak periods",
            "Cross-train staff for multiple roles"
        ] if additional_needed > 0 else ["Normal staffing should suffice"]
    }

def get_weather_forecast(city_code: str, date: str) -> dict:
    """Get weather forecast for a city and date (simulated)"""
    city = HOST_CITIES.get(city_code.upper())
    if not city:
        return {"error": f"Invalid city code"}

    # Simulated weather (June-July = summer)
    # In production, this would call OpenWeather API
    base_temp = {
        "MEX": 22, "GDL": 24, "MTY": 30,  # Mexico
        "LAX": 24, "SFO": 18, "SEA": 20,  # West Coast
        "NYC": 26, "BOS": 24, "PHL": 27, "MIA": 30, "ATL": 29,  # East
        "DFW": 32, "HOU": 31, "MCI": 28,  # Central
        "YYZ": 23, "VAN": 19  # Canada
    }.get(city_code.upper(), 25)

    # Add some variance
    temp = base_temp + random.randint(-3, 5)

    conditions = random.choices(
        ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Hot"],
        weights=[40, 30, 15, 10, 5]
    )[0]

    rain_chance = {"Sunny": 5, "Partly Cloudy": 15, "Cloudy": 40, "Light Rain": 80, "Hot": 10}

    return {
        "city": city["name"],
        "date": date,
        "forecast": {
            "temperature_c": temp,
            "temperature_f": int(temp * 9/5 + 32),
            "conditions": conditions,
            "rain_chance_percent": rain_chance.get(conditions, 20),
            "humidity_percent": random.randint(40, 80),
            "wind_kph": random.randint(5, 25)
        },
        "impact_on_demand": {
            "outdoor_events": "favorable" if conditions in ["Sunny", "Partly Cloudy"] else "reduced",
            "indoor_preference": "high" if conditions in ["Light Rain", "Hot"] else "normal"
        },
        "note": "This is simulated data. In production, integrate with OpenWeather API."
    }

# =============================================================================
# MCP PROTOCOL HANDLER
# =============================================================================

TOOLS = {
    "get_host_cities": {
        "description": "Get all 16 FIFA World Cup 2026 host cities with stadium and match data",
        "parameters": {}
    },
    "get_matches": {
        "description": "Get World Cup matches for a specific host city and optional date",
        "parameters": {
            "city_code": {"type": "string", "description": "City code (MEX, LAX, NYC, etc.)", "required": True},
            "date": {"type": "string", "description": "Date in YYYY-MM-DD format", "required": False}
        }
    },
    "predict_demand": {
        "description": "Predict demand for a local business on a specific date during World Cup 2026",
        "parameters": {
            "city_code": {"type": "string", "description": "Host city code", "required": True},
            "business_category": {"type": "string", "description": "Business type: RESTAURANT, BAR_PUB, HOTEL, RETAIL, TRANSPORTATION, FOOD_TRUCK, PARKING", "required": True},
            "date": {"type": "string", "description": "Target date (YYYY-MM-DD)", "required": True},
            "distance_to_stadium_km": {"type": "number", "description": "Distance from stadium in km", "required": False},
            "capacity": {"type": "integer", "description": "Business capacity", "required": False}
        }
    },
    "get_pricing_recommendation": {
        "description": "Get dynamic pricing recommendations based on predicted demand",
        "parameters": {
            "city_code": {"type": "string", "description": "Host city code", "required": True},
            "business_category": {"type": "string", "description": "Business type", "required": True},
            "date": {"type": "string", "description": "Target date (YYYY-MM-DD)", "required": True},
            "current_prices": {"type": "object", "description": "Dict of item:price for specific recommendations", "required": False}
        }
    },
    "get_staffing_recommendation": {
        "description": "Get staffing recommendations based on predicted demand",
        "parameters": {
            "city_code": {"type": "string", "description": "Host city code", "required": True},
            "date": {"type": "string", "description": "Target date (YYYY-MM-DD)", "required": True},
            "normal_staff_count": {"type": "integer", "description": "Normal number of staff", "required": True},
            "business_hours": {"type": "string", "description": "Business hours (e.g., 10:00-22:00)", "required": False}
        }
    },
    "get_weather_forecast": {
        "description": "Get weather forecast for a host city (affects demand predictions)",
        "parameters": {
            "city_code": {"type": "string", "description": "Host city code", "required": True},
            "date": {"type": "string", "description": "Target date (YYYY-MM-DD)", "required": True}
        }
    }
}

def handle_request(request: dict) -> dict:
    """Handle incoming MCP requests"""
    method = request.get("method")
    params = request.get("params", {})
    request_id = request.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "worldcup-analytics",
                    "version": "1.0.0"
                }
            }
        }

    elif method == "tools/list":
        tools_list = []
        for name, info in TOOLS.items():
            tool = {
                "name": name,
                "description": info["description"],
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        k: {"type": v["type"], "description": v["description"]}
                        for k, v in info["parameters"].items()
                    },
                    "required": [k for k, v in info["parameters"].items() if v.get("required")]
                }
            }
            tools_list.append(tool)

        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"tools": tools_list}
        }

    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        try:
            if tool_name == "get_host_cities":
                result = get_host_cities()
            elif tool_name == "get_matches":
                result = get_matches(**arguments)
            elif tool_name == "predict_demand":
                result = predict_demand(**arguments)
            elif tool_name == "get_pricing_recommendation":
                result = get_pricing_recommendation(**arguments)
            elif tool_name == "get_staffing_recommendation":
                result = get_staffing_recommendation(**arguments)
            elif tool_name == "get_weather_forecast":
                result = get_weather_forecast(**arguments)
            else:
                result = {"error": f"Unknown tool: {tool_name}"}

            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result, indent=2, ensure_ascii=False)
                        }
                    ]
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }

    elif method == "notifications/initialized":
        # No response needed for notifications
        return None

    else:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32601,
                "message": f"Method not found: {method}"
            }
        }

def main():
    """Main loop for MCP server"""
    sys.stderr.write("WorldCup Analytics MCP Server started\n")
    sys.stderr.flush()

    while True:
        try:
            request = read_request()
            if request is None:
                continue

            response = handle_request(request)
            if response:
                send_response(response)

        except EOFError:
            break
        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")
            sys.stderr.flush()

if __name__ == "__main__":
    main()
