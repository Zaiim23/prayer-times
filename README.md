# Prayer Times

[![Lint](https://github.com/Zaiim23/prayer-times/actions/workflows/lint.yml/badge.svg)](https://github.com/Zaiim23/prayer-times/actions/workflows/lint.yml)

**[Live Demo](https://zaiim23.github.io/prayer-times/)**

A web-based tool for Islamic prayer times. It uses a manuscript-inspired emerald, gold, and sand color scheme, displays the Hijri date, and keeps the countdown synced to the selected city's timezone. Built entirely with vanilla HTML, CSS, and JavaScript. No frameworks, no build step.

## Features

- **Design:** A custom palette (`#0F3D30`, `#C5A869`, `#F9F6F0`) featuring an 8-pointed star (Rub el Hizb) motif, geometric borders, and sharp 1px lines.
- **Typography:** Uses Lora for headings, Inter for UI text, IBM Plex Mono for times, and Amiri for Arabic text.
- **Calendar:** Displays the current Hijri date in both English and Arabic.
- **Timezone handling:** The live countdown and clock use the selected city's IANA timezone, not the user's local browser time.
- **Prayer Data:** Fetches timings from the AlAdhan API. Supports 8 calculation methods and Shafi/Hanafi Asr settings.
- **Time Format:** Toggle between 12-hour and 24-hour formats for the clock and schedule.
- **Schedule:** Lists Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha. Highlights the current prayer.
- **Search:** Debounced city autocomplete using the Open-Meteo Geocoding API.
- **Mosque Search:** Opens a Google Maps search for mosques around the selected city.
- **Location:** Supports browser geolocation with reverse geocoding via Nominatim.
- **Themes:** Includes both dark (emerald) and light (sand) modes.
- **Reliability:** Uses `AbortController` and request counters to prevent out-of-order API responses.

## File Structure
prayer-times/
├── index.html
├── favicon.svg
├── css/
│ └── style.css
├── js/
│ ├── api.js (API calls and Google Maps URL builder)
│ ├── ui.js (DOM rendering and timezone logic)
│ └── app.js (State, events, and autocomplete)
├── .github/
│ └── workflows/
│ └── lint.yml
├── LICENSE
└── README.md

## APIs Used

- [AlAdhan Prayer Times](https://aladhan.com/prayer-times-api)
- [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api)
- [Nominatim](https://nominatim.openstreetmap.org/)
- Google Maps (for mosque links)

## Note

Prayer times are calculated based on the selected location. Always check with your local mosque for exact Iqamah and Jummah times.

## Run Locally

Open `index.html` directly in a browser, or use a local static server (like VS Code Live Server or `npx serve`).
