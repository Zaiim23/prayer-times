# 🕌 Prayer Times

[![Lint](https://github.com/Zaiim23/prayer-times/actions/workflows/lint.yml/badge.svg)](https://github.com/Zaiim23/prayer-times/actions/workflows/lint.yml)

**[🔴 Live Demo](https://zaiim23.github.io/prayer-times/)**

A premium, modern Islamic Prayer Times and Nearby Mosques web application built with JavaScript (ES6+), HTML5, and CSS3.

## Features

- **Accurate Prayer Times:** Powered by the free AlAdhan API with support for multiple calculation methods (ISNA, MWL, Umm Al-Qura, Egyptian General Authority, etc.).
- **Madhab Support:** Toggle between Standard (Shafi, Maliki, Hanbali) and Hanafi calculation methods for Asr.
- **Live Countdown & Clock:** Timezone-aware countdown to the next upcoming prayer, alongside a live clock for the selected location.
- **12h / 24h Time Format:** Toggle the live clock, next-prayer time, and full schedule between 12-hour AM/PM and 24-hour formats.
- **Daily Prayer Timeline:** Beautiful schedule view for Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha with automatic active-prayer highlighting.
- **Smart City Autocomplete:** Debounced, glassmorphic city suggestions from the Open-Meteo Geocoding API, displayed as `City, Country`.
- **Nearby Mosques Discovery:** Finds the 3 closest mosques within a 5km radius using the OpenStreetMap Overpass API and the Haversine distance formula, with direct Google Maps links.
- **Search & Geolocation:** Search for any city/country worldwide or use browser geolocation with reverse geocoding.
- **Hijri Date Display:** Displays both Gregorian and Islamic (Hijri) calendar dates.
- **Dark Glassmorphism UI:** High-end dark glassmorphism design with a smooth light mode toggle and Lucide-style SVG icons.
- **Persistence:** Remembers user location, calculation method, madhab, theme, and time-format preferences in `localStorage`.
- **Race-Safe Requests:** Debounced search and `AbortController`-backed requests prevent stale city or mosque data from overwriting newer results.

## File Structure

```
prayer-times/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── api.js        (AlAdhan, Open-Meteo, Nominatim, and Overpass API integration)
│   ├── ui.js         (DOM caching, rendering, live countdown, and presentational helpers)
│   └── app.js        (State management, autocomplete, request handling, and event listeners)
├── .github/
│   └── workflows/
│       └── lint.yml  (JavaScript syntax, asset, and CSS checks)
├── LICENSE
└── README.md
```

## APIs

- [AlAdhan Prayer Times](https://aladhan.com/prayer-times-api) for prayer timings and Hijri dates.
- [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) for city suggestions.
- [OpenStreetMap Overpass](https://overpass-api.de/) for nearby mosques.
- [Nominatim](https://nominatim.openstreetmap.org/) for reverse geocoding and city coordinates.

## Important Note

Prayer times are calculated for the selected location. Always check with the specific mosque for their exact Iqamah and Jummah times.

## Getting Started

Simply open `index.html` in any modern web browser or serve it with a local static server (e.g., Live Server in VS Code). No build tools, bundlers, or backend required!
