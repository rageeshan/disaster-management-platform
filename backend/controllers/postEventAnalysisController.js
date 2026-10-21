import { getOperationalReport, toCsv } from '../services/postEventAnalysisService.js';

export const getOperationalReportHandler = async (req, res) => {
    try {
        const { from, to, district, hazardType } = req.query;
        const report = await getOperationalReport({ from, to, district, hazardType });

        return res.status(200).json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('[PostEventAnalysisController] Report Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate operational report.',
            error: error.message,
        });
    }
};

export const exportOperationalReportHandler = async (req, res) => {
    try {
        const { from, to, district, hazardType, format } = req.query;
        const report = await getOperationalReport({ from, to, district, hazardType });
        const exportFormat = String(format || 'json').toLowerCase();

        if (exportFormat === 'csv') {
            const csv = toCsv(report);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="operational-report.csv"');
            return res.status(200).send(csv);
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="operational-report.json"');
        return res.status(200).json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('[PostEventAnalysisController] Export Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to export operational report.',
            error: error.message,
        });
    }
};
