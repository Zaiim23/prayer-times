# 🕌 Prayer Times

[![Lint](https://github.com/Zaiim23/prayer-times/actions/workflows/lint.yml/badge.svg)](https://github.com/Zaiim23/prayer-times/actions/workflows/lint.yml)

**[🔴 Live Demo](https://zaiim23.github.io/prayer-times/)**

A premium Islamic Prayer Times web app — emerald and gold manuscript styling, Hijri dates in Arabic and English, and a live countdown that always follows the selected city's timezone. Built with vanilla JavaScript, HTML5, and CSS3. No frameworks, no build step.

## Features

- **Islamic Design Language:** Deep emerald (`#0F3D30`), gold (`#C5A869`), and sand (`#F9F6F0`) palette with a hand-drawn Rub el Hizb (8-pointed star) motif, double-line geometric frames, sharp 1px borders, and a faint tiled pattern.
- **Typography:** [Lora](https://fonts.google.com/specimen/Lora) for headings and labels, [Inter](https://fonts.google.com/specimen/Inter) for UI text, [IBM Plex Mono](https://fonts.google.com/specimen/IBMPlexMono) for times, and [Amiri](https://fonts.google.com/specimen/Amiri) for Arabic.
- **Hijri Calendar:** Today's Hijri date shown prominently in gold, with the Arabic date and Arabic prayer names alongside every English label.
- **Timezone-Aware Countdown:** The countdown and clock are computed from the selected city's IANA timezone (DST-safe), never the browser's.
- **Accurate Prayer Times:** Powered by the free [AlAdhan](https://aladhan.com/prayer-times-api) API with eight calculation methods and Shafi/Hanafi Asr support.
- **12h / 24h Time Format:** Toggle the clock, next prayer, and full schedule between 12-hour AM/PM and 24-hour formats.
- **Daily Prayer Timeline:** Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha in a ruled schedule with the current prayer highlighted in gold.
- **Smart City Autocomplete:** Debounced city suggestions from the Open-Meteo Geocoding API, shown as `City, Country` with keyboard navigation.
- **Find Mosques Near Me:** One click opens a Google Maps search for mosques around the selected city — instant, reliable, and API-free.
- **Search & Geolocation:** Search any city worldwide or use browser geolocation with reverse geocoding.
- **Dark & Light Themes:** Emerald night mode and a warm sand day mode, both persisted in `localStorage`.
- **Race-Safe Requests:** `AbortController`-backed requests and request counters prevent stale city data from overwriting newer results.

## File Structure

```
prayer-times/
├── index.html
├── favicon.svg
├── css/
│   └── style.css
├── js/
│   ├── api.js   (AlAdhan, Open-Meteo, Nominatim, and Google Maps links)
│   ├── ui.js    (DOM caching, rendering, timezone-aware countdown)
│   └── app.js   (State management, autocomplete, request handling, events)
├── .github/
│   └── workflows/
│       └── lint.yml  (JavaScript syntax, asset, and CSS checks)
├── LICENSE
└── README.md
```

## APIs

- [AlAdhan Prayer Times](https://aladhan.com/prayer-times-api) — prayer timings, Hijri dates, and timezone metadata.
- [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) — city suggestions.
- [Nominatim](https://nominatim.openstreetmap.org/) — reverse geocoding for the Nearby button.
- [Google Maps](https://www.google.com/maps) — mosque search links (no API key required).

## Important Note

Prayer times are calculated for the selected location. Always check with the specific mosque for their exact Iqamah and Jummah times.

## Getting Started

Open `index.html` in any modern browser, or serve the folder with any static server (for example `npx serve` or Live Server in VS Code). No build tools, bundlers, or backend required.
