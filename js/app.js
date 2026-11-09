/**
 * app.js - DOM manipulation, state management, live countdown, and UI logic
 */

function parseStoredCoordinate(key) {
    const stored = localStorage.getItem(key);
    if (stored === null || stored === '') return null;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : null;
}

// Application State
const state = {
    city: localStorage.getItem('prayer_city') || 'London',
    country: localStorage.getItem('prayer_country') || 'United Kingdom',
    lat: parseStoredCoordinate('prayer_lat'),
    lng: parseStoredCoordinate('prayer_lng'),
    method: parseInt(localStorage.getItem('prayer_method')) || 2,
    school: parseInt(localStorage.getItem('prayer_school')) || 0,
    theme: localStorage.getItem('prayer_theme') || 'dark',
    timezone: null,
    timings: null,
    dateInfo: null,
    mosques: [],
    activeKey: null
};

// Autocomplete request management
let searchAbortController = null;
let searchDebounceTimer = null;
let searchRequestId = 0;
let currentSuggestions = [];
let activeSuggestionIndex = -1;

// Prayer/mosque request management (prevents stale responses from winning)
let prayerRequestId = 0;
let mosqueAbortController = null;
let mosqueRequestId = 0;
let cityGeocodeAbortController = null;
let cityGeocodeRequestId = 0;
let lastMosqueLocationKey = null;

// Cache the Intl formatter per timezone rather than rebuilding it every second
let timezoneFormatter = null;
let timezoneFormatterZone = null;

// DOM Elements
const themeToggleBtn = document.getElementById('theme-toggle');
const citySearchInput = document.getElementById('city-search');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
const btnNearby = document.getElementById('btn-nearby');
const methodSelect = document.getElementById('method-select');
const madhabSelect = document.getElementById('madhab-select');

const locationNameEl = document.getElementById('location-name');
const gregorianDateEl = document.getElementById('gregorian-date');
const hijriDateEl = document.getElementById('hijri-date');
const nextPrayerNameEl = document.getElementById('next-prayer-name');
const countdownTimerEl = document.getElementById('countdown-timer');
const nextPrayerTimeEl = document.getElementById('next-prayer-time');
const currentClockEl = document.getElementById('current-clock');
const scheduleDateLabelEl = document.getElementById('schedule-date-label');
const prayerListEl = document.getElementById('prayer-list');
const mosquesListEl = document.getElementById('mosques-list');
const toastEl = document.getElementById('toast');

// SVG Icons mapping for prayers
const PRAYER_ICONS = {
    Fajr: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    Sunrise: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    Dhuhr: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="m4.22 19.78 1.42-1.42"/><path d="m18.36 5.64 1.42-1.42"/></svg>',
    Asr: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10l4.5 4.5"/><circle cx="12" cy="12" r="10"/></svg>',
    Maghrib: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h18"/><path d="M6 12h12"/><path d="M12 2v7"/><path d="m5 7 7-5 7 5"/><path d="M2 21h20"/></svg>',
    Isha: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSettingsUI();
    initEventListeners();
    loadPrayerData();
    
    // Start live clock ticker
    setInterval(updateClockAndCountdown, 1000);
});

function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

function initSettingsUI() {
    if (methodSelect) methodSelect.value = state.method;
    if (madhabSelect) madhabSelect.value = state.school;
}

function initEventListeners() {
    // Theme toggle
    themeToggleBtn.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('prayer_theme', state.theme);
        initTheme();
    });

    // City search: debounced autocomplete
    citySearchInput.addEventListener('input', () => {
        const query = citySearchInput.value.trim();
        clearTimeout(searchDebounceTimer);
        abortAutocompleteRequest();
        searchRequestId += 1;
        activeSuggestionIndex = -1;

        currentSuggestions = [];
        hideAutocomplete();

        if (query.length < 2) {
            return;
        }

        const requestId = searchRequestId;
        searchDebounceTimer = setTimeout(() => {
            requestCitySuggestions(query, requestId);
        }, 300);
    });

    citySearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dismissAutocomplete();
            return;
        }

        const items = Array.from(autocompleteDropdown.querySelectorAll('.autocomplete-item'));

        if (items.length > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            if (e.key === 'ArrowDown') {
                activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
            } else {
                activeSuggestionIndex = activeSuggestionIndex <= 0 ? items.length - 1 : activeSuggestionIndex - 1;
            }
            setActiveSuggestion(items);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestionIndex >= 0 && currentSuggestions[activeSuggestionIndex]) {
                selectCitySuggestion(currentSuggestions[activeSuggestionIndex]);
                return;
            }
            if (currentSuggestions.length > 0) {
                selectCitySuggestion(currentSuggestions[0]);
                return;
            }
            const query = citySearchInput.value.trim();
            if (query) resolveSearchOnEnter(query);
        }
    });

    // Dismiss suggestions when clicking outside the search box
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            dismissAutocomplete();
        }
    });

    // Nearby button (geolocation)
    btnNearby.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser');
            return;
        }
        showToast('Detecting your location...');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                state.lat = position.coords.latitude;
                state.lng = position.coords.longitude;
                localStorage.setItem('prayer_lat', state.lat);
                localStorage.setItem('prayer_lng', state.lng);

                try {
                    const geo = await reverseGeocode(state.lat, state.lng);
                    state.city = geo.city;
                    state.country = geo.country;
                    localStorage.setItem('prayer_city', state.city);
                    localStorage.setItem('prayer_country', state.country);
                } catch (err) {
                    console.error('Reverse geocode failed:', err);
                }

                loadPrayerData();
                showToast('Location updated successfully!');
            },
            (error) => {
                console.error('Geolocation error:', error);
                showToast('Unable to retrieve your location. Please check permissions.');
            },
            { timeout: 10000, maximumAge: 60000 }
        );
    });

    // Method change
    methodSelect.addEventListener('change', () => {
        state.method = parseInt(methodSelect.value);
        localStorage.setItem('prayer_method', state.method);
        loadPrayerData({ refreshMosques: false });
        showToast('Calculation method updated');
    });

    // Madhab change
    madhabSelect.addEventListener('change', () => {
        state.school = parseInt(madhabSelect.value);
        localStorage.setItem('prayer_school', state.school);
        loadPrayerData({ refreshMosques: false });
        showToast('Asr calculation method updated');
    });
}

function abortAutocompleteRequest() {
    if (searchAbortController) {
        searchAbortController.abort();
        searchAbortController = null;
    }
}

function hideAutocomplete() {
    autocompleteDropdown.classList.add('hidden');
    autocompleteDropdown.innerHTML = '';
    citySearchInput.setAttribute('aria-expanded', 'false');
    activeSuggestionIndex = -1;
}

function dismissAutocomplete() {
    searchRequestId += 1;
    clearTimeout(searchDebounceTimer);
    abortAutocompleteRequest();
    currentSuggestions = [];
    hideAutocomplete();
}

function showAutocompleteLoading() {
    autocompleteDropdown.innerHTML = `
        <div class="autocomplete-loading">
            <span class="autocomplete-spinner" aria-hidden="true"></span>
            <span>Searching cities...</span>
        </div>
    `;
    autocompleteDropdown.classList.remove('hidden');
    citySearchInput.setAttribute('aria-expanded', 'true');
}

async function requestCitySuggestions(query, requestId) {
    if (requestId !== searchRequestId) return;

    showAutocompleteLoading();
    abortAutocompleteRequest();
    const controller = new AbortController();
    searchAbortController = controller;

    try {
        const results = await fetchCitySuggestions(query, controller.signal);
        if (requestId !== searchRequestId || citySearchInput.value.trim() !== query) return;
        renderAutocomplete(results);
    } catch (error) {
        if (error.name === 'AbortError') return;
        if (requestId === searchRequestId) renderAutocomplete([]);
    } finally {
        if (searchAbortController === controller) {
            searchAbortController = null;
        }
    }
}

function renderAutocomplete(results) {
    currentSuggestions = results;
    activeSuggestionIndex = -1;

    if (!results.length) {
        autocompleteDropdown.innerHTML = `<div class="autocomplete-empty">No matching cities found</div>`;
        autocompleteDropdown.classList.remove('hidden');
        citySearchInput.setAttribute('aria-expanded', 'true');
        return;
    }

    autocompleteDropdown.innerHTML = results.map((item, index) => {
        const region = item.admin1 && item.admin1 !== item.name ? item.admin1 : '';
        const country = item.country || '';

        return `
            <div class="autocomplete-item" role="option" aria-selected="false" data-index="${index}">
                <div class="autocomplete-main">
                    <span class="autocomplete-city">${escapeHtml(item.name)}</span>
                    ${region ? `<span class="autocomplete-region">${escapeHtml(region)}</span>` : ''}
                </div>
                ${country ? `<span class="autocomplete-country">${escapeHtml(country)}</span>` : ''}
            </div>
        `;
    }).join('');

    autocompleteDropdown.classList.remove('hidden');
    citySearchInput.setAttribute('aria-expanded', 'true');

    autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            const suggestion = currentSuggestions[Number(item.dataset.index)];
            if (suggestion) selectCitySuggestion(suggestion);
        });
    });
}

function setActiveSuggestion(items) {
    items.forEach((item, index) => {
        const isActive = index === activeSuggestionIndex;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-selected', String(isActive));
    });

    const activeItem = items[activeSuggestionIndex];
    if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
    }
}

function selectCitySuggestion(suggestion) {
    if (!suggestion || typeof suggestion.latitude !== 'number' || typeof suggestion.longitude !== 'number') {
        return;
    }

    searchRequestId += 1;
    clearTimeout(searchDebounceTimer);
    abortAutocompleteRequest();
    hideAutocomplete();

    state.lat = suggestion.latitude;
    state.lng = suggestion.longitude;
    state.city = suggestion.name;
    state.country = suggestion.country || '';

    localStorage.setItem('prayer_lat', state.lat);
    localStorage.setItem('prayer_lng', state.lng);
    localStorage.setItem('prayer_city', state.city);
    localStorage.setItem('prayer_country', state.country);

    citySearchInput.value = '';
    citySearchInput.blur();
    locationNameEl.textContent = state.country ? `${state.city}, ${state.country}` : state.city;

    loadPrayerData();
    showToast(`Location set to ${state.city}${state.country ? `, ${state.country}` : ''}`);
}

async function resolveSearchOnEnter(query) {
    clearTimeout(searchDebounceTimer);
    searchRequestId += 1;
    abortAutocompleteRequest();
    currentSuggestions = [];
    showAutocompleteLoading();

    const requestId = searchRequestId;
    const controller = new AbortController();
    searchAbortController = controller;

    try {
        const results = await fetchCitySuggestions(query, controller.signal);
        if (requestId !== searchRequestId) return;

        if (results.length > 0) {
            selectCitySuggestion(results[0]);
            return;
        }
    } catch (error) {
        if (error.name === 'AbortError') return;
    } finally {
        if (searchAbortController === controller) {
            searchAbortController = null;
        }
    }

    if (requestId !== searchRequestId) return;

    // Fallback to the raw query if no suggestion could be resolved
    const parts = query.split(',').map(part => part.trim()).filter(Boolean);
    state.city = parts[0] || query;
    state.country = parts[1] || '';
    state.lat = null;
    state.lng = null;
    localStorage.removeItem('prayer_lat');
    localStorage.removeItem('prayer_lng');
    localStorage.setItem('prayer_city', state.city);
    localStorage.setItem('prayer_country', state.country);

    citySearchInput.value = '';
    hideAutocomplete();
    locationNameEl.textContent = state.country ? `${state.city}, ${state.country}` : state.city;
    loadPrayerData();
    showToast(`Searching prayer times for ${state.city}...`);
}

function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 3500);
}

function showMosquesLoading() {
    mosquesListEl.innerHTML = `
        <div class="loading-mosques">
            <span class="spinner" aria-hidden="true"></span>
            <span>Finding nearby mosques...</span>
        </div>
    `;
}

function cancelMosqueRequest(showLoading = false) {
    mosqueRequestId += 1;
    if (mosqueAbortController) {
        mosqueAbortController.abort();
        mosqueAbortController = null;
    }
    if (showLoading) {
        showMosquesLoading();
    }
}

function cancelCityGeocodeRequest() {
    cityGeocodeRequestId += 1;
    if (cityGeocodeAbortController) {
        cityGeocodeAbortController.abort();
        cityGeocodeAbortController = null;
    }
}

async function loadPrayerData({ refreshMosques = true } = {}) {
    const requestId = ++prayerRequestId;

    if (refreshMosques) {
        // Abort any in-flight location lookups immediately so stale
        // mosques can never overwrite the newly selected city.
        cancelMosqueRequest(true);
        cancelCityGeocodeRequest();
    }

    try {
        let data;
        if (state.lat !== null && state.lng !== null) {
            data = await fetchPrayerTimesByCoords(state.lat, state.lng, state.method, state.school);
        } else {
            data = await fetchPrayerTimesByCity(state.city, state.country, state.method, state.school);
        }

        if (requestId !== prayerRequestId) return;

        state.timings = data.timings;
        state.dateInfo = data.date;
        state.timezone = data.meta && data.meta.timezone ? data.meta.timezone : null;

        const locationText = state.country ? `${state.city}, ${state.country}` : state.city;
        locationNameEl.textContent = locationText;

        if (state.dateInfo) {
            gregorianDateEl.textContent = state.dateInfo.gregorian.date;
            const hijri = state.dateInfo.hijri;
            hijriDateEl.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
            scheduleDateLabelEl.textContent = state.dateInfo.gregorian.date;
        }

        renderPrayerTimeline();

        const locationKey = state.lat !== null && state.lng !== null
            ? `geo:${state.lat.toFixed(4)},${state.lng.toFixed(4)}`
            : `city:${state.city}|${state.country}`;
        const mosqueLocationChanged = locationKey !== lastMosqueLocationKey;

        if (refreshMosques || mosqueLocationChanged) {
            lastMosqueLocationKey = locationKey;

            if (state.lat !== null && state.lng !== null) {
                loadNearbyMosquesData(state.lat, state.lng);
            } else {
                geocodeCityForMosques(state.city, state.country, requestId);
            }
        }

    } catch (error) {
        if (requestId !== prayerRequestId) return;
        console.error('Failed to load prayer data:', error);
        showToast('Failed to load prayer times. Please check city name.');
        prayerListEl.innerHTML = `<div class="loading-state">Could not load prayer times. Please try searching another city.</div>`;
        if (refreshMosques) {
            mosquesListEl.innerHTML = `<div class="loading-state">Nearby mosques unavailable.</div>`;
        }
    }
}

async function geocodeCityForMosques(city, country, prayerRequest) {
    cityGeocodeRequestId += 1;
    const requestId = cityGeocodeRequestId;

    if (cityGeocodeAbortController) {
        cityGeocodeAbortController.abort();
    }
    const controller = new AbortController();
    cityGeocodeAbortController = controller;

    try {
        const query = encodeURIComponent(`${city}, ${country}`.replace(/^,\s*|\s*,\s*$/g, ''));
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'PrayerTimesWebApp/1.0' }
        });
        if (!res.ok) {
            throw new Error('City geocoding failed');
        }
        const results = await res.json();

        if (requestId !== cityGeocodeRequestId || prayerRequest !== prayerRequestId) return;

        if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lng = parseFloat(results[0].lon);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                loadNearbyMosquesData(lat, lng);
            } else {
                mosquesListEl.innerHTML = `<div class="loading-state">Nearby mosques unavailable for this location.</div>`;
            }
        } else {
            mosquesListEl.innerHTML = `<div class="loading-state">Nearby mosques unavailable for this location.</div>`;
        }
    } catch (err) {
        if (err.name === 'AbortError') return;
        if (requestId !== cityGeocodeRequestId || prayerRequest !== prayerRequestId) return;
        console.error('City geocoding for mosques failed:', err);
        mosquesListEl.innerHTML = `<div class="loading-state">Unable to load nearby mosques.</div>`;
    } finally {
        if (cityGeocodeAbortController === controller) {
            cityGeocodeAbortController = null;
        }
    }
}

async function loadNearbyMosquesData(lat, lng) {
    const requestId = ++mosqueRequestId;

    if (mosqueAbortController) {
        mosqueAbortController.abort();
    }
    const controller = new AbortController();
    mosqueAbortController = controller;

    // Overpass can occasionally hang; never leave the spinner running forever
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    showMosquesLoading();

    try {
        const mosques = await fetchNearbyMosques(lat, lng, 5000, controller.signal);
        if (requestId !== mosqueRequestId) return;

        state.mosques = mosques;
        renderMosques();
    } catch (err) {
        if (err.name === 'AbortError') {
            if (requestId === mosqueRequestId) {
                mosquesListEl.innerHTML = `<div class="loading-state">Mosque search timed out. Please try again.</div>`;
            }
            return;
        }
        if (requestId !== mosqueRequestId) return;
        console.error('Failed to load mosques:', err);
        mosquesListEl.innerHTML = `<div class="loading-state">No nearby mosques found within 5km.</div>`;
    } finally {
        clearTimeout(timeoutId);
        if (mosqueAbortController === controller) {
            mosqueAbortController = null;
        }
    }
}

function renderMosques() {
    if (!state.mosques || state.mosques.length === 0) {
        mosquesListEl.innerHTML = `<div class="loading-state">No nearby mosques found within 5km radius.</div>`;
        return;
    }

    mosquesListEl.innerHTML = state.mosques.map(m => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lon}`;

        return `
            <div class="mosque-item">
                <div class="mosque-info">
                    <div class="mosque-icon-wrap">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="mosque-link" title="Open ${escapeHtml(m.name)} in Google Maps">
                        <span>${escapeHtml(m.name)}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>
                    </a>
                </div>
                <div class="mosque-distance">${m.distance.toFixed(1)} km</div>
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

const PRAYER_KEYS = [
    { key: 'Fajr', name: 'Fajr' },
    { key: 'Sunrise', name: 'Sunrise' },
    { key: 'Dhuhr', name: 'Dhuhr' },
    { key: 'Asr', name: 'Asr' },
    { key: 'Maghrib', name: 'Maghrib' },
    { key: 'Isha', name: 'Isha' }
];

function renderPrayerTimeline() {
    if (!state.timings) return;

    const currentNext = getNextPrayerInfo();
    state.activeKey = currentNext ? currentNext.activeKey : null;

    prayerListEl.innerHTML = PRAYER_KEYS.map(p => {
        const timeStr = state.timings[p.key];
        const isActive = state.activeKey === p.key;

        return `
            <div class="prayer-item ${isActive ? 'active' : ''}" data-prayer-key="${p.key}">
                <div class="prayer-info">
                    <div class="prayer-icon-wrap">
                        ${PRAYER_ICONS[p.key] || PRAYER_ICONS.Fajr}
                    </div>
                    <div class="prayer-name">${p.name}</div>
                </div>
                <div class="prayer-time">${formatTime12Hour(timeStr)}</div>
            </div>
        `;
    }).join('');
}

function updateActivePrayerHighlight(activeKey) {
    if (!activeKey || state.activeKey === activeKey) return;

    state.activeKey = activeKey;
    prayerListEl.querySelectorAll('.prayer-item').forEach(item => {
        item.classList.toggle('active', item.dataset.prayerKey === activeKey);
    });
}

function formatTime12Hour(time24) {
    if (!time24) return '--:--';
    const cleanTime = time24.split(' ')[0];
    const [hoursStr, minutesStr] = cleanTime.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
}

function getTimeFormatter() {
    if (!state.timezone) return null;

    if (timezoneFormatterZone !== state.timezone) {
        try {
            timezoneFormatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: state.timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hourCycle: 'h23'
            });
            timezoneFormatterZone = state.timezone;
        } catch (error) {
            // Invalid IANA timezone from the API - fall back to local time
            timezoneFormatter = null;
            timezoneFormatterZone = state.timezone;
        }
    }

    return timezoneFormatter;
}

function getNowParts() {
    const formatter = getTimeFormatter();

    if (!formatter) {
        const now = new Date();
        return {
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds()
        };
    }

    const parts = {};
    formatter.formatToParts(new Date()).forEach(part => {
        parts[part.type] = part.value;
    });

    return {
        hours: Number(parts.hour) % 24,
        minutes: Number(parts.minute),
        seconds: Number(parts.second)
    };
}

function getNextPrayerInfo(nowParts = getNowParts()) {
    if (!state.timings) return null;

    const totalCurrentSecs = nowParts.hours * 3600 + nowParts.minutes * 60 + nowParts.seconds;

    const obligatory = [
        { key: 'Fajr', name: 'Fajr' },
        { key: 'Dhuhr', name: 'Dhuhr' },
        { key: 'Asr', name: 'Asr' },
        { key: 'Maghrib', name: 'Maghrib' },
        { key: 'Isha', name: 'Isha' }
    ];

    let nextPrayer = null;
    let activePrayer = obligatory[obligatory.length - 1];

    for (let i = 0; i < obligatory.length; i++) {
        const p = obligatory[i];
        const timeStr = state.timings[p.key].split(' ')[0];
        const [h, m] = timeStr.split(':').map(Number);
        const pSecs = (h * 60 + m) * 60;

        if (totalCurrentSecs < pSecs) {
            nextPrayer = { ...p, secs: pSecs, timeStr: state.timings[p.key] };
            activePrayer = i > 0 ? obligatory[i - 1] : obligatory[obligatory.length - 1];
            break;
        }
    }

    if (!nextPrayer) {
        const fajrStr = state.timings['Fajr'].split(' ')[0];
        const [h, m] = fajrStr.split(':').map(Number);
        const pSecs = (h * 60 + m) * 60 + 24 * 3600;
        nextPrayer = { key: 'Fajr', name: 'Fajr', secs: pSecs, timeStr: state.timings['Fajr'] };
        activePrayer = obligatory[obligatory.length - 1];
    }

    return {
        next: nextPrayer,
        activeKey: activePrayer.key,
        totalCurrentSecs
    };
}

function updateClockAndCountdown() {
    const nowParts = getNowParts();

    const hours = String(nowParts.hours).padStart(2, '0');
    const minutes = String(nowParts.minutes).padStart(2, '0');
    const seconds = String(nowParts.seconds).padStart(2, '0');
    currentClockEl.textContent = `${hours}:${minutes}:${seconds}`;

    if (!state.timings) return;

    const info = getNextPrayerInfo(nowParts);
    if (!info) return;

    nextPrayerNameEl.textContent = info.next.name;
    nextPrayerTimeEl.textContent = `At ${formatTime12Hour(info.next.timeStr)}`;
    updateActivePrayerHighlight(info.activeKey);

    let diffSecs = info.next.secs - info.totalCurrentSecs;
    if (diffSecs < 0) {
        diffSecs += 24 * 3600;
    }

    const hRem = Math.floor(diffSecs / 3600);
    const mRem = Math.floor((diffSecs % 3600) / 60);
    const sRem = diffSecs % 60;

    countdownTimerEl.textContent = `${String(hRem).padStart(2, '0')}:${String(mRem).padStart(2, '0')}:${String(sRem).padStart(2, '0')}`;
}
