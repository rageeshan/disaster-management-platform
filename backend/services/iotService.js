import IoTSensor from '../models/IoTSensor.js';

/**
 * Cross-references report coordinates against IoT telemetry within 2000 meters
 * @param {Object} location - GeoJSON Point { type: 'Point', coordinates: [lon, lat] }
 * @param {String} hazardType - Hazard type string
 * @param {Number} maxDistanceMeters - Search radius in meters (default 2000m)
 */
export const evaluateNearbySensors = async (location, hazardType, maxDistanceMeters = 2000) => {
    try {
        const activeSensors = await IoTSensor.find({
            hazardType,
            status: { $in: ['WARNING', 'CRITICAL'] },
            location: {
                $near: {
                    $geometry: location,
                    $maxDistance: maxDistanceMeters,
                },
            },
        });

        let totalBoost = 0;
        const matchedSensors = activeSensors.map((sensor) => {
            // Boost +5 for CRITICAL threshold breach, +3 for WARNING
            const boost = sensor.status === 'CRITICAL' ? 5 : 3;
            totalBoost += boost;

            return {
                sensorCode: sensor.sensorCode,
                name: sensor.name,
                currentValue: sensor.currentValue,
                unit: sensor.unit,
                status: sensor.status,
            };
        });

        return {
            iotVerified: matchedSensors.length > 0,
            matchedSensors,
            totalBoost,
        };
    } catch (error) {
        console.error('⚠️ IoT Service Evaluation Error:', error.message);
        return { iotVerified: false, matchedSensors: [], totalBoost: 0 };
    }
};