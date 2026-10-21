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
    SafeAreaView,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '../services/api';

const HAZARD_TYPES = [
    { id: 'FLOOD', label: 'FLOOD', icon: '🌊' },
    { id: 'LANDSLIDE', label: 'LANDSLIDE', icon: '⛰️' },
    { id: 'HEAVY_RAIN', label: 'HEAVY RAIN', icon: '🌧️' },
    { id: 'TSUNAMI', label: 'TSUNAMI', icon: '🌊' },
];

const SEVERITY_LEVELS = [
    { id: 'LOW', label: 'Low', desc: 'Minor inconvenience, passable', color: '#10B981' },
    { id: 'MEDIUM', label: 'Moderate', desc: 'Property risk or partial obstruction', color: '#F59E0B' },
    { id: 'HIGH', label: 'Severe', desc: 'Immediate danger or structural destruction', color: '#EF4444' },
];

const RELIEF_NEEDS = [
    { id: 'EVACUATION', label: 'Evacuation Needed' },
    { id: 'MEDICAL', label: 'Medical Emergency' },
    { id: 'FOOD_WATER', label: 'Food & Clean Water' },
    { id: 'SHELTER', label: 'Temporary Shelter' },
];

export default function DetailedReportScreen({
    userSession,
    onBackToAuth,
    onSwitchToExpress,
    onOpenLiveMap,
    onOpenMyReports,
}) {
    const [step, setStep] = useState(1);

    // Step 1: Hazard & Location
    const [selectedHazard, setSelectedHazard] = useState('FLOOD');
    const [landmark, setLandmark] = useState('');
    const [location, setLocation] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(true);

    // Step 2: Assessment
    const [severity, setSeverity] = useState('MEDIUM');
    const [affectedCount, setAffectedCount] = useState('1');
    const [description, setDescription] = useState('');

    // Step 3: Photos (up to 3)
    const [photos, setPhotos] = useState([]);

    // Step 4: Relief Needs
    const [selectedRelief, setSelectedRelief] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Default fallback location (Colombo, Sri Lanka)
    const DEFAULT_LOCATION = { latitude: 6.914694, longitude: 79.973117 };

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
                    'Could not lock GPS position. Using default location (Colombo, Sri Lanka).'
                );
                setLocation(DEFAULT_LOCATION);
            } finally {
                setLoadingLocation(false);
            }
        })();
    }, []);

    const handlePickImage = async () => {
        if (photos.length >= 3) {
            Alert.alert('Limit Reached', 'You can upload a maximum of 3 photos.');
            return;
        }

        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Denied', 'Camera access required.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setPhotos([...photos, result.assets[0].uri]);
        }
    };

    const toggleReliefNeed = (id) => {
        if (selectedRelief.includes(id)) {
            setSelectedRelief(selectedRelief.filter((item) => item !== id));
        } else {
            setSelectedRelief([...selectedRelief, id]);
        }
    };

    const handleSubmitDetailedReport = async () => {
        if (!location) {
            Alert.alert('GPS Required', 'Please wait for GPS lock before submitting.');
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                hazardType: selectedHazard,
                landmark: landmark || null,
                latitude: location.latitude,
                longitude: location.longitude,
                severity,
                peopleAffected: parseInt(affectedCount, 10) || 1,
                description,
                photos,
                reliefRequired: selectedRelief,
                isGuestReport: userSession?.isGuest ?? true,
            };

            const headers = { 'Content-Type': 'application/json' };
            if (userSession?.token) {
                headers['Authorization'] = `Bearer ${userSession.token}`;
            }

            const response = await fetch(`${BASE_URL}/reports/submit-detailed`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok || result.success) {
                Alert.alert(
                    'Report Submitted Successfully! ✅',
                    'Your detailed hazard assessment has been submitted successfully! Check History for status updates. Thank you for reporting.',
                    [{ text: 'OK', onPress: onOpenMyReports }]
                );
            } else {
                Alert.alert('Submission Error', result.message || 'Could not post detailed report.');
            }
        } catch (error) {
            Alert.alert('Network Error', 'Unable to reach backend server.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header Row 1: Title & Exit */}
                <View style={styles.topHeaderRow}>
                    <TouchableOpacity onPress={onBackToAuth} style={styles.exitButton}>
                        <Text style={styles.exitButtonText}>← Exit</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Detailed Assessment</Text>
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
                <TouchableOpacity onPress={onSwitchToExpress} style={styles.switchModeCard}>
                    <Text style={styles.switchModeCardText}>⚡ Switch to Express Emergency Mode →</Text>
                </TouchableOpacity>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    {[1, 2, 3, 4].map((i) => (
                        <View
                            key={i}
                            style={[
                                styles.progressBarSegment,
                                step >= i ? styles.progressActive : styles.progressInactive,
                            ]}
                        />
                    ))}
                </View>
                <Text style={styles.stepIndicatorText}>Step {step} of 4</Text>

                {/* STEP 1: Hazard & Location */}
                {step === 1 && (
                    <View>
                        <Text style={styles.sectionTitle}>1. Hazard & Location</Text>
                        <View style={styles.hazardGrid}>
                            {HAZARD_TYPES.map((item) => {
                                const isSelected = selectedHazard === item.id;
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.hazardCard, isSelected && styles.hazardCardActive]}
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

                        <Text style={styles.fieldLabel}>Nearest Landmark / Bridge / Road</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Near Bridge 4, Kaduwela Junction"
                            placeholderTextColor="#94A3B8"
                            value={landmark}
                            onChangeText={setLandmark}
                        />

                        <View style={styles.locationCard}>
                            {loadingLocation ? (
                                <ActivityIndicator color="#0284C7" />
                            ) : location ? (
                                <Text style={styles.locationCoordinates}>
                                    📍 GPS Locked: Lat {location.latitude.toFixed(4)}, Lon {location.longitude.toFixed(4)}
                                </Text>
                            ) : (
                                <Text style={styles.locationError}>⚠️ GPS unavailable</Text>
                            )}
                        </View>

                        <TouchableOpacity style={styles.nextButton} onPress={() => setStep(2)}>
                            <Text style={styles.nextButtonText}>Next: Impact Assessment →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* STEP 2: Assessment */}
                {step === 2 && (
                    <View>
                        <Text style={styles.sectionTitle}>2. Impact Assessment</Text>
                        <Text style={styles.fieldLabel}>Severity Level</Text>
                        {SEVERITY_LEVELS.map((item) => {
                            const isSelected = severity === item.id;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.severityCard,
                                        { borderColor: item.color },
                                        isSelected && { backgroundColor: item.color + '15' },
                                    ]}
                                    onPress={() => setSeverity(item.id)}
                                >
                                    <Text style={[styles.severityLabel, { color: item.color }]}>{item.label}</Text>
                                    <Text style={styles.severityDesc}>{item.desc}</Text>
                                </TouchableOpacity>
                            );
                        })}

                        <Text style={styles.fieldLabel}>Estimated People Affected</Text>
                        <TextInput
                            style={styles.textInput}
                            keyboardType="number-pad"
                            value={affectedCount}
                            onChangeText={setAffectedCount}
                        />

                        <Text style={styles.fieldLabel}>Detailed Situation Summary</Text>
                        <TextInput
                            style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
                            multiline
                            placeholder="Describe road access, water levels, or trapped individuals..."
                            placeholderTextColor="#94A3B8"
                            value={description}
                            onChangeText={setDescription}
                        />

                        <View style={styles.stepButtonRow}>
                            <TouchableOpacity style={styles.prevButton} onPress={() => setStep(1)}>
                                <Text style={styles.prevButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.nextButton, { flex: 1, marginLeft: 10 }]} onPress={() => setStep(3)}>
                                <Text style={styles.nextButtonText}>Next: Photo Evidence →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* STEP 3: Multi-Photo Evidence */}
                {step === 3 && (
                    <View>
                        <Text style={styles.sectionTitle}>3. Photo Evidence ({photos.length}/3)</Text>
                        <TouchableOpacity style={styles.photoUploadBtn} onPress={handlePickImage}>
                            <Text style={styles.photoUploadText}>📷 TAKE PHOTO</Text>
                        </TouchableOpacity>

                        <View style={styles.photoList}>
                            {photos.map((uri, idx) => (
                                <View key={idx} style={styles.photoWrapper}>
                                    <Image source={{ uri }} style={styles.photoThumbnail} />
                                    <TouchableOpacity
                                        style={styles.removePhotoBadge}
                                        onPress={() => setPhotos(photos.filter((_, i) => i !== idx))}
                                    >
                                        <Text style={styles.removePhotoText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        <View style={styles.stepButtonRow}>
                            <TouchableOpacity style={styles.prevButton} onPress={() => setStep(2)}>
                                <Text style={styles.prevButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.nextButton, { flex: 1, marginLeft: 10 }]} onPress={() => setStep(4)}>
                                <Text style={styles.nextButtonText}>Next: Relief Request →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* STEP 4: Relief Requests & Dispatch */}
                {step === 4 && (
                    <View>
                        <Text style={styles.sectionTitle}>4. Required Emergency Relief</Text>
                        {RELIEF_NEEDS.map((item) => {
                            const isChecked = selectedRelief.includes(item.id);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.reliefCheckbox, isChecked && styles.reliefCheckboxActive]}
                                    onPress={() => toggleReliefNeed(item.id)}
                                >
                                    <Text style={styles.reliefCheckboxText}>{isChecked ? '☑' : '☐'}  {item.label}</Text>
                                </TouchableOpacity>
                            );
                        })}

                        <View style={styles.stepButtonRow}>
                            <TouchableOpacity style={styles.prevButton} onPress={() => setStep(3)}>
                                <Text style={styles.prevButtonText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dispatchButton, { flex: 1, marginLeft: 10 }]}
                                onPress={handleSubmitDetailedReport}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.dispatchButtonText}>SUBMIT ASSESSMENT</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
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
        backgroundColor: '#EFF6FF',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        marginBottom: 12,
    },
    switchModeCardText: { fontSize: 13, fontWeight: '800', color: '#1D4ED8' },

    progressContainer: { flexDirection: 'row', height: 6, gap: 6, marginVertical: 10 },
    progressBarSegment: { flex: 1, borderRadius: 3 },
    progressActive: { backgroundColor: '#0284C7' },
    progressInactive: { backgroundColor: '#E2E8F0' },
    stepIndicatorText: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 12, marginBottom: 6 },
    hazardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    hazardCard: { width: '48%', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
    hazardCardActive: { borderColor: '#0284C7', backgroundColor: '#E0F2FE' },
    hazardIcon: { fontSize: 28, marginBottom: 4 },
    hazardText: { fontSize: 12, fontWeight: '800', color: '#334155' },
    hazardTextActive: { color: '#0284C7' },
    textInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 14, color: '#0F172A' },
    locationCard: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 12, alignItems: 'center' },
    locationCoordinates: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
    locationError: { color: '#DC2626', fontWeight: '700' },
    severityCard: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 8 },
    severityLabel: { fontSize: 14, fontWeight: '800' },
    severityDesc: { fontSize: 11, color: '#64748B', marginTop: 2 },
    photoUploadBtn: { backgroundColor: '#0284C7', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
    photoUploadText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    photoList: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    photoWrapper: { position: 'relative' },
    photoThumbnail: { width: 90, height: 90, borderRadius: 8 },
    removePhotoBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 12, width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
    removePhotoText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },
    reliefCheckbox: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 14, marginBottom: 8 },
    reliefCheckboxActive: { borderColor: '#0284C7', backgroundColor: '#F0F9FF' },
    reliefCheckboxText: { fontSize: 14, fontWeight: '700', color: '#334155' },
    stepButtonRow: { flexDirection: 'row', marginTop: 20 },
    prevButton: { backgroundColor: '#E2E8F0', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10 },
    prevButtonText: { color: '#334155', fontWeight: '700' },
    nextButton: { backgroundColor: '#0284C7', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
    nextButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    dispatchButton: { backgroundColor: '#DC2626', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    dispatchButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
});