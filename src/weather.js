
export const DEFAULT_CITY = {
  id: "rabat-ma",
  name: "Rabat",
  country: "Morocco",
  latitude: 34.0209,
  longitude: -6.8416
};

// Weather conditions
export function weatherInfo(code, isDay = true) {
  if (code === 0) {
    return {
      icon: isDay ? "☀️" : "🌙",
      label: "Clear sky"
    };
  }

  if ([1, 2].includes(code)) {
    return {
      icon: isDay ? "🌤️" : "☁️",
      label: "Partly cloudy"
    };
  }

  if (code === 3) {
    return { icon: "☁️", label: "Cloudy" };
  }

  if ([45, 48].includes(code)) {
    return { icon: "🌫️", label: "Foggy" };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return { icon: "🌦️", label: "Drizzle" };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { icon: "🌧️", label: "Rainy" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { icon: "❄️", label: "Snowy" };
  }

  if ([95, 96, 99].includes(code)) {
    return { icon: "⛈️", label: "Thunderstorm" };
  }

  return { icon: "🌡️", label: "Weather" };
}

// Format time
export function formatClock(date) {
  return date?.slice(11, 16) || "--:--";
}

export function formatHour(date) {
  return formatClock(date);
}

// Format date
export function formatDay(date, options = {}) {
  return new Date(
    date.slice(0, 10) + "T12:00:00"
  ).toLocaleDateString("en-US", options);
}

// Search for cities
export async function geocodeCity(query, signal) {
  const apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;

  if (apiKey) {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: "5",
      appid: apiKey
    });

    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?${params}`,
      { signal }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Invalid or inactive OpenWeatherMap API key."
        );
      }

      throw new Error("Unable to search for cities.");
    }

    const data = await response.json();

    return data.map((item) => ({
      id: `${item.lat}-${item.lon}`,
      name: item.name,
      country: item.country,
      admin1: item.state || "",
      latitude: item.lat,
      longitude: item.lon
    }));
  }

  // Fallback: Open-Meteo Geocoding API
  const params = new URLSearchParams({
    name: query.trim(),
    count: "5",
    language: "en",
    format: "json"
  });

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error("Unable to search for cities.");
  }

  const data = await response.json();

  return (data.results || []).map((item) => ({
    id: item.id,
    name: item.name,
    country: item.country,
    admin1: item.admin1 || "",
    latitude: item.latitude,
    longitude: item.longitude
  }));
}

// Get live weather and forecasts
export async function getWeather(city, unit, signal) {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),

    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "is_day"
    ].join(","),

    hourly: [
      "temperature_2m",
      "weather_code",
      "precipitation_probability"
    ].join(","),

    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "uv_index_max",
      "sunrise",
      "sunset"
    ].join(","),

    temperature_unit:
      unit === "fahrenheit" ? "fahrenheit" : "celsius",

    wind_speed_unit: "kmh",
    timezone: "auto",
    forecast_days: "7"
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error("Unable to load weather data.");
  }

  const data = await response.json();

  if (!data.current || !data.hourly || !data.daily) {
    throw new Error("Incomplete weather information.");
  }

  return data;
}
