import SMSChannelStrategy from './SMSChannelStrategy.js';
import PushNotificationChannelStrategy from './PushNotificationChannelStrategy.js';
import AudibleAlertChannelStrategy from './AudibleAlertChannelStrategy.js';

class DisseminationStrategyFactory {
    static getStrategies(channels = []) {
        const strategies = [];

        if (channels.includes('SMS')) {
            strategies.push(new SMSChannelStrategy());
        }
        if (channels.includes('PUSH')) {
            strategies.push(new PushNotificationChannelStrategy());
        }
        if (channels.includes('AUDIBLE')) {
            strategies.push(new AudibleAlertChannelStrategy());
        }

        return strategies;
    }
}

export default DisseminationStrategyFactory;