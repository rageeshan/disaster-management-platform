import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { loginUser, registerUser } from '../services/api';

const { width } = Dimensions.get('window');

const SRI_LANKA_DISTRICTS = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Moneragala', 'Ratnapura', 'Kegalle'
];

export default function AuthScreen({ onLoginSuccess, onContinueAsGuest }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [nic, setNic] = useState('');
    const [district, setDistrict] = useState('Colombo');
    const [homeAddress, setHomeAddress] = useState('');

    const handleSubmit = async () => {
        if (!phoneNumber || !password) {
            Alert.alert('Validation Error', 'Phone number and password are required.');
            return;
        }

        if (isRegistering) {
            if (!fullName || !email || !nic || !district || !homeAddress) {
                Alert.alert('Validation Error', 'Please fill in all registration fields.');
                return;
            }
        }

        setLoading(true);

        try {
            let result;
            if (isRegistering) {
                result = await registerUser({
                    fullName,
                    email,
                    nic,
                    phoneNumber,
                    password,
                    district,
                    homeAddress,
                });
            } else {
                result = await loginUser(phoneNumber, password);
            }

            if (result.success || result.token) {
                Alert.alert('Success', isRegistering ? 'Account registered successfully!' : 'Signed in successfully!');
                onLoginSuccess(result.token, result.user || result.citizen);
            } else {
                Alert.alert('Authentication Failed', result.message || 'Invalid details provided.');
            }
        } catch (error) {
            Alert.alert('Network Error', 'Could not reach backend server. Ensure API is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Brand Header */}
                    <View style={styles.headerContainer}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>OFFICIAL PORTAL</Text>
                        </View>
                        <Text style={styles.brandTitle}>RescuAlert SL</Text>
                        <Text style={styles.brandSubtitle}>Disaster Early Warning & Response</Text>
                    </View>

                    {/* Sri Lanka Map Illustration */}
                    <View style={styles.imageWrapper}>
                        <Image
                            source={require('../../assets/images/signin_hero.jpg')}
                            style={styles.signinImage}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Form Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            {isRegistering ? 'Citizen Registration' : 'Citizen Sign In'}
                        </Text>

                        {isRegistering && (
                            <>
                                <Text style={styles.label}>Full Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. A.B. Perera"
                                    placeholderTextColor="#94A3B8"
                                    value={fullName}
                                    onChangeText={setFullName}
                                />

                                <Text style={styles.label}>Email Address *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. perera@example.com"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />

                                <Text style={styles.label}>NIC Number *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 199512345678 or 951234567V"
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="characters"
                                    value={nic}
                                    onChangeText={setNic}
                                />

                                <Text style={styles.label}>District *</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
                                    {SRI_LANKA_DISTRICTS.map((dist) => (
                                        <TouchableOpacity
                                            key={dist}
                                            style={[styles.districtChip, district === dist && styles.districtChipActive]}
                                            onPress={() => setDistrict(dist)}
                                        >
                                            <Text style={[styles.districtChipText, district === dist && styles.districtChipTextActive]}>
                                                {dist}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={styles.label}>Home Address *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. No. 12, Main Street, Kaduwela"
                                    placeholderTextColor="#94A3B8"
                                    value={homeAddress}
                                    onChangeText={setHomeAddress}
                                />
                            </>
                        )}

                        <Text style={styles.label}>Mobile Phone Number *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 0771234567 or +94771234567"
                            placeholderTextColor="#94A3B8"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                        />

                        <Text style={styles.label}>Password *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Min 6 characters"
                            placeholderTextColor="#94A3B8"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.primaryButtonText}>
                                    {isRegistering ? 'CREATE CITIZEN ACCOUNT' : 'SIGN IN'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.switchModeButton}
                            onPress={() => setIsRegistering(!isRegistering)}
                        >
                            <Text style={styles.switchModeText}>
                                {isRegistering
                                    ? 'Already have an account? Sign In'
                                    : "Don't have an account? Register as Citizen"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Emergency Guest Card */}
                    <View style={styles.emergencyCard}>
                        <Text style={styles.emergencyHint}>In an immediate hazard or emergency?</Text>
                        <TouchableOpacity style={styles.emergencyButton} onPress={onContinueAsGuest}>
                            <Text style={styles.emergencyButtonText}>⚡ CONTINUE AS GUEST REPORT</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    inner: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 20, paddingTop: 10, paddingBottom: 20 },
    headerContainer: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
    imageWrapper: {
        width: '100%',
        height: 130,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        overflow: 'hidden',
    },
    signinImage: {
        width: width - 40,
        height: 130,
    },
    badge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#A7F3D0',
        marginBottom: 6,
    },
    badgeText: { color: '#059669', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    brandTitle: { fontSize: 34, fontWeight: '900', color: '#064E3B', letterSpacing: 1 },
    brandSubtitle: { fontSize: 11, color: '#047857', fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    cardTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
    label: { color: '#475569', fontSize: 12, fontWeight: '700', marginBottom: 6 },
    input: {
        backgroundColor: '#F1F5F9',
        color: '#0F172A',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        marginBottom: 12,
    },
    districtScroll: { flexDirection: 'row', marginBottom: 14, maxHeight: 40 },
    districtChip: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    districtChipActive: { backgroundColor: '#059669', borderColor: '#059669' },
    districtChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
    districtChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
    primaryButton: {
        backgroundColor: '#059669',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 2,
    },
    primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
    switchModeButton: { marginTop: 14, alignItems: 'center' },
    switchModeText: { color: '#0284C7', fontSize: 13, fontWeight: '600' },
    emergencyCard: {
        marginTop: 20,
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        alignItems: 'center',
    },
    emergencyHint: { color: '#991B1B', fontSize: 12, fontWeight: '700', marginBottom: 10 },
    emergencyButton: {
        backgroundColor: '#DC2626',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 2,
    },
    emergencyButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
});