import hazardWarningRepository from '../repositories/hazardWarningRepository.js';
import geofencingService from './GeofencingService.js';
import auditLedgerService from './AuditLedgerService.js';
import DisseminationStrategyFactory from '../strategies/disseminationStrategyFactory.js';

class HazardWarningService {
    // Step 2: Calculate recipient estimation for wizard
    async estimateRecipients(targetAreaType, targetLocations) {
        return await geofencingService.calculateEstimatedRecipients(targetAreaType, targetLocations);
    }

    // Step 3 & Safety-Gated Modal: Save warning and issue dissemination
    async issueWarning(warningData) {
        // 1. Calculate recipient coverage
        const estimatedRecipients = await geofencingService.calculateEstimatedRecipients(
            warningData.targetAreaType,
            warningData.targetLocations
        );

        // 2. Persist warning in DB with ISSUED status
        const createdWarning = await hazardWarningRepository.createWarning({
            ...warningData,
            estimatedRecipients,
            status: 'ISSUED',
        });

        // 3. Instantiate channel strategies dynamically (Strategy Pattern)
        const strategies = DisseminationStrategyFactory.getStrategies(createdWarning.selectedChannels);

        // 4. Create initial pending delivery logs
        await hazardWarningRepository.createDeliveryLogs(
            createdWarning._id,
            createdWarning.selectedChannels,
            estimatedRecipients
        );

        // 5. Execute channel broadcasts asynchronously
        this.executeDissemination(createdWarning._id, strategies, createdWarning, estimatedRecipients);

        // 6. Log to Audit Ledger
        await auditLedgerService.logAction('WARNING_ISSUED', createdWarning._id, createdWarning.issuedBy, {
            hazardType: createdWarning.hazardType,
            severity: createdWarning.severity,
            recipients: estimatedRecipients,
        });

        return createdWarning;
    }

    // Helper method to execute strategy sends and update delivery logs
    async executeDissemination(warningId, strategies, warning, totalRecipients) {
        const existingLogs = await hazardWarningRepository.getDeliveryLogsByWarningId(warningId);

        for (const strategy of strategies) {
            const channelName = strategy.getChannelName();
            const log = existingLogs.find((l) => l.channel === channelName);

            try {
                const result = await strategy.send(warning, totalRecipients);
                if (log) {
                    await hazardWarningRepository.updateDeliveryLog(log._id, {
                        successful: result.successful,
                        failed: result.failed,
                        status: result.status,
                    });
                }
            } catch (error) {
                console.error(`[Dissemination Error] Channel ${channelName} failed:`, error.message);
                if (log) {
                    await hazardWarningRepository.updateDeliveryLog(log._id, {
                        status: 'FAILED',
                        failed: totalRecipients,
                    });
                }
            }
        }
    }

    // Escalate warning severity and redistribute
    async escalateWarning(warningId, newSeverity, additionalInfo, officerId) {
        const warning = await hazardWarningRepository.findById(warningId);
        if (!warning) {
            throw new Error('Warning record not found');
        }

        const updatedMessage = `${warning.warningMessage} [ESCALATED]: ${additionalInfo}`;

        // Update status to ESCALATED with optimistic version lock
        const updatedWarning = await hazardWarningRepository.updateStatus(warningId, 'ESCALATED', warning.version);
        if (!updatedWarning) {
            throw new Error('Concurrency conflict: Warning record was modified by another operation.');
        }

        updatedWarning.severity = newSeverity;
        updatedWarning.warningMessage = updatedMessage;
        await updatedWarning.save();

        // Re-execute dissemination across all active channels with high priority
        const strategies = DisseminationStrategyFactory.getStrategies(updatedWarning.selectedChannels);
        this.executeDissemination(updatedWarning._id, strategies, updatedWarning, updatedWarning.estimatedRecipients);

        // Audit log
        await auditLedgerService.logAction('WARNING_ESCALATED', warningId, officerId, {
            previousSeverity: warning.severity,
            newSeverity,
        });

        return updatedWarning;
    }

    // Get real-time delivery status for dashboard
    async getDeliveryStatus(warningId) {
        const warning = await hazardWarningRepository.findById(warningId);
        const logs = await hazardWarningRepository.getDeliveryLogsByWarningId(warningId);
        return { warning, deliveryLogs: logs };
    }

    // Retry failed deliveries for specific channels
    async retryFailedDeliveries(warningId, channelsToRetry = []) {
        const warning = await hazardWarningRepository.findById(warningId);
        const logs = await hazardWarningRepository.getDeliveryLogsByWarningId(warningId);

        const filteredLogs = logs.filter((l) => channelsToRetry.length === 0 || channelsToRetry.includes(l.channel));
        const targetChannels = filteredLogs.map((l) => l.channel);
        const strategies = DisseminationStrategyFactory.getStrategies(targetChannels);

        for (const log of filteredLogs) {
            const strategy = strategies.find((s) => s.getChannelName() === log.channel);
            if (strategy && log.failed > 0) {
                const retryResult = await strategy.send(warning, log.failed);
                await hazardWarningRepository.updateDeliveryLog(
                    log._id,
                    {
                        successful: log.successful + retryResult.successful,
                        failed: retryResult.failed,
                        status: retryResult.failed > 0 ? 'PARTIAL_FAILURE' : 'COMPLETED',
                    },
                    { retryCount: 1 } // Pass $inc fields separately to avoid Mongoose operator conflicts
                );
            }
        }

        await auditLedgerService.logAction('DISSEMINATION_RETRY', warningId, 'DMC Officer', { targetChannels });
        return await this.getDeliveryStatus(warningId);
    }
}

export default new HazardWarningService();