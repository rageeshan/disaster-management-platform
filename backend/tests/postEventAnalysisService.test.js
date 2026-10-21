/**
 * Unit Tests: postEventAnalysisService.js
 * Module: UC-04 – Generate Post-Event Analysis & Operational Reports
 */

import { jest } from '@jest/globals';

const mockWarningFind = jest.fn();
const mockDeliveryFind = jest.fn();
const mockReportCount = jest.fn();
const mockClusterFind = jest.fn();
const mockShelterFind = jest.fn();
const mockOccupancyFind = jest.fn();
const mockDistributionFind = jest.fn();

jest.unstable_mockModule('../models/HazardWarning.js', () => ({
    default: { find: mockWarningFind },
}));
jest.unstable_mockModule('../models/DeliveryLog.js', () => ({
    default: { find: mockDeliveryFind },
}));
jest.unstable_mockModule('../models/HazardReport.js', () => ({
    default: { countDocuments: mockReportCount },
}));
jest.unstable_mockModule('../models/ReportCluster.js', () => ({
    default: { find: mockClusterFind },
}));
jest.unstable_mockModule('../models/EmergencyShelter.js', () => ({
    default: { find: mockShelterFind },
}));
jest.unstable_mockModule('../models/ShelterOccupancyLog.js', () => ({
    default: { find: mockOccupancyFind },
}));
jest.unstable_mockModule('../models/ReliefDistribution.js', () => ({
    default: { find: mockDistributionFind },
}));

const {
    normalizeWarningHazard,
    normalizeReportHazard,
    buildDateRange,
    buildEffectiveness,
    toCsv,
    getOperationalReport,
} = await import('../services/postEventAnalysisService.js');

const chain = (data) => ({
    sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(data) }),
    lean: jest.fn().mockResolvedValue(data),
});

describe('Hazard type and date helpers', () => {
    test('TC-PA-01: Maps report hazard codes onto warning hazard labels', () => {
        expect(normalizeWarningHazard('FLOOD')).toBe('Flood');
        expect(normalizeWarningHazard('Landslide')).toBe('Landslide');
        expect(normalizeWarningHazard(null)).toBeNull();
    });

    test('TC-PA-02: Maps warning labels onto report hazard codes', () => {
        expect(normalizeReportHazard('Flood')).toBe('FLOOD');
        expect(normalizeReportHazard('HEAVY_RAIN')).toBe('HEAVY_RAIN');
        expect(normalizeReportHazard(null)).toBeNull();
    });

    test('TC-PA-03: Builds inclusive date range and returns null when empty', () => {
        expect(buildDateRange()).toBeNull();
        const range = buildDateRange('2026-10-01', '2026-10-07');
        expect(range.$gte).toEqual(new Date('2026-10-01'));
        expect(range.$lte.getHours()).toBe(23);
    });
});

describe('Effectiveness scoring', () => {
    test('TC-PA-04: Strong rating when reach, verification, and occupancy are high', () => {
        const result = buildEffectiveness({
            citizensReached: 90,
            citizensTargeted: 100,
            verifiedClusters: 8,
            totalClusters: 10,
            latestShelterOccupancy: 80,
            totalShelterCapacity: 100,
        });
        expect(result.rating).toBe('Strong');
        expect(result.responseScore).toBeGreaterThanOrEqual(80);
    });

    test('TC-PA-05: Needs Improvement when metrics are weak', () => {
        const result = buildEffectiveness({
            citizensReached: 10,
            citizensTargeted: 100,
            verifiedClusters: 1,
            totalClusters: 10,
            latestShelterOccupancy: 10,
            totalShelterCapacity: 100,
        });
        expect(result.rating).toBe('Needs Improvement');
        expect(result.recommendations[0]).toMatch(/retry coverage/i);
    });

    test('TC-PA-05c: Flags overflow shelters when utilisation exceeds 90%', () => {
        const result = buildEffectiveness({
            citizensReached: 90,
            citizensTargeted: 100,
            verifiedClusters: 9,
            totalClusters: 10,
            latestShelterOccupancy: 95,
            totalShelterCapacity: 100,
        });
        expect(result.recommendations[2]).toMatch(/overflow/i);
    });

    test('TC-PA-05b: Adequate rating for mid-range composite scores', () => {
        const result = buildEffectiveness({
            citizensReached: 70,
            citizensTargeted: 100,
            verifiedClusters: 6,
            totalClusters: 10,
            latestShelterOccupancy: 60,
            totalShelterCapacity: 100,
        });
        expect(result.rating).toBe('Adequate');
    });
});

describe('getOperationalReport', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-PA-06: Aggregates alerts, reach, occupancy, and district resources', async () => {
        const warning = {
            _id: 'w1',
            hazardType: 'Flood',
            severity: 'High',
            status: 'ISSUED',
            warningMessage: 'River rising',
            targetAreaType: 'District',
            targetLocations: ['Kalutara District'],
            estimatedRecipients: 1000,
            issuedBy: 'Officer',
            createdAt: new Date('2026-10-14'),
        };
        const shelter = { _id: 's1', name: 'Kalutara College', district: 'Kalutara', capacity: 300, managingOrganisation: 'DMC', organisationType: 'GOVERNMENT' };

        mockWarningFind.mockReturnValue(chain([warning]));
        mockDeliveryFind.mockReturnValue(chain([
            { warningId: 'w1', channel: 'SMS', totalTargeted: 1000, successful: 800, failed: 200 },
        ]));
        mockReportCount.mockResolvedValue(12);
        mockClusterFind.mockReturnValue(chain([
            { status: 'VERIFIED' },
            { status: 'PENDING_VERIFICATION' },
        ]));
        mockShelterFind.mockReturnValue(chain([shelter]));
        mockOccupancyFind.mockReturnValue(chain([
            { shelter: 's1', occupancy: 210, recordedAt: new Date('2026-10-15') },
        ]));
        mockDistributionFind.mockReturnValue(chain([
            { resourceType: 'FOOD', quantity: 400, unit: 'packs', district: 'Kalutara', organisationType: 'NGO', distributedAt: new Date('2026-10-15') },
        ]));

        const report = await getOperationalReport({ district: 'Kalutara', hazardType: 'FLOOD' });

        expect(report.summary.alertsIssued).toBe(1);
        expect(report.summary.citizensReached).toBe(800);
        expect(report.summary.groundReports).toBe(12);
        expect(report.summary.verifiedClusters).toBe(1);
        expect(report.citizensReached.byChannel[0].channel).toBe('SMS');
        expect(report.shelterOccupancy.series[0].utilisation).toBe(70);
        expect(report.resourceDistribution.byDistrict[0].quantity).toBe(400);
        expect(report.effectiveness).toHaveProperty('responseScore');
        expect(toCsv(report)).toContain('Alert Timeline');
    });

    test('TC-PA-07: Filters warnings by district substring and returns empty delivery stats', async () => {
        mockWarningFind.mockReturnValue(chain([
            { _id: 'w2', targetLocations: ['Galle District'], hazardType: 'Flood', createdAt: new Date() },
        ]));
        mockDeliveryFind.mockReturnValue(chain([]));
        mockReportCount.mockResolvedValue(0);
        mockClusterFind.mockReturnValue(chain([]));
        mockShelterFind.mockReturnValue(chain([]));
        mockOccupancyFind.mockReturnValue(chain([]));
        mockDistributionFind.mockReturnValue(chain([]));

        const report = await getOperationalReport({ district: 'Colombo' });
        expect(report.summary.alertsIssued).toBe(0);
        expect(report.citizensReached.successful).toBe(0);
        expect(mockDeliveryFind).not.toHaveBeenCalled();
    });

    test('TC-PA-08: Applies date and hazard filters to warning query', async () => {
        mockWarningFind.mockReturnValue(chain([]));
        mockReportCount.mockResolvedValue(0);
        mockClusterFind.mockReturnValue(chain([]));
        mockShelterFind.mockReturnValue(chain([]));
        mockOccupancyFind.mockReturnValue(chain([]));
        mockDistributionFind.mockReturnValue(chain([]));

        await getOperationalReport({ from: '2026-10-01', to: '2026-10-20', hazardType: 'Landslide' });

        const filter = mockWarningFind.mock.calls[0][0];
        expect(filter.hazardType).toBe('Landslide');
        expect(filter.createdAt.$gte).toEqual(new Date('2026-10-01'));
        expect(filter.status.$in).toContain('ISSUED');
    });

    test('TC-PA-09: Multiple districts sorted alphabetically in byDistrict (sort comparator branch)', async () => {
        mockWarningFind.mockReturnValue(chain([]));
        mockDeliveryFind.mockReturnValue(chain([]));
        mockReportCount.mockResolvedValue(0);
        mockClusterFind.mockReturnValue(chain([]));
        mockShelterFind.mockReturnValue(chain([]));
        mockOccupancyFind.mockReturnValue(chain([]));
        mockDistributionFind.mockReturnValue(chain([
            { resourceType: 'FOOD', quantity: 100, unit: 'packs', district: 'Ratnapura', organisationType: 'NGO', distributedAt: new Date() },
            { resourceType: 'WATER', quantity: 200, unit: 'litres', district: 'Colombo', organisationType: 'GOVERNMENT', distributedAt: new Date() },
            { resourceType: 'MEDICINE', quantity: 50, unit: 'kits', district: 'Colombo', organisationType: 'GOVERNMENT', distributedAt: new Date() },
        ]));

        const report = await getOperationalReport({});
        const districts = report.resourceDistribution.byDistrict.map((r) => r.district);
        // Should be sorted: Colombo (two merged), Ratnapura
        expect(districts[0]).toBe('Colombo');
        expect(districts[districts.length - 1]).toBe('Ratnapura');
    });

    test('TC-PA-10: Shelter occupancy byDay sorted ascending by date (sort comparator branch)', async () => {
        const shelterId = 'shelter-sort-test';
        mockWarningFind.mockReturnValue(chain([]));
        mockDeliveryFind.mockReturnValue(chain([]));
        mockReportCount.mockResolvedValue(0);
        mockClusterFind.mockReturnValue(chain([]));
        mockShelterFind.mockReturnValue(chain([
            { _id: shelterId, name: 'Sort Test Shelter', district: 'Galle', capacity: 100, managingOrganisation: 'DMC', organisationType: 'GOVERNMENT' },
        ]));
        mockOccupancyFind.mockReturnValue(chain([
            { shelter: shelterId, occupancy: 80, recordedAt: new Date('2026-10-05') },
            { shelter: shelterId, occupancy: 50, recordedAt: new Date('2026-10-02') },
            { shelter: shelterId, occupancy: 70, recordedAt: new Date('2026-10-03') },
        ]));
        mockDistributionFind.mockReturnValue(chain([]));

        const report = await getOperationalReport({});
        const dates = report.shelterOccupancy.byDay.map((r) => r.date);
        expect(dates[0]).toBe('2026-10-02');
        expect(dates[dates.length - 1]).toBe('2026-10-05');
    });
});
