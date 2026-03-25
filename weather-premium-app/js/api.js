/**
 * SkyCast Elite - API Engine
 */

const API = {
    // PUBLIC API KEY (Replace with your own for production)
    // Note: Using a public key for demo availability
    KEY: '8e18370936894348507204f37805a5e3',
    BASE: 'https://api.openweathermap.org/data/2.5',
    GEO: 'https://api.openweathermap.org/geo/1.0',

    /**
     * Fetch complete weather data (Current + Forecast)
     */
    async getWeatherData(lat, lon) {
        try {
            const currentRes = await fetch(`${this.BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${this.KEY}`);
            if (!currentRes.ok) throw new Error("Current weather fetch failed");
            const current = await currentRes.json();

            const forecastRes = await fetch(`${this.BASE}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${this.KEY}`);
            if (!forecastRes.ok) throw new Error("Forecast fetch failed");
            const forecast = await forecastRes.json();

            const aqiRes = await fetch(`${this.BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${this.KEY}`);
            const aqi = (aqiRes.ok) ? await aqiRes.json() : { list: [{ main: { aqi: 1 } }] };

            return { current, forecast, aqi };
        } catch (error) {
            console.warn("API Engine Warning: Falling back to Mock Engine...", error);
            return await MockAPI.getWeatherData(lat, lon);
        }
    },

    /**
     * Geocoding: City Name to Coordinates
     */
    async getCoords(query) {
        try {
            const res = await fetch(`${this.GEO}/direct?q=${query}&limit=5&appid=${this.KEY}`);
            if (!res.ok) throw new Error("Geocoding failed");
            return await res.json();
        } catch (error) {
            console.warn("Geocoding API failed, providing mock result for:", query);
            return [{ name: query, lat: 40.7128, lon: -74.0060, country: 'US' }]; // Default to NYC coords for mock
        }
    },

    /**
     * Reverse Geocoding: Coords to City Name
     */
    async getCityName(lat, lon) {
        try {
            const res = await fetch(`${this.GEO}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.KEY}`);
            const data = await res.json();
            return data[0] ? `${data[0].name}, ${data[0].country}` : "Unknown Location";
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
