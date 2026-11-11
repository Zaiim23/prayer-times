const API_BASE_ALADHAN = 'https://api.aladhan.com/v1';
const API_NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const API_OPEN_METEO_GEO = 'https://geocoding-api.open-meteo.com/v1/search';

async function fetchCitySuggestions(query, signal) {
    try {
        const url = `${API_OPEN_METEO_GEO}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
        const response = await fetch(url, { signal });
        if (!response.ok) {
            throw new Error('Failed to fetch city suggestions');
        }
        const data = await response.json();
        return (data.results || []).filter(item =>
            typeof item.latitude === 'number' && typeof item.longitude === 'number'
        );
    } catch (error) {
        if (error.name === 'AbortError') {
            throw error;
        }
        console.error('Error in fetchCitySuggestions:', error);
        return [];
    }
}

async function fetchPrayerTimesByCity(city, country = '', method = 2, school = 0) {
    try {
        const queryCity = encodeURIComponent(city);
        const queryCountry = encodeURIComponent(country);
        const url = `${API_BASE_ALADHAN}/timingsByCity?city=${queryCity}&country=${queryCountry}&method=${method}&school=${school}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch prayer times for ${city}`);
        }
        const data = await response.json();
        if (data.code !== 200) {
            throw new Error(data.data || 'Invalid response from AlAdhan API');
        }
        return data.data;
    } catch (error) {
        console.error('Error in fetchPrayerTimesByCity:', error);
        throw error;
    }
}

async function fetchPrayerTimesByCoords(lat, lng, method = 2, school = 0) {
    const requested = dateStamp(new Date());
    const data = await requestTimings(requested, lat, lng, method, school);

    // Timings are resolved on the given date, so a browser sitting in another
    // half of the world can land on the previous day for that city.
    const locationDate = dateInZone(data.meta && data.meta.timezone);

    if (locationDate !== requested) {
        return requestTimings(locationDate, lat, lng, method, school);
    }

    return data;
}

async function requestTimings(date, lat, lng, method, school) {
    try {
        const url = `${API_BASE_ALADHAN}/timings/${date}?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch prayer times for coordinates');
        }
        const data = await response.json();
        if (data.code !== 200) {
            throw new Error(data.data || 'Invalid response from AlAdhan API');
        }
        return data.data;
    } catch (error) {
        console.error('Error in fetchPrayerTimesByCoords:', error);
        throw error;
    }
}

function dateStamp(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${date.getFullYear()}`;
}

function dateInZone(timeZone, date = new Date()) {
    if (!timeZone) return dateStamp(date);

    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(date);

        const values = {};
        parts.forEach(part => {
            values[part.type] = part.value;
        });

        return `${values.day}-${values.month}-${values.year}`;
    } catch (error) {
        return dateStamp(date);
    }
}

async function reverseGeocode(lat, lng) {
    try {
        const url = `${API_NOMINATIM}?format=json&lat=${lat}&lon=${lng}&zoom=10`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'PrayerTimesWebApp/1.0'
            }
        });
        if (!response.ok) {
            throw new Error('Reverse geocoding failed');
        }
        const data = await response.json();
        const address = data.address || {};
        const city = address.city || address.town || address.village || address.suburb || address.county || 'Unknown Location';
        const country = address.country || '';
        return { city, country, displayName: data.display_name || `${city}, ${country}` };
    } catch (error) {
        console.error('Error in reverseGeocode:', error);
        return { city: 'Current Location', country: '', displayName: `${lat.toFixed(2)}, ${lng.toFixed(2)}` };
    }
}

function mosqueSearchUrl(city, country = '') {
    const place = [city, country].filter(Boolean).join(',');
    if (!place) {
        return 'https://www.google.com/maps/search/mosques';
    }

    const query = encodeURIComponent(place)
        .replace(/%20/g, '+')
        .replace(/%2C/gi, ',');

    return `https://www.google.com/maps/search/mosques+in+${query}`;
}
