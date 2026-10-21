import mongoose from 'mongoose';

const reliefDistributionSchema = new mongoose.Schema(
    {
        resourceType: {
            type: String,
            required: true,
            enum: ['FOOD', 'WATER', 'MEDICINE', 'SHELTER_KITS', 'CLOTHING', 'OTHER'],
        },
        quantity: {
            type: Number,
            required: true,
            min: 0,
        },
        unit: {
            type: String,
            required: true,
            default: 'units',
        },
        district: {
            type: String,
            required: true,
        },
        shelter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmergencyShelter',
            default: null,
        },
        organisation: {
            type: String,
            required: true,
        },
        organisationType: {
            type: String,
            enum: ['GOVERNMENT', 'ARMED_FORCES', 'NGO', 'PRIVATE_DONOR'],
            default: 'GOVERNMENT',
        },
        distributedBy: {
            type: String,
            default: '',
        },
        distributedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        beneficiaryCount: {
            type: Number,
            default: 0,
        },
        notes: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

reliefDistributionSchema.index({ district: 1, distributedAt: -1 });

export default mongoose.model('ReliefDistribution', reliefDistributionSchema);
