// seedData.js (run inside your backend directory)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import ReportCluster from './models/ReportCluster.js';
import HazardReport from './models/HazardReport.js';

dotenv.config();

const seedDB = async () => {
    try {
        await connectDB();

        // 1. Create a dummy citizen report
        const dummyReport = await HazardReport.create({
            hazardType: 'FLOOD',
            district: 'Colombo',
            location: {
                type: 'Point',
                coordinates: [79.8612, 6.9271], // Colombo [lng, lat]
            },
            description: 'Severe waterlogging near Kaduwela bridge.',
            status: 'CLUSTERED',
        });

        // 2. Create a pending hazard cluster
        await ReportCluster.create({
            hazardType: 'FLOOD',
            district: 'Colombo',
            centroid: {
                type: 'Point',
                coordinates: [79.8612, 6.9271],
            },
            reports: [dummyReport._id],
            confidenceScore: 8,
            iotVerified: true,
            matchedSensors: [
                {
                    sensorCode: 'SENS-001',
                    name: 'Kelani River Water Level Sensor',
                    currentValue: 4.8,
                    unit: 'm',
                    status: 'WARNING',
                },
            ],
            status: 'PENDING_VERIFICATION',
        });

        console.log('✅ Mock cluster & hazard report inserted into MongoDB!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
};

seedDB();