import hazardWarningService from '../services/HazardWarningService.js';

class DeliveryMonitoringController {
    // GET /api/warnings/:id/delivery-status
    // Delivery Dashboard: Fetch real-time delivery logs per channel
    async getDeliveryStatus(req, res) {
        try {
            const { id } = req.params;
            const statusData = await hazardWarningService.getDeliveryStatus(id);

            if (!statusData.warning) {
                return res.status(404).json({
                    success: false,
                    message: 'Hazard warning record not found.',
                });
            }

            return res.status(200).json({
                success: true,
                data: statusData,
            });
        } catch (error) {
            console.error('[DeliveryMonitoringController] Fetch Status Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve delivery status.',
                error: error.message,
            });
        }
    }

    // POST /api/warnings/:id/retry-failed
    // Partial Failure Modal / Dashboard action: Retry failed channels
    async retryFailedDeliveries(req, res) {
        try {
            const { id } = req.params;
            const { channelsToRetry } = req.body; // e.g., ["SMS", "PUSH"]

            const updatedStatus = await hazardWarningService.retryFailedDeliveries(id, channelsToRetry || []);

            return res.status(200).json({
                success: true,
                message: 'Re-dissemination attempt completed.',
                data: updatedStatus,
            });
        } catch (error) {
            console.error('[DeliveryMonitoringController] Retry Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to execute delivery retry.',
                error: error.message,
            });
        }
    }

    // POST /api/warnings/:id/escalate
    // Escalate Modal action: Update severity and redistribute
    async escalateWarning(req, res) {
        try {
            const { id } = req.params;
            const { newSeverity, additionalInfo, officerId } = req.body;

            if (!newSeverity) {
                return res.status(400).json({
                    success: false,
                    message: 'New severity level is required for warning escalation.',
                });
            }

            const escalatedWarning = await hazardWarningService.escalateWarning(
                id,
                newSeverity,
                additionalInfo || 'Severity level escalated by DMC Command.',
                officerId || 'DMC Officer'
            );

            return res.status(200).json({
                success: true,
                message: 'Warning successfully escalated and redistributed across channels.',
                data: escalatedWarning,
            });
        } catch (error) {
            console.error('[DeliveryMonitoringController] Escalation Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to escalate warning.',
                error: error.message,
            });
        }
    }
}

export default new DeliveryMonitoringController();