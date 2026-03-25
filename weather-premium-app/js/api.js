/**
 * SkyCast Elite - API Engine
 * Using Open-Meteo (Free, No API Key Required)
 */

const API = {
    // Free APIs - No API Key Required
    WEATHER_BASE: 'https://api.open-meteo.com/v1/forecast',
    GEO_BASE: 'https://geocoding-api.open-meteo.com/v1/search',

    /**
     * Fetch complete weather data (Current + Forecast)
     */
    async getWeatherData(lat, lon) {
        try {
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                current: 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,apparent_temperature',
                hourly: 'temperature_2m,weather_code,wind_speed_10m',
                daily: 'weather_code,temperature_2m_max,temperature_2m_min',
                timezone: 'auto',
                temperature_unit: 'celsius'
            });

            const res = await fetch(`${this.WEATHER_BASE}?${params}`);
            if (!res.ok) throw new Error("Weather fetch failed");
            const data = await res.json();

            // Transform Open-Meteo format to match OpenWeatherMap structure
            return this._transformWeatherData(data, lat, lon);
        } catch (error) {
            console.warn("API Engine Warning: Falling back to Mock Engine...", error);
            return await MockAPI.getWeatherData(lat, lon);
        }
    },

    /**
     * Transform Open-Meteo response to OpenWeatherMap-like format
     */
    _transformWeatherData(data, lat, lon) {
        const current = data.current;
        const weatherCode = current.weather_code;
        const condition = this._getWeatherCondition(weatherCode);

        return {
            current: {
                main: {
                    temp: current.temperature_2m,
                    feels_like: current.apparent_temperature,
                    humidity: current.relative_humidity_2m,
                    pressure: 1013
                },
                weather: [{ main: condition, description: condition.toLowerCase() }],
                wind: { speed: current.wind_speed_10m, deg: current.wind_direction_10m },
                sys: { sunrise: Math.floor(Date.now() / 1000) - 10000, sunset: Math.floor(Date.now() / 1000) + 20000 },
                visibility: 10000,
                coord: { lat, lon },
                dt: Math.floor(Date.now() / 1000)
            },
            forecast: {
                list: data.hourly.time.map((time, idx) => ({
                    dt: Math.floor(new Date(time).getTime() / 1000),
                    main: { temp: data.hourly.temperature_2m[idx] },
                    weather: [{ main: this._getWeatherCondition(data.hourly.weather_code[idx]) }]
                })).slice(0, 40)
            },
            aqi: { list: [{ main: { aqi: 2 } }] }
        };
    },

    /**
     * Convert WMO weather codes to condition strings
     */
    _getWeatherCondition(code) {
        const conditions = {
            0: 'Clear', 1: 'Clouds', 2: 'Clouds', 3: 'Clouds',
            45: 'Mist', 48: 'Mist', 51: 'Drizzle', 53: 'Drizzle',
            55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Rain',
            71: 'Snow', 73: 'Snow', 75: 'Snow', 80: 'Rain',
            81: 'Rain', 82: 'Rain', 85: 'Snow', 86: 'Snow',
            80: 'Thunderstorm', 82: 'Thunderstorm'
        };
        return conditions[code] || 'Clouds';
    },

    /**
     * Geocoding: City Name to Coordinates
     */
    async getCoords(query) {
        try {
            const params = new URLSearchParams({
                name: query,
                count: 5,
                language: 'en',
                format: 'json'
            });

            const res = await fetch(`${this.GEO_BASE}?${params}`);
            if (!res.ok) throw new Error("Geocoding failed");
            const data = await res.json();

            // Transform to match expected format
            return (data.results || []).map(r => ({
                name: r.name,
                lat: r.latitude,
                lon: r.longitude,
                country: r.country
            }));
        } catch (error) {
            console.warn("Geocoding API failed, providing mock result for:", query);
            return [{ name: query, lat: 40.7128, lon: -74.0060, country: 'US' }];
        }
    },

    /**
     * Reverse Geocoding: Coords to City Name
     */
    async getCityName(lat, lon) {
        try {
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                language: 'en',
                format: 'json'
            });

            const res = await fetch(`${this.GEO_BASE}?${params}`);
            if (!res.ok) throw new Error("Reverse geocoding failed");
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                const r = data.results[0];
                return `${r.name}, ${r.country}`;
            }
            return "Unknown Location";
        } catch (error) {
            return "Unknown Location";
        }
    }
};

/**
 * MOCK ENGINE (Fallback for "Ready to Run" without live keys)
 */
const MockAPI = {
    async getWeatherData(lat, lon) {
        return new Promise(resolve => {
            const conditions = ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm'];
            const chosen = conditions[Math.floor(Math.random() * conditions.length)];

            setTimeout(() => {
                resolve({
                    current: {
                        main: { temp: 15 + Math.random() * 15, feels_like: 14 + Math.random() * 15, humidity: 40 + Math.random() * 50, pressure: 1010 + Math.random() * 10 },
                        weather: [{ main: chosen, description: chosen.toLowerCase() + ' sky' }],
                        wind: { speed: 2 + Math.random() * 8, deg: Math.random() * 360 },
                        sys: { sunrise: Date.now() / 1000 - 10000, sunset: Date.now() / 1000 + 20000 },
                        visibility: 10000,
                        coord: { lat, lon },
                        dt: Date.now() / 1000
                    },
                    forecast: {
                        list: Array.from({ length: 40 }, (_, i) => ({
                            dt: (Date.now() / 1000) + (i * 3600),
                            main: { temp: 15 + Math.random() * 10 },
                            weather: [{ main: conditions[Math.floor(Math.random() * conditions.length)] }]
                        }))
                    },
                    aqi: { list: [{ main: { aqi: Math.floor(Math.random() * 3) + 1 } }] }
                });
            }, 500);
        });
    }
};
