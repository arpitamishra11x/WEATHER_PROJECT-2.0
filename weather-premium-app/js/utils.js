/**
 * SkyCast Elite - Utility Engine
 * Production-grade helper functions
 */

const Utils = {
    /**
     * Format timestamp to local time string
     */
    formatTime(timestamp, timezoneOffset = 0, format = 'HH:mm') {
        const date = new Date((timestamp + timezoneOffset) * 1000);
        // Using UTC methods to handle the offset manually for precision
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return format === 'HH:mm' ? `${hours}:${minutes}` : date.toLocaleTimeString();
    },

    /**
     * Format timestamp to day name
     */
    getDayName(timestamp, short = false) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const date = new Date(timestamp * 1000);
        return short ? daysShort[date.getDay()] : days[date.getDay()];
    },

    /**
     * Degree to Compass Direction
     */
    degToCompass(num) {
        const val = Math.floor((num / 22.5) + 0.5);
        const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        return arr[(val % 16)];
    },

    /**
     * Debounce function for optimizations
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * AI Advice Generator based on weather
     */
    getAIAdvice(weatherCode, temp, humidity, uvIndex) {
        const adviceMap = {
            'Clear': ["Perfect day for outdoor activities. Bring sunglasses!", "High visibility today. Enjoy the clear skies."],
            'Rain': ["Don't forget your umbrella. Expect wet surfaces.", "Ideal time for cozy indoor work. Rain is expected."],
            'Clouds': ["Cloudy skies ahead. A light jacket might be needed.", "No direct UV today, but watch for sudden overcast."],
            'Snow': ["Stay warm! Salted roads recommended.", "Winter wonderland alert. Dress in layers."],
            'Thunderstorm': ["Stay indoors if possible. Electrical activity detected.", "Severe weather alert: Thunder and lightning likely."],
            'Drizzle': ["Light mist expected. A raincoat is a good choice.", "Persistent drizzle today. Visibility slightly reduced."],
            'Mist': ["Visibility is low. Drive carefully if you're out.", "Cool, misty conditions. Good for a contemplative walk."],
            'Fog': ["Dense fog detected. Expect travel delays.", "Visibility significantly reduced. High beams recommended."]
        };

        const defaultAdvice = ["Atmospheric pressure is stabilizing. Have a great day!", "Keep an eye on the local forecast updates."];
        const category = adviceMap[weatherCode] || defaultAdvice;
        
        let contextualInsights = [];
        
        // Temperature Context
        if (temp > 32) contextualInsights.push("High heat warning: Stay hydrated and seek shade.");
        else if (temp > 25) contextualInsights.push("Warm weather: Ideal for light clothing.");
        else if (temp < 0) contextualInsights.push("Freezing alert: Check your heating and dress in heavy layers.");
        else if (temp < 10) contextualInsights.push("Brisk conditions: A warm coat is necessary.");

        // UV Context
        if (uvIndex > 7) contextualInsights.push("Very high UV: High-protection SPF is mandatory.");
        else if (uvIndex > 5) contextualInsights.push("Moderate UV: Sunscreen recommended between 10am-4pm.");

        // Humidity Context
        if (humidity > 80) contextualInsights.push("High humidity: It might feel warmer than the actual temperature.");
        else if (humidity < 20) contextualInsights.push("Dry air detected: Consider using a humidifier indoors.");

        const mainAdvice = category[Math.floor(Math.random() * category.length)];
        const subAdvice = contextualInsights.slice(0, 2).join(' ');

        return `${mainAdvice} ${subAdvice}`.trim();
    },

    /**
     * Toggle Skeleton Loading
     */
    setLoading(isLoading) {
        document.body.classList.toggle('loading', isLoading);
        if (!isLoading) {
            document.querySelectorAll('.skeleton-text').forEach(el => el.classList.remove('skeleton-text'));
        }
    }
};
