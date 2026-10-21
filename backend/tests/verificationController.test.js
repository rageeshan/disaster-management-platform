/**
 * Unit Tests: verificationController.js
 * Module: UC-01 – Manage Hazard Reports & Verification
 * Coverage: lockCluster, verifyCluster, getPendingClusters
 */

import { jest } from '@jest/globals';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockClusterSave   = jest.fn().mockResolvedValue(true);
const mockReportUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
const mockClusterFindById = jest.fn();
const mockClusterFind     = jest.fn();
const mockMasterFindById  = jest.fn();

jest.unstable_mockModule('../models/ReportCluster.js', () => ({
    default: {
        findById: mockClusterFindById,
        find: mockClusterFind,
    },
}));
jest.unstable_mockModule('../models/HazardReport.js', () => ({
    default: { updateMany: mockReportUpdateMany },
}));

const { lockCluster, verifyCluster, getPendingClusters } = await import('../controllers/verificationController.js');

// ── Response mock factory ──────────────────────────────────────────────────
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

// ── Cluster builder ────────────────────────────────────────────────────────
const makeCluster = (overrides = {}) => ({
    _id: 'cluster-001', status: 'PENDING_VERIFICATION',
    lockedBy: null, lockExpiresAt: null,
    confidenceScore: 4, hazardType: 'FLOOD', district: 'Colombo',
    centroid: { type: 'Point', coordinates: [79.983, 6.932] },
    iotVerified: false, matchedSensors: [],
    reports: [{ _id: 'report-001' }, { _id: 'report-002' }],
    officerNotes: '', save: mockClusterSave, ...overrides,
});

// ══════════════════════════════════════════════════════════════════════════
// getPendingClusters
// ══════════════════════════════════════════════════════════════════════════
describe('getPendingClusters', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-VC-01: Returns 200 with list of clusters', async () => {
        const clusters = [makeCluster(), makeCluster({ _id: 'cluster-002' })];
        const populateMock = { sort: jest.fn().mockResolvedValue(clusters) };
        mockClusterFind.mockReturnValue({ populate: jest.fn().mockReturnValue(populateMock) });

        const req = { query: {} };
        const res = mockRes();
        await getPendingClusters(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.count).toBe(2);
        expect(body.data).toHaveLength(2);
    });

    test('TC-VC-02: Applies district and hazardType filters when provided', async () => {
        const populateMock = { sort: jest.fn().mockResolvedValue([]) };
        mockClusterFind.mockReturnValue({ populate: jest.fn().mockReturnValue(populateMock) });

        const req = { query: { district: 'Galle', hazardType: 'LANDSLIDE' } };
        const res = mockRes();
        await getPendingClusters(req, res);

        const filterArg = mockClusterFind.mock.calls[0][0];
        expect(filterArg.district).toBe('Galle');
        expect(filterArg.hazardType).toBe('LANDSLIDE');
    });

    test('TC-VC-03: Returns 500 on database error', async () => {
        mockClusterFind.mockReturnValue({ populate: jest.fn().mockImplementation(() => { throw new Error('DB error'); }) });

        const req = { query: {} };
        const res = mockRes();
        await getPendingClusters(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════
// lockCluster
// ══════════════════════════════════════════════════════════════════════════
describe('lockCluster – Positive Cases', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-VC-04: Officer acquires lock on unlocked cluster → 200', async () => {
        mockClusterFindById.mockResolvedValue(makeCluster());
        const req = { params: { id: 'cluster-001' }, user: { id: 'officer-A' } };
        const res = mockRes();
        await lockCluster(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.message).toMatch(/lock acquired/i);
        expect(mockClusterSave).toHaveBeenCalled();
    });

    test('TC-VC-05: Officer re-acquires their own expired lock → 200', async () => {
        const expiredLock = makeCluster({
            lockedBy: 'officer-A',
            lockExpiresAt: new Date(Date.now() - 1000), // expired
        });
        mockClusterFindById.mockResolvedValue(expiredLock);

        const req = { params: { id: 'cluster-001' }, user: { id: 'officer-A' } };
        const res = mockRes();
        await lockCluster(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });
});

describe('lockCluster – Negative Cases', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-VC-06: Cluster not found → 404', async () => {
        mockClusterFindById.mockResolvedValue(null);
        const req = { params: { id: 'nonexistent' }, user: { id: 'officer-A' } };
        const res = mockRes();
        await lockCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('TC-VC-07: Cluster locked by different officer (active lock) → 409', async () => {
        const activeLock = makeCluster({
            lockedBy: 'officer-B',
            lockExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // active
        });
        mockClusterFindById.mockResolvedValue(activeLock);

        const req = { params: { id: 'cluster-001' }, user: { id: 'officer-A' } };
        const res = mockRes();
        await lockCluster(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json.mock.calls[0][0].success).toBe(false);
    });

    test('TC-VC-08: DB error during lock → 500', async () => {
        mockClusterFindById.mockRejectedValue(new Error('Connection lost'));
        const req = { params: { id: 'cluster-001' }, user: { id: 'officer-A' } };
        const res = mockRes();
        await lockCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ══════════════════════════════════════════════════════════════════════════
// verifyCluster
// ══════════════════════════════════════════════════════════════════════════
describe('verifyCluster – VERIFY action', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-VC-09: VERIFY action returns 200 with UC-02 handover payload', async () => {
        const cluster = makeCluster({ confidenceScore: 7 });
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'VERIFY', officerNotes: 'Looks verified', severityLevel: 'CRITICAL' },
        };
        const res = mockRes();
        await verifyCluster(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.handoverPayload).toBeDefined();
        expect(body.handoverPayload.action).toBe('VERIFIED');
        expect(body.handoverPayload.hazardType).toBe('FLOOD');
        expect(body.handoverPayload.severityLevel).toBe('CRITICAL');
    });

    test('TC-VC-10: VERIFY with score >= 6 defaults to CRITICAL severity when not specified', async () => {
        const cluster = makeCluster({ confidenceScore: 8 });
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'VERIFY' },
        };
        const res = mockRes();
        await verifyCluster(req, res);

        const body = res.json.mock.calls[0][0];
        expect(body.handoverPayload.severityLevel).toBe('CRITICAL');
    });

    test('TC-VC-11: VERIFY with score < 6 defaults to MODERATE severity', async () => {
        const cluster = makeCluster({ confidenceScore: 4 });
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'VERIFY' },
        };
        const res = mockRes();
        await verifyCluster(req, res);

        const body = res.json.mock.calls[0][0];
        expect(body.handoverPayload.severityLevel).toBe('MODERATE');
    });

    test('TC-VC-12: VERIFY updates cluster status to VERIFIED and releases lock', async () => {
        const cluster = makeCluster({ lockedBy: 'officer-A', lockExpiresAt: new Date(Date.now() + 60000) });
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = { params: { id: 'cluster-001' }, user: { id: 'officer-A' }, body: { action: 'VERIFY' } };
        const res = mockRes();
        await verifyCluster(req, res);

        expect(cluster.status).toBe('VERIFIED');
        expect(cluster.lockedBy).toBeNull();
        expect(cluster.lockExpiresAt).toBeNull();
        expect(mockClusterSave).toHaveBeenCalled();
        expect(mockReportUpdateMany).toHaveBeenCalledWith(
            { _id: { $in: expect.any(Array) } },
            { $set: { status: 'VERIFIED' } }
        );
    });
});

describe('verifyCluster – REJECT action', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-VC-13: REJECT with valid reasonCode and notes → 200', async () => {
        const cluster = makeCluster();
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'REJECT', reasonCode: 'FALSE_ALARM', officerNotes: 'No evidence on ground' },
        };
        const res = mockRes();
        await verifyCluster(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(cluster.status).toBe('REJECTED');
        expect(cluster.reasonCode).toBe('FALSE_ALARM');
    });

    test('TC-VC-14: REJECT without reasonCode → 400 safety gate', async () => {
        const cluster = makeCluster();
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'REJECT', officerNotes: 'Some notes here' },
        };
        const res = mockRes();
        await verifyCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TC-VC-15: REJECT with notes shorter than 5 chars → 400', async () => {
        const cluster = makeCluster();
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'REJECT', reasonCode: 'DUPLICATE', officerNotes: 'No' },
        };
        const res = mockRes();
        await verifyCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe('verifyCluster – FLAG action', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-VC-16: FLAG with valid notes → 200 and FLAGGED status', async () => {
        const cluster = makeCluster();
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'FLAG', officerNotes: 'Needs senior review - complex situation' },
        };
        const res = mockRes();
        await verifyCluster(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(cluster.status).toBe('FLAGGED');
        expect(cluster.lockedBy).toBeNull(); // lock released for supervisor
    });

    test('TC-VC-17: FLAG without notes → 400 escalation safety gate', async () => {
        const cluster = makeCluster();
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'FLAG' },
        };
        const res = mockRes();
        await verifyCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe('verifyCluster – MERGE action', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-VC-18: MERGE into valid master cluster → 200 and DUPLICATE_MERGED status', async () => {
        const cluster = makeCluster({ reports: [{ _id: 'r1' }, { _id: 'r2' }] });
        const master  = makeCluster({ _id: 'master-001', reports: ['r0'], save: mockClusterSave });
        mockClusterFindById
            .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(cluster) })
            .mockResolvedValueOnce(master);

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'MERGE', masterClusterId: 'master-001' },
        };
        const res = mockRes();
        await verifyCluster(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(cluster.status).toBe('DUPLICATE_MERGED');
    });

    test('TC-VC-19: MERGE without masterClusterId → 400 safety gate', async () => {
        const cluster = makeCluster();
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'MERGE' },
        };
        const res = mockRes();
        await verifyCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TC-VC-20: MERGE cluster into itself → 400 invalid operation', async () => {
        const cluster = makeCluster();
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'MERGE', masterClusterId: 'cluster-001' },
        };
        const res = mockRes();
        await verifyCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].message).toMatch(/itself/i);
    });
});

describe('verifyCluster – Concurrency & Error Cases', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-VC-21: Action blocked if cluster locked by different officer → 423', async () => {
        const cluster = makeCluster({
            lockedBy: 'officer-B',
            lockExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'VERIFY' },
        };
        const res = mockRes();
        await verifyCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(423);
    });

    test('TC-VC-22: Invalid action string → 400', async () => {
        const cluster = makeCluster();
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(cluster) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'INVALIDACTION' },
        };
        const res = mockRes();
        await verifyCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TC-VC-23: Cluster not found → 404', async () => {
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

        const req = {
            params: { id: 'nonexistent' }, user: { id: 'officer-A' },
            body: { action: 'VERIFY' },
        };
        const res = mockRes();
        await verifyCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('TC-VC-24: DB error during verifyCluster → 500', async () => {
        mockClusterFindById.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('DB crash')) });

        const req = {
            params: { id: 'cluster-001' }, user: { id: 'officer-A' },
            body: { action: 'VERIFY' },
        };
        const res = mockRes();
        await verifyCluster(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
