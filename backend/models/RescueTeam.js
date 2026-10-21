import mongoose from 'mongoose';

const rescueTeamSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Team name is required'],
            trim: true,
        },
        teamCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        organisation: {
            type: String,
            required: true,
            default: 'DMC',
        },
        organisationType: {
            type: String,
            enum: ['GOVERNMENT', 'ARMED_FORCES', 'NGO', 'POLICE', 'PRIVATE'],
            default: 'GOVERNMENT',
        },
        district: {
            type: String,
            required: [true, 'Base district is required'],
        },
        memberCount: {
            type: Number,
            default: 1,
            min: 1,
        },
        status: {
            type: String,
            enum: ['STANDBY', 'DEPLOYED', 'ON_ROUTE', 'ON_SCENE', 'RETURNING', 'UNAVAILABLE'],
            default: 'STANDBY',
        },
        currentMission: {
            type: String,
            default: '',
        },
        contactNumber: {
            type: String,
            default: '',
        },
        capabilities: [
            {
                type: String,
                enum: ['WATER_RESCUE', 'MEDICAL', 'SEARCH', 'EVACUATION', 'LOGISTICS', 'COMMUNICATIONS'],
            },
        ],
        lastDispatchedAt: {
            type: Date,
            default: null,
        },
        dispatchedBy: {
            type: String,
            default: '',
        },
        notes: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

rescueTeamSchema.index({ district: 1, status: 1 });

export default mongoose.model('RescueTeam', rescueTeamSchema);
