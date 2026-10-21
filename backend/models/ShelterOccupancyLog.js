import mongoose from 'mongoose';

const shelterOccupancyLogSchema = new mongoose.Schema(
    {
        shelter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmergencyShelter',
            required: true,
        },
        occupancy: {
            type: Number,
            required: true,
            min: 0,
        },
        recordedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    { timestamps: true }
);

shelterOccupancyLogSchema.index({ shelter: 1, recordedAt: 1 });

export default mongoose.model('ShelterOccupancyLog', shelterOccupancyLogSchema);
