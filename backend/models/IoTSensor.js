import mongoose from 'mongoose';

const iotSensorSchema = new mongoose.Schema(
    {
        sensorCode: {
            type: String,
            required: true,
            unique: true, // e.g., "SENS-KAD-01"
        },
        name: {
            type: String,
            required: true, // e.g., "Kelani River Kaduwela Gauge"
        },
        hazardType: {
            type: String,
            required: true,
            enum: ['FLOOD', 'LANDSLIDE', 'HEAVY_RAIN', 'TSUNAMI', 'EARTHQUAKE'],
        },
        district: {
            type: String,
            required: true,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },
        currentValue: {
            type: Number,
            required: true, // e.g., 4.2
        },
        unit: {
            type: String,
            required: true, // e.g., "m", "mm/hr"
        },
        thresholds: {
            warning: { type: Number, required: true },
            critical: { type: Number, required: true },
        },
        status: {
            type: String,
            enum: ['NORMAL', 'WARNING', 'CRITICAL'],
            default: 'NORMAL',
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

iotSensorSchema.index({ location: '2dsphere' });

export default mongoose.model('IoTSensor', iotSensorSchema);