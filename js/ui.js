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
const hijriArabicEl = document.getElementById('hijri-date-arabic');
const nextPrayerNameEl = document.getElementById('next-prayer-name');
const nextPrayerArabicEl = document.getElementById('next-prayer-arabic');
const countdownTimerEl = document.getElementById('countdown-timer');
const nextPrayerTimeEl = document.getElementById('next-prayer-time');
const currentClockEl = document.getElementById('current-clock');
const scheduleDateLabelEl = document.getElementById('schedule-date-label');
const prayerListEl = document.getElementById('prayer-list');
const mosqueLinkEl = document.getElementById('mosque-link');
const mosqueLinkLabelEl = document.getElementById('mosque-link-label');
const toastEl = document.getElementById('toast');

const PRAYERS = [
    { key: 'Fajr', name: 'Fajr', arabic: 'الفجر', obligatory: true },
    { key: 'Sunrise', name: 'Sunrise', arabic: 'الشروق', obligatory: false },
    { key: 'Dhuhr', name: 'Dhuhr', arabic: 'الظهر', obligatory: true },
    { key: 'Asr', name: 'Asr', arabic: 'العصر', obligatory: true },
    { key: 'Maghrib', name: 'Maghrib', arabic: 'المغرب', obligatory: true },
    { key: 'Isha', name: 'Isha', arabic: 'العشاء', obligatory: true }
];

const OBLIGATORY_PRAYERS = PRAYERS.filter(prayer => prayer.obligatory);

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

let zonedFormatter = null;
let zonedFormatterZone = null;
let toastTimer = null;

function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);

    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    themeToggleBtn.title = `Switch to ${nextTheme} theme`;
    themeToggleBtn.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
}

function initSettingsUI() {
    methodSelect.value = state.method;
    madhabSelect.value = state.school;
    updateTimeFormatToggleUI();
}

function updateTimeFormatToggleUI() {
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
        autocompleteDropdown.innerHTML = '<div class="autocomplete-empty">No matching cities found</div>';
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
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');

    toastTimer = setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 3500);
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function fullGregorianLabel(date) {
    const weekday = date.weekday && date.weekday.en ? `${date.weekday.en}, ` : '';
    return `${weekday}${Number(date.day)} ${date.month.en} ${date.year}`;
}

function shortGregorianLabel(date) {
    return `${Number(date.day)} ${date.month.en.slice(0, 3)} ${date.year}`;
}

function toArabicDigits(value) {
    return String(value).replace(/\d/g, digit => ARABIC_DIGITS[Number(digit)]);
}

function arabicHijriLabel(hijri) {
    const weekday = hijri.weekday && hijri.weekday.ar ? `${hijri.weekday.ar}، ` : '';
    return `${weekday}${toArabicDigits(Number(hijri.day))} ${hijri.month.ar} ${toArabicDigits(hijri.year)}\u00a0هـ`;
}

function renderPrayerData() {
    locationNameEl.textContent = state.country ? `${state.city}, ${state.country}` : state.city;

    if (state.dateInfo) {
        const { gregorian, hijri } = state.dateInfo;
        gregorianDateEl.textContent = fullGregorianLabel(gregorian);
        hijriDateEl.textContent = `${Number(hijri.day)} ${hijri.month.en} ${hijri.year} AH`;
        hijriArabicEl.textContent = arabicHijriLabel(hijri);
        scheduleDateLabelEl.textContent = shortGregorianLabel(gregorian);
    }

    renderPrayerTimeline();
    updateClockAndCountdown();
}

function updateMosqueLink() {
    mosqueLinkEl.href = mosqueSearchUrl(state.city, state.country);

    const label = state.city ? `Find Mosques near ${state.city}` : 'Find Mosques';
    mosqueLinkLabelEl.textContent = label;
    mosqueLinkEl.setAttribute('aria-label', `${label} — opens Google Maps in a new tab`);
}

function renderPrayerTimeline() {
    if (!state.timings) return;

    const info = getNextPrayerInfo();
    state.activeKey = info ? info.activeKey : null;

    prayerListEl.innerHTML = PRAYERS.map(prayer => {
        const isActive = state.activeKey === prayer.key;

        return `
            <div class="prayer-item${isActive ? ' active' : ''}" data-prayer-key="${prayer.key}">
                <span class="prayer-marker" aria-hidden="true"></span>
                <span class="prayer-identity">
                    <span class="prayer-name">${prayer.name}</span>
                    <span class="prayer-arabic" lang="ar" dir="rtl">${prayer.arabic}</span>
                </span>
                <span class="prayer-time">${formatTime(state.timings[prayer.key])}</span>
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
        delete options.timeZone;
        return date.toLocaleTimeString('en-US', options);
    }
}

function formatterFor(zone) {
    if (!zone) return null;

    if (zonedFormatterZone !== zone) {
        try {
            zonedFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: zone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hourCycle: 'h23'
            });
        } catch (error) {
            zonedFormatter = null;
        }

        zonedFormatterZone = zone;
    }

    return zonedFormatter;
}

// Wall-clock parts for a city, so every comparison uses the selected timezone.
function zonedParts(date, zone = state.timezone) {
    const formatter = formatterFor(zone);

    if (!formatter) {
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
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
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hours: Number(parts.hour) % 24,
        minutes: Number(parts.minute),
        seconds: Number(parts.second)
    };
}

// Offset of a zone at a given instant, derived by comparing its wall clock to UTC.
function zoneOffset(date, zone) {
    if (!zone) return 0;

    const parts = zonedParts(date, zone);
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes, parts.seconds);
    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// Reapply the offset once more so prayers around a DST change land on the right instant.
function prayerInstant(dayParts, timeStr, zone) {
    const [hours, minutes] = timeStr.split(' ')[0].split(':').map(Number);

    if (!zone) {
        return new Date(dayParts.year, dayParts.month - 1, dayParts.day, hours, minutes, 0).getTime();
    }

    const localAsUtc = Date.UTC(dayParts.year, dayParts.month - 1, dayParts.day, hours, minutes, 0);
    let instant = localAsUtc;

    for (let pass = 0; pass < 2; pass += 1) {
        instant = localAsUtc - zoneOffset(new Date(instant), zone);
    }

    return instant;
}

function addDays(dayParts, amount) {
    const date = new Date(Date.UTC(dayParts.year, dayParts.month - 1, dayParts.day + amount));

    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate()
    };
}

function getNextPrayerInfo(now = new Date()) {
    if (!state.timings) return null;

    const today = zonedParts(now);
    const nowMs = now.getTime();
    let next = null;
    let active = null;

    for (const prayer of OBLIGATORY_PRAYERS) {
        const timeStr = state.timings[prayer.key];
        if (!timeStr) continue;

        const instant = prayerInstant(today, timeStr, state.timezone);

        if (instant <= nowMs) {
            active = prayer;
        } else if (!next) {
            next = { ...prayer, timeStr, instant };
        }
    }

    if (!next) {
        const tomorrow = addDays(today, 1);
        const fajr = OBLIGATORY_PRAYERS[0];
        const timeStr = state.timings[fajr.key];

        next = {
            ...fajr,
            timeStr,
            instant: prayerInstant(tomorrow, timeStr, state.timezone)
        };
        active = OBLIGATORY_PRAYERS[OBLIGATORY_PRAYERS.length - 1];
    }

    return {
        next,
        activeKey: active ? active.key : OBLIGATORY_PRAYERS[OBLIGATORY_PRAYERS.length - 1].key
    };
}

function updateClockAndCountdown() {
    const now = new Date();

    currentClockEl.textContent = formatTime(now, {
        withSeconds: true,
        timeZone: state.timezone
    });

    if (!state.timings) return;

    const info = getNextPrayerInfo(now);
    if (!info) return;

    nextPrayerNameEl.textContent = info.next.name;
    nextPrayerArabicEl.textContent = info.next.arabic;
    nextPrayerTimeEl.textContent = `At ${formatTime(info.next.timeStr)}`;
    updateActivePrayerHighlight(info.activeKey);

    const totalSeconds = Math.max(0, Math.ceil((info.next.instant - now.getTime()) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdownTimerEl.textContent = [hours, minutes, seconds]
        .map(value => String(value).padStart(2, '0'))
        .join(':');
}
