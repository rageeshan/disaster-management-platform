import mongoose from 'mongoose';

const hazardWarningSchema = new mongoose.Schema(
    {
        hazardType: {
            type: String,
            required: [true, 'Hazard type is required'],
            enum: ['Flood', 'Tsunami', 'Landslide', 'Cyclone', 'Extreme Weather'],
        },
        severity: {
            type: String,
            required: [true, 'Severity level is required'],
            enum: ['Low', 'Medium', 'High', 'Critical'], //[cite: 10]
        },
        warningMessage: {
            type: String,
            required: [true, 'Warning message is required'],
            maxLength: 500, //[cite: 14]
        },
        targetAreaType: {
            type: String,
            required: [true, 'Target area type is required'],
            enum: ['District', 'River Basin', 'Custom Geofence'], //[cite: 11]
        },
        targetLocations: [
            {
                type: String, // e.g., "Kalutara District", "Kalu River Basin"
                required: true,
            },
        ],
        estimatedRecipients: {
            type: Number,
            default: 0, //[cite: 11]
        },
        status: {
            type: String,
            enum: ['DRAFT', 'ISSUED', 'ESCALATED', 'EXPIRED'], //[cite: 2, 22]
            default: 'DRAFT',
        },
        selectedChannels: [
            {
                type: String,
                enum: ['SMS', 'PUSH', 'AUDIBLE'], //[cite: 2, 11]
            },
        ],
        issuedBy: {
            type: String,
            default: 'DMC Officer', //[cite: 5]
        },
        version: {
            type: Number,
            default: 1, // Optimistic concurrency check[cite: 2]
        },
    },
    {
        timestamps: true,
    }
);

const HazardWarning = mongoose.model('HazardWarning', hazardWarningSchema);
export default HazardWarning;