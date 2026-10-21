import IDisseminationChannel from './IDisseminationChannel.js';

class PushNotificationChannelStrategy extends IDisseminationChannel {
    getChannelName() {
        return 'PUSH';
    }

    async send(warning, recipientCount) {
        console.log(`[Push Strategy] Broadcasting Push Notification to ${recipientCount} devices...`);

        // Simulated FCM/Push Gateway Dispatch
        const successRate = 0.90; // 90% success rate
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

export default PushNotificationChannelStrategy;