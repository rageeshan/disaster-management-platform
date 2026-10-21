import express from 'express';
import { verifyCluster, rejectCluster } from '../controllers/verificationController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js'; // RBAC middleware

const router = express.Router();

// Verification & Rejection Actions (DMC Officer & Admin only)
router.post('/clusters/:id/verify', protect, restrictTo('DMC_OFFICER', 'ADMIN'), verifyCluster);
router.post('/clusters/:id/reject', protect, restrictTo('DMC_OFFICER', 'ADMIN'), rejectCluster);

export default router;