/**
 * ui.js - DOM caching, rendering, live countdown, and presentational helpers
 * Reads the shared application state defined in app.js.
 */

// DOM Elements
const themeToggleBtn = document.getElementById('theme-toggle');
const formatToggleBtn = document.getElementById('format-toggle');
const formatToggleLabelEl = document.getElementById('format-toggle-label');
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
const mosqueLinkEl = document.getElementById('mosque-link');
const mosqueLinkLabelEl = document.getElementById('mosque-link-label');
const toastEl = document.getElementById('toast');

// Cache the Intl formatter per timezone rather than rebuilding it every second
let timezoneFormatter = null;
let timezoneFormatterZone = null;

// SVG Icons mapping for prayers
const PRAYER_ICONS = {
    Fajr: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    Sunrise: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    Dhuhr: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="m4.22 19.78 1.42-1.42"/><path d="m18.36 5.64 1.42-1.42"/></svg>',
    Asr: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10l4.5 4.5"/><circle cx="12" cy="12" r="10"/></svg>',
    Maghrib: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h18"/><path d="M6 12h12"/><path d="M12 2v7"/><path d="m5 7 7-5 7 5"/><path d="M2 21h20"/></svg>',
    Isha: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
};

const PRAYER_KEYS = [
    { key: 'Fajr', name: 'Fajr' },
    { key: 'Sunrise', name: 'Sunrise' },
    { key: 'Dhuhr', name: 'Dhuhr' },
    { key: 'Asr', name: 'Asr' },
    { key: 'Maghrib', name: 'Maghrib' },
    { key: 'Isha', name: 'Isha' }
];

function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

function initSettingsUI() {
    if (methodSelect) methodSelect.value = state.method;
    if (madhabSelect) madhabSelect.value = state.school;
    updateTimeFormatToggleUI();
}

function updateTimeFormatToggleUI() {
    if (!formatToggleBtn || !formatToggleLabelEl) return;

    const is12Hour = state.timeFormat === '12h';
    const nextFormat = is12Hour ? '24-hour' : '12-hour';

    formatToggleLabelEl.textContent = is12Hour ? '12H' : '24H';
    formatToggleBtn.title = `Switch to ${nextFormat} time format`;
    formatToggleBtn.setAttribute('aria-label', `Switch to ${nextFormat} time format`);
}

function initSearchInput() {
    if (usingDefaultLocation) {
        citySearchInput.value = `${state.city}, ${state.country}`;
    }
}

function hideAutocomplete() {
    autocompleteDropdown.classList.add('hidden');
    autocompleteDropdown.innerHTML = '';
    citySearchInput.setAttribute('aria-expanded', 'false');
    activeSuggestionIndex = -1;
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

function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 3500);
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function renderPrayerData() {
    locationNameEl.textContent = state.country ? `${state.city}, ${state.country}` : state.city;

    if (state.dateInfo) {
        gregorianDateEl.textContent = state.dateInfo.gregorian.date;
        hijriDateEl.textContent = `${state.dateInfo.hijri.day} ${state.dateInfo.hijri.month.en} ${state.dateInfo.hijri.year} AH`;
        scheduleDateLabelEl.textContent = state.dateInfo.gregorian.date;
    }

    renderPrayerTimeline();
    updateClockAndCountdown();
}

function updateMosqueLink() {
    if (!mosqueLinkEl) return;

    mosqueLinkEl.href = mosqueSearchUrl(state.city, state.country);
    if (mosqueLinkLabelEl) {
        mosqueLinkLabelEl.textContent = state.city ? `Find Mosques near ${state.city}` : 'Find Mosques';
    }
}

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
                <div class="prayer-time">${formatTime(timeStr)}</div>
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

/**
 * Format a prayer time string (e.g. "05:42" or "13:15") or a Date object
 * according to the user's selected 12h/24h preference.
 */
function formatTime(timeInput, { withSeconds = false, timeZone = null } = {}) {
    if (timeInput === null || timeInput === undefined || timeInput === '') {
        return '--:--';
    }

    let date;

    if (timeInput instanceof Date) {
        date = timeInput;
    } else {
        const timePart = String(timeInput).trim().split(/\s+/)[0];
        const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timePart);

        if (!match) return '--:--';

        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        const seconds = Number(match[3] || 0);

        if (hours > 23 || minutes > 59 || seconds > 59) return '--:--';

        // Use a fixed local date so only the clock portion is formatted.
        date = new Date(2000, 0, 1, hours, minutes, seconds);
    }

    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: state.timeFormat === '12h'
    };

    if (withSeconds) {
        options.second = '2-digit';
    }

    if (timeZone) {
        options.timeZone = timeZone;
    }

    try {
        return date.toLocaleTimeString('en-US', options);
    } catch (error) {
        // Fall back to the browser timezone if the API sent an invalid zone.
        delete options.timeZone;
        return date.toLocaleTimeString('en-US', options);
    }
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

function getNowParts(date = new Date()) {
    const formatter = getTimeFormatter();

    if (!formatter) {
        return {
            hours: date.getHours(),
            minutes: date.getMinutes(),
            seconds: date.getSeconds()
        };
    }

    const parts = {};
    formatter.formatToParts(date).forEach(part => {
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
    const now = new Date();
    const nowParts = getNowParts(now);

    currentClockEl.textContent = formatTime(now, {
        withSeconds: true,
        timeZone: state.timezone
    });

    if (!state.timings) return;

    const info = getNextPrayerInfo(nowParts);
    if (!info) return;

    nextPrayerNameEl.textContent = info.next.name;
    nextPrayerTimeEl.textContent = `At ${formatTime(info.next.timeStr)}`;
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
