/**
 * SkyCast Elite - Core Application Engine
 */

class SkyCastApp {
    constructor() {
        this.state = {
            currentCity: 'San Francisco',
            coords: { lat: 37.7749, lon: -122.4194 },
            weatherData: null,
            favorites: JSON.parse(localStorage.getItem('skycast_favs')) || ['New York', 'London', 'Tokyo'],
            units: 'metric',
            notifications: []
        };

        this.map = null;
        this.init();
    }

    async init() {
        console.log("SkyCast Elite Initializing...");
        
        // 1. Initialize UI Elements
        this.cacheDOM();
        this.bindEvents();
        this.startClock();
        this.initMap();
        this.initParticles();
        this.renderFavorites();

        // 2. Load Initial Data
        await this.fetchAndRender();

        // 3. Lucide Icons
        lucide.createIcons();
    }

    cacheDOM() {
        this.dom = {
            search: document.getElementById('global-search'),
            autocomplete: document.getElementById('search-autocomplete'),
            favList: document.getElementById('favorites-list'),
            cityName: document.getElementById('city-name'),
            mainTemp: document.getElementById('main-temp'),
            condition: document.getElementById('weather-condition'),
            hourlyList: document.getElementById('hourly-list'),
            dailyList: document.getElementById('daily-list'),
            aiInsight: document.getElementById('ai-insight-text'),
            voiceBtn: document.getElementById('voice-trigger'),
            voiceOverlay: document.getElementById('voice-overlay'),
            localClock: document.getElementById('local-clock')
        };
    }

    bindEvents() {
        // View Switching
        document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
                
                // Update active button
                document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Search & Autocomplete
        this.dom.search.addEventListener('input', Utils.debounce(e => this.handleSearchInput(e), 400));
        
        // Keyboard Shortcuts (CMD+K)
        window.addEventListener('keydown', e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.dom.search.focus();
            }
        });

        // Voice Search
        this.dom.voiceBtn.addEventListener('click', () => this.startVoiceSearch());

        // Geolocation
        document.getElementById('current-location-btn').addEventListener('click', () => this.getCurrentLocation());

        // Close search list on outside click
        document.addEventListener('click', (e) => {
            if (!this.dom.search.contains(e.target)) {
                this.dom.autocomplete.classList.add('hidden');
            }
        });
    }

    renderFavorites() {
        if (!this.dom.favList) return;
        this.dom.favList.innerHTML = this.state.favorites.map(city => `
            <button class="nav-btn fav-city" data-city="${city}" title="${city}">
                <span class="city-abbr">${city.substring(0, 1)}</span>
            </button>
        `).join('') + `
            <button class="nav-btn" id="add-favorite" title="Add Current Location">
                <i data-lucide="plus"></i>
            </button>
        `;
        
        lucide.createIcons();
        
        // Favorite clicks
        this.dom.favList.querySelectorAll('.fav-city').forEach(btn => {
            btn.addEventListener('click', async () => {
                const results = await API.getCoords(btn.dataset.city);
                if (results[0]) {
                    this.state.coords = { lat: results[0].lat, lon: results[0].lon };
                    this.state.currentCity = results[0].name;
                    await this.fetchAndRender();
                }
            });
        });

        document.getElementById('add-favorite').addEventListener('click', () => {
            if (!this.state.favorites.includes(this.state.currentCity)) {
                this.state.favorites.push(this.state.currentCity);
                localStorage.setItem('skycast_favs', JSON.stringify(this.state.favorites));
                this.renderFavorites();
            }
        });
    }

    async handleSearchInput(e) {
        const query = e.target.value;
        if (query.length < 3) return;

        const results = await API.getCoords(query);
        this.renderAutocomplete(results);
    }

    async switchView(viewId) {
        // Haptic feel (visual scale)
        const activeBtn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
        if (activeBtn) {
            activeBtn.style.transform = 'scale(0.85)';
            setTimeout(() => activeBtn.style.transform = '', 150);
        }

        const views = document.querySelectorAll('.content-view');
        const target = document.getElementById(`view-${viewId}`);
        
        if (target && !target.classList.contains('active')) {
            // Exit animation for current active view
            const current = document.querySelector('.content-view.active');
            if (current) {
                current.style.opacity = '0';
                current.style.transform = 'translateY(10px)';
                setTimeout(() => current.classList.remove('active'), 300);
            }

            // Enter animation for target view
            setTimeout(() => {
                target.classList.add('active');
                target.style.opacity = '0';
                target.style.transform = 'translateY(10px)';
                // Trigger reflow
                target.offsetHeight; 
                target.style.opacity = '1';
                target.style.transform = 'translateY(0)';
                
                // View-specific Hydration
                if (viewId === 'map') setTimeout(() => this.map.invalidateSize(), 100);
                if (viewId === 'locations') this.renderLocationsView();
                if (viewId === 'analytics') this.renderAnalyticsView();
                if (viewId === 'settings') this.bindSettings();
            }, 300);
        }
    }

    bindSettings() {
        const unitSelect = document.getElementById('setting-units');
        const particleSlider = document.getElementById('setting-particles');

        unitSelect.value = this.state.units;
        unitSelect.addEventListener('change', (e) => {
            this.state.units = e.target.value;
            localStorage.setItem('skycast_units', this.state.units);
            this.fetchAndRender(); // Re-fetch for correct units if using API
        });

        particleSlider.addEventListener('input', (e) => {
            const density = e.target.value;
            // This would ideally update the canvas particle count
            console.log("Particle Density Adjusted:", density);
        });
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            alert("Geolocation not supported");
            return;
        }

        Utils.setLoading(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            this.state.coords = { lat: latitude, lon: longitude };
            this.state.currentCity = "Current Location";
            await this.fetchAndRender();
        }, (err) => {
            console.warn("Geolocation denied:", err);
            Utils.setLoading(false);
        });
    }

    renderLocationsView() {
        const grid = document.getElementById('locations-grid');
        grid.innerHTML = this.state.favorites.map(city => `
            <div class="loc-card card-glass" data-city="${city}">
                <div class="loc-info">
                    <h4>${city}</h4>
                    <p class="text-dim">Tap to view detail</p>
                </div>
                <div class="loc-temp">--°</div>
            </div>
        `).join('');

        // Item clicks
        grid.querySelectorAll('.loc-card').forEach(card => {
            card.addEventListener('click', async () => {
                const results = await API.getCoords(card.dataset.city);
                if (results[0]) {
                    this.state.coords = { lat: results[0].lat, lon: results[0].lon };
                    this.state.currentCity = results[0].name;
                    this.switchView('dashboard');
                    await this.fetchAndRender();
                    
                    // Update sidebar active state
                    document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.remove('active'));
                    document.querySelector('.nav-btn[data-view="dashboard"]').classList.add('active');
                }
            });
        });
    }

    renderAnalyticsView() {
        const container = document.getElementById('analytics-chart-container');
        // Simple SVG Chart Simulation
        container.innerHTML = `
            <svg viewBox="0 0 800 200" style="width:100%; height:100%; padding:20px;">
                <path d="M0 150 Q 100 120 200 160 T 400 80 T 600 130 T 800 100" 
                      fill="none" stroke="var(--accent)" stroke-width="4" />
                <circle cx="400" cy="80" r="6" fill="var(--accent)" />
            </svg>
        `;
    }

    renderAutocomplete(results) {
        this.dom.autocomplete.innerHTML = results.map(city => `
            <div class="search-result-item" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}">
                <i data-lucide="map-pin" size="14"></i>
                <span>${city.name}, ${city.country}</span>
            </div>
        `).join('');
        
        this.dom.autocomplete.classList.remove('hidden');
        lucide.createIcons();

        // Add item clicks
        this.dom.autocomplete.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', async () => {
                const { lat, lon, name } = item.dataset;
                this.state.coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
                this.state.currentCity = name;
                this.dom.autocomplete.classList.add('hidden');
                this.dom.search.value = '';
                await this.fetchAndRender();
            });
        });
    }

    async fetchAndRender() {
        // Caching Logic: Check if we have valid data for this city in the last 15 mins
        const cacheKey = `skycast_${this.state.coords.lat}_${this.state.coords.lon}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            const parsed = JSON.parse(cached);
            const isFresh = (Date.now() - parsed.timestamp) < 900000; // 15 mins
            if (isFresh) {
                console.log("Loading from cache...");
                this.state.weatherData = parsed.data;
                this.updateUI(parsed.data);
                this.updateMap();
                return;
            }
        }

        Utils.setLoading(true);
        const data = await API.getWeatherData(this.state.coords.lat, this.state.coords.lon);
        
        if (data) {
            this.state.weatherData = data;
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
            this.updateUI(data);
            this.updateMap();
        }
        
        Utils.setLoading(false);
    }

    updateUI(data) {
        const { current, forecast, aqi } = data;

        // Current Weather
        this.dom.cityName.textContent = this.state.currentCity;
        this.dom.mainTemp.textContent = `${Math.round(current.main.temp)}°`;
        this.dom.condition.textContent = current.weather[0].main;
        
        // Remove skeletons
        [this.dom.cityName, this.dom.mainTemp, this.dom.condition].forEach(el => el.classList.remove('skeleton-text'));

        // Metrics mapping fix (handling potential missing fields)
        const main = current.main || {};
        document.getElementById('humidity').textContent = `${main.humidity || 0}%`;
        document.getElementById('wind-speed').textContent = `${Math.round((current.wind?.speed || 0) * 3.6)} km/h`;
        document.getElementById('wind-dir').textContent = Utils.degToCompass(current.wind?.deg || 0);
        document.getElementById('visibility').textContent = `${((current.visibility || 0) / 1000).toFixed(1)} km`;
        document.getElementById('aqi-value').textContent = aqi.list[0]?.main.aqi || 1;
        document.getElementById('sunrise-time').textContent = Utils.formatTime(current.sys?.sunrise || 0);
        document.getElementById('sunset-time').textContent = Utils.formatTime(current.sys?.sunset || 0);
        
        const high = main.temp_max !== undefined ? Math.round(main.temp_max) : Math.round(main.temp + 2);
        const low = main.temp_min !== undefined ? Math.round(main.temp_min) : Math.round(main.temp - 2);
        document.getElementById('temp-high-low').textContent = `H: ${high}° L: ${low}°`;
        document.getElementById('feels-like').textContent = `Feels like ${Math.round(main.feels_like || main.temp)}°`;

        // AI Insight
        const uv = current.uvi || 0;
        this.dom.aiInsight.textContent = Utils.getAIAdvice(
            current.weather[0].main, 
            current.main.temp, 
            current.main.humidity,
            uv
        );

        // Hourly (Next 24h) - Enhanced with micro-graph visualization
        const maxTemp = Math.max(...forecast.list.slice(0, 10).map(h => h.main.temp));
        const minTemp = Math.min(...forecast.list.slice(0, 10).map(h => h.main.temp));
        
        this.dom.hourlyList.innerHTML = forecast.list.slice(0, 10).map(h => {
            const hTemp = Math.round(h.main.temp);
            const height = ((hTemp - minTemp) / (maxTemp - minTemp || 1)) * 40 + 20;
            return `
                <div class="hourly-item">
                    <p class="hour-label">${Utils.formatTime(h.dt)}</p>
                    <div class="temp-bar-container">
                        <div class="temp-bar" style="height: ${height}px"></div>
                    </div>
                    <p class="hour-temp">${hTemp}°</p>
                </div>
            `;
        }).join('');

        // 7-Day (Actually 5-day on free tier, but we'll show unique days)
        const daily = forecast.list.filter((_, i) => i % 8 === 0);
        this.dom.dailyList.innerHTML = daily.map(d => `
            <div class="daily-item">
                <span class="day-label">${Utils.getDayName(d.dt, true)}</span>
                <div class="forecast-status">
                     <span style="font-size:0.8rem">${d.weather[0].main}</span>
                </div>
                <div class="forecast-temps">
                    <span class="temp-max">${Math.round(d.main.temp)}°</span>
                </div>
            </div>
        `).join('');

        // Dynamic Background & Theme
        this.updateBackgroundAndTheme(current.weather[0].main);
    }

    updateBackgroundAndTheme(condition) {
        const root = document.documentElement;
        const layer = document.querySelector('.sky-gradient');
        
        const themes = {
            'Clear': { bg: 'radial-gradient(circle at 50% 10%, #1e3a8a 0%, #000 100%)', accent: '#007aff' },
            'Clouds': { bg: 'radial-gradient(circle at 50% 10%, #374151 0%, #000 100%)', accent: '#94a3b8' },
            'Rain': { bg: 'radial-gradient(circle at 50% 10%, #111827 0%, #000 100%)', accent: '#3b82f6' },
            'Thunderstorm': { bg: 'radial-gradient(circle at 50% 10%, #1e1b4b 0%, #000 100%)', accent: '#8b5cf6' },
            'Snow': { bg: 'radial-gradient(circle at 50% 10%, #1e293b 0%, #000 100%)', accent: '#cbd5e1' }
        };

        const theme = themes[condition] || themes['Clear'];
        layer.style.background = theme.bg;
        root.style.setProperty('--accent', theme.accent);
        root.style.setProperty('--accent-glow', `${theme.accent}66`);
    }

    initMap() {
        this.map = L.map('weather-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([this.state.coords.lat, this.state.coords.lon], 10);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(this.map);
    }

    updateMap() {
        this.map.setView([this.state.coords.lat, this.state.coords.lon], 10);
        if (this.currentMarker) this.map.removeLayer(this.currentMarker);
        this.currentMarker = L.circleMarker([this.state.coords.lat, this.state.coords.lon], {
            radius: 8,
            fillColor: "#007aff",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(this.map);
    }

    startClock() {
        setInterval(() => {
            this.dom.localClock.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
        }, 1000);
    }

    initParticles() {
        const canvas = document.getElementById('weather-particles');
        const ctx = canvas.getContext('2d');
        const setSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', setSize);
        setSize();

        let particles = [];
        const createParticles = (type = 'stars') => {
            particles = [];
            const count = type === 'rain' ? 100 : 50;
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: type === 'rain' ? Math.random() * 2 + 1 : Math.random() * 1.5,
                    speed: type === 'rain' ? Math.random() * 10 + 5 : Math.random() * 0.2,
                    length: type === 'rain' ? Math.random() * 20 + 10 : 0
                });
            }
        };

        createParticles();

        const animate = () => {
            ctx.clearRect(0,0, canvas.width, canvas.height);
            const condition = this.state.weatherData?.current.weather[0].main.toLowerCase() || '';
            let type = 'stars';
            if (condition.includes('rain')) type = 'rain';
            if (condition.includes('snow')) type = 'snow';
            if (condition.includes('cloud')) type = 'clouds';
            
            if (particles.length === 0 || lastType !== type) {
                createParticles(type);
                lastType = type;
            }

            particles.forEach(p => {
                if (type === 'rain') {
                    ctx.strokeStyle = 'rgba(174, 194, 224, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x, p.y + p.length);
                    ctx.stroke();
                } else if (type === 'snow') {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                } else if (type === 'clouds') {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 20, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                p.y += p.speed;
                if (type === 'clouds') p.x += p.speed / 2;
                if (p.y > canvas.height) p.y = -50;
                if (p.x > canvas.width) p.x = -50;
            });
            requestAnimationFrame(animate);
        };
        let lastType = 'stars';
        animate();
    }

    /**
     * ADVANCED: Voice Search
     */
    startVoiceSearch() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice Recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        
        this.dom.voiceOverlay.classList.remove('hidden');
        recognition.start();

        recognition.onresult = async (event) => {
            const result = event.results[0][0].transcript;
            console.log("Voice Result:", result);
            this.dom.search.value = result;
            this.dom.voiceOverlay.classList.add('hidden');
            
            // Search coordinates for voiced city
            const results = await API.getCoords(result);
            if (results && results[0]) {
                this.state.coords = { lat: results[0].lat, lon: results[0].lon };
                this.state.currentCity = results[0].name;
                await this.fetchAndRender();
            }
        };

        recognition.onend = () => {
             this.dom.voiceOverlay.classList.add('hidden');
        };
    }
}

// Instantiate App
window.skycast = new SkyCastApp();
