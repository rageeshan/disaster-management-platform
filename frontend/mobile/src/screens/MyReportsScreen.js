import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
} from 'react-native';
import { BASE_URL } from '../services/api';

const STATUS_CONFIG = {
    PENDING: { label: '⏳ Pending Review', bg: '#FEF3C7', color: '#B45309', border: '#F59E0B' },
    VERIFIED: { label: '✅ DMC Verified', bg: '#D1FAE5', color: '#047857', border: '#10B981' },
    REJECTED: { label: '❌ Unverified', bg: '#FEE2E2', color: '#B91C1C', border: '#EF4444' },
    RESOLVED: { label: '🛡️ Resolved', bg: '#E0E7FF', color: '#4338CA', border: '#6366F1' },
};

const HAZARD_COLORS = {
    FLOOD: '#0284C7',
    LANDSLIDE: '#D97706',
    HEAVY_RAIN: '#4F46E5',
    TSUNAMI: '#DC2626',
};

export default function MyReportsScreen({ userSession, onBackToReport }) {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMyReports = async () => {
        try {
            if (!userSession?.token) {
                setLoading(false);
                return;
            }

            const response = await fetch(`${BASE_URL}/reports/my-reports`, {
                headers: {
                    Authorization: `Bearer ${userSession.token}`,
                },
            });

            const result = await response.json();
            if (result.success) {
                setReports(result.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch user reports:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMyReports();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMyReports();
    };

    if (userSession?.isGuest) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={onBackToReport} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Report History</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.guestContainer}>
                    <Text style={styles.guestIcon}>🔒</Text>
                    <Text style={styles.guestTitle}>Account Required</Text>
                    <Text style={styles.guestSubtext}>
                        You submitted reports as a guest. Log in or create an account to track real-time DMC verification updates and history.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Top Navigation Header */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBackToReport} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Submitted Reports</Text>
                <TouchableOpacity onPress={fetchMyReports} style={styles.refreshBtn}>
                    <Text style={styles.refreshBtnText}>🔄</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#0284C7" />
                    <Text style={styles.loadingText}>Fetching your reports...</Text>
                </View>
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284C7']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📋</Text>
                            <Text style={styles.emptyTitle}>No Submissions Found</Text>
                            <Text style={styles.emptyText}>You haven't dispatched any disaster reports yet.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const statusStyle = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                        const hazardColor = HAZARD_COLORS[item.hazardType] || '#DC2626';

                        return (
                            <View style={styles.reportCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.hazardBadge, { backgroundColor: hazardColor }]}>
                                        {item.hazardType}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                                        <Text style={[styles.statusText, { color: statusStyle.color }]}>
                                            {statusStyle.label}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.descriptionText}>
                                    {item.description || 'No detailed text description provided.'}
                                </Text>

                                {item.photoUrls && item.photoUrls.length > 0 && (
                                    <Image source={{ uri: item.photoUrls[0] }} style={styles.thumbnail} />
                                )}

                                <View style={styles.cardFooter}>
                                    <Text style={styles.locationText}>
                                        📍 Lat: {item.latitude?.toFixed(4)}, Lon: {item.longitude?.toFixed(4)}
                                    </Text>
                                    <Text style={styles.timestampText}>
                                        {new Date(item.createdAt).toLocaleDateString()} at{' '}
                                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
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
    refreshBtn: { padding: 4 },
    refreshBtnText: { fontSize: 16 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#64748B', fontWeight: '600', fontSize: 13 },
    listContent: { padding: 16 },
    reportCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    hazardBadge: { color: '#FFFFFF', fontWeight: '800', fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '800' },
    descriptionText: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 10, lineHeight: 18 },
    thumbnail: { width: '100%', height: 140, borderRadius: 10, marginBottom: 10 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    locationText: { fontSize: 11, color: '#0284C7', fontWeight: '700' },
    timestampText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
    guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
    guestIcon: { fontSize: 48, marginBottom: 12 },
    guestTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
    guestSubtext: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
    emptyText: { fontSize: 12, color: '#64748B' },
});