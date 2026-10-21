import express from 'express';
import { submitReport } from '../controllers/reportController.js';
import {
    getPendingClusters,
    lockCluster,
    verifyCluster,
} from '../controllers/verificationController.js';
import { upload } from '../config/cloudinary.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';
import { getActiveHazards, getNearbyHazards, getActiveReports } from '../controllers/mapController.js';
import { getMyReports } from '../controllers/reportController.js';

const router = express.Router();

// Optional Auth Middleware: Decodes JWT if token is provided, but allows request if no token is sent (Guest)
const optionalAuth = (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Attaches logged-in citizen ID
        } catch (error) {
            // Invalid token, treat as guest
        }
    }
    next();
};

// Ground Hazard Submission Route (Works for both Logged-In Citizens & Guests)
router.post('/submit', optionalAuth, upload.array('photos', 5), submitReport);
router.post('/submit-detailed', optionalAuth, upload.array('photos', 5), submitReport);

// DMC Officer Verification Queue Routes
router.get(
    '/verification/clusters',
    protect,
    authorizeRoles('DMC_OFFICER', 'ADMIN'),
    getPendingClusters
);

router.post(
    '/verification/clusters/:id/lock',
    protect,
    authorizeRoles('DMC_OFFICER', 'ADMIN'),
    lockCluster
);

router.post(
    '/verification/clusters/:id/verify',
    protect,
    authorizeRoles('DMC_OFFICER', 'ADMIN'),
    verifyCluster
);

// Public GeoJSON Map & Feed Endpoints
router.get('/active', getActiveReports);
router.get('/active-hazards', getActiveHazards);
router.get('/nearby', getNearbyHazards);
router.get('/my-reports', protect, getMyReports);

export default router;