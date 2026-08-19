"""
GridSentinel — Step 1: Weather Data Fetcher
============================================
Fetches 1 year of historical weather for rural Maharashtra (Pune district)
from the Open-Meteo free API. No API key required.

Output: ml/data/raw/weather_maharashtra_2024.csv

Run:
    python ml/scripts/fetch_weather.py
"""

import requests
import pandas as pd
import os
import time

# ── Config ────────────────────────────────────────────────────────────────────
# Coordinates for Pune district rural area (Khed taluka — typical rural feeder region)
LATITUDE  = 18.51
LONGITUDE = 73.90
START     = "2024-01-01"
END       = "2024-12-31"
TIMEZONE  = "Asia/Kolkata"

OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "raw", "weather_maharashtra_2024.csv"
)
OUTPUT_PATH = os.path.normpath(OUTPUT_PATH)

# ── Open-Meteo historical archive API ────────────────────────────────────────
URL = "https://archive-api.open-meteo.com/v1/archive"
PARAMS = {
    "latitude":  LATITUDE,
    "longitude": LONGITUDE,
    "start_date": START,
    "end_date":   END,
    "hourly": ",".join([
        "rain",                # mm
        "windspeed_10m",       # km/h
        "temperature_2m",      # °C
        "relativehumidity_2m", # %
        "windgusts_10m",       # km/h — strong gusts cause vegetation contact faults
        "precipitation",       # mm — total (rain + snow equivalent)
        "cloudcover",          # % — proxy for lightning storm likelihood
    ]),
    "timezone": TIMEZONE,
}


def fetch_weather() -> pd.DataFrame:
    print(f"Fetching weather for lat={LATITUDE}, lon={LONGITUDE} ...")
    print(f"Date range: {START} → {END}")

    for attempt in range(3):
        try:
            response = requests.get(URL, params=PARAMS, timeout=30)
            response.raise_for_status()
            data = response.json()
            break
        except requests.exceptions.RequestException as e:
            print(f"  Attempt {attempt+1}/3 failed: {e}")
            if attempt < 2:
                time.sleep(5)
            else:
                raise RuntimeError("Failed to fetch weather after 3 attempts") from e

    hourly = data["hourly"]
    df = pd.DataFrame({
        "timestamp":       hourly["time"],
        "rain_mm":         hourly["rain"],
        "windspeed_kmh":   hourly["windspeed_10m"],
        "temp_ambient_C":  hourly["temperature_2m"],
        "humidity_pct":    hourly["relativehumidity_2m"],
        "windgust_kmh":    hourly["windgusts_10m"],
        "precipitation_mm": hourly["precipitation"],
        "cloudcover_pct":  hourly["cloudcover"],
    })

    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # Derived feature: lightning risk score (0–1)
    # High rain + high wind + high cloudcover = elevated lightning risk
    df["lightning_risk"] = (
        (df["rain_mm"].clip(0, 50) / 50.0) * 0.5 +
        (df["windgust_kmh"].clip(0, 80) / 80.0) * 0.3 +
        (df["cloudcover_pct"] / 100.0) * 0.2
    ).round(4)

    # Derived feature: vegetation_contact_risk (0–1)
    # High wind + high humidity = branches swing, touch lines
    df["vegetation_risk"] = (
        (df["windspeed_kmh"].clip(0, 60) / 60.0) * 0.6 +
        (df["humidity_pct"].clip(0, 100) / 100.0) * 0.4
    ).round(4)

    df.fillna(0.0, inplace=True)
    return df


def main():
    df = fetch_weather()

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)

    print(f"\n✅ Saved {len(df):,} hourly rows → {OUTPUT_PATH}")
    print(df.head(3).to_string())
    print(f"\nDate range in data: {df['timestamp'].min()} → {df['timestamp'].max()}")
    print(f"Columns: {list(df.columns)}")


if __name__ == "__main__":
    main()
