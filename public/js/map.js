document.addEventListener("DOMContentLoaded", function () {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    let lat = parseFloat(mapElement.dataset.lat) || 0;
    let lng = parseFloat(mapElement.dataset.lng) || 0;
    const title = mapElement.dataset.title || "Listing Location";
    const locationName = mapElement.dataset.location || "";
    const countryName = mapElement.dataset.country || "";
    const fullAddress = [locationName, countryName].filter(Boolean).join(", ");

    function renderLeafletMap(latitude, longitude) {
        const map = L.map("map", {
            center: [latitude, longitude],
            zoom: 14,
            scrollWheelZoom: false,
            zoomControl: true
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const marker = L.marker([latitude, longitude]).addTo(map);

        marker.bindPopup(`
            <div style="text-align: center; padding: 6px 8px; font-family: 'Plus Jakarta Sans', sans-serif;">
                <h6 style="margin: 0 0 6px 0; font-weight: 700; color: #222; font-size: 15px;">${title}</h6>
                <p style="margin: 0; font-size: 13px; color: #fe424d; font-weight: 600;">
                    <i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i>${locationName || fullAddress}
                </p>
            </div>
        `).openPopup();

        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 150);
    }

    if (lat !== 0 && lng !== 0) {
        renderLeafletMap(lat, lng);
    } else if (fullAddress) {
        // Clean detailed address for fallback search
        let cleaned = fullAddress
            .replace(/^[^\:]+\:\s*/, "")
            .replace(/\b(PO|P\.O\.|P\.O|Post Office)\b/gi, "")
            .replace(/\-\s*\d{5,6}|\b\d{5,6}\b/g, "")
            .replace(/\bKokan\b/gi, "Konkan");

        let parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

        async function fetchFallbackCoordinates() {
            for (let i = 0; i < parts.length; i++) {
                let query = parts.slice(i).join(", ");
                if (!query) continue;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    if (data && data.length > 0) {
                        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                    }
                } catch (e) { }
            }
            return null;
        }

        fetchFallbackCoordinates().then(coords => {
            if (coords) {
                renderLeafletMap(coords.lat, coords.lng);
            } else {
                renderLeafletMap(9.5827, 76.3061);
            }
        });
    } else {
        renderLeafletMap(9.5827, 76.3061);
    }
});