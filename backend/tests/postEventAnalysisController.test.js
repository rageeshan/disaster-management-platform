/**
 * Unit Tests: postEventAnalysisController.js
 * Module: UC-04 – Generate Post-Event Analysis & Operational Reports
 */

import { jest } from '@jest/globals';

const mockGetOperationalReport = jest.fn();
const mockToCsv = jest.fn();

jest.unstable_mockModule('../services/postEventAnalysisService.js', () => ({
    getOperationalReport: mockGetOperationalReport,
    toCsv: mockToCsv,
}));

const {
    getOperationalReportHandler,
    exportOperationalReportHandler,
} = await import('../controllers/postEventAnalysisController.js');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn();
    return res;
};

const sampleReport = { summary: { alertsIssued: 2 } };

describe('getOperationalReportHandler', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-PAC-01: Returns 200 with generated operational report', async () => {
        mockGetOperationalReport.mockResolvedValue(sampleReport);
        const req = { query: { district: 'Kalutara' } };
        const res = mockRes();

        await getOperationalReportHandler(req, res);

        expect(mockGetOperationalReport).toHaveBeenCalledWith({
            from: undefined,
            to: undefined,
            district: 'Kalutara',
            hazardType: undefined,
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: sampleReport });
    });

    test('TC-PAC-02: Returns 500 when report generation fails', async () => {
        mockGetOperationalReport.mockRejectedValue(new Error('db down'));
        const res = mockRes();
        await getOperationalReportHandler({ query: {} }, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json.mock.calls[0][0].success).toBe(false);
    });
});

describe('exportOperationalReportHandler', () => {
    beforeEach(() => jest.clearAllMocks());

    test('TC-PAC-03: Exports CSV with download headers', async () => {
        mockGetOperationalReport.mockResolvedValue(sampleReport);
        mockToCsv.mockReturnValue('Section,Key,Value');
        const res = mockRes();

        await exportOperationalReportHandler({ query: { format: 'csv' } }, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith('Section,Key,Value');
    });

    test('TC-PAC-04: Exports JSON when format is omitted', async () => {
        mockGetOperationalReport.mockResolvedValue(sampleReport);
        const res = mockRes();

        await exportOperationalReportHandler({ query: {} }, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
        expect(res.json).toHaveBeenCalledWith({ success: true, data: sampleReport });
    });

    test('TC-PAC-05: Returns 500 when export fails', async () => {
        mockGetOperationalReport.mockRejectedValue(new Error('export failed'));
        const res = mockRes();
        await exportOperationalReportHandler({ query: { format: 'csv' } }, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
