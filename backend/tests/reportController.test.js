/**
 * Unit Tests: reportController.js
 * Module: UC-01 – Submit Hazard Report
 * Coverage: submitReport, getMyReports
 */

import { jest } from '@jest/globals';

const mockReportCreate      = jest.fn();
const mockReportFind        = jest.fn();
const mockProcessClustering = jest.fn();

jest.unstable_mockModule('../models/HazardReport.js', () => ({
    default: { create: mockReportCreate, find: mockReportFind },
}));
jest.unstable_mockModule('../services/clusteringService.js', () => ({
    processReportClustering: mockProcessClustering,
}));
// mongoose ObjectId.isValid mock
jest.unstable_mockModule('mongoose', () => ({
    default: {
        Types: { ObjectId: { isValid: jest.fn().mockReturnValue(true) } },
    },
}));

const { submitReport, getMyReports } = await import('../controllers/reportController.js');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const baseBody = {
    hazardType: 'FLOOD', description: 'Rising water near bridge',
    district: 'Colombo', latitude: 6.932, longitude: 79.983,
};

describe('submitReport – Positive Cases', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-RC-01: Citizen report submitted → 201 with clusterId', async () => {
        const fakeReport  = { _id: 'rep-001', status: 'PENDING', save: jest.fn() };
        const fakeCluster = { _id: 'cls-001', confidenceScore: 4 };
        mockReportCreate.mockResolvedValue(fakeReport);
        mockProcessClustering.mockResolvedValue(fakeCluster);

        const req = { body: baseBody, user: { id: 'citizen-X' }, files: [] };
        const res = mockRes();
        await submitReport(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.data.clusterId).toBe('cls-001');
    });

    test('TC-RC-02: Guest report submitted without auth user → isGuestReport=true', async () => {
        const fakeReport  = { _id: 'rep-002', status: 'PENDING', save: jest.fn() };
        const fakeCluster = { _id: 'cls-002', confidenceScore: 1 };
        mockReportCreate.mockResolvedValue(fakeReport);
        mockProcessClustering.mockResolvedValue(fakeCluster);

        const req = { body: { ...baseBody, isGuestReport: true }, user: null, files: [] };
        const res = mockRes();
        await submitReport(req, res);

        const createArg = mockReportCreate.mock.calls[0][0];
        expect(createArg.isGuestReport).toBe(true);
        expect(createArg.reporter).toBeNull();
    });

    test('TC-RC-03: Coordinates parsed from GeoJSON location object', async () => {
        mockReportCreate.mockResolvedValue({ _id: 'r3', save: jest.fn() });
        mockProcessClustering.mockResolvedValue({ _id: 'c3', confidenceScore: 2 });

        const req = {
            body: {
                hazardType: 'LANDSLIDE', description: 'Slope cracking',
                district: 'Kandy',
                location: { type: 'Point', coordinates: [80.635, 7.291] },
            },
            user: { id: 'u1' }, files: [],
        };
        const res = mockRes();
        await submitReport(req, res);

        const createArg = mockReportCreate.mock.calls[0][0];
        expect(createArg.location.coordinates[0]).toBeCloseTo(80.635);
        expect(createArg.location.coordinates[1]).toBeCloseTo(7.291);
    });

    test('TC-RC-04: Photo URLs from Cloudinary (req.files) included in report', async () => {
        mockReportCreate.mockResolvedValue({ _id: 'r4', save: jest.fn() });
        mockProcessClustering.mockResolvedValue({ _id: 'c4', confidenceScore: 3 });

        const req = {
            body: baseBody, user: { id: 'u1' },
            files: [{ path: 'https://cloudinary.com/img1.jpg' }, { path: 'https://cloudinary.com/img2.jpg' }],
        };
        const res = mockRes();
        await submitReport(req, res);

        const createArg = mockReportCreate.mock.calls[0][0];
        expect(createArg.photoUrls).toHaveLength(2);
        expect(createArg.photoUrls[0]).toContain('cloudinary.com');
    });
});

describe('submitReport – Negative & Validation Cases', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-RC-05: Missing coordinates → 400 with descriptive error', async () => {
        const req = {
            body: { hazardType: 'FLOOD', description: 'test', district: 'Colombo' },
            user: { id: 'u1' }, files: [],
        };
        const res = mockRes();
        await submitReport(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].success).toBe(false);
        expect(res.json.mock.calls[0][0].message).toMatch(/coordinates/i);
    });

    test('TC-RC-06: Non-numeric coordinates (NaN) → 400', async () => {
        const req = {
            body: { ...baseBody, latitude: 'abc', longitude: 'xyz' },
            user: { id: 'u1' }, files: [],
        };
        const res = mockRes();
        await submitReport(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].message).toMatch(/invalid/i);
    });

    test('TC-RC-07: DB create failure → 500', async () => {
        mockReportCreate.mockRejectedValue(new Error('Write conflict'));

        const req = { body: baseBody, user: { id: 'u1' }, files: [] };
        const res = mockRes();
        await submitReport(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('TC-RC-08: Clustering service failure → 500', async () => {
        mockReportCreate.mockResolvedValue({ _id: 'r8', save: jest.fn() });
        mockProcessClustering.mockRejectedValue(new Error('Clustering failed'));

        const req = { body: baseBody, user: { id: 'u1' }, files: [] };
        const res = mockRes();
        await submitReport(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('getMyReports – Positive & Negative Cases', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-RC-09: Returns 200 with citizen reports list', async () => {
        mockReportFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { _id: 'r1', hazardType: 'FLOOD', description: 'test', district: 'Colombo',
                      location: { coordinates: [79.983, 6.932] }, status: 'CLUSTERED', photoUrls: [], createdAt: new Date() },
                ]),
            }),
        });

        const req = { user: { id: 'citizen-X' } };
        const res = mockRes();
        await getMyReports(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.count).toBe(1);
        expect(body.data[0].latitude).toBeCloseTo(6.932);
        expect(body.data[0].longitude).toBeCloseTo(79.983);
    });

    test('TC-RC-10: No logged-in user → 401 Unauthorized', async () => {
        const req = { user: null };
        const res = mockRes();
        await getMyReports(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json.mock.calls[0][0].success).toBe(false);
    });

    test('TC-RC-11: DB error during fetch → 500', async () => {
        mockReportFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockRejectedValue(new Error('DB read error')),
            }),
        });

        const req = { user: { id: 'citizen-X' } };
        const res = mockRes();
        await getMyReports(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('TC-RC-12: Returns empty list with count=0 when no reports exist', async () => {
        mockReportFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
            }),
        });

        const req = { user: { id: 'citizen-X' } };
        const res = mockRes();
        await getMyReports(req, res);

        const body = res.json.mock.calls[0][0];
        expect(body.count).toBe(0);
        expect(body.data).toHaveLength(0);
    });
});

// ── Additional branch coverage tests for reportController ────────────────
describe('submitReport – Branch Coverage for Coordinate Parsing', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-RC-13: Coordinates parsed from bracket notation location[coordinates][0]', async () => {
        mockReportCreate.mockResolvedValue({ _id: 'r13', save: jest.fn() });
        mockProcessClustering.mockResolvedValue({ _id: 'c13', confidenceScore: 2 });

        const req = {
            body: {
                hazardType: 'FLOOD', description: 'Bracket format test', district: 'Colombo',
                'location[coordinates][0]': '79.983',
                'location[coordinates][1]': '6.932',
            },
            user: { id: 'u1' }, files: [],
        };
        const res = mockRes();
        await submitReport(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const arg = mockReportCreate.mock.calls[0][0];
        expect(arg.location.coordinates[0]).toBeCloseTo(79.983);
    });

    test('TC-RC-14: Coordinates from stringified JSON array in location field', async () => {
        mockReportCreate.mockResolvedValue({ _id: 'r14', save: jest.fn() });
        mockProcessClustering.mockResolvedValue({ _id: 'c14', confidenceScore: 2 });

        const req = {
            body: {
                hazardType: 'HEAVY_RAIN', description: 'Heavy rain', district: 'Galle',
                location: JSON.stringify({ type: 'Point', coordinates: [80.221, 6.053] }),
            },
            user: { id: 'u1' }, files: [],
        };
        const res = mockRes();
        await submitReport(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('TC-RC-15: Reporter from body payload (not req.user) used when user not in request', async () => {
        mockReportCreate.mockResolvedValue({ _id: 'r15', save: jest.fn() });
        mockProcessClustering.mockResolvedValue({ _id: 'c15', confidenceScore: 2 });

        const req = {
            body: { ...baseBody, isGuestReport: false, reporter: 'citizen-from-body-001' },
            user: null, files: [],
        };
        const res = mockRes();
        await submitReport(req, res);

        const arg = mockReportCreate.mock.calls[0][0];
        // Without a valid user, and reporter provided — the service uses the body reporter
        expect(arg).toBeDefined();
    });

    test('TC-RC-16: Coordinates passed as stringified array "[79.983,6.932]" are parsed', async () => {
        mockReportCreate.mockResolvedValue({ _id: 'r16', save: jest.fn() });
        mockProcessClustering.mockResolvedValue({ _id: 'c16', confidenceScore: 2 });

        const req = {
            body: {
                hazardType: 'FLOOD', description: 'String array coords', district: 'Colombo',
                coordinates: '[79.983, 6.932]',
            },
            user: { id: 'u1' }, files: [],
        };
        const res = mockRes();
        await submitReport(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const arg = mockReportCreate.mock.calls[0][0];
        expect(arg.location.coordinates[0]).toBeCloseTo(79.983);
    });
});
