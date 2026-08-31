'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Droplets, Wind, Thermometer, Search } from 'lucide-react';

interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  main: string;
}

interface WeatherError {
  error: string;
  setup?: string;
}

export default function WeatherWidget() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<WeatherError | null>(null);

  const fetchWeather = async () => {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    setWeather(null);

    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city.trim())}`);
      if (res.status === 503) {
        const data = await res.json();
        setError({ error: data.error, setup: data.setup });
      } else if (!res.ok) {
        setError({ error: 'City not found or API error.' });
      } else {
        const data = await res.json();
        setWeather(data);
      }
    } catch {
      setError({ error: 'Failed to fetch weather data.' });
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (main: string) => {
    const icons: Record<string, string> = {
      Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
      Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Haze: '🌫️',
    };
    return icons[main] || '🌤️';
  };

  return (
    <div className="bg-black/40 backdrop-blur border border-cyan-500/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4 text-cyan-400/60 text-xs tracking-widest">
        <Cloud size={14} /> WEATHER
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchWeather()}
          placeholder="Enter city..."
          className="flex-1 bg-white/5 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition-colors"
        />
        <button
          onClick={fetchWeather}
          disabled={loading}
          className="px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/25 disabled:opacity-50 transition-colors"
        >
          <Search size={16} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-6 text-cyan-400/60 text-xs tracking-wider">
          CONNECTING TO WEATHER API...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-4">
          <div className="text-red-400 text-sm mb-2">{error.error}</div>
          {error.setup && (
            <div className="text-xs text-gray-500 bg-white/5 rounded-lg p-3 mt-2">
              <div className="font-medium text-gray-400 mb-1">Setup Required</div>
              {error.setup}
            </div>
          )}
        </div>
      )}

      {/* Weather display */}
      {weather && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg text-white font-medium">
                {weather.city}, {weather.country}
              </div>
              <div className="text-sm text-gray-400 capitalize">{weather.description}</div>
            </div>
            <div className="text-4xl">{getWeatherIcon(weather.main)}</div>
          </div>

          <div className="text-3xl text-white font-light">
            {weather.temperature}°C
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Thermometer size={14} className="text-cyan-400" />
              Feels like {weather.feelsLike}°C
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Droplets size={14} className="text-cyan-400" />
              {weather.humidity}% humidity
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Wind size={14} className="text-cyan-400" />
              {weather.windSpeed} m/s wind
            </div>
          </div>
        </motion.div>
      )}

      {!weather && !loading && !error && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Enter a city to check the weather.
        </div>
      )}
    </div>
  );
}
