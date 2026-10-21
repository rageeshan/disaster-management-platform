import HazardWarning from '../models/HazardWarning.js';
import DeliveryLog from '../models/DeliveryLog.js';

class HazardWarningRepository {
    // Create a new warning draft or issued record
    async createWarning(warningData) {
        const warning = new HazardWarning(warningData);
        return await warning.save();
    }

    // Find warning by ID
    async findById(warningId) {
        return await HazardWarning.findById(warningId);
    }

    // Update warning status and optimistic version increment
    async updateStatus(warningId, newStatus, currentVersion) {
        return await HazardWarning.findOneAndUpdate(
            { _id: warningId, version: currentVersion },
            {
                $set: { status: newStatus },
                $inc: { version: 1 }
            },
            { returnDocument: 'after' }
        );
    }

    // Create initial delivery logs for selected channels
    async createDeliveryLogs(warningId, selectedChannels, totalTargeted) {
        const logs = selectedChannels.map((channel) => ({
            warningId,
            channel,
            totalTargeted,
            successful: 0,
            failed: 0,
            status: 'PENDING',
        }));

        return await DeliveryLog.insertMany(logs);
    }

    // Get all delivery logs for a specific warning
    async getDeliveryLogsByWarningId(warningId) {
        return await DeliveryLog.find({ warningId });
    }

    // Update a specific channel delivery log
    async updateDeliveryLog(logId, setFields = {}, incFields = {}) {
        const updateQuery = {};

        if (Object.keys(setFields).length > 0) {
            updateQuery.$set = setFields;
        }

        if (Object.keys(incFields).length > 0) {
            updateQuery.$inc = incFields;
        }

        return await DeliveryLog.findByIdAndUpdate(
            logId,
            updateQuery,
            { returnDocument: 'after' }
        );
    }
}

export default new HazardWarningRepository();