
import { useEffect, useMemo, useRef, useState } from "react";

import {
  CalendarDays, CloudSun, Compass, Droplets,
  Heart, LoaderCircle, LocateFixed, MapPin,
  RefreshCw, Search, Sunrise, Sunset,
  Thermometer, Wind, X, Sun, Moon
} from "lucide-react";

import {
  DEFAULT_CITY,
  formatClock,
  formatDay,
  formatHour,
  geocodeCity,
  getWeather,
  weatherInfo
} from "./weather.js";

function savedValue(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [city, setCity] = useState(() =>
    savedValue("skycast:lastCity", DEFAULT_CITY)
  );

  const [unit, setUnit] = useState(() =>
    savedValue("skycast:unit", "celsius")
  );

  const [favorites, setFavorites] = useState(() =>
    savedValue("skycast:favorites", [])
  );

  const [theme, setTheme] = useState(() =>
    savedValue("skycast:theme", "dark")
  );

  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const searchRef = useRef(null);

  // Save preferences
  useEffect(() => {
    localStorage.setItem(
      "skycast:lastCity",
      JSON.stringify(city)
    );
  }, [city]);

  useEffect(() => {
    localStorage.setItem(
      "skycast:unit",
      JSON.stringify(unit)
    );
  }, [unit]);

  useEffect(() => {
    localStorage.setItem(
      "skycast:favorites",
      JSON.stringify(favorites)
    );
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(
      "skycast:theme",
      JSON.stringify(theme)
    );
  }, [theme]);

  // Load weather
  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setWeather(null);
    setError("");

    getWeather(city, unit, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setWeather(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [city, unit, refreshKey]);

  // Search cities
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    const controller = new AbortController();

    setSearching(true);
    setResults([]);
    setSearchError("");

    const timer = setTimeout(() => {
      geocodeCity(trimmed, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) {
            setResults(items);
            setSearching(false);
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setSearchError(err.message);
            setSearching(false);
          }
        });
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close search
  useEffect(() => {
    function closeOutside(event) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOutside);

    return () =>
      document.removeEventListener(
        "pointerdown",
        closeOutside
      );
  }, []);

  const isFavorite = favorites.some(
    (item) => item.id === city.id
  );

  const symbol = unit === "celsius" ? "°C" : "°F";
  const current = weather?.current;
  const today = weather?.daily;

  const conditions = current
    ? weatherInfo(
        current.weather_code,
        Boolean(current.is_day)
      )
    : null;

  const hourly = useMemo(() => {
    if (!weather) return [];

    const times = weather.hourly.time;
    const currentHour =
      weather.current.time.slice(0, 13) + ":00";

    const index = times.findIndex(
      (time) => time >= currentHour
    );

    const start = Math.max(0, index);

    return times
      .slice(start, start + 8)
      .map((time, offset) => {
        const i = start + offset;

        return {
          time,
          temp: weather.hourly.temperature_2m[i],
          rain: weather.hourly.precipitation_probability[i],
          code: weather.hourly.weather_code[i]
        };
      });
  }, [weather]);

  function chooseCity(nextCity) {
    setCity(nextCity);
    setQuery("");
    setResults([]);
    setSearchOpen(false);
    setSearchError("");
  }

  function toggleFavorite() {
    setFavorites((prev) =>
      isFavorite
        ? prev.filter((item) => item.id !== city.id)
        : [...prev, city]
    );
  }

  function toggleTheme() {
    setTheme((prev) =>
      prev === "dark" ? "light" : "dark"
    );
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        chooseCity({
          id: `gps-${lat.toFixed(3)}-${lon.toFixed(3)}`,
          name: "My location",
          country: "Current location",
          latitude: lat,
          longitude: lon
        });
      },
      () => {
        setError(
          "Location unavailable. Search for a city instead."
        );
      },
      { timeout: 10000 }
    );
  }

  return (
    <div
      className={`app-shell ${
        theme === "light" ? "light-mode" : "dark-mode"
      }`}
    >
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="dashboard">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <a
            className="brand"
            href="#home"
            aria-label="SkyCast home"
          >
            <span className="brand-mark">
              <CloudSun size={25} />
            </span>

            <span>
              sky<span className="brand-accent">cast</span>
              <small>WEATHER, BEAUTIFULLY</small>
            </span>
          </a>

          <div className="sidebar-label">
            WORKSPACE
          </div>

          <a className="nav-link active" href="#home">
            <CloudSun size={19} />
            Overview
            <span className="active-dot" />
          </a>

          <a className="nav-link" href="#forecast">
            <CalendarDays size={19} />
            Forecast
          </a>

          <div className="sidebar-label cities-label">
            SAVED LOCATIONS
          </div>

          {favorites.length === 0 ? (
            <p className="empty-favorites">
              Save a location using the heart icon.
            </p>
          ) : (
            favorites.map((item) => (
              <button
                key={item.id}
                className={`nav-link location-link ${
                  item.id === city.id ? "selected" : ""
                }`}
                onClick={() => chooseCity(item)}
              >
                <MapPin size={16} />
                <span>{item.name}</span>
              </button>
            ))
          )}

          <div className="sidebar-bottom">
            <div className="sidebar-weather-icon">
              ✦
            </div>

            <strong>Your weather, your way.</strong>

            <p>
              Real-time forecasts for wherever life
              takes you.
            </p>

            <span className="powered">
              Powered by{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Open-Meteo
              </a>
            </span>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main-content" id="home">

          {/* TOPBAR */}
          <header className="topbar">
            <div className="mobile-brand">
              <CloudSun size={24} />
              skycast
            </div>

            <div className="breadcrumbs">
              Dashboard <span>/</span>
              <b>Weather overview</b>
            </div>

            <div className="top-actions">

              {/* SEARCH */}
              <div
                className="search-wrap"
                ref={searchRef}
              >
                <Search
                  size={18}
                  className="search-icon"
                />

                <input
                  aria-label="Search for a city"
                  value={query}
                  placeholder="Search any city..."
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !searching &&
                      results.length
                    ) {
                      chooseCity(results[0]);
                    }

                    if (e.key === "Escape") {
                      setSearchOpen(false);
                    }
                  }}
                />

                {query && (
                  <button
                    className="clear-btn"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("");
                      setSearchOpen(false);
                    }}
                  >
                    <X size={15} />
                  </button>
                )}

                {searchOpen &&
                  query.trim().length >= 2 && (
                    <div className="search-results">
                      {searching && (
                        <div className="result-note">
                          <LoaderCircle
                            className="spin"
                            size={16}
                          />
                          Finding cities...
                        </div>
                      )}

                      {!searching && searchError && (
                        <div className="result-note error-text">
                          {searchError}
                        </div>
                      )}

                      {!searching &&
                        !searchError &&
                        results.length === 0 && (
                          <div className="result-note">
                            No matching cities found.
                          </div>
                        )}

                      {!searching &&
                        results.map((item) => (
                          <button
                            key={item.id}
                            className="search-result"
                            onClick={() => chooseCity(item)}
                          >
                            <MapPin size={16} />

                            <span>
                              <strong>
                                {item.name}
                              </strong>
                              <small>
                                {[
                                  item.admin1,
                                  item.country
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </small>
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
              </div>

              {/* THEME BUTTON */}
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                title={
                  theme === "dark"
                    ? "Light Mode"
                    : "Dark Mode"
                }
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {theme === "dark" ? (
                  <Sun size={19} />
                ) : (
                  <Moon size={19} />
                )}
              </button>

              {/* UNIT BUTTON */}
              <button
                className="unit-toggle"
                onClick={() =>
                  setUnit((prev) =>
                    prev === "celsius"
                      ? "fahrenheit"
                      : "celsius"
                  )
                }
              >
                {symbol}
                <span className="unit-switch">
                  {" "}⇄
                </span>
              </button>
            </div>
          </header>

          {/* PAGE HEADING */}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                YOUR DAILY FORECAST <span>✦</span>
              </div>

              <h1>
                Good day, explorer{" "}
                <span className="heading-sparkle">
                  ✳
                </span>
              </h1>

              <p>
                Here's what's happening in your sky today.
              </p>
            </div>

            <button
              className="refresh-button"
              disabled={loading}
              onClick={() =>
                setRefreshKey((prev) => prev + 1)
              }
            >
              <RefreshCw
                size={16}
                className={loading ? "spin" : ""}
              />
              Refresh
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="error-banner"
            >
              {error}
              <button
                onClick={() =>
                  setRefreshKey((prev) => prev + 1)
                }
              >
                Try again
              </button>
            </div>
          )}

          {/* CURRENT WEATHER */}
          <section
            className={`hero-card ${
              current?.is_day === 0
                ? "hero-night"
                : ""
            }`}
          >
            <div className="hero-glow" />
            <div className="hero-orbit orbit-a" />
            <div className="hero-orbit orbit-b" />

            <div className="hero-top">
              <div className="hero-location">
                <MapPin size={18} />
                <span>
                  {city.name}
                  {city.country &&
                  city.country !== "Current location"
                    ? `, ${city.country}`
                    : ""}
                </span>
              </div>

              <div className="hero-controls">
                <button
                  className={`hero-heart ${
                    isFavorite ? "liked" : ""
                  }`}
                  onClick={toggleFavorite}
                  aria-label="Toggle favorite"
                >
                  <Heart
                    size={19}
                    fill={
                      isFavorite
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>

                <button
                  className="hero-heart"
                  onClick={useMyLocation}
                  aria-label="Use my location"
                >
                  <LocateFixed size={19} />
                </button>
              </div>
            </div>

            {loading && !weather ? (
              <div className="hero-loading">
                <LoaderCircle
                  className="spin"
                  size={34}
                />
                Loading weather...
              </div>
            ) : current ? (
              <div className="hero-body">
                <div className="hero-measure">
                  <div className="hero-label">
                    CURRENT WEATHER
                    <span className="live-indicator" />
                    LIVE DATA
                  </div>

                  <div className="hero-temp">
                    {Math.round(
                      current.temperature_2m
                    )}
                    <span>°</span>
                  </div>

                  <div className="hero-description">
                    {conditions?.label}
                  </div>

                  <div className="hero-feels">
                    Feels like{" "}
                    {Math.round(
                      current.apparent_temperature
                    )}
                    {symbol}
                  </div>
                </div>

                <div className="hero-illustration">
                  <div className="sun-disc" />
                  <span>{conditions?.icon}</span>
                </div>
              </div>
            ) : null}

            <div className="hero-footer">
              <span>
                <span className="footer-dot" />
                {loading
                  ? "Updating forecast..."
                  : weather
                  ? `Updated ${formatClock(
                      weather.current.time
                    )} · ${
                      weather.timezone_abbreviation ||
                      "local time"
                    }`
                  : "Weather unavailable"}
              </span>

              <span>
                {weather
                  ? formatDay(
                      weather.current.time.slice(0, 10),
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric"
                      }
                    )
                  : "—"}
              </span>
            </div>
          </section>

          {/* HIGHLIGHTS */}
          <div className="section-header">
            <div>
              <div className="section-kicker">
                THE DETAILS
              </div>
              <h2>Today's highlights</h2>
            </div>

            <span className="section-subtle">
              Your weather at a glance
            </span>
          </div>

          <div className="highlights-grid">

            <div className="metric-card">
              <div className="metric-top">
                <span>Feels like</span>
                <span className="metric-icon purple">
                  <Thermometer size={19} />
                </span>
              </div>

              <div className="metric-value">
                {current
                  ? Math.round(
                      current.apparent_temperature
                    )
                  : "—"}
                <small>{symbol}</small>
              </div>
              <p>Perceived temperature</p>
              <div className="metric-decoration temp-decoration" />
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Humidity</span>
                <span className="metric-icon blue">
                  <Droplets size={19} />
                </span>
              </div>

              <div className="metric-value">
                {current
                  ? Math.round(
                      current.relative_humidity_2m
                    )
                  : "—"}
                <small>%</small>
              </div>

              <p>Relative humidity</p>

              <div className="humidity-bar">
                <span
                  style={{
                    width: `${
                      current?.relative_humidity_2m ?? 0
                    }%`
                  }}
                />
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Wind speed</span>
                <span className="metric-icon mint">
                  <Wind size={19} />
                </span>
              </div>

              <div className="metric-value">
                {current
                  ? Math.round(current.wind_speed_10m)
                  : "—"}
                <small>km/h</small>
              </div>

              <p>At 10 meters above ground</p>
              <div className="metric-decoration wind-decoration">
                〰
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>UV index</span>
                <span className="metric-icon orange">
                  <Compass size={19} />
                </span>
              </div>

              <div className="metric-value">
                {today?.uv_index_max?.[0] != null
                  ? Math.round(
                      today.uv_index_max[0]
                    )
                  : "—"}
                <small>UV</small>
              </div>

              <p>Daily maximum</p>
              <div className="uv-gradient" />
            </div>
          </div>

          {/* FORECAST */}
          <div
            className="forecast-grid"
            id="forecast"
          >
            <section className="panel hourly-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">
                    NEXT UP
                  </div>
                  <h2>Hourly forecast</h2>
                </div>

                <span className="pill">
                  Next 8 hours
                </span>
              </div>

              <div className="hourly-list">
                {hourly.length ? (
                  hourly.map((hour, index) => (
                    <div
                      className="hour-block"
                      key={hour.time}
                    >
                      <span className="hour-name">
                        {index === 0
                          ? "Now"
                          : formatHour(hour.time)}
                      </span>

                      <span className="hour-icon">
                        {weatherInfo(hour.code).icon}
                      </span>

                      <b>
                        {Math.round(hour.temp)}°
                      </b>

                      <small>
                        <Droplets size={12} />
                        {hour.rain ?? 0}%
                      </small>
                    </div>
                  ))
                ) : (
                  <p className="placeholder">
                    {loading
                      ? "Loading hourly forecast..."
                      : "No hourly forecast available."}
                  </p>
                )}
              </div>
            </section>

            {/* SUNRISE / SUNSET */}
            <section className="panel sun-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">
                    DAYLIGHT
                  </div>
                  <h2>Sun & moon</h2>
                </div>

                <span className="sun-mini">
                  ☀
                </span>
              </div>

              <div className="sun-arc">
                <svg
                  viewBox="0 0 280 100"
                  aria-hidden="true"
                >
                  <path
                    d="M20 90 Q140 -62 260 90"
                    fill="none"
                    stroke="rgba(255,255,255,.14)"
                    strokeDasharray="5 6"
                    strokeWidth="2"
                  />

                  <path
                    d="M20 90 Q140 -62 260 90"
                    fill="none"
                    stroke="url(#arcGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  <circle
                    cx="140"
                    cy="11"
                    r="10"
                    fill="#ffc978"
                  />

                  <defs>
                    <linearGradient id="arcGradient">
                      <stop stopColor="#826eea" />
                      <stop
                        offset="1"
                        stopColor="#ffc978"
                      />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="sun-times">
                <div>
                  <Sunrise size={17} />
                  <span>
                    Sunrise
                    <strong>
                      {today
                        ? formatClock(
                            today.sunrise[0]
                          )
                        : "—"}
                    </strong>
                  </span>
                </div>

                <div>
                  <Sunset size={17} />
                  <span>
                    Sunset
                    <strong>
                      {today
                        ? formatClock(
                            today.sunset[0]
                          )
                        : "—"}
                    </strong>
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* WEEKLY FORECAST */}
          <section className="panel weekly-panel">
            <div className="panel-heading">
              <div>
                <div className="section-kicker">
                  PLAN AHEAD
                </div>
                <h2>7-day forecast</h2>
              </div>

              <span className="pill">
                <CalendarDays size={14} />
                This week
              </span>
            </div>

            <div className="week-list">
              {today ? (
                today.time.map((date, index) => {
                  const info = weatherInfo(
                    today.weather_code[index]
                  );

                  const min = Math.round(
                    today.temperature_2m_min[index]
                  );

                  const max = Math.round(
                    today.temperature_2m_max[index]
                  );

                  return (
                    <div
                      className="week-row"
                      key={date}
                    >
                      <div className="day-col">
                        <strong>
                          {index === 0
                            ? "Today"
                            : formatDay(date, {
                                weekday: "long"
                              })}
                        </strong>

                        <small>
                          {formatDay(date, {
                            month: "short",
                            day: "numeric"
                          })}
                        </small>
                      </div>

                      <div className="condition-col">
                        <span>
                          {info.icon}
                        </span>
                        {info.label}
                      </div>

                      <div className="rain-col">
                        <Droplets size={14} />
                        {today
                          .precipitation_probability_max?.[
                            index
                          ] ?? 0}%
                      </div>

                      <div className="temperature-range">
                        <span>
                          {min}°
                        </span>

                        <div className="range-track">
                          <div
                            className="range-fill"
                            style={{
                              left: `${Math.max(
                                0,
                                Math.min(
                                  90,
                                  ((min + 15) / 65) * 100
                                )
                              )}%`,
                              width: `${Math.max(
                                8,
                                Math.min(
                                  100,
                                  ((max - min) / 65) * 100
                                )
                              )}%`
                            }}
                          />
                        </div>

                        <strong>
                          {max}°
                        </strong>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="placeholder">
                  {loading
                    ? "Loading weekly forecast..."
                    : "No weekly forecast available."}
                </p>
              )}
            </div>
          </section>

          {/* FOOTER */}
          
<footer className="footer">
  <p>
    Designed & Developed with ❤️ by
    <strong> Benaissa Ayach</strong>
  </p>
  <small>© 2026 SkyCast. All rights reserved.</small>
  <small>
    Weather data by{" "}
    <a href="https://open-meteo.com/">
      Open-Meteo
    </a>
  </small>
</footer>

        </main>
      </div>
    </div>
  );
}

export default App;
