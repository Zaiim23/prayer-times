/**
 * api.js - API services for Prayer Times and Nearby Mosques
 */

const API_BASE_ALADHAN = 'https://api.aladhan.com/v1';
const API_NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const API_OVERPASS = 'https://overpass-api.de/api/interpreter';
const API_OPEN_METEO_GEO = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Fetch city suggestions from Open-Meteo Geocoding API.
 * Supports an AbortSignal so stale searches can be cancelled.
 */
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

/**
 * Fetch prayer times by city and country
 */
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

/**
 * Fetch prayer times by geographic coordinates
 */
async function fetchPrayerTimesByCoords(lat, lng, method = 2, school = 0) {
    try {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const dateStr = `${day}-${month}-${year}`;

        const url = `${API_BASE_ALADHAN}/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;
        
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

/**
 * Reverse geocode coordinates to get city & country name
 */
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

/**
 * Haversine distance formula in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Fetch nearby mosques using Overpass API.
 * Limits results to the 5 closest nodes for a much faster response,
 * and accepts an AbortSignal so stale requests can be cancelled.
 */
async function fetchNearbyMosques(lat, lng, radius = 5000, signal) {
    try {
        const query = `[out:json];node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});out 5;`;
        const url = `${API_OVERPASS}?data=${encodeURIComponent(query)}`;

        const response = await fetch(url, { signal });
        if (!response.ok) {
            throw new Error('Failed to fetch nearby mosques from OpenStreetMap');
        }
        const data = await response.json();
        const elements = data.elements || [];

        const mosques = elements.map(el => {
            const name = el.tags && (el.tags.name || el.tags['name:en'] || el.tags['alt_name']) ? (el.tags.name || el.tags['name:en'] || el.tags['alt_name']) : 'Unnamed Mosque';
            const dist = calculateDistance(lat, lng, el.lat, el.lon);
            return {
                id: el.id,
                name: name,
                lat: el.lat,
                lon: el.lon,
                distance: dist
            };
        });

        mosques.sort((a, b) => a.distance - b.distance);
        return mosques.slice(0, 3);
    } catch (error) {
        if (error.name === 'AbortError') {
            return null;
        }
        console.error('Error in fetchNearbyMosques:', error);
        return [];
    }
}
