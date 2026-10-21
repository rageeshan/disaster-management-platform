import hazardWarningService from '../services/HazardWarningService.js';

class HazardWarningController {
    // POST /api/warnings/estimate-recipients
    // Step 2 Wizard action: Calculate estimated citizen coverage
    async estimateRecipients(req, res) {
        try {
            const { targetAreaType, targetLocations } = req.body;

            if (!targetAreaType || !targetLocations || targetLocations.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Target area type and at least one target location are required.',
                });
            }

            const estimatedRecipients = await hazardWarningService.estimateRecipients(
                targetAreaType,
                targetLocations
            );

            return res.status(200).json({
                success: true,
                data: {
                    targetAreaType,
                    targetLocations,
                    estimatedRecipients,
                },
            });
        } catch (error) {
            console.error('[HazardWarningController] Estimate Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to calculate recipient estimation.',
                error: error.message,
            });
        }
    }

    // POST /api/warnings/disseminate
    // Step 3 Wizard & Safety-Gated Modal action: Save and broadcast official warning
    async issueWarning(req, res) {
        try {
            const { hazardType, severity, warningMessage, targetAreaType, targetLocations, selectedChannels, issuedBy } = req.body;

            // Input Validation (Error Prevention / Safety Gating)
            if (!hazardType || !severity || !warningMessage || !targetAreaType || !targetLocations || !selectedChannels) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required warning parameters. Complete all steps of the creation wizard.',
                });
            }

            const warning = await hazardWarningService.issueWarning({
                hazardType,
                severity,
                warningMessage,
                targetAreaType,
                targetLocations,
                selectedChannels,
                issuedBy: issuedBy || 'DMC Officer',
            });

            return res.status(201).json({
                success: true,
                message: 'Official hazard warning created and dissemination initiated.',
                data: warning,
            });
        } catch (error) {
            console.error('[HazardWarningController] Issuance Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to issue hazard warning.',
                error: error.message,
            });
        }
    }
}

export default new HazardWarningController();