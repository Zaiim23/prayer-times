/**
 * app.js - application state, request handling, data loading, and event listeners
 * API calls live in api.js and rendering lives in ui.js.
 */

function parseStoredCoordinate(key) {
    const stored = localStorage.getItem(key);
    if (stored === null || stored === '') return null;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : null;
}

const DEFAULT_LOCATION = Object.freeze({
    city: 'Copenhagen',
    country: 'Denmark',
    lat: 55.6761,
    lng: 12.5683
});

const savedCity = localStorage.getItem('prayer_city');
const savedCountry = localStorage.getItem('prayer_country');
const savedLat = parseStoredCoordinate('prayer_lat');
const savedLng = parseStoredCoordinate('prayer_lng');
const hasSavedLocation = Boolean(savedCity) || (savedLat !== null && savedLng !== null);
const usingDefaultLocation = !hasSavedLocation;

const initialLocation = hasSavedLocation
    ? {
        city: savedCity || 'Current Location',
        country: savedCountry || '',
        lat: savedLat,
        lng: savedLng
    }
    : DEFAULT_LOCATION;

// Application State (shared with ui.js)
const state = {
    city: initialLocation.city,
    country: initialLocation.country,
    lat: initialLocation.lat,
    lng: initialLocation.lng,
    method: parseInt(localStorage.getItem('prayer_method')) || 2,
    school: parseInt(localStorage.getItem('prayer_school')) || 0,
    theme: localStorage.getItem('prayer_theme') || 'dark',
    timeFormat: localStorage.getItem('prayer_time_format') === '12h' ? '12h' : '24h',
    timezone: null,
    timings: null,
    dateInfo: null,
    activeKey: null
};

// Autocomplete request management
let searchAbortController = null;
let searchDebounceTimer = null;
let searchRequestId = 0;
let currentSuggestions = [];
let activeSuggestionIndex = -1;

let prayerRequestId = 0;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSettingsUI();
    initSearchInput();
    initEventListeners();
    updateMosqueLink();

    loadPrayerData().then(() => {
        if (usingDefaultLocation && state.timings && state.city === DEFAULT_LOCATION.city) {
            showToast('Showing Copenhagen, Denmark. Search a city or tap Nearby to change location.');
        }
    });

    // Start live clock ticker
    setInterval(updateClockAndCountdown, 1000);
});

function initEventListeners() {
    // Theme toggle
    themeToggleBtn.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('prayer_theme', state.theme);
        initTheme();
    });

    // Time format toggle (24H <-> 12H)
    formatToggleBtn.addEventListener('click', () => {
        state.timeFormat = state.timeFormat === '24h' ? '12h' : '24h';
        localStorage.setItem('prayer_time_format', state.timeFormat);
        updateTimeFormatToggleUI();
        renderPrayerTimeline();
        updateClockAndCountdown();
        showToast(`Time format set to ${state.timeFormat === '12h' ? '12-hour (AM/PM)' : '24-hour'}`);
    });

    // Keep the default location readable while making it easy to overwrite
    citySearchInput.addEventListener('focus', () => {
        const locationText = state.country ? `${state.city}, ${state.country}` : state.city;
        if (usingDefaultLocation && citySearchInput.value === locationText) {
            citySearchInput.select();
        }
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

                citySearchInput.value = '';
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
        loadPrayerData();
        showToast('Calculation method updated');
    });

    // Madhab change
    madhabSelect.addEventListener('change', () => {
        state.school = parseInt(madhabSelect.value);
        localStorage.setItem('prayer_school', state.school);
        loadPrayerData();
        showToast('Asr calculation method updated');
    });
}

function abortAutocompleteRequest() {
    if (searchAbortController) {
        searchAbortController.abort();
        searchAbortController = null;
    }
}

function dismissAutocomplete() {
    searchRequestId += 1;
    clearTimeout(searchDebounceTimer);
    abortAutocompleteRequest();
    currentSuggestions = [];
    hideAutocomplete();
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

async function loadPrayerData() {
    const requestId = ++prayerRequestId;

    try {
        const data = state.lat !== null && state.lng !== null
            ? await fetchPrayerTimesByCoords(state.lat, state.lng, state.method, state.school)
            : await fetchPrayerTimesByCity(state.city, state.country, state.method, state.school);

        if (requestId !== prayerRequestId) return;

        state.timings = data.timings;
        state.dateInfo = data.date;
        state.timezone = data.meta && data.meta.timezone ? data.meta.timezone : null;

        renderPrayerData();
        updateMosqueLink();
    } catch (error) {
        if (requestId !== prayerRequestId) return;
        console.error('Failed to load prayer data:', error);
        showToast('Failed to load prayer times. Please check city name.');
        prayerListEl.innerHTML = `<div class="loading-state">Could not load prayer times. Please try searching another city.</div>`;
    }
}
