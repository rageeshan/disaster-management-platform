/**
 * Unit Tests: emergencyResponseController.js
 * Module: UC-03 – Coordinate Emergency Response & Resource Deployment
 *
 * Coverage: Rescue Teams, Emergency Shelters, Relief Distributions, Summary
 */

import { jest } from '@jest/globals';

// ── Model Mocks ───────────────────────────────────────────────────────────────
const mockTeamFind         = jest.fn();
const mockTeamCreate       = jest.fn();
const mockTeamFindByIdUpd  = jest.fn();
const mockTeamFindByIdDel  = jest.fn();

const mockShelterFind      = jest.fn();
const mockShelterCreate    = jest.fn();
const mockShelterFindById  = jest.fn();
const mockShelterFindByIdDel = jest.fn();

const mockDistFind         = jest.fn();
const mockDistCreate       = jest.fn();

jest.unstable_mockModule('../models/RescueTeam.js', () => ({
    default: {
        find: mockTeamFind,
        create: mockTeamCreate,
        findByIdAndUpdate: mockTeamFindByIdUpd,
        findByIdAndDelete: mockTeamFindByIdDel,
    },
}));

jest.unstable_mockModule('../models/EmergencyShelter.js', () => ({
    default: {
        find: mockShelterFind,
        create: mockShelterCreate,
        findById: mockShelterFindById,
        findByIdAndDelete: mockShelterFindByIdDel,
    },
}));

jest.unstable_mockModule('../models/ReliefDistribution.js', () => ({
    default: {
        find: mockDistFind,
        create: mockDistCreate,
    },
}));

const {
    listRescueTeams,
    createRescueTeam,
    dispatchRescueTeam,
    deleteRescueTeam,
    listShelters,
    createShelter,
    updateShelterOccupancy,
    deleteShelter,
    listDistributions,
    createDistribution,
    getOperationalSummary,
} = await import('../controllers/emergencyResponseController.js');

// ── Helper factories ──────────────────────────────────────────────────────────
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const chainedFind = (data) => ({
    sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(data),
    }),
    lean: jest.fn().mockResolvedValue(data),
});

const chainedFindPopulate = (data) => ({
    sort: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(data),
        }),
    }),
});

// ─── RESCUE TEAMS ─────────────────────────────────────────────────────────────
describe('listRescueTeams', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-01: Returns 200 with all teams when no filters', async () => {
        mockTeamFind.mockReturnValue(chainedFind([{ _id: 't1', name: 'Alpha', status: 'STANDBY' }]));
        const req = { query: {} };
        const res = mockRes();
        await listRescueTeams(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.count).toBe(1);
    });

    test('TC-ER-02: Applies district filter to query', async () => {
        mockTeamFind.mockReturnValue(chainedFind([]));
        await listRescueTeams({ query: { district: 'Colombo' } }, mockRes());
        expect(mockTeamFind.mock.calls[0][0].district).toBe('Colombo');
    });

    test('TC-ER-03: Applies status filter to query', async () => {
        mockTeamFind.mockReturnValue(chainedFind([]));
        await listRescueTeams({ query: { status: 'DEPLOYED' } }, mockRes());
        expect(mockTeamFind.mock.calls[0][0].status).toBe('DEPLOYED');
    });

    test('TC-ER-04: Returns 500 on DB error', async () => {
        mockTeamFind.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('db fail')) }) });
        const res = mockRes();
        await listRescueTeams({ query: {} }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('createRescueTeam', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-05: Creates team and returns 201', async () => {
        const fakeTeam = { _id: 't1', name: 'Bravo', teamCode: 'BRV-01', district: 'Kandy' };
        mockTeamCreate.mockResolvedValue(fakeTeam);
        const req = { body: { name: 'Bravo', teamCode: 'BRV-01', district: 'Kandy' } };
        const res = mockRes();
        await createRescueTeam(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json.mock.calls[0][0].data.name).toBe('Bravo');
    });

    test('TC-ER-06: Returns 400 when required fields missing', async () => {
        const req = { body: { name: 'NoCode' } };
        const res = mockRes();
        await createRescueTeam(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TC-ER-07: Returns 409 on duplicate teamCode', async () => {
        const err = new Error('Duplicate'); err.code = 11000;
        mockTeamCreate.mockRejectedValue(err);
        const req = { body: { name: 'X', teamCode: 'DUP', district: 'Galle' } };
        const res = mockRes();
        await createRescueTeam(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    test('TC-ER-08: Returns 500 on generic DB error', async () => {
        mockTeamCreate.mockRejectedValue(new Error('timeout'));
        const req = { body: { name: 'X', teamCode: 'XY1', district: 'Galle' } };
        const res = mockRes();
        await createRescueTeam(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('dispatchRescueTeam', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-09: Dispatches team → status DEPLOYED', async () => {
        const updatedTeam = { _id: 't1', status: 'DEPLOYED', currentMission: 'Flood rescue' };
        mockTeamFindByIdUpd.mockResolvedValue(updatedTeam);
        const req = {
            params: { id: 't1' },
            body: { currentMission: 'Flood rescue', dispatchedBy: 'Officer A', status: 'DEPLOYED' },
            user: { email: 'officer@dmc.lk' },
        };
        const res = mockRes();
        await dispatchRescueTeam(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json.mock.calls[0][0].data.status).toBe('DEPLOYED');
    });

    test('TC-ER-10: Returns 404 when team not found', async () => {
        mockTeamFindByIdUpd.mockResolvedValue(null);
        const req = { params: { id: 'nonexistent' }, body: { status: 'DEPLOYED' }, user: {} };
        const res = mockRes();
        await dispatchRescueTeam(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('TC-ER-11: Defaults to DEPLOYED when invalid status provided', async () => {
        const updatedTeam = { _id: 't1', status: 'DEPLOYED' };
        mockTeamFindByIdUpd.mockResolvedValue(updatedTeam);
        const req = { params: { id: 't1' }, body: { status: 'INVALID_STATUS' }, user: {} };
        const res = mockRes();
        await dispatchRescueTeam(req, res);
        const updateArg = mockTeamFindByIdUpd.mock.calls[0][1];
        expect(updateArg.status).toBe('DEPLOYED');
    });

    test('TC-ER-12: Returns 500 on DB error', async () => {
        mockTeamFindByIdUpd.mockRejectedValue(new Error('timeout'));
        const req = { params: { id: 't1' }, body: {}, user: {} };
        const res = mockRes();
        await dispatchRescueTeam(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('deleteRescueTeam', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-13: Deletes team and returns 200', async () => {
        mockTeamFindByIdDel.mockResolvedValue({ _id: 't1' });
        const req = { params: { id: 't1' } };
        const res = mockRes();
        await deleteRescueTeam(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('TC-ER-14: Returns 404 when team not found', async () => {
        mockTeamFindByIdDel.mockResolvedValue(null);
        const req = { params: { id: 'ghost' } };
        const res = mockRes();
        await deleteRescueTeam(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

// ─── EMERGENCY SHELTERS ───────────────────────────────────────────────────────
describe('listShelters', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-15: Returns 200 with all shelters', async () => {
        mockShelterFind.mockReturnValue(chainedFind([{ _id: 's1', name: 'Hall', capacity: 200 }]));
        const res = mockRes();
        await listShelters({ query: {} }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json.mock.calls[0][0].count).toBe(1);
    });

    test('TC-ER-16: Applies district + status filters', async () => {
        mockShelterFind.mockReturnValue(chainedFind([]));
        await listShelters({ query: { district: 'Galle', status: 'FULL' } }, mockRes());
        const filter = mockShelterFind.mock.calls[0][0];
        expect(filter.district).toBe('Galle');
        expect(filter.status).toBe('FULL');
    });
});

describe('createShelter', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-17: Creates shelter → 201', async () => {
        const fakeShelter = { _id: 's1', name: 'New Hall', capacity: 100 };
        mockShelterCreate.mockResolvedValue(fakeShelter);
        const req = { body: { name: 'New Hall', district: 'Colombo', address: 'Main St', capacity: 100 } };
        const res = mockRes();
        await createShelter(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('TC-ER-18: Returns 400 when required fields missing', async () => {
        const req = { body: { name: 'Hall' } }; // missing district, address, capacity
        const res = mockRes();
        await createShelter(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TC-ER-19: Returns 500 on DB error', async () => {
        mockShelterCreate.mockRejectedValue(new Error('write fail'));
        const req = { body: { name: 'H', district: 'D', address: 'A', capacity: 10 } };
        const res = mockRes();
        await createShelter(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('updateShelterOccupancy', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-20: Updates occupancy and auto-sets OPEN when below capacity', async () => {
        const shelter = { _id: 's1', capacity: 100, currentOccupancy: 0, status: 'OPEN', save: jest.fn().mockResolvedValue(true) };
        mockShelterFindById.mockResolvedValue(shelter);
        const req = { params: { id: 's1' }, body: { currentOccupancy: 60 } };
        const res = mockRes();
        await updateShelterOccupancy(req, res);
        expect(shelter.status).toBe('OPEN');
        expect(shelter.currentOccupancy).toBe(60);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('TC-ER-21: Auto-sets FULL when occupancy reaches capacity', async () => {
        const shelter = { _id: 's1', capacity: 100, currentOccupancy: 0, status: 'OPEN', save: jest.fn().mockResolvedValue(true) };
        mockShelterFindById.mockResolvedValue(shelter);
        const req = { params: { id: 's1' }, body: { currentOccupancy: 100 } };
        const res = mockRes();
        await updateShelterOccupancy(req, res);
        expect(shelter.status).toBe('FULL');
    });

    test('TC-ER-22: Respects explicit status override (CLOSED)', async () => {
        const shelter = { _id: 's1', capacity: 100, currentOccupancy: 0, status: 'OPEN', save: jest.fn().mockResolvedValue(true) };
        mockShelterFindById.mockResolvedValue(shelter);
        const req = { params: { id: 's1' }, body: { currentOccupancy: 20, status: 'CLOSED' } };
        const res = mockRes();
        await updateShelterOccupancy(req, res);
        expect(shelter.status).toBe('CLOSED');
    });

    test('TC-ER-23: Returns 400 when currentOccupancy missing', async () => {
        const req = { params: { id: 's1' }, body: {} };
        const res = mockRes();
        await updateShelterOccupancy(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TC-ER-24: Returns 404 when shelter not found', async () => {
        mockShelterFindById.mockResolvedValue(null);
        const req = { params: { id: 'ghost' }, body: { currentOccupancy: 50 } };
        const res = mockRes();
        await updateShelterOccupancy(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('TC-ER-25: Returns 500 on DB error', async () => {
        mockShelterFindById.mockRejectedValue(new Error('db error'));
        const req = { params: { id: 's1' }, body: { currentOccupancy: 50 } };
        const res = mockRes();
        await updateShelterOccupancy(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('deleteShelter', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-26: Deletes shelter → 200', async () => {
        mockShelterFindByIdDel.mockResolvedValue({ _id: 's1' });
        await deleteShelter({ params: { id: 's1' } }, mockRes());
        expect(mockShelterFindByIdDel).toHaveBeenCalledWith('s1');
    });

    test('TC-ER-27: Returns 404 when shelter not found', async () => {
        mockShelterFindByIdDel.mockResolvedValue(null);
        const res = mockRes();
        await deleteShelter({ params: { id: 'ghost' } }, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

// ─── RELIEF DISTRIBUTIONS ─────────────────────────────────────────────────────
describe('listDistributions', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-28: Returns 200 with distributions list', async () => {
        mockDistFind.mockReturnValue(chainedFindPopulate([{ _id: 'd1', resourceType: 'FOOD' }]));
        const res = mockRes();
        await listDistributions({ query: {} }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json.mock.calls[0][0].count).toBe(1);
    });

    test('TC-ER-29: Applies district filter', async () => {
        mockDistFind.mockReturnValue(chainedFindPopulate([]));
        await listDistributions({ query: { district: 'Kandy' } }, mockRes());
        expect(mockDistFind.mock.calls[0][0].district).toBe('Kandy');
    });
});

describe('createDistribution', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-30: Creates distribution → 201', async () => {
        const fakeDist = { _id: 'd1', resourceType: 'FOOD', quantity: 100 };
        mockDistCreate.mockResolvedValue(fakeDist);
        const req = {
            body: { resourceType: 'FOOD', quantity: 100, district: 'Colombo', organisation: 'DMC' },
            user: { email: 'officer@dmc.lk' },
        };
        const res = mockRes();
        await createDistribution(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('TC-ER-31: Returns 400 when required fields missing', async () => {
        const req = { body: { resourceType: 'FOOD' }, user: {} }; // missing quantity, district, organisation
        const res = mockRes();
        await createDistribution(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TC-ER-32: Returns 500 on DB error', async () => {
        mockDistCreate.mockRejectedValue(new Error('write fail'));
        const req = {
            body: { resourceType: 'WATER', quantity: 200, district: 'Galle', organisation: 'NGO' },
            user: {},
        };
        const res = mockRes();
        await createDistribution(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('TC-ER-33: Uses distributedAt from body when provided', async () => {
        const fakeDist = { _id: 'd2' };
        mockDistCreate.mockResolvedValue(fakeDist);
        const customDate = '2026-10-01T00:00:00.000Z';
        const req = {
            body: {
                resourceType: 'MEDICINE', quantity: 50, district: 'Kandy',
                organisation: 'MoH', distributedAt: customDate,
            },
            user: {},
        };
        const res = mockRes();
        await createDistribution(req, res);
        const createArg = mockDistCreate.mock.calls[0][0];
        expect(createArg.distributedAt).toEqual(new Date(customDate));
    });
});

// ─── OPERATIONAL SUMMARY ──────────────────────────────────────────────────────
describe('getOperationalSummary', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-ER-34: Returns 200 with summary aggregation', async () => {
        mockTeamFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([
            { status: 'DEPLOYED' }, { status: 'STANDBY' }, { status: 'ON_SCENE' },
        ]) });
        mockShelterFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([
            { status: 'OPEN', capacity: 200, currentOccupancy: 120 },
            { status: 'FULL', capacity: 100, currentOccupancy: 100 },
        ]) });
        mockDistFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([{ _id: 'd1', resourceType: 'FOOD' }]),
                }),
            }),
        });

        const res = mockRes();
        await getOperationalSummary({ query: {} }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0].data;
        expect(body.teams.total).toBe(3);
        expect(body.teams.deployed).toBe(2); // DEPLOYED + ON_SCENE
        expect(body.shelters.total).toBe(2);
        expect(body.shelters.totalCapacity).toBe(300);
        expect(body.shelters.utilisationPct).toBe(73);
    });

    test('TC-ER-35: Returns 500 on DB error', async () => {
        mockTeamFind.mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('db fail')) });
        const res = mockRes();
        await getOperationalSummary({ query: {} }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
