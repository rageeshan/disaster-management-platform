import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { saveReportOffline, syncOfflineReports, getOfflineQueue } from '../utils/offlineQueue';
import { BASE_URL } from '../services/api';

const HAZARD_TYPES = [
    { id: 'FLOOD', label: 'FLOOD', icon: '🌊', color: '#0284C7' },
    { id: 'LANDSLIDE', label: 'LANDSLIDE', icon: '⛰️', color: '#D97706' },
    { id: 'HEAVY_RAIN', label: 'HEAVY RAIN', icon: '🌧️', color: '#4F46E5' },
    { id: 'TSUNAMI', label: 'TSUNAMI', icon: '🌊', color: '#DC2626' },
];

export default function ExpressReportScreen({
    userSession,
    onBackToAuth,
    onSwitchToDetailed,
    onOpenLiveMap,
    onOpenMyReports,
}) {
    const [selectedHazard, setSelectedHazard] = useState('FLOOD');
    const [description, setDescription] = useState('');
    const [imageUri, setImageUri] = useState(null);
    const [location, setLocation] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [queuedCount, setQueuedCount] = useState(0);

    // Default fallback location (Colombo, Sri Lanka)
    const DEFAULT_LOCATION = { latitude: 6.914694, longitude: 79.973117 };

    // Auto-capture GPS & Listen for Network Restoration
    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        'Location Permission Denied',
                        'GPS permission not granted. Using default location (Colombo, Sri Lanka).'
                    );
                    setLocation(DEFAULT_LOCATION);
                    setLoadingLocation(false);
                    return;
                }

                let currentLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                // Check if returning iOS Simulator / Expo default mock location (San Francisco area ~37.78, -122.40)
                const lat = currentLocation.coords.latitude;
                const lon = currentLocation.coords.longitude;
                if (lat > 30 && lon < -100) {
                    console.log('Detected iOS Simulator mock location (SF). Defaulting to Colombo, Sri Lanka.');
                    setLocation(DEFAULT_LOCATION);
                } else {
                    setLocation(currentLocation.coords);
                }
            } catch (error) {
                Alert.alert(
                    'GPS Error',
                    'Could not obtain live location. Using default location (Colombo, Sri Lanka).'
                );
                setLocation(DEFAULT_LOCATION);
            } finally {
                setLoadingLocation(false);
            }
        })();

        // Check existing queued reports
        getOfflineQueue().then((q) => setQueuedCount(q.length));

        // Listen for connection status changes to sync automatically
        const unsubscribe = NetInfo.addEventListener((state) => {
            if (state.isConnected) {
                syncOfflineReports().then((res) => {
                    if (res.synced > 0) {
                        Alert.alert('Auto-Synced!', `${res.synced} offline emergency report(s) successfully dispatched.`);
                        getOfflineQueue().then((q) => setQueuedCount(q.length));
                    }
                });
            }
        });

        return () => unsubscribe();
    }, []);

    const handlePickImage = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Denied', 'Camera permission is required.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmitReport = async () => {
        if (!location) {
            Alert.alert('GPS Required', 'Please wait for GPS location capture before submitting.');
            return;
        }

        setSubmitting(true);

        const netStatus = await NetInfo.fetch();

        // Offline fallback path: Store JSON payload locally for later sync
        if (!netStatus.isConnected) {
            const offlinePayload = {
                hazardType: selectedHazard,
                description: description || `Express report for ${selectedHazard}`,
                latitude: location.latitude,
                longitude: location.longitude,
                photoUrl: imageUri || null,
                isGuestReport: userSession?.isGuest ?? true,
                token: userSession?.token || null,
                isDetailed: false,
            };

            await saveReportOffline(offlinePayload);
            setSubmitting(false);
            Alert.alert(
                'Report Submitted Successfully! ✅',
                'No internet connection detected. Your report was saved locally to sync queue. Check History for status updates. Thank you for reporting!',
                [{ text: 'OK', onPress: onOpenMyReports }]
            );
            getOfflineQueue().then((q) => setQueuedCount(q.length));
            return;
        }

        // Online dispatch path using FormData for Multer & Cloudinary compatibility
        try {
            const formData = new FormData();
            formData.append('hazardType', selectedHazard);
            formData.append('description', description || `Express report for ${selectedHazard}`);
            formData.append('latitude', location.latitude.toString());
            formData.append('longitude', location.longitude.toString());
            formData.append('isGuestReport', userSession?.isGuest ? 'true' : 'false');
            formData.append('isDetailed', 'false');

            // Append captured photo if available
            if (imageUri) {
                const filename = imageUri.split('/').pop() || 'photo.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';

                formData.append('photos', {
                    uri: imageUri,
                    name: filename,
                    type,
                });
            }

            const headers = {};
            if (userSession?.token) {
                headers['Authorization'] = `Bearer ${userSession.token}`;
            }

            const response = await fetch(`${BASE_URL}/reports/submit`, {
                method: 'POST',
                headers,
                body: formData,
            });

            const result = await response.json();

            if (response.ok || result.success) {
                Alert.alert(
                    'Report Submitted Successfully! ✅',
                    'Your emergency report has been submitted successfully! Check History for status updates. Thank you for reporting.',
                    [{ text: 'OK', onPress: onOpenMyReports }]
                );
            } else {
                // Queue offline if backend responds with error
                const offlinePayload = {
                    hazardType: selectedHazard,
                    description: description || `Express report for ${selectedHazard}`,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    photoUrl: imageUri || null,
                    isGuestReport: userSession?.isGuest ?? true,
                    token: userSession?.token || null,
                    isDetailed: false,
                };
                await saveReportOffline(offlinePayload);
                Alert.alert(
                    'Report Submitted Successfully! ✅',
                    'Report saved to offline queue due to network delay. Check History for status updates. Thank you for reporting.',
                    [{ text: 'OK', onPress: onOpenMyReports }]
                );
            }
        } catch (error) {
            const offlinePayload = {
                hazardType: selectedHazard,
                description: description || `Express report for ${selectedHazard}`,
                latitude: location.latitude,
                longitude: location.longitude,
                photoUrl: imageUri || null,
                isGuestReport: userSession?.isGuest ?? true,
                token: userSession?.token || null,
                isDetailed: false,
            };
            await saveReportOffline(offlinePayload);
            Alert.alert(
                'Report Submitted Successfully! ✅',
                'Report saved to offline queue. Check History for status updates. Thank you for reporting.',
                [{ text: 'OK', onPress: onOpenMyReports }]
            );
        } finally {
            setSubmitting(false);
            getOfflineQueue().then((q) => setQueuedCount(q.length));
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header Row 1: Title & Exit */}
                <View style={styles.topHeaderRow}>
                    <TouchableOpacity onPress={onBackToAuth} style={styles.exitButton}>
                        <Text style={styles.exitButtonText}>← Exit</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Express Report</Text>
                    <View style={styles.roleBadgeContainer}>
                        <Text style={styles.roleBadgeText}>{userSession?.isGuest ? 'Guest' : 'Citizen'}</Text>
                    </View>
                </View>

                {/* Header Row 2: History & Live Map Quick Action Bar */}
                <View style={styles.quickActionsRow}>
                    <TouchableOpacity onPress={onOpenMyReports} style={styles.historyBtn}>
                        <Text style={styles.historyBtnText}>📋 My Report History</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onOpenLiveMap} style={styles.mapBtn}>
                        <Text style={styles.mapBtnText}>🗺️ Live Hazard Map</Text>
                    </TouchableOpacity>
                </View>

                {/* Header Row 3: Switch Mode Card */}
                <TouchableOpacity onPress={onSwitchToDetailed} style={styles.switchModeCard}>
                    <Text style={styles.switchModeCardText}>📝 Switch to Detailed Hazard Assessment →</Text>
                </TouchableOpacity>

                {/* Offline Sync Banner */}
                {queuedCount > 0 && (
                    <View style={styles.offlineBanner}>
                        <Text style={styles.offlineBannerText}>
                            🔄 {queuedCount} report(s) pending in local offline queue
                        </Text>
                    </View>
                )}

                {/* Hazard Grid */}
                <Text style={styles.sectionTitle}>1. Select Emergency Hazard</Text>
                <View style={styles.hazardGrid}>
                    {HAZARD_TYPES.map((item) => {
                        const isSelected = selectedHazard === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.hazardCard,
                                    { borderColor: item.color },
                                    isSelected && { backgroundColor: item.color },
                                ]}
                                onPress={() => setSelectedHazard(item.id)}
                            >
                                <Text style={styles.hazardIcon}>{item.icon}</Text>
                                <Text style={[styles.hazardText, isSelected && styles.hazardTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Location Coordinates */}
                <Text style={styles.sectionTitle}>2. Location Coordinates</Text>
                <View style={styles.locationCard}>
                    {loadingLocation ? (
                        <View style={styles.locationRow}>
                            <ActivityIndicator color="#059669" />
                            <Text style={styles.locationLoadingText}>Fetching GPS Coordinates...</Text>
                        </View>
                    ) : location ? (
                        <View>
                            <Text style={styles.locationCoordinates}>
                                📍 Lat: {location.latitude.toFixed(5)}, Lon: {location.longitude.toFixed(5)}
                            </Text>
                            <Text style={styles.locationAccuracy}>
                                Accuracy: High (±{location.accuracy ? Math.round(location.accuracy) : 10}m)
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.locationError}>⚠️ GPS Location unavailable</Text>
                    )}
                </View>

                {/* Photo Attachment */}
                <Text style={styles.sectionTitle}>3. Attachment (Optional)</Text>
                <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
                    <Text style={styles.photoButtonText}>📷 TAKE HAZARD PHOTO</Text>
                </TouchableOpacity>
                {imageUri && (
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                )}

                {/* Description */}
                <Text style={styles.sectionTitle}>4. Brief Description (Optional)</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="e.g. Water level rising fast near main road bridge..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    value={description}
                    onChangeText={setDescription}
                />

                {/* Dispatch Button */}
                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmitReport}
                    disabled={submitting || loadingLocation}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>⚡ DISPATCH EMERGENCY REPORT</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },

    topHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        marginBottom: 10,
    },
    exitButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
    },
    exitButtonText: { color: '#0284C7', fontSize: 14, fontWeight: '700' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    roleBadgeContainer: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#166534' },

    quickActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    historyBtn: {
        flex: 1,
        backgroundColor: '#FEF3C7',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    historyBtnText: { fontSize: 13, fontWeight: '800', color: '#92400E' },
    mapBtn: {
        flex: 1,
        backgroundColor: '#E0F2FE',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    mapBtnText: { fontSize: 13, fontWeight: '800', color: '#075985' },

    switchModeCard: {
        backgroundColor: '#ECFDF5',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        marginBottom: 12,
    },
    switchModeCardText: { fontSize: 13, fontWeight: '800', color: '#047857' },

    offlineBanner: { backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F59E0B', marginBottom: 12 },
    offlineBannerText: { color: '#B45309', fontWeight: '800', fontSize: 12, textAlign: 'center' },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: '#475569', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    hazardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    hazardCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 20,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    hazardIcon: { fontSize: 32, marginBottom: 6 },
    hazardText: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
    hazardTextActive: { color: '#FFFFFF' },
    locationCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locationLoadingText: { marginLeft: 10, fontSize: 13, color: '#64748B', fontWeight: '600' },
    locationCoordinates: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
    locationAccuracy: { fontSize: 11, color: '#059669', fontWeight: '700', marginTop: 4 },
    locationError: { color: '#DC2626', fontWeight: '700' },
    photoButton: { backgroundColor: '#E2E8F0', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    photoButtonText: { color: '#334155', fontWeight: '800', fontSize: 13 },
    previewImage: { width: '100%', height: 180, borderRadius: 12, marginTop: 10 },
    textArea: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, fontSize: 14, color: '#0F172A', height: 80, textAlignVertical: 'top' },
    submitButton: { backgroundColor: '#DC2626', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
    submitButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
});