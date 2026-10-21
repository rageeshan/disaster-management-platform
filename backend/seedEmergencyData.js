/**
 * seedEmergencyData.js
 * Seeds rescue teams, emergency shelters, and relief distributions for demo.
 * Run: node seedEmergencyData.js
 */

import dotenv from 'dotenv';
import connectDB from './config/db.js';
import RescueTeam from './models/RescueTeam.js';
import EmergencyShelter from './models/EmergencyShelter.js';
import ReliefDistribution from './models/ReliefDistribution.js';

dotenv.config();

const seedEmergencyData = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB — seeding emergency response data...');

        // Clear existing data
        await RescueTeam.deleteMany({});
        await EmergencyShelter.deleteMany({});
        await ReliefDistribution.deleteMany({});

        // ── Rescue Teams ──────────────────────────────────────────
        const teams = await RescueTeam.insertMany([
            {
                name: 'Colombo Flood Response Unit Alpha',
                teamCode: 'CFR-ALPHA',
                organisation: 'Sri Lanka Army',
                organisationType: 'ARMED_FORCES',
                district: 'Colombo',
                memberCount: 12,
                status: 'ON_SCENE',
                currentMission: 'Evacuation operations at Kelani riverbank settlement',
                contactNumber: '+94 11 234 5678',
                capabilities: ['WATER_RESCUE', 'EVACUATION', 'MEDICAL'],
                dispatchedBy: 'Duty Officer Perera',
                lastDispatchedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
            },
            {
                name: 'Kalutara Rapid Response Team',
                teamCode: 'KRT-01',
                organisation: 'National Disaster Relief Services Centre',
                organisationType: 'GOVERNMENT',
                district: 'Kalutara',
                memberCount: 8,
                status: 'DEPLOYED',
                currentMission: 'Search and rescue along Kalu River basin',
                contactNumber: '+94 34 222 1100',
                capabilities: ['SEARCH', 'WATER_RESCUE', 'COMMUNICATIONS'],
                dispatchedBy: 'DMC Officer Silva',
                lastDispatchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            },
            {
                name: 'Ratnapura Medical Aid Team',
                teamCode: 'RMA-01',
                organisation: 'Ministry of Health',
                organisationType: 'GOVERNMENT',
                district: 'Ratnapura',
                memberCount: 6,
                status: 'ON_ROUTE',
                currentMission: 'Medical aid delivery to Ratnapura Transit Camp',
                contactNumber: '+94 45 222 3344',
                capabilities: ['MEDICAL', 'LOGISTICS'],
                dispatchedBy: 'DMC Officer Wijeratne',
                lastDispatchedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            },
            {
                name: 'Galle Police Emergency Response',
                teamCode: 'GPE-01',
                organisation: 'Sri Lanka Police',
                organisationType: 'POLICE',
                district: 'Galle',
                memberCount: 10,
                status: 'STANDBY',
                currentMission: '',
                contactNumber: '+94 91 222 5566',
                capabilities: ['EVACUATION', 'COMMUNICATIONS'],
            },
            {
                name: 'Red Cross Volunteer Team Kandy',
                teamCode: 'RCV-KDY',
                organisation: 'Sri Lanka Red Cross Society',
                organisationType: 'NGO',
                district: 'Kandy',
                memberCount: 15,
                status: 'STANDBY',
                currentMission: '',
                contactNumber: '+94 81 222 7788',
                capabilities: ['MEDICAL', 'LOGISTICS', 'EVACUATION'],
            },
            {
                name: 'Trincomalee Coast Guard Unit',
                teamCode: 'TCG-01',
                organisation: 'Sri Lanka Navy',
                organisationType: 'ARMED_FORCES',
                district: 'Trincomalee',
                memberCount: 9,
                status: 'RETURNING',
                currentMission: 'Returning from coastal rescue mission',
                contactNumber: '+94 26 222 9900',
                capabilities: ['WATER_RESCUE', 'SEARCH'],
            },
        ]);

        // ── Emergency Shelters ────────────────────────────────────
        const shelters = await EmergencyShelter.insertMany([
            {
                name: 'Colombo Municipal Relief Centre',
                district: 'Colombo',
                address: 'Town Hall Grounds, Colombo 07',
                capacity: 450,
                currentOccupancy: 312,
                managingOrganisation: 'Colombo Municipal Council',
                organisationType: 'GOVERNMENT',
                status: 'OPEN',
                contactPerson: 'Mr. Jayaweera',
                contactNumber: '+94 11 269 4000',
                facilities: ['FOOD', 'WATER', 'MEDICAL', 'SANITATION', 'POWER_BACKUP'],
            },
            {
                name: 'Kalutara Central College Shelter',
                district: 'Kalutara',
                address: 'Galle Road, Kalutara',
                capacity: 320,
                currentOccupancy: 298,
                managingOrganisation: 'Ministry of Education / DMC',
                organisationType: 'GOVERNMENT',
                status: 'OPEN',
                contactPerson: 'Ms. Abesinghe',
                contactNumber: '+94 34 222 2233',
                facilities: ['FOOD', 'WATER', 'SANITATION'],
            },
            {
                name: 'Galle Army Camp Overflow Camp',
                district: 'Galle',
                address: 'Rumassala Road, Galle',
                capacity: 280,
                currentOccupancy: 280,
                managingOrganisation: 'Sri Lanka Army',
                organisationType: 'ARMED_FORCES',
                status: 'FULL',
                contactPerson: 'Maj. Fernando',
                contactNumber: '+94 91 234 5001',
                facilities: ['FOOD', 'WATER', 'MEDICAL', 'SANITATION', 'POWER_BACKUP'],
            },
            {
                name: 'Ratnapura NGO Transit Camp',
                district: 'Ratnapura',
                address: 'Batugedara Grounds, Ratnapura',
                capacity: 200,
                currentOccupancy: 145,
                managingOrganisation: 'Sri Lanka Red Cross',
                organisationType: 'NGO',
                status: 'OPEN',
                contactPerson: 'Ms. Gunawardena',
                contactNumber: '+94 45 222 3456',
                facilities: ['FOOD', 'WATER', 'MEDICAL', 'SANITATION'],
            },
            {
                name: 'Kandy Temple Community Hall',
                district: 'Kandy',
                address: 'Dalada Veediya, Kandy',
                capacity: 150,
                currentOccupancy: 42,
                managingOrganisation: 'Local Government / DMC',
                organisationType: 'GOVERNMENT',
                status: 'OPEN',
                contactPerson: 'Mr. Dissanayake',
                contactNumber: '+94 81 222 0099',
                facilities: ['FOOD', 'WATER', 'SANITATION'],
            },
        ]);

        // ── Relief Distributions ─────────────────────────────────
        const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        await ReliefDistribution.insertMany([
            { resourceType: 'FOOD', quantity: 2400, unit: 'packs', district: 'Kalutara', shelter: shelters[1]._id, organisation: 'DMC Logistics', organisationType: 'GOVERNMENT', distributedBy: 'Officer Perera', distributedAt: daysAgo(2), beneficiaryCount: 298, notes: 'Cooked meal packs' },
            { resourceType: 'WATER', quantity: 8500, unit: 'litres', district: 'Kalutara', shelter: shelters[1]._id, organisation: 'National Water Supply Board', organisationType: 'GOVERNMENT', distributedBy: 'Officer Perera', distributedAt: daysAgo(2), beneficiaryCount: 298 },
            { resourceType: 'MEDICINE', quantity: 420, unit: 'kits', district: 'Kalutara', organisation: 'Ministry of Health', organisationType: 'GOVERNMENT', distributedBy: 'Officer Silva', distributedAt: daysAgo(1), beneficiaryCount: 150 },
            { resourceType: 'SHELTER_KITS', quantity: 180, unit: 'kits', district: 'Kalutara', organisation: 'Sri Lanka Red Cross', organisationType: 'NGO', distributedBy: 'Volunteer Coord.', distributedAt: daysAgo(1), beneficiaryCount: 180 },
            { resourceType: 'FOOD', quantity: 1600, unit: 'packs', district: 'Colombo', shelter: shelters[0]._id, organisation: 'Private Donor Consortium', organisationType: 'PRIVATE_DONOR', distributedBy: 'Donor Rep.', distributedAt: daysAgo(1), beneficiaryCount: 312 },
            { resourceType: 'WATER', quantity: 5000, unit: 'litres', district: 'Colombo', organisation: 'DMC Logistics', organisationType: 'GOVERNMENT', distributedBy: 'Officer Wijeratne', distributedAt: daysAgo(0), beneficiaryCount: 312 },
            { resourceType: 'FOOD', quantity: 900, unit: 'packs', district: 'Galle', shelter: shelters[2]._id, organisation: 'Sri Lanka Army', organisationType: 'ARMED_FORCES', distributedBy: 'Maj. Fernando', distributedAt: daysAgo(0), beneficiaryCount: 280 },
            { resourceType: 'MEDICINE', quantity: 210, unit: 'kits', district: 'Ratnapura', shelter: shelters[3]._id, organisation: 'Sarvodaya', organisationType: 'NGO', distributedBy: 'Volunteer Coord.', distributedAt: daysAgo(0), beneficiaryCount: 145 },
            { resourceType: 'CLOTHING', quantity: 500, unit: 'sets', district: 'Ratnapura', organisation: 'Private Donor', organisationType: 'PRIVATE_DONOR', distributedBy: 'Volunteer', distributedAt: daysAgo(0), beneficiaryCount: 145 },
        ]);

        console.log('=============================================');
        console.log('EMERGENCY RESPONSE SEED DATA COMPLETE');
        console.log('=============================================');
        console.log(`Rescue teams : ${teams.length}`);
        console.log(`Shelters     : ${shelters.length}`);
        console.log(`Distributions: 9`);
        console.log('=============================================');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error.message);
        process.exit(1);
    }
};

seedEmergencyData();
