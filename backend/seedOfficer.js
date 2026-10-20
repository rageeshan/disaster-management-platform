import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Citizen from './models/Citizen.js';

dotenv.config();

const seedOfficer = async () => {
    try {
        // 1. Connect to MongoDB
        await connectDB();
        console.log('Connected to MongoDB for seeding...');

        const officerNIC = '199512342678';
        const officerPhone = '0771234367';
        const officerEmail = 'officer1.dmc@gmail.com';

        // 2. Prevent duplicate entries by checking NIC, Phone, or Email
        const existingOfficer = await Citizen.findOne({
            $or: [
                { nic: officerNIC },
                { phoneNumber: officerPhone },
                { email: officerEmail.toLowerCase() }
            ],
        });

        if (existingOfficer) {
            console.log('⚠️ DMC Officer account with this NIC, Phone, or Email already exists!');
            process.exit(0);
        }

        // 3. Hash Officer Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Officer@1234', salt);

        // 4. Instantiate DMC Officer Record
        const officer = new Citizen({
            fullName: 'Duty Officer Perera',
            email: officerEmail.toLowerCase(),
            nic: officerNIC,
            phoneNumber: officerPhone,
            password: hashedPassword,
            district: 'Colombo',
            homeAddress: 'DMC Headquarters, Vidya Mawatha, Colombo 07',
            userType: 'COMMUNITY_VOLUNTEER',
            role: 'DMC_OFFICER',
        });

        // 5. Save to MongoDB
        await officer.save();

        console.log('===================================');
        console.log('✅ DMC OFFICER CREATED SUCCESSFULLY');
        console.log('===================================');
        console.log(`Email            : ${officerEmail}`);
        console.log(`NIC Identifier   : ${officerNIC}`);
        console.log(`Phone Identifier : ${officerPhone}`);
        console.log(`Password         : Officer@1234`);
        console.log(`Role             : DMC_OFFICER`);
        console.log('===================================');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding DMC Officer:', error.message);
        process.exit(1);
    }
};

seedOfficer();