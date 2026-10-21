import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker asset paths safely in React Vite
try {
    if (L?.Icon?.Default?.prototype?._getIconUrl) {
        delete L.Icon.Default.prototype._getIconUrl;
    }
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
} catch (e) {
    console.warn('Leaflet default icon patch warning:', e);
}

// Custom marker icons
const centroidIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const citizenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [20, 32],
    iconAnchor: [10, 32],
    popupAnchor: [1, -26],
    shadowSize: [32, 32],
});

export default function ClusterMap({ cluster }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    if (!cluster || !cluster.centroid?.coordinates || !Array.isArray(cluster.centroid.coordinates) || cluster.centroid.coordinates.length < 2) {
        return (
            <div className="map-placeholder" style={{ padding: '20px', background: '#F3F4F6', borderRadius: '8px', color: '#6B7280', textAlign: 'center', marginTop: '12px' }}>
                ⚠️ No valid GPS location available for this cluster.
            </div>
        );
    }

    // GeoJSON coordinates format is [longitude, latitude]
    const centerLng = Number(cluster.centroid.coordinates[0]);
    const centerLat = Number(cluster.centroid.coordinates[1]);

    if (isNaN(centerLat) || isNaN(centerLng)) {
        return (
            <div className="map-placeholder" style={{ padding: '20px', background: '#F3F4F6', borderRadius: '8px', color: '#6B7280', textAlign: 'center', marginTop: '12px' }}>
                ⚠️ Invalid GPS coordinates for cluster centroid.
            </div>
        );
    }

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Clean up previous map instance if existing
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        // Initialize pure Leaflet map instance
        const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 14);
        mapInstanceRef.current = map;

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        // Add Centroid Marker
        const centroidMarker = L.marker([centerLat, centerLng], { icon: centroidIcon }).addTo(map);
        centroidMarker.bindPopup(`
            <div>
                <strong style="color: #DC2626;">🚨 Cluster Centroid</strong>
                <p style="margin: 4px 0 0 0; font-size: 12px;">
                    Type: ${cluster.hazardType || 'Unknown'}<br />
                    District: ${cluster.district || 'N/A'}<br />
                    Confidence Score: ${cluster.confidenceScore ?? 'N/A'}
                </p>
            </div>
        `);

        // Add 500m Hazard Spread Circle
        L.circle([centerLat, centerLng], {
            radius: 500,
            color: '#DC2626',
            fillColor: '#DC2626',
            fillOpacity: 0.2,
        }).addTo(map);

        // Add Individual Citizen Report Markers
        if (Array.isArray(cluster.reports)) {
            cluster.reports.forEach((report, idx) => {
                if (!report || typeof report !== 'object') return;
                const coords = report.location?.coordinates || report.coordinates;
                if (!coords || !Array.isArray(coords) || coords.length < 2) return;

                const rLng = Number(coords[0]);
                const rLat = Number(coords[1]);
                if (isNaN(rLat) || isNaN(rLng)) return;

                const photoImg = Array.isArray(report.photoUrls) && report.photoUrls.length > 0
                    ? `<img src="${report.photoUrls[0]}" alt="Evidence" style="width:100%; height:80px; object-fit:cover; border-radius:4px; margin-top:4px;" />`
                    : '';

                const reporterName = report.reporter?.fullName || 'Anonymous';
                const desc = report.description || 'No description provided';

                const reportMarker = L.marker([rLat, rLng], { icon: citizenIcon }).addTo(map);
                reportMarker.bindPopup(`
                    <div style="max-width: 180px;">
                        <strong style="font-size: 12px; color: #0284C7;">
                            Report #${idx + 1} (${reporterName})
                        </strong>
                        <p style="font-size: 11px; margin: 4px 0;">
                            ${desc}
                        </p>
                        ${photoImg}
                    </div>
                `);
            });
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [cluster, centerLat, centerLng]);

    return (
        <div
            ref={mapContainerRef}
            style={{ height: '350px', width: '100%', borderRadius: '10px', overflow: 'hidden', marginTop: '12px', position: 'relative', zIndex: 1 }}
        />
    );
}