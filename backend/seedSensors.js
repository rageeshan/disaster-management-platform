import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import IoTSensor from './models/IoTSensor.js';

dotenv.config();

const seedSensors = async () => {
    try {
        await connectDB();
        await IoTSensor.deleteMany(); // Clear existing sensors

        await IoTSensor.create([
            {
                sensorCode: 'SENS-KAD-01',
                name: 'Kaduwela Kelani River Gauge',
                hazardType: 'FLOOD',
                district: 'Colombo',
                location: {
                    type: 'Point',
                    coordinates: [79.9830, 6.9319], // Same location as Kaduwela test reports
                },
                currentValue: 4.2,
                unit: 'm',
                thresholds: { warning: 3.0, critical: 3.8 },
                status: 'CRITICAL', // Exceeds critical threshold (4.2m > 3.8m)
            },
        ]);

        console.log('✅ Mock IoT Sensors Seeded Successfully!');
        process.exit();
    } catch (error) {
        console.error('❌ Seeding Error:', error);
        process.exit(1);
    }
};

seedSensors();