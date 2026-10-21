import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ onContinue }) {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Badge */}
                <View style={styles.topHeader}>
                    <View style={styles.badgeContainer}>
                        <Text style={styles.badgeIcon}>🛡️</Text>
                        <Text style={styles.badgeText}>OFFICIAL DISASTER MANAGEMENT PORTAL</Text>
                    </View>
                </View>

                {/* Professional Simple Illustration */}
                <View style={styles.imageWrapper}>
                    <Image
                        source={require('../../assets/images/welcome_green.jpg')}
                        style={styles.heroImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Title & Description */}
                <View style={styles.contentContainer}>
                    <Text style={styles.appTitle}>RescuAlert SL</Text>
                    <Text style={styles.appSubtitle}>
                        Early Warning & Disaster Response Platform
                    </Text>
                    <Text style={styles.appDescription}>
                        Stay safe and informed. Report hazard incidents instantly and access real-time emergency telemetry across Sri Lanka.
                    </Text>

                    {/* Features List */}
                    <View style={styles.featuresWrapper}>
                        <View style={styles.featureCard}>
                            <View style={styles.iconCircle}>
                                <Text style={styles.featureIcon}>🚨</Text>
                            </View>
                            <View style={styles.featureTextWrapper}>
                                <Text style={styles.featureTitle}>Express Hazard Reports</Text>
                                <Text style={styles.featureDescription}>
                                    Submit flood, landslide, or storm alerts with automatic GPS tagging.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureCard}>
                            <View style={styles.iconCircle}>
                                <Text style={styles.featureIcon}>📡</Text>
                            </View>
                            <View style={styles.featureTextWrapper}>
                                <Text style={styles.featureTitle}>IoT Telemetry Integration</Text>
                                <Text style={styles.featureDescription}>
                                    Live water level and rainfall sensor verification for fast validation.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureCard}>
                            <View style={styles.iconCircle}>
                                <Text style={styles.featureIcon}>🗺️</Text>
                            </View>
                            <View style={styles.featureTextWrapper}>
                                <Text style={styles.featureTitle}>District Incident Map</Text>
                                <Text style={styles.featureDescription}>
                                    View verified active hazard clusters and official safety warnings.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Action Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.continueButton}
                    activeOpacity={0.85}
                    onPress={onContinue}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <Text style={styles.buttonArrow}>→</Text>
                </TouchableOpacity>
                <Text style={styles.footerNote}>
                    DMC Sri Lanka • Disaster Early Warning System
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC', // Matching AuthScreen background
    },
    scrollContent: {
        paddingBottom: 20,
    },
    topHeader: {
        paddingHorizontal: 20,
        paddingTop: 16,
        alignItems: 'center',
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    badgeIcon: {
        fontSize: 13,
        marginRight: 6,
    },
    badgeText: {
        color: '#047857',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    imageWrapper: {
        width: width,
        height: width * 0.58,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingHorizontal: 20,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    contentContainer: {
        paddingHorizontal: 22,
        paddingTop: 12,
    },
    appTitle: {
        fontSize: 30,
        fontWeight: '900',
        color: '#0F172A', // Matching AuthScreen text title
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    appSubtitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#059669', // Primary green #059669
        textAlign: 'center',
        marginTop: 4,
    },
    appDescription: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
        paddingHorizontal: 10,
    },
    featuresWrapper: {
        marginTop: 20,
        gap: 12,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    featureIcon: {
        fontSize: 20,
    },
    featureTextWrapper: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    featureDescription: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
        lineHeight: 16,
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    continueButton: {
        backgroundColor: '#059669', // Matching AuthScreen primary green button (#059669)
        paddingVertical: 16,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        marginRight: 8,
        letterSpacing: 0.5,
    },
    buttonArrow: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    footerNote: {
        textAlign: 'center',
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 8,
        fontWeight: '600',
    },
});
