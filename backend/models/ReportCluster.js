import mongoose from 'mongoose';

const reportClusterSchema = new mongoose.Schema(
    {
        hazardType: {
            type: String,
            required: true,
            enum: ['FLOOD', 'LANDSLIDE', 'HEAVY_RAIN', 'TSUNAMI', 'EARTHQUAKE'],
        },
        district: {
            type: String,
            required: true,
        },
        centroid: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number],
                required: true,
            },
        },
        reports: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'HazardReport',
            },
        ],
        confidenceScore: {
            type: Number,
            default: 1,
        },
        // NEW: IoT Telemetry Integration Fields
        iotVerified: {
            type: Boolean,
            default: false,
        },
        matchedSensors: [
            {
                sensorCode: String,
                name: String,
                currentValue: Number,
                unit: String,
                status: String,
            },
        ],
        status: {
            type: String,
            enum: ['PENDING_VERIFICATION', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'FLAGGED', 'DUPLICATE_MERGED'],
            default: 'PENDING_VERIFICATION',
        },
        lockedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Citizen',
            default: null,
        },
        lockExpiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

reportClusterSchema.index({ centroid: '2dsphere' });

export default mongoose.model('ReportCluster', reportClusterSchema);