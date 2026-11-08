/**
 * app.js - DOM manipulation, state management, live countdown, and UI logic
 */

// Application State
const state = {
    city: localStorage.getItem('prayer_city') || 'London',
    country: localStorage.getItem('prayer_country') || 'United Kingdom',
    lat: parseFloat(localStorage.getItem('prayer_lat')) || null,
    lng: parseFloat(localStorage.getItem('prayer_lng')) || null,
    method: parseInt(localStorage.getItem('prayer_method')) || 2,
    school: parseInt(localStorage.getItem('prayer_school')) || 0,
    theme: localStorage.getItem('prayer_theme') || 'dark',
    timings: null,
    dateInfo: null,
    mosques: []
};

// DOM Elements
const themeToggleBtn = document.getElementById('theme-toggle');
const citySearchInput = document.getElementById('city-search');
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

    // City search on Enter
    citySearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = citySearchInput.value.trim();
            if (query) {
                const parts = query.split(',').map(s => s.trim());
                state.city = parts[0];
                state.country = parts[1] || '';
                state.lat = null;
                state.lng = null;
                localStorage.removeItem('prayer_lat');
                localStorage.removeItem('prayer_lng');
                localStorage.setItem('prayer_city', state.city);
                localStorage.setItem('prayer_country', state.country);
                citySearchInput.value = '';
                loadPrayerData();
                showToast(`Searching prayer times for ${state.city}...`);
            }
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

function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 3500);
}

async function loadPrayerData() {
    try {
        let data;
        if (state.lat !== null && state.lng !== null) {
            data = await fetchPrayerTimesByCoords(state.lat, state.lng, state.method, state.school);
        } else {
            data = await fetchPrayerTimesByCity(state.city, state.country, state.method, state.school);
        }

        state.timings = data.timings;
        state.dateInfo = data.date;

        const locationText = state.country ? `${state.city}, ${state.country}` : state.city;
        locationNameEl.textContent = locationText;

        if (state.dateInfo) {
            gregorianDateEl.textContent = state.dateInfo.gregorian.date;
            const hijri = state.dateInfo.hijri;
            hijriDateEl.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
            scheduleDateLabelEl.textContent = state.dateInfo.gregorian.date;
        }

        renderPrayerTimeline();

        if (state.lat !== null && state.lng !== null) {
            loadNearbyMosquesData(state.lat, state.lng);
        } else {
            geocodeCityForMosques(state.city, state.country);
        }

    } catch (error) {
        console.error('Failed to load prayer data:', error);
        showToast('Failed to load prayer times. Please check city name.');
        prayerListEl.innerHTML = `<div class="loading-state">Could not load prayer times. Please try searching another city.</div>`;
    }
}

async function geocodeCityForMosques(city, country) {
    try {
        const query = encodeURIComponent(`${city}, ${country}`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
            headers: { 'User-Agent': 'PrayerTimesWebApp/1.0' }
        });
        const results = await res.json();
        if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lng = parseFloat(results[0].lon);
            loadNearbyMosquesData(lat, lng);
        } else {
            mosquesListEl.innerHTML = `<div class="loading-state">Nearby mosques unavailable for this location.</div>`;
        }
    } catch (err) {
        console.error('City geocoding for mosques failed:', err);
        mosquesListEl.innerHTML = `<div class="loading-state">Unable to load nearby mosques.</div>`;
    }
}

async function loadNearbyMosquesData(lat, lng) {
    mosquesListEl.innerHTML = `<div class="loading-state">Searching for nearby mosques...</div>`;
    try {
        const mosques = await fetchNearbyMosques(lat, lng, 5000);
        state.mosques = mosques;
        renderMosques();
    } catch (err) {
        console.error('Failed to load mosques:', err);
        mosquesListEl.innerHTML = `<div class="loading-state">No nearby mosques found within 5km.</div>`;
    }
}

function renderMosques() {
    if (!state.mosques || state.mosques.length === 0) {
        mosquesListEl.innerHTML = `<div class="loading-state">No nearby mosques found within 5km radius.</div>`;
        return;
    }

    mosquesListEl.innerHTML = state.mosques.map(m => `
        <div class="mosque-item">
            <div class="mosque-info">
                <div class="mosque-icon-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div class="mosque-name">${escapeHtml(m.name)}</div>
            </div>
            <div class="mosque-distance">${m.distance.toFixed(1)} km</div>
        </div>
    `).join('');
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
    
    prayerListEl.innerHTML = PRAYER_KEYS.map(p => {
        const timeStr = state.timings[p.key];
        const isActive = currentNext && currentNext.activeKey === p.key;

        return `
            <div class="prayer-item ${isActive ? 'active' : ''}">
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

function getNextPrayerInfo() {
    if (!state.timings) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSeconds = now.getSeconds();
    const totalCurrentSecs = currentMinutes * 60 + currentSeconds;

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
    const now = new Date();
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    currentClockEl.textContent = `${hours}:${minutes}:${seconds}`;

    if (!state.timings) return;

    const info = getNextPrayerInfo();
    if (!info) return;

    nextPrayerNameEl.textContent = info.next.name;
    nextPrayerTimeEl.textContent = `At ${formatTime12Hour(info.next.timeStr)}`;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const totalCurrentSecs = currentMinutes * 60 + now.getSeconds();
    
    let diffSecs = info.next.secs - totalCurrentSecs;
    if (diffSecs < 0) {
        diffSecs += 24 * 3600;
    }

    const hRem = Math.floor(diffSecs / 3600);
    const mRem = Math.floor((diffSecs % 3600) / 60);
    const sRem = diffSecs % 60;

    countdownTimerEl.textContent = `${String(hRem).padStart(2, '0')}:${String(mRem).padStart(2, '0')}:${String(sRem).padStart(2, '0')}`;
}
