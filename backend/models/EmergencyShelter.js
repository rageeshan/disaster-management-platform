import mongoose from 'mongoose';

const emergencyShelterSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Shelter name is required'],
            trim: true,
        },
        district: {
            type: String,
            required: [true, 'District is required'],
        },
        address: {
            type: String,
            required: [true, 'Address is required'],
        },
        capacity: {
            type: Number,
            required: [true, 'Capacity is required'],
            min: 1,
        },
        currentOccupancy: {
            type: Number,
            default: 0,
            min: 0,
        },
        managingOrganisation: {
            type: String,
            required: true,
            default: 'Disaster Management Centre',
        },
        organisationType: {
            type: String,
            enum: ['GOVERNMENT', 'ARMED_FORCES', 'NGO', 'PRIVATE_DONOR'],
            default: 'GOVERNMENT',
        },
        status: {
            type: String,
            enum: ['OPEN', 'FULL', 'CLOSED'],
            default: 'OPEN',
        },
        contactPerson: {
            type: String,
            default: '',
        },
        contactNumber: {
            type: String,
            default: '',
        },
        facilities: [
            {
                type: String,
                enum: ['MEDICAL', 'FOOD', 'WATER', 'SANITATION', 'POWER_BACKUP', 'WIFI'],
            },
        ],
        notes: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

emergencyShelterSchema.index({ district: 1, status: 1 });

export default mongoose.model('EmergencyShelter', emergencyShelterSchema);
