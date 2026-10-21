import IDisseminationChannel from './IDisseminationChannel.js';

class SMSChannelStrategy extends IDisseminationChannel {
    getChannelName() {
        return 'SMS';
    }

    async send(warning, recipientCount) {
        console.log(`[SMS Strategy] Sending SMS to ${recipientCount} recipients...`);

        // Simulated SMS Gateway Dispatch
        const successRate = 0.85; // 85% success rate simulation
        const successful = Math.floor(recipientCount * successRate);
        const failed = recipientCount - successful;

        return {
            channel: this.getChannelName(),
            totalTargeted: recipientCount,
            successful,
            failed,
            status: failed > 0 ? 'PARTIAL_FAILURE' : 'COMPLETED',
        };
    }
}

export default SMSChannelStrategy;