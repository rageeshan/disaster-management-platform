/**
 * Unit Tests: PostEventAnalysisDashboard.jsx
 * Module: UC-04 – Post-Event Analysis & Operational Reports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostEventAnalysisDashboard from '../components/PostEventAnalysisDashboard';

const OFFICER_TOKEN = 'test-officer-token';

const sampleReport = {
    summary: {
        alertsIssued: 1,
        citizensTargeted: 1000,
        citizensReached: 800,
        groundReports: 12,
        verifiedClusters: 3,
        latestShelterOccupancy: 210,
        totalShelterCapacity: 300,
        resourcesDistributed: 400,
        distributionRecords: 1,
    },
    effectiveness: {
        rating: 'Adequate',
        responseScore: 72,
        reachRate: 80,
        verificationRate: 60,
        shelterUtilisation: 70,
        recommendations: ['Citizen reach performed well across dissemination channels.'],
    },
    alertTimeline: [{
        id: 'w1',
        hazardType: 'Flood',
        severity: 'High',
        status: 'ISSUED',
        warningMessage: 'River rising in Kalutara',
        targetLocations: ['Kalutara District'],
        estimatedRecipients: 1000,
        issuedAt: '2026-10-14T08:00:00.000Z',
    }],
    citizensReached: {
        byChannel: [{ channel: 'SMS', successful: 800, totalTargeted: 1000 }],
    },
    shelterOccupancy: {
        byDay: [{ date: '2026-10-14', occupancy: 210, capacity: 300 }],
        shelters: [{
            id: 's1',
            name: 'Kalutara College',
            district: 'Kalutara',
            organisation: 'DMC',
            capacity: 300,
            latest: { occupancy: 210 },
        }],
    },
    resourceDistribution: {
        byDistrict: [{ district: 'Kalutara', resourceType: 'FOOD', quantity: 400, unit: 'packs' }],
    },
};

describe('PostEventAnalysisDashboard – Rendering', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-PAUI-01: Shows loading state while the report is fetched', () => {
        global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
        render(<PostEventAnalysisDashboard officerToken={OFFICER_TOKEN} />);
        expect(screen.getByText(/loading post-event operational report/i)).toBeInTheDocument();
    });

    it('TC-PAUI-02: Renders KPI cards, timeline, occupancy, and resources', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            json: async () => ({ success: true, data: sampleReport }),
        });

        render(<PostEventAnalysisDashboard officerToken={OFFICER_TOKEN} />);

        await waitFor(() => {
            expect(screen.getByText(/post-event analysis & operational reports/i)).toBeInTheDocument();
        });
        expect(screen.getByText('River rising in Kalutara')).toBeInTheDocument();
        expect(screen.getByText('Kalutara College')).toBeInTheDocument();
        expect(screen.getByText(/FOOD/i)).toBeInTheDocument();
        expect(screen.getByText(/response effectiveness: adequate/i)).toBeInTheDocument();
    });

    it('TC-PAUI-03: Shows API error message when generation fails', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            json: async () => ({ success: false, message: 'Not authorized' }),
        });

        render(<PostEventAnalysisDashboard officerToken={OFFICER_TOKEN} />);

        await waitFor(() => {
            expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
        });
    });
});

describe('PostEventAnalysisDashboard – Actions', () => {
    beforeEach(() => vi.clearAllMocks());

    it('TC-PAUI-04: Generate Report refetches with selected district', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            json: async () => ({ success: true, data: sampleReport }),
        });

        render(<PostEventAnalysisDashboard officerToken={OFFICER_TOKEN} />);
        await screen.findByText(/post-event analysis/i);

        await userEvent.selectOptions(screen.getByLabelText(/district/i), 'Kalutara');
        await userEvent.click(screen.getByRole('button', { name: /generate report/i }));

        await waitFor(() => {
            expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
        });
        const lastUrl = global.fetch.mock.calls.at(-1)[0];
        expect(lastUrl).toContain('district=Kalutara');
    });

    it('TC-PAUI-05: Shows empty-state copy when the report has no operational data', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            json: async () => ({
                success: true,
                data: {
                    summary: {},
                    effectiveness: { recommendations: [] },
                    alertTimeline: [],
                    citizensReached: { byChannel: [] },
                    shelterOccupancy: { byDay: [], shelters: [] },
                    resourceDistribution: { byDistrict: [] },
                },
            }),
        });

        render(<PostEventAnalysisDashboard officerToken={OFFICER_TOKEN} />);
        expect(await screen.findByText(/no official warnings/i)).toBeInTheDocument();
        expect(screen.getByText(/no delivery telemetry/i)).toBeInTheDocument();
        expect(screen.getByText(/no occupancy snapshots/i)).toBeInTheDocument();
        expect(screen.getByText(/no relief distribution records/i)).toBeInTheDocument();
    });

    it('TC-PAUI-06: Export CSV downloads a file', async () => {
        const click = vi.fn();
        const originalCreate = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
            const el = originalCreate(tag);
            if (tag === 'a') {
                el.click = click;
            }
            return el;
        });
        window.URL.createObjectURL = vi.fn().mockReturnValue('blob:report');
        window.URL.revokeObjectURL = vi.fn();

        global.fetch = vi.fn()
            .mockResolvedValueOnce({ json: async () => ({ success: true, data: sampleReport }) })
            .mockResolvedValueOnce({ blob: async () => new Blob(['csv']) });

        render(<PostEventAnalysisDashboard officerToken={OFFICER_TOKEN} />);
        await screen.findByText(/post-event analysis/i);
        await userEvent.click(screen.getByRole('button', { name: /export csv/i }));

        await waitFor(() => {
            expect(click).toHaveBeenCalled();
        });
        expect(global.fetch.mock.calls.at(-1)[0]).toContain('format=csv');
    });
});
