import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    SafeAreaView,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { BASE_URL } from '../services/api';

const HAZARD_COLORS = {
    FLOOD: '#0284C7',
    LANDSLIDE: '#D97706',
    HEAVY_RAIN: '#4F46E5',
    TSUNAMI: '#DC2626',
};

export default function LiveMapScreen({ onBackToReport }) {
    const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
    const [userLocation, setUserLocation] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchIncidents = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let loc = await Location.getCurrentPositionAsync({});
                const lat = loc.coords.latitude;
                const lon = loc.coords.longitude;
                // If iOS simulator mock location (SF), default to Sri Lanka
                if (lat > 30 && lon < -100) {
                    setUserLocation({ latitude: 6.914694, longitude: 79.973117 });
                } else {
                    setUserLocation(loc.coords);
                }
            } else {
                setUserLocation({ latitude: 6.914694, longitude: 79.973117 });
            }

            // Fetch live incidents from backend
            const res = await fetch(`${BASE_URL}/reports/active`);
            const rawText = await res.text();

            if (!res.ok) {
                console.error(`[LiveMap] Server error HTTP ${res.status}:`, rawText.slice(0, 200));
                throw new Error(`Server responded with HTTP ${res.status}`);
            }

            if (!rawText || rawText.trim() === '') {
                console.warn('[LiveMap] Server returned an empty body');
                return;
            }

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (parseErr) {
                console.error('[LiveMap] Failed to parse JSON:', rawText.slice(0, 300));
                throw new Error('Server returned non-JSON response');
            }

            if (data.success && Array.isArray(data.data)) {
                setIncidents(data.data);
            } else if (data.features && Array.isArray(data.features)) {
                const mapped = data.features.map((f) => ({
                    _id: f.properties?.clusterId || Math.random().toString(),
                    hazardType: f.properties?.hazardType || 'FLOOD',
                    description: `${f.properties?.hazardType} in ${f.properties?.district || 'Incident Area'}`,
                    latitude: f.geometry?.coordinates?.[1] || 0,
                    longitude: f.geometry?.coordinates?.[0] || 0,
                    createdAt: f.properties?.updatedAt || new Date().toISOString(),
                }));
                setIncidents(mapped);
            }
        } catch (err) {
            console.error('Failed to fetch active reports:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncidents();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBackToReport} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Report Hazard</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Live Incident Feed</Text>
                <View style={styles.topActions}>
                    <TouchableOpacity onPress={fetchIncidents} style={styles.refreshBtn}>
                        <Text style={styles.refreshBtnText}>🔄</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
                        style={styles.toggleBtn}
                    >
                        <Text style={styles.toggleBtnText}>
                            {viewMode === 'map' ? '📋 List' : '🗺️ Map'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#0284C7" />
                    <Text style={styles.loadingText}>Fetching active incidents...</Text>
                </View>
            ) : viewMode === 'map' ? (
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: userLocation?.latitude && userLocation.latitude < 30 ? userLocation.latitude : 6.914694,
                        longitude: userLocation?.longitude && userLocation.longitude > 0 ? userLocation.longitude : 79.973117,
                        latitudeDelta: 0.15,
                        longitudeDelta: 0.15,
                    }}
                    showsUserLocation
                    showsMyLocationButton
                >
                    {incidents.map((item) => (
                        <Marker
                            key={item._id || item.id}
                            coordinate={{
                                latitude: item.latitude,
                                longitude: item.longitude,
                            }}
                            pinColor={HAZARD_COLORS[item.hazardType] || '#DC2626'}
                        >
                            <Callout>
                                <View style={styles.calloutBox}>
                                    <Text style={styles.calloutTitle}>{item.hazardType}</Text>
                                    <Text style={styles.calloutDesc}>{item.description}</Text>
                                    <Text style={styles.calloutTime}>
                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </Callout>
                        </Marker>
                    ))}
                </MapView>
            ) : (
                <FlatList
                    data={incidents}
                    keyExtractor={(item) => item._id || item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text
                                    style={[
                                        styles.badge,
                                        { backgroundColor: HAZARD_COLORS[item.hazardType] || '#DC2626' },
                                    ]}
                                >
                                    {item.hazardType}
                                </Text>
                                <Text style={styles.cardTime}>
                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                            <Text style={styles.cardDesc}>{item.description}</Text>
                            <Text style={styles.cardCoords}>
                                📍 Lat: {item.latitude.toFixed(4)}, Lon: {item.longitude.toFixed(4)}
                            </Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: { paddingVertical: 4 },
    backButtonText: { color: '#0284C7', fontWeight: '800', fontSize: 14 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
    topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    refreshBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
    refreshBtnText: { fontSize: 14 },
    toggleBtn: { backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    toggleBtnText: { color: '#0284C7', fontWeight: '800', fontSize: 12 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#64748B', fontWeight: '600', fontSize: 13 },
    map: { flex: 1 },
    calloutBox: { width: 160, padding: 4 },
    calloutTitle: { fontWeight: '800', fontSize: 13, color: '#0F172A' },
    calloutDesc: { fontSize: 11, color: '#334155', marginTop: 2 },
    calloutTime: { fontSize: 10, color: '#64748B', marginTop: 4 },
    listContent: { padding: 16 },
    card: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    badge: { color: '#FFFFFF', fontWeight: '800', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    cardTime: { fontSize: 11, color: '#64748B', fontWeight: '600' },
    cardDesc: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
    cardCoords: { fontSize: 11, color: '#0284C7', fontWeight: '700' },
});