import dotenv from 'dotenv';
import connectDB from './config/db.js';
import HazardWarning from './models/HazardWarning.js';
import DeliveryLog from './models/DeliveryLog.js';
import EmergencyShelter from './models/EmergencyShelter.js';
import ShelterOccupancyLog from './models/ShelterOccupancyLog.js';
import ReliefDistribution from './models/ReliefDistribution.js';

dotenv.config();

const daysAgo = (days, hours = 8) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hours, 0, 0, 0);
    return date;
};

const seedOperationalData = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB for operational report seeding...');

        await ShelterOccupancyLog.deleteMany({});
        await ReliefDistribution.deleteMany({});
        await EmergencyShelter.deleteMany({});

        const shelters = await EmergencyShelter.insertMany([
            {
                name: 'Colombo Municipal Relief Centre',
                district: 'Colombo',
                address: 'Town Hall Grounds, Colombo 07',
                capacity: 450,
                managingOrganisation: 'Colombo Municipal Council',
                organisationType: 'GOVERNMENT',
                status: 'OPEN',
            },
            {
                name: 'Kalutara Central College Shelter',
                district: 'Kalutara',
                address: 'Galle Road, Kalutara',
                capacity: 320,
                managingOrganisation: 'Ministry of Education / DMC',
                organisationType: 'GOVERNMENT',
                status: 'OPEN',
            },
            {
                name: 'Galle Army Camp Overflow Camp',
                district: 'Galle',
                address: 'Rumassala Road, Galle',
                capacity: 280,
                managingOrganisation: 'Sri Lanka Army',
                organisationType: 'ARMED_FORCES',
                status: 'OPEN',
            },
            {
                name: 'Ratnapura NGO Transit Camp',
                district: 'Ratnapura',
                address: 'Batugedara Grounds, Ratnapura',
                capacity: 200,
                managingOrganisation: 'Sri Lanka Red Cross',
                organisationType: 'NGO',
                status: 'OPEN',
            },
        ]);

        const occupancyRows = [];
        const occupancyPlan = [
            [90, 140, 210, 260, 240, 180, 120],
            [60, 150, 240, 300, 280, 190, 110],
            [40, 90, 160, 200, 190, 140, 80],
            [30, 80, 130, 170, 150, 100, 60],
        ];

        shelters.forEach((shelter, shelterIndex) => {
            occupancyPlan[shelterIndex].forEach((occupancy, dayOffset) => {
                occupancyRows.push({
                    shelter: shelter._id,
                    occupancy,
                    recordedAt: daysAgo(6 - dayOffset, 18),
                });
            });
        });
        await ShelterOccupancyLog.insertMany(occupancyRows);

        await ReliefDistribution.insertMany([
            { resourceType: 'FOOD', quantity: 2400, unit: 'packs', district: 'Kalutara', organisation: 'DMC Logistics', organisationType: 'GOVERNMENT', distributedAt: daysAgo(5), notes: 'Cooked meal packs for first 48 hours' },
            { resourceType: 'WATER', quantity: 8500, unit: 'litres', district: 'Kalutara', organisation: 'National Water Supply', organisationType: 'GOVERNMENT', distributedAt: daysAgo(5, 12) },
            { resourceType: 'MEDICINE', quantity: 420, unit: 'kits', district: 'Kalutara', organisation: 'Ministry of Health', organisationType: 'GOVERNMENT', distributedAt: daysAgo(4) },
            { resourceType: 'SHELTER_KITS', quantity: 180, unit: 'kits', district: 'Kalutara', organisation: 'Sri Lanka Red Cross', organisationType: 'NGO', distributedAt: daysAgo(4, 14) },
            { resourceType: 'FOOD', quantity: 1600, unit: 'packs', district: 'Colombo', organisation: 'Private Donor Consortium', organisationType: 'PRIVATE_DONOR', distributedAt: daysAgo(3) },
            { resourceType: 'WATER', quantity: 5000, unit: 'litres', district: 'Colombo', organisation: 'DMC Logistics', organisationType: 'GOVERNMENT', distributedAt: daysAgo(3, 10) },
            { resourceType: 'FOOD', quantity: 900, unit: 'packs', district: 'Galle', organisation: 'Sri Lanka Army', organisationType: 'ARMED_FORCES', distributedAt: daysAgo(2) },
            { resourceType: 'MEDICINE', quantity: 210, unit: 'kits', district: 'Ratnapura', organisation: 'Sarvodaya', organisationType: 'NGO', distributedAt: daysAgo(2, 16) },
            { resourceType: 'WATER', quantity: 3200, unit: 'litres', district: 'Ratnapura', organisation: 'DMC Logistics', organisationType: 'GOVERNMENT', distributedAt: daysAgo(1) },
        ]);

        const existingWarning = await HazardWarning.findOne({ warningMessage: /Kalu River basin/i });
        if (!existingWarning) {
            const warning = await HazardWarning.create({
                hazardType: 'Flood',
                severity: 'High',
                warningMessage: 'Kalu River basin flood warning: move immediately to designated high-ground shelters.',
                targetAreaType: 'River Basin',
                targetLocations: ['Kalu River Basin', 'Kalutara District', 'Ratnapura District'],
                estimatedRecipients: 18500,
                status: 'ISSUED',
                selectedChannels: ['SMS', 'PUSH', 'AUDIBLE'],
                issuedBy: 'Duty Officer Perera',
            });
            warning.createdAt = daysAgo(6, 7);
            await warning.save();

            await DeliveryLog.create([
                { warningId: warning._id, channel: 'SMS', totalTargeted: 18500, successful: 16120, failed: 2380, status: 'PARTIAL_FAILURE', retryCount: 1 },
                { warningId: warning._id, channel: 'PUSH', totalTargeted: 9200, successful: 8740, failed: 460, status: 'COMPLETED', retryCount: 0 },
                { warningId: warning._id, channel: 'AUDIBLE', totalTargeted: 40, successful: 37, failed: 3, status: 'COMPLETED', retryCount: 0 },
            ]);
        }

        console.log('===================================');
        console.log('OPERATIONAL REPORT DATA SEEDED');
        console.log('===================================');
        console.log(`Shelters            : ${shelters.length}`);
        console.log(`Occupancy snapshots : ${occupancyRows.length}`);
        console.log('Relief distributions: 9');
        console.log('===================================');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding operational data:', error.message);
        process.exit(1);
    }
};

seedOperationalData();
