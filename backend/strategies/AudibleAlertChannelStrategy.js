import IDisseminationChannel from './IDisseminationChannel.js';

class AudibleAlertChannelStrategy extends IDisseminationChannel {
    getChannelName() {
        return 'AUDIBLE';
    }

    async send(warning, recipientCount) {
        console.log(`[Audible Strategy] Triggering high-priority audible alert sirens...`);

        // Simulated Audible Siren Activation
        return {
            channel: this.getChannelName(),
            totalTargeted: recipientCount,
            successful: recipientCount,
            failed: 0,
            status: 'COMPLETED',
        };
    }
}

export default AudibleAlertChannelStrategy;