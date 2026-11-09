# Prayer Times

A premium, modern Islamic Prayer Times and Nearby Mosques web application built with pure vanilla JavaScript (ES6+), HTML5, and CSS3.

## ✨ Features

- **Accurate Prayer Times:** Powered by the free AlAdhan API with support for multiple calculation methods (ISNA, MWL, Umm Al-Qura, Egyptian General Authority, etc.).
- **Madhab Support:** Toggle between Standard (Shafi, Maliki, Hanbali) and Hanafi calculation methods for Asr.
- **Live Countdown & Clock:** Real-time countdown to the next upcoming prayer alongside a live digital clock.
- **Daily Prayer Timeline:** Beautiful schedule view for Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha with active prayer highlighting.
- **Nearby Mosques Discovery:** Automatically detects user coordinates or searched city to find the 3 closest mosques within a 5km radius using the OpenStreetMap Overpass API and Haversine distance formula.
- **Search & Geolocation:** Search for any city/country worldwide or use browser geolocation with reverse geocoding.
- **Hijri Date Display:** Displays both Gregorian and Islamic (Hijri) calendar dates.
- **Dark Glassmorphism UI:** Stunning, high-end dark glassmorphism design with a smooth light mode toggle.
- **Persistence:** Remembers user location, calculation method, madhab, and theme preferences in `localStorage`.

## 📂 File Structure

```
prayer-times/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── api.js        (AlAdhan, Nominatim, and Overpass API integration)
│   └── app.js        (State management, DOM rendering, live countdown)
└── README.md
```

## 🚀 Getting Started

Simply open `index.html` in any modern web browser or serve it with a local static server (e.g., Live Server in VS Code). No build tools, bundlers, or backend required!
