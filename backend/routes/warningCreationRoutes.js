import express from 'express';
import hazardWarningController from '../controllers/hazardWarningController.js';
import { protect } from '../middleware/authMiddleware.js'; // Replace with your actual path if needed

const router = express.Router();

// Step 2 Creation Wizard: Geofencing estimation (Protected)
router.post('/estimate-recipients', protect, hazardWarningController.estimateRecipients);

// Step 3 Creation Wizard & Safety-Gated Modal: Issue official warning (Protected)
router.post('/disseminate', protect, hazardWarningController.issueWarning);

export default router;