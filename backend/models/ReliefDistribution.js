import mongoose from 'mongoose';

const reliefDistributionSchema = new mongoose.Schema(
    {
        resourceType: {
            type: String,
            required: true,
            enum: ['FOOD', 'WATER', 'MEDICINE', 'SHELTER_KITS', 'OTHER'],
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
        organisation: {
            type: String,
            required: true,
        },
        organisationType: {
            type: String,
            enum: ['GOVERNMENT', 'ARMED_FORCES', 'NGO', 'PRIVATE_DONOR'],
            default: 'GOVERNMENT',
        },
        distributedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        notes: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

reliefDistributionSchema.index({ district: 1, distributedAt: 1 });

export default mongoose.model('ReliefDistribution', reliefDistributionSchema);
