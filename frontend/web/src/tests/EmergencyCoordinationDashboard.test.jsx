/**
 * Vitest UI Tests: EmergencyCoordinationDashboard.jsx
 * UC-03 – Coordinate Emergency Response & Resource Deployment
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmergencyCoordinationDashboard from '../components/EmergencyCoordinationDashboard';

const OFFICER_TOKEN = 'test-token-officer';

// ── Sample API Responses ──────────────────────────────────────────────────────
const sampleSummary = {
    teams: { total: 4, deployed: 2, byStatus: { DEPLOYED: 1, ON_SCENE: 1, STANDBY: 2 } },
    shelters: { total: 2, open: 1, full: 1, totalCapacity: 500, totalOccupancy: 380, utilisationPct: 76 },
    recentDistributions: [{ _id: 'd1', resourceType: 'FOOD' }],
};

const sampleTeams = [
    {
        _id: 't1', name: 'Alpha Rescue Unit', teamCode: 'ARU-01',
        organisation: 'Sri Lanka Army', organisationType: 'ARMED_FORCES',
        district: 'Colombo', memberCount: 10,
        status: 'ON_SCENE', currentMission: 'Kelani flood evacuation',
        contactNumber: '+94 11 234 5678', lastDispatchedAt: new Date().toISOString(),
    },
    {
        _id: 't2', name: 'Kalutara Response Team', teamCode: 'KRT-01',
        organisation: 'DMC', organisationType: 'GOVERNMENT',
        district: 'Kalutara', memberCount: 6,
        status: 'STANDBY', currentMission: '',
        lastDispatchedAt: null,
    },
];

const sampleShelters = [
    {
        _id: 's1', name: 'Colombo Municipal Hall',
        district: 'Colombo', address: 'Town Hall, CMC', capacity: 400,
        currentOccupancy: 310, managingOrganisation: 'CMC',
        organisationType: 'GOVERNMENT', status: 'OPEN',
        contactPerson: 'Mr. Perera',
    },
    {
        _id: 's2', name: 'Galle Army Camp',
        district: 'Galle', address: 'Rumassala Rd', capacity: 100,
        currentOccupancy: 100, managingOrganisation: 'SL Army',
        organisationType: 'ARMED_FORCES', status: 'FULL',
        contactPerson: 'Maj. Fernando',
    },
];

const sampleDistributions = [
    {
        _id: 'd1', resourceType: 'FOOD', quantity: 1500, unit: 'packs',
        district: 'Colombo', shelter: { _id: 's1', name: 'Colombo Municipal Hall' },
        organisation: 'DMC', organisationType: 'GOVERNMENT',
        distributedBy: 'Officer Perera', distributedAt: new Date().toISOString(),
        beneficiaryCount: 310,
    },
    {
        _id: 'd2', resourceType: 'WATER', quantity: 5001, unit: 'litres',
        district: 'Galle', shelter: null,
        organisation: 'Red Cross', organisationType: 'NGO',
        distributedBy: 'Volunteer', distributedAt: new Date().toISOString(),
        beneficiaryCount: 100,
    },
];

// Builds a full mock fetch response that returns data for all 4 API calls
const buildFetchMock = (overrides = {}) => vi.fn().mockImplementation((url) => {
    if (url.includes('/summary'))       return Promise.resolve({ json: async () => ({ success: true, data: overrides.summary ?? sampleSummary }) });
    if (url.includes('/rescue-teams'))  return Promise.resolve({ json: async () => ({ success: true, count: sampleTeams.length, data: overrides.teams ?? sampleTeams }) });
    if (url.includes('/shelters'))      return Promise.resolve({ json: async () => ({ success: true, count: sampleShelters.length, data: overrides.shelters ?? sampleShelters }) });
    if (url.includes('/distributions')) return Promise.resolve({ json: async () => ({ success: true, count: sampleDistributions.length, data: overrides.distributions ?? sampleDistributions }) });
    return Promise.resolve({ json: async () => ({ success: true, data: {} }) });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('EmergencyCoordinationDashboard – Rendering', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-EC-01: Shows loading spinner before data arrives', () => {
        global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        expect(screen.getByText(/loading emergency coordination data/i)).toBeInTheDocument();
    });

    it('TC-EC-02: Renders KPI strip with summary data after load', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => {
            expect(screen.getByText(/Active Teams/i)).toBeInTheDocument();
        });
        expect(screen.getByText(/Open Shelters/i)).toBeInTheDocument();
        expect(screen.getByText(/Shelter Occupancy/i)).toBeInTheDocument();
        expect(screen.getByText(/Recent Distributions/i)).toBeInTheDocument();
    });

    it('TC-EC-03: Shows rescue teams table with correct data', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => {
            expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument();
        });
        expect(screen.getByText('Kalutara Response Team')).toBeInTheDocument();
        expect(screen.getByText('ARU-01')).toBeInTheDocument();
        expect(screen.getByText('Kelani flood evacuation')).toBeInTheDocument();
    });

    it('TC-EC-04: Shows network error message when API unreachable', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network down'));
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => {
            expect(screen.getByText(/unable to reach the backend/i)).toBeInTheDocument();
        });
    });
});

describe('EmergencyCoordinationDashboard – Tab Navigation', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-EC-05: Clicking Shelters tab shows shelter data', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());

        fireEvent.click(screen.getByText(/🏠 Shelters/i));
        await waitFor(() => {
            expect(screen.getByText('Colombo Municipal Hall')).toBeInTheDocument();
        });
        expect(screen.getByText('Galle Army Camp')).toBeInTheDocument();
    });

    it('TC-EC-06: Clicking Distributions tab shows distribution records', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());

        fireEvent.click(screen.getByText(/📦 Relief Distributions/i));
        await waitFor(() => {
            expect(screen.getByText('Officer Perera')).toBeInTheDocument();
        });
    });

    it('TC-EC-07: Rescue Teams tab is active by default', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());
        expect(screen.getByText(/🚒 Rescue Teams/i).closest('button')).toHaveClass('active');
    });
});

describe('EmergencyCoordinationDashboard – Modals', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-EC-08: Clicking "+ Register Team" opens add team modal', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());

        fireEvent.click(screen.getByText('+ Register Team'));
        expect(screen.getByText('🚒 Register Rescue Team')).toBeInTheDocument();
    });

    it('TC-EC-09: Clicking Cancel closes the modal', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());

        fireEvent.click(screen.getByText('+ Register Team'));
        expect(screen.getByText('🚒 Register Rescue Team')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByText('🚒 Register Rescue Team')).not.toBeInTheDocument();
    });

    it('TC-EC-10: Dispatch button opens dispatch modal for that team', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());

        const dispatchBtns = screen.getAllByText(/⚡ Dispatch/i);
        fireEvent.click(dispatchBtns[0]);
        expect(screen.getByText(/⚡ Dispatch: Alpha Rescue Unit/i)).toBeInTheDocument();
    });

    it('TC-EC-11: Shelters tab opens "Register Shelter" modal', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());

        fireEvent.click(screen.getByText(/🏠 Shelters/i));
        await waitFor(() => expect(screen.getByText('Colombo Municipal Hall')).toBeInTheDocument());

        fireEvent.click(screen.getByText('+ Register Shelter'));
        expect(screen.getByText('🏠 Register Emergency Shelter')).toBeInTheDocument();
    });

    it('TC-EC-12: Distributions tab opens "Log Distribution" modal', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());

        fireEvent.click(screen.getByText(/📦 Relief Distributions/i));
        await waitFor(() => expect(screen.getByText('Officer Perera')).toBeInTheDocument());

        fireEvent.click(screen.getByText('+ Log Distribution'));
        expect(screen.getByText('📦 Log Relief Distribution')).toBeInTheDocument();
    });
});

describe('EmergencyCoordinationDashboard – Filters & Empty States', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-EC-13: Filter by district hides non-matching teams', async () => {
        global.fetch = buildFetchMock();
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());

        // Select a district that only one team belongs to
        const districtSelects = screen.getAllByRole('combobox');
        fireEvent.change(districtSelects[0], { target: { value: 'Colombo' } });

        expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument();
        expect(screen.queryByText('Kalutara Response Team')).not.toBeInTheDocument();
    });

    it('TC-EC-14: Empty shelters list shows empty state message', async () => {
        global.fetch = buildFetchMock({ shelters: [] });
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());

        fireEvent.click(screen.getByText(/🏠 Shelters/i));
        await waitFor(() => {
            expect(screen.getByText(/No shelters found/i)).toBeInTheDocument();
        });
    });

    it('TC-EC-15: Empty distributions list shows empty state message', async () => {
        global.fetch = buildFetchMock({ distributions: [] });
        render(<EmergencyCoordinationDashboard officerToken={OFFICER_TOKEN} />);
        await waitFor(() => expect(screen.getByText('Alpha Rescue Unit')).toBeInTheDocument());

        fireEvent.click(screen.getByText(/📦 Relief Distributions/i));
        await waitFor(() => {
            expect(screen.getByText(/No distribution records yet/i)).toBeInTheDocument();
        });
    });
});
