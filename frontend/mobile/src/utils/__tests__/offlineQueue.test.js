/**
 * Mobile Utility Unit Tests: offlineQueue.js
 * Module: UC-01 – Offline Incident Queue & Auto-Syncing Mechanism
 * Target Coverage: > 80%
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { saveReportOffline, getOfflineQueue, syncOfflineReports } from '../offlineQueue';

describe('Offline Queue Utility (offlineQueue.js)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        AsyncStorage.clear();
        global.fetch = jest.fn();
    });

    it('TC-MOB-OFF-01: saveReportOffline appends new item with id and createdAt to empty queue', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce(null);

        const reportData = { hazardType: 'FLOOD', description: 'Water level rising' };
        const success = await saveReportOffline(reportData);

        expect(success).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            '@emergency_reports_queue',
            expect.stringContaining('"hazardType":"FLOOD"')
        );
    });

    it('TC-MOB-OFF-02: saveReportOffline appends to existing queue items', async () => {
        const existing = [{ id: 'offline_1', hazardType: 'LANDSLIDE' }];
        AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existing));

        const success = await saveReportOffline({ hazardType: 'HEAVY_RAIN' });
        expect(success).toBe(true);

        const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
        expect(savedData.length).toBe(2);
        expect(savedData[0].hazardType).toBe('LANDSLIDE');
        expect(savedData[1].hazardType).toBe('HEAVY_RAIN');
    });

    it('TC-MOB-OFF-03: saveReportOffline returns false on storage error', async () => {
        AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage failure'));

        const success = await saveReportOffline({ hazardType: 'FLOOD' });
        expect(success).toBe(false);
    });

    it('TC-MOB-OFF-04: getOfflineQueue parses and returns queue from AsyncStorage', async () => {
        const queueItems = [{ id: 'off_1', hazardType: 'FLOOD' }];
        AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queueItems));

        const result = await getOfflineQueue();
        expect(result).toEqual(queueItems);
    });

    it('TC-MOB-OFF-05: getOfflineQueue returns empty array on storage error or missing item', async () => {
        AsyncStorage.getItem.mockResolvedValueOnce(null);
        let result = await getOfflineQueue();
        expect(result).toEqual([]);

        AsyncStorage.getItem.mockRejectedValueOnce(new Error('Corrupt storage'));
        result = await getOfflineQueue();
        expect(result).toEqual([]);
    });

    it('TC-MOB-OFF-06: syncOfflineReports returns zeros if device is offline', async () => {
        NetInfo.fetch.mockResolvedValueOnce({ isConnected: false });

        const res = await syncOfflineReports();
        expect(res).toEqual({ synced: 0, failed: 0 });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('TC-MOB-OFF-07: syncOfflineReports returns zeros if queue is empty', async () => {
        NetInfo.fetch.mockResolvedValueOnce({ isConnected: true });
        AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));

        const res = await syncOfflineReports();
        expect(res).toEqual({ synced: 0, failed: 0 });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('TC-MOB-OFF-08: syncOfflineReports posts items and removes successfully synced reports from queue', async () => {
        NetInfo.fetch.mockResolvedValueOnce({ isConnected: true });

        const queue = [
            { id: 'off_1', hazardType: 'FLOOD', isDetailed: false, token: 'user-tok-1' },
            { id: 'off_2', hazardType: 'TSUNAMI', isDetailed: true, token: null },
        ];
        AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queue));

        // First request succeeds, second fails
        global.fetch
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: false, status: 500 });

        const res = await syncOfflineReports();

        expect(res.synced).toBe(1);
        expect(res.remaining).toBe(1);

        // Remaining queue should only contain second report
        const remainingSaved = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
        expect(remainingSaved.length).toBe(1);
        expect(remainingSaved[0].id).toBe('off_2');
    });

    it('TC-MOB-OFF-09: syncOfflineReports handles network fetch exceptions during sync loop', async () => {
        NetInfo.fetch.mockResolvedValueOnce({ isConnected: true });

        const queue = [{ id: 'off_1', hazardType: 'FLOOD', isDetailed: false }];
        AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queue));

        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        const res = await syncOfflineReports();
        expect(res.synced).toBe(0);
        expect(res.remaining).toBe(1);
    });
});
