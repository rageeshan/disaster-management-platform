import mongoose from 'mongoose';

const deliveryLogSchema = new mongoose.Schema(
    {
        warningId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HazardWarning',
            required: true,
        },
        channel: {
            type: String,
            enum: ['SMS', 'PUSH', 'AUDIBLE'], //[cite: 2]
            required: true,
        },
        totalTargeted: {
            type: Number,
            required: true,
            default: 0,
        },
        successful: {
            type: Number,
            default: 0,
        },
        failed: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'PARTIAL_FAILURE', 'FAILED'], //[cite: 4, 12]
            default: 'PENDING',
        },
        retryCount: {
            type: Number,
            default: 0, //[cite: 3]
        },
    },
    {
        timestamps: true,
    }
);

const DeliveryLog = mongoose.model('DeliveryLog', deliveryLogSchema);
export default DeliveryLog;