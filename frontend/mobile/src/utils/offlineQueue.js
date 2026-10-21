import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { BASE_URL } from '../services/api';

const QUEUE_KEY = '@emergency_reports_queue';

/**
 * Save an offline report to the queue
 */
export const saveReportOffline = async (reportData) => {
    try {
        const existingQueueJson = await AsyncStorage.getItem(QUEUE_KEY);
        const existingQueue = existingQueueJson ? JSON.parse(existingQueueJson) : [];

        const newQueueItem = {
            ...reportData,
            id: `offline_${Date.now()}`,
            createdAt: new Date().toISOString(),
        };

        existingQueue.push(newQueueItem);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existingQueue));
        return true;
    } catch (error) {
        console.error('Failed to save report offline:', error);
        return false;
    }
};

/**
 * Get all queued offline reports
 */
export const getOfflineQueue = async () => {
    try {
        const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
        return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
        console.error('Failed to read offline queue:', error);
        return [];
    }
};

/**
 * Dispatch all queued reports once internet is restored
 */
export const syncOfflineReports = async () => {
    const netStatus = await NetInfo.fetch();
    if (!netStatus.isConnected) return { synced: 0, failed: 0 };

    const queue = await getOfflineQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let syncedCount = 0;
    const remainingQueue = [];

    for (const report of queue) {
        try {
            const endpoint = report.isDetailed
                ? `${BASE_URL}/reports/submit-detailed`
                : `${BASE_URL}/reports/submit`;

            const headers = { 'Content-Type': 'application/json' };
            if (report.token) {
                headers['Authorization'] = `Bearer ${report.token}`;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(report),
            });

            if (response.ok) {
                syncedCount++;
            } else {
                remainingQueue.push(report);
            }
        } catch (err) {
            remainingQueue.push(report);
        }
    }

    // Update storage with remaining unsynced reports
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    return { synced: syncedCount, remaining: remainingQueue.length };
};