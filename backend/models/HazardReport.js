import mongoose from 'mongoose';

const hazardReportSchema = new mongoose.Schema(
    {
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Citizen',
            default: null, // Null for anonymous/guest reports
        },
        isGuestReport: {
            type: Boolean,
            default: false,
        },
        hazardType: {
            type: String,
            required: [true, 'Hazard type is required'],
            enum: ['FLOOD', 'LANDSLIDE', 'HEAVY_RAIN', 'TSUNAMI', 'EARTHQUAKE'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
        },
        district: {
            type: String,
            required: [true, 'District is required'],
        },
        // GeoJSON Point format for MongoDB 2DSphere spatial indexing
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // Format: [longitude, latitude]
                required: [true, 'Coordinates [longitude, latitude] are required'],
            },
        },
        photoUrls: [
            {
                type: String, // Stores Cloudinary image URLs
            },
        ],
        status: {
            type: String,
            enum: ['PENDING', 'CLUSTERED', 'REJECTED', 'FLAGGED', 'DUPLICATE_MERGED'],
            default: 'PENDING',
        },
    },
    { timestamps: true }
);

// Enable 2DSphere index for geospatial proximity searches
hazardReportSchema.index({ location: '2dsphere' });

export default mongoose.model('HazardReport', hazardReportSchema);