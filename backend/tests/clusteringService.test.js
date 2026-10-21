/**
 * Unit Tests: clusteringService.js
 * Module: UC-01 – Manage Hazard Reports & Verification
 * Coverage: Spatial clustering logic, confidence score calculation, IoT integration
 */

import { jest } from '@jest/globals';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockClusterSave = jest.fn().mockResolvedValue(true);
const mockReportSave = jest.fn().mockResolvedValue(true);
const mockReportClusterFindOne = jest.fn();
const mockReportClusterCreate = jest.fn();
const mockHazardReportFind = jest.fn();
const mockEvaluateNearbySensors = jest.fn();

jest.unstable_mockModule('../models/ReportCluster.js', () => ({
    default: { findOne: mockReportClusterFindOne, create: mockReportClusterCreate },
}));
jest.unstable_mockModule('../models/HazardReport.js', () => ({
    default: { find: mockHazardReportFind },
}));
jest.unstable_mockModule('../services/iotService.js', () => ({
    evaluateNearbySensors: mockEvaluateNearbySensors,
}));

const { processReportClustering } = await import('../services/clusteringService.js');

// ── Helpers ────────────────────────────────────────────────────────────────
const makeReport = (overrides = {}) => ({
    _id: 'report-001', hazardType: 'FLOOD', district: 'Colombo',
    isGuestReport: false, location: { type: 'Point', coordinates: [79.983, 6.932] },
    status: 'PENDING', save: mockReportSave, ...overrides,
});
const makeCluster = (overrides = {}) => ({
    _id: 'cluster-001', reports: ['report-000'],
    centroid: { coordinates: [79.983, 6.932] },
    confidenceScore: 2, iotVerified: false, matchedSensors: [],
    save: mockClusterSave, ...overrides,
});
const noIoT = { iotVerified: false, matchedSensors: [], totalBoost: 0 };
const withCriticalIoT = { iotVerified: true, matchedSensors: [{ sensorCode: 'S1', status: 'CRITICAL' }], totalBoost: 5 };
const withWarningIoT  = { iotVerified: true, matchedSensors: [{ sensorCode: 'S2', status: 'WARNING' }], totalBoost: 3 };

// ══════════════════════════════════════════════════════════════════════════
// POSITIVE CASES
// ══════════════════════════════════════════════════════════════════════════
describe('clusteringService – Positive Cases', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-CS-01: New cluster created for citizen report without nearby cluster', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(noIoT);
        mockReportClusterFindOne.mockResolvedValue(null);
        mockReportClusterCreate.mockResolvedValue(makeCluster({ _id: 'new-cluster' }));

        const report = makeReport();
        const result = await processReportClustering(report);

        expect(mockReportClusterCreate).toHaveBeenCalledTimes(1);
        const arg = mockReportClusterCreate.mock.calls[0][0];
        expect(arg.hazardType).toBe('FLOOD');
        expect(arg.district).toBe('Colombo');
        expect(arg.confidenceScore).toBe(2);
        expect(arg.status).toBe('PENDING_VERIFICATION');
        expect(report.status).toBe('CLUSTERED');
        expect(mockReportSave).toHaveBeenCalled();
        expect(result._id).toBe('new-cluster');
    });

    test('TC-CS-02: Guest report gets base score of 1', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(noIoT);
        mockReportClusterFindOne.mockResolvedValue(null);
        mockReportClusterCreate.mockResolvedValue(makeCluster());

        await processReportClustering(makeReport({ isGuestReport: true }));
        expect(mockReportClusterCreate.mock.calls[0][0].confidenceScore).toBe(1);
    });

    test('TC-CS-03: Report added to existing cluster and centroid recalculated', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(noIoT);
        const existing = makeCluster({ reports: ['r0'] });
        mockReportClusterFindOne.mockResolvedValue(existing);
        mockHazardReportFind.mockResolvedValue([
            { _id: 'r0', location: { coordinates: [79.980, 6.930] }, isGuestReport: false },
            { _id: 'r1', location: { coordinates: [79.986, 6.934] }, isGuestReport: false },
        ]);

        await processReportClustering(makeReport());
        expect(existing.reports).toContain('report-001');
        expect(existing.centroid.coordinates[0]).toBeCloseTo(79.983, 3);
        expect(existing.centroid.coordinates[1]).toBeCloseTo(6.932, 3);
        expect(mockClusterSave).toHaveBeenCalled();
    });

    test('TC-CS-04: IoT CRITICAL sensor adds +5 boost to new cluster confidence score', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(withCriticalIoT);
        mockReportClusterFindOne.mockResolvedValue(null);
        mockReportClusterCreate.mockResolvedValue(makeCluster());

        await processReportClustering(makeReport());
        const arg = mockReportClusterCreate.mock.calls[0][0];
        expect(arg.confidenceScore).toBe(7); // citizen(2) + CRITICAL(5)
        expect(arg.iotVerified).toBe(true);
        expect(arg.matchedSensors).toHaveLength(1);
    });

    test('TC-CS-05: IoT WARNING sensor adds +3 boost to new cluster confidence score', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(withWarningIoT);
        mockReportClusterFindOne.mockResolvedValue(null);
        mockReportClusterCreate.mockResolvedValue(makeCluster());

        await processReportClustering(makeReport());
        expect(mockReportClusterCreate.mock.calls[0][0].confidenceScore).toBe(5); // citizen(2) + WARNING(3)
    });

    test('TC-CS-06: Mixed citizen/guest confidence = (citizens*2 + guests*1 + iotBoost)', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(noIoT);
        const existing = makeCluster({ reports: ['r0'] });
        mockReportClusterFindOne.mockResolvedValue(existing);
        mockHazardReportFind.mockResolvedValue([
            { _id: 'r0', location: { coordinates: [79.983, 6.932] }, isGuestReport: false },
            { _id: 'r1', location: { coordinates: [79.983, 6.932] }, isGuestReport: true  },
            { _id: 'r2', location: { coordinates: [79.983, 6.932] }, isGuestReport: false },
        ]);

        await processReportClustering(makeReport({ _id: 'r1' }));
        expect(existing.confidenceScore).toBe(5); // 2*2 + 1*1 = 5
    });

    test('TC-CS-07: Report status is set to CLUSTERED after successful processing', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(noIoT);
        mockReportClusterFindOne.mockResolvedValue(null);
        mockReportClusterCreate.mockResolvedValue(makeCluster());

        const report = makeReport({ status: 'PENDING' });
        await processReportClustering(report);
        expect(report.status).toBe('CLUSTERED');
        expect(mockReportSave).toHaveBeenCalledTimes(1);
    });
});

// ══════════════════════════════════════════════════════════════════════════
// NEGATIVE / EDGE / ERROR CASES
// ══════════════════════════════════════════════════════════════════════════
describe('clusteringService – Negative & Edge Cases', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-CS-08: Database error during cluster create propagates exception', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(noIoT);
        mockReportClusterFindOne.mockResolvedValue(null);
        mockReportClusterCreate.mockRejectedValue(new Error('DB write failure'));

        await expect(processReportClustering(makeReport())).rejects.toThrow('DB write failure');
    });

    test('TC-CS-09: Exact coordinates preserved for single-report cluster (no averaging error)', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(noIoT);
        mockReportClusterFindOne.mockResolvedValue(null);
        const coords = [80.012, 7.456];
        mockReportClusterCreate.mockImplementation(async (data) => ({ ...data, _id: 'c1', save: mockClusterSave }));

        await processReportClustering(makeReport({ location: { type: 'Point', coordinates: coords } }));
        expect(mockReportClusterCreate.mock.calls[0][0].centroid.coordinates).toEqual(coords);
    });

    test('TC-CS-10: Zero IoT boost results in pure report-based confidence score', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(noIoT);
        mockReportClusterFindOne.mockResolvedValue(null);
        mockReportClusterCreate.mockResolvedValue(makeCluster());

        await processReportClustering(makeReport());
        const arg = mockReportClusterCreate.mock.calls[0][0];
        expect(arg.confidenceScore).toBe(2);
        expect(arg.iotVerified).toBe(false);
    });

    test('TC-CS-11: Existing cluster save failure throws error', async () => {
        mockEvaluateNearbySensors.mockResolvedValue(noIoT);
        const existing = makeCluster({ reports: ['r0'], save: jest.fn().mockRejectedValue(new Error('Save failed')) });
        mockReportClusterFindOne.mockResolvedValue(existing);
        mockHazardReportFind.mockResolvedValue([
            { _id: 'r0', location: { coordinates: [79.983, 6.932] }, isGuestReport: false },
        ]);

        await expect(processReportClustering(makeReport())).rejects.toThrow('Save failed');
    });
});
